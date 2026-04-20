// Test script to download and analyze the DILG elective officials spreadsheet
const https = require('https');

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1B2N5SjZEBP-29tUioFHaSk-6R_1YFGcYIkSPjuApxZw/gviz/tq?tqx=out:csv&gid=1213553854';

function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchCSV(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

async function main() {
  console.log('Downloading spreadsheet...');
  const csv = await fetchCSV(SHEET_URL);
  const lines = csv.split('\n').filter(l => l.trim());
  console.log('Total lines:', lines.length);

  // Parse header
  const header = parseCSVLine(lines[0]);
  console.log('Headers:', header);

  // Parse all rows
  const rows = lines.slice(1).map(l => {
    const cols = parseCSVLine(l);
    return {
      region: cols[0] || '',
      province: cols[1] || '',
      cityMun: cols[2] || '',
      position: cols[3] || '',
      electionYear: cols[4] || '',
      firstName: cols[5] || '',
      middleName: cols[6] || '',
      lastName: cols[7] || '',
      suffix: cols[8] || '',
      officeAddress: cols[9] || '',
      officeContact: cols[10] || '',
      email: cols[11] || '',
    };
  });

  // Unique regions and positions
  const regions = new Set(rows.map(r => r.region));
  const positions = new Set(rows.map(r => r.position));
  console.log('\nRegions:', regions.size);
  [...regions].sort().forEach(r => console.log('  -', r));
  console.log('\nPositions:', positions.size);
  [...positions].sort().forEach(p => console.log('  -', p));

  // Count by position
  const posCounts = {};
  rows.forEach(r => {
    posCounts[r.position] = (posCounts[r.position] || 0) + 1;
  });
  console.log('\nPosition counts:');
  Object.entries(posCounts).sort((a, b) => b[1] - a[1]).forEach(([p, c]) => console.log(`  ${p}: ${c}`));

  // Sample Manila officials
  const manila = rows.filter(r => r.cityMun.includes('MANILA') && r.region.includes('CAPITAL'));
  console.log('\nManila (NCR) officials:', manila.length);
  manila.forEach(r => console.log(`  ${r.position}: ${r.firstName} ${r.lastName} ${r.suffix || ''} | ${r.officeContact}`));

  // Sample: Quezon City
  const qc = rows.filter(r => r.cityMun.includes('QUEZON') && r.region.includes('CAPITAL'));
  console.log('\nQuezon City officials:', qc.length);
  qc.forEach(r => console.log(`  ${r.position}: ${r.firstName} ${r.lastName} ${r.suffix || ''}`));
}

main().catch(console.error);
