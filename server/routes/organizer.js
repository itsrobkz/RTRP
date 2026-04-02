const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Event = require('../models/Event');
const Booking = require('../models/Booking');

// Get All Events for Logged-in Organizer
router.get('/events', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const events = await Event.find({ organizer: req.user.id }).sort({ date: 1 });
        res.json(events);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get Event Analytics & Attendees
router.get('/events/:id/analytics', auth, async (req, res) => {
    try {
        if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check ownership
        if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Fetch attendees (Bookings)
        const bookings = await Booking.find({ event: req.params.id }).populate('user', 'name email');

        const attendees = bookings.map(b => ({
            name: b.user ? b.user.name : 'Unknown User',
            email: b.user ? b.user.email : 'Unknown Email',
            ticketQuantity: b.ticketQuantity,
            totalAmount: b.totalAmount,
            paymentStatus: b.paymentStatus,
            bookedAt: b.bookedAt
        }));

        res.json({
            event: {
                title: event.title,
                ticketsSold: event.ticketsSold,
                revenue: event.revenue,
                capacity: event.capacity,
                ticketsRemaining: event.capacity - event.ticketsSold,
                status: event.status
            },
            attendees
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
