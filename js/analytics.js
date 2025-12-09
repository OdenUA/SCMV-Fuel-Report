// --- Data Processing ---
function processData(rawData) {
    if (!rawData || rawData.length === 0) {
        alert('Нет данных за выбранный период');
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
