const axios = require('axios');

async function test() {
  // Try various GMA fire RSS/feed endpoints
  const urls = [
    'https://data.gmanetwork.com/gno/rss/tracking/fire_incidents/feed.xml',
    'https://data.gmanetwork.com/gno/rss/tag/fire/feed.xml',
    'https://www.gmanetwork.com/news/tracking/fire_incidents/rss',
    'https://www.gmanetwork.com/news/rss/tracking/fire_incidents',
    'https://data.gmanetwork.com/gno/rss/news/nation/feed.xml',
    'https://data.gmanetwork.com/gno/rss/balitambayan/feed.xml',
  ];
  
  for (const url of urls) {
    try {
      const r = await axios.get(url, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const hasContent = r.data.includes('<item>');
      const items = r.data.match(/<item>/g)?.length || 0;
      console.log(`✓ ${url}`);
      console.log(`  Status: ${r.status}, Items: ${items}`);
      // Check for fire content
      const fireItems = r.data.match(/<item>[\s\S]*?(fire|sunog|blaze)[\s\S]*?<\/item>/gi) || [];
      console.log(`  Fire-related: ${fireItems.length}`);
    } catch(e) {
      console.log(`✗ ${url} → ${e.response?.status || e.code || e.message?.slice(0, 50)}`);
    }
  }
  
  // Also try the GMA news RSS we already have
  try {
    const r = await axios.get('https://data.gmanetwork.com/gno/rss/news/feed.xml', { timeout: 8000 });
    const items = r.data.match(/<item>[\s\S]*?<\/item>/g) || [];
    const fireItems = items.filter(i => /fire|sunog|blaze|nasunog|nagliyab/i.test(i));
    console.log(`\nMain GMA RSS: ${items.length} total, ${fireItems.length} fire-related`);
    if (fireItems.length > 0) {
      // Extract title from first match
      const title = fireItems[0].match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1];
      const link = fireItems[0].match(/<link>(.*?)<\/link>/)?.[1];
      console.log(`  First: "${title}"`);
      console.log(`  URL: ${link}`);
    }
  } catch(e) {
    console.log('Main RSS error:', e.message?.slice(0, 80));
  }
}

test().catch(console.error);
