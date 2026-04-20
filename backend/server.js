require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const hazardRoutes = require('./routes/hazards');
const communityRoutes = require('./routes/community');
const emergencyRoutes = require('./routes/emergency');
const notificationRoutes = require('./routes/notifications');
const fireRoutes = require('./routes/fire');
const utilityRoutes = require('./routes/utilities');
const lguRoutes = require('./routes/lgu');
const updateChecker = require('./services/updateCheckerService');

const app = express();
const port = process.env.PORT || 3000;

// Security & parsing middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:4200', 'https://whatsup-civic.web.app', 'https://whatsup-civic.firebaseapp.com'],
}));
app.use(express.json());

// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'WhatsUp Civic & Hazard API', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/hazards', hazardRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/fire', fireRoutes);
app.use('/api/utilities', utilityRoutes);
app.use('/api/lgu', lguRoutes);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Export for Firebase Functions
module.exports = { app, updateChecker };

// Start standalone server when run directly (not imported by Cloud Functions)
if (require.main === module) {
  app.listen(port, () => {
    console.log(`WhatsUp API server running on http://localhost:${port}`);
    updateChecker.start();
  });
}