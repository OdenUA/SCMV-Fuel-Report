function initMap() {
    map = L.map('map').setView([48.3794, 31.1656], 6); // Default center (Ukraine approx)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    
    trackLayer = L.layerGroup().addTo(map);
    markersLayer = L.layerGroup().addTo(map);

    // Helper to find closest point
    const findClosest = (latlng) => {
        if (!currentData || currentData.length === 0) return null;
        if (!map.getBounds().contains(latlng)) return null;

        let minSqDist = Infinity;
        let closestIdx = -1;
        const mLat = latlng.lat;
        const mLon = latlng.lng;
        
        if (spatialIndex) {
            const scale = spatialIndex.scale;
            const x = Math.floor(mLat * scale);
            const y = Math.floor(mLon * scale);
            
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const key = `${x+dx},${y+dy}`;
                    const indices = spatialIndex.grid[key];
                    if (indices) {
                        for (let k = 0; k < indices.length; k++) {
                            const idx = indices[k];
                            const p = currentData[idx];
                            const dLat = p.lat - mLat;
                            const dLon = p.lon - mLon;
                            const sqDist = dLat*dLat + dLon*dLon;
                            if (sqDist < minSqDist) {
                                minSqDist = sqDist;
                                closestIdx = idx;
                            }
                        }
                    }
                }
            }
        } else {
            for (let i = 0; i < currentData.length; i++) {
                const p = currentData[i];
                const dLat = p.lat - mLat;
                const dLon = p.lon - mLon;
                const sqDist = dLat*dLat + dLon*dLon;
                if (sqDist < minSqDist) {
                    minSqDist = sqDist;
                    closestIdx = i;
                }
            }
        }
        
        if (closestIdx !== -1) {
            const p = currentData[closestIdx];
            // Check real distance (threshold ~500m)
            if (latlng.distanceTo([p.lat, p.lon]) < 500) {
                return { point: p, index: closestIdx };
            }
        }
        return null;
    };

    // 1. Mouse Move: Show Info & Marker (No Chart Sync)
    let lastMoveTime = 0;
    map.on('mousemove', function(e) {
        const now = Date.now();
        if (now - lastMoveTime < 40) return; 
        lastMoveTime = now;

        const result = findClosest(e.latlng);
        
        if (result) {
            const { point } = result;
            els.hoverInfo.textContent = `Время: ${formatDate(point.dateObj)} | Топливо: ${point.liters.toFixed(2)} л | Скорость: ${point.speed.toFixed(1)} км/ч`;
            
            if (!mapHighlightMarker) {
                mapHighlightMarker = L.circleMarker([point.lat, point.lon], {
                    radius: 6,
                    color: 'orange',
                    fillColor: 'yellow',
                    fillOpacity: 1
                }).addTo(map);
            } else {
                mapHighlightMarker.setLatLng([point.lat, point.lon]);
            }
        } else {
            els.hoverInfo.textContent = 'Кликните на маршрут для информации...';
            if (mapHighlightMarker) {
                map.removeLayer(mapHighlightMarker);
                mapHighlightMarker = null;
            }
        }
    });

    // 2. Click: Sync Chart
    map.on('click', function(e) {
        const result = findClosest(e.latlng);
        
        if (result) {
            const { index } = result;
            if (typeof fuelChart !== 'undefined' && fuelChart) {
                fuelChart.setActiveElements([{datasetIndex: 0, index: index}]);
                fuelChart.tooltip.setActiveElements([{datasetIndex: 0, index: index}]);
                fuelChart.update();
            }
        } else {
            if (typeof fuelChart !== 'undefined' && fuelChart) {
                fuelChart.setActiveElements([]);
                fuelChart.tooltip.setActiveElements([]);
                fuelChart.update();
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
        const pl = L.polyline(currentSegment, {color: 'blue', weight: 3, opacity: 0.7}).addTo(trackLayer);
    }

    // Add Direction Arrows
    // We collect all valid segments to decorate
    const allSegments = [];
    let tempSeg = [];
    for (let i = 0; i < data.length; i++) {
        const p = data[i];
        if (i === 0) {
            tempSeg.push([p.lat, p.lon]);
            continue;
        }
        const prev = data[i-1];
        const timeDiff = p.ts - prev.ts;
        if (timeDiff > GAP_THRESHOLD_MS || p.dist > GAP_DISTANCE_KM) {
            if (tempSeg.length > 1) allSegments.push(tempSeg);
            tempSeg = [[p.lat, p.lon]];
        } else {
            tempSeg.push([p.lat, p.lon]);
        }
    }
    if (tempSeg.length > 1) allSegments.push(tempSeg);

    // Create decorator
    if (decoratorLayer) {
        map.removeLayer(decoratorLayer);
    }
    
    const multiPolyline = L.polyline(allSegments);
    decoratorLayer = L.polylineDecorator(multiPolyline, {
        patterns: [
            {
                offset: '5%',
                repeat: '100px', // Repeat every 100 pixels
                symbol: L.Symbol.arrowHead({
                    pixelSize: 10,
                    polygon: false,
                    pathOptions: { stroke: true, color: '#0d6efd', opacity: 0.8, weight: 2 }
                })
            }
        ]
    }).addTo(map);
    
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
