const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 600 }); // 10-minute cache
const IQAIR_API_KEY = process.env.IQAIR_API_KEY;
const OPENAQ_API_URL = process.env.OPENAQ_API_URL || 'https://api.openaq.org/v2';

async function getAirQualityByCoords(lat, lng) {
  const cacheKey = `aqr-${lat}-${lng}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(
      `https://api.airvisual.com/v2/nearest_city`,
      {
        params: { lat, lon: lng, key: IQAIR_API_KEY },
        timeout: 10000,
      }
    );
    const result = {
      source: 'iqair',
      city: response.data.data?.city,
      state: response.data.data?.state,
      country: response.data.data?.country,
      aqi: response.data.data?.current?.pollution?.aqius,
      mainPollutant: response.data.data?.current?.pollution?.mainus,
      temperature: response.data.data?.current?.weather?.tp,
      humidity: response.data.data?.current?.weather?.hu,
      timestamp: response.data.data?.current?.pollution?.ts,
    };
    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching IQAir data:', error.message);
    // Fallback to OpenAQ
    return getOpenAQData(lat, lng);
  }
}

async function getOpenAQData(lat, lng, radius = 25000) {
  const cacheKey = `openaq-${lat}-${lng}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${OPENAQ_API_URL}/latest`, {
      params: {
        coordinates: `${lat},${lng}`,
        radius,
        limit: 10,
        order_by: 'distance',
      },
      timeout: 10000,
    });

    const results = response.data.results.map(station => ({
      source: 'openaq',
      location: station.location,
      city: station.city,
      country: station.country,
      measurements: station.measurements.map(m => ({
        parameter: m.parameter,
        value: m.value,
        unit: m.unit,
        lastUpdated: m.lastUpdated,
      })),
      coordinates: station.coordinates,
    }));

    cache.set(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Error fetching OpenAQ data:', error.message);
    throw new Error('Failed to fetch air quality data');
  }
}

function getAQILevel(aqi) {
  if (aqi <= 50) return { level: 'Good', color: '#00e400', advice: 'Air quality is satisfactory.' };
  if (aqi <= 100) return { level: 'Moderate', color: '#ffff00', advice: 'Acceptable. Sensitive groups may experience minor effects.' };
  if (aqi <= 150) return { level: 'Unhealthy for Sensitive Groups', color: '#ff7e00', advice: 'Sensitive groups should reduce outdoor activities.' };
  if (aqi <= 200) return { level: 'Unhealthy', color: '#ff0000', advice: 'Everyone may begin to experience health effects.' };
  if (aqi <= 300) return { level: 'Very Unhealthy', color: '#8f3f97', advice: 'Health alert: everyone may experience serious effects.' };
  return { level: 'Hazardous', color: '#7e0023', advice: 'Emergency conditions. Stay indoors.' };
}

module.exports = { getAirQualityByCoords, getOpenAQData, getAQILevel };
