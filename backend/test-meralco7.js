const axios = require('axios');
const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

async function test() {
  // Check term/21 "Advisement Letter" - may have power interruption notices
  try {
    const r = await axios.get('https://company.meralco.com.ph/taxonomy/term/21/feed', { headers, timeout: 10000 });
    console.log('Term 21 (Advisement Letter):\n');
    // Print items
    const items = r.data.match(/<item>[\s\S]*?<\/item>/g) || [];
    for (const item of items.slice(0, 5)) {
      const title = (item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '').trim();
      const link = (item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '').trim();
      const pubDate = (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '').trim();
      console.log(`  ${title}`);
      console.log(`    ${link}`);
      console.log(`    ${pubDate}\n`);
    }
  } catch(e) {
    console.log('Error:', e.message);
  }

  // Also check the full Meralco RSS for any advisory items we missed
  console.log('\n--- Full Meralco RSS items ---');
  try {
    const r = await axios.get('https://company.meralco.com.ph/rss.xml', { headers, timeout: 10000 });
    const items = r.data.match(/<item>[\s\S]*?<\/item>/g) || [];
    for (const item of items) {
      const title = (item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '').trim();
      console.log(`  ${title}`);
    }
    console.log(`\n  Total items: ${items.length}`);
  } catch(e) {
    console.log('Error:', e.message);
  }

  // Try one more thing - Meralco Facebook page might have RSS
  // Also try DOE (Dept of Energy) for power advisories
  console.log('\n--- DOE advisories ---');
  const doeUrls = [
    'https://www.doe.gov.ph/feed',
    'https://www.doe.gov.ph/rss.xml',
    'https://www.doe.gov.ph/energynews/feed',
  ];
  for (const url of doeUrls) {
    try {
      const r = await axios.get(url, { headers, timeout: 8000 });
      if (r.headers['content-type']?.includes('xml') || r.headers['content-type']?.includes('rss')) {
        const items = (r.data.match(/<item>/g) || []).length;
        console.log(`  ${url} => ${items} items`);
        // Show first few titles
        const matches = r.data.match(/<title>([\s\S]*?)<\/title>/g) || [];
        matches.slice(1, 5).forEach(m => {
          const t = m.replace(/<\/?title>/g, '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
          console.log(`    - ${t.substring(0, 80)}`);
        });
      } else {
        console.log(`  ${url} => ${r.headers['content-type']?.substring(0,30)} (${r.data.length} bytes)`);
      }
    } catch(e) {
      console.log(`  ${url} => ${e.response?.status || e.code}`);
    }
  }
}

test();
