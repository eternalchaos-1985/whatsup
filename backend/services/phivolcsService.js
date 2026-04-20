const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 300 });

// USGS Earthquake API — free, no key, real-time global data
const USGS_API = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

// Philippines bounding box
const PH_BOUNDS = { minlat: 4.5, maxlat: 21.5, minlon: 116, maxlon: 127 };

async function getLatestEarthquakes() {
  const cached = cache.get('usgs-earthquakes');
  if (cached) return cached;

  try {
    const response = await axios.get(USGS_API, {
      params: {
        format: 'geojson',
        starttime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        minmagnitude: 2.0,
        ...PH_BOUNDS,
        orderby: 'time',
        limit: 100,
      },
      timeout: 15000,
    });

    const earthquakes = (response.data.features || []).map((f, i) => ({
      id: f.id || `usgs-${i}`,
      magnitude: f.properties.mag,
      depth: f.geometry.coordinates[2],
      location: f.properties.place || 'Unknown location',
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      timestamp: new Date(f.properties.time).toISOString(),
      source: 'USGS',
      title: f.properties.title,
      url: f.properties.url,
      felt: f.properties.felt,
      tsunami: f.properties.tsunami,
      alert: f.properties.alert,
    }));

    cache.set('usgs-earthquakes', earthquakes);
    return earthquakes;
  } catch (error) {
    console.error('Error fetching USGS earthquake data:', error.message);
    throw new Error('Failed to fetch earthquake data');
  }
}

async function getEarthquakeByMagnitude(minMagnitude = 3.0) {
  const data = await getLatestEarthquakes();
  return data.filter(eq => eq.magnitude >= minMagnitude);
}

async function getVolcanicActivity() {
  // No free volcanic API with reliable data; return curated Philippine volcano statuses
  const cached = cache.get('volcanic-activity');
  if (cached) return cached;

  const volcanoes = [
    { id: 'taal', type: 'volcanic', severity: 'moderate', title: 'Taal Volcano - Alert Level 1', description: 'Low-level volcanic unrest. Slight increase in volcanic earthquake activity. Entry to Taal Volcano Island is prohibited.', location: { lat: 14.0113, lng: 120.9980, name: 'Taal Volcano, Batangas' }, timestamp: new Date().toISOString(), source: 'PHIVOLCS', active: true },
    { id: 'mayon', type: 'volcanic', severity: 'low', title: 'Mayon Volcano - Alert Level 0', description: 'Quiet. No significant volcanic activity detected.', location: { lat: 13.2575, lng: 123.6856, name: 'Mayon Volcano, Albay' }, timestamp: new Date().toISOString(), source: 'PHIVOLCS', active: true },
    { id: 'pinatubo', type: 'volcanic', severity: 'low', title: 'Mt. Pinatubo - Alert Level 0', description: 'Normal conditions. No anomalous activity.', location: { lat: 15.1429, lng: 120.3496, name: 'Mt. Pinatubo, Zambales' }, timestamp: new Date().toISOString(), source: 'PHIVOLCS', active: true },
    { id: 'kanlaon', type: 'volcanic', severity: 'moderate', title: 'Kanlaon Volcano - Alert Level 2', description: 'Increasing volcanic unrest. Moderate level of volcanic earthquakes and steam emission. 4-km danger zone enforced.', location: { lat: 10.4124, lng: 123.1320, name: 'Kanlaon Volcano, Negros Occidental' }, timestamp: new Date().toISOString(), source: 'PHIVOLCS', active: true },
    { id: 'bulusan', type: 'volcanic', severity: 'low', title: 'Bulusan Volcano - Alert Level 0', description: 'Normal activity. Mild steaming from vents.', location: { lat: 12.7697, lng: 124.0567, name: 'Bulusan Volcano, Sorsogon' }, timestamp: new Date().toISOString(), source: 'PHIVOLCS', active: true },
  ];

  cache.set('volcanic-activity', volcanoes);
  return volcanoes;
}

async function getTsunamiWarnings() {
  // Check USGS for recent large quakes that may trigger tsunami
  const cached = cache.get('tsunami-warnings');
  if (cached) return cached;

  try {
    const response = await axios.get(USGS_API, {
      params: {
        format: 'geojson',
        starttime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        minmagnitude: 6.0,
        ...PH_BOUNDS,
        orderby: 'time',
        limit: 10,
      },
      timeout: 15000,
    });

    const warnings = (response.data.features || [])
      .filter(f => f.properties.tsunami === 1)
      .map((f, i) => ({
        id: `tsunami-${f.id || i}`,
        type: 'tsunami',
        severity: f.properties.mag >= 7.5 ? 'critical' : f.properties.mag >= 6.5 ? 'high' : 'moderate',
        title: `Tsunami Advisory: M${f.properties.mag} - ${f.properties.place}`,
        description: `A magnitude ${f.properties.mag} earthquake has triggered a tsunami advisory. Monitor official channels for updates.`,
        location: { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], name: f.properties.place },
        timestamp: new Date(f.properties.time).toISOString(),
        source: 'USGS/PHIVOLCS',
        active: true,
      }));

    cache.set('tsunami-warnings', warnings);
    return warnings;
  } catch (error) {
    console.error('Error fetching tsunami data:', error.message);
    return [];
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