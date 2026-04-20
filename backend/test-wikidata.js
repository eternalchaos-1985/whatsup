const axios = require('axios');

// Comprehensive query: current PH city/municipal mayors via P6 (head of government)
const sparqlMayors = `
SELECT ?person ?personLabel ?city ?cityLabel ?start WHERE {
  ?city wdt:P17 wd:Q928 .
  {
    ?city wdt:P31/wdt:P279* wd:Q515 .
  } UNION {
    ?city wdt:P31/wdt:P279* wd:Q15284 .
  } UNION {
    ?city wdt:P31/wdt:P279* wd:Q3957 .
  }
  ?city p:P6 ?stmt .
  ?stmt ps:P6 ?person .
  FILTER NOT EXISTS { ?stmt pq:P582 ?end }
  OPTIONAL { ?stmt pq:P580 ?start }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,tl". }
}
ORDER BY ?cityLabel
LIMIT 200
`;

// Governors via P6 on provinces/regions
const sparqlGovernors = `
SELECT ?person ?personLabel ?prov ?provLabel ?start WHERE {
  {
    ?prov wdt:P31/wdt:P279* wd:Q24698 .
  } UNION {
    ?prov wdt:P31/wdt:P279* wd:Q104157280 .
  }
  ?prov wdt:P17 wd:Q928 .
  ?prov p:P6 ?stmt .
  ?stmt ps:P6 ?person .
  FILTER NOT EXISTS { ?stmt pq:P582 ?end }
  OPTIONAL { ?stmt pq:P580 ?start }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,tl". }
}
ORDER BY ?provLabel
LIMIT 100
`;

// Congressional representatives (members of Philippine House of Representatives)
const sparqlCongressMembers = `
SELECT ?person ?personLabel ?distLabel ?start WHERE {
  ?person wdt:P39 wd:Q20075702 .
  ?person p:P39 ?stmt .
  ?stmt ps:P39 wd:Q20075702 .
  OPTIONAL { ?stmt pq:P768 ?dist }
  FILTER NOT EXISTS { ?stmt pq:P582 ?end }
  OPTIONAL { ?stmt pq:P580 ?start }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,tl". }
}
ORDER BY ?distLabel
LIMIT 100
`;

async function test() {
  console.log('=== PH City/Municipal Mayors (P6) ===');
  try {
    const r = await axios.get('https://query.wikidata.org/sparql', {
      params: { query: sparqlMayors, format: 'json' },
      headers: { 'User-Agent': 'WhatsUp-CivicPlatform/1.0', Accept: 'application/sparql-results+json' },
      timeout: 30000,
    });
    const rows = r.data.results.bindings;
    console.log('Total:', rows.length);
    rows.forEach(row => {
      const label = row.cityLabel?.value;
      // Skip if label is still a QID
      if (label && !label.startsWith('Q')) {
        console.log(' ', row.personLabel?.value, '-', label, row.start?.value?.slice(0,10) || '');
      }
    });
  } catch (e) {
    console.error('Error:', e.response?.status, e.message);
  }

  console.log('\n=== PH Provincial Governors ===');
  try {
    const r = await axios.get('https://query.wikidata.org/sparql', {
      params: { query: sparqlGovernors, format: 'json' },
      headers: { 'User-Agent': 'WhatsUp-CivicPlatform/1.0', Accept: 'application/sparql-results+json' },
      timeout: 30000,
    });
    const rows = r.data.results.bindings;
    console.log('Total:', rows.length);
    rows.forEach(row => {
      const label = row.provLabel?.value;
      if (label && !label.startsWith('Q')) {
        console.log(' ', row.personLabel?.value, '-', label, row.start?.value?.slice(0,10) || '');
      }
    });
  } catch (e) {
    console.error('Error:', e.response?.status, e.message);
  }

  console.log('\n=== PH Congress Members (House) ===');
  try {
    const r = await axios.get('https://query.wikidata.org/sparql', {
      params: { query: sparqlCongressMembers, format: 'json' },
      headers: { 'User-Agent': 'WhatsUp-CivicPlatform/1.0', Accept: 'application/sparql-results+json' },
      timeout: 30000,
    });
    const rows = r.data.results.bindings;
    console.log('Total:', rows.length);
    rows.slice(0, 20).forEach(row => {
      console.log(' ', row.personLabel?.value, '-', row.distLabel?.value || 'N/A', row.start?.value?.slice(0,10) || '');
    });
  } catch (e) {
    console.error('Error:', e.response?.status, e.message);
  }
}

test();
