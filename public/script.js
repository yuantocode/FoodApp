document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([20,0],2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    let places = [];
    let experiences = JSON.parse(localStorage.getItem('experiences')) || {};
    let markers = L.markerClusterGroup(); // Cluster markers

    map.addLayer(markers);

    function saveExperiences(){ localStorage.setItem('experiences',JSON.stringify(experiences)); }

    // Render markers
    function renderMarkers(filterType="") {
        markers.clearLayers();
        places.filter(p => !filterType || p.type===filterType).forEach(place=>{
            const m = L.marker([place.lat, place.lng]);
            m.on('click',()=>openModal(place.id));
            markers.addLayer(m);
        });
    }

    // Modal
    const modal = document.getElementById('modal');
    const closeBtn = document.querySelector('.close');

    window.openModal = (id)=>{
        modal.classList.remove('hidden');
        modal.dataset.placeId=id;
        const place = places.find(p=>p.id===id);
        document.getElementById('place-title').textContent = place.name;
        const select = document.getElementById('food-select');
        select.innerHTML='<option value="">Select Food</option>';
        place.foods.forEach(f=>select.innerHTML+=`<option value="${f}">${f}</option>`);
        loadExperiences(id);
    };

    closeBtn.onclick = ()=>modal.classList.add('hidden');
    window.onclick = e=>{ if(e.target===modal) modal.classList.add('hidden'); };

    document.getElementById('log-form').addEventListener('submit',e=>{
        e.preventDefault();
        const id = modal.dataset.placeId;
        const food = document.getElementById('food-select').value;
        const rating = document.querySelector('input[name="rating"]:checked').value;
        const notes = document.getElementById('notes').value;
        experiences[id] ||= [];
        experiences[id].push({food,rating,notes,date:new Date().toLocaleDateString()});
        saveExperiences();
        e.target.reset();
        loadExperiences(id);
    });

    function loadExperiences(id){
        const list=document.getElementById('experiences');
        const exps=experiences[id]||[];
        list.innerHTML=exps.length? exps.map(e=>`<li><b>${e.food}</b> - ${e.rating}<br>${e.notes}</li>`).join('') : '<li>No experiences yet</li>';
    }

    // Near me
    document.getElementById('near-me').onclick=()=>{
        if(!navigator.geolocation) return alert('Geolocation not supported');
        navigator.geolocation.getCurrentPosition(pos=>{
            map.setView([pos.coords.latitude,pos.coords.longitude],13);
        });
    };

    // Reset map
    document.getElementById('reset-map').onclick=()=> map.setView([20,0],2);

    // Load city restaurants
    document.getElementById('load-city').onclick=async ()=>{
        const city=document.getElementById('city-input').value.trim();
        if(!city) return alert('Enter a city name');

        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
        const geoData = await geoRes.json();
        if(!geoData.length) return alert('City not found');
        const bbox = geoData[0].boundingbox.map(Number);

        const query=`
        [out:json][timeout:25];
        (
          node["amenity"~"restaurant|cafe|fast_food"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
          way["amenity"~"restaurant|cafe|fast_food"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
          relation["amenity"~"restaurant|cafe|fast_food"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
        );
        out center;
        `;
        const overpassRes = await fetch('https://overpass-api.de/api/interpreter',{
            method:'POST', body: query
        });
        const overpassData = await overpassRes.json();
        places = overpassData.elements.map(el=>({
            id: el.id.toString(),
            name: el.tags.name||'Unnamed',
            lat: el.lat||el.center.lat,
            lng: el.lon||el.center.lon,
            type: el.tags.amenity,
            foods: el.tags.amenity==='cafe'? ['Coffee','Pastry','Sandwich'] :
                   el.tags.amenity==='fast_food'? ['Burger','Fries','Soda'] :
                   ['Dish 1','Dish 2','Dish 3']
        }));
        renderMarkers(document.getElementById('type-filter').value);
        if(places.length) map.fitBounds(places.map(p=>[p.lat,p.lng]));
        else alert('No restaurants/cafes found in this city');
    };

    document.getElementById('type-filter').onchange=()=>{
        renderMarkers(document.getElementById('type-filter').value);
    };
});
