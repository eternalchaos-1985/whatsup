const axios = require('axios');
const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

async function test() {
  // Test www.meralco.com.ph main page
  try {
    const r = await axios.get('https://www.meralco.com.ph', { headers, timeout: 10000 });
    console.log('www.meralco.com.ph => STATUS:', r.status, 'LEN:', r.data.length);
    const apiRefs = r.data.match(/api[^"'\s]{5,60}/gi) || [];
    console.log('API refs:', apiRefs.slice(0, 10));
  } catch(e) {
    console.log('www.meralco.com.ph => ERROR:', e.response?.status || e.code);
  }

  // Test the company SPA page for embedded data
  try {
    const r = await axios.get('https://company.meralco.com.ph/news-and-advisories/maintenance-schedule', { headers, timeout: 10000 });
    const scripts = r.data.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
    console.log('\ncompany.meralco.com.ph scripts:', scripts.length);
    
    // Look for embedded data patterns
    const patterns = r.data.match(/__NEXT_DATA__|window\.__STATE__|window\.initialProps|preloadedState|maintenanceSchedule|advisories|drupal|contentful|strapi/gi);
    console.log('Data patterns:', patterns);
    
    // Look for API base URLs in scripts
    const apiUrls = r.data.match(/https?:\/\/[^"'\s]+api[^"'\s]*/gi) || [];
    console.log('API URLs in page:', apiUrls.slice(0, 15));
    
    // Look for content management patterns
    const cms = r.data.match(/drupal|wordpress|contentful|strapi|graphql|sanity/gi);
    console.log('CMS patterns:', cms);
    
    // Check for Angular/React/Vue clues
    const frameworks = r.data.match(/ng-app|__next|__nuxt|react|vue|angular/gi);
    console.log('Framework clues:', frameworks?.slice(0, 5));
  } catch(e) {
    console.log('company page => ERROR:', e.response?.status || e.code);
  }

  // Try Meralco's official Twitter RSS proxy or news endpoint
  try {
    const r = await axios.get('https://meralco.com.ph', { headers, timeout: 10000 });
    console.log('\nmeralco.com.ph (no www) => STATUS:', r.status, 'LEN:', r.data.length);
  } catch(e) {
    console.log('meralco.com.ph => ERROR:', e.response?.status || e.code);
  }
}

test();
