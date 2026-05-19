const axios = require('axios');

async function main() {
  // Manila Water - Try different paths/APIs
  const mwUrls = [
    'https://www.manilawater.com/api/service-advisories',
    'https://www.manilawater.com/api/advisories',
    'https://www.manilawater.com/service-advisories/feed',
    'https://www.manilawater.com/feed',
    'https://www.manilawater.com/rss',
    'https://manilawater.com/customers/service-advisories',
  ];

  console.log('=== Manila Water attempts ===');
  for (const url of mwUrls) {
    try {
      const r = await axios.get(url, {
        timeout: 10000,
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/html, application/xml, */*',
        },
        validateStatus: () => true,
      });
      console.log(`  ${r.status} ${url.slice(25)}`);
      if (r.status === 200 && r.data) {
        const preview = typeof r.data === 'string' ? r.data.slice(0, 150) : JSON.stringify(r.data).slice(0, 150);
        console.log(`    → ${preview}`);
      }
    } catch (e) {
      console.log(`  ERR ${url.slice(25)} → ${e.code || e.message?.slice(0, 50)}`);
    }
  }

  // Maynilad attempts  
  const myUrls = [
    'https://www.mayniladwater.com.ph/wp-json/wp/v2/posts?categories=service-advisory&per_page=10',
    'https://www.mayniladwater.com.ph/wp-json/wp/v2/posts?per_page=5',
    'https://www.mayniladwater.com.ph/feed/',
    'https://www.mayniladwater.com.ph/feed',
    'https://www.mayniladwater.com.ph/category/service-advisories/feed/',
  ];

  console.log('\n=== Maynilad attempts ===');
  for (const url of myUrls) {
    try {
      const r = await axios.get(url, {
        timeout: 10000,
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/html, application/xml, */*',
        },
        validateStatus: () => true,
      });
      console.log(`  ${r.status} ${url.slice(30)}`);
      if (r.status === 200 && r.data) {
        const preview = typeof r.data === 'string' ? r.data.slice(0, 200) : JSON.stringify(r.data).slice(0, 200);
        console.log(`    → ${preview}`);
      }
    } catch (e) {
      console.log(`  ERR ${url.slice(30)} → ${e.code || e.message?.slice(0, 50)}`);
    }
  }

  // Try Meralco too since we were looking at it earlier
  const merUrls = [
    'https://company.meralco.com.ph/news-and-advisories/maintenance-schedule',
    'https://meralco.com.ph/api/maintenance',
    'https://www.meralco.com.ph/news-and-advisories',
  ];
  
  console.log('\n=== Meralco attempts ===');
  for (const url of merUrls) {
    try {
      const r = await axios.get(url, {
        timeout: 10000,
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html, application/json, */*',
        },
        validateStatus: () => true,
      });
      console.log(`  ${r.status} ${url}`);
      if (r.status === 200) {
        const hasData = r.data?.length > 1000;
        console.log(`    → ${hasData ? 'Has content (' + r.data.length + ' chars)' : 'Minimal'}`);
      }
    } catch (e) {
      console.log(`  ERR ${url} → ${e.code || e.message?.slice(0, 50)}`);
    }
  }
}

main().then(() => process.exit(0));
