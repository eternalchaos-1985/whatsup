const axios = require('axios');

async function test() {
  const r = await axios.get('https://www.gmanetwork.com/news/tracking/fire_incidents/', {
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  const html = r.data;
  console.log(`HTML length: ${html.length}`);
  console.log(`Contains "fire": ${html.toLowerCase().includes('fire')}`);
  console.log(`Contains "sunog": ${html.toLowerCase().includes('sunog')}`);
  console.log(`Contains "story": ${html.toLowerCase().includes('story')}`);
  
  // Find GMA-specific patterns
  const gmaLinks = html.match(/gmanetwork\.com\/news[^"'\s]*/gi) || [];
  console.log(`\nGMA internal links: ${gmaLinks.length}`);
  for (const l of [...new Set(gmaLinks)].slice(0, 10)) {
    console.log('  ' + l);
  }
  
  // Check for JSON data embedded in page
  const jsonPattern = html.match(/var\s+\w+\s*=\s*\[[\s\S]{0,500}/);
  if (jsonPattern) {
    console.log('\nFound embedded JS data:');
    console.log(jsonPattern[0].slice(0, 300));
  }
  
  // Extract a snippet around "fire"
  const idx = html.toLowerCase().indexOf('sunog');
  if (idx > 0) {
    console.log('\nContext around "sunog":');
    console.log(html.slice(Math.max(0, idx - 100), idx + 200));
  }
}

test().catch(console.error);
