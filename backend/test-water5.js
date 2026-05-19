const axios = require('axios');

async function main() {
  // Get a maintenance post with full content
  console.log('=== Maynilad Maintenance Post Detail ===');
  try {
    const r = await axios.get('https://www.mayniladwater.com.ph/wp-json/wp/v2/posts/18934', {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const post = r.data;
    console.log(`Title: ${post.title?.rendered}`);
    console.log(`Date: ${post.date}`);
    
    // Get rendered content and extract text
    const content = post.content?.rendered || '';
    console.log(`\nContent HTML length: ${content.length}`);
    
    // Extract text, preserving structure
    const text = content
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/td>/gi, ' | ')
      .replace(/<\/th>/gi, ' | ')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#8211;/g, '–')
      .replace(/&#8217;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    console.log('\nContent (text):');
    console.log(text.slice(0, 3000));
    
  } catch (e) {
    console.error('Error:', e.message?.slice(0, 100));
  }

  // Also look for service-advisories-2 category
  console.log('\n\n=== Looking for service-advisory category via WP API ===');
  try {
    // Try to find posts from the service-advisories-2 page
    const r = await axios.get('https://www.mayniladwater.com.ph/wp-json/wp/v2/posts?search=service+advisory&per_page=5', {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    console.log(`Search results: ${r.data.length}`);
    for (const p of r.data.slice(0, 3)) {
      console.log(`  ${p.title?.rendered?.slice(0, 80)} (${p.date})`);
    }
  } catch (e) {
    console.error('Search error:', e.message?.slice(0, 100));
  }

  // Try to get posts that are specifically 'maintenance'
  console.log('\n\n=== Maintenance posts ===');
  try {
    const r = await axios.get('https://www.mayniladwater.com.ph/wp-json/wp/v2/posts?search=maintenance+activities&per_page=10', {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    console.log(`Maintenance posts: ${r.data.length}`);
    for (const p of r.data.slice(0, 5)) {
      console.log(`  [${p.date.slice(0,10)}] ${p.title?.rendered?.slice(0, 80)}`);
    }
  } catch (e) {
    console.error('Error:', e.message?.slice(0, 100));
  }

  // For Manila Water, try their social/alternate sources
  console.log('\n\n=== Manila Water via Twitter/Alternate sources ===');
  try {
    // Try Manila Water RSS from their Facebook or an alternate endpoint
    const r = await axios.get('https://www.manilawater.com/feed', {
      timeout: 10000,
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      validateStatus: () => true,
    });
    console.log(`Manila Water /feed: ${r.status}`);
  } catch (e) {
    console.error('MW alternate:', e.code || e.message?.slice(0, 50));
  }
}

main().then(() => process.exit(0));
