const axios = require('axios');
const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

async function test() {
  // Try views REST export which is common in Drupal
  const urls = [
    'https://company.meralco.com.ph/api/v1/maintenance-schedule',
    'https://company.meralco.com.ph/rest/maintenance-schedule?_format=json',
    'https://company.meralco.com.ph/views/maintenance-schedule?_format=json',
    'https://company.meralco.com.ph/maintenance-schedule?_format=json',
    'https://company.meralco.com.ph/node/1?_format=json',
    'https://company.meralco.com.ph/admin/content?_format=json',
    // Standard Drupal RSS
    'https://company.meralco.com.ph/rss.xml',
    'https://company.meralco.com.ph/news-and-advisories/feed',
    'https://company.meralco.com.ph/taxonomy/term/1/feed',
  ];

  for (const url of urls) {
    try {
      const r = await axios.get(url, { headers, timeout: 10000, maxRedirects: 3 });
      const type = r.headers['content-type'] || '';
      const isHtml = type.includes('html');
      const len = typeof r.data === 'string' ? r.data.length : JSON.stringify(r.data).length;
      
      // Skip if it's the 215K SPA shell
      if (isHtml && len > 200000) {
        console.log(url, '=> SPA shell (215K HTML)');
        continue;
      }
      
      console.log(url);
      console.log('  STATUS:', r.status, 'TYPE:', type.substring(0,50), 'LEN:', len);
      const preview = typeof r.data === 'string' ? r.data.substring(0, 300) : JSON.stringify(r.data).substring(0, 300);
      console.log('  PREVIEW:', preview.replace(/\n/g, ' '));
    } catch(e) {
      console.log(url, '=> ERROR:', e.response?.status || e.code);
    }
  }

  // Look in the JS bundle for API endpoints
  console.log('\n--- Checking JS bundle for API URLs ---');
  try {
    const r = await axios.get('https://company.meralco.com.ph/sites/default/files/assets/js/js_C6mHdE4ga8Ez0DLPOvzplouPKiNxhyqzOJ7z1vZyoTg.js?scope=header&delta=0&language=en&theme=default&include=eJxtkGtuhDAMhC9EyJGQN5mA22Cj2JT29mUXukur_hrPZ438oJxdSb4inUVfmop3MxrVpEPaDcSjTbqFWRtChdmzveFWtM3x1CtfVpviH99lFFqrxzcLEyijXUlR9Z3MasQpHvLb9Un1nSHqnNB9MDYbWAoLOwZLTWuNDxp-aDjo9Z7C49rIWSX-S3s0LNpeP7iPK5yOiIAazMP5mO4G35ce8LmoIQ-F624tjpB7-nqeaEZYaMQ3mWmSgQ', { headers, timeout: 10000 });
    console.log('JS bundle length:', r.data.length);
    // Look for API URLs
    const apiCalls = r.data.match(/["'](\/api\/[^"']+|https?:\/\/[^"']*api[^"']*)/gi) || [];
    console.log('API references in JS:', apiCalls.slice(0, 20));
    // Look for drupalSettings
    const settings = r.data.match(/drupalSettings/g);
    console.log('drupalSettings count:', settings?.length);
    // Look for views endpoint configs
    const views = r.data.match(/views_ajax|rest_export|json_api/gi);
    console.log('Views/REST patterns:', views);
  } catch(e) {
    console.log('JS bundle error:', e.message?.substring(0, 100));
  }
}

test();
