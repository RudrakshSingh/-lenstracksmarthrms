const logger = require('../../config/logger');

/**
 * Network Location Validator Service
 * Validates location by comparing GPS with network sources
 */
class NetworkLocationValidatorService {
  /**
   * Maximum allowed difference between sources (km)
   */
  MAX_DIFFERENCE = 0.3; // 300 meters
  
  /**
   * Validate location consistency across multiple sources
   * @param {Object} locationData - Location data with GPS, network, IP
   * @returns {Object} Validation result
   */
  validateNetworkLocation(locationData) {
    try {
      const violations = [];
      let suspiciousScore = 0;
      
      const { gps, network, ip } = locationData;
      
      if (!gps || !gps.latitude || !gps.longitude) {
        return {
          valid: false,
          violations: [{
            type: 'NETWORK_MISMATCH',
            severity: 'HIGH',
            message: 'GPS location not provided'
          }],
          suspiciousScore: 50,
          passed: false
        };
      }
      
      // Check 1: GPS vs Network Location
      if (network && network.latitude && network.longitude) {
        const gpsNetworkDistance = this.calculateDistance(
          gps.latitude,
          gps.longitude,
          network.latitude,
          network.longitude
        );
        
        if (gpsNetworkDistance > this.MAX_DIFFERENCE) {
          violations.push({
            type: 'NETWORK_MISMATCH',
            severity: 'HIGH',
            message: `GPS and network location mismatch: ${(gpsNetworkDistance * 1000).toFixed(0)} meters`,
            details: {
              distance: gpsNetworkDistance,
              maxDifference: this.MAX_DIFFERENCE,
              gpsLocation: { lat: gps.latitude, lon: gps.longitude },
              networkLocation: { lat: network.latitude, lon: network.longitude }
            }
          });
          suspiciousScore += 25;
        }
      }
      
      // Check 2: GPS vs IP Location
      if (ip && ip.latitude && ip.longitude) {
        const gpsIPDistance = this.calculateDistance(
          gps.latitude,
          gps.longitude,
          ip.latitude,
          ip.longitude
        );
        
        // IP geolocation is less accurate, allow larger difference (5km)
        const maxIPDifference = 5; // 5 km for IP
        
        if (gpsIPDistance > maxIPDifference) {
          violations.push({
            type: 'NETWORK_MISMATCH',
            severity: 'MEDIUM',
            message: `GPS and IP location mismatch: ${gpsIPDistance.toFixed(2)} km`,
            details: {
              distance: gpsIPDistance,
              maxDifference: maxIPDifference,
              gpsLocation: { lat: gps.latitude, lon: gps.longitude },
              ipLocation: { lat: ip.latitude, lon: ip.longitude }
            }
          });
          suspiciousScore += 15;
        }
      }
      
      // Check 3: Network vs IP Location
      if (network && network.latitude && network.longitude && 
          ip && ip.latitude && ip.longitude) {
        const networkIPDistance = this.calculateDistance(
          network.latitude,
          network.longitude,
          ip.latitude,
          ip.longitude
        );
        
        if (networkIPDistance > this.MAX_DIFFERENCE) {
          violations.push({
            type: 'NETWORK_MISMATCH',
            severity: 'MEDIUM',
            message: `Network and IP location mismatch: ${(networkIPDistance * 1000).toFixed(0)} meters`,
            details: {
              distance: networkIPDistance,
              maxDifference: this.MAX_DIFFERENCE
            }
          });
          suspiciousScore += 10;
        }
      }
      
      return {
        valid: violations.length === 0,
        violations,
        suspiciousScore: Math.min(100, suspiciousScore),
        passed: violations.length === 0,
        details: {
          gpsNetworkDistance: network ? this.calculateDistance(
            gps.latitude, gps.longitude,
            network.latitude, network.longitude
          ) : null,
          gpsIPDistance: ip ? this.calculateDistance(
            gps.latitude, gps.longitude,
            ip.latitude, ip.longitude
          ) : null
        }
      };
    } catch (error) {
      logger.error('Error validating network location', { error: error.message });
      return {
        valid: true,
        violations: [],
        suspiciousScore: 0,
        passed: true,
        error: error.message
      };
    }
  }
  
  /**
   * Calculate distance between two points (Haversine formula)
   * @param {number} lat1 - Latitude 1
   * @param {number} lon1 - Longitude 1
   * @param {number} lat2 - Latitude 2
   * @param {number} lon2 - Longitude 2
   * @returns {number} Distance in km
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }
}

module.exports = new NetworkLocationValidatorService();

