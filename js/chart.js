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
                legend: {
                    labels: {
                        filter: function(item, chart) {
                            // Only show if data exists
                            const dataset = chart.datasets[item.datasetIndex];
                            return dataset.data.length > 0;
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
    
    // Update Scales Visibility
    const hasFuel = fuelChartData.length > 0;
    const hasTemp = tempChartData.length > 0;
    const hasHum = humChartData.length > 0;

    fuelChart.options.scales.y.display = hasFuel;
    fuelChart.options.scales.y1.display = hasTemp;
    fuelChart.options.scales.y2.display = hasHum;

    fuelChart.update();
    // fuelChart.resetZoom(); // Optional: decide if we want to reset zoom on every update
}
