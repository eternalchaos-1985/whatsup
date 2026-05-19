const axios = require('axios');
const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

async function test() {
  // Check taxonomy terms up to 50 for maintenance-related feeds
  console.log('Checking taxonomy feeds...');
  for (let i = 2; i <= 50; i++) {
    try {
      const r = await axios.get(`https://company.meralco.com.ph/taxonomy/term/${i}/feed`, { headers, timeout: 5000 });
      if (r.data.length > 320) {
        const title = r.data.match(/<title>([^<]+)<\/title>/)?.[1];
        const items = (r.data.match(/<item>/g) || []).length;
        console.log(`  term/${i}: "${title}" (${items} items)`);
      }
    } catch(e) {
      // skip
    }
  }

  // Try the Meralco Twitter approach - they post advisories on social media
  // Also try their official Meralco alerts page
  console.log('\nChecking Meralco alerts/advisory specific URLs...');
  const urls = [
    'https://company.meralco.com.ph/news-and-advisories/advisories/rss.xml',
    'https://company.meralco.com.ph/advisories/feed',
    'https://company.meralco.com.ph/news-and-advisories/power-advisories/rss.xml',
    'https://company.meralco.com.ph/news-and-advisories/service-interruptions/rss.xml',
    // www.meralco.com.ph - customer portal might have an advisory page  
    'https://www.meralco.com.ph/api/outages',
    'https://www.meralco.com.ph/api/advisories',
    'https://www.meralco.com.ph/api/service-interruptions',
  ];
  
  for (const url of urls) {
    try {
      const r = await axios.get(url, { headers, timeout: 8000 });
      const type = r.headers['content-type'] || '';
      const len = typeof r.data === 'string' ? r.data.length : JSON.stringify(r.data).length;
      if (type.includes('html') && len > 200000) continue; // skip SPA shell
      console.log(`  ${url} => ${r.status} (${type.substring(0,30)}, ${len} bytes)`);
    } catch(e) {
      // Only show non-404 errors
      if (e.response?.status && e.response.status !== 404) {
        console.log(`  ${url} => ${e.response.status}`);
      }
    }
  }

  // Now test the Meralco power interruption news from our existing RSS feeds
  console.log('\nTesting power news from Philippine RSS feeds...');
  const POWER_KEYWORDS = /\b(power.?interruption|power.?outage|brownout|blackout|meralco|rotational|no.?electricity|electric.?supply|scheduled.?maintenance|ngcp)\b/i;
  const feeds = [
    { name: 'Inquirer', url: 'https://newsinfo.inquirer.net/feed' },
    { name: 'GMA', url: 'https://data.gmanetwork.com/gno/rss/news/feed.xml' },
    { name: 'PhilStar', url: 'https://www.philstar.com/rss/nation' },
    { name: 'PNA', url: 'https://www.pna.gov.ph/rss.xml' },
    { name: 'MB', url: 'https://mb.com.ph/feed' },
    { name: 'Rappler', url: 'https://www.rappler.com/feed/' },
  ];

  let total = 0;
  for (const feed of feeds) {
    try {
      const r = await axios.get(feed.url, { headers, timeout: 12000 });
      const items = r.data.match(/<item>[\s\S]*?<\/item>/g) || [];
      let hits = 0;
      for (const item of items) {
        const title = (item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '');
        const desc = (item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, '');
        if (POWER_KEYWORDS.test(`${title} ${desc}`)) {
          hits++;
          if (hits <= 2) console.log(`  [${feed.name}] ${title.substring(0, 80)}`);
        }
      }
      total += hits;
    } catch(e) {
      // skip
    }
  }
  console.log(`\nTotal power-related articles found: ${total}`);
}

test();
