document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    if (!eventId) {
        alert('No event specified');
        window.location.href = 'index.html';
        return;
    }

    try {
        const res = await fetch(`/api/events/${eventId}`);
        const event = await res.json();

        if (res.ok) {
            // Update UI Elements
            setText('event-title', event.title);
            setText('event-category', 'Event'); // Category not in schema, defaulting
            setText('event-date', new Date(event.date).toLocaleDateString());
            setText('event-date-side', new Date(event.date).toLocaleDateString());
            setText('event-time', event.time);
            setText('event-venue', event.location);
            setText('event-description', event.description);
            setText('event-price', event.price);
            setText('event-capacity', `${event.capacity} Seats`);

            const imgContainer = document.getElementById('event-image');
            if (imgContainer && event.imageUri) {
                imgContainer.style.backgroundImage = `url('${event.imageUri}')`;
            }

            // Update Book Button
            const bookBtn = document.getElementById('book-btn');
            if (bookBtn) {
                bookBtn.href = `booking.html?id=${event._id}`;
            }

            // Update Map & Location
            const addressEl = document.getElementById('event-full-address');
            const gmapsLink = document.getElementById('gmaps-link');

            if (event.address) {
                addressEl.innerText = event.address;
            }

            if (event.latitude && event.longitude) {
                // Initialize Leaflet Map
                const map = L.map('map').setView([event.latitude, event.longitude], 15);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '© OpenStreetMap'
                }).addTo(map);

                L.marker([event.latitude, event.longitude]).addTo(map)
                    .bindPopup(event.location)
                    .openPopup();

                // Directions Link
                if (gmapsLink) {
                    gmapsLink.href = `https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`;
                }
            } else {
                // Hide map if no coords
                document.getElementById('map').style.display = 'none';
                if (gmapsLink) gmapsLink.style.display = 'none';
                if (addressEl) addressEl.innerText = 'Location details not available on map.';
            }

        } else {
            console.error('Failed to fetch event details', event);
            document.querySelector('.event-container').innerHTML = '<p class="error">Event not found.</p>';
        }

    } catch (error) {
        console.error('Error:', error);
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    }
});
