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
    btnDateFrom: document.getElementById('btnDateFrom'),
    btnDateTo: document.getElementById('btnDateTo'),
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
    useIgnition: document.getElementById('useIgnitionLogic'),
    
    // Temp Settings
    minTemp: document.getElementById('minTemp'),
    maxTemp: document.getElementById('maxTemp'),
    minHum: document.getElementById('minHum'),
    maxHum: document.getElementById('maxHum'),

    // Cards
    chartCard: document.getElementById('chartCard'),
    mapCard: document.getElementById('mapCard'),
    eventsCard: document.getElementById('eventsCard'),
    tankSummaryCard: document.getElementById('tankSummaryCard'),
    dailyTableCard: document.getElementById('dailyTableCard'),
    tempSummaryCard: document.getElementById('tempSummaryCard'),
    tempDailyTableCard: document.getElementById('tempDailyTableCard'),

    // Temp Tables
    tempSummaryBody: document.querySelector('#tempSummaryTable tbody'),
    tempDailyTableBody: document.querySelector('#tempDailyTable tbody')
};

// Debug check
for (var key in els) {
    if (!els[key]) {
        console.error('Element not found:', key);
    }
}

function toggleView(mode) {
    // Hide all first
    els.chartCard.style.display = 'none';
    els.mapCard.style.display = 'none';
    els.eventsCard.style.display = 'none';
    els.tankSummaryCard.style.display = 'none';
    els.dailyTableCard.style.display = 'none';
    els.tempSummaryCard.style.display = 'none';
    els.tempDailyTableCard.style.display = 'none';

    if (mode === 'fuel') {
        els.chartCard.style.display = 'block';
        els.mapCard.style.display = 'block';
        els.eventsCard.style.display = 'block';
        els.tankSummaryCard.style.display = 'block';
        els.dailyTableCard.style.display = 'block';
        
        // Fix map rendering when becoming visible
        if (typeof map !== 'undefined' && map) {
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }
    } else if (mode === 'temp') {
        els.chartCard.style.display = 'block';
        els.tempSummaryCard.style.display = 'block';
        els.tempDailyTableCard.style.display = 'block';
    }
}

// --- Settings Persistence ---
function saveSettings(username) {
    if (!username) return;
    const settings = {
        minRefuel: els.minRefuel.value,
        minDrain: els.minDrain.value,
        maxCons: els.maxCons.value,
        filterZeros: els.filterZeros.checked,
        useIgnition: els.useIgnition.checked,
        minTemp: els.minTemp.value,
        maxTemp: els.maxTemp.value,
        minHum: els.minHum.value,
        maxHum: els.maxHum.value
    };
    localStorage.setItem('dt_settings_' + username, JSON.stringify(settings));
}

function loadSettings(username) {
    if (!username) return;
    const saved = localStorage.getItem('dt_settings_' + username);
    if (saved) {
        try {
            const s = JSON.parse(saved);
            if (s.minRefuel !== undefined) els.minRefuel.value = s.minRefuel;
            if (s.minDrain !== undefined) els.minDrain.value = s.minDrain;
            if (s.maxCons !== undefined) els.maxCons.value = s.maxCons;
            if (s.filterZeros !== undefined) els.filterZeros.checked = s.filterZeros;
            if (s.useIgnition !== undefined) els.useIgnition.checked = s.useIgnition;
            
            if (s.minTemp !== undefined) els.minTemp.value = s.minTemp;
            if (s.maxTemp !== undefined) els.maxTemp.value = s.maxTemp;
            if (s.minHum !== undefined) els.minHum.value = s.minHum;
            if (s.maxHum !== undefined) els.maxHum.value = s.maxHum;
        } catch (e) {
            console.error('Error loading settings', e);
        }
    }
}

// Attach listeners to save settings on change
function initSettingsListeners() {
    const inputs = [
        els.minRefuel, els.minDrain, els.maxCons, els.filterZeros, els.useIgnition,
        els.minTemp, els.maxTemp, els.minHum, els.maxHum
    ];
    
    inputs.forEach(input => {
        if (input) {
            input.addEventListener('change', () => {
                if (authData.usr) saveSettings(authData.usr);
            });
        }
    });
}

function renderTempTables(stats) {
    // --- 1. General Summary ---
    els.tempSummaryBody.innerHTML = `
        <tr>
            <td>Температура (°C)</td>
            <td>${stats.total.minTemp !== null ? stats.total.minTemp.toFixed(1) : '-'}</td>
            <td>${stats.total.maxTemp !== null ? stats.total.maxTemp.toFixed(1) : '-'}</td>
            <td>${stats.total.avgTemp !== null ? stats.total.avgTemp.toFixed(1) : '-'}</td>
            <td>${formatDuration(stats.total.tempOutOfBoundsDuration)}</td>
        </tr>
        <tr>
            <td>Влажность (%)</td>
            <td>${stats.total.minHum !== null ? stats.total.minHum.toFixed(1) : '-'}</td>
            <td>${stats.total.maxHum !== null ? stats.total.maxHum.toFixed(1) : '-'}</td>
            <td>${stats.total.avgHum !== null ? stats.total.avgHum.toFixed(1) : '-'}</td>
            <td>${formatDuration(stats.total.humOutOfBoundsDuration)}</td>
        </tr>
    `;

    // --- 2. Daily Table ---
    els.tempDailyTableBody.innerHTML = '';
    if (stats.daily.length === 0) {
        els.tempDailyTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center">Нет данных</td></tr>';
    } else {
        stats.daily.forEach(day => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${day.date}</td>
                <td>${day.minTemp !== null ? day.minTemp.toFixed(1) : '-'}</td>
                <td>${day.maxTemp !== null ? day.maxTemp.toFixed(1) : '-'}</td>
                <td>${day.avgTemp !== null ? day.avgTemp.toFixed(1) : '-'}</td>
                <td>${day.minHum !== null ? day.minHum.toFixed(1) : '-'}</td>
                <td>${day.maxHum !== null ? day.maxHum.toFixed(1) : '-'}</td>
                <td>${day.avgHum !== null ? day.avgHum.toFixed(1) : '-'}</td>
                <td>${formatDuration(day.tempOutOfBoundsDuration)} / ${formatDuration(day.humOutOfBoundsDuration)}</td>
            `;
            els.tempDailyTableBody.appendChild(row);
        });
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

    // Check if we have fuel data
    const hasFuelData = data.length > 0;

    // --- 3. Tank Summary ---
    if (hasFuelData) {
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
    } else {
        els.tankSummaryBody.innerHTML = `<tr><td colspan="11" style="text-align:center">Нет данных по топливу</td></tr>`;
    }

    // --- 4. Daily Table ---
    els.dailyTableBody.innerHTML = '';
    
    if (hasFuelData) {
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
    } else {
        els.dailyTableBody.innerHTML = '<tr><td colspan="9" style="text-align:center">Нет данных по топливу</td></tr>';
    }
}
