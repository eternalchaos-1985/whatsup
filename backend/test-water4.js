const axios = require('axios');

async function main() {
  // Maynilad WordPress REST API
  console.log('=== Maynilad WP API ===');
  try {
    const r = await axios.get('https://www.mayniladwater.com.ph/wp-json/wp/v2/posts?per_page=5', {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const posts = r.data;
    console.log(`Posts: ${posts.length}`);
    for (const p of posts) {
      console.log(`\n  ID: ${p.id}`);
      console.log(`  Title: ${p.title?.rendered?.slice(0, 80)}`);
      console.log(`  Date: ${p.date}`);
      console.log(`  Link: ${p.link}`);
      console.log(`  Categories: ${JSON.stringify(p.categories)}`);
      const content = (p.content?.rendered || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      console.log(`  Content: ${content.slice(0, 200)}`);
    }
  } catch (e) {
    console.error('WP API error:', e.message?.slice(0, 100));
  }

  // Get categories to find the service-advisories one
  console.log('\n\n=== Maynilad Categories ===');
  try {
    const r = await axios.get('https://www.mayniladwater.com.ph/wp-json/wp/v2/categories?per_page=50', {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    for (const c of r.data) {
      if (c.name.toLowerCase().includes('advisory') || c.name.toLowerCase().includes('service') || c.name.toLowerCase().includes('interrupt') || c.count > 10) {
        console.log(`  ID: ${c.id}, Name: "${c.name}", Slug: "${c.slug}", Count: ${c.count}`);
      }
    }
  } catch (e) {
    console.error('Categories error:', e.message?.slice(0, 100));
  }

  // Maynilad service advisories RSS
  console.log('\n\n=== Maynilad Service Advisories RSS ===');
  try {
    const r = await axios.get('https://www.mayniladwater.com.ph/category/service-advisories/feed/', {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const items = r.data.match(/<item>[\s\S]*?<\/item>/g) || [];
    console.log(`Items: ${items.length}`);
    for (const item of items.slice(0, 5)) {
      const title = (item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
      const link = (item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '').trim();
      const pubDate = (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '').trim();
      const desc = (item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '')
        .replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, '').trim();
      console.log(`\n  Title: ${title}`);
      console.log(`  Date: ${pubDate}`);
      console.log(`  Link: ${link}`);
      console.log(`  Desc: ${desc.slice(0, 200)}`);
    }
  } catch (e) {
    console.error('RSS error:', e.message?.slice(0, 100));
  }
}

main().then(() => process.exit(0));
