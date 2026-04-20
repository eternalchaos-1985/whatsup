const express = require('express');
const router = express.Router();
const lguService = require('../services/lguService');

// GET /api/lgu/officials?area=...&level=...
router.get('/officials', async (req, res) => {
  try {
    const { area, level } = req.query;
    if (!area) {
      return res.status(400).json({ error: 'area query parameter is required' });
    }
    const officials = await lguService.getOfficials(area, level || 'barangay');
    res.json(officials);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lgu/by-location?lat=...&lng=...
router.get('/by-location', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng query parameters are required' });
    }
    const data = await lguService.getOfficialsByCoords(parseFloat(lat), parseFloat(lng));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lgu/facilities?lat=...&lng=...&radius=...
router.get('/facilities', async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng query parameters are required' });
    }
    const facilities = await lguService.getNearbyFacilities(
      parseFloat(lat), parseFloat(lng), radius ? parseFloat(radius) * 1000 : 5000
    );
    res.json(facilities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lgu/civic?address=...
router.get('/civic', async (req, res) => {
  try {
    const { address } = req.query;
    if (!address) {
      return res.status(400).json({ error: 'address query parameter is required' });
    }
    const data = await lguService.getCivicRepresentatives(address);
    res.json(data || { offices: [], officials: [], divisions: {} });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lgu/search?query=...&level=...
// Supports address geocoding: if query looks like an address/place, geocode it first
router.get('/search', async (req, res) => {
  try {
    const { query, level } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'query parameter is required' });
    }

    // Try address-based search first (geocode the query)
    const addressResult = await lguService.searchByAddress(query);
    if (addressResult) {
      return res.json(addressResult);
    }

    // Fall back to name/position search
    const results = await lguService.searchOfficials(query, level);
    res.json({ officials: results, facilities: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lgu/levels — reference data for official positions
router.get('/levels', (_req, res) => {
  res.json(lguService.OFFICIAL_LEVELS);
});

// GET /api/lgu/service-types — reference data for facility types
router.get('/service-types', (_req, res) => {
  res.json(lguService.SERVICE_TYPES);
});

module.exports = router;
