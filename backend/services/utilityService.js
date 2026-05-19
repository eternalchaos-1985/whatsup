const axios = require('axios');
const NodeCache = require('node-cache');
const { extractLocationFromText } = require('./newsService');

const cache = new NodeCache({ stdTTL: 300 }); // 5-minute cache
const NEWS_API_KEY = process.env.NEWS_API_KEY;

// ─── Known utility provider endpoints (Philippines) ───
const UTILITY_SOURCES = {
  water: {
    providers: [
      { name: 'Maynilad', area: 'Metro Manila West Zone (Caloocan, Las Piñas, Malabon, Manila, Muntinlupa, Navotas, Parañaque, Pasay, Valenzuela, parts of Quezon City, Makati, Cavite)', feedUrl: 'https://www.mayniladwater.com.ph/wp-json/wp/v2/posts' },
      { name: 'Manila Water', area: 'Metro Manila East Zone (Makati, Mandaluyong, Marikina, Pasig, Pateros, San Juan, Taguig, parts of Quezon City, Rizal)', feedUrl: '' },
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

// ─── Water: Maynilad (WordPress REST API) ───

/**
 * Fetch Maynilad maintenance schedules from their WordPress REST API.
 * Parses the structured table content (City | Barangay | Schedule | Activity | Location).
 */
async function getMayniladInterruptions() {
  const cacheKey = 'maynilad-interruptions';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    // Get recent maintenance posts
    const response = await axios.get('https://www.mayniladwater.com.ph/wp-json/wp/v2/posts', {
      params: { search: 'maintenance activities', per_page: 3 },
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WhatsUp-CivicPlatform/1.0)' },
    });

    const interruptions = [];
    for (const post of response.data) {
      const title = (post.title?.rendered || '').replace(/<[^>]*>/g, '');
      const content = post.content?.rendered || '';
      const publishedAt = post.date;
      const postUrl = post.link;

      // Parse HTML table rows from the content
      const parsed = parseMayniladTable(content, publishedAt, postUrl);
      interruptions.push(...parsed);
    }

    cache.set(cacheKey, interruptions);
    return interruptions;
  } catch (error) {
    console.error('[Maynilad] Error fetching interruptions:', error.message);
    return [];
  }
}

/**
 * Parse Maynilad HTML table content into structured interruption records.
 * Table format: City | Barangay | Schedule | Activity | Location of Activity
 */
function parseMayniladTable(html, publishedAt, postUrl) {
  const results = [];

  // Extract table rows
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];

  let currentCity = '';
  for (const row of rows) {
    const cells = row.match(/<td[\s\S]*?<\/td>/gi) || [];
    if (cells.length < 4) continue;

    const cellTexts = cells.map(c =>
      c.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
        .replace(/&#8211;/g, '–').replace(/&#8217;/g, "'").replace(/\s+/g, ' ').trim()
    );

    // Skip header row
    if (cellTexts[0]?.toLowerCase() === 'city' || cellTexts[0]?.toLowerCase() === 'area') continue;

    // Track current city (some rows span multiple barangays under same city)
    if (cellTexts[0]) currentCity = cellTexts[0];

    const barangay = cellTexts[1] || '';
    const schedule = cellTexts[2] || '';
    const activity = cellTexts[3] || '';
    const location = cellTexts[4] || '';

    if (!schedule) continue;

    // Parse start/end dates from schedule text
    const { startDate, endDate } = parseScheduleText(schedule);

    results.push({
      id: `maynilad-${results.length}-${currentCity.slice(0, 10)}`,
      utilityType: 'water',
      provider: 'Maynilad',
      area: `${currentCity}${barangay ? ' – ' + barangay : ''}`,
      location: location || undefined,
      startDate,
      endDate,
      schedule,
      reason: activity,
      source: postUrl || 'https://www.mayniladwater.com.ph',
      publishedAt,
    });
  }

  return results;
}

/**
 * Parse schedule text like "10:00 p.m. of May 18, 2026 to 6:00 a.m. of May 19, 2026"
 * or "12:00 a.m. to 3:00 a.m. daily, from May 18 to 24, 2026"
 */
function parseScheduleText(text) {
  // Pattern: "TIME of DATE to TIME of DATE"
  const singleMatch = text.match(
    /(\d{1,2}:\d{2}\s*[ap]\.?m\.?)\s+of\s+(\w+\s+\d{1,2},?\s*\d{4})\s+to\s+(\d{1,2}:\d{2}\s*[ap]\.?m\.?)\s+of\s+(\w+\s+\d{1,2},?\s*\d{4})/i
  );
  if (singleMatch) {
    const startDate = tryParseDate(`${singleMatch[2]} ${singleMatch[1]}`);
    const endDate = tryParseDate(`${singleMatch[4]} ${singleMatch[3]}`);
    return { startDate, endDate };
  }

  // Pattern: "TIME to TIME daily, from DATE to DATE, YEAR"
  const dailyMatch = text.match(
    /(\d{1,2}:\d{2}\s*[ap]\.?m\.?)\s+to\s+(\d{1,2}:\d{2}\s*[ap]\.?m\.?)\s+daily,?\s+from\s+(\w+\s+\d{1,2})\s+to\s+(\d{1,2}),?\s*(\d{4})/i
  );
  if (dailyMatch) {
    const startDate = tryParseDate(`${dailyMatch[3]}, ${dailyMatch[5]} ${dailyMatch[1]}`);
    const endDate = tryParseDate(`${dailyMatch[3].split(' ')[0]} ${dailyMatch[4]}, ${dailyMatch[5]} ${dailyMatch[2]}`);
    return { startDate, endDate };
  }

  return { startDate: null, endDate: null };
}

function tryParseDate(str) {
  try {
    const d = new Date(str.replace(/\./g, ''));
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch { return null; }
}

// ─── Water: Manila Water (RSS news aggregation) ───

const WATER_RSS_FEEDS = [
  { name: 'Inquirer', url: 'https://newsinfo.inquirer.net/feed' },
  { name: 'Rappler', url: 'https://www.rappler.com/feed/' },
  { name: 'GMA News', url: 'https://data.gmanetwork.com/gno/rss/news/feed.xml' },
  { name: 'PhilStar', url: 'https://www.philstar.com/rss/nation' },
  { name: 'Manila Bulletin', url: 'https://mb.com.ph/feed' },
  { name: 'PNA', url: 'https://www.pna.gov.ph/rss.xml' },
];

const WATER_KEYWORDS = /\b(water.?interruption|water.?outage|water.?advisory|water.?service|no.?water|tubig|manila.?water|maynilad|low.?pressure|water.?supply)\b/i;

/**
 * Fetch Manila Water / water supply advisories from Philippine RSS feeds.
 */
async function getManilaWaterAdvisories() {
  const cacheKey = 'manila-water-advisories';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const results = await Promise.allSettled(
    WATER_RSS_FEEDS.map(feed =>
      axios.get(feed.url, { timeout: 12000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WhatsUp-CivicPlatform/1.0)' } })
        .then(r => parseWaterRSSItems(r.data, feed.name))
    )
  );

  let articles = [];
  for (const r of results) {
    if (r.status === 'fulfilled') articles.push(...r.value);
  }

  // Sort newest first, deduplicate
  articles.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
  const seen = new Set();
  articles = articles.filter(a => {
    const key = a.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  cache.set(cacheKey, articles);
  return articles;
}

function parseWaterRSSItems(xml, sourceName) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  const waterArticles = [];

  for (const item of items) {
    const title = (item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '')
      .replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    const link = (item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '').trim();
    const desc = (item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '')
      .replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, '').trim();
    const pubDate = (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '').trim();

    if (!title || !link) continue;
    const text = `${title} ${desc}`;
    if (!WATER_KEYWORDS.test(text)) continue;

    waterArticles.push({
      id: `water-news-${sourceName.toLowerCase().replace(/\s+/g, '-')}-${waterArticles.length}`,
      utilityType: 'water',
      source: sourceName,
      title,
      description: desc.substring(0, 250),
      url: link,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
    });
  }

  return waterArticles;
}

// ─── Scheduled Interruptions (combined) ───

/**
 * Fetch scheduled water service interruptions from actual provider sources.
 */
async function getScheduledInterruptions(utilityType, location) {
  const cacheKey = `interruptions-${utilityType}-${location || 'all'}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  let interruptions = [];

  if (utilityType === 'water') {
    // Fetch real Maynilad data
    const maynilad = await getMayniladInterruptions();
    interruptions = maynilad;

    // Filter by location if provided
    if (location) {
      const loc = location.toLowerCase();
      interruptions = interruptions.filter(i =>
        i.area.toLowerCase().includes(loc) ||
        (i.location && i.location.toLowerCase().includes(loc))
      );
    }
  }

  cache.set(cacheKey, interruptions);
  return interruptions;
}

/**
 * Fetch utility-related news from NewsAPI or RSS feeds.
 */
async function getUtilityNews(utilityType, location) {
  if (utilityType === 'water') {
    // Use RSS-based water news for more reliable results
    const articles = await getManilaWaterAdvisories();
    if (location) {
      const loc = location.toLowerCase();
      return articles.filter(a =>
        a.title.toLowerCase().includes(loc) ||
        a.description?.toLowerCase().includes(loc)
      );
    }
    return articles;
  }

  // For electric/internet, use NewsAPI if available
  const typeKeywords = {
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

  if (!NEWS_API_KEY) return [];

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
