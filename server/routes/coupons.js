const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Coupon = require('../models/Coupon');

// Validate Coupon
router.post('/validate', auth, async (req, res) => {
    try {
        const { code, eventId } = req.body;

        const coupon = await Coupon.findOne({ code: code.toUpperCase() });

        if (!coupon) {
            return res.status(404).json({ message: 'Invalid Coupon Code', valid: false });
        }

        if (coupon.status !== 'ACTIVE') {
            return res.status(400).json({ message: 'Coupon is inactive', valid: false });
        }

        if (new Date() > new Date(coupon.expiryDate)) {
            return res.status(400).json({ message: 'Coupon expired', valid: false });
        }

        if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({ message: 'Coupon usage limit exceeded', valid: false });
        }

        if (coupon.applicableEventId && coupon.applicableEventId.toString() !== eventId) {
            return res.status(400).json({ message: 'Coupon not applicable for this event', valid: false });
        }

        res.json({
            valid: true,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            code: coupon.code,
            message: 'Coupon Applied Successfully'
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
