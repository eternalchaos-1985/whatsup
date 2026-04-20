const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 600 });
const DOH_API_URL = 'https://data.doh.gov.ph/api'; // Replace with actual DOH Open Data endpoint

async function getHealthAdvisories() {
  const cached = cache.get('doh-advisories');
  if (cached) return cached;

  try {
    const response = await axios.get(`${DOH_API_URL}/health-advisories`, { timeout: 10000 });
    cache.set('doh-advisories', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching health advisories:', error.message);
    throw new Error('Failed to fetch health advisories');
  }
}

async function getDiseaseOutbreaks(location) {
  const cacheKey = `doh-outbreaks-${location || 'all'}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${DOH_API_URL}/disease-outbreaks`, {
      params: location ? { location: encodeURIComponent(location) } : {},
      timeout: 10000,
    });
    cache.set(cacheKey, response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching disease outbreaks:', error.message);
    throw new Error('Failed to fetch disease outbreak data');
  }
}

async function getHospitals(lat, lng, radius) {
  const cacheKey = `hospitals-${lat}-${lng}-${radius}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${DOH_API_URL}/hospitals`, {
      params: { lat, lng, radius },
      timeout: 10000,
    });
    cache.set(cacheKey, response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching hospitals:', error.message);
    throw new Error('Failed to fetch hospital data');
  }
}

module.exports = { getHealthAdvisories, getDiseaseOutbreaks, getHospitals };
