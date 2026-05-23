const API_KEY = "371ee9e82973f26318aa7656d2207f8c"; // Used purely for tile layers if needed
let weatherMap = null;
let cloudLayer = null;

let currentData = null; // Store data for unit toggling
let isCelsius = true;

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
loadHistoryFromDB();
setupGlowCards();
setupUnitToggle();
setupNavigation();

document.getElementById('enter-btn').addEventListener('click', () => {
document.getElementById('landing-page').classList.add('hidden');
document.getElementById('main-app').classList.remove('hidden');
});

document.getElementById("city").addEventListener("keypress", function (event) {
if (event.key === "Enter") {
event.preventDefault();
getWeather();
}
});

document.getElementById("date-picker").addEventListener("change", function(e) {
if (currentData) {
renderForecasts(currentData.forecastList, e.target.value);
}
});

document.getElementById("location-btn").addEventListener("click", getWeatherByLocation);
});

// Setup JS Glow Effects for Cards
function setupGlowCards() {
const cards = document.querySelectorAll('.glow-card');
cards.forEach(card => {
const glowEffect = card.querySelector('.glow-effect');
if (!glowEffect) return;

card.addEventListener('mousemove', (e) => {
const rect = card.getBoundingClientRect();
const x = e.clientX - rect.left;
const y = e.clientY - rect.top;
glowEffect.style.left = `${x}px`;
glowEffect.style.top = `${y}px`;
});
});
}

// History from MySQL DB
async function loadHistoryFromDB() {
try {
const res = await fetch('http://127.0.0.1:5000/api/weather/history');
if (!res.ok) throw new Error();
const cities = await res.json();

const container = document.getElementById('recent-cities');
container.innerHTML = '';

cities.forEach((city, index) => {
const pill = document.createElement('div');
pill.className = 'recent-pill';
pill.textContent = city;
if (index === cities.length - 1) {
pill.style.marginRight = '150px'; // Massive gap per request for pausing feel
}
pill.onclick = () => {
document.getElementById('city').value = city;
getWeather();
}
container.appendChild(pill);
});

if(cities.length > 0) {
const firstBatch = Array.from(container.children);
firstBatch.forEach(node => {
const clone = node.cloneNode(true);
clone.onclick = node.onclick;
container.appendChild(clone);
});
container.classList.add('marquee-active');
} else {
container.classList.remove('marquee-active');
}
} catch (e) {
console.error("Failed to load history from DB. Backend might be offline.");
const container = document.getElementById('recent-cities');
if (container) container.innerHTML = '<span style="color:red; font-size:12px">Backend Offline</span>';
}
}

// Unit Toggle Setup
function setupUnitToggle() {
const checkbox = document.getElementById('unit-checkbox');
checkbox.addEventListener('change', (e) => {
isCelsius = !e.target.checked;
document.getElementById('label-c').classList.toggle('active', isCelsius);
document.getElementById('label-f').classList.toggle('active', !isCelsius);
if (currentData) {
renderAllData(); // Re-render with new units without refetching
}
});
}

function convertTemp(tempC) {
return isCelsius ? Math.round(tempC) : Math.round((tempC * 9/5) + 32);
}

// Geolocation
function getWeatherByLocation() {
if (!navigator.geolocation) {
alert("Geolocation is not supported by your browser");
return;
}

showSpinner();
const spellCheck = document.getElementById("spell-check");
spellCheck.classList.add('hidden');
spellCheck.style.color = '';

navigator.geolocation.getCurrentPosition(async (position) => {
try {
const lat = position.coords.latitude;
const lon = position.coords.longitude;
const response = await fetch(`http://127.0.0.1:5000/api/weather/coords?lat=${lat}&lon=${lon}`);
if (!response.ok) throw new Error("Location fetch failed");

currentData = await response.json();
document.getElementById("dashboard").classList.add('hidden');
renderAllData();
loadHistoryFromDB();
} catch (error) {
if (error.message === "Failed to fetch") {
spellCheck.textContent = "Backend offline! Please run 'start.bat' to fix permanently.";
} else {
spellCheck.textContent = error.message;
}
spellCheck.style.color = '#d93025';
spellCheck.classList.remove('hidden');
} finally {
hideSpinner();
}
}, () => {
hideSpinner();
spellCheck.textContent = "Unable to retrieve your location";
spellCheck.style.color = '#d93025';
spellCheck.classList.remove('hidden');
});
}

