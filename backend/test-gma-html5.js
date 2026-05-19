const axios = require('axios');

async function test() {
  const r = await axios.get('https://www.gmanetwork.com/news/tracking/fire_incidents/', {
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  const html = r.data;
  
  // Look for AJAX endpoints, API URLs, or data sources
  const apiPatterns = html.match(/(api|ajax|fetch|endpoint|data_url|load_url|json)[^"';\n]{0,150}/gi) || [];
  console.log('API-like references:');
  for (const p of [...new Set(apiPatterns)].slice(0, 20)) {
    console.log('  ' + p);
  }
  
  // Look for tracking-related JS
  const trackingJS = html.match(/tracking[^"';\n]{0,200}/gi) || [];
  console.log('\nTracking JS refs:');
  for (const t of [...new Set(trackingJS)].slice(0, 10)) {
    console.log('  ' + t);
  }
  
  // Look for JSON data or article data arrays
  const dataArrays = html.match(/articles?\s*[=:]\s*[\[{]/gi) || [];
  console.log('\nData arrays:', dataArrays.slice(0, 5));
  
  // Look for script src that loads tracking page content
  const scripts = html.match(/<script[^>]*src=["'][^"']*["'][^>]*>/gi) || [];
  console.log('\nScript tags:');
  for (const s of scripts.slice(0, 15)) {
    console.log('  ' + s);
  }
  
  // Look for XHR/fetch URLs
  const fetchUrls = html.match(/["'](\/news\/[^"']*|https:\/\/data\.gmanetwork[^"']*)["']/gi) || [];
  console.log('\nGMA data URLs:');
  for (const u of [...new Set(fetchUrls)].slice(0, 15)) {
    console.log('  ' + u);
  }
}

test().catch(console.error);
