// --- Data Processing ---
function processData(rawData) {
    if (!rawData || rawData.length === 0) {
        console.log('Нет данных по топливу за выбранный период');
        currentData = [];
        renderChart([]);
        return;
    }
    
    // 1. Filter and Sort
    let data = rawData.map(item => ({
        ...item,
        dateObj: new Date(item.wdate),
        ts: new Date(item.wdate).getTime(),
        liters: parseFloat(item.liters),
        lat: parseFloat(item.latitude),
        lon: parseFloat(item.longitude)
    }));
    
    // Filter invalid coordinates
    data = data.filter(d => !isNaN(d.lat) && !isNaN(d.lon) && d.lat !== 0 && d.lon !== 0);

    // Filter zeros if enabled
    if (els.filterZeros.checked) {
        data = data.filter(d => d.liters > 0.1);
    }
    
    // Sort by time
    data.sort((a, b) => a.ts - b.ts);
    
    // 2. Calculate derived metrics (Distance, Speed)
    // Since we don't have speed in raw data, we calculate it between points
    for (let i = 0; i < data.length; i++) {
        if (i === 0) {
            data[i].dist = 0;
            data[i].speed = 0;
            data[i].timeDiff = 0;
        } else {
            const prev = data[i-1];
            const distKm = calculateDistance(prev.lat, prev.lon, data[i].lat, data[i].lon);
            const timeDiffHours = (data[i].ts - prev.ts) / (1000 * 3600);
            
            data[i].dist = distKm;
            data[i].timeDiff = timeDiffHours;
            // Speed km/h
            data[i].speed = timeDiffHours > 0 ? distKm / timeDiffHours : 0;
        }
    }
    
    currentData = data;
    
    // Build Spatial Index for fast map hover
    buildSpatialIndex(data);

    // 3. Detect Events
    detectEvents(data);
    
    // 4. Render
    renderChart(data);
    renderMap(data);
    renderTables(data);
}

