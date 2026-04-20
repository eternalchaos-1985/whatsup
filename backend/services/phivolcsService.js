const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 300 });
const PHIVOLCS_API_URL = process.env.PHIVOLCS_API_URL || 'https://earthquake.phivolcs.dost.gov.ph';

async function fetchWithCache(key, url) {
  const cached = cache.get(key);
  if (cached) return cached;

  const response = await axios.get(url, { timeout: 10000 });
  cache.set(key, response.data);
  return response.data;
}

async function getLatestEarthquakes() {
  try {
    return await fetchWithCache('latest-earthquakes', `${PHIVOLCS_API_URL}/api/earthquakes/latest`);
  } catch (error) {
    console.error('Error fetching earthquake data:', error.message);
    throw new Error('Failed to fetch earthquake data');
  }
}

async function getEarthquakeByMagnitude(minMagnitude = 3.0) {
  try {
    const data = await getLatestEarthquakes();
    if (Array.isArray(data)) {
      return data.filter(eq => eq.magnitude >= minMagnitude);
    }
    return data;
  } catch (error) {
    console.error('Error filtering earthquakes:', error.message);
    throw new Error('Failed to filter earthquake data');
  }
}

async function getVolcanicActivity() {
  try {
    return await fetchWithCache('volcanic-activity', `${PHIVOLCS_API_URL}/api/volcanic-activity`);
  } catch (error) {
    console.error('Error fetching volcanic activity:', error.message);
    throw new Error('Failed to fetch volcanic activity data');
  }
}

async function getTsunamiWarnings() {
  try {
    return await fetchWithCache('tsunami-warnings', `${PHIVOLCS_API_URL}/api/tsunami-warnings`);
  } catch (error) {
    console.error('Error fetching tsunami warnings:', error.message);
    throw new Error('Failed to fetch tsunami warnings');
  }
}

async function getAllAlerts() {
  const [earthquakes, volcanic, tsunami] = await Promise.allSettled([
    getLatestEarthquakes(),
    getVolcanicActivity(),
    getTsunamiWarnings(),
  ]);

  return {
    earthquakes: earthquakes.status === 'fulfilled' ? earthquakes.value : null,
    volcanic: volcanic.status === 'fulfilled' ? volcanic.value : null,
    tsunami: tsunami.status === 'fulfilled' ? tsunami.value : null,
  };
}

module.exports = {
  getLatestEarthquakes,
  getEarthquakeByMagnitude,
  getVolcanicActivity,
  getTsunamiWarnings,
  getAllAlerts,
};