// --- Initialization ---
function init() {
    // Restore credentials
    const savedUser = localStorage.getItem('dt_user');
    const savedPwd = localStorage.getItem('dt_pwd');
    
    if (savedUser && savedPwd) {
        els.loginUser.value = savedUser;
        els.loginPass.value = savedPwd;
        els.rememberMe.checked = true;
        
        // Auto-connect if credentials exist
        // Small delay to ensure UI is ready
        setTimeout(connect, 500);
    } else {
        els.rememberMe.checked = false;
    }
    
    // Set default dates (Today)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    // Flatpickr initialization
    const fpConfig = {
        enableTime: true,
        dateFormat: "d-m-Y H:i",
        time_24hr: true,
        allowInput: true,
        closeOnSelect: true,
        locale: "ru",
        clickOpens: false,
        onChange: function(selectedDates, dateStr, instance) {
            instance.close();
        }
    };

    const fpFrom = flatpickr(els.dateFrom, {
        ...fpConfig,
        defaultDate: startOfDay
    });

    const fpTo = flatpickr(els.dateTo, {
        ...fpConfig,
        defaultDate: endOfDay
    });

    // Bind buttons to open calendar
    if (els.btnDateFrom) {
        els.btnDateFrom.addEventListener('click', () => fpFrom.open());
    }
    if (els.btnDateTo) {
        els.btnDateTo.addEventListener('click', () => fpTo.open());
    }
    
    // Init Map
    try {
        initMap();
    } catch (e) {
        console.error('Map init error:', e);
    }
    
    // Init Chart
    try {
        initChart();
    } catch (e) {
        console.error('Chart init error:', e);
    }

    // Init Vehicle Select
    try {
        if (typeof initVehicleSelect === 'function') {
            initVehicleSelect();
        }
    } catch (e) {
        console.error('Vehicle Select init error:', e);
    }
    
    // Initial View State
    if (typeof toggleView === 'function') {
        toggleView('hidden');
    }
    
    // Init Settings Listeners
    try {
        if (typeof initSettingsListeners === 'function') {
            initSettingsListeners();
        }
    } catch (e) {
        console.error('Settings listeners init error:', e);
    }
    
    // Event Listeners
    if (els.connectBtn) {
        els.connectBtn.addEventListener('click', connect);
    } else {
        console.error('Connect button not found');
    }
    
    if (els.loadBtn) {
        els.loadBtn.addEventListener('click', requestReport);
    }
    
    if (els.settingsToggle) {
        els.settingsToggle.addEventListener('click', () => els.settingsPanel.classList.toggle('visible'));
    }
}

// Start
// Ensure DOM is loaded if script is in head, but we will put it at end of body
document.addEventListener('DOMContentLoaded', init);
