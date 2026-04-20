const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 300 }); // 5-minute cache

// Open-Meteo — free weather API, no key needed
const OPENMETEO_API = 'https://api.open-meteo.com/v1/forecast';

// Philippine cities to monitor
const PH_CITIES = [
  { name: 'Metro Manila', lat: 14.5995, lng: 120.9842 },
  { name: 'Cebu City', lat: 10.3157, lng: 123.8854 },
  { name: 'Davao City', lat: 7.1907, lng: 125.4553 },
  { name: 'Tacloban', lat: 11.2543, lng: 124.9600 },
  { name: 'Baguio', lat: 16.4023, lng: 120.5960 },
  { name: 'Zamboanga', lat: 6.9214, lng: 122.0790 },
  { name: 'Cagayan de Oro', lat: 8.4542, lng: 124.6319 },
  { name: 'Legazpi', lat: 13.1391, lng: 123.7438 },
];

async function getWeatherForecast(location) {
  const city = location
    ? PH_CITIES.find(c => c.name.toLowerCase().includes(location.toLowerCase())) || PH_CITIES[0]
    : PH_CITIES[0];

  const cacheKey = `weather-${city.name}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(OPENMETEO_API, {
      params: {
        latitude: city.lat,
        longitude: city.lng,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m',
        hourly: 'temperature_2m,precipitation_probability,weather_code',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',
        timezone: 'Asia/Manila',
        forecast_days: 7,
      },
      timeout: 10000,
    });

    const result = { city: city.name, ...response.data };
    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching weather forecast:', error.message);
    throw new Error('Failed to fetch weather forecast');
  }
}

function weatherCodeToAlert(code, city) {
  // WMO weather codes: https://open-meteo.com/en/docs
  if (code >= 95) return { type: 'rainfall', severity: 'high', label: 'Thunderstorm' };
  if (code >= 80) return { type: 'rainfall', severity: 'moderate', label: 'Rain showers' };
  if (code >= 71) return { type: 'rainfall', severity: 'moderate', label: 'Heavy snowfall' };
  if (code >= 61) return { type: 'flood', severity: 'moderate', label: 'Heavy rain' };
  if (code >= 55) return { type: 'rainfall', severity: 'moderate', label: 'Dense drizzle' };
  if (code >= 51) return { type: 'rainfall', severity: 'low', label: 'Light drizzle' };
  if (code >= 45) return { type: 'rainfall', severity: 'low', label: 'Foggy conditions' };
  return null;
}

async function getTyphoonWarnings() {
  const cached = cache.get('typhoon-warnings');
  if (cached) return cached;

  try {
    const response = await axios.get('https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH', {
      params: { eventtype: 'TC', alertlevel: 'Green;Orange;Red', limit: 50 },
      timeout: 15000,
    });

    const events = (response.data?.features || []).filter(f => {
      if (f.properties?.eventtype !== 'TC') return false;
      const c = f.geometry?.coordinates;
      return c && c[1] >= 4.5 && c[1] <= 21.5 && c[0] >= 116 && c[0] <= 127;
    });

    const alerts = events.map((f, i) => ({
      id: `tc-${f.properties?.eventid || i}`,
      type: 'typhoon',
      severity: f.properties?.alertlevel === 'Red' ? 'critical' : f.properties?.alertlevel === 'Orange' ? 'high' : 'moderate',
      title: f.properties?.name || 'Tropical Cyclone Alert',
      description: (f.properties?.htmldescription || f.properties?.description || '').replace(/<[^>]*>/g, '').substring(0, 300),
      location: f.geometry ? { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], name: f.properties?.name || 'Philippines' } : null,
      timestamp: f.properties?.fromdate || new Date().toISOString(),
      source: 'GDACS',
      active: true,
    }));

    cache.set('typhoon-warnings', alerts);
    return alerts;
  } catch (error) {
    console.error('Error fetching typhoon data from GDACS:', error.message);
    return [];
  }
}

async function getFloodAlerts() {
  const cached = cache.get('flood-alerts');
  if (cached) return cached;

  try {
    const response = await axios.get('https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH', {
      params: { eventtype: 'FL', alertlevel: 'Green;Orange;Red', limit: 50 },
      timeout: 15000,
    });

    const events = (response.data?.features || []).filter(f => {
      if (f.properties?.eventtype !== 'FL') return false;
      const c = f.geometry?.coordinates;
      return c && c[1] >= 4.5 && c[1] <= 21.5 && c[0] >= 116 && c[0] <= 127;
    });

    const alerts = events.map((f, i) => ({
      id: `fl-${f.properties?.eventid || i}`,
      type: 'flood',
      severity: f.properties?.alertlevel === 'Red' ? 'critical' : f.properties?.alertlevel === 'Orange' ? 'high' : 'moderate',
      title: f.properties?.name || 'Flood Alert - Philippines',
      description: (f.properties?.htmldescription || f.properties?.description || '').replace(/<[^>]*>/g, '').substring(0, 300),
      location: f.geometry ? { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], name: f.properties?.name || 'Philippines' } : null,
      timestamp: f.properties?.fromdate || new Date().toISOString(),
      source: 'GDACS',
      active: true,
    }));

    cache.set('flood-alerts', alerts);
    return alerts;
  } catch (error) {
    console.error('Error fetching flood data from GDACS:', error.message);
    return [];
  }
}

async function getRainfallWarnings() {
  const cached = cache.get('rainfall-warnings');
  if (cached) return cached;

  try {
    // Check current weather across PH cities for rainfall warnings
    const warnings = [];
    const response = await axios.get(OPENMETEO_API, {
      params: {
        latitude: PH_CITIES.map(c => c.lat).join(','),
        longitude: PH_CITIES.map(c => c.lng).join(','),
        current: 'weather_code,precipitation,rain',
        timezone: 'Asia/Manila',
      },
      timeout: 10000,
    });

    const results = Array.isArray(response.data) ? response.data : [response.data];
    results.forEach((data, idx) => {
      const city = PH_CITIES[idx] || PH_CITIES[0];
      const code = data?.current?.weather_code;
      const alert = code != null ? weatherCodeToAlert(code, city) : null;
      if (alert && alert.type === 'rainfall') {
        warnings.push({
          id: `rain-${city.name.toLowerCase().replace(/\s/g, '-')}`,
          type: 'rainfall',
          severity: alert.severity,
          title: `${alert.label} in ${city.name}`,
          description: `Current conditions: ${alert.label}. Precipitation: ${data.current?.precipitation ?? 0}mm. Rain: ${data.current?.rain ?? 0}mm.`,
          location: { lat: city.lat, lng: city.lng, name: city.name },
          timestamp: data.current?.time || new Date().toISOString(),
          source: 'Open-Meteo',
          active: true,
        });
      }
    });

    cache.set('rainfall-warnings', warnings);
    return warnings;
  } catch (error) {
    console.error('Error fetching rainfall warnings:', error.message);
    return [];
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