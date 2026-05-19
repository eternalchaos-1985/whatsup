const axios = require('axios');

async function testManilaWater() {
  console.log('=== Manila Water ===');
  try {
    const r = await axios.get('https://www.manilawater.com/customers/service-advisories', {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    const html = r.data;
    console.log('Length:', html.length);
    console.log('Has advisory:', html.includes('advisory'));
    console.log('Has interruption:', html.includes('interruption'));
    
    // Look for article/card patterns
    const cardPattern = html.match(/class="[^"]*card[^"]*"/gi) || [];
    console.log('Card classes:', cardPattern.length);
    
    // Look for advisory items
    const advisoryItems = html.match(/class="[^"]*advisory[^"]*"/gi) || [];
    console.log('Advisory items:', advisoryItems.slice(0, 5));
    
    // Look for links to individual advisories
    const links = html.match(/href="[^"]*service-advisor[^"]*"/gi) || [];
    console.log('Service advisory links:', links.slice(0, 8));
    
    // Look for date patterns
    const dates = html.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4}/gi) || [];
    console.log('Dates found:', dates.slice(0, 5));
    
    // Look for area/location mentions
    const areaIdx = html.indexOf('area');
    if (areaIdx > 0) console.log('Context near "area":', html.slice(areaIdx, areaIdx + 200).replace(/\s+/g, ' '));
    
    // Check for JSON embedded data
    const nextData = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextData) {
      console.log('\nFound __NEXT_DATA__ (Next.js app)!');
      const data = JSON.parse(nextData[1]);
      console.log('Page props keys:', Object.keys(data.props?.pageProps || {}));
      const advisories = data.props?.pageProps?.advisories || data.props?.pageProps?.data || data.props?.pageProps?.items;
      if (advisories) {
        console.log('Advisories count:', Array.isArray(advisories) ? advisories.length : typeof advisories);
        if (Array.isArray(advisories) && advisories[0]) {
          console.log('First item keys:', Object.keys(advisories[0]));
          console.log('First item:', JSON.stringify(advisories[0]).slice(0, 500));
        }
      }
    }
    
    // Check for Drupal/CMS JSON views
    const viewsMatch = html.match(/views-row/gi);
    console.log('Drupal views-row:', viewsMatch?.length || 0);
    
    // Get first chunk of body content
    const bodyIdx = html.indexOf('<body');
    const mainContent = html.slice(bodyIdx, bodyIdx + 3000).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
    console.log('\nBody start (cleaned):', mainContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500));
    
  } catch (e) {
    console.error('Manila Water error:', e.response?.status, e.message?.slice(0, 100));
  }
}

testManilaWater();
