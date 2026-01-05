// Initialize map
const map = L.map('map').setView([0, 0], 2); // World view
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Sample places (expand this array with real data; lat/lng from Google Maps)
const places = [
    { name: 'But First Coffee, Santa Rosa', lat: 38.4404, lng: -122.7141, foods: ['Strawberry Frappe', 'Latte'] },
    { name: 'But First Coffee, Biñan', lat: 14.3347, lng: 121.0847, foods: ['Strawberry Frappe', 'Mocha'] },
    { name: 'Ramen Shop, Tokyo', lat: 35.6762, lng: 139.6503, foods: ['Tonkotsu Ramen', 'Miso Ramen'] },
    { name: 'Cafe in Paris', lat: 48.8566, lng: 2.3522, foods: ['Croissant', 'Espresso'] }
];

// Load experiences from localStorage
let experiences = JSON.parse(localStorage.getItem('experiences')) || {};
let currentMarkers = []; // Track markers for filtering

// Function to add markers
function addMarkers(placesList) {
    // Clear existing markers
    currentMarkers.forEach(marker => map.removeLayer(marker));
    currentMarkers = [];

    placesList.forEach(place => {
        const marker = L.marker([place.lat, place.lng]).addTo(map);
        marker.bindPopup(`
            <b>${place.name}</b><br>
            Foods: ${place.foods.join(', ')}<br>
            <button onclick="viewDetails('${place.name}')">View Details</button>
        `);
        currentMarkers.push(marker);
    });
}

// Initial load
addMarkers(places);

// View details modal
function viewDetails(placeName) {
    const place = places.find(p => p.name === placeName);
    if (!place) return;

    document.getElementById('place-title').textContent = placeName;
    const foodList = document.getElementById('food-list');
    foodList.innerHTML = place.foods.map(f => `<li>${f}</li>`).join('');

    const foodSelect = document.getElementById('food-select');
    foodSelect.innerHTML = '<option>Select Food</option>' + place.foods.map(f => `<option value="${f}">${f}</option>`).join('');

    loadExperiences(placeName);
    document.getElementById('modal').classList.remove('hidden');
}

// Close modal
document.querySelector('.close').onclick = () => document.getElementById('modal').classList.add('hidden');
window.onclick = (e) => { if (e.target === document.getElementById('modal')) document.getElementById('modal').classList.add('hidden'); };

// Log experience
document.getElementById('log-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const place = document.getElementById('place-title').textContent;
    const food = document.getElementById('food-select').value;
    const rating = document.querySelector('input[name="rating"]:checked')?.value;
    const notes = document.getElementById('notes').value;

    if (!food || !rating) {
        alert('Please select food and rating.');
        return;
    }

    if (!experiences[place]) experiences[place] = [];
    experiences[place].push({ food, rating, notes, date: new Date().toLocaleDateString() });
    localStorage.setItem('experiences', JSON.stringify(experiences));
    loadExperiences(place);
    document.getElementById('log-form').reset();
    alert('Experience logged! Reload to see reminders.');
});

// Load experiences for a place
function loadExperiences(place) {
    const expList = document.getElementById('experiences');
    const exps = experiences[place] || [];
    expList.innerHTML = exps.length ? exps.map(exp => `<li><strong>${exp.food}</strong> - ${exp.rating} (${exp.date})<br>${exp.notes}</li>`).join('') : '<li>No experiences yet.</li>';
}

// Export experiences
document.getElementById('export-btn').onclick = () => {
    const data = JSON.stringify(experiences, null, 2);
    navigator.clipboard.writeText(data).then(() => alert('Experiences copied to clipboard! Share with friends.')).catch(() => alert('Copy failed; use Ctrl+C on the data below:\n' + data));
};

// Import experiences
document.getElementById('import-btn').onclick = () => {
    const data = prompt('Paste shared experiences JSON:');
    if (!data) return;
    try {
        const imported = JSON.parse(data);
        experiences = { ...experiences, ...imported }; // Merge
        localStorage.setItem('experiences', JSON.stringify(experiences));
        alert('Experiences imported! Refresh to see.');
    } catch (e) {
        alert('Invalid JSON. Check the data.');
    }
};

// Browse trip (filter places)
document.getElementById('browse-trip').onclick = () => {
    const query = document.getElementById('trip-search').value.toLowerCase().trim();
    if (!query) {
        alert('Enter a search term.');
        return;
    }
    const filtered = places.filter(p => p.name.toLowerCase().includes(query));
    if (filtered.length === 0) {
        alert('No places found.');
        return;
    }
    addMarkers(filtered);
    map.fitBounds(filtered.map(p => [p.lat, p.lng]), { padding: [20, 20] });
};

// Reset map
document.getElementById('reset-map').onclick = () => {
    addMarkers(places);
    map.setView([0, 0], 2);
};

// Optional: Click map to add custom place (for expansion)
map.on('click', (e) => {
    console.log(`Clicked at ${e.latlng.lat}, ${e.latlng.lng} - Use this for adding places.`);
});