document.addEventListener('DOMContentLoaded', async () => {
    const eventsGrid = document.getElementById('events-grid');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const filterTabs = document.querySelectorAll('.tab');

    let currentSearch = '';
    let currentCategory = 'All';

    // initial fetch
    fetchEvents();

    // Search Input Listener (Debounced)
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentSearch = e.target.value;
            fetchEvents();
        }, 300);
    });

    // Search Button Listener
    searchBtn.addEventListener('click', () => {
        currentSearch = searchInput.value;
        fetchEvents();
    });

    // Filter Tabs Listener
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update UI
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update Logic
            currentCategory = tab.textContent;
            fetchEvents();
        });
    });

    async function fetchEvents() {
        try {
            // Build URL with query params
            const params = new URLSearchParams();
            if (currentSearch) params.append('search', currentSearch);
            if (currentCategory && currentCategory !== 'All') params.append('category', currentCategory);

            const url = `/api/events?${params.toString()}`;
            console.log('Fetching:', url);

            eventsGrid.innerHTML = '<p class="loading-text">Loading events...</p>'; // Simple loading state

            const res = await fetch(url);
            const data = await res.json(); // Backend returns { events: [], totalPages, currentPage }

            if (res.ok) {
                renderEvents(data.events || []); // Handle new response structure
            } else {
                console.error('Failed to fetch events:', data.message);
                eventsGrid.innerHTML = '<p>Failed to load events.</p>';
            }
        } catch (error) {
            console.error('Error fetching events:', error);
            eventsGrid.innerHTML = '<p>Error loading events.</p>';
        }
    }

    function renderEvents(events) {
        if (!events || events.length === 0) {
            eventsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; font-size: 1.2rem; color: var(--text-muted);">No events found matching your criteria.</p>';
            return;
        }

        eventsGrid.innerHTML = events.map(event => `
            <div class="event-card glass">
                <div class="card-image" style="background-image: url('${event.imageUri || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14'}');">
                    <span class="category-tag">${event.status === 'CANCELLED' ? 'Cancelled' : 'Event'}</span>
                </div>
                <div class="card-details">
                    <div class="date">
                        <span class="day">${new Date(event.date).getDate()}</span>
                        <span class="month">${new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                    </div>
                    <div class="info">
                        <h3>${event.title}</h3>
                        <p class="location"><i class="fas fa-map-marker-alt"></i> ${event.location}</p>
                        <div class="card-footer">
                            <span class="price">$${event.price}</span>
                            <a href="event-details.html?id=${event._id}" class="btn-link">Book Now <i class="fas fa-arrow-right"></i></a>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
});
