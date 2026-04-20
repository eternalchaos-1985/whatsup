const axios = require('axios');

async function testPSGC() {
  console.log('=== PSGC API Tests ===\n');

  // Test 1: List all regions
  console.log('--- Regions ---');
  try {
    const r = await axios.get('https://psgc.gitlab.io/api/regions/', { timeout: 10000 });
    console.log('Total regions:', r.data.length);
    r.data.slice(0, 5).forEach(rg => console.log(`  ${rg.code} - ${rg.name}`));
    console.log('  ...');
  } catch (e) { console.error('Error:', e.response?.status, e.message); }

  // Test 2: NCR cities
  console.log('\n--- NCR Cities ---');
  try {
    const r = await axios.get('https://psgc.gitlab.io/api/regions/130000000/cities-municipalities/', { timeout: 10000 });
    console.log('Total:', r.data.length);
    r.data.slice(0, 10).forEach(c => console.log(`  ${c.code} - ${c.name}`));
  } catch (e) { console.error('Error:', e.response?.status, e.message); }

  // Test 3: All cities
  console.log('\n--- All Cities/Municipalities ---');
  try {
    const r = await axios.get('https://psgc.gitlab.io/api/cities-municipalities/', { timeout: 15000 });
    console.log('Total:', r.data.length);
    // Find Manila
    const manila = r.data.filter(c => c.name.toLowerCase().includes('manila'));
    console.log('Manila matches:', manila.map(c => `${c.code} - ${c.name}`));
  } catch (e) { console.error('Error:', e.response?.status, e.message); }

  // Test 4: Barangays of a city
  console.log('\n--- Barangays of City of Manila ---');
  try {
    const r = await axios.get('https://psgc.gitlab.io/api/cities-municipalities/133900000/barangays/', { timeout: 10000 });
    console.log('Total:', r.data.length);
    r.data.slice(0, 8).forEach(b => console.log(`  ${b.code} - ${b.name}`));
  } catch (e) { console.error('Error:', e.response?.status, e.message); }

  // Test 5: Check data shape
  console.log('\n--- Data shape (first city) ---');
  try {
    const r = await axios.get('https://psgc.gitlab.io/api/cities-municipalities/133900000/', { timeout: 10000 });
    console.log(JSON.stringify(r.data, null, 2));
  } catch (e) { console.error('Error:', e.response?.status, e.message); }
}

testPSGC();
