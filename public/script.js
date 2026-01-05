document.addEventListener('DOMContentLoaded',()=>{

    const map = L.map('map').setView([20,0],2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    const markers = L.markerClusterGroup();
    map.addLayer(markers);

    let places = [];
    let experiences = JSON.parse(localStorage.getItem('experiences')) || {};

    const cityInput = document.getElementById('city-input');
    const loadCityBtn = document.getElementById('load-city');
    const typeFilter = document.getElementById('type-filter');
    const resultsCount = document.getElementById('results-count');
    const modal = document.getElementById('modal');
    const closeBtn = document.querySelector('.close');

    function saveExperiences(){ 
        localStorage.setItem('experiences', JSON.stringify(experiences)); 
    }

    // Render markers (optionally filtered)
    function renderMarkers(filteredPlaces = null){
        markers.clearLayers();
        const typeVal = typeFilter.value;
        const filtered = (filteredPlaces || places).filter(p => !typeVal || p.type === typeVal);
        filtered.forEach(p=>{
            const m = L.marker([p.lat, p.lng]);
            m.on('click',()=>openModal(p.id));
            markers.addLayer(m);
        });
        resultsCount.textContent = `${filtered.length} places`;
    }

    function openModal(id){
        modal.classList.remove('hidden');
        modal.dataset.id = id;
        const place = places.find(p=>p.id===id);
        document.getElementById('place-title').textContent = place.name;
        const select = document.getElementById('food-select');
        select.innerHTML = '';
        place.foods.forEach(f=> select.innerHTML += `<option value="${f}">${f}</option>`);
        loadExperiences(id);
    }

    function loadExperiences(id){
        const list = document.getElementById('experiences');
        const exps = experiences[id] || [];
        list.innerHTML = exps.length 
            ? exps.map(e=>`<li><b>${e.food}</b> - ${e.rating}<br>${e.notes}</li>`).join('') 
            : '<li>No experiences yet</li>';
    }

    closeBtn.onclick = ()=> modal.classList.add('hidden');
    window.onclick = e=>{ if(e.target === modal) modal.classList.add('hidden'); };

    document.getElementById('log-form').addEventListener('submit', e=>{
        e.preventDefault();
        const id = modal.dataset.id;
        const food = document.getElementById('food-select').value;
        const rating = document.querySelector('input[name="rating"]:checked').value;
        const notes = document.getElementById('notes').value;
        experiences[id] ||= [];
        experiences[id].push({food,rating,notes,date:new Date().toLocaleDateString()});
        saveExperiences();
        e.target.reset();
        loadExperiences(id);
    });

    // Filter by type dynamically
    typeFilter.addEventListener('change',()=>renderMarkers());

    // Reset map
    document.getElementById('reset-map').onclick = ()=>{
        map.setView([20,0],2);
        markers.clearLayers();
        resultsCount.textContent='';
        cityInput.value='';
        typeFilter.value='';
    };

    // Near Me (fixed)
    document.getElementById('near-me').onclick = ()=>{
        if(!navigator.geolocation) return alert('Geolocation not supported');
        navigator.geolocation.getCurrentPosition(pos=>{
            const userLat = pos.coords.latitude;
            const userLng = pos.coords.longitude;
            map.setView([userLat,userLng],13);

            // Filter places within 10 km
            const nearby = places.filter(p=>{
                const distance = map.distance([userLat,userLng],[p.lat,p.lng]);
                return distance <= 10000; // 10 km
            });

            if(!nearby.length){
                alert('No places nearby within 10 km');
                renderMarkers(); // show all
            } else {
                renderMarkers(nearby);
            }
        }, ()=> alert('Location access denied.'));
    };

    // Load city from Overpass API
    loadCityBtn.onclick = async ()=>{
        const city = cityInput.value.trim();
        if(!city) return alert('Enter a city name');

        // Get city bounding box
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(city)}`);
        const geoData = await geoRes.json();
        if(!geoData.length) return alert('City not found');
        const bbox = geoData[0].boundingbox.map(Number);

        // Overpass query
        const query = `[out:json][timeout:25];
        (
            node["amenity"~"restaurant|cafe|fast_food"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
            way["amenity"~"restaurant|cafe|fast_food"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
            relation["amenity"~"restaurant|cafe|fast_food"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
        );
        out center;`;

        const overpassRes = await fetch('https://overpass-api.de/api/interpreter',{method:'POST',body: query});
        const data = await overpassRes.json();

        places = data.elements.filter(el => el.lat || el.center).map(el=>({
            id: el.id.toString(),
            name: el.tags.name || 'Unnamed',
            lat: el.lat || el.center.lat,
            lng: el.lon || el.center.lon,
            type: el.tags.amenity,
            foods: el.tags.amenity==='cafe'? ['Coffee','Pastry','Sandwich'] :
                   el.tags.amenity==='fast_food'? ['Burger','Fries','Soda'] :
                   ['Dish 1','Dish 2','Dish 3']
        }));

        if(!places.length) return alert('No restaurants/cafes found');
        renderMarkers();
        map.fitBounds(places.map(p=>[p.lat,p.lng]));
    };
});
