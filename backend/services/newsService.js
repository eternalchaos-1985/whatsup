const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 600 });
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GOOGLE_CIVIC_API_KEY = process.env.GOOGLE_CIVIC_API_KEY;

async function getLocalNews(query, pageSize = 20) {
  const cacheKey = `news-${query}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

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
    console.error('Error fetching news:', error.message);
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
