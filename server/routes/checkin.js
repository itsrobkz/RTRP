const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');

// Validate Ticket (QR Scan)
router.post('/validate', auth, async (req, res) => {
    try {
        const { qrCodeData } = req.body; // Expecting ticketNumber

        if (!qrCodeData) {
            return res.status(400).json({ message: 'No QR code data provided' });
        }

        let ticketNum = qrCodeData;
        try {
            const parsed = JSON.parse(qrCodeData);
            if (parsed.ticketId) ticketNum = parsed.ticketId;
        } catch (e) {
            // Not JSON, assume raw ticket number
        }

        // Find Booking by Ticket Number
        const booking = await Booking.findOne({ ticketNumber: ticketNum }).populate('event');

        if (!booking) {
            return res.status(404).json({ message: 'Invalid Ticket', status: 'error' });
        }

        const event = booking.event;

        // 1. Check if Organizer owns the event
        if (event.organizer.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized: You are not the organizer of this event', status: 'error' });
        }

        // 2. Check if Booking is Confirmed and Paid
        if (booking.status !== 'CONFIRMED' || booking.paymentStatus !== 'SUCCESS') {
            return res.status(400).json({ message: 'Ticket is Cancelled or Unpaid', status: 'error' });
        }

        // 3. Check Event Date (Optional: Strict check for Today)
        // For now, let's just warn if date is past, but allow check-in if it's the right event.
        // Real-world: Check if today is event date.
        const today = new Date();
        const eventDate = new Date(event.date);
        const isSameDay = today.toDateString() === eventDate.toDateString();

        // If strict date check is needed:
        // if (!isSameDay) return res.status(400).json({ message: 'Event is not today', status: 'warning' });

        // 4. Check Check-in Status
        if (booking.checkInStatus === 'CHECKED_IN') {
            return res.status(400).json({
                message: `Already Checked In at ${new Date(booking.checkInTime).toLocaleTimeString()}`,
                status: 'error',
                previousCheckIn: booking.checkInTime
            });
        }

        // Update Status
        booking.checkInStatus = 'CHECKED_IN';
        booking.checkInTime = new Date();
        booking.checkedInBy = req.user.id;
        await booking.save();

        res.json({
            message: 'Check-in Successful',
            status: 'success',
            attendee: {
                ticketNumber: booking.ticketNumber,
                name: 'User ID: ' + booking.user, // Ideally populate user name
                ticketType: 'General Admission', // Placeholder
                seats: booking.ticketQuantity
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
