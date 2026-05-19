const axios = require('axios');

async function test() {
  const r = await axios.get('https://www.gmanetwork.com/news/tracking/fire_incidents/', {
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  const html = r.data;
  
  // Find the Tracking.gz.js or tracking.gz.js script
  const trackingScriptUrl = html.match(/["'](https?:\/\/[^"']*[Tt]racking\.gz\.js[^"']*)["']/);
  console.log('Tracking script:', trackingScriptUrl?.[1]);
  
  // Look for inline script that configures the tracking page articles
  // Search for the section that contains article-related configuration
  const configMatch = html.match(/tracking_stories|TRACKING_CONFIG|fire_incidents.*config/i);
  console.log('Config match:', configMatch?.[0]);
  
  // Let's look at all inline script blocks that have substantial content
  const scripts = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
  console.log(`\nTotal script blocks: ${scripts.length}`);
  
  // Find the ones with tracking-related logic (not just library includes)
  for (let i = 0; i < scripts.length; i++) {
    const s = scripts[i];
    if (s.length > 200 && (s.includes('tracking') || s.includes('fire') || s.includes('story'))) {
      // Skip JSON-LD
      if (s.includes('application/ld+json')) continue;
      console.log(`\n=== Script block ${i} (${s.length} chars) ===`);
      console.log(s.slice(0, 800));
    }
  }
  
  // Try the GMA RSS feed for news.xml which already works
  try {
    const rss = await axios.get('https://data.gmanetwork.com/gno/rss/news/feed.xml', {
      timeout: 10000,
    });
    // Check if fire label exists
    const fireItems = rss.data.match(/<item>[\s\S]*?(fire|sunog)[\s\S]*?<\/item>/gi) || [];
    console.log(`\nGMA RSS fire-related items: ${fireItems.length}`);
    if (fireItems.length > 0) {
      console.log(fireItems[0].slice(0, 300));
    }
  } catch(e) {
    console.log('RSS error:', e.message?.slice(0, 80));
  }
}

test().catch(console.error);
