const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 600 });
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GOOGLE_CIVIC_API_KEY = process.env.GOOGLE_CIVIC_API_KEY;

async function getLocalNews(query, pageSize = 20) {
  const cacheKey = `news-${query}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Try NewsAPI first if key is available
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
      console.error('NewsAPI error, falling back to ReliefWeb:', error.message);
    }
  }

  // Fallback: GDACS RSS feed for Philippines disaster news
  return getGdacsNews();
}

async function getGdacsNews() {
  const cacheKey = 'gdacs-news';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get('https://www.gdacs.org/xml/rss.xml', { timeout: 15000 });
    const xml = response.data;
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    const articles = [];

    for (const item of items.slice(0, 40)) {
      const title = (item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
      const desc = (item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, '');
      const link = (item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '').trim();
      const pubDate = (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '').trim();
      const lat = item.match(/<geo:lat>([\s\S]*?)<\/geo:lat>/)?.[1];
      const lng = item.match(/<geo:long>([\s\S]*?)<\/geo:long>/)?.[1];

      // Include all GDACS items (global disasters) but prioritize Philippines
      const isPH = lat && lng && parseFloat(lat) >= 4.5 && parseFloat(lat) <= 21.5 && parseFloat(lng) >= 116 && parseFloat(lng) <= 127;
      const isRelevant = isPH || title.toLowerCase().includes('philipp') || desc.toLowerCase().includes('philipp');

      if (isRelevant || articles.length < 5) {
        articles.push({
          source: 'GDACS',
          title: title || 'Disaster Report',
          description: desc.replace(/<[^>]*>/g, '').substring(0, 200),
          url: link,
          imageUrl: null,
          publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          category: 'disaster',
        });
      }
    }

    cache.set(cacheKey, articles);
    return articles;
  } catch (error) {
    console.error('Error fetching GDACS news:', error.message);
    throw new Error('Failed to fetch local news');
  }
}

async function getPhilippinesNews(location) {
  const query = location
    ? `${location} Philippines`
    : 'Philippines hazard OR disaster OR typhoon OR flood OR earthquake';
  return getLocalNews(query);
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
