const axios = require('axios');

async function test() {
  const r = await axios.get('https://www.gmanetwork.com/news/tracking/fire_incidents/', {
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  const html = r.data;
  
  // Find the tracking.gz.js script URL and its configuration
  const trackingJsUrl = html.match(/src=["']([^"']*[Tt]racking[^"']*)["']/);
  console.log('Tracking JS URL:', trackingJsUrl?.[1]);
  
  // Look for tag_id, tracking_id variable or configuration
  const tagMatch = html.match(/tag_id[^;]{0,200}/i);
  const trackIdMatch = html.match(/tracking_id[^;]{0,200}/i);
  const sectionMatch = html.match(/section_id[^;]{0,200}/i);
  const categoryMatch = html.match(/category_id[^;]{0,200}/i);
  
  console.log('tag_id:', tagMatch?.[0]);
  console.log('tracking_id:', trackIdMatch?.[0]);
  console.log('section_id:', sectionMatch?.[0]);
  console.log('category_id:', categoryMatch?.[0]);
  
  // Look for the page number / article loading mechanism
  const pagePattern = html.match(/page[^;]{0,150}/gi) || [];
  const relevantPages = pagePattern.filter(p => 
    p.includes('page_id') || p.includes('page_no') || p.includes('pageIndex')
  );
  console.log('\nPage configs:', relevantPages.slice(0, 5));
  
  // Let's try the GMA data API for tracking topics
  try {
    // Try fetching the tag data (common GMA API pattern)
    const tagRes = await axios.get('https://data.gmanetwork.com/gno/articles/get_stories_by_tag_id', {
      params: { tag_id: 'fire_incidents', limit: 20 },
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.gmanetwork.com/' },
    });
    console.log('\nTag API response:', typeof tagRes.data, JSON.stringify(tagRes.data).slice(0, 300));
  } catch(e) {
    console.log('\nTag API error:', e.response?.status, e.message?.slice(0, 100));
  }
  
  // Try alternative endpoint
  try {
    const tagRes2 = await axios.get('https://data.gmanetwork.com/gno/tracking/fire_incidents', {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.gmanetwork.com/' },
    });
    console.log('\nTracking API:', typeof tagRes2.data, JSON.stringify(tagRes2.data).slice(0, 300));
  } catch(e) {
    console.log('\nTracking API error:', e.response?.status, e.message?.slice(0, 100));
  }
}

test().catch(console.error);
