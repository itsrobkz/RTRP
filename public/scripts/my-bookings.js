document.addEventListener('DOMContentLoaded', async () => {

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // --- UI Elements ---
    const bookingsList = document.getElementById('bookings-list');
    const searchInput = document.getElementById('booking-search');
    const dateFromInput = document.getElementById('date-from');
    const dateToInput = document.getElementById('date-to');
    const btnFilter = document.getElementById('btn-filter');
    const btnClear = document.getElementById('btn-clear');

    // Pagination
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');

    // Analytics
    const statTotalBookings = document.getElementById('stat-total-bookings');
    const statTotalSpent = document.getElementById('stat-total-spent');
    let bookingsChart;

    // --- State ---
    let currentPage = 1;
    const limit = 5;
    let currentSearch = '';
    let currentFromDate = '';
    let currentToDate = '';

    // --- Initial Load ---
    fetchAnalytics();
    fetchBookings();

    // --- Event Listeners ---
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentSearch = e.target.value;
            currentPage = 1;
            fetchBookings();
        }, 300);
    });

    btnFilter.addEventListener('click', () => {
        currentFromDate = dateFromInput.value;
        currentToDate = dateToInput.value;
        currentPage = 1;
        fetchBookings();
    });

    btnClear.addEventListener('click', () => {
        searchInput.value = '';
        dateFromInput.value = '';
        dateToInput.value = '';
        currentSearch = '';
        currentFromDate = '';
        currentToDate = '';
        currentPage = 1;
        fetchBookings();
    });

    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchBookings();
        }
    });

    nextBtn.addEventListener('click', () => {
        currentPage++;
        fetchBookings();
    });

    // --- Functions ---

    async function fetchAnalytics() {
        try {
            const res = await fetch('/api/bookings/analytics/user', {
                headers: { 'x-auth-token': token }
            });
            const data = await res.json();

            if (res.ok) {
                // Update Cards
                statTotalBookings.innerText = data.summary.totalBookings;
                statTotalSpent.innerText = '$' + data.summary.totalSpent;

                // Render Chart
                renderChart(data.monthly);
            }
        } catch (err) {
            console.error('Analytics Error:', err);
        }
    }

    function renderChart(monthlyData) {
        const ctx = document.getElementById('bookingsChart').getContext('2d');

        // Map data to labels (Jan, Feb...) and values
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Initialize arrays with 0
        const bookingsPerMonth = new Array(12).fill(0);

        monthlyData.forEach(item => {
            // item._id is month number (1-12)
            if (item._id && item._id >= 1 && item._id <= 12) {
                bookingsPerMonth[item._id - 1] = item.count;
            }
        });

        if (bookingsChart) bookingsChart.destroy();

        bookingsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Bookings per Month',
                    data: bookingsPerMonth,
                    borderColor: '#6f4cff',
                    backgroundColor: 'rgba(111, 76, 255, 0.2)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#fff' } }
                },
                scales: {
                    x: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }

    async function fetchBookings() {
        try {
            bookingsList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Loading...</p>';

            const params = new URLSearchParams({
                page: currentPage,
                limit: limit
            });

            if (currentSearch) params.append('search', currentSearch);
            if (currentFromDate) params.append('fromDate', currentFromDate);
            if (currentToDate) params.append('toDate', currentToDate);

            const res = await fetch(`/api/bookings/my-bookings?${params.toString()}`, {
                headers: { 'x-auth-token': token }
            });

            const data = await res.json();

            if (res.ok) {
                renderBookings(data.bookings);
                updatePagination(data);
                window.userBookings = data.bookings;
            } else {
                bookingsList.innerHTML = `<p style="text-align: center; color: #ff4757;">Error: ${data.message}</p>`;
            }

        } catch (err) {
            console.error('Error fetching bookings:', err);
            bookingsList.innerHTML = '<p style="text-align: center; color: #ff4757;">Failed to load bookings.</p>';
        }
    }

    function renderBookings(bookings) {
        if (!bookings || bookings.length === 0) {
            bookingsList.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No bookings match your filter.</p>';
            return;
        }

        bookingsList.innerHTML = bookings.map(booking => {
            const date = new Date(booking.eventDate);
            const day = date.getDate();
            const month = date.toLocaleString('default', { month: 'short' });

            const statusClass = booking.status === 'CANCELLED' ? 'status-cancelled' : 'status-confirmed';

            return `
            <div class="booking-card">
                <div class="date-badge">
                    <span class="day">${day}</span>
                    <span class="month">${month}</span>
                </div>
                <div class="event-info">
                    <h3>${booking.eventTitle}</h3>
                    <p><i class="fas fa-map-marker-alt"></i> ${booking.eventLocation}</p>
                    <p><i class="fas fa-ticket-alt"></i> ${booking.ticketQuantity} Tickets</p>
                </div>
                <div class="ticket-status">
                    <span class="status-badge ${statusClass}">${booking.status}</span>
                    <br>
                    <button class="btn-view-ticket" onclick="openTicketModal('${booking._id}')">View Ticket</button>
                    ${booking.status === 'CANCELLED' && booking.refundStatus !== 'NONE'
                    ? `<br><small style="color: #ff9f43;">Refund: ${booking.refundStatus}</small>`
                    : ''}
                </div>
            </div>
            `;
        }).join('');
    }

    function updatePagination(data) {
        const { totalPages, currentPage: curr } = data;
        pageInfo.innerText = `Page ${curr} of ${totalPages || 1}`;
        prevBtn.disabled = curr <= 1;
        nextBtn.disabled = curr >= totalPages || totalPages === 0;
    }
});

