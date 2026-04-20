/**
 * DILG Service — Barangay Officials from the DILG BIS Masterlist
 * Source: https://bis.dilg.gov.ph/bops/default/master?psgc=XX
 *
 * The BIS (Barangay Information System) returns XLSX files with:
 *   TERM, REGION, PROVINCE, CITY/MUNICIPALITY, BARANGAY, POSITION,
 *   TERM IN PRESENT POSITION, LASTNAME, FIRSTNAME, MIDDLENAME, SUFFIX, BARANGAY TEL NO.
 *
 * Strategy:
 *   - Fetch per-region XLSX on demand (triggered by first lookup for that region)
 *   - Cache parsed results for 24 hours
 *   - Search by barangay name + city name
 */

const axios = require('axios');
const XLSX = require('xlsx');
const NodeCache = require('node-cache');

const BIS_URL = 'https://bis.dilg.gov.ph/bops/default/master';
const UA = { 'User-Agent': 'WhatsUp-CivicPlatform/1.0' };
const cache = new NodeCache({ stdTTL: 86400 }); // 24h cache

// PSGC region codes used by the BIS endpoint
const REGION_CODES = {
  '01': 'REGION 01 - ILOCOS REGION',
  '02': 'REGION 02 - CAGAYAN VALLEY',
  '03': 'REGION 03 - CENTRAL LUZON',
  '04': 'REGION IV-A (CALABARZON)',
  '05': 'REGION 05 - BICOL REGION',
  '06': 'REGION 06 - WESTERN VISAYAS',
  '07': 'REGION 07 - CENTRAL VISAYAS',
  '08': 'REGION 08 - EASTERN VISAYAS',
  '09': 'REGION 09 - ZAMBOANGA PENINSULA',
  '10': 'REGION 10 - NORTHERN MINDANAO',
  '11': 'REGION 11 - DAVAO REGION',
  '12': 'REGION 12 - SOCCSKSARGEN',
  '13': 'NCR - NATIONAL CAPITAL REGION',
  '14': 'CAR - CORDILLERA ADMINISTRATIVE REGION',
  '16': 'REGION 13 - CARAGA',
  '17': 'REGION IV-B (MIMAROPA)',
  '19': 'BANGSAMORO AUTONOMOUS REGION IN MUSLIM MINDANAO',
};

/**
 * Download and parse DILG BIS masterlist for a given region PSGC code.
 * Returns array of parsed official objects.
 */
