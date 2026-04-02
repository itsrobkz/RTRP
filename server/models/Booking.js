const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    eventTitle: { type: String, required: true },
    eventDate: { type: Date, required: true },
    eventLocation: { type: String, required: true },
    ticketQuantity: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['SUCCESS', 'FAILED', 'PENDING'], default: 'PENDING' },
    paymentId: { type: String },
    ticketNumber: { type: String, unique: true },
    status: { type: String, enum: ['CONFIRMED', 'CANCELLED'], default: 'CONFIRMED' },
    refundStatus: { type: String, enum: ['NONE', 'REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED'], default: 'NONE' },
    refundRequestedAt: { type: Date },
    refundProcessedAt: { type: Date },
    bookedAt: { type: Date, default: Date.now },
    // Check-in System
    checkInStatus: { type: String, enum: ['NOT_CHECKED_IN', 'CHECKED_IN'], default: 'NOT_CHECKED_IN' },
    checkInTime: { type: Date },
    checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // GST & Invoice
    gstAmount: { type: Number },
    baseAmount: { type: Number },
    invoiceNumber: { type: String },
    invoiceGeneratedAt: { type: Date },
    // Coupon
    couponCode: { type: String },
    discountAmount: { type: Number, default: 0 }
});

// Auto-generate ticket number if not present
bookingSchema.pre('save', async function (next) {
    if (!this.ticketNumber) {
        const date = new Date().getFullYear();
        const count = await this.constructor.countDocuments();
        const paddedCount = (count + 1).toString().padStart(6, '0');
        this.ticketNumber = `EVT-${date}-${paddedCount}`;
    }
    next();
});

module.exports = mongoose.model('Booking', bookingSchema);
