const express = require('express');
const router = express.Router();
const pagasaService = require('../services/pagasaService');
const phivolcsService = require('../services/phivolcsService');
const airQualityService = require('../services/airQualityService');
const ndrrmcService = require('../services/ndrrmcService');
const dohService = require('../services/dohService');
const geoService = require('../services/geoService');

// GET /api/hazards — aggregated hazard dashboard
router.get('/', async (req, res) => {
  try {
    const [pagasa, phivolcs] = await Promise.allSettled([
      pagasaService.getAllWarnings(),
      phivolcsService.getAllAlerts(),
    ]);

    res.json({
      weather: pagasa.status === 'fulfilled' ? pagasa.value : null,
      seismic: phivolcs.status === 'fulfilled' ? phivolcs.value : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hazard data' });
  }
});

// GET /api/hazards/weather — PAGASA weather data
router.get('/weather', async (req, res) => {
  try {
    const { location } = req.query;
    const data = await pagasaService.getWeatherForecast(location);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/hazards/typhoons
router.get('/typhoons', async (req, res) => {
  try {
    const data = await pagasaService.getTyphoonWarnings();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/hazards/floods
router.get('/floods', async (req, res) => {
  try {
    const data = await pagasaService.getFloodAlerts();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/hazards/rainfall
router.get('/rainfall', async (req, res) => {
  try {
    const data = await pagasaService.getRainfallWarnings();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/hazards/earthquakes
router.get('/earthquakes', async (req, res) => {
  try {
    const { minMagnitude } = req.query;
    const data = minMagnitude
      ? await phivolcsService.getEarthquakeByMagnitude(parseFloat(minMagnitude))
      : await phivolcsService.getLatestEarthquakes();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/hazards/volcanic
router.get('/volcanic', async (req, res) => {
  try {
    const data = await phivolcsService.getVolcanicActivity();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/hazards/tsunami
router.get('/tsunami', async (req, res) => {
  try {
    const data = await phivolcsService.getTsunamiWarnings();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/hazards/air-quality?lat=...&lng=...
router.get('/air-quality', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng query parameters are required' });
    }
    const data = await airQualityService.getAirQualityByCoords(parseFloat(lat), parseFloat(lng));
    const level = data.aqi ? airQualityService.getAQILevel(data.aqi) : null;
    res.json({ ...data, level });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/hazards/ndrrmc — disaster alerts
router.get('/ndrrmc', async (req, res) => {
  try {
    const data = await ndrrmcService.getDisasterAlerts();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/hazards/health — DOH advisories
router.get('/health', async (req, res) => {
  try {
    const { location } = req.query;
    const [advisories, outbreaks] = await Promise.allSettled([
      dohService.getHealthAdvisories(),
      dohService.getDiseaseOutbreaks(location),
    ]);
    res.json({
      advisories: advisories.status === 'fulfilled' ? advisories.value : null,
      outbreaks: outbreaks.status === 'fulfilled' ? outbreaks.value : null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/hazards/nearby?lat=...&lng=...&radius=...
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng query parameters are required' });
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const parsedRadius = parseFloat(radius);

    const [weather, seismic, airQuality, ndrrmc, health] = await Promise.allSettled([
      pagasaService.getAllWarnings(),
      phivolcsService.getAllAlerts(),
      airQualityService.getAirQualityByCoords(parsedLat, parsedLng),
      ndrrmcService.getDisasterAlerts(),
      dohService.getHealthAdvisories(),
    ]);

    res.json({
      location: { lat: parsedLat, lng: parsedLng, radius: parsedRadius },
      weather: weather.status === 'fulfilled' ? weather.value : null,
      seismic: seismic.status === 'fulfilled' ? seismic.value : null,
      airQuality: airQuality.status === 'fulfilled' ? airQuality.value : null,
      ndrrmc: ndrrmc.status === 'fulfilled' ? ndrrmc.value : null,
      health: health.status === 'fulfilled' ? health.value : null,
      geoBuffer: geoService.createRadiusBuffer(parsedLat, parsedLng, parsedRadius),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch nearby hazards' });
  }
});

module.exports = router;
