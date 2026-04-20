const dilgService = require('./services/dilgService');

async function main() {
  try {
    // Test 1: Get barangay officials for a specific Manila barangay
    console.log('=== TEST 1: Barangay 1, Manila (NCR) ===');
    const brgy1 = await dilgService.getBarangayOfficials('Barangay 1', 'Manila', '13');
    console.log(`Found ${brgy1.length} officials`);
    brgy1.forEach(o => console.log(`  ${o.position}: ${o.name} (${o.area}) - Tel: ${o.phone}`));

    // Test 2: Get barangay officials for Gagalangin, Tondo
    console.log('\n=== TEST 2: Gagalangin, Manila ===');
    const gagalangin = await dilgService.getBarangayOfficials('Gagalangin', 'Manila', '13');
    console.log(`Found ${gagalangin.length} officials`);
    gagalangin.forEach(o => console.log(`  ${o.position}: ${o.name} (${o.area}) - Tel: ${o.phone}`));

    // Test 3: Get all barangay officials for Quezon City (just count)
    console.log('\n=== TEST 3: All Quezon City officials ===');
    const qc = await dilgService.getCityOfficials('Quezon City', '13');
    console.log(`Found ${qc.length} officials across QC barangays`);
    console.log('Unique barangays:', new Set(qc.map(o => o.area)).size);
    // Show first 5
    qc.slice(0, 5).forEach(o => console.log(`  ${o.position}: ${o.name} (${o.area})`));

    // Test 4: Search by name
    console.log('\n=== TEST 4: Search "poso" in NCR ===');
    const search = await dilgService.searchOfficialsByName('poso', '13');
    console.log(`Found ${search.length} matches`);
    search.forEach(o => console.log(`  ${o.name} - ${o.position}, ${o.area}, ${o.city}`));

  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
