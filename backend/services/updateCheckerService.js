const { db } = require('../firebaseConfig');
const notificationService = require('./notificationService');
const pagasaService = require('./pagasaService');
const phivolcsService = require('./phivolcsService');
const ndrrmcService = require('./ndrrmcService');
const fireService = require('./fireService');
const utilityService = require('./utilityService');
const newsService = require('./newsService');

// Firestore collection for snapshot tracking
const SNAPSHOTS_COLLECTION = 'update_snapshots';
const NOTIFICATION_LOG_COLLECTION = 'notification_log';

// Poll interval in ms (default: 3 minutes)
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS, 10) || 3 * 60 * 1000;

// Topic → human-readable category mapping
const TOPICS = {
  'hazard-weather': { label: 'Weather Alert', icon: '🌀' },
  'hazard-seismic': { label: 'Seismic Alert', icon: '🌋' },
  'hazard-ndrrmc': { label: 'Disaster Alert', icon: '🚨' },
  'fire-alerts': { label: 'Fire Report', icon: '🔥' },
  'utility-advisories': { label: 'Utility Advisory', icon: '🔧' },
  'civic-news': { label: 'Local News', icon: '📰' },
};

/**
 * Generate a simple fingerprint from an array of items.
 * Uses a sorted hash of IDs or titles to detect changes.
 */
function fingerprint(items) {
  if (!items || !Array.isArray(items) || items.length === 0) return '';
  return items
    .map((item) => item.id || item.title || JSON.stringify(item).slice(0, 80))
    .sort()
    .join('|');
}

/**
 * Get the stored snapshot for a given source key.
 */
async function getSnapshot(key) {
  try {
    const doc = await db.collection(SNAPSHOTS_COLLECTION).doc(key).get();
    return doc.exists ? doc.data() : null;
  } catch (err) {
    console.error(`[UpdateChecker] Error reading snapshot for ${key}:`, err.message);
    return null;
  }
}

/**
 * Save a new snapshot.
 */
