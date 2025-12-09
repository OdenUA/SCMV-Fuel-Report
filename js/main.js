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
    
    // Format for datetime-local: YYYY-MM-DDTHH:mm
    const toLocalISO = (d) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    
    els.dateFrom.value = toLocalISO(startOfDay);
    els.dateTo.value = toLocalISO(endOfDay);
    
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
