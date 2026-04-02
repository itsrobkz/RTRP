document.addEventListener('DOMContentLoaded', async () => {

    // Auth Check
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token || (role !== 'organizer' && role !== 'admin')) {
        alert('Access Denied. Organizer privileges required.');
        window.location.href = 'index.html';
        return;
    }

    const container = document.getElementById('my-events-container');

    // Fetch Events
    try {
        const res = await fetch('/api/organizer/events', {
            headers: { 'x-auth-token': token }
        });
        const events = await res.json();

        if (events.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 40px;">You haven\'t created any events yet.</p>';
            updateStats([]);
            return;
        }

        updateStats(events);
        renderEvents(events);

    } catch (err) {
        console.error('Error fetching events:', err);
        container.innerHTML = '<p style="text-align: center; color: #ff4757;">Failed to load events.</p>';
    }

    function renderEvents(events) {
        console.log('Rendering events:', events); // Debugging
        container.innerHTML = events.map(event => {
            // Ensure properties exist to prevent undefined errors
            const title = event.title || 'Untitled Event';
            const date = event.date ? new Date(event.date).toDateString() : 'Date TBD';
            const location = event.location || 'Location TBD';
            const status = event.status || 'ACTIVE';
            const imageUri = event.imageUri || 'https://via.placeholder.com/300';
            const sold = event.ticketsSold || 0;
            const revenue = event.revenue || 0;
            const capacity = event.capacity || 0;

            return `
            <div class="organizer-event-card" id="card-${event._id}">
                <div class="event-thumb" style="background-image: url('${imageUri}')"></div>
                <div class="event-details">
                    <div class="info">
                        <h3>${title} <span class="status-badge status-${status}">${status}</span></h3>
                        <p><i class="far fa-calendar"></i> ${date}</p>
                        <p><i class="fas fa-map-marker-alt"></i> ${location}</p>
                    </div>
                    
                    <div class="metrics">
                        <div class="metric-item">
                            <span class="label">Sold</span>
                            <span class="val">${sold} / ${capacity}</span>
                        </div>
                        <div class="metric-item">
                            <span class="label">Revenue</span>
                            <span class="val">$${revenue}</span>
                        </div>
                    </div>

                    <div class="actions">
                        <a href="edit-event.html?id=${event._id}" class="btn-icon btn-edit" title="Edit Event"><i class="fas fa-pen"></i></a>
                        <a href="event-analytics.html?id=${event._id}" class="btn-icon btn-analytics" title="View Analytics"><i class="fas fa-chart-bar"></i></a>
                        ${status !== 'CANCELLED' ? `<button onclick="deleteEvent('${event._id}')" class="btn-icon btn-delete" title="Cancel Event"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </div>
            </div>
        `}).join('');
    }

    function updateStats(events) {
        const totalEvents = events.length;
        const totalSold = events.reduce((acc, curr) => acc + (curr.ticketsSold || 0), 0);
        const totalRevenue = events.reduce((acc, curr) => acc + (curr.revenue || 0), 0);

        document.getElementById('stats-total-events').innerText = totalEvents;
        document.getElementById('stats-tickets-sold').innerText = totalSold;
        document.getElementById('stats-revenue').innerText = '$' + totalRevenue;
    }

    // Attach to window for the onclick handler
    window.deleteEvent = async (id) => {
        if (!confirm('Are you sure you want to cancel this event? This action cannot be undone.')) return;

        try {
            const res = await fetch(`/api/events/${id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token }
            });

            if (res.ok) {
                alert('Event cancelled successfully.');
                location.reload();
            } else {
                alert('Failed to delete event.');
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting event.');
        }
    };
    // --- QR Scanner Logic ---
    let html5QrcodeScanner;

    window.openScannerModal = () => {
        document.getElementById('scanner-modal').style.display = 'flex';
        document.getElementById('scan-result').innerHTML = '';

        // Initialize Scanner
        html5QrcodeScanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
        );
        html5QrcodeScanner.render(onScanSuccess, onScanFailure);
    };

    window.closeScannerModal = () => {
        if (html5QrcodeScanner) {
            html5QrcodeScanner.clear().catch(error => {
                console.error("Failed to clear html5QrcodeScanner. ", error);
            });
        }
        document.getElementById('scanner-modal').style.display = 'none';
    };

    async function onScanSuccess(decodedText, decodedResult) {
        // Handle the scanned code
        console.log(`Scan result: ${decodedText}`);

        // Stop scanning temporarily or just show result? 
        // Let's pause to show result, then user can close or scan next.
        // For continuous scanning, we just show result at bottom.

        const resultDiv = document.getElementById('scan-result');
        resultDiv.innerHTML = '<span style="color: yellow;">Validating...</span>';

        try {
            const res = await fetch('/api/checkin/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({ qrCodeData: decodedText })
            });
            const data = await res.json();

            if (res.ok) {
                // Success
                resultDiv.innerHTML = `
                    <div style="background: rgba(46, 213, 115, 0.2); color: #2ed573; padding: 15px; border-radius: 8px;">
                        <i class="fas fa-check-circle" style="font-size: 2rem; margin-bottom: 10px;"></i><br>
                        <strong>Check-in Successful!</strong><br>
                        <span>${data.attendee.ticketNumber}</span><br>
                        <small>Seats: ${data.attendee.seats}</small>
                    </div>
                `;
                // Add a sound logic here if needed
            } else {
                // Error / Warning
                const color = data.status === 'warning' ? '#f1c40f' : '#ff4757';
                resultDiv.innerHTML = `
                    <div style="background: rgba(255, 71, 87, 0.2); color: ${color}; padding: 15px; border-radius: 8px;">
                        <i class="fas fa-times-circle" style="font-size: 2rem; margin-bottom: 10px;"></i><br>
                        <strong>${data.message}</strong><br>
                        ${data.previousCheckIn ? `<small>Previously: ${new Date(data.previousCheckIn).toLocaleTimeString()}</small>` : ''}
                    </div>
                `;
            }

        } catch (err) {
            console.error('Scan Validation Error:', err);
            resultDiv.innerHTML = '<span style="color: #ff4757;">Server Error during validation.</span>';
        }
    }

    function onScanFailure(error) {
        // handle scan failure, usually better to ignore and keep scanning.
        // console.warn(`Code scan error = ${error}`);
    }

    // --- Real-time Notifications ---
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.id) {
        // Use relative path or window.location.origin if hosted, but for now localhost:8000
        const socket = io('');

        socket.on('connect', () => {
            console.log('Connected to WebSocket');
            socket.emit('join-organizer', user.id);
        });

        socket.on('new-booking', (data) => {
            console.log('New Booking Received:', data);
            showToast(`New Booking! ${data.ticketsBooked} tickets for "${data.eventTitle}" ($${data.totalAmount})`);

            const soldElem = document.getElementById('stats-tickets-sold');
            const revElem = document.getElementById('stats-revenue');

            if (soldElem) {
                const currentSold = parseInt(soldElem.innerText) || 0;
                soldElem.innerText = currentSold + data.ticketsBooked;
            }
            if (revElem) {
                const currentRev = parseFloat(revElem.innerText.replace('$', '')) || 0;
                revElem.innerText = '$' + (currentRev + data.totalAmount);
            }
        });
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerHTML = `<i class="fas fa-bell"></i> ${message}`;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(46, 213, 115, 0.9);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease, fadeOut 0.5s ease 4s forwards;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4500);
    }

    // Inject Styles
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
    `;
    document.head.appendChild(styleSheet);

});
