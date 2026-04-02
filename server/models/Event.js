const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    location: { type: String, required: true },
    address: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    googleMapsLink: { type: String },
    price: { type: Number, required: true },
    imageUri: { type: String, required: true },
    amenities: [{ type: String }],
    capacity: { type: Number, required: true },
    bookedCount: { type: Number, default: 0 },
    ticketsSold: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    status: { type: String, enum: ['ACTIVE', 'CANCELLED', 'COMPLETED'], default: 'ACTIVE' },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', eventSchema);
