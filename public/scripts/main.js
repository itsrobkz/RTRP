// Sticky Navbar Effect
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Smooth Scroll for Anchors
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});
// Auth Logic
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const authBtn = document.getElementById('auth-btn');
    const createEventLink = document.getElementById('nav-create-event');
    const navList = document.querySelector('.nav-links');

    if (token) {
        // User is logged in
        if (authBtn) {
            authBtn.textContent = 'Logout';
            authBtn.href = '#';
            authBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('role');
                // Hide My Bookings
                const myBookingsLink = document.getElementById('nav-my-bookings');
                if (myBookingsLink) {
                    myBookingsLink.parentElement.style.display = 'none';
                }
                window.location.href = 'index.html';
            });
        }

        const role = localStorage.getItem('role');
        if (createEventLink) {
            if (role === 'organizer' || role === 'admin') {
                createEventLink.style.display = 'block';

                // Add Dashboard Link if not exists
                let dashboardLink = document.getElementById('nav-dashboard');
                if (!dashboardLink && navList) {
                    const li = document.createElement('li');
                    li.innerHTML = '<a href="organizer-dashboard.html" id="nav-dashboard">Dashboard</a>';
                    // Insert before "Create Event" or at appropriate position
                    // Try to insert before the last item (Create Event)
                    if (navList.children.length > 0) {
                        navList.insertBefore(li, navList.children[navList.children.length - 1]);
                    } else {
                        navList.appendChild(li);
                    }
                }
            } else {
                createEventLink.style.display = 'none';
            }
        }

        // Add "My Bookings" link if not present
        // Check if link already exists (either hardcoded or added dynamically)
        let myBookingsLink = document.getElementById('nav-my-bookings');

        if (!myBookingsLink && navList) {
            const li = document.createElement('li');
            li.innerHTML = '<a href="my-bookings.html" id="nav-my-bookings">My Bookings</a>';
            // Insert before the last item (assuming last is Create Event or similar)
            navList.insertBefore(li, navList.children[navList.children.length - 1]);
        } else if (myBookingsLink) {
            // Ensure it is visible if it was hidden
            myBookingsLink.parentElement.style.display = 'block';
        }
    } else {
        // User is not logged in
        if (authBtn) {
            authBtn.textContent = 'Sign In';
            authBtn.href = 'login.html';
        }
        if (createEventLink) createEventLink.style.display = 'none';

        // Protect Create Event Page
        if (window.location.pathname.includes('create-event.html')) {
            window.location.href = 'login.html';
        }
    }
});
