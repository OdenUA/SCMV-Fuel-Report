// --- WebSocket Logic ---
var reconnectTimer = null;

function connect() {
    console.log('Connect called');
    
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    if (socket) {
        socket.close();
    }
    
    els.status.textContent = 'Подключение...';
    els.status.className = 'status-indicator status-loading';
    els.connectBtn.disabled = true;
    
    socket = new WebSocket(WS_URL);
    
    socket.onopen = () => {
        els.status.textContent = 'Подключено. Выполняется вход...';
        sendLogin();
    };
    
    socket.onclose = (event) => {
        els.status.textContent = 'Отключено';
        els.status.className = 'status-indicator status-disconnected';
        els.connectBtn.disabled = false;
        els.loadBtn.disabled = true;

        // Auto-reconnect if connection lost unexpectedly
        if (!event.wasClean) {
            els.status.textContent = 'Связь потеряна. Повтор через 3с...';
            reconnectTimer = setTimeout(connect, 3000);
        }
    };
    
    socket.onerror = (err) => {
        console.error('WS Error', err);
        els.status.textContent = 'Ошибка подключения';
        els.status.className = 'status-indicator status-disconnected';
    };
    
    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleMessage(data);
        } catch (e) {
            console.error('Parse error', e);
        }
    };
}

function sendLogin() {
    const usr = els.loginUser.value;
    const pwd = els.loginPass.value;
    
    if (!usr || !pwd) {
        alert('Введите логин и пароль');
        return;
    }
    
    // Save credentials if "Remember Me" is checked
    if (els.rememberMe.checked) {
        localStorage.setItem('dt_user', usr);
        localStorage.setItem('dt_pwd', pwd);
    } else {
        localStorage.removeItem('dt_user');
        localStorage.removeItem('dt_pwd');
    }
    
    authData.usr = usr;
    authData.pwd = pwd;
    
    const req = {
        name: "login",
        type: "login",
        mid: 0,
        act: "setup",
        usr: usr,
        pwd: pwd,
        uid: 0,
        lang: "en"
    };
    socket.send(JSON.stringify(req));
}

function requestReport() {
    const deviceId = els.deviceId.value;
    if (!deviceId) {
        alert('Введите ID устройства');
        return;
    }
    
    // Convert local time to UTC ISO string for server
    let dFrom, dTo;
    
    if (els.dateFrom._flatpickr && els.dateTo._flatpickr) {
        dFrom = els.dateFrom._flatpickr.selectedDates[0];
        dTo = els.dateTo._flatpickr.selectedDates[0];
    } else {
        dFrom = new Date(els.dateFrom.value);
        dTo = new Date(els.dateTo.value);
    }
    
    if (!dFrom || !dTo || isNaN(dFrom.getTime()) || isNaN(dTo.getTime())) {
        alert('Некорректная дата');
        return;
    }
    
    els.loadBtn.disabled = true;
    els.loadBtn.textContent = 'Загрузка...';
    
    // Reset state
    loadState.fuel = false;
    loadState.sensors = false;
    currentData = [];
    sensorData = [];

    const reqFuel = {
        name: "Fuel Litres",
        type: "etbl",
        mid: 2,
        act: "filter",
        filter: [
            { selectedpgdateto: [dTo.toISOString()] },
            { selectedpgdatefrom: [dFrom.toISOString()] },
            { selectedvihicleid: [deviceId] }
        ],
        usr: authData.usr,
        pwd: authData.pwd,
        uid: authData.uid,
        lang: "en"
    };
    
    const reqSensors = {
        name: "Sensors",
        type: "etbl",
        mid: 2,
        act: "filter",
        filter: [
            { selectedvihicleid: [deviceId] },
            { selectedpgdatefrom: [dFrom.toISOString()] },
            { selectedpgdateto: [dTo.toISOString()] }
        ],
        usr: authData.usr,
        pwd: authData.pwd,
        uid: authData.uid,
        lang: "en"
    };

    socket.send(JSON.stringify(reqFuel));
    socket.send(JSON.stringify(reqSensors));
}

function handleMessage(data) {
    // Login response
    if (data.name === "login") {
        if (data.res && data.res[0] && data.res[0].uid) {
            authData.uid = data.res[0].uid;
            els.status.textContent = `Подключено (UID: ${authData.uid})`;
            els.status.className = 'status-indicator status-connected';
            els.loadBtn.disabled = false;
        } else if (data.uid) {
            authData.uid = data.uid;
            els.status.textContent = `Подключено (UID: ${authData.uid})`;
            els.status.className = 'status-indicator status-connected';
            els.loadBtn.disabled = false;
        } else {
            els.status.textContent = 'Ошибка входа: ' + (data.msg || 'Unknown');
            els.status.className = 'status-indicator status-disconnected';
        }
        return;
    }

    // Vehicle Select Min response
    if (data.name === "Vehicle Select Min") {
        if (typeof handleVehicleSelectResponse === 'function') {
            handleVehicleSelectResponse(data);
        }
        return;
    }
    
    // Fuel Report response
    if (data.name === "Fuel Litres") {
        loadState.fuel = true;
        checkLoadStatus();
        
        let rawData = [];
        if (data.res && data.res[0] && data.res[0].f) {
            rawData = data.res[0].f;
        } else if (Array.isArray(data.res)) {
            rawData = data.res;
        }
        
        processData(rawData);
    }

    // Sensors response
    if (data.name === "Sensors") {
        loadState.sensors = true;
        checkLoadStatus();

        let rawData = [];
        if (data.res && data.res[0] && data.res[0].f) {
            rawData = data.res[0].f;
        } else if (Array.isArray(data.res)) {
            rawData = data.res;
        }

        if (typeof processSensorData === 'function') {
            processSensorData(rawData);
        }
    }
}

function checkLoadStatus() {
    if (loadState.fuel && loadState.sensors) {
        els.loadBtn.disabled = false;
        els.loadBtn.textContent = 'Загрузить отчет';
    }
}

async function fetchAddresses() {
    const placeholders = document.querySelectorAll('.address-placeholder');
    for (let el of placeholders) {
        const lat = el.dataset.lat;
        const lon = el.dataset.lon;
        
        try {
            // Using Nominatim (OpenStreetMap) - Respect Usage Policy!
            // In production, use a paid service or your own geocoder.
            // Adding delay to be nice to the demo API
            await new Promise(r => setTimeout(r, 1000));
            
            const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
            if (resp.ok) {
                const data = await resp.json();
                el.textContent = data.display_name || 'Адрес не найден';
            } else {
                el.textContent = 'Ошибка геокодирования';
            }
        } catch (e) {
            el.textContent = 'Ошибка сети';
        }
    }
}
