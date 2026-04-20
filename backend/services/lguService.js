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

/**
 * Get officials for a specific area (barangay, city, municipality).
 * Checks Firebase cache first, then falls back to external APIs.
 */
async function getOfficials(areaName, areaType = 'barangay') {
  const cacheKey = `officials-${areaType}-${areaName}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    // Try Firebase first (curated data)
    const snapshot = await db.collection('lgu_officials')
      .where('area', '==', areaName)
      .where('level', '==', areaType)
      .get();

    if (!snapshot.empty) {
      const officials = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      cache.set(cacheKey, officials);
      return officials;
    }

    // Fallback: return empty with schema hint so frontend knows what to display
    return [];
  } catch (error) {
    console.error('Error fetching officials:', error.message);
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

    // Look up officials for the resolved area
    const [barangayOfficials, cityOfficials] = await Promise.allSettled([
      areaInfo.barangay ? getOfficials(areaInfo.barangay, 'barangay') : Promise.resolve([]),
      areaInfo.city ? getOfficials(areaInfo.city, 'city') : Promise.resolve([]),
    ]);

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
 * Search officials directory by name or position.
 */
async function searchOfficials(query, areaType) {
  try {
    let ref = db.collection('lgu_officials');
    if (areaType) {
      ref = ref.where('level', '==', areaType);
    }

    // Firestore doesn't support full-text search natively;
    // do a prefix match on the name field
    const snapshot = await ref
      .orderBy('name')
      .startAt(query)
      .endAt(query + '\uf8ff')
      .limit(20)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error searching officials:', error.message);
    return [];
  }
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
  upsertOfficial,
  OFFICIAL_LEVELS,
  SERVICE_TYPES,
};
