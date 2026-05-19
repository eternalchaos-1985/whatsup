const { getBFPReports } = require('./services/fireService');

async function test() {
  console.log('Fetching GMA fire incidents...');
  const reports = await getBFPReports();
  console.log(`Found ${reports.length} fire incidents`);
  console.log('\nGeotagged incidents:');
  const geotagged = reports.filter(r => r.lat && r.lng);
  console.log(`${geotagged.length} with coordinates out of ${reports.length} total`);
  console.log('\nFirst 5:');
  for (const r of reports.slice(0, 5)) {
    console.log(`  [${r.lat ? '📍' : '  '}] ${r.title?.slice(0, 60)} → ${r.locationName || '(no location)'}`);
  }
}

test().catch(console.error);