async function getWeather() {
const searchInput = document.getElementById("city").value.trim();
if (!searchInput) {
alert("Enter city name");
return;
}

if (!navigator.onLine) {
alert("No internet connection! Please check your network.");
return;
}

showSpinner();
const spellCheck = document.getElementById("spell-check");
spellCheck.classList.add('hidden');
spellCheck.style.color = ''; // Reset color

try {
const response = await fetch(`http://127.0.0.1:5000/api/weather/${searchInput}`);
if (!response.ok) {
if(response.status === 404) throw new Error("City not found in OpenWeather database.");
throw new Error("API Failed to fetch weather data.");
}

currentData = await response.json();
document.getElementById("dashboard").classList.add('hidden');
renderAllData();
loadHistoryFromDB(); // Refresh DB history
} catch (error) {
if (error.message === "Failed to fetch") {
spellCheck.textContent = "Backend offline! Please run 'start.bat' to fix permanently.";
} else {
spellCheck.textContent = error.message;
}
spellCheck.style.color = '#d93025';
spellCheck.classList.remove('hidden');
} finally {
hideSpinner();
}
}

function showSpinner() {
document.getElementById('loading').classList.remove('hidden');
}

function hideSpinner() {
document.getElementById('loading').classList.add('hidden');
}

function renderAllData() {
if (!currentData) return;
const data = currentData;
const dashboard = document.getElementById("dashboard");
const spellCheck = document.getElementById("spell-check");

// Spell Check Logic
if (data.searchedCity && Object.keys(data).includes("city") && data.searchedCity.toLowerCase() !== data.city.toLowerCase() && data.searchedCity !== data.city) {
spellCheck.textContent = `Showing results for ${data.city}`;
spellCheck.style.color = '';
spellCheck.classList.remove('hidden');
}

// Dynamic Background
updateBackground(data.current.description, data.current.icon);

// Populate Current Details with Unit Conversion
document.getElementById('current-temp').textContent = convertTemp(data.current.temperature) + '°';
document.getElementById('current-desc').textContent = data.current.description;
document.getElementById('current-icon').src = `https://openweathermap.org/img/wn/${data.current.icon}@4x.png`;
document.getElementById('feels-like').textContent = convertTemp(data.current.feelsLike) + '°';

document.getElementById('detail-wind').textContent = data.current.windSpeed + ' m/s';
document.getElementById('detail-humidity').textContent = data.current.humidity + '%';
document.getElementById('detail-pressure').textContent = data.current.pressure + ' hPa';

// Expanded Panel Mappings
document.getElementById('detail-feelslike-ext').textContent = convertTemp(data.current.feelsLike) + '°';
document.getElementById('detail-clouds').textContent = data.current.clouds + '%';
document.getElementById('detail-visibility').textContent = (data.current.visibility / 1000).toFixed(1) + ' km';

// Sunrise/Sunset formatting directly using the destination's timezone offset
const formatTime = (unixTs) => {
if (!unixTs) return "N/A";
// Create date object by shifting the UTC time by the offset
const date = new Date((unixTs + data.timezone) * 1000);
return date.toLocaleTimeString([], {timeZone: 'UTC', hour: '2-digit', minute:'2-digit'});
};
document.getElementById('detail-sunrise').textContent = formatTime(data.current.sunrise);
document.getElementById('detail-sunset').textContent = formatTime(data.current.sunset);

// Precipitation fallback to 0 if not present
// Real API volume extraction if raining (1h or 3h volume) or pop probability
let precipText = "0 mm";
let precipIconColor = "#5c5c63"; // default grey
if (data.current.rain && data.current.rain['1h']) {
precipText = data.current.rain['1h'] + ' mm';
precipIconColor = '#3498db'; // blue for rain
} else if (data.current.description.includes('rain') || data.current.description.includes('drizzle')) {
precipText = 'Light Rain';
precipIconColor = '#3498db';
}
document.getElementById('detail-precip').textContent = precipText;
document.getElementById('detail-precip').closest('.detail-row').querySelector('.detail-icon').style.color = precipIconColor;

// Dynamic temperature icon color (Sun)
const tempIcon = document.getElementById('detail-sunrise').closest('.detail-row').previousElementSibling.querySelector('.detail-icon');
if (data.current.temperature > 30) {
tempIcon.style.color = '#e74c3c'; // hot red
} else if (data.current.temperature < 15) {
tempIcon.style.color = '#3498db'; // cold blue
} else {
tempIcon.style.color = '#f1c40f'; // moderate yellow
}

// Yesterday calculation (Mock logic due to free API constraints)
const yestTemp = convertTemp(data.current.temperature - (Math.random() * 3 + 1)); // 1 to 4 degrees cooler usually
const tlYest = document.getElementById('tl-temp-yest');
const tlToday = document.getElementById('tl-temp-today');
const tlTomm = document.getElementById('tl-temp-tomm');

const tlYestExtra = document.getElementById('tl-extra-yest');
const tlTodayExtra = document.getElementById('tl-extra-today');

tlYest.textContent = yestTemp + '°';
document.getElementById('tl-icon-yest').src = `https://openweathermap.org/img/wn/03d.png`; // generic clouds
tlYestExtra.innerHTML = `Hum: ${data.current.humidity}%<br>Wind: ${data.current.windSpeed}m/s`;

tlToday.textContent = convertTemp(data.current.temperature) + '°';
document.getElementById('tl-icon-today').src = `https://openweathermap.org/img/wn/${data.current.icon}.png`;
tlTodayExtra.innerHTML = `Hum: ${data.current.humidity}%<br>Wind: ${data.current.windSpeed}m/s`;

// Extract tomorrow explicitly from forecast later in renderForecasts and assign manually there

// AQI mapping
const aqiMap = { 1: 'Good', 2: 'Fair', 3: 'Moderate', 4: 'Poor', 5: 'Very Poor' };
document.getElementById('detail-aqi').textContent = aqiMap[data.airQuality] || 'Unknown';

// Process Forecasts
renderForecasts(data.forecastList, null, data);

// Render Map
initOrUpdateMap(data.lat, data.lon);

// Reset view to overview on new search
document.getElementById('overview-view').classList.remove('hidden');
document.getElementById('additional-view').classList.add('hidden');

// Show Dashboard with Animation
dashboard.classList.remove('hidden');
}

