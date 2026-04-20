const express = require('express');
const router = express.Router();
const utilityService = require('../services/utilityService');

// GET /api/utilities — all utility advisories (water, electric, internet)
router.get('/', async (req, res) => {
  try {
    const { location } = req.query;
    const data = await utilityService.getAllUtilityAdvisories(location);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch utility advisories' });
  }
});

// GET /api/utilities/water
router.get('/water', async (req, res) => {
  try {
    const { location } = req.query;
    const data = await utilityService.getAdvisories('water', location);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/utilities/electric
router.get('/electric', async (req, res) => {
  try {
    const { location } = req.query;
    const data = await utilityService.getAdvisories('electric', location);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/utilities/internet
router.get('/internet', async (req, res) => {
  try {
    const { location } = req.query;
    const data = await utilityService.getAdvisories('internet', location);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/utilities/providers — list known utility providers
router.get('/providers', (_req, res) => {
  res.json(utilityService.UTILITY_SOURCES);
});

module.exports = router;
