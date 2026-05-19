const axios = require('axios');

async function main() {
  console.log('Fetching Manila Water...');
  try {
    const r = await axios.get('https://www.manilawater.com/customers/service-advisories', {
      timeout: 20000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept': 'text/html' },
      maxRedirects: 5,
    });
    console.log('Status:', r.status);
    console.log('Length:', r.data.length);
    const html = r.data;
    
    // Check for Next.js
    if (html.includes('__NEXT_DATA__')) {
      const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (m) {
        const d = JSON.parse(m[1]);
        console.log('Next.js pageProps keys:', Object.keys(d.props?.pageProps || {}));
        const pp = d.props?.pageProps;
        if (pp) console.log(JSON.stringify(pp).slice(0, 1000));
      }
    } else {
      // Look for content markers
      const markers = ['service-advisory', 'interruption', 'water supply', 'affected'];
      for (const m of markers) {
        const idx = html.toLowerCase().indexOf(m);
        console.log(`"${m}": ${idx > 0 ? 'found at ' + idx : 'not found'}`);
      }
      
      // Try to find links
      const hrefPattern = /href="([^"]*service[^"]*)"/gi;
      let match;
      const links = [];
      while ((match = hrefPattern.exec(html)) && links.length < 10) {
        links.push(match[1]);
      }
      console.log('Service links:', links);
    }
  } catch (e) {
    console.error('Error:', e.response?.status || e.code, e.message?.slice(0, 150));
  }
  
  console.log('\n\nFetching Maynilad...');
  try {
    const r = await axios.get('https://www.mayniladwater.com.ph/service-advisories-2/', {
      timeout: 20000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept': 'text/html' },
      maxRedirects: 5,
    });
    console.log('Status:', r.status);
    console.log('Length:', r.data.length);
    const html = r.data;
    
    const markers = ['service-advisory', 'interruption', 'water supply', 'affected', 'schedule'];
    for (const m of markers) {
      const idx = html.toLowerCase().indexOf(m);
      console.log(`"${m}": ${idx > 0 ? 'found at ' + idx : 'not found'}`);
    }
    
    // Find links
    const hrefPattern = /href="([^"]*advisor[^"]*)"/gi;
    let match;
    const links = [];
    while ((match = hrefPattern.exec(html)) && links.length < 10) {
      links.push(match[1]);
    }
    console.log('Advisory links:', links);
    
    // Look for article content
    const articles = html.match(/<article[\s\S]*?<\/article>/gi) || [];
    console.log('Articles:', articles.length);
    if (articles[0]) {
      console.log('First article:', articles[0].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300));
    }
    
    // Look for h2/h3 headings
    const headings = html.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi) || [];
    const cleaned = headings.map(h => h.replace(/<[^>]*>/g, '').trim()).filter(h => h.length > 3);
    console.log('Headings:', cleaned.slice(0, 10));
    
  } catch (e) {
    console.error('Error:', e.response?.status || e.code, e.message?.slice(0, 150));
  }
}

main().then(() => process.exit(0));
