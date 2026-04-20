const express = require('express');
const router = express.Router();
const ndrrmcService = require('../services/ndrrmcService');
const dohService = require('../services/dohService');
const communityService = require('../services/communityService');

// GET /api/emergency/hotlines
router.get('/hotlines', (req, res) => {
  const { category } = req.query;
  const hotlines = communityService.getEmergencyHotlines(category);
  res.json(hotlines);
});

// GET /api/emergency/evacuation-centers?lat=...&lng=...&radius=...
router.get('/evacuation-centers', async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng query parameters are required' });
    }
    const centers = await ndrrmcService.getEvacuationCenters(
      parseFloat(lat), parseFloat(lng), parseFloat(radius)
    );
    res.json(centers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/emergency/hospitals?lat=...&lng=...&radius=...
router.get('/hospitals', async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng query parameters are required' });
    }
    const hospitals = await dohService.getHospitals(
      parseFloat(lat), parseFloat(lng), parseFloat(radius)
    );
    res.json(hospitals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/emergency/situation-reports
router.get('/situation-reports', async (req, res) => {
  try {
    const reports = await ndrrmcService.getSituationReports();
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
