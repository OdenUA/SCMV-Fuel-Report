// --- DOM Elements ---
var els = {
    loginUser: document.getElementById('loginUser'),
    loginPass: document.getElementById('loginPassword'),
    rememberMe: document.getElementById('rememberMe'),
    connectBtn: document.getElementById('connectBtn'),
    status: document.getElementById('connectionStatus'),
    deviceId: document.getElementById('deviceId'),
    dateFrom: document.getElementById('dateFrom'),
    dateTo: document.getElementById('dateTo'),
    loadBtn: document.getElementById('loadBtn'),
    settingsToggle: document.getElementById('settingsToggle'),
    settingsPanel: document.getElementById('settingsPanel'),
    hoverInfo: document.getElementById('hoverInfo'),
    // summary: document.getElementById('summaryContainer'), // Removed
    eventsTableBody: document.querySelector('#eventsTable tbody'),
    tankSummaryBody: document.querySelector('#tankSummaryTable tbody'),
    dailyTableBody: document.querySelector('#dailyTable tbody'),
    
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
    // --- 1. Events Table ---
    els.eventsTableBody.innerHTML = '';
    if (processedEvents.length === 0) {
        els.eventsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">Событий не найдено</td></tr>';
    } else {
        processedEvents.forEach(ev => {
            const row = document.createElement('tr');
            row.className = ev.type === 'refuel' ? 'event-refuel' : 'event-drain';
            row.style.cursor = 'pointer';
            row.onclick = (e) => {
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
        
        if (typeof fetchAddresses === 'function') fetchAddresses();
    }

    // --- 2. Calculate Stats ---
    const stats = calculateStats(data, processedEvents);

    // --- 3. Tank Summary ---
    els.tankSummaryBody.innerHTML = `
        <tr>
            <td>Топливный бак</td>
            <td>${stats.total.startL.toFixed(2)}</td>
            <td>${stats.total.refuelCount}</td>
            <td>${stats.total.refuelVol.toFixed(2)}</td>
            <td>${stats.total.drainCount}</td>
            <td>${stats.total.drainVol.toFixed(2)}</td>
            <td>${stats.total.endL.toFixed(2)}</td>
            <td>${stats.total.consumption.toFixed(2)}</td>
            <td>${stats.total.dist.toFixed(2)}</td>
            <td>${stats.total.engineHours.toFixed(2)}</td>
            <td>${stats.total.avgCons.toFixed(2)}</td>
        </tr>
        <tr style="font-weight: bold; background: #f9f9f9;">
            <td>Все</td>
            <td>${stats.total.startL.toFixed(2)}</td>
            <td>${stats.total.refuelCount}</td>
            <td>${stats.total.refuelVol.toFixed(2)}</td>
            <td>${stats.total.drainCount}</td>
            <td>${stats.total.drainVol.toFixed(2)}</td>
            <td>${stats.total.endL.toFixed(2)}</td>
            <td>${stats.total.consumption.toFixed(2)}</td>
            <td>${stats.total.dist.toFixed(2)}</td>
            <td>${stats.total.engineHours.toFixed(2)}</td>
            <td>${stats.total.avgCons.toFixed(2)}</td>
        </tr>
    `;

    // --- 4. Daily Table ---
    els.dailyTableBody.innerHTML = '';
    stats.daily.forEach(day => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${day.date}</td>
            <td>${day.startL.toFixed(2)}</td>
            <td>${day.endL.toFixed(2)}</td>
            <td>${day.refuelVol.toFixed(2)}</td>
            <td>${day.drainVol.toFixed(2)}</td>
            <td>${day.consumption.toFixed(2)}</td>
            <td>${day.dist.toFixed(2)}</td>
            <td>${day.engineHours.toFixed(2)}</td>
            <td>${day.avgCons.toFixed(2)}</td>
        `;
        els.dailyTableBody.appendChild(row);
    });
    
    // Add Total Row to Daily Table
    const totalRow = document.createElement('tr');
    totalRow.style.fontWeight = 'bold';
    totalRow.style.backgroundColor = '#f0f0f0';
    totalRow.innerHTML = `
        <td>Итого</td>
        <td>${stats.total.startL.toFixed(2)}</td>
        <td>${stats.total.endL.toFixed(2)}</td>
        <td>${stats.total.refuelVol.toFixed(2)}</td>
        <td>${stats.total.drainVol.toFixed(2)}</td>
        <td>${stats.total.consumption.toFixed(2)}</td>
        <td>${stats.total.dist.toFixed(2)}</td>
        <td>${stats.total.engineHours.toFixed(2)}</td>
        <td>${stats.total.avgCons.toFixed(2)}</td>
    `;
    els.dailyTableBody.appendChild(totalRow);

}
