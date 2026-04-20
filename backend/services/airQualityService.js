const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 600 }); // 10-minute cache
const IQAIR_API_KEY = process.env.IQAIR_API_KEY;

// Open-Meteo Air Quality API — free, no key
const OPENMETEO_AQ_API = 'https://air-quality-api.open-meteo.com/v1/air-quality';

async function getAirQualityByCoords(lat, lng) {
  const cacheKey = `aqr-${lat}-${lng}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Try IQAir first if configured
  if (IQAIR_API_KEY) {
    try {
      const response = await axios.get('https://api.airvisual.com/v2/nearest_city', {
        params: { lat, lon: lng, key: IQAIR_API_KEY },
        timeout: 10000,
      });
      const result = {
        source: 'iqair',
        city: response.data.data?.city,
        aqi: response.data.data?.current?.pollution?.aqius,
        mainPollutant: response.data.data?.current?.pollution?.mainus,
        temperature: response.data.data?.current?.weather?.tp,
        humidity: response.data.data?.current?.weather?.hu,
        timestamp: response.data.data?.current?.pollution?.ts,
      };
      cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('IQAir error, falling back to Open-Meteo:', error.message);
    }
  }

  // Fallback: Open-Meteo Air Quality (free, no key)
  return getOpenMeteoAirQuality(lat, lng);
}

async function getOpenMeteoAirQuality(lat, lng) {
  const cacheKey = `openmeteo-aq-${lat}-${lng}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(OPENMETEO_AQ_API, {
      params: {
        latitude: lat,
        longitude: lng,
        current: 'us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone',
        timezone: 'Asia/Manila',
      },
      timeout: 10000,
    });

    const current = response.data?.current || {};
    const aqi = current.us_aqi || 0;

    const result = {
      source: 'open-meteo',
      city: null,
      aqi,
      mainPollutant: detectMainPollutant(current),
      temperature: null,
      humidity: null,
      pm25: current.pm2_5,
      pm10: current.pm10,
      no2: current.nitrogen_dioxide,
      so2: current.sulphur_dioxide,
      o3: current.ozone,
      co: current.carbon_monoxide,
      timestamp: current.time || new Date().toISOString(),
    };

    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching Open-Meteo air quality:', error.message);
    throw new Error('Failed to fetch air quality data');
  }
}

function detectMainPollutant(current) {
  const pollutants = [
    { name: 'pm2.5', value: current.pm2_5 || 0 },
    { name: 'pm10', value: current.pm10 || 0 },
    { name: 'o3', value: current.ozone || 0 },
    { name: 'no2', value: current.nitrogen_dioxide || 0 },
  ];
  pollutants.sort((a, b) => b.value - a.value);
  return pollutants[0]?.name || 'pm2.5';
}

function getAQILevel(aqi) {
  if (aqi <= 50) return { level: 'Good', color: '#00e400', advice: 'Air quality is satisfactory.' };
  if (aqi <= 100) return { level: 'Moderate', color: '#ffff00', advice: 'Acceptable. Sensitive groups may experience minor effects.' };
  if (aqi <= 150) return { level: 'Unhealthy for Sensitive Groups', color: '#ff7e00', advice: 'Sensitive groups should reduce outdoor activities.' };
  if (aqi <= 200) return { level: 'Unhealthy', color: '#ff0000', advice: 'Everyone may begin to experience health effects.' };
  if (aqi <= 300) return { level: 'Very Unhealthy', color: '#8f3f97', advice: 'Health alert: everyone may experience serious effects.' };
  return { level: 'Hazardous', color: '#7e0023', advice: 'Emergency conditions. Stay indoors.' };
}

module.exports = { getAirQualityByCoords, getOpenMeteoAirQuality, getAQILevel };
