
// Global variable to store vehicle data
window.vehicleSelectMinData = [];
window.vehicleFleetMapping = {};
window.vehicleSortState = {
    column: 'number',
    direction: 'asc'
};

function initVehicleSelect() {
    const toggleBtn = document.getElementById('toggleVehicleBtn');
    const closeBtn = document.getElementById('closeVehicleOverlayBtn');
    const overlay = document.getElementById('vehicleOverlay');
    const searchInput = document.getElementById('vehicleSearchInput');
    const resetBtn = document.getElementById('vehicleResetFilters');
    const headers = document.querySelectorAll('.vehicle-table th[data-sort]');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            overlay.style.display = 'block';
            if (searchInput) {
                searchInput.focus();
            }
            requestVehicleSelectMin();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            overlay.style.display = 'none';
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', renderVehicleTable);
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            searchInput.value = '';
            renderVehicleTable();
        });
    }

    headers.forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.getAttribute('data-sort');
            if (window.vehicleSortState.column === sortKey) {
                window.vehicleSortState.direction = window.vehicleSortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
                window.vehicleSortState.column = sortKey;
                window.vehicleSortState.direction = 'asc';
            }
            renderVehicleTable();
        });
    });
}

function requestVehicleSelectMin() {
    if (!authData.usr || !authData.pwd) {
        console.error("User not authenticated");
        return;
    }

    // 1. Init Request
    const initReq = {
        name: "Vehicle Select Min",
        type: "etbl",
        mid: 4,
        act: "init",
        usr: authData.usr,
        pwd: authData.pwd,
        uid: authData.uid,
        lang: "en",
    };

    // 2. Setup Request
    const setupReq = {
        name: "Vehicle Select Min",
        type: "etbl",
        mid: 4,
        act: "setup",
        filter: [{ selecteduid: [authData.uid] }],
        nowait: true,
        waitfor: [],
        usr: authData.usr,
        pwd: authData.pwd,
        uid: authData.uid,
        lang: "en",
    };

    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(initReq));
        setTimeout(function () {
            socket.send(JSON.stringify(setupReq));
        }, 150);
    } else {
        console.error("Socket not open");
    }
}

function handleVehicleSelectResponse(data) {
    // Handle Init response to get fleet mapping if needed
    if (data.act === "init" && data.res && data.res[0] && data.res[0].cols) {
        const cols = data.res[0].cols;
        const fleetCol = cols.find(c => c.d === "fleet");
        if (fleetCol && fleetCol.k) {
            window.vehicleFleetMapping = {};
            fleetCol.k.forEach(item => {
                window.vehicleFleetMapping[item.key] = item.val;
            });
        }
    }

    // Handle Setup response with data
    if (data.res && data.res[0] && data.res[0].f) {
        window.vehicleSelectMinData = data.res[0].f;
        renderVehicleTable();
    }
}

function renderVehicleTable() {
    const tbody = document.getElementById('vehicleTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    let data = window.vehicleSelectMinData || [];
    const filterText = document.getElementById('vehicleSearchInput').value.toLowerCase();

    // Filter by fleet: 60 (Синельниково) or 76 (Testing_device)
    const allowedFleets = [60, 76];

    // Filter first
    let filteredData = data.filter(row => {
        // Fleet Filter
        if (!allowedFleets.includes(row.fleet)) {
            return false;
        }

        // Text Search Filter
        const name = (row.number || '').toString(); 
        const id = (row.id || '').toString();
        
        if (filterText && !name.toLowerCase().includes(filterText) && !id.includes(filterText)) {
            return false;
        }
        return true;
    });

    // Sort
    filteredData.sort((a, b) => {
        const col = window.vehicleSortState.column;
        const dir = window.vehicleSortState.direction === 'asc' ? 1 : -1;
        
        let valA = a[col];
        let valB = b[col];

        // Special handling for fleet (sort by name, not ID)
        if (col === 'fleet') {
            valA = window.vehicleFleetMapping[valA] || valA;
            valB = window.vehicleFleetMapping[valB] || valB;
        }
        
        // Handle numbers if possible
        if (!isNaN(valA) && !isNaN(valB)) {
            valA = Number(valA);
            valB = Number(valB);
        } else {
            valA = (valA || '').toString().toLowerCase();
            valB = (valB || '').toString().toLowerCase();
        }

        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
        return 0;
    });

    // Render
    filteredData.forEach(function(row) {
        const tr = document.createElement('tr');
        
        // Get fleet name from mapping or use ID
        const fleetName = window.vehicleFleetMapping[row.fleet] || row.fleet;

        tr.innerHTML = `
            <td>${row.id}</td>
            <td>${row.number}</td>
            <td>${fleetName}</td>
        `;

        tr.addEventListener('click', function() {
            const deviceIdInput = document.getElementById('deviceId');
            if (deviceIdInput) {
                deviceIdInput.value = row.id;
            }
            document.getElementById('vehicleOverlay').style.display = 'none';
        });

        tbody.appendChild(tr);
    });

    // Update header styles (optional visual cue)
    document.querySelectorAll('.vehicle-table th').forEach(th => {
        th.style.backgroundColor = ''; // Reset
        if (th.getAttribute('data-sort') === window.vehicleSortState.column) {
            th.style.backgroundColor = '#e2e6ea'; // Highlight active sort
        }
    });
}
