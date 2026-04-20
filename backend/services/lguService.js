/**
 * LGU Service — Unified Local Government Unit lookup
 *
 * Data sources:
 *   - PSGC API (PSA)    → geographic hierarchy (Region → Province → City → Barangay)
 *   - Wikidata SPARQL    → elected officials (mayors, governors)
 *   - Curated COMELEC    → verified fallback officials for Metro Manila + major cities
 *   - Overpass (OSM)     → nearby facilities (police, fire, hospital, clinic)
 *   - Nominatim (OSM)    → forward/reverse geocoding
 *   - Firebase Firestore → community-contributed data (optional, stubs when unavailable)
 */

const axios = require('axios');
const NodeCache = require('node-cache');
const { db } = require('../firebaseConfig');
const psgc = require('./psgcService');
const officialsService = require('./officialsService');

const cache = new NodeCache({ stdTTL: 3600 });
const UA = { 'User-Agent': 'WhatsUp-CivicPlatform/1.0' };

// ─── Reference Data ───

const OFFICIAL_LEVELS = {
  barangay: ['Chairman', 'Kagawad', 'SK Chairman', 'Secretary', 'Treasurer'],
  municipal: ['Mayor', 'Vice Mayor', 'Councilor', 'Municipal Administrator', 'Municipal Engineer', 'Municipal Health Officer'],
  city: ['Mayor', 'Vice Mayor', 'Councilor', 'City Administrator', 'City Engineer', 'City Health Officer'],
  provincial: ['Governor', 'Vice Governor', 'Board Member'],
};

const SERVICE_TYPES = {
  police: { icon: '👮', label: 'Police Precinct' },
  fire_station: { icon: '🚒', label: 'Fire Station' },
  hospital: { icon: '🏥', label: 'Hospital' },
  clinic: { icon: '🩺', label: 'Health Center / Clinic' },
};

// ─── Core: Get By Coordinates ───

/**
 * Get officials + facilities + geographic info for a lat/lng pair.
 * Pipeline: Nominatim reverse → PSGC lookup → officials → facilities
 */
async function getOfficialsByCoords(lat, lng) {
  const cacheKey = `lgu-coords-${lat.toFixed(3)}-${lng.toFixed(3)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Step 1: Reverse geocode
  const geoResponse = await axios.get('https://nominatim.openstreetmap.org/reverse', {
    params: { lat, lon: lng, format: 'json', 'accept-language': 'en', addressdetails: 1, zoom: 16 },
    headers: UA,
    timeout: 10000,
  });

  const address = geoResponse.data?.address || {};
  const cityName = address.city || address.town || address.municipality || null;
  const barangayName = address.suburb || address.neighbourhood || address.village || null;
  const provinceName = address.state || address.county || null;

  // Step 2: Resolve PSGC code (non-blocking — enrich if available)
  let psgcInfo = null;
  try {
    psgcInfo = await psgc.resolvePSGCFromAddress(address);
  } catch { /* PSGC API might be slow — proceed without */ }

  const areaInfo = {
    barangay: barangayName,
    city: cityName,
    province: provinceName,
    region: psgcInfo?.regionName || null,
    country: address.country || 'Philippines',
    displayName: geoResponse.data?.display_name || '',
    psgcCode: psgcInfo?.psgcCode || null,
    isCity: psgcInfo?.isCity || false,
  };

  // Step 3: Fetch officials and facilities in parallel
  const [cityOfficials, barangayOfficials, facilities, barangayList] = await Promise.all([
    cityName ? officialsService.getOfficialsForCity(cityName) : Promise.resolve([]),
    barangayName ? getBarangayOfficials(barangayName) : Promise.resolve([]),
    getNearbyFacilities(lat, lng),
    psgcInfo?.psgcCode ? psgc.getBarangays(psgcInfo.psgcCode).catch(() => []) : Promise.resolve([]),
  ]);

  const result = {
    area: areaInfo,
    barangayOfficials,
    cityOfficials,
    facilities,
    psgcBarangayCount: barangayList.length || null,
    dataSources: ['PSGC (PSA)', 'Wikidata', 'COMELEC 2025', 'OpenStreetMap'],
    timestamp: new Date().toISOString(),
  };

  cache.set(cacheKey, result);
  return result;
}

// ─── Core: Search by Address Text ───

/**
 * Geocode a text query → coordinates → full lookup.
 */
async function searchByAddress(query) {
  const cacheKey = `lgu-search-${query.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Forward geocode with Nominatim
  const geoResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { q: query + ', Philippines', format: 'json', 'accept-language': 'en', addressdetails: 1, limit: 1 },
    headers: UA,
    timeout: 10000,
  });

  if (!geoResponse.data?.length) return null;

  const match = geoResponse.data[0];
  const lat = parseFloat(match.lat);
  const lng = parseFloat(match.lon);
  const data = await getOfficialsByCoords(lat, lng);
  cache.set(cacheKey, data);
  return data;
}

