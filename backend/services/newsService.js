const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 600 });
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GOOGLE_CIVIC_API_KEY = process.env.GOOGLE_CIVIC_API_KEY;

// ─── Philippine Location Gazetteer for news geo-tagging ───
// Major cities, provinces, and regions with approximate center coordinates
const PH_LOCATIONS = [
  // NCR
  { name: 'Manila', lat: 14.5995, lng: 120.9842 },
  { name: 'Quezon City', lat: 14.6760, lng: 121.0437 },
  { name: 'Makati', lat: 14.5547, lng: 121.0244 },
  { name: 'Taguig', lat: 14.5176, lng: 121.0509 },
  { name: 'Pasig', lat: 14.5764, lng: 121.0851 },
  { name: 'Mandaluyong', lat: 14.5794, lng: 121.0359 },
  { name: 'Marikina', lat: 14.6507, lng: 121.1029 },
  { name: 'Pasay', lat: 14.5378, lng: 121.0014 },
  { name: 'Parañaque', lat: 14.4793, lng: 121.0198 },
  { name: 'Las Piñas', lat: 14.4445, lng: 120.9939 },
  { name: 'Muntinlupa', lat: 14.4081, lng: 121.0415 },
  { name: 'Valenzuela', lat: 14.6942, lng: 120.9840 },
  { name: 'Malabon', lat: 14.6625, lng: 120.9567 },
  { name: 'Navotas', lat: 14.6667, lng: 120.9417 },
  { name: 'Caloocan', lat: 14.6500, lng: 120.9667 },
  { name: 'San Juan', lat: 14.6019, lng: 121.0355 },
  // Major cities outside NCR
  { name: 'Cebu City', lat: 10.3157, lng: 123.8854 },
  { name: 'Cebu', lat: 10.3157, lng: 123.8854 },
  { name: 'Davao City', lat: 7.1907, lng: 125.4553 },
  { name: 'Davao', lat: 7.1907, lng: 125.4553 },
  { name: 'Zamboanga', lat: 6.9214, lng: 122.0790 },
  { name: 'Cagayan de Oro', lat: 8.4542, lng: 124.6319 },
  { name: 'Iloilo City', lat: 10.7202, lng: 122.5621 },
  { name: 'Iloilo', lat: 10.7202, lng: 122.5621 },
  { name: 'Bacolod', lat: 10.6840, lng: 122.9740 },
  { name: 'General Santos', lat: 6.1164, lng: 125.1716 },
  { name: 'Gensan', lat: 6.1164, lng: 125.1716 },
  { name: 'Baguio', lat: 16.4023, lng: 120.5960 },
  { name: 'Olongapo', lat: 14.8292, lng: 120.2828 },
  { name: 'Angeles City', lat: 15.1680, lng: 120.5856 },
  { name: 'Angeles', lat: 15.1680, lng: 120.5856 },
  { name: 'Tarlac', lat: 15.4393, lng: 120.5931 },
  { name: 'Dagupan', lat: 16.0433, lng: 120.3340 },
  { name: 'San Fernando', lat: 16.6159, lng: 120.3209 },
  { name: 'Laoag', lat: 18.1979, lng: 120.5936 },
  { name: 'Vigan', lat: 17.5747, lng: 120.3869 },
  { name: 'Tuguegarao', lat: 17.6132, lng: 121.7270 },
  { name: 'Santiago', lat: 16.6892, lng: 121.5486 },
  { name: 'Cabanatuan', lat: 15.4868, lng: 120.9697 },
  { name: 'Batangas City', lat: 13.7565, lng: 121.0583 },
  { name: 'Batangas', lat: 13.7565, lng: 121.0583 },
  { name: 'Lipa', lat: 13.9411, lng: 121.1632 },
  { name: 'Lucena', lat: 13.9373, lng: 121.6170 },
  { name: 'Naga', lat: 13.6192, lng: 123.1814 },
  { name: 'Legazpi', lat: 13.1391, lng: 123.7438 },
  { name: 'Tacloban', lat: 11.2543, lng: 124.9601 },
  { name: 'Ormoc', lat: 11.0044, lng: 124.6075 },
  { name: 'Dumaguete', lat: 9.3068, lng: 123.3054 },
  { name: 'Tagbilaran', lat: 9.6561, lng: 123.8511 },
  { name: 'Puerto Princesa', lat: 9.7392, lng: 118.7353 },
  { name: 'Palawan', lat: 9.8349, lng: 118.7384 },
  { name: 'Butuan', lat: 8.9475, lng: 125.5406 },
  { name: 'Surigao', lat: 9.7844, lng: 125.4960 },
  { name: 'Cotabato', lat: 7.2236, lng: 124.2464 },
  { name: 'Marawi', lat: 8.0016, lng: 124.2874 },
  { name: 'Iligan', lat: 8.2289, lng: 124.2453 },
  { name: 'Dipolog', lat: 8.5878, lng: 123.3406 },
  { name: 'Pagadian', lat: 7.8269, lng: 123.4372 },
  { name: 'Ozamiz', lat: 8.1481, lng: 123.8444 },
  { name: 'Koronadal', lat: 6.5022, lng: 124.8472 },
  { name: 'Kidapawan', lat: 7.0084, lng: 125.0894 },
  { name: 'Isabela', lat: 6.7000, lng: 121.9689 },
  // Provinces
  { name: 'Pangasinan', lat: 15.8949, lng: 120.2863 },
  { name: 'Pampanga', lat: 15.0794, lng: 120.7120 },
  { name: 'Bulacan', lat: 14.7942, lng: 120.8800 },
  { name: 'Cavite', lat: 14.2829, lng: 120.8686 },
  { name: 'Laguna', lat: 14.2691, lng: 121.4113 },
  { name: 'Rizal', lat: 14.5964, lng: 121.1254 },
  { name: 'Zambales', lat: 15.5082, lng: 119.9710 },
  { name: 'Nueva Ecija', lat: 15.5784, lng: 121.1113 },
  { name: 'Benguet', lat: 16.4012, lng: 120.5811 },
  { name: 'La Union', lat: 16.6159, lng: 120.3209 },
  { name: 'Ilocos Norte', lat: 18.1647, lng: 120.7116 },
  { name: 'Ilocos Sur', lat: 17.2288, lng: 120.4866 },
  { name: 'Cagayan', lat: 17.6132, lng: 121.7270 },
  { name: 'Isabela', lat: 16.9754, lng: 121.8107 },
  { name: 'Quirino', lat: 16.4900, lng: 121.5700 },
  { name: 'Bataan', lat: 14.6417, lng: 120.4818 },
  { name: 'Camarines Sur', lat: 13.6252, lng: 123.1826 },
  { name: 'Camarines Norte', lat: 14.1390, lng: 122.7632 },
  { name: 'Albay', lat: 13.1775, lng: 123.7281 },
  { name: 'Sorsogon', lat: 12.9707, lng: 124.0147 },
  { name: 'Oriental Mindoro', lat: 12.9867, lng: 121.3046 },
  { name: 'Occidental Mindoro', lat: 12.7506, lng: 120.9483 },
  { name: 'Mindoro', lat: 12.8797, lng: 121.0870 },
  { name: 'Negros Occidental', lat: 10.0000, lng: 122.5500 },
  { name: 'Negros Oriental', lat: 9.6282, lng: 123.0119 },
  { name: 'Negros', lat: 9.9581, lng: 122.8711 },
  { name: 'Bohol', lat: 9.8500, lng: 124.0150 },
  { name: 'Leyte', lat: 10.4167, lng: 124.9500 },
  { name: 'Samar', lat: 11.7500, lng: 125.0000 },
  { name: 'Misamis Oriental', lat: 8.5046, lng: 124.6220 },
  { name: 'Misamis Occidental', lat: 8.3375, lng: 123.7071 },
  { name: 'Bukidnon', lat: 8.0515, lng: 125.0985 },
  { name: 'Lanao del Norte', lat: 8.0712, lng: 124.0873 },
  { name: 'Lanao del Sur', lat: 7.8233, lng: 124.4363 },
  { name: 'North Cotabato', lat: 7.1436, lng: 124.8530 },
  { name: 'South Cotabato', lat: 6.2982, lng: 124.8535 },
  { name: 'Sultan Kudarat', lat: 6.5069, lng: 124.4198 },
  { name: 'Maguindanao', lat: 7.0000, lng: 124.2917 },
  { name: 'Zamboanga del Norte', lat: 8.1532, lng: 123.2588 },
  { name: 'Zamboanga del Sur', lat: 7.8383, lng: 123.2948 },
  { name: 'Zamboanga Sibugay', lat: 7.5222, lng: 122.8174 },
  { name: 'Davao del Norte', lat: 7.5622, lng: 125.7555 },
  { name: 'Davao del Sur', lat: 6.7656, lng: 125.3284 },
  { name: 'Davao Oriental', lat: 7.3172, lng: 126.1728 },
  { name: 'Davao Occidental', lat: 6.1055, lng: 125.6085 },
  { name: 'Agusan del Norte', lat: 8.9456, lng: 125.5320 },
  { name: 'Agusan del Sur', lat: 8.1530, lng: 125.9044 },
  { name: 'Surigao del Norte', lat: 9.7893, lng: 125.4948 },
  { name: 'Surigao del Sur', lat: 8.5463, lng: 126.1147 },
  { name: 'Dinagat Islands', lat: 10.1280, lng: 125.6083 },
  { name: 'Tawi-Tawi', lat: 5.1340, lng: 119.9509 },
  { name: 'Sulu', lat: 6.0474, lng: 121.0028 },
  { name: 'Basilan', lat: 6.4221, lng: 121.9690 },
  // Regions
  { name: 'NCR', lat: 14.5995, lng: 120.9842 },
  { name: 'Metro Manila', lat: 14.5995, lng: 120.9842 },
  { name: 'CALABARZON', lat: 14.1008, lng: 121.0794 },
  { name: 'Central Luzon', lat: 15.4828, lng: 120.7120 },
  { name: 'Western Visayas', lat: 10.7202, lng: 122.5621 },
  { name: 'Central Visayas', lat: 10.3157, lng: 123.8854 },
  { name: 'Eastern Visayas', lat: 11.2543, lng: 124.9601 },
  { name: 'Northern Mindanao', lat: 8.4542, lng: 124.6319 },
  { name: 'SOCCSKSARGEN', lat: 6.2707, lng: 124.6857 },
  { name: 'CARAGA', lat: 8.9475, lng: 125.5406 },
  { name: 'ARMM', lat: 7.0000, lng: 124.2917 },
  { name: 'BARMM', lat: 7.0000, lng: 124.2917 },
  { name: 'Bangsamoro', lat: 7.0000, lng: 124.2917 },
  { name: 'CAR', lat: 16.4023, lng: 120.5960 },
  { name: 'Cordillera', lat: 16.4023, lng: 120.5960 },
  { name: 'Bicol', lat: 13.4210, lng: 123.4137 },
  { name: 'MIMAROPA', lat: 12.8797, lng: 121.0870 },
  { name: 'Visayas', lat: 10.7202, lng: 122.5621 },
  { name: 'Mindanao', lat: 7.1907, lng: 125.4553 },
  { name: 'Luzon', lat: 16.0000, lng: 121.0000 },
  // Well-known areas
  { name: 'Subic', lat: 14.8771, lng: 120.2833 },
  { name: 'Clark', lat: 15.1860, lng: 120.5463 },
  { name: 'Boracay', lat: 11.9674, lng: 121.9248 },
  { name: 'Siargao', lat: 9.8482, lng: 126.0458 },
  { name: 'Banaue', lat: 16.9145, lng: 121.0568 },
  { name: 'Sagada', lat: 17.0844, lng: 121.0059 },
  { name: 'Tagaytay', lat: 14.1153, lng: 120.9621 },
  { name: 'Antipolo', lat: 14.5886, lng: 121.1760 },
  { name: 'Calapan', lat: 13.4115, lng: 121.1803 },
  { name: 'Calamba', lat: 14.2117, lng: 121.1653 },
  { name: 'San Pablo', lat: 14.0685, lng: 121.3254 },
  { name: 'Biñan', lat: 14.3346, lng: 121.0845 },
  { name: 'Santa Rosa', lat: 14.3122, lng: 121.1115 },
  { name: 'Imus', lat: 14.4297, lng: 120.9367 },
  { name: 'Bacoor', lat: 14.4583, lng: 120.9333 },
  { name: 'Dasmariñas', lat: 14.3294, lng: 120.9367 },
  { name: 'General Trias', lat: 14.3833, lng: 120.8833 },
  { name: 'Meycauayan', lat: 14.7367, lng: 120.9606 },
  { name: 'San Jose del Monte', lat: 14.8139, lng: 121.0453 },
  { name: 'Malolos', lat: 14.8433, lng: 120.8114 },
  { name: 'Cainta', lat: 14.5800, lng: 121.1200 },
  { name: 'Taytay', lat: 14.5567, lng: 121.1328 },
  { name: 'Caloocan', lat: 14.6500, lng: 120.9667 },
  { name: 'CALAPAN', lat: 13.4115, lng: 121.1803 },
  { name: 'Roxas City', lat: 11.5850, lng: 122.7514 },
  { name: 'Kalibo', lat: 11.7072, lng: 122.3650 },
  { name: 'San Carlos', lat: 10.4925, lng: 123.4106 },
  { name: 'Mandaue', lat: 10.3236, lng: 123.9223 },
  { name: 'Lapu-Lapu', lat: 10.3103, lng: 123.9494 },
  { name: 'Talisay', lat: 10.2447, lng: 123.8494 },
];

