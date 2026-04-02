document.addEventListener('DOMContentLoaded', async () => {

    // Auth Check
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token || (role !== 'organizer' && role !== 'admin')) {
        alert('Access Denied.');
        window.location.href = 'index.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    if (!eventId) {
        alert('No event specified');
        window.location.href = 'organizer-dashboard.html';
        return;
    }

    try {
        const res = await fetch(`/api/organizer/events/${eventId}/analytics`, {
            headers: { 'x-auth-token': token }
        });

        if (!res.ok) throw new Error('Failed to load analytics');

        const data = await res.json();
        renderAnalytics(data);

    } catch (err) {
        console.error(err);
        alert('Error loading analytics');
        document.getElementById('event-title').innerText = 'Error loading event';
    }

    function renderAnalytics(data) {
        // Event Header
        document.getElementById('event-title').innerText = data.event.title;
        document.getElementById('event-date').innerText = new Date().toLocaleDateString(); // Ideally event date, but currently unavailable in this endpoint response specifically unless included

        // Stats
        document.getElementById('stat-total').innerText = data.event.capacity;
        document.getElementById('stat-sold').innerText = data.event.ticketsSold;
        document.getElementById('stat-remaining').innerText = data.event.ticketsRemaining;
        document.getElementById('stat-revenue').innerText = '$' + data.event.revenue;

        // Attendees Table
        const tbody = document.getElementById('attendees-body');

        if (data.attendees.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px;">No attendees yet.</td></tr>';
            return;
        }

        tbody.innerHTML = data.attendees.map(a => `
            <tr>
                <td>${a.name}</td>
                <td>${a.email}</td>
                <td>${a.ticketQuantity}</td>
                <td>$${a.totalAmount}</td>
                <td><span class="status-success">${a.paymentStatus}</span></td>
                <td>${new Date(a.bookedAt).toLocaleDateString()}</td>
            </tr>
        `).join('');
    }
});
