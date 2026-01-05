// Initialize map
const map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Places
const places = [
    { name: 'But First Coffee, Santa Rosa', lat: 38.4404, lng: -122.7141, foods: ['Strawberry Frappe', 'Vanilla Latte', 'Croissant'], region: 'USA' },
    { name: 'But First Coffee, Biñan', lat: 14.3347, lng: 121.0847, foods: ['Strawberry Frappe', 'Chocolate Mocha', 'Bagel'], region: 'Philippines' },
    { name: 'Ichiran Ramen, Tokyo', lat: 35.6762, lng: 139.6503, foods: ['Tonkotsu Ramen', 'Miso Ramen', 'Gyoza'], region: 'Japan' },
    { name: 'Café de Flore, Paris', lat: 48.8566, lng: 2.3522, foods: ['Croissant', 'Espresso', 'Quiche'], region: 'France' },
    { name: 'Starbucks, New York', lat: 40.7128, lng: -74.0060, foods: ['Pumpkin Spice Latte', 'Blueberry Muffin', 'Chicken Sandwich'], region: 'USA' }
];

// Regions
const regions = {
    Japan: { lat: 36.2048, lng: 138.2529, zoom: 6 },
    USA: { lat: 37.0902, lng: -95.7129, zoom: 4 },
    Philippines: { lat: 12.8797, lng: 121.7740, zoom: 6 },
    France: { lat: 46.2276, lng: 2.2137, zoom: 6 }
};

let experiences = JSON.parse(localStorage.getItem('experiences')) || {};
let currentMarkers = [];
let tempLatLng;

// Add markers
function addMarkers(list) {
    currentMarkers.forEach(m => map.removeLayer(m));
    currentMarkers = [];

    list.forEach(place => {
        const marker = L.marker([place.lat, place.lng]).addTo(map);
        marker.bindPopup(`
            <b>${place.name}</b><br>
            Foods: ${place.foods.join(', ')}<br>
            <button onclick="viewDetails('${place.name}')">View Details</button>
        `);
        currentMarkers.push(marker);
    });
}

addMarkers(places);

// View details
function viewDetails(placeName) {
    const place = places.find(p => p.name === placeName);
    if (!place) return;

    document.getElementById('place-title').textContent = placeName;
    document.getElementById('food-list').innerHTML =
        place.foods.map(f => `<li>${f}</li>`).join('');

    const select = document.getElementById('food-select');
    select.innerHTML = '<option value="">Select Food</option>' +
        place.foods.map(f => `<option value="${f}">${f}</option>`).join('');

    loadExperiences(placeName);
    showReminders(placeName);
    document.getElementById('modal').classList.remove('hidden');
}

// Reminders
function showReminders(placeName) {
    const exps = experiences[placeName] || [];
    const reminders = exps.filter(e => e.rating === 'disliked' || e.notes);

    if (reminders.length) {
        alert(
            'Personal Reminders:\n' +
            reminders.map(e => `${e.food}: ${e.rating} - ${e.notes}`).join('\n')
        );
    }
}

// Log experience
document.getElementById('log-form').addEventListener('submit', e => {
    e.preventDefault();

    const place = document.getElementById('place-title').textContent;
    const food = document.getElementById('food-select').value;
    const rating = document.querySelector('input[name="rating"]:checked')?.value;
    const notes = document.getElementById('notes').value;

    if (!food || !rating) return alert('Select food and rating');

    experiences[place] ||= [];
    experiences[place].push({ food, rating, notes, date: new Date().toLocaleDateString() });

    localStorage.setItem('experiences', JSON.stringify(experiences));
    loadExperiences(place);
    e.target.reset();
});

// Load experiences
function loadExperiences(place) {
    const list = document.getElementById('experiences');
    const exps = experiences[place] || [];

    list.innerHTML = exps.length
        ? exps.map(e => `<li><b>${e.food}</b> – ${e.rating}<br>${e.notes}</li>`).join('')
        : '<li>No experiences yet.</li>';
}

// Browse trip
document.getElementById('browse-trip').onclick = () => {
    const q = document.getElementById('trip-search').value.toLowerCase();
    const filtered = places.filter(p => p.name.toLowerCase().includes(q));

    if (!filtered.length) return alert('No places found');

    addMarkers(filtered);
    map.fitBounds(filtered.map(p => [p.lat, p.lng]));

    const insights = [];
    filtered.forEach(p => {
        (experiences[p.name] || []).forEach(e => {
            if (e.rating === 'liked') insights.push(`${e.food} at ${p.name}`);
        });
    });

    if (insights.length) alert('Shared Insights:\n' + insights.join('\n'));
};

// Zoom region
document.getElementById('zoom-region').onclick = () => {
    const r = document.getElementById('region-select').value;
    if (!regions[r]) return;

    map.setView([regions[r].lat, regions[r].lng], regions[r].zoom);
    addMarkers(places.filter(p => p.region === r));
};

// Near me (FIXED)
document.getElementById('near-me').onclick = () => {
    navigator.geolocation.getCurrentPosition(pos => {
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 13);

        const nearby = places.filter(p => {
            const dist = map.distance([latitude, longitude], [p.lat, p.lng]);
            return dist <= 10000;
        });

        addMarkers(nearby.length ? nearby : places);
        alert(nearby.length ? `${nearby.length} places nearby` : 'No nearby places');
    });
};

// Reset
document.getElementById('reset-map').onclick = () => {
    addMarkers(places);
    map.setView([0, 0], 2);
};
