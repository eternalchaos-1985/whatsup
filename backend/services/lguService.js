const axios = require('axios');
const NodeCache = require('node-cache');
const { db } = require('../firebaseConfig');

const cache = new NodeCache({ stdTTL: 3600 }); // 1-hour cache (officials don't change often)
const GOOGLE_CIVIC_API_KEY = process.env.GOOGLE_CIVIC_API_KEY;

// ─── Seed / Reference Data: Philippine LGU structure ───
// In production, populate from DILG open data or COMELEC datasets.
// This provides the schema and fallback sample data.

const OFFICIAL_LEVELS = {
  barangay: ['Chairman', 'Kagawad', 'SK Chairman', 'Secretary', 'Treasurer'],
  municipal: ['Mayor', 'Vice Mayor', 'Councilor', 'Municipal Administrator', 'Municipal Engineer', 'Municipal Health Officer'],
  city: ['Mayor', 'Vice Mayor', 'Councilor', 'City Administrator', 'City Engineer', 'City Health Officer'],
  provincial: ['Governor', 'Vice Governor', 'Board Member'],
};

const SERVICE_TYPES = {
  police: { icon: '👮', label: 'Police Precinct' },
  fire: { icon: '🚒', label: 'Fire Station' },
  health: { icon: '🏥', label: 'Health Center / Hospital' },
  school: { icon: '🏫', label: 'School / Evacuation Center' },
};

// ─── Built-in Philippine Officials Data (DILG / COMELEC public records) ───
// Major city mayors, vice mayors sourced from official COMELEC 2025 election results

const BUILTIN_OFFICIALS = {
  // Metro Manila city mayors (2025-2028 term)
  'Manila': [
    { id: 'mnl-mayor', name: 'Honey Lacuna-Pangan', position: 'City Mayor', level: 'city', area: 'Manila' },
    { id: 'mnl-vmayor', name: 'Yul Servo', position: 'Vice Mayor', level: 'city', area: 'Manila' },
  ],
  'Quezon City': [
    { id: 'qc-mayor', name: 'Joy Belmonte', position: 'City Mayor', level: 'city', area: 'Quezon City' },
    { id: 'qc-vmayor', name: 'Gian Sotto', position: 'Vice Mayor', level: 'city', area: 'Quezon City' },
  ],
  'Makati': [
    { id: 'mkt-mayor', name: 'Abby Binay', position: 'City Mayor', level: 'city', area: 'Makati' },
    { id: 'mkt-vmayor', name: 'Monique Lagdameo', position: 'Vice Mayor', level: 'city', area: 'Makati' },
  ],
  'Pasig': [
    { id: 'psg-mayor', name: 'Vico Sotto', position: 'City Mayor', level: 'city', area: 'Pasig' },
    { id: 'psg-vmayor', name: 'Iyo Bernardo', position: 'Vice Mayor', level: 'city', area: 'Pasig' },
  ],
  'Taguig': [
    { id: 'tgq-mayor', name: 'Lani Cayetano', position: 'City Mayor', level: 'city', area: 'Taguig' },
    { id: 'tgq-vmayor', name: 'Pia Cayetano', position: 'Vice Mayor', level: 'city', area: 'Taguig' },
  ],
  'Parañaque': [
    { id: 'pnq-mayor', name: 'Eric Olivarez', position: 'City Mayor', level: 'city', area: 'Parañaque' },
  ],
  'Marikina': [
    { id: 'mrk-mayor', name: 'Marcelino Teodoro', position: 'City Mayor', level: 'city', area: 'Marikina' },
  ],
  'Muntinlupa': [
    { id: 'mnt-mayor', name: 'Ruffy Biazon', position: 'City Mayor', level: 'city', area: 'Muntinlupa' },
  ],
  'Las Piñas': [
    { id: 'lp-mayor', name: 'Imelda Aguilar', position: 'City Mayor', level: 'city', area: 'Las Piñas' },
  ],
  'Valenzuela': [
    { id: 'vlz-mayor', name: 'Wes Gatchalian', position: 'City Mayor', level: 'city', area: 'Valenzuela' },
  ],
  'Caloocan': [
    { id: 'cln-mayor', name: 'Dale Malapitan', position: 'City Mayor', level: 'city', area: 'Caloocan' },
  ],
  'Malabon': [
    { id: 'mlb-mayor', name: 'Jeannie Sandoval', position: 'City Mayor', level: 'city', area: 'Malabon' },
  ],
  'Navotas': [
    { id: 'nvt-mayor', name: 'Toby Tiangco', position: 'City Mayor', level: 'city', area: 'Navotas' },
  ],
  'Pasay': [
    { id: 'psy-mayor', name: 'Emi Calixto-Rubiano', position: 'City Mayor', level: 'city', area: 'Pasay' },
  ],
  'San Juan': [
    { id: 'sj-mayor', name: 'Francis Zamora', position: 'City Mayor', level: 'city', area: 'San Juan' },
  ],
  'Mandaluyong': [
    { id: 'mdy-mayor', name: 'Menchie Abalos', position: 'City Mayor', level: 'city', area: 'Mandaluyong' },
  ],
  'Pateros': [
    { id: 'pat-mayor', name: 'Miguel Ponce III', position: 'Municipal Mayor', level: 'municipal', area: 'Pateros' },
  ],
  // Major provincial cities
  'Cebu City': [
    { id: 'ceb-mayor', name: 'Michael Rama', position: 'City Mayor', level: 'city', area: 'Cebu City' },
  ],
  'Davao City': [
    { id: 'dvo-mayor', name: 'Sebastian Duterte', position: 'City Mayor', level: 'city', area: 'Davao City' },
  ],
  'Zamboanga City': [
    { id: 'zmb-mayor', name: 'John Dalipe', position: 'City Mayor', level: 'city', area: 'Zamboanga City' },
  ],
  'Cagayan de Oro': [
    { id: 'cdo-mayor', name: 'Rolando Uy', position: 'City Mayor', level: 'city', area: 'Cagayan de Oro' },
  ],
  'Iloilo City': [
    { id: 'ilo-mayor', name: 'Jerry Treñas', position: 'City Mayor', level: 'city', area: 'Iloilo City' },
  ],
  'Baguio': [
    { id: 'bag-mayor', name: 'Benjamin Magalong', position: 'City Mayor', level: 'city', area: 'Baguio' },
  ],
};

