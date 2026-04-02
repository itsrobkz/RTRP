document.addEventListener('DOMContentLoaded', () => {

    const createEventForm = document.getElementById('create-event-form');

    if (createEventForm) {
        createEventForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Check auth
            const token = localStorage.getItem('token');
            if (!token) {
                alert('You must be logged in to create an event.');
                window.location.href = 'login.html';
                return;
            }

            const getVal = (selector) => {
                const el = createEventForm.querySelector(selector);
                return el ? el.value : '';
            };

            const eventData = {
                title: createEventForm.querySelector('input[placeholder="e.g., Neon Lights Festival"]').value,
                description: createEventForm.querySelector('textarea').value,
                date: createEventForm.querySelector('input[type="date"]').value,
                time: createEventForm.querySelector('input[type="time"]').value,
                location: createEventForm.querySelector('input[placeholder="e.g., Cyber City Arena"]').value,
                price: parseFloat(createEventForm.querySelector('input[placeholder="150"]').value),
                // capacity: parseInt(createEventForm.querySelector('input[placeholder="500"]').value), // Logic for finding by placeholder is risky if placeholder changes.
                // Better to add IDs or use relative checking.
                // Re-selecting via index or type to be safe or assuming the HTML structure matches the file I viewed.
                // The HTML had:
                // title -> input type text (first)
                // desc -> textarea
                // date -> input date
                // time -> input time
                // location -> input text (second)
                // price -> input numer (first)
                // capacity -> input number (second)
                // image -> input url
            };

            // Safer selection
            const inputs = createEventForm.querySelectorAll('input, textarea');
            // Mapping based on previous view_file of create-event.html
            // 0: title (text)
            // 1: description (textarea)
            // 2: date
            // 3: time
            // 4: location (text)
            // 5: price (number)
            // 6: capacity (number)
            // 7: image (url)

            // Let's rely on querySelector with attributes from the HTML I saw
            const title = createEventForm.querySelector('input[type="text"]').value;
            const description = createEventForm.querySelector('textarea').value;
            const date = createEventForm.querySelector('input[type="date"]').value;
            const time = createEventForm.querySelector('input[type="time"]').value;
            // Location is the second text input? No, first was title.
            // HTML: Title is div.span-2 > input[type=text]
            // Location is div.span-2 > input[type=text]
            // Use placeholders as selectors or All

            const textInputs = createEventForm.querySelectorAll('input[type="text"]');
            // 0: title
            // 1: location name
            // 2: address

            const locName = textInputs[1].value;
            const address = document.getElementById('event-address').value;
            const lat = parseFloat(document.getElementById('event-lat').value) || 0;
            const lng = parseFloat(document.getElementById('event-lng').value) || 0;

            const numberInputs = createEventForm.querySelectorAll('input[type="number"]');
            // Note: lat/lng are number inputs too now.
            // querySelectorAll('input[type="number"]') will return price, capacity, lat, lng (if order is correct in DOM).
            // HTML Structure:
            // Price (number)
            // Capacity (number)
            // Lat (number)
            // Lng (number)
            // So index 0 is price, 1 is capacity.

            // Re-select strictly by placeholder or ID if possible, but IDs were added.
            // Using IDs for lat/lng is safer.
            // For price/capacity, let's look at the form again.
            // Price is before Capacity.
            // Lat/Lng are after Address.
            // So strictly:
            // input[type=number] -> [Price, Capacity, Lat, Lng]

            const priceVal = parseFloat(document.getElementById('event-price').value);
            const capVal = parseInt(document.getElementById('event-capacity').value);

            const img = createEventForm.querySelector('input[type="url"]').value;

            const payload = {
                title: textInputs[0].value,
                description: description,
                date: date,
                time: time,
                location: locName,
                address: address,
                latitude: lat,
                longitude: lng,
                price: priceVal,
                capacity: capVal,
                imageUri: img
            };

            const submitBtn = createEventForm.querySelector('button');

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Publishing...';

                const res = await fetch('/api/events', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': token
                    },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();

                if (res.ok) {
                    alert('Event Published Successfully!');
                    window.location.href = 'index.html';
                } else {
                    alert('Failed to publish event');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Something went wrong.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Publish Event';
            }
        });
    }
});
