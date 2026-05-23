const express = require("express");

const router = express.Router();

const { getWeather, getWeatherByCoords, getHistory } = require("../controllers/weatherController");

router.get("/history", getHistory);
router.get("/coords", getWeatherByCoords);
router.get("/:city", getWeather);

module.exports = router;