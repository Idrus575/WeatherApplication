const axios = require("axios");
const { saveWeather, getRecentHistory } = require("../models/weatherModel");

// 1. API Security: Use Environment Variable
const API_KEY = process.env.OPENWEATHER_API_KEY;

// 2. Performance Caching: In-memory cache store
const cache = {};
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

exports.getWeather = async (req, res) => {
const userCity = req.params.city;
const cacheKey = `city_${userCity.toLowerCase()}`;

// Check Cache
if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < CACHE_DURATION_MS)) {
console.log("Serving from Cache:", userCity);
return res.json(cache[cacheKey].data);
}

try {
console.log("Fetching fresh data for City:", userCity);

// 1. Geocoding API to auto-correct spelling and get coordinates
const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${userCity}&limit=1&appid=${API_KEY}`;
const geoResponse = await axios.get(geoUrl);

if (!geoResponse.data || geoResponse.data.length === 0) {
return res.status(404).json({ message: "City not found" });
}

const { name: correctCityName, lat, lon } = geoResponse.data[0];

// Delegate to common coordinate fetcher
const responseData = await fetchWeatherData(correctCityName, userCity, lat, lon);

// Save to Cache
cache[cacheKey] = {
timestamp: Date.now(),
data: responseData
};

res.json(responseData);

} catch (error) {
console.log("ERROR OCCURRED:", error.message, error.response?.status, error.config?.url);
res.status(500).json({ message: "Error fetching external weather API" });
}
};

// New Controller: Geolocation based search
exports.getWeatherByCoords = async (req, res) => {
const { lat, lon } = req.query;

if (!lat || !lon) {
return res.status(400).json({ message: "Latitude and Longitude are required" });
}

const cacheKey = `coords_${lat}_${lon}`;

// Check Cache
if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < CACHE_DURATION_MS)) {
console.log("Serving from Cache coords:", lat, lon);
return res.json(cache[cacheKey].data);
}

try {
console.log(`Fetching fresh data for Coords: ${lat}, ${lon}`);

// We need the city name from reverse geocoding, but if it fails we still have coords!
let correctCityName = `Lat: ${parseFloat(lat).toFixed(2)}, Lon: ${parseFloat(lon).toFixed(2)}`;
try {
const geoUrl = `http://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`;
const geoResponse = await axios.get(geoUrl);
if (geoResponse.data && geoResponse.data.length > 0) {
correctCityName = geoResponse.data[0].name;
}
} catch (e) {
console.log("Reverse geocode failed, using generic name.");
}

const responseData = await fetchWeatherData(correctCityName, correctCityName, lat, lon);

// Save to Cache
cache[cacheKey] = {
timestamp: Date.now(),
data: responseData
};

res.json(responseData);

} catch (error) {
console.log("ERROR OCCURRED by coords:", error.message);
res.status(500).json({ message: "Error fetching external weather API" });
}
};

// New Controller: MySQL History Search
exports.getHistory = (req, res) => {
getRecentHistory((err, cities) => {
if (err) {
return res.status(500).json({ message: "Error fetching history from database" });
}
res.json(cities);
});
};

// Common function to fetch the heavy payloads
async function fetchWeatherData(correctCityName, userCity, lat, lon) {
const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
const airPollutionUrl = `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

const [weatherRes, forecastRes, airRes] = await Promise.all([
axios.get(weatherUrl),
axios.get(forecastUrl),
axios.get(airPollutionUrl)
]);

const current = weatherRes.data;
const forecast = forecastRes.data;
const airQualityIndex = airRes.data.list[0].main.aqi; // 1 = Good, 5 = Very Poor

// Save history (fire and forget)
if (!correctCityName.includes("Lat:")) {
saveWeather(correctCityName, current.main.temp, current.main.humidity, current.weather[0].description);
}

return {
city: correctCityName,
searchedCity: userCity,
lat: lat,
lon: lon,
timezone: current.timezone, // Offset in seconds from UTC
current: {
temperature: current.main.temp,
humidity: current.main.humidity,
description: current.weather[0].description,
icon: current.weather[0].icon,
windSpeed: current.wind.speed,
feelsLike: current.main.feels_like,
pressure: current.main.pressure,
visibility: current.visibility,
clouds: current.clouds.all, // Cloud coverage %
tempMin: current.main.temp_min,
tempMax: current.main.temp_max,
sunrise: current.sys.sunrise,
sunset: current.sys.sunset
},
airQuality: airQualityIndex,
forecastList: forecast.list.slice(0, 40).map(item => ({
dt: item.dt,
main: item.main,
weather: item.weather,
pop: item.pop // Probability of Precipitation 0-1
}))
};
}