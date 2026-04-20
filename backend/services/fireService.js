const axios = require('axios');
const NodeCache = require('node-cache');
const geoService = require('./geoService');

const cache = new NodeCache({ stdTTL: 300 }); // 5-minute cache
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NASA_FIRMS_MAP_KEY = process.env.NASA_FIRMS_MAP_KEY;

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
 * Get BFP (Bureau of Fire Protection) incident reports.
 * Placeholder — in production, parse BFP RSS/press releases or open data.
 */
async function getBFPReports(location) {
  const cacheKey = `bfp-${location || 'all'}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Placeholder: replace with actual BFP feed integration
  const reports = [];
  cache.set(cacheKey, reports);
  return reports;
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