// Build a sorted lookup (longer names first to match "Cagayan de Oro" before "Cagayan")
const PH_LOCATIONS_SORTED = [...PH_LOCATIONS].sort((a, b) => b.name.length - a.name.length);

/**
 * Extract a Philippine news dateline pattern from text.
 * Philippine news articles typically start with: "TOWN/CITY, Province —" or "CITY, Province —"
 * e.g. "BENITO SOLIVEN, Isabela —", "CALAPAN CITY, Oriental Mindoro —"
 * Returns the full dateline string for display, or null.
 */
function extractDateline(text) {
  if (!text) return null;
  // Match: UPPERCASE WORDS (1-4), comma, then a known location, then optional dash/emdash
  const datelinePattern = /\b([A-Z][A-Z .'-]+(?:\s+[A-Z][A-Z .'-]+){0,4}),\s*([A-Za-z\s]+?)(?:\s*[—–\-]|\s*$)/;
  const match = text.match(datelinePattern);
  if (!match) return null;

  const townPart = match[1].trim();
  const provincePart = match[2].trim();

  // Verify the province/city part exists in our gazetteer
  const gazetteerMatch = PH_LOCATIONS_SORTED.find(loc =>
    loc.name.toLowerCase() === provincePart.toLowerCase()
  );
  if (!gazetteerMatch) return null;

  // Format: "Town, Province" with title case for town
  const townFormatted = townPart.split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  return {
    displayName: `${townFormatted}, ${gazetteerMatch.name}`,
    lat: gazetteerMatch.lat,
    lng: gazetteerMatch.lng,
  };
}

