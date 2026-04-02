const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const auth = require('../middleware/auth');

// Get All Events with Search & Filters
router.get('/', async (req, res) => {
    try {
        const { search, category, location, date, page = 1, limit = 10 } = req.query;

        const query = { status: 'ACTIVE' }; // Only show active events

        // Search (Title, Description, Location) - Case Insensitive
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { title: searchRegex },
                { description: searchRegex },
                { location: searchRegex }
            ];
        }

        // Category Filter
        if (category && category !== 'All') {
            // Assuming amenities or description might contain category for now, 
            // or if a category field exists. The prompt mentioned "category".
            // Since Event schema doesn't have "category" explicitly, 
            // we'll filter by amenities or description as a fallback, 
            // or strictly if a field was added. 
            // Checking schema: amenities is [String].
            // Let's assume we search in amenities or title/desc for category keywords if no explicit field.
            // For this specific request, I will assume we filter by amenities if it matches, or strict category if added.
            // Implementation: Regex match in amenities or title.
            // actually, let's keep it simple: if category is passed, search in title/desc/amenities
            query.$or = query.$or || [];
            const catRegex = new RegExp(category, 'i');
            query.$or.push({ amenities: catRegex }, { title: catRegex }, { description: catRegex });
        }

        // Location Filter
        if (location) {
            query.location = new RegExp(location, 'i');
        }

        // Date Filter (Exact or Range?)
        // Let's assume exact date or >= date
        if (date) {
            const queryDate = new Date(date);
            query.date = { $gte: queryDate };
        }

        const events = await Event.find(query)
            .sort({ date: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Event.countDocuments(query);

        res.json({
            events,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get Single Event
router.get('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json(event);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') return res.status(404).json({ message: 'Event not found' });
        res.status(500).send('Server Error');
    }
});

// Create Event
router.post('/', auth, async (req, res) => {
    try {
        const eventData = { ...req.body, organizer: req.user.id };
        const newEvent = new Event(eventData);
        const event = await newEvent.save();
        res.json(event);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Update Event
router.put('/:id', auth, async (req, res) => {
    try {
        let event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Check ownership
        if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Update fields
        const { title, description, date, time, location, price, capacity, imageUri } = req.body;

        event.title = title || event.title;
        event.description = description || event.description;
        event.date = date || event.date;
        event.time = time || event.time;
        event.location = location || event.location;
        event.price = price || event.price;
        event.capacity = capacity || event.capacity;
        event.imageUri = imageUri || event.imageUri;

        await event.save();
        res.json(event);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Soft Delete Event (Cancel)
router.delete('/:id', auth, async (req, res) => {
    try {
        let event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Check ownership
        if (event.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        event.status = 'CANCELLED';
        await event.save();
        res.json({ message: 'Event cancelled successfully', event });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
