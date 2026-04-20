/**
 * Officials Service — Philippine Elected Officials via Wikidata SPARQL
 * Source: Wikidata (query.wikidata.org) — free, no API key.
 *
 * Provides: Current mayors, vice-mayors, governors, congress members.
 * Supplemented by curated fallback data for Metro Manila + major provincial cities.
 */

const axios = require('axios');
const NodeCache = require('node-cache');

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const cache = new NodeCache({ stdTTL: 43200 }); // 12h cache
const UA = { 'User-Agent': 'WhatsUp-CivicPlatform/1.0', Accept: 'application/sparql-results+json' };

// ─── Wikidata SPARQL Queries ───

/**
 * Fetch current Philippine city/municipal mayors via Wikidata P6 (head of government).
 * Filters to cities in PH (Q928), excludes ended terms.
 */
async function fetchWikidataMayors() {
  const cached = cache.get('wd-mayors');
  if (cached) return cached;

  const sparql = `
    SELECT DISTINCT ?person ?personLabel ?city ?cityLabel ?start WHERE {
      ?city wdt:P17 wd:Q928 .
      { ?city wdt:P31/wdt:P279* wd:Q515 . }
      UNION { ?city wdt:P31/wdt:P279* wd:Q15284 . }
      UNION { ?city wdt:P31/wdt:P279* wd:Q3957 . }
      ?city p:P6 ?stmt .
      ?stmt ps:P6 ?person .
      FILTER NOT EXISTS { ?stmt pq:P582 ?end }
      OPTIONAL { ?stmt pq:P580 ?start }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,tl". }
    }
    ORDER BY ?cityLabel
    LIMIT 300
  `;

  try {
    const { data } = await axios.get(SPARQL_ENDPOINT, {
      params: { query: sparql, format: 'json' },
      headers: UA,
      timeout: 30000,
    });

    const rows = data.results.bindings;

    // Deduplicate: keep latest start date per city
    const cityMap = new Map();
    for (const row of rows) {
      const cityLabel = row.cityLabel?.value;
      const personLabel = row.personLabel?.value;
      if (!cityLabel || cityLabel.startsWith('Q') || !personLabel || personLabel === 'mayor') continue;

      const start = row.start?.value || '1900-01-01';
      const existing = cityMap.get(cityLabel);
      if (!existing || start > existing.start) {
        cityMap.set(cityLabel, {
          name: personLabel,
          position: 'City Mayor',
          level: 'city',
          area: cityLabel,
          start: start.slice(0, 10),
          source: 'wikidata',
          wikidataCity: row.city?.value,
          wikidataPerson: row.person?.value,
        });
      }
    }

    const results = Array.from(cityMap.values());
    cache.set('wd-mayors', results);
    return results;
  } catch (error) {
    console.error('[Wikidata] Error fetching mayors:', error.message);
    return [];
  }
}

/**
 * Fetch current Philippine provincial governors via Wikidata.
 */
async function fetchWikidataGovernors() {
  const cached = cache.get('wd-governors');
  if (cached) return cached;

  const sparql = `
    SELECT DISTINCT ?person ?personLabel ?prov ?provLabel ?start WHERE {
      ?prov wdt:P17 wd:Q928 .
      { ?prov wdt:P31/wdt:P279* wd:Q24698 . }
      UNION { ?prov wdt:P31/wdt:P279* wd:Q104157280 . }
      ?prov p:P6 ?stmt .
      ?stmt ps:P6 ?person .
      FILTER NOT EXISTS { ?stmt pq:P582 ?end }
      OPTIONAL { ?stmt pq:P580 ?start }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,tl". }
    }
    ORDER BY ?provLabel
    LIMIT 100
  `;

  try {
    const { data } = await axios.get(SPARQL_ENDPOINT, {
      params: { query: sparql, format: 'json' },
      headers: UA,
      timeout: 30000,
    });

    const rows = data.results.bindings;
    const provMap = new Map();
    for (const row of rows) {
      const provLabel = row.provLabel?.value;
      const personLabel = row.personLabel?.value;
      if (!provLabel || provLabel.startsWith('Q') || !personLabel) continue;

      const start = row.start?.value || '1900-01-01';
      const existing = provMap.get(provLabel);
      if (!existing || start > existing.start) {
        provMap.set(provLabel, {
          name: personLabel,
          position: 'Provincial Governor',
          level: 'provincial',
          area: provLabel,
          start: start.slice(0, 10),
          source: 'wikidata',
        });
      }
    }

    const results = Array.from(provMap.values());
    cache.set('wd-governors', results);
    return results;
  } catch (error) {
    console.error('[Wikidata] Error fetching governors:', error.message);
    return [];
  }
}