// --- Modal Logic & Actions ---
let currentBookingId = null;

function openTicketModal(bookingId) {
    const booking = window.userBookings.find(b => b._id === bookingId);
    if (!booking) return;

    currentBookingId = bookingId;

    // Fill Data
    document.getElementById('modal-event-title').innerText = booking.eventTitle;
    document.getElementById('modal-date').innerText = new Date(booking.eventDate).toDateString();
    document.getElementById('modal-location').innerText = booking.eventLocation;
    document.getElementById('modal-seats').innerText = booking.ticketQuantity;
    document.getElementById('modal-price').innerText = '$' + booking.totalAmount;
    document.getElementById('modal-ticket-num').innerText = booking.ticketNumber;
    document.getElementById('modal-time').innerText = new Date(booking.eventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Buttons Visibility Logic
    const btnCancel = document.getElementById('btn-cancel-booking');
    const btnRefund = document.getElementById('btn-request-refund');
    const btnDownload = document.getElementById('btn-download-pdf');
    const refundMsg = document.getElementById('refund-status-msg');

    // Reset UI
    btnCancel.style.display = 'none';
    btnRefund.style.display = 'none';
    refundMsg.style.display = 'none';

    const eventDate = new Date(booking.eventDate);
    const now = new Date();
    const isPast = eventDate < now;

    // Download PDF Action
    btnDownload.onclick = () => {
        downloadTicket(bookingId);
    };

    // Cancellation Logic (24h rule)
    const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);

    if (booking.status === 'CONFIRMED') {
        btnCancel.style.display = 'inline-block';

        if (hoursUntilEvent > 24) {
            // Allow
            btnCancel.disabled = false;
            btnCancel.style.opacity = '1';
            btnCancel.style.cursor = 'pointer';
            btnCancel.innerText = 'Cancel Booking';
            btnCancel.onclick = () => cancelBooking(bookingId);
        } else {
            // Disallow
            btnCancel.disabled = true;
            btnCancel.style.opacity = '0.5';
            btnCancel.style.cursor = 'not-allowed';

            if (hoursUntilEvent > 0) {
                btnCancel.innerText = 'Cancellation unavailable (< 24h)';
            } else {
                btnCancel.innerText = 'Event Ended';
            }
        }
    }

    if (booking.status === 'CANCELLED') {
        if (booking.refundStatus === 'NONE') {
            btnRefund.style.display = 'inline-block';
            btnRefund.onclick = () => requestRefund(bookingId);
        } else {
            refundMsg.style.display = 'block';
            refundMsg.textContent = `Refund Status: ${booking.refundStatus} ` + (booking.refundRequestedAt ? `(${new Date(booking.refundRequestedAt).toLocaleDateString()})` : '');
        }
    }

    const modal = document.getElementById('ticket-modal');
    modal.style.display = 'flex';
}

function closeTicketModal() {
    document.getElementById('ticket-modal').style.display = 'none';
}

window.onclick = function (event) {
    const modal = document.getElementById('ticket-modal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

// --- Action Functions ---

async function downloadTicket(bookingId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/bookings/${bookingId}/download-ticket`, {
            headers: { 'x-auth-token': token }
        });

        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ticket-${bookingId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } else {
            alert('Failed to download ticket.');
        }
    } catch (err) {
        console.error(err);
        alert('Error downloading ticket.');
    }
}

async function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) return;

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
            method: 'PUT',
            headers: { 'x-auth-token': token }
        });
        const data = await res.json();

        if (res.ok) {
            alert('Booking cancelled successfully.');
            closeTicketModal();
            // Refresh
            document.getElementById('booking-search').dispatchEvent(new Event('input')); // Trigger refresh via existing listeners logic or just reload
            location.reload();
        } else {
            alert(data.message || 'Failed to cancel.');
        }

    } catch (err) {
        console.error(err);
        alert('Error cancelling booking.');
    }
}

async function requestRefund(bookingId) {
    if (!confirm('Request a refund for this cancelled booking?')) return;

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/bookings/${bookingId}/request-refund`, {
            method: 'POST',
            headers: { 'x-auth-token': token }
        });
        const data = await res.json();

        if (res.ok) {
            alert('Refund requested successfully.');
            closeTicketModal();
            location.reload();
        } else {
            alert(data.message || 'Failed to request refund.');
        }

    } catch (err) {
        console.error(err);
        alert('Error requesting refund.');
    }
}
