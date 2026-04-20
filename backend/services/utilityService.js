const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 300 }); // 5-minute cache
const NEWS_API_KEY = process.env.NEWS_API_KEY;

// ─── Known utility provider endpoints (Philippines) ───
// In production, replace with actual provider API endpoints or RSS feeds.
const UTILITY_SOURCES = {
  water: {
    providers: [
      { name: 'Maynilad', area: 'Metro Manila West', feedUrl: '' },
      { name: 'Manila Water', area: 'Metro Manila East', feedUrl: '' },
      { name: 'Prime Water', area: 'Cavite, Laguna, Batangas', feedUrl: '' },
    ],
  },
  electric: {
    providers: [
      { name: 'Meralco', area: 'Metro Manila, Cavite, Laguna, Rizal, Bulacan', feedUrl: '' },
      { name: 'NGCP', area: 'National Grid', feedUrl: '' },
    ],
  },
  internet: {
    providers: [
      { name: 'PLDT/Smart', area: 'Nationwide', feedUrl: '' },
      { name: 'Globe Telecom', area: 'Nationwide', feedUrl: '' },
      { name: 'Converge ICT', area: 'Nationwide', feedUrl: '' },
      { name: 'DITO Telecommunity', area: 'Nationwide', feedUrl: '' },
    ],
  },
};

/**
 * Fetch utility-related news from NewsAPI as a proxy for advisory data.
 */
async function getUtilityNews(utilityType, location) {
  const typeKeywords = {
    water: 'water interruption OR water outage OR water advisory OR tubig',
    electric: 'power interruption OR power outage OR brownout OR blackout OR Meralco',
    internet: 'internet outage OR network down OR PLDT outage OR Globe outage OR Converge outage',
  };

  const keywords = typeKeywords[utilityType] || utilityType;
  const query = location
    ? `(${keywords}) AND ${location} AND Philippines`
    : `(${keywords}) AND Philippines`;

  const cacheKey = `utility-news-${utilityType}-${location || 'ph'}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: query,
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: 20,
        apiKey: NEWS_API_KEY,
      },
      timeout: 10000,
    });

    const articles = (response.data.articles || []).map((article, idx) => ({
      id: `${utilityType}-news-${idx}`,
      utilityType,
      source: article.source?.name || 'Unknown',
      title: article.title,
      description: article.description,
      url: article.url,
      imageUrl: article.urlToImage,
      publishedAt: article.publishedAt,
    }));

    cache.set(cacheKey, articles);
    return articles;
  } catch (error) {
    console.error(`Error fetching ${utilityType} news:`, error.message);
    return [];
  }
}

/**
 * Fetch scheduled service interruptions from provider feeds.
 * Placeholder — replace with actual provider API/RSS parsing in production.
 */
async function getScheduledInterruptions(utilityType, location) {
  const cacheKey = `interruptions-${utilityType}-${location || 'all'}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Placeholder: in production, parse RSS feeds or scrape provider advisory pages
  const interruptions = [];
  cache.set(cacheKey, interruptions);
  return interruptions;
}

/**
 * Get all advisories for a utility type (water | electric | internet).
 */
async function getAdvisories(utilityType, location) {
  const [news, scheduled] = await Promise.allSettled([
    getUtilityNews(utilityType, location),
    getScheduledInterruptions(utilityType, location),
  ]);

  return {
    utilityType,
    providers: UTILITY_SOURCES[utilityType]?.providers || [],
    newsReports: news.status === 'fulfilled' ? news.value : [],
    scheduledInterruptions: scheduled.status === 'fulfilled' ? scheduled.value : [],
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get all utility advisories at once (water + electric + internet).
 */
async function getAllUtilityAdvisories(location) {
  const [water, electric, internet] = await Promise.allSettled([
    getAdvisories('water', location),
    getAdvisories('electric', location),
    getAdvisories('internet', location),
  ]);

  return {
    water: water.status === 'fulfilled' ? water.value : null,
    electric: electric.status === 'fulfilled' ? electric.value : null,
    internet: internet.status === 'fulfilled' ? internet.value : null,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  getUtilityNews,
  getScheduledInterruptions,
  getAdvisories,
  getAllUtilityAdvisories,
  UTILITY_SOURCES,
};
