const axios = require('axios');

async function test() {
  const r = await axios.get('https://www.gmanetwork.com/news/tracking/fire_incidents/', {
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  const html = r.data;
  
  // Find all href patterns containing /story/
  const storyPattern = /href=["']([^"']*story[^"']*)["']/gi;
  let m;
  const urls = new Set();
  while ((m = storyPattern.exec(html)) !== null) {
    urls.add(m[1]);
  }
  console.log(`Story hrefs: ${urls.size}`);
  for (const u of [...urls].slice(0, 10)) {
    console.log('  ' + u);
  }

  // Try different - look for story links with full domain
  const fullPattern = /["'](\/news\/[^"']*\/story\/)["']/gi;
  const relUrls = new Set();
  while ((m = fullPattern.exec(html)) !== null) {
    relUrls.add(m[1]);
  }
  console.log(`\nRelative /news/ story paths: ${relUrls.size}`);
  for (const u of [...relUrls].slice(0, 10)) {
    console.log('  ' + u);
  }
  
  // Look around a story url for context
  const storyIdx = html.indexOf('/story/');
  if (storyIdx > 0) {
    console.log('\nContext around first /story/:');
    console.log(html.slice(Math.max(0, storyIdx - 200), storyIdx + 100));
  }
}

test().catch(console.error);
