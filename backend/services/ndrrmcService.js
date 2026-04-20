const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 300 });
const NDRRMC_FEED_URL = 'https://ndrrmc.gov.ph/api'; // Replace with actual NDRRMC feed URL

async function getDisasterAlerts() {
  const cached = cache.get('ndrrmc-alerts');
  if (cached) return cached;

  try {
    const response = await axios.get(`${NDRRMC_FEED_URL}/alerts`, { timeout: 10000 });
    cache.set('ndrrmc-alerts', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching NDRRMC alerts:', error.message);
    throw new Error('Failed to fetch NDRRMC disaster alerts');
  }
}

async function getEvacuationCenters(lat, lng, radius) {
  const cacheKey = `evac-${lat}-${lng}-${radius}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${NDRRMC_FEED_URL}/evacuation-centers`, {
      params: { lat, lng, radius },
      timeout: 10000,
    });
    cache.set(cacheKey, response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching evacuation centers:', error.message);
    throw new Error('Failed to fetch evacuation centers');
  }
}

async function getSituationReports() {
  const cached = cache.get('ndrrmc-sitrep');
  if (cached) return cached;

  try {
    const response = await axios.get(`${NDRRMC_FEED_URL}/situation-reports`, { timeout: 10000 });
    cache.set('ndrrmc-sitrep', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching situation reports:', error.message);
    throw new Error('Failed to fetch situation reports');
  }
}

module.exports = { getDisasterAlerts, getEvacuationCenters, getSituationReports };
