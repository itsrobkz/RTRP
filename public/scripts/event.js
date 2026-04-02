document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    if (eventId && typeof eventsData !== 'undefined') {
        const event = eventsData.find(e => e.id == eventId);
        if (event) {
            // Update Page Title
            document.title = `${event.title} | Lumina`;

            // Update Banner
            document.getElementById('event-title').innerText = event.title;
            document.getElementById('event-category').innerText = event.category;
            document.getElementById('event-date').innerText = event.date;
            document.getElementById('event-venue').innerText = event.venue;

            // Update Image (Background)
            const banner = document.getElementById('event-image');
            if (banner) banner.style.backgroundImage = `url('${event.image}')`;

            // Update Description
            const descEl = document.getElementById('event-description');
            if (descEl) descEl.innerText = event.description;

            // Update Sidebar
            document.getElementById('event-price').innerText = event.price === 0 ? "Free" : event.price;
            document.getElementById('event-date-side').innerText = event.date;
            document.getElementById('event-time').innerText = event.time;

            // Update Book Button
            const bookBtn = document.getElementById('book-btn');
            if (bookBtn) {
                bookBtn.href = `booking.html?id=${event.id}`;
            }
        }
    }
});
