const logger = require('../config/logger');

/**
 * Extract coordinates from Google Maps URL
 * Supports multiple URL formats:
 * 1. https://maps.google.com/?q=18.9250,72.8258
 * 2. https://www.google.com/maps/@18.9250,72.8258,15z
 * 3. https://goo.gl/maps/ABC123 (shortened - returns null, needs expansion)
 * 4. https://www.google.com/maps/place/.../@18.9250,72.8258,17z
 * 
 * @param {string} url - Google Maps URL
 * @returns {{latitude: number, longitude: number} | null}
 */
function extractCoordinatesFromGoogleMapsUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    // Pattern 1: ?q=lat,lng
    const pattern1 = /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    const match1 = url.match(pattern1);
    if (match1) {
      const latitude = parseFloat(match1[1]);
      const longitude = parseFloat(match1[2]);
      if (isValidCoordinates(latitude, longitude)) {
        logger.info('Coordinates extracted using pattern ?q=', { latitude, longitude });
        return { latitude, longitude };
      }
    }

    // Pattern 2: @lat,lng,zoom
    const pattern2 = /@(-?\d+\.?\d*),(-?\d+\.?\d*),\d+z/;
    const match2 = url.match(pattern2);
    if (match2) {
      const latitude = parseFloat(match2[1]);
      const longitude = parseFloat(match2[2]);
      if (isValidCoordinates(latitude, longitude)) {
        logger.info('Coordinates extracted using pattern @lat,lng,zoom', { latitude, longitude });
        return { latitude, longitude };
      }
    }

    // Pattern 3: @lat,lng (without zoom)
    const pattern3 = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    const match3 = url.match(pattern3);
    if (match3) {
      const latitude = parseFloat(match3[1]);
      const longitude = parseFloat(match3[2]);
      if (isValidCoordinates(latitude, longitude)) {
        logger.info('Coordinates extracted using pattern @lat,lng', { latitude, longitude });
        return { latitude, longitude };
      }
    }

    // Pattern 4: ll=lat,lng
    const pattern4 = /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    const match4 = url.match(pattern4);
    if (match4) {
      const latitude = parseFloat(match4[1]);
      const longitude = parseFloat(match4[2]);
      if (isValidCoordinates(latitude, longitude)) {
        logger.info('Coordinates extracted using pattern ll=', { latitude, longitude });
        return { latitude, longitude };
      }
    }

    logger.warn('Could not extract coordinates from Google Maps URL', { url });
    return null;
  } catch (error) {
    logger.error('Error extracting coordinates from Google Maps URL', { 
      error: error.message, 
      url 
    });
    return null;
  }
}

/**
 * Validate if coordinates are within valid range
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {boolean}
 */
function isValidCoordinates(latitude, longitude) {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Generate Google Maps URL from coordinates
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {string}
 */
function generateGoogleMapsUrl(latitude, longitude) {
  if (!isValidCoordinates(latitude, longitude)) {
    return null;
  }
  return `https://maps.google.com/?q=${latitude},${longitude}`;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

/**
 * Verify if employee location is within store geofence
 * @param {Object} employeeLocation - {latitude, longitude}
 * @param {Object} storeLocation - {latitude, longitude}
 * @param {number} geofenceRadius - Radius in meters
 * @returns {{withinGeofence: boolean, distance: number}}
 */
function verifyGeofence(employeeLocation, storeLocation, geofenceRadius) {
  const distance = calculateDistance(
    employeeLocation.latitude,
    employeeLocation.longitude,
    storeLocation.latitude,
    storeLocation.longitude
  );

  return {
    withinGeofence: distance <= geofenceRadius,
    distance: Math.round(distance * 10) / 10, // Round to 1 decimal
    excess: distance > geofenceRadius ? Math.round((distance - geofenceRadius) * 10) / 10 : 0
  };
}

module.exports = {
  extractCoordinatesFromGoogleMapsUrl,
  isValidCoordinates,
  generateGoogleMapsUrl,
  calculateDistance,
  verifyGeofence
};