function detectEvents(data) {
    const minRefuel = parseFloat(els.minRefuel.value) || 10;
    const minDrain = parseFloat(els.minDrain.value) || 10;
    const maxConsLph = parseFloat(els.maxCons.value) || 30;
    const useIgnition = els.useIgnition.checked;
    
    const events = [];
    
    // --- Improved Algorithm: Grouping consecutive changes ---
    // This handles slow refuels/drains that span multiple data points.
    
    // Helper to finalize a refuel event
    const finalizeRefuel = (candidate) => {
        const netVolume = data[candidate.endIdx].liters - data[candidate.startIdx].liters;
        if (netVolume >= minRefuel) {
            events.push({
                type: 'refuel',
                start: data[candidate.startIdx],
                end: data[candidate.endIdx],
                volume: netVolume,
                ts: data[candidate.endIdx].ts
            });
        }
    };

    // Helper to finalize a drain event
    const finalizeDrain = (candidate) => {
        const netVolume = data[candidate.startIdx].liters - data[candidate.endIdx].liters;
        const durationHours = (data[candidate.endIdx].ts - data[candidate.startIdx].ts) / (1000 * 3600);
        
        if (netVolume >= minDrain) {
            // Check consumption logic
            const maxAllowedDrop = durationHours * maxConsLph;
            let isDrain = false;
            
            // 1. Drop exceeds max consumption
            if (netVolume > maxAllowedDrop) {
                isDrain = true;
            }
            
            // 2. Ignition logic (if enabled)
            // If moving significantly during the event, be conservative
            if (useIgnition) {
                // Check average speed during event
                let totalDist = 0;
                for(let k=candidate.startIdx+1; k<=candidate.endIdx; k++) {
                    totalDist += data[k].dist;
                }
                const avgSpeed = durationHours > 0 ? totalDist / durationHours : 0;
                
                if (avgSpeed > 5) {
                    // If moving, only count as drain if HUGE drop (e.g. 2x max consumption)
                    if (netVolume < maxAllowedDrop * 2) {
                        isDrain = false;
                    }
                }
            }
            
            if (isDrain) {
                events.push({
                    type: 'drain',
                    start: data[candidate.startIdx],
                    end: data[candidate.endIdx],
                    volume: netVolume,
                    ts: data[candidate.endIdx].ts
                });
            }
        }
    };

    let currentRefuel = null;
    let currentDrain = null;
    const MERGE_GAP_MS = 10 * 60 * 1000; // 10 minutes max gap to merge events

    for (let i = 1; i < data.length; i++) {
        const diff = data[i].liters - data[i-1].liters;
        const ts = data[i].ts;
        const timeDiff = ts - data[i-1].ts;

        // Check for GPS Gap (Missing data)
        // If there is a large gap (time or distance), we assume any fuel drop is consumption (or unknown), not a drain.
        // We also break any current event detection because continuity is lost.
        if (timeDiff > GAP_THRESHOLD_MS || data[i].dist > GAP_DISTANCE_KM) {
            if (currentRefuel) {
                finalizeRefuel(currentRefuel);
                currentRefuel = null;
            }
            if (currentDrain) {
                finalizeDrain(currentDrain);
                currentDrain = null;
            }
            // Skip this point for event detection (it's a jump)
            continue;
        }

        // --- Refuel Detection ---
        if (diff > 0) {
            // If we have an active drain, close it (fuel going up breaks drain)
            if (currentDrain) {
                finalizeDrain(currentDrain);
                currentDrain = null;
            }

            if (!currentRefuel) {
                currentRefuel = { startIdx: i-1, endIdx: i, lastStepTs: ts };
            } else {
                // Check if we can merge
                if ((ts - currentRefuel.lastStepTs) < MERGE_GAP_MS) {
                    currentRefuel.endIdx = i;
                    currentRefuel.lastStepTs = ts;
                } else {
                    // Gap too big, finalize and start new
                    finalizeRefuel(currentRefuel);
                    currentRefuel = { startIdx: i-1, endIdx: i, lastStepTs: ts };
                }
            }
        } 
        
        // --- Drain Detection ---
        else if (diff < 0) {
            // If we have an active refuel, close it (fuel going down breaks refuel)
            if (currentRefuel) {
                finalizeRefuel(currentRefuel);
                currentRefuel = null;
            }

            if (!currentDrain) {
                currentDrain = { startIdx: i-1, endIdx: i, lastStepTs: ts };
            } else {
                // Check if we can merge
                if ((ts - currentDrain.lastStepTs) < MERGE_GAP_MS) {
                    currentDrain.endIdx = i;
                    currentDrain.lastStepTs = ts;
                } else {
                    finalizeDrain(currentDrain);
                    currentDrain = { startIdx: i-1, endIdx: i, lastStepTs: ts };
                }
            }
        }
        
        // If diff == 0, we do nothing. 
        // We stay in the current "potential event" state until a break or opposite change happens.
        // The time gap check handles the "too long silence" case.
    }

    // Finalize any open events
    if (currentRefuel) finalizeRefuel(currentRefuel);
    if (currentDrain) finalizeDrain(currentDrain);
    
    processedEvents = events;
}

function buildSpatialIndex(data) {
    // Simple grid-based spatial index
    // Scale 100 means ~1.1km grid cells at equator
    const scale = 100; 
    const grid = {};
    
    for (let i = 0; i < data.length; i++) {
        const p = data[i];
        const x = Math.floor(p.lat * scale);
        const y = Math.floor(p.lon * scale);
        const key = `${x},${y}`;
        
        if (!grid[key]) grid[key] = [];
        grid[key].push(i);
    }
    
    spatialIndex = { grid, scale };
}