/**
 * Extract the most relevant Philippine location from text (title + description).
 * Returns { name, lat, lng } or null if no location found.
 */
function extractLocationFromText(text) {
  if (!text) return null;

  // First, try to extract a specific dateline (e.g. "BENITO SOLIVEN, Isabela —")
  const dateline = extractDateline(text);
  if (dateline) {
    return { name: dateline.displayName, lat: dateline.lat, lng: dateline.lng };
  }

  // Fall back to gazetteer keyword matching
  for (const loc of PH_LOCATIONS_SORTED) {
    // Word-boundary-aware match to avoid partial matches (e.g. "Naga" in "Nagano")
    const pattern = new RegExp('\\b' + loc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (pattern.test(text)) {
      return { name: loc.name, lat: loc.lat, lng: loc.lng };
    }
  }
  return null;
}

/**
 * Enrich articles with geographic coordinates based on content analysis.
 */
function geotagArticles(articles) {
  return articles.map(article => {
    const searchText = `${article.title || ''} ${article.description || ''}`;
    const location = extractLocationFromText(searchText);
    if (location) {
      return { ...article, lat: location.lat, lng: location.lng, locationName: location.name };
    }
    return article;
  });
}

// Legitimate Philippine news RSS feeds — no API key required
const PH_RSS_FEEDS = [
  // Major national outlets
  { name: 'Inquirer', url: 'https://newsinfo.inquirer.net/feed', category: 'news' },
  { name: 'Rappler', url: 'https://www.rappler.com/feed/', category: 'news' },
  { name: 'PhilStar', url: 'https://www.philstar.com/rss/nation', category: 'nation' },
  { name: 'BusinessWorld', url: 'https://www.bworldonline.com/feed/', category: 'business' },
  { name: 'Manila Bulletin', url: 'https://mb.com.ph/feed', category: 'news' },
  { name: 'Manila Times', url: 'https://www.manilatimes.net/feed', category: 'news' },
  { name: 'GMA News', url: 'https://data.gmanetwork.com/gno/rss/news/feed.xml', category: 'news' },
  { name: 'ABS-CBN News', url: 'https://news.abs-cbn.com/rss', category: 'news' },
  { name: 'CNN Philippines', url: 'https://www.cnnphilippines.com/rss/news.xml', category: 'news' },
  { name: 'Philippine Star', url: 'https://www.philstar.com/rss/headlines', category: 'news' },
  // Business & Economy
  { name: 'BusinessMirror', url: 'https://businessmirror.com.ph/feed/', category: 'business' },
  { name: 'Philstar Business', url: 'https://www.philstar.com/rss/business', category: 'business' },
  // Regional & Investigative
  { name: 'SunStar', url: 'https://www.sunstar.com.ph/feeds', category: 'news' },
  { name: 'Philippine News Agency', url: 'https://www.pna.gov.ph/rss.xml', category: 'news' },
  { name: 'MindaNews', url: 'https://www.mindanews.com/feed/', category: 'news' },
  { name: 'Visayan Daily Star', url: 'https://visayandailystar.com/feed/', category: 'news' },
  { name: 'Panay News', url: 'https://www.panaynews.net/feed/', category: 'news' },
  { name: 'Tempo', url: 'https://tempo.com.ph/feed/', category: 'news' },
  { name: 'Daily Tribune', url: 'https://tribune.net.ph/feed/', category: 'news' },
  { name: 'The Freeman', url: 'https://www.philstar.com/rss/the-freeman', category: 'news' },
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

  // Geotag articles with coordinates based on content
  allArticles = geotagArticles(allArticles);

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

      const articles = geotagArticles(response.data.articles.map(article => ({
        source: article.source?.name,
        title: article.title,
        description: article.description,
        url: article.url,
        imageUrl: article.urlToImage,
        publishedAt: article.publishedAt,
        category: 'news',
      })));

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
