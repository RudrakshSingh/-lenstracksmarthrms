const LocationHistory = require('../../models/LocationHistory.model');
const logger = require('../../config/logger');

/**
 * Speed Validator Service
 * Validates speed and detects impossible movements
 */
class SpeedValidatorService {
  /**
   * Maximum realistic speed in km/h
   */
  MAX_SPEED = 500; // km/h (310 mph)
  
  /**
   * Maximum distance for teleportation detection (km)
   */
  MAX_TELEPORT_DISTANCE = 100; // km
  
  /**
   * Maximum time for teleportation detection (ms)
   */
  MAX_TELEPORT_TIME = 60000; // 1 minute
  
  /**
   * Validate speed from location data
   * @param {Object} currentLocation - Current location data
   * @param {string} employeeId - Employee ID
   * @returns {Promise<Object>} Validation result
   */
  async validateSpeed(currentLocation, employeeId) {
    try {
      const violations = [];
      let suspiciousScore = 0;
      
      // Get last location from history
      const distanceData = await LocationHistory.calculateDistanceFromLast(
        employeeId,
        currentLocation.location || currentLocation
      );
      
      const { distance, speed, timeDiff } = distanceData;
      
      // Check 1: Impossible speed
      if (speed > this.MAX_SPEED) {
        violations.push({
          type: 'SPEED_ANOMALY',
          severity: 'HIGH',
          message: `Impossible speed detected: ${speed.toFixed(2)} km/h`,
          details: {
            speed: speed,
            maxSpeed: this.MAX_SPEED,
            distance: distance,
            timeDiff: timeDiff
          }
        });
        suspiciousScore += 30;
      }
      
      // Check 2: Teleportation detection
      if (distance > this.MAX_TELEPORT_DISTANCE && timeDiff < this.MAX_TELEPORT_TIME) {
        violations.push({
          type: 'SPEED_ANOMALY',
          severity: 'HIGH',
          message: `Teleportation detected: ${distance.toFixed(2)} km in ${(timeDiff/1000).toFixed(0)} seconds`,
          details: {
            distance: distance,
            timeDiff: timeDiff,
            speed: speed
          }
        });
        suspiciousScore += 30;
      }
      
      // Check 3: Speed from GPS data (if available)
      if (currentLocation.location && currentLocation.location.speed) {
        const gpsSpeed = currentLocation.location.speed * 3.6; // Convert m/s to km/h
        if (gpsSpeed > this.MAX_SPEED) {
          violations.push({
            type: 'SPEED_ANOMALY',
            severity: 'MEDIUM',
            message: `High GPS speed: ${gpsSpeed.toFixed(2)} km/h`,
            details: {
              gpsSpeed: gpsSpeed,
              calculatedSpeed: speed
            }
          });
          suspiciousScore += 20;
        }
      }
      
      return {
        valid: violations.length === 0,
        violations,
        suspiciousScore: Math.min(100, suspiciousScore),
        passed: violations.length === 0,
        details: {
          distance: distance,
          speed: speed,
          timeDiff: timeDiff,
          maxSpeed: this.MAX_SPEED
        }
      };
    } catch (error) {
      logger.error('Error validating speed', { error: error.message, employeeId });
      // On error, allow but flag for review
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

module.exports = new SpeedValidatorService();

