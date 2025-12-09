// --- State ---
var socket = null;
var authData = { uid: null, usr: '', pwd: '' };
var fuelChart = null;
var map = null;
var trackLayer = null;
var markersLayer = null;
var currentData = [];
var processedEvents = [];
var mapHighlightMarker = null;
var polyline = null;
var spatialIndex = null; // { grid: {}, scale: 100 }

