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

    const form = document.getElementById('edit-event-form');

    // Pre-fill Data
    try {
        const res = await fetch(`/api/events/${eventId}`);
        const event = await res.json();

        if (!res.ok) throw new Error('Event not found');

        document.getElementById('title').value = event.title;
        document.getElementById('description').value = event.description;

        // Format Date for Input
        const d = new Date(event.date);
        document.getElementById('date').value = d.toISOString().split('T')[0];
        document.getElementById('time').value = event.time;
        document.getElementById('location').value = event.location;
        document.getElementById('price').value = event.price;
        document.getElementById('capacity').value = event.capacity;
        document.getElementById('imageUri').value = event.imageUri;

    } catch (err) {
        console.error(err);
        alert('Failed to load event details');
        window.location.href = 'organizer-dashboard.html';
    }

    // Handle Update
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const updatedEvent = {
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            date: document.getElementById('date').value,
            time: document.getElementById('time').value,
            location: document.getElementById('location').value,
            price: document.getElementById('price').value,
            capacity: document.getElementById('capacity').value,
            imageUri: document.getElementById('imageUri').value
        };

        try {
            const res = await fetch(`/api/events/${eventId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify(updatedEvent)
            });

            if (res.ok) {
                alert('Event updated successfully!');
                window.location.href = 'organizer-dashboard.html';
            } else {
                const data = await res.json();
                alert('Update failed: ' + data.message);
            }
        } catch (err) {
            console.error(err);
            alert('Error updating event');
        }
    });
});
