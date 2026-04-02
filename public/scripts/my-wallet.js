document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const ticketStack = document.getElementById('ticket-stack');
    const modal = document.getElementById('full-ticket-modal');

    // Fetch confirmed future bookings
    try {
        const today = new Date().toISOString();
        const res = await fetch(`/api/bookings/my-bookings?fromDate=${today}`, {
            headers: { 'x-auth-token': token }
        });
        const data = await res.json();

        if (res.ok) {
            renderTickets(data.bookings);
        } else {
            ticketStack.innerHTML = '<div class="no-tickets">Failed to load tickets.</div>';
        }

    } catch (err) {
        console.error(err);
        ticketStack.innerHTML = '<div class="no-tickets">Error loading wallet.</div>';
    }

    function renderTickets(bookings) {
        // Filter confirmed only client-side for safety
        const activeTickets = bookings.filter(b => b.status === 'CONFIRMED');

        if (activeTickets.length === 0) {
            ticketStack.innerHTML = `
                <div class="no-tickets">
                    <i class="fas fa-ticket-alt" style="font-size: 3rem; margin-bottom: 20px;"></i><br>
                    No active tickets found.<br>
                    <a href="index.html#events" style="color: var(--primary-color);">Browse Events</a>
                </div>
            `;
            return;
        }

        ticketStack.innerHTML = activeTickets.map(booking => {
            const date = new Date(booking.eventDate).toDateString();
            const time = new Date(booking.eventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            // We assume booking has event populated? 
            // The API /my-bookings DOES NOT populate event fully, but uses denormalized fields eventTitle, eventDate, eventLocation.
            // But it doesn't have imageUri denormalized? 
            // Let's check Booking model. imageUri is NOT in Booking.
            // We might need to fetch event details or update Booking to store image, or populate in API.
            // The current API Booking.find(query).sort(...) does NOT populate event.
            // However, the Booking model has `event` ref.
            // We should update the backend to populate event for wallet? 
            // Or just use a default image for now/placeholder.

            // Use real image if populated, else placeholder
            const image = booking.event && booking.event.imageUri ? booking.event.imageUri : 'https://via.placeholder.com/600x200?text=Event';

            return `
            <div class="ticket-card" onclick="openTicket('${booking._id}')">
                <div class="ticket-banner" style="background-image: url('${image}')"></div>
                <div class="ticket-content">
                    <div class="ticket-title">${booking.eventTitle}</div>
                    <div class="ticket-info">
                        <i class="far fa-calendar"></i> ${date} &bull; ${time}<br>
                        <i class="fas fa-map-marker-alt"></i> ${booking.eventLocation}
                    </div>
                    <div class="ticket-footer">
                        <div>
                            <span class="ticket-number">${booking.ticketNumber}</span><br>
                            <small>${booking.ticketQuantity} Admit</small>
                        </div>
                        <div class="qr-preview">
                            <i class="fas fa-qrcode" style="font-size: 1.5rem;"></i>
                        </div>
                    </div>
                </div>
            </div>
            `;
        }).join('');

        // Store bookings for modal access
        window.walletBookings = activeTickets;
    }

    window.openTicket = (id) => {
        const booking = window.walletBookings.find(b => b._id === id);
        if (!booking) return;

        document.getElementById('modal-title').innerText = booking.eventTitle;
        document.getElementById('modal-date').innerText = new Date(booking.eventDate).toLocaleString();
        document.getElementById('modal-loc').innerText = booking.eventLocation;
        document.getElementById('modal-ticket-num').innerText = booking.ticketNumber;

        // Generate QR
        const qrContainer = document.getElementById('modal-qr-container');
        qrContainer.innerHTML = '';

        // QR Data: JSON with ticketId to match Check-in API expectations
        const qrData = JSON.stringify({
            ticketId: booking.ticketNumber,
            bookingId: booking._id
        });

        new QRCode(qrContainer, {
            text: qrData,
            width: 180,
            height: 180
        });

        modal.style.display = 'flex';
    };

    window.closeTicketModal = () => {
        modal.style.display = 'none';
    };
});
