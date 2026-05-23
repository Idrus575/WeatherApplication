const db = require("../db");

exports.saveWeather = (city, temperature, humidity, description) => {
const query = "INSERT INTO weather_history (city, temperature, humidity, description) VALUES (?, ?, ?, ?)";
db.query(query, [city, temperature, humidity, description], (err, result) => {
if (err) {
console.error("Error saving weather to history:", err);
} else {
console.log(`Weather for ${city} saved to history (ID: ${result.insertId}).`);
}
});
};

exports.getRecentHistory = (callback) => {
// Fetch 10 most recent unique cities
const query = `
SELECT city
FROM weather_history
GROUP BY city
ORDER BY MAX(created_at) DESC
LIMIT 10
`;
db.query(query, (err, results) => {
if (err) {
console.error("Error fetching history:", err);
return callback(err, null);
}
const cities = results.map(row => row.city);
callback(null, cities);
});
};