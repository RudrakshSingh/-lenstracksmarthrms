const LocationHistory = require('../../models/LocationHistory.model');
const logger = require('../../config/logger');

/**
 * Movement Pattern Analyzer Service
 * Analyzes movement patterns to detect fake GPS
 */
class MovementPatternAnalyzerService {
  /**
   * Analyze movement pattern from location history
   * @param {string} employeeId - Employee ID
   * @param {Object} currentLocation - Current location
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeMovementPattern(employeeId, currentLocation) {
    try {
      // Get location history (last 20 locations)
      const locationHistory = await LocationHistory.find({
        employee_id: employeeId
      })
      .sort({ timestamp: -1 })
      .limit(20)
      .lean();
      
      if (locationHistory.length < 3) {
        // Not enough data for pattern analysis
        return {
          detected: false,
          suspiciousScore: 0,
          passed: true,
          details: {
            note: 'Insufficient location history for pattern analysis',
            historyCount: locationHistory.length
          }
        };
      }
      
      // Add current location to history for analysis
      const locations = [
        {
          latitude: currentLocation.location?.latitude || currentLocation.latitude,
          longitude: currentLocation.location?.longitude || currentLocation.longitude,
          timestamp: Date.now(),
          accuracy: currentLocation.location?.accuracy || currentLocation.accuracy
        },
        ...locationHistory.map(loc => ({
          latitude: loc.location.latitude,
          longitude: loc.location.longitude,
          timestamp: loc.timestamp.getTime(),
          accuracy: loc.location.accuracy
        }))
      ].reverse(); // Oldest first
      
      const patterns = {
        straightLine: this.detectStraightLine(locations),
        teleportation: this.detectTeleportation(locations),
        acceleration: this.detectAccelerationPattern(locations),
        gpsDrift: this.detectGPSDrift(locations)
      };
      
      // Calculate suspicious score
      let suspiciousScore = 0;
      const violations = [];
      
      if (patterns.straightLine.detected) {
        suspiciousScore += 20;
        violations.push({
          type: 'AI_ANOMALY',
          severity: 'MEDIUM',
          message: 'Unnatural straight-line movement detected',
          details: patterns.straightLine
        });
      }
      
      if (patterns.teleportation.detected) {
        suspiciousScore += 30;
        violations.push({
          type: 'AI_ANOMALY',
          severity: 'HIGH',
          message: 'Teleportation detected in movement pattern',
          details: patterns.teleportation
        });
      }
      
      if (!patterns.acceleration.detected) {
        suspiciousScore += 15;
        violations.push({
          type: 'AI_ANOMALY',
          severity: 'MEDIUM',
          message: 'No natural acceleration pattern detected',
          details: patterns.acceleration
        });
      }
      
      if (!patterns.gpsDrift.detected) {
        suspiciousScore += 10;
        violations.push({
          type: 'AI_ANOMALY',
          severity: 'LOW',
          message: 'GPS accuracy too consistent (no natural drift)',
          details: patterns.gpsDrift
        });
      }
      
      return {
        detected: suspiciousScore > 0,
        suspiciousScore: Math.min(100, suspiciousScore),
        passed: suspiciousScore < 60,
        violations,
        patterns
      };
    } catch (error) {
      logger.error('Error analyzing movement pattern', { error: error.message, employeeId });
      return {
        detected: false,
        suspiciousScore: 0,
        passed: true,
        error: error.message
      };
    }
  }
  
  /**
   * Detect straight-line movement (unnatural)
   * @param {Array} locations - Location history
   * @returns {Object} Detection result
   */
  detectStraightLine(locations) {
    if (locations.length < 3) {
      return { detected: false };
    }
    
    const bearings = [];
    for (let i = 1; i < locations.length; i++) {
      const bearing = this.calculateBearing(
        locations[i-1].latitude,
        locations[i-1].longitude,
        locations[i].latitude,
        locations[i].longitude
      );
      bearings.push(bearing);
    }
    
    // Calculate variance in bearings
    const variance = this.calculateVariance(bearings);
    
    // Low variance = straight line (unnatural)
    return {
      detected: variance < 5,
      variance: variance,
      bearings: bearings
    };
  }
  
  /**
   * Detect teleportation (sudden large jumps)
   * @param {Array} locations - Location history
   * @returns {Object} Detection result
   */
  detectTeleportation(locations) {
    if (locations.length < 2) {
      return { detected: false };
    }
    
    for (let i = 1; i < locations.length; i++) {
      const distance = this.calculateDistance(
        locations[i-1].latitude,
        locations[i-1].longitude,
        locations[i].latitude,
        locations[i].longitude
      );
      const timeDiff = locations[i].timestamp - locations[i-1].timestamp;
      
      // More than 10km in less than 10 seconds = teleportation
      if (distance > 10 && timeDiff < 10000) {
        return {
          detected: true,
          distance: distance,
          timeDiff: timeDiff,
          from: { lat: locations[i-1].latitude, lon: locations[i-1].longitude },
          to: { lat: locations[i].latitude, lon: locations[i].longitude }
        };
      }
    }
    
    return { detected: false };
  }
  
  /**
   * Detect acceleration pattern (real movement has variation)
   * @param {Array} locations - Location history
   * @returns {Object} Detection result
   */
  detectAccelerationPattern(locations) {
    if (locations.length < 3) {
      return { detected: false };
    }
    
    const speeds = [];
    for (let i = 1; i < locations.length; i++) {
      const distance = this.calculateDistance(
        locations[i-1].latitude,
        locations[i-1].longitude,
        locations[i].latitude,
        locations[i].longitude
      );
      const timeDiff = (locations[i].timestamp - locations[i-1].timestamp) / (1000 * 60 * 60); // hours
      const speed = timeDiff > 0 ? distance / timeDiff : 0;
      speeds.push(speed);
    }
    
    // Check for speed variation
    const speedVariance = this.calculateVariance(speeds);
    
    // Real movement has variation, fake GPS often has constant speed
    return {
      detected: speedVariance > 5,
      variance: speedVariance,
      speeds: speeds
    };
  }
  
  /**
   * Detect GPS drift (real GPS has small random errors)
   * @param {Array} locations - Location history
   * @returns {Object} Detection result
   */
  detectGPSDrift(locations) {
    if (locations.length < 3) {
      return { detected: false };
    }
    
    const accuracies = locations
      .map(loc => loc.accuracy)
      .filter(acc => acc !== null && acc !== undefined);
    
    if (accuracies.length < 3) {
      return { detected: false };
    }
    
    // Real GPS has varying accuracy
    const accuracyVariance = this.calculateVariance(accuracies);
    
    return {
      detected: accuracyVariance > 1,
      variance: accuracyVariance,
      accuracies: accuracies
    };
  }
  
  /**
   * Calculate bearing between two points
   */
  calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = this.toRad(lon2 - lon1);
    const lat1Rad = this.toRad(lat1);
    const lat2Rad = this.toRad(lat2);
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    
    const bearing = Math.atan2(y, x);
    return (bearing * 180 / Math.PI + 360) % 360;
  }
  
  /**
   * Calculate distance between two points (Haversine)
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
  
  /**
   * Calculate variance of array
   */
  calculateVariance(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }
  
  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }
}

module.exports = new MovementPatternAnalyzerService();

