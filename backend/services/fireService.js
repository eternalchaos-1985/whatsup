const axios = require('axios');
const NodeCache = require('node-cache');
const geoService = require('./geoService');
const { extractLocationFromText } = require('./newsService');

const cache = new NodeCache({ stdTTL: 300 }); // 5-minute cache
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NASA_FIRMS_MAP_KEY = process.env.NASA_FIRMS_MAP_KEY;

// Philippine news RSS feeds specifically for fire incident coverage
const FIRE_RSS_FEEDS = [
  { name: 'GMA News', url: 'https://data.gmanetwork.com/gno/rss/news/feed.xml' },
  { name: 'Inquirer', url: 'https://newsinfo.inquirer.net/feed' },
  { name: 'Rappler', url: 'https://www.rappler.com/feed/' },
  { name: 'PhilStar', url: 'https://www.philstar.com/rss/nation' },
  { name: 'Manila Bulletin', url: 'https://mb.com.ph/feed' },
  { name: 'PNA', url: 'https://www.pna.gov.ph/rss.xml' },
  { name: 'SunStar', url: 'https://www.sunstar.com.ph/feeds' },
  { name: 'MindaNews', url: 'https://www.mindanews.com/feed/' },
  { name: 'Daily Tribune', url: 'https://tribune.net.ph/feed/' },
];

// Keywords to identify fire-related articles (English + Filipino)
const FIRE_KEYWORDS = /\b(fire(?!\s*(?:works?|crackers?|arms?|d\b|fighter|fox|fly|wall|base|bird|place))|sunog|nasunog|nagliyab|blaze|arson|burned|burning|fire.?truck|fire.?station|bfp|conflagration|inferno)\b/i;

/**
 * Fetch satellite fire hotspots from NASA FIRMS.
 * Covers the Philippines bounding box by default.
 */
async function getNasaFirmsData(days = 2) {
  const cacheKey = `nasa-firms-${days}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    // NASA FIRMS VIIRS active fire data for the Philippines
    const response = await axios.get(
      `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${NASA_FIRMS_MAP_KEY}/VIIRS_SNPP_NRT/world/${days}`,
      { timeout: 15000 }
    );

    // Parse CSV response — filter to PH bounding box (4.5°N–21.5°N, 116°E–127°E)
    const lines = response.data.split('\n');
    const headers = lines[0]?.split(',') || [];
    const latIdx = headers.indexOf('latitude');
    const lngIdx = headers.indexOf('longitude');
    const dateIdx = headers.indexOf('acq_date');
    const timeIdx = headers.indexOf('acq_time');
    const confidenceIdx = headers.indexOf('confidence');
    const brightIdx = headers.indexOf('bright_ti4');

    const incidents = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i]?.split(',');
      if (!cols || cols.length < headers.length) continue;

      const lat = parseFloat(cols[latIdx]);
      const lng = parseFloat(cols[lngIdx]);

      // Filter to Philippines bounding box
      if (lat >= 4.5 && lat <= 21.5 && lng >= 116 && lng <= 127) {
        incidents.push({
          id: `firms-${i}`,
          source: 'NASA FIRMS',
          lat,
          lng,
          date: cols[dateIdx],
          time: cols[timeIdx],
          confidence: cols[confidenceIdx],
          brightness: parseFloat(cols[brightIdx]) || null,
          type: 'satellite-hotspot',
        });
      }
    }

    cache.set(cacheKey, incidents);
    return incidents;
  } catch (error) {
    console.error('Error fetching NASA FIRMS data:', error.message);
    return [];
  }
}

/**
 * Fetch fire-related news from NewsAPI.
 */
async function getFireNews(location, dateFrom, dateTo) {
  const cacheKey = `fire-news-${location || 'ph'}-${dateFrom}-${dateTo}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const query = location
      ? `(fire OR sunog OR blaze) AND ${location} AND Philippines`
      : '(fire OR sunog OR blaze) AND Philippines';

    const params = {
      q: query,
      language: 'en',
      sortBy: 'publishedAt',
      pageSize: 30,
      apiKey: NEWS_API_KEY,
    };
    if (dateFrom) params.from = dateFrom;
    if (dateTo) params.to = dateTo;

    const response = await axios.get('https://newsapi.org/v2/everything', {
      params,
      timeout: 10000,
    });

    const articles = (response.data.articles || []).map((article, idx) => ({
      id: `fire-news-${idx}`,
      source: article.source?.name || 'Unknown',
      title: article.title,
      description: article.description,
      url: article.url,
      imageUrl: article.urlToImage,
      publishedAt: article.publishedAt,
      type: 'news-report',
    }));

    cache.set(cacheKey, articles);
    return articles;
  } catch (error) {
    console.error('Error fetching fire news:', error.message);
    return [];
  }
}