async function fetchRegionOfficials(regionCode) {
  const cacheKey = `dilg-region-${regionCode}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  console.log(`[DILG] Downloading masterlist for region ${regionCode}...`);

  const { data: buffer } = await axios.get(BIS_URL, {
    params: { psgc: regionCode },
    headers: UA,
    responseType: 'arraybuffer',
    timeout: 60000,
  });

  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const officials = rows.map((row, i) => ({
    id: `dilg-${regionCode}-${i}`,
    name: formatName(row.FIRSTNAME, row.MIDDLENAME, row.LASTNAME, row.SUFFIX),
    position: normalizePosition(row.POSITION || ''),
    level: 'barangay',
    area: row.BARANGAY || '',
    city: row['CITY/MUNICIPALITY'] || '',
    province: row.PROVINCE || '',
    region: row.REGION || '',
    phone: row['BARANGAY TEL NO.'] || null,
    term: row.TERM || '',
    termInPosition: row['TERM IN PRESENT POSITION'] || '',
    source: 'dilg-bis',
  }));

  console.log(`[DILG] Parsed ${officials.length} officials for region ${regionCode}`);
  cache.set(cacheKey, officials);
  return officials;
}

/**
 * Get barangay officials for a specific barangay + city combination.
 * Tries to determine the region from the PSGC code or city name.
 */
async function getBarangayOfficials(barangayName, cityName, regionCode) {
  if (!barangayName && !cityName) return [];

  // Determine which region to fetch
  const rCode = resolveRegionCode(regionCode, cityName);
  if (!rCode) return [];

  try {
    const allOfficials = await fetchRegionOfficials(rCode);

    // Filter by barangay name and city
    const normalBrgy = (barangayName || '').toLowerCase().trim();
    const normalCity = (cityName || '').toLowerCase().trim();

    return allOfficials.filter(o => {
      const matchCity = !normalCity || o.city.toLowerCase().includes(normalCity) ||
        normalCity.includes(o.city.toLowerCase().replace(/^city of\s+/i, ''));
      const matchBrgy = !normalBrgy || o.area.toLowerCase() === normalBrgy ||
        o.area.toLowerCase().includes(normalBrgy) || normalBrgy.includes(o.area.toLowerCase());
      return matchCity && matchBrgy;
    });
  } catch (err) {
    console.error(`[DILG] Error fetching barangay officials:`, err.message);
    return [];
  }
}

/**
 * Get all officials for a city/municipality (all barangays).
 * Returns grouped by barangay.
 */
async function getCityOfficials(cityName, regionCode) {
  if (!cityName) return [];

  const rCode = resolveRegionCode(regionCode, cityName);
  if (!rCode) return [];

  try {
    const allOfficials = await fetchRegionOfficials(rCode);
    const normalCity = cityName.toLowerCase().trim();

    return allOfficials.filter(o => {
      return o.city.toLowerCase().includes(normalCity) ||
        normalCity.includes(o.city.toLowerCase().replace(/^city of\s+/i, ''));
    });
  } catch (err) {
    console.error(`[DILG] Error fetching city officials:`, err.message);
    return [];
  }
}

/**
 * Get unique barangay names for a city, with official counts and chairman name.
 * Returns sorted list of { barangay, officialCount, chairman }.
 */
async function getBarangayList(cityName, regionCode) {
  if (!cityName) return [];

  const rCode = resolveRegionCode(regionCode, cityName);
  if (!rCode) return [];

  try {
    const allOfficials = await fetchRegionOfficials(rCode);
    const normalCity = cityName.toLowerCase().trim();

    const cityOfficials = allOfficials.filter(o => {
      return o.city.toLowerCase().includes(normalCity) ||
        normalCity.includes(o.city.toLowerCase().replace(/^city of\s+/i, ''));
    });

    // Group by barangay
    const barangayMap = new Map();
    for (const o of cityOfficials) {
      if (!barangayMap.has(o.area)) {
        barangayMap.set(o.area, { barangay: o.area, officialCount: 0, chairman: null });
      }
      const entry = barangayMap.get(o.area);
      entry.officialCount++;
      if (o.position.includes('Punong Barangay') || o.position.includes('Chairman')) {
        entry.chairman = o.name;
      }
    }

    return Array.from(barangayMap.values()).sort((a, b) => a.barangay.localeCompare(b.barangay, undefined, { numeric: true }));
  } catch (err) {
    console.error(`[DILG] Error getting barangay list:`, err.message);
    return [];
  }
}

/**
 * Search officials by name across a region.
 */
async function searchOfficialsByName(query, regionCode) {
  if (!query) return [];

  const rCode = regionCode || '13'; // Default to NCR
  try {
    const allOfficials = await fetchRegionOfficials(rCode);
    const normalQ = query.toLowerCase().trim();

    return allOfficials.filter(o =>
      o.name.toLowerCase().includes(normalQ) ||
      o.area.toLowerCase().includes(normalQ) ||
      o.city.toLowerCase().includes(normalQ)
    ).slice(0, 50);
  } catch (err) {
    console.error(`[DILG] Error searching officials:`, err.message);
    return [];
  }
}

// ── Helpers ──

function formatName(first, middle, last, suffix) {
  const parts = [first, middle ? middle.charAt(0) + '.' : '', last].filter(Boolean);
  let name = parts.join(' ');
  if (suffix) name += ` ${suffix}`;
  return toTitleCase(name);
}

function toTitleCase(str) {
  return str.toLowerCase().replace(/(?:^|\s|[-'])\S/g, c => c.toUpperCase());
}

function normalizePosition(pos) {
  const map = {
    'Punong Barangay': 'Punong Barangay (Chairman)',
    'Sangguniang Barangay Member': 'Kagawad',
    'SK Chairperson': 'SK Chairman',
    'SK Member': 'SK Member',
    'Barangay Secretary': 'Secretary',
    'Barangay Treasurer': 'Treasurer',
  };
  return map[pos] || pos;
}

/**
 * Resolve a 2-digit region code from PSGC or city name heuristics.
 */
function resolveRegionCode(psgcCode, cityName) {
  // If PSGC code is provided, take first 2 digits
  if (psgcCode) {
    const code = String(psgcCode).substring(0, 2);
    if (REGION_CODES[code]) return code;
  }

  // Well-known city → region mapping for fast lookup
  if (cityName) {
    const c = cityName.toLowerCase();
    if (['manila', 'quezon city', 'makati', 'pasig', 'taguig', 'mandaluyong', 'parañaque',
      'marikina', 'muntinlupa', 'las piñas', 'valenzuela', 'caloocan', 'malabon',
      'navotas', 'pasay', 'san juan', 'pateros'].some(n => c.includes(n))) return '13';
    if (['cebu'].some(n => c.includes(n))) return '07';
    if (['davao'].some(n => c.includes(n))) return '11';
    if (['iloilo'].some(n => c.includes(n))) return '06';
    if (['baguio', 'benguet'].some(n => c.includes(n))) return '14';
    if (['zamboanga'].some(n => c.includes(n))) return '09';
    if (['cagayan de oro'].some(n => c.includes(n))) return '10';
    if (['general santos'].some(n => c.includes(n))) return '12';
  }

  return null;
}

module.exports = {
  fetchRegionOfficials,
  getBarangayOfficials,
  getCityOfficials,
  getBarangayList,
  searchOfficialsByName,
  REGION_CODES,
};
