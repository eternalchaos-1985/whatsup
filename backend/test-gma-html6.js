const axios = require('axios');

async function test() {
  const r = await axios.get('https://www.gmanetwork.com/news/tracking/fire_incidents/', {
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  const html = r.data;
  
  // Extract the Tracking JS content inline and the data_url/api pattern
  const dataUrlMatch = html.match(/data_url\s*=\s*\(?[^;]{0,500}/);
  const apiMatch = html.match(/api\s*=\s*\(?[^;]{0,500}/);
  
  console.log('data_url pattern:', dataUrlMatch?.[0]?.slice(0, 300));
  console.log('\napi pattern:', apiMatch?.[0]?.slice(0, 300));
  
  // Find the inline script with tracking configuration
  const inlineScripts = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
  const trackingScripts = inlineScripts.filter(s => s.includes('data_url') || s.includes('fire_incidents'));
  console.log(`\nTracking-related inline scripts: ${trackingScripts.length}`);
  for (const s of trackingScripts.slice(0, 2)) {
    console.log(s.slice(0, 1000));
    console.log('...');
  }
}

test().catch(console.error);