// ─── Core: Search Officials by Name ───

async function searchOfficials(query, level) {
  return officialsService.searchOfficials(query);
}

// ─── Core: Get Officials for Area Name ───

async function getOfficials(areaName, areaType = 'barangay') {
  if (areaType === 'city' || areaType === 'municipal') {
    return officialsService.getOfficialsForCity(areaName);
  }
  return getBarangayOfficials(areaName);
}

// ─── Barangay Officials (Firebase community data) ───

async function getBarangayOfficials(barangayName) {
  try {
    const snapshot = await db.collection('lgu_officials')
      .where('area', '==', barangayName)
      .where('level', '==', 'barangay')
      .get();
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  } catch { /* Firebase stubs */ }
  return [];
}

// ─── Nearby Facilities (Overpass / OpenStreetMap) ───

async function getNearbyFacilities(lat, lng, radiusMeters = 5000) {
  const cacheKey = `facilities-${lat.toFixed(3)}-${lng.toFixed(3)}-${radiusMeters}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const overpassQuery = `
      [out:json][timeout:15];
      (
        node["amenity"="police"](around:${radiusMeters},${lat},${lng});
        node["amenity"="fire_station"](around:${radiusMeters},${lat},${lng});
        node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
        node["amenity"="clinic"](around:${radiusMeters},${lat},${lng});
        way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
        way["amenity"="police"](around:${radiusMeters},${lat},${lng});
      );
      out center body;
    `.trim();

    const response = await axios.get('https://overpass-api.de/api/interpreter', {
      params: { data: overpassQuery },
      timeout: 15000,
    });

    const facilities = (response.data.elements || []).map(el => ({
      id: el.id.toString(),
      name: el.tags?.name || el.tags?.amenity || 'Unknown',
      type: el.tags?.amenity,
      lat: el.lat || el.center?.lat,
      lng: el.lon || el.center?.lon,
      phone: el.tags?.phone || el.tags?.['contact:phone'] || null,
      website: el.tags?.website || el.tags?.['contact:website'] || null,
      address: el.tags?.['addr:full'] || el.tags?.['addr:street'] || null,
      operator: el.tags?.operator || null,
    }));

    cache.set(cacheKey, facilities);
    return facilities;
  } catch (error) {
    console.error('Error fetching nearby facilities:', error.message);
    return [];
  }
}

// ─── PSGC Geographic Hierarchy Endpoints ───

async function getRegions() {
  return psgc.getRegions();
}

async function getProvinces(regionCode) {
  return psgc.getProvinces(regionCode);
}

async function getCitiesMunicipalities(parentCode, parentType) {
  return psgc.getCitiesMunicipalities(parentCode, parentType);
}

async function getBarangays(cityMunCode) {
  return psgc.getBarangays(cityMunCode);
}

// ─── Admin: Community-contributed officials ───

async function upsertOfficial(officialData) {
  try {
    const { id, ...data } = officialData;
    data.updatedAt = new Date().toISOString();
    if (id) {
      await db.collection('lgu_officials').doc(id).set(data, { merge: true });
      return { id, ...data };
    }
    const docRef = await db.collection('lgu_officials').add(data);
    return { id: docRef.id, ...data };
  } catch (error) {
    console.error('Error upserting official:', error.message);
    throw new Error('Failed to save official data');
  }
}

module.exports = {
  getOfficials,
  getOfficialsByCoords,
  getNearbyFacilities,
  searchOfficials,
  searchByAddress,
  upsertOfficial,
  getRegions,
  getProvinces,
  getCitiesMunicipalities,
  getBarangays,
  OFFICIAL_LEVELS,
  SERVICE_TYPES,
};
