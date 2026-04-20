const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 300 });

// GDACS API — free, no key, real-time global disaster data
const GDACS_API = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH';
// Philippines bounding box
const PH_BOUNDS = { minLat: 4.5, maxLat: 21.5, minLng: 116, maxLng: 127 };

function isInPhilippines(coords) {
  if (!coords) return false;
  const [lng, lat] = coords;
  return lat >= PH_BOUNDS.minLat && lat <= PH_BOUNDS.maxLat && lng >= PH_BOUNDS.minLng && lng <= PH_BOUNDS.maxLng;
}

async function getDisasterAlerts() {
  const cached = cache.get('gdacs-alerts');
  if (cached) return cached;

  try {
    const response = await axios.get(GDACS_API, {
      params: { alertlevel: 'Green;Orange;Red', limit: 100 },
      timeout: 15000,
    });

    const features = response.data?.features || [];
    const phEvents = features.filter(f => isInPhilippines(f.geometry?.coordinates));

    const typeMap = { EQ: 'earthquake', TC: 'typhoon', FL: 'flood', VO: 'volcanic', DR: 'health', WF: 'fire' };
    const alerts = phEvents.map((f, i) => {
      const p = f.properties || {};
      return {
        id: `gdacs-${p.eventid || i}`,
        type: typeMap[p.eventtype] || 'health',
        severity: p.alertlevel === 'Red' ? 'critical' : p.alertlevel === 'Orange' ? 'high' : 'moderate',
        title: p.name || p.description || 'Disaster Alert',
        description: (p.htmldescription || p.description || '').replace(/<[^>]*>/g, '').substring(0, 300),
        location: f.geometry ? { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], name: p.name || 'Philippines' } : undefined,
        timestamp: p.fromdate || new Date().toISOString(),
        source: 'GDACS',
        active: true,
        url: p.url?.report || null,
      };
    });

    cache.set('gdacs-alerts', alerts);
    return alerts;
  } catch (error) {
    console.error('Error fetching GDACS alerts:', error.message);
    return [];
  }
}

async function getEvacuationCenters(lat, lng, radius) {
  return [];
}

async function getSituationReports() {
  const cached = cache.get('gdacs-sitrep');
  if (cached) return cached;

  try {
    const response = await axios.get('https://www.gdacs.org/xml/rss.xml', { timeout: 15000 });
    const xml = response.data;
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    const reports = [];

    for (const item of items.slice(0, 30)) {
      const title = (item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
      const desc = (item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '');
      const link = (item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '').trim();
      const pubDate = (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '').trim();
      const lat = item.match(/<geo:lat>([\s\S]*?)<\/geo:lat>/)?.[1];
      const lng = item.match(/<geo:long>([\s\S]*?)<\/geo:long>/)?.[1];

      if (lat && lng) {
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        if (latNum >= PH_BOUNDS.minLat && latNum <= PH_BOUNDS.maxLat && lngNum >= PH_BOUNDS.minLng && lngNum <= PH_BOUNDS.maxLng) {
          reports.push({
            id: `rss-${reports.length}`,
            title,
            date: pubDate,
            source: 'GDACS',
            url: link,
            summary: desc.replace(/<[^>]*>/g, '').substring(0, 500),
            lat: latNum,
            lng: lngNum,
          });
        }
      }
    }

    cache.set('gdacs-sitrep', reports);
    return reports;
  } catch (error) {
    console.error('Error fetching GDACS RSS:', error.message);
    return [];
  }
}

module.exports = { getDisasterAlerts, getEvacuationCenters, getSituationReports };
