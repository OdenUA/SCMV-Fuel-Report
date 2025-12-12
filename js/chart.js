function initChart() {
    const ctx = document.getElementById('fuelChart').getContext('2d');
    fuelChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Уровень топлива (л)',
                    data: [],
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0, // Hide points by default for performance
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.1,
                    yAxisID: 'y'
                },
                {
                    label: 'Температура (°C)',
                    data: [],
                    borderColor: '#dc3545', // Red
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    fill: false,
                    tension: 0.1,
                    yAxisID: 'y1'
                },
                {
                    label: 'Влажность (%)',
                    data: [],
                    borderColor: '#198754', // Green
                    backgroundColor: 'rgba(25, 135, 84, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    fill: false,
                    tension: 0.1,
                    yAxisID: 'y2'
                },
                // Limits
                {
                    label: 'Мин. Темп.',
                    data: [],
                    borderColor: 'rgba(220, 53, 69, 0.5)',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    yAxisID: 'y1',
                    hidden: true
                },
                {
                    label: 'Макс. Темп.',
                    data: [],
                    borderColor: 'rgba(220, 53, 69, 0.5)',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    yAxisID: 'y1',
                    hidden: true
                },
                {
                    label: 'Мин. Вл.',
                    data: [],
                    borderColor: 'rgba(25, 135, 84, 0.5)',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    yAxisID: 'y2',
                    hidden: true
                },
                {
                    label: 'Макс. Вл.',
                    data: [],
                    borderColor: 'rgba(25, 135, 84, 0.5)',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    yAxisID: 'y2',
                    hidden: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour',
                        displayFormats: {
                            hour: 'dd.MM HH:mm'
                        },
                        tooltipFormat: 'dd.MM.yyyy HH:mm:ss'
                    },
                    title: { display: true, text: 'Время' }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Литры' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Температура (°C)' },
                    grid: {
                        drawOnChartArea: false,
                    },
                },
                y2: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Влажность (%)' },
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: ''
                },
                legend: {
                    labels: {
                        filter: function(item, chart) {
                            // Only show if data exists AND not hidden
                            const dataset = chart.datasets[item.datasetIndex];
                            return dataset.data.length > 0 && !dataset.hidden;
                        }
                    }
                },
                zoom: {
                    zoom: {
                        wheel: { enabled: true },
                        pinch: { enabled: true },
                        mode: 'x',
                    },
                    pan: {
                        enabled: true,
                        mode: 'x',
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(2);
                                if (context.datasetIndex === 0) label += ' л';
                                if (context.datasetIndex === 1) label += ' °C';
                                if (context.datasetIndex === 2) label += ' %';
                            }
                            return label;
                        }
                    }
                }
            },
            onHover: (e, elements) => {
                if (elements && elements.length > 0) {
                    // Only highlight map if hovering over fuel dataset (index 0)
                    const el = elements.find(e => e.datasetIndex === 0);
                    if (el) {
                        const idx = el.index;
                        highlightMapPoint(idx);
                    }
                }
            }
        }
    });
    
    // Reset zoom on double click
    document.getElementById('fuelChart').addEventListener('dblclick', () => {
        fuelChart.resetZoom();
    });
}

function renderChart(data) {
    if (!fuelChart) {
        console.warn('Chart not initialized, skipping render');
        return;
    }
    
    // Fuel Data
    const fuelChartData = (data || []).map(d => ({
        x: d.ts,
        y: d.liters
    }));
    
    // Sensor Data (Temperature)
    const tempChartData = (sensorData || []).filter(d => d.temp !== null).map(d => ({
        x: d.ts,
        y: d.temp
    }));

    // Sensor Data (Humidity)
    const humChartData = (sensorData || []).filter(d => d.hum !== null).map(d => ({
        x: d.ts,
        y: d.hum
    }));
    
    fuelChart.data.datasets[0].data = fuelChartData;
    fuelChart.data.datasets[1].data = tempChartData;
    fuelChart.data.datasets[2].data = humChartData;
    
    // Limits
    const minTemp = parseFloat(els.minTemp.value);
    const maxTemp = parseFloat(els.maxTemp.value);
    const minHum = parseFloat(els.minHum.value);
    const maxHum = parseFloat(els.maxHum.value);
    
    // Helper to create constant line
    const createLimitLine = (val, sourceData) => {
        if (isNaN(val) || sourceData.length === 0) return [];
        // Create points at start and end of data range
        // sourceData items have 'ts' property (timestamp)
        const start = sourceData[0].ts; 
        const end = sourceData[sourceData.length - 1].ts;
        return [{x: start, y: val}, {x: end, y: val}];
    };

    // Use sensorData for time range if available, else fuel data
    const timeSource = (sensorData && sensorData.length > 0) ? sensorData : data;
    
    // Only show limits if we have sensor data (temp/hum)
    // If we are in Fuel mode (no sensor data), we should hide limits
    const showTempLimits = tempChartData.length > 0;
    const showHumLimits = humChartData.length > 0;

    if (timeSource && timeSource.length > 0) {
        // Datasets 3,4,5,6 are limits
        fuelChart.data.datasets[3].data = showTempLimits ? createLimitLine(minTemp, timeSource) : []; // Min Temp
        fuelChart.data.datasets[4].data = showTempLimits ? createLimitLine(maxTemp, timeSource) : []; // Max Temp
        fuelChart.data.datasets[5].data = showHumLimits ? createLimitLine(minHum, timeSource) : []; // Min Hum
        fuelChart.data.datasets[6].data = showHumLimits ? createLimitLine(maxHum, timeSource) : []; // Max Hum
        
        // Show limits if data exists
        fuelChart.data.datasets[3].hidden = !showTempLimits;
        fuelChart.data.datasets[4].hidden = !showTempLimits;
        fuelChart.data.datasets[5].hidden = !showHumLimits;
        fuelChart.data.datasets[6].hidden = !showHumLimits;
    } else {
        // Clear limits
        for(let i=3; i<=6; i++) {
            fuelChart.data.datasets[i].data = [];
            fuelChart.data.datasets[i].hidden = true;
        }
    }
    
    // Update Scales Visibility
    const hasFuel = fuelChartData.length > 0;
    const hasTemp = tempChartData.length > 0;
    const hasHum = humChartData.length > 0;

    fuelChart.options.scales.y.display = hasFuel;
    fuelChart.options.scales.y1.display = hasTemp;
    fuelChart.options.scales.y2.display = hasHum;

    // Update chart title depending on which datasets are present
    let titleText = 'График';
    if (hasFuel && (hasTemp || hasHum)) {
        titleText = 'Топливо, температура и влажность';
    } else if (hasFuel) {
        titleText = 'График уровня топлива';
    } else if (hasTemp && hasHum) {
        titleText = 'График температуры и влажности';
    } else if (hasTemp) {
        titleText = 'График температуры';
    } else if (hasHum) {
        titleText = 'График влажности';
    } else {
        titleText = '';
    }

    if (!fuelChart.options.plugins) fuelChart.options.plugins = {};
    if (!fuelChart.options.plugins.title) fuelChart.options.plugins.title = { display: true, text: '' };
    fuelChart.options.plugins.title.text = titleText;

    // Also update the visible header above the chart for clearer UX
    try {
        const headerEl = document.getElementById('chartTitle');
        if (headerEl) {
            headerEl.textContent = titleText || 'График';
        }
    } catch (e) {
        // ignore if DOM not ready
    }

    fuelChart.update();
    // fuelChart.resetZoom(); // Optional: decide if we want to reset zoom on every update
}
