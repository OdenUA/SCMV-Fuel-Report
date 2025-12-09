function initMap() {
    map = L.map('map').setView([48.3794, 31.1656], 6); // Default center (Ukraine approx)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    
    trackLayer = L.layerGroup().addTo(map);
    markersLayer = L.layerGroup().addTo(map);

    // Map Hover Interaction (Show fuel on route)
    // We use a "closest point" approach on mousemove
    map.on('mousemove', function(e) {
        if (!currentData || currentData.length === 0) return;
        
        // Find closest point in data
        let minDist = Infinity;
        let closest = null;
        let closestIdx = -1;
        
        // Optimization: only search if within bounds
        if (!map.getBounds().contains(e.latlng)) return;
        
        // Simple linear search (can be optimized with spatial index for large datasets)
        currentData.forEach((p, i) => {
            const d = e.latlng.distanceTo([p.lat, p.lon]);
            if (d < minDist) {
                minDist = d;
                closest = p;
                closestIdx = i;
            }
        });
        
        // If close enough (e.g. 500 meters screen distance equivalent? No, just meters)
        // Let's say 100 meters radius
        if (closest && minDist < 500) {
            els.hoverInfo.textContent = `Время: ${formatDate(closest.dateObj)} | Топливо: ${closest.liters.toFixed(2)} л | Скорость: ${closest.speed.toFixed(1)} км/ч`;
            
            // Update highlight marker
            if (!mapHighlightMarker) {
                mapHighlightMarker = L.circleMarker([closest.lat, closest.lon], {
                    radius: 6,
                    color: 'orange',
                    fillColor: 'yellow',
                    fillOpacity: 1
                }).addTo(map);
            } else {
                mapHighlightMarker.setLatLng([closest.lat, closest.lon]);
            }
            
            // Sync Chart (optional, might be heavy)
            // fuelChart.setActiveElements([{datasetIndex: 0, index: closestIdx}]);
            // fuelChart.update();
        } else {
            els.hoverInfo.textContent = 'Наведите на маршрут для информации...';
            if (mapHighlightMarker) {
                map.removeLayer(mapHighlightMarker);
                mapHighlightMarker = null;
            }
        }
    });
}

function focusMapOnPoint(lat, lon) {
    if (!map) return;
    map.setView([lat, lon], 15);
    
    // Optional: Add a temporary marker or popup
    L.popup()
        .setLatLng([lat, lon])
        .setContent('Событие здесь')
        .openOn(map);
}

function renderMap(data) {
    trackLayer.clearLayers();
    markersLayer.clearLayers();
    
    if (data.length === 0) return;
    
    // Draw Polyline with Gap Detection
    // We iterate and build segments. If time diff > GAP_THRESHOLD, we start a new segment.
    // We also draw a red line for the gap.
    
    let currentSegment = [];
    
    for (let i = 0; i < data.length; i++) {
        const p = data[i];
        
        if (i === 0) {
            currentSegment.push([p.lat, p.lon]);
            continue;
        }
        
        const prev = data[i-1];
        const timeDiff = p.ts - prev.ts;
        
        // Check for gap (Time or Distance)
        if (timeDiff > GAP_THRESHOLD_MS || p.dist > GAP_DISTANCE_KM) {
            // Finish current segment (Blue)
            if (currentSegment.length > 1) {
                L.polyline(currentSegment, {color: 'blue', weight: 3, opacity: 0.7}).addTo(trackLayer);
            }
            
            // Draw Gap (Red)
            L.polyline([[prev.lat, prev.lon], [p.lat, p.lon]], {
                color: 'red', 
                weight: 3, 
                opacity: 0.7, 
                dashArray: '5, 10'
            }).addTo(trackLayer);
            
            // Start new segment
            currentSegment = [[p.lat, p.lon]];
        } else {
            currentSegment.push([p.lat, p.lon]);
        }
    }
    
    // Draw last segment
    if (currentSegment.length > 1) {
        L.polyline(currentSegment, {color: 'blue', weight: 3, opacity: 0.7}).addTo(trackLayer);
    }
    
    // Fit bounds
    if (data.length > 0) {
        const bounds = L.latLngBounds(data.map(d => [d.lat, d.lon]));
        map.fitBounds(bounds);
    }
    
    // Add Event Markers
    processedEvents.forEach(ev => {
        const color = ev.type === 'refuel' ? 'green' : 'red';
        const label = ev.type === 'refuel' ? 'Заправка' : 'Слив';
        
        L.circleMarker([ev.end.lat, ev.end.lon], {
            radius: 8,
            fillColor: color,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).bindPopup(`
            <b>${label}</b><br>
            Объем: ${ev.volume.toFixed(2)} л<br>
            Время: ${formatDate(ev.end.dateObj)}
        `).addTo(markersLayer);
    });
}

function highlightMapPoint(index) {
    if (!currentData[index]) return;
    const p = currentData[index];
    
    if (!mapHighlightMarker) {
        mapHighlightMarker = L.circleMarker([p.lat, p.lon], {
            radius: 8,
            color: 'orange',
            fillColor: 'yellow',
            fillOpacity: 1
        }).addTo(map);
    } else {
        mapHighlightMarker.setLatLng([p.lat, p.lon]);
        if (!mapHighlightMarker._map) mapHighlightMarker.addTo(map);
    }
    map.panTo([p.lat, p.lon]);
}