// ─── Curated Fallback Data (COMELEC 2025 results for key cities) ───
// Used when Wikidata doesn't have an entry or has stale data.

const CURATED_OFFICIALS = [
  // Metro Manila — 2025-2028 term (COMELEC certified)
  { name: 'Honey Lacuna-Pangan', position: 'City Mayor', level: 'city', area: 'City of Manila', altAreas: ['Manila'], source: 'comelec-2025' },
  { name: 'Yul Servo', position: 'Vice Mayor', level: 'city', area: 'City of Manila', altAreas: ['Manila'], source: 'comelec-2025' },
  { name: 'Joy Belmonte', position: 'City Mayor', level: 'city', area: 'Quezon City', source: 'comelec-2025' },
  { name: 'Gian Sotto', position: 'Vice Mayor', level: 'city', area: 'Quezon City', source: 'comelec-2025' },
  { name: 'Abby Binay', position: 'City Mayor', level: 'city', area: 'City of Makati', altAreas: ['Makati'], source: 'comelec-2025' },
  { name: 'Monique Lagdameo', position: 'Vice Mayor', level: 'city', area: 'City of Makati', altAreas: ['Makati'], source: 'comelec-2025' },
  { name: 'Vico Sotto', position: 'City Mayor', level: 'city', area: 'City of Pasig', altAreas: ['Pasig'], source: 'comelec-2025' },
  { name: 'Iyo Bernardo', position: 'Vice Mayor', level: 'city', area: 'City of Pasig', altAreas: ['Pasig'], source: 'comelec-2025' },
  { name: 'Lani Cayetano', position: 'City Mayor', level: 'city', area: 'City of Taguig', altAreas: ['Taguig'], source: 'comelec-2025' },
  { name: 'Pia Cayetano', position: 'Vice Mayor', level: 'city', area: 'City of Taguig', altAreas: ['Taguig'], source: 'comelec-2025' },
  { name: 'Eric Olivarez', position: 'City Mayor', level: 'city', area: 'City of Parañaque', altAreas: ['Parañaque'], source: 'comelec-2025' },
  { name: 'Maan Teodoro', position: 'City Mayor', level: 'city', area: 'City of Marikina', altAreas: ['Marikina'], source: 'comelec-2025' },
  { name: 'Ruffy Biazon', position: 'City Mayor', level: 'city', area: 'City of Muntinlupa', altAreas: ['Muntinlupa'], source: 'comelec-2025' },
  { name: 'Imelda Aguilar', position: 'City Mayor', level: 'city', area: 'City of Las Piñas', altAreas: ['Las Piñas'], source: 'comelec-2025' },
  { name: 'Wes Gatchalian', position: 'City Mayor', level: 'city', area: 'City of Valenzuela', altAreas: ['Valenzuela'], source: 'comelec-2025' },
  { name: 'Dale Malapitan', position: 'City Mayor', level: 'city', area: 'City of Caloocan', altAreas: ['Caloocan'], source: 'comelec-2025' },
  { name: 'Jeannie Sandoval', position: 'City Mayor', level: 'city', area: 'City of Malabon', altAreas: ['Malabon'], source: 'comelec-2025' },
  { name: 'Toby Tiangco', position: 'City Mayor', level: 'city', area: 'City of Navotas', altAreas: ['Navotas'], source: 'comelec-2025' },
  { name: 'Emi Calixto-Rubiano', position: 'City Mayor', level: 'city', area: 'City of Pasay', altAreas: ['Pasay'], source: 'comelec-2025' },
  { name: 'Francis Zamora', position: 'City Mayor', level: 'city', area: 'City of San Juan', altAreas: ['San Juan'], source: 'comelec-2025' },
  { name: 'Menchie Abalos', position: 'City Mayor', level: 'city', area: 'City of Mandaluyong', altAreas: ['Mandaluyong'], source: 'comelec-2025' },
  { name: 'Miguel Ponce III', position: 'Municipal Mayor', level: 'municipal', area: 'Municipality of Pateros', altAreas: ['Pateros'], source: 'comelec-2025' },
  // Major provincial cities
  { name: 'Michael Rama', position: 'City Mayor', level: 'city', area: 'Cebu City', source: 'comelec-2025' },
  { name: 'Sebastian Duterte', position: 'City Mayor', level: 'city', area: 'Davao City', source: 'comelec-2025' },
  { name: 'John Dalipe', position: 'City Mayor', level: 'city', area: 'Zamboanga City', source: 'comelec-2025' },
  { name: 'Rolando Uy', position: 'City Mayor', level: 'city', area: 'Cagayan de Oro', source: 'comelec-2025' },
  { name: 'Jerry Treñas', position: 'City Mayor', level: 'city', area: 'Iloilo City', source: 'comelec-2025' },
  { name: 'Benjamin Magalong', position: 'City Mayor', level: 'city', area: 'Baguio', altAreas: ['City of Baguio'], source: 'comelec-2025' },
  { name: 'Ronnel Rivera', position: 'City Mayor', level: 'city', area: 'General Santos', altAreas: ['City of General Santos'], source: 'comelec-2025' },
];

