// --- State ---
var socket = null;
var authData = { uid: null, usr: '', pwd: '' };
var fuelChart = null;
var map = null;
var trackLayer = null;
var markersLayer = null;
var currentData = []; // Processed fuel data
var sensorData = []; // Processed sensor data
var processedEvents = [];
var mapHighlightMarker = null;
var polyline = null;
var decoratorLayer = null;
var spatialIndex = null; // { grid: {}, scale: 100 }
var loadState = {
    fuel: false,
    sensors: false
};

