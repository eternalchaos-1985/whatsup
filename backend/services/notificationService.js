const { messaging, db } = require('../firebaseConfig');

/**
 * Send a push notification to a specific device token.
 */
async function sendNotification(token, title, body, data = {}) {
  const message = {
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
    token,
  };

  try {
    const response = await messaging.send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Error sending notification:', error.message);
    throw new Error('Failed to send notification');
  }
}

/**
 * Send notifications to a topic (e.g., 'hazard-alerts', 'civic-updates').
 */
async function sendTopicNotification(topic, title, body, data = {}) {
  const message = {
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
    topic,
  };

  try {
    const response = await messaging.send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Error sending topic notification:', error.message);
    throw new Error('Failed to send topic notification');
  }
}

/**
 * Subscribe a device token to a notification topic.
 */
async function subscribeToTopic(token, topic) {
  try {
    const response = await messaging.subscribeToTopic(token, topic);
    return { success: true, results: response };
  } catch (error) {
    console.error('Error subscribing to topic:', error.message);
    throw new Error('Failed to subscribe to topic');
  }
}

/**
 * Unsubscribe a device token from a notification topic.
 */
async function unsubscribeFromTopic(token, topic) {
  try {
    const response = await messaging.unsubscribeFromTopic(token, topic);
    return { success: true, results: response };
  } catch (error) {
    console.error('Error unsubscribing from topic:', error.message);
    throw new Error('Failed to unsubscribe from topic');
  }
}

/**
 * Save user notification preferences.
 */
async function saveUserPreferences(userId, preferences) {
  try {
    await db.collection('users').doc(userId).set(
      { notificationPreferences: preferences },
      { merge: true }
    );
    return { success: true };
  } catch (error) {
    console.error('Error saving preferences:', error.message);
    throw new Error('Failed to save notification preferences');
  }
}

/**
 * Get user notification preferences.
 */
async function getUserPreferences(userId) {
  try {
    const doc = await db.collection('users').doc(userId).get();
    return doc.exists ? doc.data().notificationPreferences : null;
  } catch (error) {
    console.error('Error fetching preferences:', error.message);
    throw new Error('Failed to fetch notification preferences');
  }
}

module.exports = {
  sendNotification,
  sendTopicNotification,
  subscribeToTopic,
  unsubscribeFromTopic,
  saveUserPreferences,
  getUserPreferences,
};