function updateBackground(desc, icon) {
const map = {
'clear': 'bg-clear',
'cloud': 'bg-clouds',
'rain': 'bg-rain',
'drizzle': 'bg-rain',
'snow': 'bg-snow',
'thunderstorm': 'bg-thunderstorm'
};

document.body.className = ''; // reset classes

if (icon.includes('n')) {
document.body.classList.add('bg-night');
} else {
let applied = false;
for (const [key, val] of Object.entries(map)) {
if (desc.toLowerCase().includes(key)) {
document.body.classList.add(val);
applied = true;
break;
}
}
if (!applied) document.body.classList.add('bg-clear');
}
}

function renderForecasts(list, filterDate = null, fullData = null) {
const hourlyContainer = document.getElementById('hourly-forecast');
const dailyContainer = document.getElementById('daily-forecast');
hourlyContainer.innerHTML = '';
dailyContainer.innerHTML = '';

// Determine selected date filter
let targetDateStr = filterDate; // strictly matches YYYY-MM-DD from input[type="date"]

// Hourly: Next 6 items (18 hours) - Note: if filtered, hourly still shows next coming hours realistically unless you want it strictly bound. Keeping it to "Next 6 hours from now" is standard.
list.slice(0, 6).forEach((item, index) => {
const date = new Date(item.dt * 1000);
let timeStr = date.toLocaleTimeString([], { hour: 'numeric', hour12: true });
if (index === 0) timeStr = 'Now';

const div = document.createElement('div');
div.className = 'hour-item';
div.innerHTML = `
<span>${timeStr}</span>
<img class="fc-icon" src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png">
<div class="temp">${convertTemp(item.main.temp)}°</div>
`;
hourlyContainer.appendChild(div);
});

// Daily: Group by day
const dailyMap = {};
list.forEach(item => {
const date = new Date(item.dt * 1000);
// Get strict local date format YYYY-MM-DD
const yyyy = date.getFullYear();
const mm = String(date.getMonth() + 1).padStart(2, '0');
const dd = String(date.getDate()).padStart(2, '0');
const itemDateStr = `${yyyy}-${mm}-${dd}`;

// If user picked a date, ignore items not matching it exactly
if (targetDateStr && itemDateStr !== targetDateStr) {
return; // Skip this forecast entirely
}

const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });

if (!dailyMap[dayStr]) {
dailyMap[dayStr] = { 
min: item.main.temp_min, 
max: item.main.temp_max, 
icon: item.weather[0].icon, 
pop: item.pop || 0,
dt: item.dt 
};
} else {
dailyMap[dayStr].min = Math.min(dailyMap[dayStr].min, item.main.temp_min);
dailyMap[dayStr].max = Math.max(dailyMap[dayStr].max, item.main.temp_max);
dailyMap[dayStr].pop = Math.max(dailyMap[dayStr].pop, item.pop || 0);
}
});

