const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 600 });
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GOOGLE_CIVIC_API_KEY = process.env.GOOGLE_CIVIC_API_KEY;

// Legitimate Philippine news RSS feeds — no API key required
const PH_RSS_FEEDS = [
  { name: 'Inquirer', url: 'https://newsinfo.inquirer.net/feed', category: 'news' },
  { name: 'Rappler', url: 'https://www.rappler.com/feed/', category: 'news' },
  { name: 'PhilStar', url: 'https://www.philstar.com/rss/nation', category: 'nation' },
  { name: 'BusinessWorld', url: 'https://www.bworldonline.com/feed/', category: 'business' },
];

/**
 * Parse RSS XML items into a normalized article array.
 */
function parseRSSItems(xml, sourceName, defaultCategory) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  return items.map((item, i) => {
    const title = (item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '')
      .replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    const link = (item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '').trim();
    const desc = (item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '')
      .replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, '').trim();
    const pubDate = (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '').trim();
    const categories = (item.match(/<category><!\[CDATA\[([\s\S]*?)\]\]><\/category>/g) || [])
      .map(c => c.replace(/<\/?category>|<!\[CDATA\[|\]\]>/g, '').trim().toLowerCase());
    // Try to extract image from media:content, enclosure, or content:encoded
    const imageUrl =
      item.match(/<media:content[^>]*url=["']([^"']+)/)?.[1] ||
      item.match(/<enclosure[^>]*url=["']([^"']+)/)?.[1] ||
      item.match(/<img[^>]*src=["']([^"']+)/)?.[1] ||
      null;

    return {
      source: sourceName,
      title,
      description: desc.substring(0, 250),
      url: link,
      imageUrl,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      category: categories[0] || defaultCategory,
      categories,
    };
  }).filter(a => a.title && a.url);
}

/**
 * Fetch and aggregate news from multiple Philippine RSS feeds.
 */
async function getPhilippineRSSNews(filterKeywords) {
  const cacheKey = `ph-rss-${filterKeywords || 'all'}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const results = await Promise.allSettled(
    PH_RSS_FEEDS.map(feed =>
      axios.get(feed.url, { timeout: 12000 })
        .then(r => parseRSSItems(r.data, feed.name, feed.category))
    )
  );

  let allArticles = [];
  for (const r of results) {
    if (r.status === 'fulfilled') allArticles.push(...r.value);
  }

  // Sort by date, newest first
  allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  // Filter by keywords if provided
  if (filterKeywords) {
    const keywords = filterKeywords.toLowerCase().split(/\s+/);
    const filtered = allArticles.filter(a => {
      const text = `${a.title} ${a.description} ${a.categories.join(' ')}`.toLowerCase();
      return keywords.some(kw => text.includes(kw));
    });
    if (filtered.length > 0) allArticles = filtered;
  }

  // Deduplicate by title similarity
  const seen = new Set();
  allArticles = allArticles.filter(a => {
    const key = a.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  cache.set(cacheKey, allArticles);
  return allArticles;
}

async function getLocalNews(query, pageSize = 20) {
  const cacheKey = `news-${query}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Try NewsAPI first if key is available (broader search)
  if (NEWS_API_KEY) {
    try {
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: query,
          language: 'en',
          sortBy: 'publishedAt',
          pageSize,
          apiKey: NEWS_API_KEY,
        },
        timeout: 10000,
      });

      const articles = response.data.articles.map(article => ({
        source: article.source?.name,
        title: article.title,
        description: article.description,
        url: article.url,
        imageUrl: article.urlToImage,
        publishedAt: article.publishedAt,
        category: 'news',
      }));

      cache.set(cacheKey, articles);
      return articles;
    } catch (error) {
      console.error('NewsAPI error, falling back to PH RSS feeds:', error.message);
    }
  }

  // Fallback: aggregate from Philippine news RSS feeds
  return getPhilippineRSSNews(query);
}

async function getPhilippinesNews(location) {
  // Always use Philippine RSS feeds for local news (legitimate, always available)
  return getPhilippineRSSNews(location);
}

async function getCivicInfo(address) {
  if (!GOOGLE_CIVIC_API_KEY) {
    return { offices: [], officials: [], divisions: {} };
  }

  const cacheKey = `civic-${address}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(
      'https://www.googleapis.com/civicinfo/v2/representatives',
      {
        params: { address, key: GOOGLE_CIVIC_API_KEY },
        timeout: 10000,
      }
    );

    const result = {
      offices: response.data.offices,
      officials: response.data.officials,
      divisions: response.data.divisions,
    };

    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching civic info:', error.message);
    throw new Error('Failed to fetch civic information');
  }
}

module.exports = { getLocalNews, getPhilippinesNews, getCivicInfo };
