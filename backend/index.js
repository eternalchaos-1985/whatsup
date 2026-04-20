const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { app, updateChecker } = require('./server');

// Export the Express app as a Gen 2 Cloud Function
exports.api = onRequest(
  {
    region: 'asia-southeast1',
    memory: '512MiB',
    timeoutSeconds: 60,
    cors: true,
  },
  app
);

// Scheduled function to check for updates every 3 minutes
exports.checkUpdates = onSchedule(
  {
    schedule: 'every 3 minutes',
    region: 'asia-southeast1',
    memory: '512MiB',
    timeoutSeconds: 120,
  },
  async () => {
    await updateChecker.runOnce();
  }
);
