const axios = require('axios');
const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

async function test() {
  // Drupal standard API endpoints
  const urls = [
    'https://company.meralco.com.ph/jsonapi',
    'https://company.meralco.com.ph/jsonapi/node/article',
    'https://company.meralco.com.ph/jsonapi/node/page',
    'https://company.meralco.com.ph/api/v1/content',
    'https://company.meralco.com.ph/rest/api/content',
    'https://company.meralco.com.ph/node?_format=json',
    'https://company.meralco.com.ph/news-and-advisories/maintenance-schedule?_format=json',
    'https://company.meralco.com.ph/api/maintenance-schedule',
  ];

  for (const url of urls) {
    try {
      const r = await axios.get(url, { headers, timeout: 10000, maxRedirects: 3 });
      const isJson = r.headers['content-type']?.includes('json');
      const isHtml = r.headers['content-type']?.includes('html');
      console.log(url);
      console.log('  STATUS:', r.status, 'TYPE:', r.headers['content-type']?.substring(0,40), 'LEN:', typeof r.data === 'string' ? r.data.length : JSON.stringify(r.data).length);
      if (isJson) {
        const preview = JSON.stringify(r.data).substring(0, 300);
        console.log('  JSON:', preview);
      }
    } catch(e) {
      console.log(url, '=> ERROR:', e.response?.status || e.code);
    }
  }
}

test();
