const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const mongoose = require('mongoose');

const { generateTicketPDF } = require('../utils/pdf');
const { sendTicketEmail } = require('../utils/email');


// Create Booking (After Payment Success)
router.post('/create', auth, async (req, res) => {
    try {
        const { eventId, ticketQuantity, paymentId, paymentStatus, couponCode } = req.body;

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Server-side Price Calculation
        let totalAmount = event.price * ticketQuantity;
        let discountAmount = 0;

        // Validating Coupon if provided
        if (couponCode) {
            const Coupon = require('../models/Coupon');
            const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });

            if (coupon) {
                // Check validity (basic checks, assume frontend also checked)
                const isValid = coupon.status === 'ACTIVE' &&
                    new Date() <= new Date(coupon.expiryDate) &&
                    (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit) &&
                    (!coupon.applicableEventId || coupon.applicableEventId.toString() === eventId);

                if (isValid) {
                    if (coupon.discountType === 'PERCENTAGE') {
                        discountAmount = totalAmount * (coupon.discountValue / 100);
                    } else if (coupon.discountType === 'FIXED') {
                        discountAmount = coupon.discountValue;
                    }

                    // Prevent negative total
                    if (discountAmount > totalAmount) discountAmount = totalAmount;

                    totalAmount -= discountAmount;

                    // Update Coupon Usage
                    coupon.usedCount += 1;
                    await coupon.save();
                }
            }
        }

        const newBooking = new Booking({
            user: req.user.id,
            event: eventId,
            eventTitle: event.title,
            eventDate: event.date,
            eventLocation: event.location,
            ticketQuantity,
            totalAmount: parseFloat(totalAmount.toFixed(2)),
            discountAmount: parseFloat(discountAmount.toFixed(2)),
            couponCode: discountAmount > 0 ? couponCode : null,
            paymentId,
            paymentStatus: paymentStatus || 'SUCCESS',
            // GST Calculation (Assuming Inclusive of 18%)
            baseAmount: parseFloat((totalAmount / 1.18).toFixed(2)),
            gstAmount: parseFloat((totalAmount - (totalAmount / 1.18)).toFixed(2)),
            invoiceNumber: `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
            invoiceGeneratedAt: new Date()
        });

        const savedBooking = await newBooking.save();

        // Update Event Analytics
        event.ticketsSold += ticketQuantity;
        event.revenue += totalAmount;
        // Legacy field support
        event.bookedCount += ticketQuantity;

        await event.save();

        // --- Socket.IO Notification ---
        if (req.io) {
            // We need organizer ID. event.organizer is ObjectId.
            const organizerId = event.organizer.toString();
            const notificationData = {
                eventId,
                eventTitle: event.title,
                ticketsBooked: ticketQuantity,
                totalAmount,
                userName: req.user.id // Or fetch name if needed, but ID is faster
            };
            req.io.to(`organizer-${organizerId}`).emit('new-booking', notificationData);
        }
        // ------------------------------

        // --- NEW: Email Ticket ---
        try {
            const user = await require('../models/User').findById(req.user.id);
            // Generate PDF Buffer for Email
            // We need a way to get buffer from pdfkit, or just send text email for now if buffer is hard in utils
            // Let's rely on utils/email.js handling valid input.
            // For simplicity in this implementation, we will trigger the email asynchronously and not block.
            // Note: generating PDF into buffer requires stream handling.
            // Let's keep it simple: Use the download link in email or attach if we can.
            // We will just call sendTicketEmail. The util asks for buffer.
            // Let's mock buffer or implement buffer logic in pdf.js later if needed.
            // For now, let's send email without PDF attachment to prevent complexity,
            // OR we can generate it.
            // Let's simply send the email notification.
            sendTicketEmail(user.email, {
                eventTitle: event.title,
                eventDate: event.date,
                eventLocation: event.location,
                ticketQuantity,
                totalAmount,
                ticketNumber: savedBooking.ticketNumber
            });
        } catch (emailErr) {
            console.error('Email failed:', emailErr);
        }
        // -------------------------

        res.status(201).json(savedBooking);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

// Download Ticket PDF
router.get('/:id/download-ticket', auth, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        if (booking.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const event = await Event.findById(booking.event);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=ticket-${booking.ticketNumber}.pdf`);

        generateTicketPDF(booking, event, res);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Download Invoice PDF
router.get('/:id/invoice', auth, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id).populate('user'); // Populate user for name
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        if (booking.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const event = await Event.findById(booking.event);
        const { generateInvoicePDF } = require('../utils/pdf');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${booking.invoiceNumber || booking.ticketNumber}.pdf`);

        generateInvoicePDF(booking, event, res);

    } catch (err) {
        console.error('Invoice Error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Cancel Booking
router.put('/:id/cancel', auth, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        if (booking.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Check if event is in the future
        const event = await Event.findById(booking.event);
        const eventDate = new Date(event.date);
        const now = new Date();
        const timeDiff = eventDate - now;
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        if (hoursDiff < 24) {
            return res.status(400).json({ message: 'Cannot cancel within 24 hours of the event' });
        }

        if (booking.status === 'CANCELLED') {
            return res.status(400).json({ message: 'Booking is already cancelled' });
        }

        booking.status = 'CANCELLED';
        await booking.save();

        // Update Event stats
        event.ticketsSold -= booking.ticketQuantity;
        event.revenue -= booking.totalAmount;
        event.bookedCount -= booking.ticketQuantity;
        await event.save();

        res.json(booking);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Request Refund
router.post('/:id/request-refund', auth, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        if (booking.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (booking.status !== 'CANCELLED') {
            return res.status(400).json({ message: 'Can only request refund for cancelled bookings' });
        }

        if (booking.refundStatus !== 'NONE') {
            return res.status(400).json({ message: 'Refund already requested or processed' });
        }

        booking.refundStatus = 'REQUESTED';
        booking.refundRequestedAt = new Date();
        await booking.save();

        res.json(booking);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Analytics (For My Bookings Dashboard)
router.get('/analytics/user', auth, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id); // Valid ObjectId

        const aggregation = await Booking.aggregate([
            { $match: { user: userId, paymentStatus: 'SUCCESS', status: 'CONFIRMED' } },
            {
                $group: {
                    _id: null,
                    totalBookings: { $sum: 1 },
                    totalSpent: { $sum: '$totalAmount' },
                    ticketsPurchased: { $sum: '$ticketQuantity' }
                }
            }
        ]);

        const monthlyStats = await Booking.aggregate([
            { $match: { user: userId, paymentStatus: 'SUCCESS', status: 'CONFIRMED' } },
            {
                $group: {
                    _id: { $month: '$bookedAt' },
                    count: { $sum: 1 },
                    spent: { $sum: '$totalAmount' }
                }
            },
            { $sort: { _id: 1 } } // Sort by month
        ]);

        const stats = aggregation[0] || { totalBookings: 0, totalSpent: 0, ticketsPurchased: 0 };

        res.json({
            summary: stats,
            monthly: monthlyStats
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

// Get My Bookings with Search, Filter & Pagination
router.get('/my-bookings', auth, async (req, res) => {
    try {
        const { search, fromDate, toDate, page = 1, limit = 5 } = req.query;

        const query = { user: req.user.id, paymentStatus: 'SUCCESS' };

        // Search (Event Title, Location)
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { eventTitle: searchRegex },
                { eventLocation: searchRegex }
            ];
        }

        // Date Filter
        if (fromDate || toDate) {
            query.eventDate = {};
            if (fromDate) query.eventDate.$gte = new Date(fromDate);
            if (toDate) {
                // Set to end of day
                const endOfDay = new Date(toDate);
                endOfDay.setHours(23, 59, 59, 999);
                query.eventDate.$lte = endOfDay;
            }
        }

        const bookings = await Booking.find(query)
            .sort({ eventDate: 1 }) // Sort by upcoming events first? Or bookedAt? Let's do eventDate for utility
            .populate('event', 'imageUri')
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Booking.countDocuments(query);

        res.json({
            bookings,
            totalPages: Math.ceil(count / limit),
            currentPage: Number(page),
            totalRecords: count
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Get Booking Details
router.get('/:id', auth, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id).populate('event');
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        // Ensure user owns this booking
        if (booking.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        res.json(booking);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
