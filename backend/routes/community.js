const express = require('express');
const router = express.Router();
const communityService = require('../services/communityService');
const newsService = require('../services/newsService');

// GET /api/community/events?lat=...&lng=...&radius=...
router.get('/events', async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng query parameters are required' });
    }
    const events = await communityService.getLocalEvents(
      parseFloat(lat), parseFloat(lng), parseFloat(radius)
    );
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/community/lgu?municipality=...
router.get('/lgu', async (req, res) => {
  try {
    const { municipality } = req.query;
    const announcements = await communityService.getLGUAnnouncements(municipality);
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/community/news?location=...
router.get('/news', async (req, res) => {
  try {
    const { location } = req.query;
    const news = await newsService.getPhilippinesNews(location);
    res.json(news);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/community/civic?address=...
router.get('/civic', async (req, res) => {
  try {
    const { address } = req.query;
    if (!address) {
      return res.status(400).json({ error: 'address query parameter is required' });
    }
    const info = await newsService.getCivicInfo(address);
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/community/hotlines?category=...
router.get('/hotlines', (req, res) => {
  const { category } = req.query;
  const hotlines = communityService.getEmergencyHotlines(category);
  res.json(hotlines);
});

module.exports = router;
