const { getBFPReports } = require('./services/fireService');

async function test() {
  console.log('Fetching fire incidents from Philippine RSS feeds...');
  const reports = await getBFPReports();
  console.log(`Found ${reports.length} fire incidents`);
  
  const geotagged = reports.filter(r => r.lat && r.lng);
  console.log(`Geotagged: ${geotagged.length}/${reports.length}`);
  
  console.log('\nAll fire incidents:');
  for (const r of reports.slice(0, 15)) {
    console.log(`  [${r.lat ? '📍' : '  '}] ${r.source.padEnd(16)} | ${r.title?.slice(0, 55).padEnd(55)} | ${r.locationName || '-'}`);
  }
}

test().catch(console.error);