/**
 * Aggregate fire-related news from multiple Philippine RSS feeds.
 * Filters articles by fire keywords and geotags them.
 */
async function getFireNewsFromRSS() {
  const cacheKey = 'fire-rss-aggregated';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const results = await Promise.allSettled(
    FIRE_RSS_FEEDS.map(feed =>
      axios.get(feed.url, { timeout: 12000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WhatsUp-CivicPlatform/1.0)' } })
        .then(r => parseFireRSSItems(r.data, feed.name))
    )
  );

  let articles = [];
  for (const r of results) {
    if (r.status === 'fulfilled') articles.push(...r.value);
  }

  // Sort by date, newest first
  articles.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());

  // Deduplicate by title similarity
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

/**
 * Parse RSS items and filter to fire-related ones, with geolocation.
 */
function parseFireRSSItems(xml, sourceName) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  const fireArticles = [];

  for (const item of items) {
    const title = (item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '')
      .replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    const link = (item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '').trim();
    const desc = (item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '')
      .replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, '').trim();
    const pubDate = (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '').trim();

    if (!title || !link) continue;

    // Filter: only keep fire-related articles
    const text = `${title} ${desc}`;
    if (!FIRE_KEYWORDS.test(text)) continue;

    // Geotag using location extraction
    const location = extractLocationFromText(text);

    fireArticles.push({
      id: `fire-rss-${sourceName.toLowerCase().replace(/\s+/g, '-')}-${fireArticles.length}`,
      source: sourceName,
      title,
      description: desc.substring(0, 250),
      url: link,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      lat: location?.lat || null,
      lng: location?.lng || null,
      locationName: location?.name || null,
      type: 'news-report',
    });
  }

  return fireArticles;
}

/**
 * Get fire incident reports from Philippine news sources (replaces BFP placeholder).
 */
async function getBFPReports(location) {
  const cacheKey = `fire-reports-${location || 'all'}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const reports = await getFireNewsFromRSS();

  // Filter by location keyword if provided
  let filtered = reports;
  if (location) {
    const loc = location.toLowerCase();
    filtered = reports.filter(r =>
      (r.title && r.title.toLowerCase().includes(loc)) ||
      (r.locationName && r.locationName.toLowerCase().includes(loc))
    );
  }

  cache.set(cacheKey, filtered);
  return filtered;
}

/**
 * Aggregate fire incidents from all sources, filtered by location + date range.
 */
async function getFireIncidents({ lat, lng, radius = 10, dateFrom, dateTo, location }) {
  const [firms, news, bfp] = await Promise.allSettled([
    getNasaFirmsData(),
    getFireNews(location, dateFrom, dateTo),
    getBFPReports(location),
  ]);

  let satelliteHotspots = firms.status === 'fulfilled' ? firms.value : [];
  const newsReports = news.status === 'fulfilled' ? news.value : [];
  const bfpReports = bfp.status === 'fulfilled' ? bfp.value : [];

  // Filter satellite data by radius if coordinates provided
  if (lat && lng && satelliteHotspots.length > 0) {
    satelliteHotspots = geoService.filterByRadius(satelliteHotspots, lat, lng, radius);
    satelliteHotspots = geoService.sortByDistance(satelliteHotspots, lat, lng);
  }

  return {
    satelliteHotspots,
    newsReports,
    bfpReports,
    totalCount: satelliteHotspots.length + newsReports.length + bfpReports.length,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  getNasaFirmsData,
  getFireNews,
  getBFPReports,
  getFireIncidents,
};
