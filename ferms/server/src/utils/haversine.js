// utils/haversine.js — Calculates great-circle distance in kilometres between two lat/lng coordinates
// Uses the Haversine formula with Earth radius = 6371 km (TASK W3-P-BE-1 requirement 1).

const EARTH_RADIUS_KM = 6371;

/**
 * distanceKm
 * Returns the great-circle distance in kilometres between two geographic points.
 *
 * @param {number} lat1  Latitude of point 1 (degrees)
 * @param {number} lon1  Longitude of point 1 (degrees)
 * @param {number} lat2  Latitude of point 2 (degrees)
 * @param {number} lon2  Longitude of point 2 (degrees)
 * @returns {number}     Distance in kilometres
 */
const distanceKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
};

module.exports = { distanceKm };
