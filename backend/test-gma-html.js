const axios = require('axios');

async function test() {
  const r = await axios.get('https://www.gmanetwork.com/news/tracking/fire_incidents/', {
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  const html = r.data;
  
  // Find all <a> tags with story URLs
  const allLinks = html.match(/<a[^>]*href=["'][^"']*story\/?["'][^>]*>[\s\S]*?<\/a>/gi) || [];
  console.log(`Total story links found: ${allLinks.length}`);
  if (allLinks.length > 0) {
    console.log('\nFirst 3 raw links:');
    for (const link of allLinks.slice(0, 3)) {
      console.log(link.slice(0, 200));
      console.log('---');
    }
  }
  
  // Try broader pattern
  const storyUrls = html.match(/https?:\/\/www\.gmanetwork\.com\/news\/[^"'\s]*\/story\//gi) || [];
  console.log(`\nStory URLs found: ${storyUrls.length}`);
  if (storyUrls.length > 0) {
    for (const u of [...new Set(storyUrls)].slice(0, 5)) {
      console.log('  ' + u);
    }
  }
}

test().catch(console.error);
