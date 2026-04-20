const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 900 }); // 15-minute cache

async function getLocalEvents(lat, lng, radiusKm = 10) {
  const cacheKey = `events-${lat}-${lng}-${radiusKm}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    // Eventbrite API integration
    const response = await axios.get('https://www.eventbriteapi.com/v3/events/search/', {
      params: {
        'location.latitude': lat,
        'location.longitude': lng,
        'location.within': `${radiusKm}km`,
        expand: 'venue',
      },
      headers: {
        Authorization: `Bearer ${process.env.EVENTBRITE_API_KEY}`,
      },
      timeout: 10000,
    });

    const events = response.data.events.map(event => ({
      id: event.id,
      name: event.name?.text,
      description: event.description?.text?.substring(0, 200),
      url: event.url,
      startDate: event.start?.local,
      endDate: event.end?.local,
      venue: event.venue ? {
        name: event.venue.name,
        address: event.venue.address?.localized_address_display,
        lat: event.venue.latitude,
        lng: event.venue.longitude,
      } : null,
      category: 'event',
    }));

    cache.set(cacheKey, events);
    return events;
  } catch (error) {
    console.error('Error fetching events:', error.message);
    return [];
  }
}

async function getLGUAnnouncements(municipality) {
  const cacheKey = `lgu-${municipality || 'all'}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Placeholder for LGU RSS feed parsing
  // In production, parse RSS feeds from LGU Facebook pages or official websites
  const announcements = [];
  cache.set(cacheKey, announcements);
  return announcements;
}

// Emergency hotlines for the Philippines
const EMERGENCY_HOTLINES = {
  ndrrmc: { name: 'NDRRMC', number: '(02) 8911-5061', category: 'disaster' },
  redCross: { name: 'Philippine Red Cross', number: '143', category: 'emergency' },
  pnp: { name: 'PNP Emergency', number: '117', category: 'police' },
  bfp: { name: 'Bureau of Fire Protection', number: '(02) 8426-0219', category: 'fire' },
  doh: { name: 'DOH Hotline', number: '(02) 8651-7800', category: 'health' },
  mentalHealth: { name: 'NCMH Crisis Hotline', number: '0917-899-8727', category: 'health' },
  childProtection: { name: 'DSWD', number: '(02) 8931-8101', category: 'social' },
  coastGuard: { name: 'Philippine Coast Guard', number: '(02) 8527-8481', category: 'maritime' },
  mmda: { name: 'MMDA', number: '136', category: 'traffic' },
};

function getEmergencyHotlines(category) {
  if (!category) return Object.values(EMERGENCY_HOTLINES);
  return Object.values(EMERGENCY_HOTLINES).filter(h => h.category === category);
}

module.exports = { getLocalEvents, getLGUAnnouncements, getEmergencyHotlines, EMERGENCY_HOTLINES };
