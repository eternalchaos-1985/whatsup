const axios = require('axios');
const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

async function test() {
  // Try _format=hal_json and other Drupal REST formats
  const urls = [
    'https://company.meralco.com.ph/news-and-advisories/maintenance-schedule?_format=hal_json',
    'https://company.meralco.com.ph/news-and-advisories?_format=json',
    'https://company.meralco.com.ph/news-and-advisories?_format=hal_json',
  ];

  for (const url of urls) {
    try {
      const r = await axios.get(url, { headers, timeout: 10000 });
      console.log(url);
      console.log('  STATUS:', r.status, 'TYPE:', r.headers['content-type']?.substring(0,60), 'LEN:', typeof r.data === 'string' ? r.data.length : JSON.stringify(r.data).length);
      if (!r.headers['content-type']?.includes('html')) {
        console.log('  PREVIEW:', JSON.stringify(r.data).substring(0, 400));
      }
    } catch(e) {
      console.log(url, '=> ERROR:', e.response?.status || e.code);
    }
  }

  // Now let's look at the JS bundle URLs in the SPA to find the real API
  try {
    const r = await axios.get('https://company.meralco.com.ph', { headers, timeout: 10000 });
    // Find all JS bundle URLs
    const jsUrls = r.data.match(/src="([^"]*\.js[^"]*)"/gi) || [];
    console.log('\nJS bundles:', jsUrls.slice(0, 10));
    
    // Find any inline JSON or config
    const configs = r.data.match(/(?:baseUrl|apiUrl|apiEndpoint|API_BASE)\s*[:=]\s*["'][^"']+["']/gi);
    console.log('Config patterns:', configs);
    
    // Find drupalSettings
    const drupalSettings = r.data.match(/drupalSettings\s*=\s*\{[^}]{0,500}/);
    console.log('Drupal settings:', drupalSettings ? drupalSettings[0].substring(0, 300) : 'not found');
  } catch(e) {
    console.log('Error getting main page:', e.message);
  }
}

test();