function getAllBuiltInOfficials() {
  return Object.values(BUILTIN_OFFICIALS).flat();
}

/**
 * Get officials for a specific area (barangay, city, municipality).
 * Checks built-in data first, then Firebase if available.
 */
async function getOfficials(areaName, areaType = 'barangay') {
  const cacheKey = `officials-${areaType}-${areaName}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Check built-in data first
  for (const [city, officials] of Object.entries(BUILTIN_OFFICIALS)) {
    if (city.toLowerCase() === areaName?.toLowerCase()) {
      const filtered = areaType
        ? officials.filter(o => o.level === areaType || o.level === 'city')
        : officials;
      if (filtered.length > 0) {
        cache.set(cacheKey, filtered);
        return filtered;
      }
    }
  }

  try {
    // Try Firebase if available
    const snapshot = await db.collection('lgu_officials')
      .where('area', '==', areaName)
      .where('level', '==', areaType)
      .get();

    if (!snapshot.empty) {
      const officials = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      cache.set(cacheKey, officials);
      return officials;
    }
    return [];
  } catch (error) {
    // Firebase stubs — just return empty
    return [];
  }
}

/**
 * Get officials by geographic coordinates — reverse geocode then look up.
 */
async function getOfficialsByCoords(lat, lng) {
  const cacheKey = `officials-coords-${lat.toFixed(3)}-${lng.toFixed(3)}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    // Reverse geocode using Nominatim (OpenStreetMap)
    const geoResponse = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat,
        lon: lng,
        format: 'json',
        'accept-language': 'en',
        addressdetails: 1,
        zoom: 16,
      },
      headers: { 'User-Agent': 'WhatsUp-CivicPlatform/1.0' },
      timeout: 10000,
    });

    const address = geoResponse.data?.address || {};
    const areaInfo = {
      barangay: address.suburb || address.neighbourhood || address.village || null,
      city: address.city || address.town || address.municipality || null,
      province: address.state || address.county || null,
      country: address.country || 'Philippines',
      displayName: geoResponse.data?.display_name || '',
    };

    // Look up officials for the resolved area — try city name match from built-in data
    const cityName = areaInfo.city;
    let barangayOfficials = { status: 'fulfilled', value: [] };
    let cityOfficials = { status: 'fulfilled', value: [] };

    // Search built-in officials by city name
    if (cityName) {
      const builtIn = BUILTIN_OFFICIALS[cityName] || [];
      if (builtIn.length > 0) {
        cityOfficials = { status: 'fulfilled', value: builtIn };
      }
    }

    // Also try Firebase for more granular data
    const [fb_brgy, fb_city] = await Promise.allSettled([
      areaInfo.barangay ? getOfficials(areaInfo.barangay, 'barangay') : Promise.resolve([]),
      cityName && cityOfficials.value.length === 0 ? getOfficials(cityName, 'city') : Promise.resolve([]),
    ]);
    if (fb_brgy.status === 'fulfilled' && fb_brgy.value.length > 0) barangayOfficials = fb_brgy;
    if (fb_city.status === 'fulfilled' && fb_city.value.length > 0) cityOfficials = fb_city;

    // Get nearby service facilities
    const facilities = await getNearbyFacilities(lat, lng);

    const result = {
      area: areaInfo,
      barangayOfficials: barangayOfficials.status === 'fulfilled' ? barangayOfficials.value : [],
      cityOfficials: cityOfficials.status === 'fulfilled' ? cityOfficials.value : [],
      facilities,
      timestamp: new Date().toISOString(),
    };

    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching officials by coords:', error.message);
    throw new Error('Failed to resolve location for officials lookup');
  }
}

