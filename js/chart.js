function initChart() {
    const ctx = document.getElementById('fuelChart').getContext('2d');
    fuelChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Уровень топлива (л)',
                data: [],
                borderColor: '#0d6efd',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                borderWidth: 2,
                pointRadius: 0, // Hide points by default for performance
                pointHoverRadius: 6,
                fill: true,
                tension: 0.1
            }]
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
                    title: { display: true, text: 'Литры' }
                }
            },
            plugins: {
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
                            return `Топливо: ${context.parsed.y.toFixed(2)} л`;
                        }
                    }
                }
            },
            onHover: (e, elements) => {
                if (elements && elements.length > 0) {
                    const idx = elements[0].index;
                    highlightMapPoint(idx);
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
    const chartData = data.map(d => ({
        x: d.ts,
        y: d.liters
    }));
    
    fuelChart.data.datasets[0].data = chartData;
    fuelChart.update();
    fuelChart.resetZoom();
}