async function saveSnapshot(key, hash, itemCount) {
  try {
    await db.collection(SNAPSHOTS_COLLECTION).doc(key).set({
      hash,
      itemCount,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`[UpdateChecker] Error saving snapshot for ${key}:`, err.message);
  }
}

/**
 * Log a sent notification to Firestore for history.
 */
async function logNotification(topic, title, body, itemCount) {
  try {
    await db.collection(NOTIFICATION_LOG_COLLECTION).add({
      topic,
      title,
      body,
      itemCount,
      sentAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`[UpdateChecker] Error logging notification:`, err.message);
  }
}

/**
 * Check a single data source, compare with snapshot, and push if changed.
 */
async function checkSource(key, topic, fetchFn, formatFn) {
  try {
    const data = await fetchFn();
    const items = Array.isArray(data) ? data : [];
    const hash = fingerprint(items);

    if (!hash) return; // no data — skip

    const prev = await getSnapshot(key);

    if (prev && prev.hash === hash) {
      return; // no change
    }

    // Determine what changed
    const countDiff = prev ? items.length - (prev.itemCount || 0) : items.length;
    const isNew = !prev;
    const { label, icon } = TOPICS[topic] || { label: topic, icon: '🔔' };

    const title = isNew
      ? `${icon} New ${label}`
      : `${icon} ${label} Updated`;

    const body = isNew
      ? `${items.length} ${label.toLowerCase()}(s) detected.`
      : countDiff > 0
        ? `${countDiff} new ${label.toLowerCase()}(s) detected.`
        : `${label} information has been updated.`;

    const detail = formatFn ? formatFn(items) : body;

    // Send FCM topic push
    await notificationService.sendTopicNotification(topic, title, detail, {
      topic,
      count: String(items.length),
      timestamp: new Date().toISOString(),
    });

    // Update snapshot
    await saveSnapshot(key, hash, items.length);

    // Log for history
    await logNotification(topic, title, detail, items.length);

    console.log(`[UpdateChecker] Pushed "${topic}": ${title}`);
  } catch (err) {
    // Log but don't crash the loop
    console.error(`[UpdateChecker] Error checking ${key}:`, err.message);
  }
}

// ─── Source Definitions ──────────────────────────────────────────────

async function fetchWeatherAlerts() {
  const warnings = await pagasaService.getAllWarnings();
  return [
    ...(warnings.typhoons || []),
    ...(warnings.floods || []),
    ...(warnings.rainfall || []),
  ];
}

async function fetchSeismicAlerts() {
  const [earthquakes, volcanic, tsunami] = await Promise.allSettled([
    phivolcsService.getLatestEarthquakes(),
    phivolcsService.getVolcanicActivity(),
    phivolcsService.getTsunamiWarnings(),
  ]);
  return [
    ...(earthquakes.status === 'fulfilled' && Array.isArray(earthquakes.value) ? earthquakes.value : []),
    ...(volcanic.status === 'fulfilled' && Array.isArray(volcanic.value) ? volcanic.value : []),
    ...(tsunami.status === 'fulfilled' && Array.isArray(tsunami.value) ? tsunami.value : []),
  ];
}

async function fetchNdrrmcAlerts() {
  const alerts = await ndrrmcService.getDisasterAlerts();
  return Array.isArray(alerts) ? alerts : [];
}

async function fetchFireAlerts() {
  const data = await fireService.getNasaFirmsData(1);
  return Array.isArray(data) ? data : [];
}

async function fetchUtilityAdvisories() {
  const types = ['water', 'electric', 'internet'];
  const results = await Promise.allSettled(
    types.map((t) => utilityService.getUtilityNews(t, 'Philippines'))
  );
  return results.flatMap((r) =>
    r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : []
  );
}

async function fetchCivicNews() {
  try {
    const articles = await newsService.getLocalNews('Philippines civic government local', 10);
    return Array.isArray(articles) ? articles : [];
  } catch {
    return [];
  }
}

function formatWeather(items) {
  if (items.length === 0) return 'No active weather warnings.';
  const first = items[0];
  return first.title || first.description || `${items.length} weather warning(s) active.`;
}

function formatSeismic(items) {
  if (items.length === 0) return 'No seismic activity.';
  const first = items[0];
  const mag = first.magnitude ? ` (M${first.magnitude})` : '';
  return first.title || `Earthquake${mag} reported. ${items.length} event(s) total.`;
}

function formatFire(items) {
  return `${items.length} satellite fire hotspot(s) detected in the Philippines.`;
}

// ─── Main Loop ───────────────────────────────────────────────────────

let intervalId = null;

async function runOnce() {
  console.log(`[UpdateChecker] Running check at ${new Date().toISOString()}`);

  await Promise.allSettled([
    checkSource('weather-alerts', 'hazard-weather', fetchWeatherAlerts, formatWeather),
    checkSource('seismic-alerts', 'hazard-seismic', fetchSeismicAlerts, formatSeismic),
    checkSource('ndrrmc-alerts', 'hazard-ndrrmc', fetchNdrrmcAlerts),
    checkSource('fire-alerts', 'fire-alerts', fetchFireAlerts, formatFire),
    checkSource('utility-advisories', 'utility-advisories', fetchUtilityAdvisories),
    checkSource('civic-news', 'civic-news', fetchCivicNews),
  ]);

  console.log(`[UpdateChecker] Check complete.`);
}

function start() {
  if (intervalId) return;
  console.log(`[UpdateChecker] Starting with ${POLL_INTERVAL_MS / 1000}s interval`);

  // Run immediately on startup, then on interval
  runOnce();
  intervalId = setInterval(runOnce, POLL_INTERVAL_MS);
}

function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[UpdateChecker] Stopped.');
  }
}

/**
 * Get recent notification log entries.
 */
async function getRecentNotifications(limit = 50) {
  try {
    const snapshot = await db
      .collection(NOTIFICATION_LOG_COLLECTION)
      .orderBy('sentAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error('[UpdateChecker] Error fetching log:', err.message);
    return [];
  }
}

module.exports = { start, stop, runOnce, getRecentNotifications };
