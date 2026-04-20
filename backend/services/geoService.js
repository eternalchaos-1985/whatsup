const turf = require('@turf/turf');

/**
 * Create a circular buffer around a point.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radiusKm - Radius in kilometers
 * @returns {object} GeoJSON polygon
 */
function createRadiusBuffer(lat, lng, radiusKm) {
  const center = turf.point([lng, lat]);
  return turf.buffer(center, radiusKm, { units: 'kilometers' });
}

/**
 * Check if a point is within a radius of a center point.
 * @param {number} centerLat
 * @param {number} centerLng
 * @param {number} pointLat
 * @param {number} pointLng
 * @param {number} radiusKm
 * @returns {boolean}
 */
function isWithinRadius(centerLat, centerLng, pointLat, pointLng, radiusKm) {
  const center = turf.point([centerLng, centerLat]);
  const point = turf.point([pointLng, pointLat]);
  const distance = turf.distance(center, point, { units: 'kilometers' });
  return distance <= radiusKm;
}

/**
 * Filter an array of items by proximity to a center point.
 * Items must have `lat` and `lng` (or `latitude`/`longitude`) properties.
 */
function filterByRadius(items, centerLat, centerLng, radiusKm) {
  return items.filter(item => {
    const lat = item.lat ?? item.latitude;
    const lng = item.lng ?? item.longitude;
    if (lat == null || lng == null) return false;
    return isWithinRadius(centerLat, centerLng, lat, lng, radiusKm);
  });
}

/**
 * Calculate distance between two points in km.
 */
function getDistance(lat1, lng1, lat2, lng2) {
  const from = turf.point([lng1, lat1]);
  const to = turf.point([lng2, lat2]);
  return turf.distance(from, to, { units: 'kilometers' });
}

/**
 * Sort items by distance from a center point (closest first).
 */
function sortByDistance(items, centerLat, centerLng) {
  return items
    .map(item => {
      const lat = item.lat ?? item.latitude;
      const lng = item.lng ?? item.longitude;
      const distance = (lat != null && lng != null)
        ? getDistance(centerLat, centerLng, lat, lng)
        : Infinity;
      return { ...item, distance };
    })
    .sort((a, b) => a.distance - b.distance);
}

module.exports = {
  createRadiusBuffer,
  isWithinRadius,
  filterByRadius,
  getDistance,
  sortByDistance,
};
