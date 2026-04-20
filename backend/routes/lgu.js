const express = require('express');
const router = express.Router();
const lguService = require('../services/lguService');
const dilgService = require('../services/dilgService');

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

// GET /api/lgu/search?query=...&level=...
// Returns list of matching locations. Use /api/lgu/by-location to drill into one.
router.get('/search', async (req, res) => {
  try {
    const { query, level } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'query parameter is required' });
    }

    // Get multiple matching locations
    const locations = await lguService.searchLocations(query);
    if (locations.length > 0) {
      return res.json({ locations });
    }

    // Fall back to name/position search against officials database
    const results = await lguService.searchOfficials(query, level);
    res.json({ locations: [], officials: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── PSGC Geographic Hierarchy ───

// GET /api/lgu/regions
router.get('/regions', async (_req, res) => {
  try {
    const regions = await lguService.getRegions();
    res.json(regions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lgu/provinces/:regionCode
router.get('/provinces/:regionCode', async (req, res) => {
  try {
    const provinces = await lguService.getProvinces(req.params.regionCode);
    res.json(provinces);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lgu/cities/:parentCode?type=region|province
router.get('/cities/:parentCode', async (req, res) => {
  try {
    const cities = await lguService.getCitiesMunicipalities(
      req.params.parentCode, req.query.type || 'region'
    );
    res.json(cities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lgu/barangays/:cityMunCode
router.get('/barangays/:cityMunCode', async (req, res) => {
  try {
    const barangays = await lguService.getBarangays(req.params.cityMunCode);
    res.json(barangays);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lgu/levels — reference data for official positions
router.get('/levels', (_req, res) => {
  res.json(lguService.OFFICIAL_LEVELS);
});

// ─── DILG Barangay Officials ───

// GET /api/lgu/dilg/regions — DILG region codes
router.get('/dilg/regions', (_req, res) => {
  res.json(dilgService.REGION_CODES);
});

// GET /api/lgu/dilg/barangays?city=Manila&region=13 — list barangays with official counts
router.get('/dilg/barangays', async (req, res) => {
  try {
    const { city, region } = req.query;
    if (!city || !region) {
      return res.status(400).json({ error: 'city and region query parameters are required' });
    }
    const barangays = await dilgService.getBarangayList(city, region);
    res.json({ barangays, count: barangays.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lgu/dilg/officials?region=13&city=...&barangay=...
router.get('/dilg/officials', async (req, res) => {
  try {
    const { region, city, barangay } = req.query;
    if (!region) {
      return res.status(400).json({ error: 'region query parameter is required (e.g. 13 for NCR)' });
    }
    if (city) {
      const officials = await dilgService.getBarangayOfficials(barangay || null, city, region);
      return res.json({ officials, count: officials.length });
    }
    const officials = await dilgService.getCityOfficials(city || '', region);
    res.json({ officials, count: officials.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lgu/dilg/search?q=...&region=13
router.get('/dilg/search', async (req, res) => {
  try {
    const { q, region } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'q query parameter is required' });
    }
    const officials = await dilgService.searchOfficialsByName(q, region || '13');
    res.json({ officials, count: officials.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/lgu/service-types — reference data for facility types
router.get('/service-types', (_req, res) => {
  res.json(lguService.SERVICE_TYPES);
});

module.exports = router;
