const axios = require('axios');

async function test() {
  const r = await axios.get('https://www.gmanetwork.com/news/tracking/fire_incidents/', {
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  const html = r.data;
  
  // Find /story/ occurrences  
  let idx = 0;
  let count = 0;
  while ((idx = html.indexOf('/story/', idx)) !== -1 && count < 5) {
    const ctx = html.slice(Math.max(0, idx - 300), idx + 50);
    console.log(`=== Match ${count + 1} ===`);
    console.log(ctx);
    console.log('');
    idx += 7;
    count++;
  }
}

test().catch(console.error);