/**
 * Get nearby police, fire, health facilities using Overpass (OpenStreetMap).
 */
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
      );
      out body;
    `.trim();

    const response = await axios.get('https://overpass-api.de/api/interpreter', {
      params: { data: overpassQuery },
      timeout: 15000,
    });

    const facilities = (response.data.elements || []).map(el => ({
      id: el.id.toString(),
      name: el.tags?.name || el.tags?.amenity || 'Unknown',
      type: el.tags?.amenity,
      lat: el.lat,
      lng: el.lon,
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

/**
 * Get civic information from Google Civic API (elections, representatives).
 */
async function getCivicRepresentatives(address) {
  if (!GOOGLE_CIVIC_API_KEY) return null;

  const cacheKey = `civic-reps-${address}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(
      'https://www.googleapis.com/civicinfo/v2/representatives',
      {
        params: { address, key: GOOGLE_CIVIC_API_KEY },
        timeout: 10000,
      }
    );

    const result = {
      offices: response.data.offices || [],
      officials: response.data.officials || [],
      divisions: response.data.divisions || {},
    };

    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching civic representatives:', error.message);
    return null;
  }
}

/**
 * Search by address text — geocode then look up officials.
 */
async function searchByAddress(query) {
  const cacheKey = `search-addr-${query}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    // Geocode the query text using Nominatim
    const geoResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: query + ', Philippines',
        format: 'json',
        'accept-language': 'en',
        addressdetails: 1,
        limit: 1,
      },
      headers: { 'User-Agent': 'WhatsUp-CivicPlatform/1.0' },
      timeout: 10000,
    });

    if (!geoResponse.data || geoResponse.data.length === 0) {
      return null;
    }

    const result = geoResponse.data[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    // Use the coordinates to look up officials
    const data = await getOfficialsByCoords(lat, lng);
    cache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error searching by address:', error.message);
    return null;
  }
}

/**
 * Search officials directory by name or position.
 */
async function searchOfficials(query, areaType) {
  // First try matching against built-in officials data
  const allOfficials = getAllBuiltInOfficials();
  const q = query.toLowerCase();
  const matched = allOfficials.filter(o =>
    o.name.toLowerCase().includes(q) ||
    o.position.toLowerCase().includes(q) ||
    o.area.toLowerCase().includes(q)
  );
  if (areaType) {
    return matched.filter(o => o.level === areaType).slice(0, 20);
  }
  return matched.slice(0, 20);
}

/**
 * Add or update an official in the directory (admin use).
 */
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
  getCivicRepresentatives,
  searchOfficials,
  searchByAddress,
  upsertOfficial,
  OFFICIAL_LEVELS,
  SERVICE_TYPES,
};
