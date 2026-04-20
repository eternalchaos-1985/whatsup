const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 300 }); // 5-minute cache
const PAGASA_API_URL = process.env.PAGASA_API_URL || 'https://bagong.pagasa.dost.gov.ph/api';

async function fetchWithCache(key, url) {
  const cached = cache.get(key);
  if (cached) return cached;

  const response = await axios.get(url, { timeout: 10000 });
  cache.set(key, response.data);
  return response.data;
}

async function getWeatherForecast(location) {
  try {
    return await fetchWithCache(
      `weather-forecast-${location || 'all'}`,
      `${PAGASA_API_URL}/weather-forecast${location ? `?location=${encodeURIComponent(location)}` : ''}`
    );
  } catch (error) {
    console.error('Error fetching weather forecast:', error.message);
    throw new Error('Failed to fetch weather forecast');
  }
}

async function getTyphoonWarnings() {
  try {
    return await fetchWithCache('typhoon-warnings', `${PAGASA_API_URL}/tropical-cyclone-warning`);
  } catch (error) {
    console.error('Error fetching typhoon warnings:', error.message);
    throw new Error('Failed to fetch typhoon warnings');
  }
}

async function getFloodAlerts() {
  try {
    return await fetchWithCache('flood-alerts', `${PAGASA_API_URL}/flood-warning`);
  } catch (error) {
    console.error('Error fetching flood alerts:', error.message);
    throw new Error('Failed to fetch flood alerts');
  }
}

async function getRainfallWarnings() {
  try {
    return await fetchWithCache('rainfall-warnings', `${PAGASA_API_URL}/rainfall-warning`);
  } catch (error) {
    console.error('Error fetching rainfall warnings:', error.message);
    throw new Error('Failed to fetch rainfall warnings');
  }
}

async function getAllWarnings() {
  const [typhoons, floods, rainfall] = await Promise.allSettled([
    getTyphoonWarnings(),
    getFloodAlerts(),
    getRainfallWarnings(),
  ]);

  return {
    typhoons: typhoons.status === 'fulfilled' ? typhoons.value : null,
    floods: floods.status === 'fulfilled' ? floods.value : null,
    rainfall: rainfall.status === 'fulfilled' ? rainfall.value : null,
  };
}

module.exports = {
  getWeatherForecast,
  getTyphoonWarnings,
  getFloodAlerts,
  getRainfallWarnings,
  getAllWarnings,
};