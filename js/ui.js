// --- DOM Elements ---
var els = {
    loginUser: document.getElementById('loginUser'),
    loginPass: document.getElementById('loginPassword'),
    connectBtn: document.getElementById('connectBtn'),
    status: document.getElementById('connectionStatus'),
    deviceId: document.getElementById('deviceId'),
    dateFrom: document.getElementById('dateFrom'),
    dateTo: document.getElementById('dateTo'),
    loadBtn: document.getElementById('loadBtn'),
    settingsToggle: document.getElementById('settingsToggle'),
    settingsPanel: document.getElementById('settingsPanel'),
    hoverInfo: document.getElementById('hoverInfo'),
    summary: document.getElementById('summaryContainer'),
    eventsTableBody: document.querySelector('#eventsTable tbody'),
    
    // Settings
    minRefuel: document.getElementById('minRefuel'),
    minDrain: document.getElementById('minDrain'),
    maxCons: document.getElementById('maxConsumptionPerHour'),
    filterZeros: document.getElementById('filterZeros'),
    useIgnition: document.getElementById('useIgnitionLogic')
};

// Debug check
for (var key in els) {
    if (!els[key]) {
        console.error('Element not found:', key);
    }
}

function renderTables(data) {
    // Summary
    const startL = data[0].liters;
    const endL = data[data.length-1].liters;
    
    const totalRefuel = processedEvents.filter(e => e.type === 'refuel').reduce((sum, e) => sum + e.volume, 0);
    const totalDrain = processedEvents.filter(e => e.type === 'drain').reduce((sum, e) => sum + e.volume, 0);
    
    // Consumption = Start - End + Refuel - Drain
    const consumption = startL - endL + totalRefuel - totalDrain;
    
    // Total Distance
    const totalDist = data.reduce((sum, d) => sum + d.dist, 0);
    
    // Avg Consumption (L/100km)
    const avgCons = totalDist > 0 ? (consumption / totalDist * 100) : 0;
    
    els.summary.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>Начальный уровень: <b>${startL.toFixed(2)} л</b></div>
            <div>Конечный уровень: <b>${endL.toFixed(2)} л</b></div>
            <div>Всего заправлено: <b style="color:green">${totalRefuel.toFixed(2)} л</b></div>
            <div>Всего слито: <b style="color:red">${totalDrain.toFixed(2)} л</b></div>
            <div>Расход: <b>${consumption.toFixed(2)} л</b></div>
            <div>Пробег: <b>${totalDist.toFixed(2)} км</b></div>
            <div>Ср. расход: <b>${avgCons.toFixed(2)} л/100км</b></div>
        </div>
    `;
    
    // Events Table
    els.eventsTableBody.innerHTML = '';
    if (processedEvents.length === 0) {
        els.eventsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">Событий не найдено</td></tr>';
    } else {
        processedEvents.forEach(ev => {
            const row = document.createElement('tr');
            row.className = ev.type === 'refuel' ? 'event-refuel' : 'event-drain';
            row.style.cursor = 'pointer';
            row.onclick = (e) => {
                // Prevent if clicking on link
                if (e.target.tagName === 'A') return;
                focusMapOnPoint(ev.end.lat, ev.end.lon);
            };
            
            const typeName = ev.type === 'refuel' ? 'Заправка' : 'Слив';
            const coords = `${ev.end.lat.toFixed(5)}, ${ev.end.lon.toFixed(5)}`;
            const mapLink = `https://www.google.com/maps?q=${ev.end.lat},${ev.end.lon}`;
            
            row.innerHTML = `
                <td>${formatDate(ev.end.dateObj)}</td>
                <td><b>${typeName}</b></td>
                <td>${ev.volume.toFixed(2)}</td>
                <td>
                    <span class="address-placeholder" data-lat="${ev.end.lat}" data-lon="${ev.end.lon}">Загрузка адреса...</span><br>
                    <small>${coords}</small>
                </td>
                <td><a href="${mapLink}" target="_blank">Google Maps</a></td>
            `;
            els.eventsTableBody.appendChild(row);
        });
        
        // Trigger address fetch (lazy)
        if (typeof fetchAddresses === 'function') {
            fetchAddresses();
        }
    }
}
