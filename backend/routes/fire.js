const express = require('express');
const router = express.Router();
const fireService = require('../services/fireService');

// GET /api/fire — aggregated fire incidents
router.get('/', async (req, res) => {
  try {
    const { lat, lng, radius, dateFrom, dateTo, location } = req.query;
    const data = await fireService.getFireIncidents({
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radius: radius ? parseFloat(radius) : 10,
      dateFrom,
      dateTo,
      location,
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fire incident data' });
  }
});

// GET /api/fire/satellite — NASA FIRMS hotspots only
router.get('/satellite', async (req, res) => {
  try {
    const { days } = req.query;
    const data = await fireService.getNasaFirmsData(days ? parseInt(days, 10) : 2);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/fire/news — fire-related news
router.get('/news', async (req, res) => {
  try {
    const { location, dateFrom, dateTo } = req.query;
    const data = await fireService.getFireNews(location, dateFrom, dateTo);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/fire/bfp — BFP official reports
router.get('/bfp', async (req, res) => {
  try {
    const { location } = req.query;
    const data = await fireService.getBFPReports(location);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
