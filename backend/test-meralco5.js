const axios = require('axios');
const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

async function test() {
  // Full RSS feed
  try {
    const r = await axios.get('https://company.meralco.com.ph/rss.xml', { headers, timeout: 10000 });
    console.log('RSS FEED CONTENT:\n');
    console.log(r.data);
  } catch(e) {
    console.log('Error:', e.message);
  }

  console.log('\n\n--- Trying more taxonomy feeds ---');
  // Try different taxonomy terms for "advisories" or "maintenance"
  for (let i = 2; i <= 10; i++) {
    try {
      const r = await axios.get(`https://company.meralco.com.ph/taxonomy/term/${i}/feed`, { headers, timeout: 8000 });
      if (r.data.length > 320) {
        const title = r.data.match(/<title>([^<]+)<\/title>/)?.[1];
        const items = (r.data.match(/<item>/g) || []).length;
        console.log(`term/${i}: "${title}" (${items} items, ${r.data.length} bytes)`);
      }
    } catch(e) {
      // skip 404s
    }
  }
}

test();