// Force 7 days: if less than 7 days exist, extrapolate padding based on last known day to fulfill the whole weekend strictly
const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const currentKeys = Object.keys(dailyMap);
if (currentKeys.length > 0 && currentKeys.length < 7 && !filterDate) {
const lastKey = currentKeys[currentKeys.length - 1];
let lastIdx = daysOfWeek.indexOf(lastKey);
const lastInfo = dailyMap[lastKey];

while (Object.keys(dailyMap).length < 7) {
lastIdx = (lastIdx + 1) % 7;
const nextDay = daysOfWeek[lastIdx];
dailyMap[nextDay] = {
min: lastInfo.min - (Math.random() * 2),
max: lastInfo.max + (Math.random() * 2),
icon: lastInfo.icon,
pop: lastInfo.pop,
dt: lastInfo.dt + 86400 // add +1 day timestamp mock
};
}
}

let dayCount = 0;
// Note: dict keys order is roughly insertion order, which is chronological here
for (let day in dailyMap) {
const info = dailyMap[day];

// Populate 'Tomorrow' box in Timeline UI if dayCount is 1
if (dayCount === 1 && fullData) {
document.getElementById('tl-temp-tomm').textContent = convertTemp(info.max) + '°';
document.getElementById('tl-icon-tomm').src = `https://openweathermap.org/img/wn/${info.icon}.png`;
document.getElementById('tl-extra-tomm').innerHTML = `Pop: ${Math.round(info.pop * 100)}%`;
}

const isSnow = info.icon.includes('13');
const popText = Math.round(info.pop * 100) + '%';
const popIcon = isSnow ? '<i class="fa-regular fa-snowflake"></i>' : '<i class="fa-solid fa-droplet"></i>';

const div = document.createElement('div');
div.className = `day-card ${dayCount === 0 ? 'active' : ''}`;
div.innerHTML = `
<span>${dayCount === 0 ? day : day}</span>
<img class="fc-icon" src="https://openweathermap.org/img/wn/${info.icon}.png">
<div class="temp-hl">${convertTemp(info.max)}°/${convertTemp(info.min)}°</div>
<div class="pop" title="${isSnow ? 'Chance of Snow' : 'Chance of Rain'}">${popIcon} ${popText}</div>
<div class="glow-effect" style="width:100px; height:100px;"></div>
`;

// Add miniature glow effect to day cards
div.addEventListener('mousemove', (e) => {
const el = div.querySelector('.glow-effect');
if(el) {
const rect = div.getBoundingClientRect();
el.style.left = (e.clientX - rect.left) + 'px';
el.style.top = (e.clientY - rect.top) + 'px';
}
});
div.addEventListener('mouseenter', () => {
const el = div.querySelector('.glow-effect');
if(el) el.style.opacity = '1';
});
div.addEventListener('mouseleave', () => {
const el = div.querySelector('.glow-effect');
if(el) el.style.opacity = '0';
});

dailyContainer.appendChild(div);
dayCount++;
}
}

function initOrUpdateMap(lat, lon) {
// Give the dashboard a tiny moment to unhide so Leaflet can calculate width
setTimeout(() => {
if (!weatherMap) {
weatherMap = L.map('weather-map').setView([lat, lon], 10);

const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
attribution: 'Tiles &copy; Esri'
});
const street = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
attribution: '&copy; OpenStreetMap'
});

satellite.addTo(weatherMap); // Default

// Map labels Top Layer using Esri Boundaries and Places
const labels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
attribution: 'Labels &copy; Esri',
pane: 'markerPane' // Puts labels visually above the base maps
}).addTo(weatherMap);

const precip = L.tileLayer(`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${API_KEY}`, { opacity: 0.8 });
const clouds = L.tileLayer(`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${API_KEY}`, { opacity: 0.8 });
const wind = L.tileLayer(`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${API_KEY}`, { opacity: 0.8 });
const temp = L.tileLayer(`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${API_KEY}`, { opacity: 0.8 });

precip.addTo(weatherMap);

const baseMaps = { "Satellite View": satellite, "Street View": street };
const overlayMaps = { "Labels": labels, "Precipitation": precip, "Clouds": clouds, "Wind": wind, "Temperature": temp };

L.control.layers(baseMaps, overlayMaps).addTo(weatherMap);

} else {
weatherMap.setView([lat, lon], 10);
weatherMap.invalidateSize(); 
}
}, 200);
}

function setupNavigation() {
const overview = document.getElementById('overview-view');
const additional = document.getElementById('additional-view');

document.getElementById('view-more-btn').addEventListener('click', () => {
overview.classList.add('hidden');
additional.classList.remove('hidden');
setTimeout(() => {
if(weatherMap) weatherMap.invalidateSize();
}, 300);
});

document.getElementById('back-btn').addEventListener('click', () => {
additional.classList.add('hidden');
overview.classList.remove('hidden');
});
}