function calculateStats(data, events) {
    // Helper to format date key
    const getDateKey = (d) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;
    };

    // Group data by day
    const days = {};
    
    // Initialize days from data points
    data.forEach(p => {
        const key = getDateKey(p.dateObj);
        if (!days[key]) {
            days[key] = {
                date: key,
                points: [],
                refuels: [],
                drains: []
            };
        }
        days[key].points.push(p);
    });

    // Distribute events to days (based on end time)
    events.forEach(ev => {
        const key = getDateKey(ev.end.dateObj);
        if (days[key]) {
            if (ev.type === 'refuel') days[key].refuels.push(ev);
            else days[key].drains.push(ev);
        }
    });

    // Calculate stats for each day
    const dailyStats = Object.values(days).map(day => {
        const startL = day.points[0].liters;
        const endL = day.points[day.points.length-1].liters;
        
        const refuelVol = day.refuels.reduce((sum, e) => sum + e.volume, 0);
        const drainVol = day.drains.reduce((sum, e) => sum + e.volume, 0);
        
        // Consumption = Start - End + Refuel - Drain
        // Note: This formula implicitly includes "unknown loss" (e.g. gaps) as consumption
        const consumption = startL - endL + refuelVol - drainVol;
        
        const dist = day.points.reduce((sum, p) => sum + p.dist, 0);
        const engineHours = day.points.reduce((sum, p) => sum + p.timeDiff, 0);
        
        const avgCons = dist > 0 ? (consumption / dist * 100) : 0;

        return {
            date: day.date,
            startL, endL,
            refuelVol, drainVol,
            consumption, dist, engineHours, avgCons,
            // Raw counts for total
            refuelCount: day.refuels.length,
            drainCount: day.drains.length
        };
    });

    // Sort by date (assuming keys are DD.MM.YYYY, we need to parse to sort correctly)
    dailyStats.sort((a, b) => {
        const [d1, m1, y1] = a.date.split('.').map(Number);
        const [d2, m2, y2] = b.date.split('.').map(Number);
        return new Date(y1, m1-1, d1) - new Date(y2, m2-1, d2);
    });

    // Calculate Total Stats
    // Note: Total Start is Start of First Day, Total End is End of Last Day
    // But we should use the global data array for absolute start/end to be precise
    const totalStartL = data[0].liters;
    const totalEndL = data[data.length-1].liters;
    
    const totalRefuelVol = events.filter(e => e.type === 'refuel').reduce((sum, e) => sum + e.volume, 0);
    const totalDrainVol = events.filter(e => e.type === 'drain').reduce((sum, e) => sum + e.volume, 0);
    const totalRefuelCount = events.filter(e => e.type === 'refuel').length;
    const totalDrainCount = events.filter(e => e.type === 'drain').length;
    
    const totalConsumption = totalStartL - totalEndL + totalRefuelVol - totalDrainVol;
    const totalDist = data.reduce((sum, p) => sum + p.dist, 0);
    const totalEngineHours = data.reduce((sum, p) => sum + p.timeDiff, 0);
    const totalAvgCons = totalDist > 0 ? (totalConsumption / totalDist * 100) : 0;

    return {
        daily: dailyStats,
        total: {
            startL: totalStartL,
            endL: totalEndL,
            refuelVol: totalRefuelVol,
            refuelCount: totalRefuelCount,
            drainVol: totalDrainVol,
            drainCount: totalDrainCount,
            consumption: totalConsumption,
            dist: totalDist,
            engineHours: totalEngineHours,
            avgCons: totalAvgCons
        }
    };
}

function processSensorData(rawData) {
    if (!rawData || rawData.length === 0) {
        console.log('Нет данных датчиков за выбранный период');
        sensorData = [];
        // If fuel data is present, re-render to ensure chart is up to date (e.g. clearing old sensor data)
        if (currentData && currentData.length > 0) {
            renderChart(currentData);
        } else {
            // If no fuel data either, render empty chart or handle as needed
            renderChart([]); 
        }
        return;
    }

    let data = rawData.map(item => ({
        ts: new Date(item.wdate).getTime(),
        temp: item.temperature_c !== undefined ? parseFloat(item.temperature_c) : null,
        hum: item.humidity_percent !== undefined ? parseFloat(item.humidity_percent) : null
    }));

    // Sort by time
    data.sort((a, b) => a.ts - b.ts);

    sensorData = data;
    
    // Re-render chart with both datasets
    // We pass currentData (fuel) as the primary data, renderChart will pick up sensorData from global state
    renderChart(currentData);
}