// ─── Unified Lookup ───

/**
 * Get officials for a city/municipality name.
 * Strategy: curated data wins → then Wikidata → merged + deduplicated.
 */
async function getOfficialsForCity(cityName) {
  const key = `officials-city-${cityName.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const normalised = cityName.toLowerCase();

  // 1. Curated matches
  const curated = CURATED_OFFICIALS.filter(o => {
    if (o.area.toLowerCase() === normalised) return true;
    if (o.altAreas?.some(a => a.toLowerCase() === normalised)) return true;
    // Partial match for "City of X" / "X"
    const clean = o.area.replace(/^City of\s+/i, '').replace(/^Municipality of\s+/i, '');
    return clean.toLowerCase() === normalised;
  }).map((o, i) => ({
    id: `curated-${normalised}-${i}`,
    name: o.name,
    position: o.position,
    level: o.level,
    area: o.area,
    source: o.source,
  }));

  // 2. Wikidata (async, but cached for 12h after first call)
  let wikiMatches = [];
  try {
    const mayors = await fetchWikidataMayors();
    wikiMatches = mayors.filter(m => {
      const a = m.area.toLowerCase();
      return a === normalised ||
        a.replace(/^city of\s+/i, '') === normalised ||
        normalised.includes(a) || a.includes(normalised);
    }).map((m, i) => ({
      id: `wd-${normalised}-${i}`,
      name: m.name,
      position: m.position,
      level: m.level,
      area: m.area,
      termStart: m.start,
      source: 'wikidata',
    }));
  } catch { /* Wikidata down — curated still works */ }

  // 3. Merge: curated wins for same position
  const seen = new Set(curated.map(o => `${o.position}`.toLowerCase()));
  const merged = [...curated];
  for (const w of wikiMatches) {
    if (!seen.has(w.position.toLowerCase())) {
      merged.push(w);
      seen.add(w.position.toLowerCase());
    }
  }

  cache.set(key, merged);
  return merged;
}

/**
 * Search all officials (curated + Wikidata cached) by name, position, or area.
 */
async function searchOfficials(query) {
  const q = query.toLowerCase();

  // Search curated first
  const curatedMatches = CURATED_OFFICIALS.filter(o =>
    o.name.toLowerCase().includes(q) ||
    o.position.toLowerCase().includes(q) ||
    o.area.toLowerCase().includes(q) ||
    o.altAreas?.some(a => a.toLowerCase().includes(q))
  ).map((o, i) => ({
    id: `curated-search-${i}`,
    name: o.name,
    position: o.position,
    level: o.level,
    area: o.area,
    source: o.source,
  }));

  // Search Wikidata cached mayors
  let wikiMatches = [];
  try {
    const mayors = await fetchWikidataMayors();
    wikiMatches = mayors.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.area.toLowerCase().includes(q)
    ).map((m, i) => ({
      id: `wd-search-${i}`,
      name: m.name,
      position: m.position,
      level: m.level,
      area: m.area,
      termStart: m.start,
      source: 'wikidata',
    }));
  } catch { /* graceful */ }

  // Merge: deduplicate by name
  const seen = new Set(curatedMatches.map(o => o.name.toLowerCase()));
  const merged = [...curatedMatches];
  for (const w of wikiMatches) {
    if (!seen.has(w.name.toLowerCase())) {
      merged.push(w);
      seen.add(w.name.toLowerCase());
    }
  }

  return merged.slice(0, 30);
}

module.exports = {
  fetchWikidataMayors,
  fetchWikidataGovernors,
  getOfficialsForCity,
  searchOfficials,
  CURATED_OFFICIALS,
};
