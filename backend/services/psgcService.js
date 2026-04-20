/**
 * PSGC Service — Philippine Standard Geographic Code
 * Source: PSA (Philippine Statistics Authority) via psgc.gitlab.io/api
 *
 * Provides: Region → Province → City/Municipality → Barangay hierarchy
 * Free, no API key required.
 */

const axios = require('axios');
const NodeCache = require('node-cache');

const BASE_URL = 'https://psgc.gitlab.io/api';
const cache = new NodeCache({ stdTTL: 86400 }); // 24h — geographic codes rarely change
const UA = { 'User-Agent': 'WhatsUp-CivicPlatform/1.0' };

// ─── Core Lookups ───

async function getRegions() {
  const cached = cache.get('regions');
  if (cached) return cached;
  const { data } = await axios.get(`${BASE_URL}/regions/`, { headers: UA, timeout: 10000 });
  cache.set('regions', data);
  return data;
}

async function getProvinces(regionCode) {
  const key = `provinces-${regionCode}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const { data } = await axios.get(`${BASE_URL}/regions/${regionCode}/provinces/`, { headers: UA, timeout: 10000 });
  cache.set(key, data);
  return data;
}

async function getCitiesMunicipalities(parentCode, parentType = 'region') {
  const key = `cities-${parentType}-${parentCode}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const endpoint = parentType === 'province'
    ? `${BASE_URL}/provinces/${parentCode}/cities-municipalities/`
    : `${BASE_URL}/regions/${parentCode}/cities-municipalities/`;
  const { data } = await axios.get(endpoint, { headers: UA, timeout: 10000 });
  cache.set(key, data);
  return data;
}

async function getBarangays(cityMunCode) {
  const key = `barangays-${cityMunCode}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const { data } = await axios.get(`${BASE_URL}/cities-municipalities/${cityMunCode}/barangays/`, { headers: UA, timeout: 10000 });
  cache.set(key, data);
  return data;
}

async function getCityByCode(code) {
  const key = `city-${code}`;
  const cached = cache.get(key);
  if (cached) return cached;
  try {
    const { data } = await axios.get(`${BASE_URL}/cities-municipalities/${code}/`, { headers: UA, timeout: 10000 });
    cache.set(key, data);
    return data;
  } catch {
    return null;
  }
}

// ─── Search by Name ───

/**
 * Search cities/municipalities by name. Returns matches with PSGC codes.
 * Loads all cities once (cached 24h) then filters locally.
 */
async function searchCitiesByName(query) {
  const allCities = await getAllCities();
  const q = query.toLowerCase().trim();
  return allCities.filter(c =>
    c.name.toLowerCase().includes(q) ||
    cleanCityName(c.name).toLowerCase().includes(q)
  ).slice(0, 20);
}

/**
 * Search barangays by name within a specific city.
 */
async function searchBarangays(cityCode, query) {
  const barangays = await getBarangays(cityCode);
  const q = query.toLowerCase().trim();
  return barangays.filter(b => b.name.toLowerCase().includes(q)).slice(0, 20);
}

// ─── PSGC Region Code Lookup from Coordinates ───

/**
 * Given Nominatim reverse-geocode address parts, resolve the PSGC code for the city.
 * Uses fuzzy name matching against the PSGC city list.
 */
async function resolvePSGCFromAddress(addressParts) {
  const { city, municipality, town, state, county } = addressParts;
  const cityName = city || municipality || town;
  if (!cityName) return null;

  const allCities = await getAllCities();

  // Try exact match first (strip "City of" prefix from PSGC names)
  let match = allCities.find(c =>
    cleanCityName(c.name).toLowerCase() === cityName.toLowerCase()
  );

  // Try includes match
  if (!match) {
    match = allCities.find(c =>
      cleanCityName(c.name).toLowerCase().includes(cityName.toLowerCase()) ||
      cityName.toLowerCase().includes(cleanCityName(c.name).toLowerCase())
    );
  }

  if (!match) return null;

  // Enrich with region info
  const regionCode = match.regionCode;
  const regions = await getRegions();
  const region = regions.find(r => r.code === regionCode);

  return {
    psgcCode: match.code,
    name: match.name,
    cleanName: cleanCityName(match.name),
    isCity: match.isCity,
    isMunicipality: match.isMunicipality,
    regionCode,
    regionName: region?.name || null,
    districtCode: match.districtCode || null,
    provinceCode: match.provinceCode || null,
  };
}

// ─── Helpers ───

function cleanCityName(psgcName) {
  return psgcName
    .replace(/^City of\s+/i, '')
    .replace(/\s+\(Capital\)$/i, '')
    .trim();
}

let _allCitiesPromise = null;

async function getAllCities() {
  const cached = cache.get('all-cities');
  if (cached) return cached;

  // Deduplicate concurrent calls
  if (!_allCitiesPromise) {
    _allCitiesPromise = axios.get(`${BASE_URL}/cities-municipalities/`, { headers: UA, timeout: 20000 })
      .then(res => {
        cache.set('all-cities', res.data);
        _allCitiesPromise = null;
        return res.data;
      })
      .catch(err => {
        _allCitiesPromise = null;
        throw err;
      });
  }
  return _allCitiesPromise;
}

module.exports = {
  getRegions,
  getProvinces,
  getCitiesMunicipalities,
  getBarangays,
  getCityByCode,
  searchCitiesByName,
  searchBarangays,
  resolvePSGCFromAddress,
  cleanCityName,
  getAllCities,
};
