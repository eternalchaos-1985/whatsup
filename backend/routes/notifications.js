const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const updateChecker = require('../services/updateCheckerService');

// POST /api/notifications/subscribe
router.post('/subscribe', async (req, res) => {
  try {
    const { token, topic } = req.body;
    if (!token || !topic) {
      return res.status(400).json({ error: 'token and topic are required' });
    }
    const result = await notificationService.subscribeToTopic(token, topic);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/unsubscribe
router.post('/unsubscribe', async (req, res) => {
  try {
    const { token, topic } = req.body;
    if (!token || !topic) {
      return res.status(400).json({ error: 'token and topic are required' });
    }
    const result = await notificationService.unsubscribeFromTopic(token, topic);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/preferences
router.post('/preferences', async (req, res) => {
  try {
    const { userId, preferences } = req.body;
    if (!userId || !preferences) {
      return res.status(400).json({ error: 'userId and preferences are required' });
    }
    const result = await notificationService.saveUserPreferences(userId, preferences);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notifications/preferences/:userId
router.get('/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const preferences = await notificationService.getUserPreferences(userId);
    res.json(preferences || { filters: ['hazards', 'emergencies', 'civic', 'events'] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notifications/history — recent push notification log
router.get('/history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const history = await updateChecker.getRecentNotifications(limit);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notifications/status — checker status
router.get('/status', (_req, res) => {
  res.json({
    running: true,
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS, 10) || 180000,
    topics: ['hazard-weather', 'hazard-seismic', 'hazard-ndrrmc', 'fire-alerts', 'utility-advisories', 'civic-news'],
  });
});

// POST /api/notifications/check-now — trigger an immediate refresh
router.post('/check-now', async (_req, res) => {
  try {
    await updateChecker.runOnce();
    res.json({ success: true, message: 'Update check completed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
