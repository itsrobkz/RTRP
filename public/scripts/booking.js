document.addEventListener('DOMContentLoaded', async () => {

    // Auth Check
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please sign in to book tickets.');
        window.location.href = 'login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');
    const bookingForm = document.getElementById('booking-form');
    const unitPriceEl = document.getElementById('unit-price');
    const qtyInput = document.getElementById('qty');

    // Breakdown Elements
    const subtotalEl = document.getElementById('subtotal-price');
    const discountRow = document.querySelector('.discount-row');
    const discountEl = document.getElementById('discount-amount');
    const gstEl = document.getElementById('gst-amount');
    const totalPriceEl = document.getElementById('total-price');

    // Coupon Elements
    const couponInput = document.getElementById('coupon-code');
    const applyBtn = document.getElementById('apply-coupon-btn');
    const couponMsg = document.getElementById('coupon-message');

    let eventPrice = 0;
    let currentCoupon = null;
    let currentDiscount = 0;

    function calculateTotals() {
        const qty = parseInt(qtyInput.value) || 1;
        const subtotal = qty * eventPrice;

        let discount = 0;
        if (currentCoupon) {
            if (currentCoupon.discountType === 'PERCENTAGE') {
                discount = subtotal * (currentCoupon.discountValue / 100);
            } else {
                discount = currentCoupon.discountValue;
            }
            // Cap discount
            if (discount > subtotal) discount = subtotal;
        }
        currentDiscount = discount;

        const totalAfterDiscount = subtotal - discount;

        // inclusive tax calc: Base = Total / 1.18
        const baseAmount = totalAfterDiscount / 1.18;
        const gstAmount = totalAfterDiscount - baseAmount;

        // Update UI
        subtotalEl.innerText = subtotal.toFixed(2);

        if (discount > 0) {
            discountRow.style.display = 'flex';
            discountEl.innerText = discount.toFixed(2);
        } else {
            discountRow.style.display = 'none';
        }

        gstEl.innerText = gstAmount.toFixed(2);
        totalPriceEl.innerText = totalAfterDiscount.toFixed(2);
    }

    // Fetch Event Details
    if (eventId) {
        try {
            const res = await fetch(`/api/events/${eventId}`);
            const event = await res.json();

            if (res.ok) {
                document.querySelector('.summary-details h3').innerText = event.title;
                document.querySelector('.summary-details .date').innerHTML = `<i class="far fa-calendar"></i> ${new Date(event.date).toDateString()}`;
                document.querySelector('.summary-details .venue').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${event.location}`;
                document.querySelector('.summary-image').style.backgroundImage = `url('${event.imageUri || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14'}')`;

                eventPrice = event.price;
                unitPriceEl.innerText = eventPrice;

                // Initial Calc
                calculateTotals();

                // Update Qty Logic
                window.updateQty = function (change) {
                    let val = parseInt(qtyInput.value) + change;
                    if (val < 1) val = 1;
                    if (val > 10) val = 10;
                    qtyInput.value = val;
                    calculateTotals();
                };
            }
        } catch (err) {
            console.error('Error fetching event:', err);
        }
    }

    // Coupon Logic
    if (applyBtn) {
        applyBtn.addEventListener('click', async () => {
            const code = couponInput.value.trim();
            if (!code) return;

            try {
                const res = await fetch('/api/coupons/validate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': token
                    },
                    body: JSON.stringify({ code, eventId })
                });
                const data = await res.json();

                if (res.ok && data.valid) {
                    currentCoupon = {
                        code: data.code,
                        discountType: data.discountType,
                        discountValue: data.discountValue
                    };
                    couponMsg.innerText = `Coupon '${data.code}' applied!`;
                    couponMsg.className = 'coupon-msg text-success';
                    calculateTotals();
                } else {
                    currentCoupon = null;
                    currentDiscount = 0;
                    couponMsg.innerText = data.message || 'Invalid Coupon';
                    couponMsg.className = 'coupon-msg text-danger';
                    calculateTotals();
                }
            } catch (err) {
                console.error(err);
                couponMsg.innerText = 'Error applying coupon';
                couponMsg.className = 'coupon-msg text-danger';
            }
        });
    }

    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const amount = parseFloat(totalPriceEl.innerText); // Already in standard unit

            try {
                // 1. Create Order (Razorpay expects smallest currency unit, e.g. paise)
                const orderRes = await fetch('/api/payments/orders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': token
                    },
                    body: JSON.stringify({ amount: amount, currency: 'INR' })
                });

                const orderData = await orderRes.json();

                if (!orderRes.ok) {
                    throw new Error(orderData.message || 'Error creating order');
                }

                // 2. Open Razorpay
                const keyRes = await fetch('/api/payments/key', {
                    headers: { 'x-auth-token': token }
                });
                const keyData = await keyRes.json();

                const options = {
                    "key": keyData.key,
                    "amount": orderData.amount, // API returns amount in paise
                    "currency": orderData.currency,
                    "name": "Lumina Events",
                    "description": "Ticket Booking",
                    "order_id": orderData.id,
                    "handler": async function (response) {
                        // 3. Verify Payment
                        const verifyRes = await fetch('/api/payments/verify', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-auth-token': token
                            },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });

                        const verifyData = await verifyRes.json();

                        if (verifyRes.ok) {

                            // 4. Create Booking
                            try {
                                await fetch('/api/bookings/create', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'x-auth-token': token
                                    },
                                    body: JSON.stringify({
                                        eventId: eventId,
                                        ticketQuantity: parseInt(qtyInput.value),
                                        totalAmount: amount, // Send the final discounted amount
                                        couponCode: currentCoupon ? currentCoupon.code : null,
                                        paymentId: response.razorpay_payment_id,
                                        paymentStatus: 'SUCCESS'
                                    })
                                });

                                alert('Payment Successful! Ticket Generated.');
                                window.location.href = 'my-bookings.html';
                            } catch (bookingErr) {
                                console.error('Booking creation failed:', bookingErr);
                                alert('Payment succeeded but booking creation failed. Contact support.');
                            }

                        } else {
                            alert('Payment Verification Failed: ' + verifyData.message);
                            window.location.href = 'index.html';
                        }
                    },
                    "prefill": {
                        "name": "Test User",
                        "email": "test@example.com",
                        "contact": "9999999999"
                    },
                    "theme": {
                        "color": "#3399cc"
                    }
                };

                const rzp1 = new Razorpay(options);
                rzp1.on('payment.failed', function (response) {
                    alert('Payment Failed: ' + response.error.description);
                });
                rzp1.open();

            } catch (error) {
                console.error('Booking Error:', error);
                alert('Booking failed. See console.');
            }
        });
    }
});
