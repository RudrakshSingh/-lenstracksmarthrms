const mockLocationDetector = require('./mockLocationDetector.service');
const speedValidator = require('./speedValidator.service');
const networkLocationValidator = require('./networkLocationValidator.service');
const satelliteValidator = require('./satelliteValidator.service');
const appStateValidator = require('./appStateValidator.service');
const faceVerification = require('./faceVerification.service');
const movementPatternAnalyzer = require('./movementPatternAnalyzer.service');
const antiFakeGPSAI = require('./antiFakeGPSAI.service');
const LocationViolation = require('../../models/LocationViolation.model');
const LocationHistory = require('../../models/LocationHistory.model');
const logger = require('../../config/logger');

/**
 * Main Security Service
 * Orchestrates all security checks
 */
class SecurityService {
  /**
   * Validate location with all security checks
   * @param {Object} locationData - Complete location data
   * @param {string} employeeId - Employee ID
   * @param {string} actionType - CLOCK_IN, CLOCK_OUT, LOCATION_UPDATE
   * @returns {Promise<Object>} Validation result
   */
  async validateLocation(locationData, employeeId, actionType = 'CLOCK_IN') {
    try {
      const {
        location,
        networkLocation,
        ipLocation,
        deviceSecurity,
        appState,
        satelliteInfo,
        selfie,
        timestamp
      } = locationData;
      
      // Run all security checks in parallel
      const checks = await Promise.allSettled([
        // Level 1: Mock Location Detection
        Promise.resolve(mockLocationDetector.detectMockLocation(deviceSecurity || {})),
        
        // Level 2: Device Security
        Promise.resolve(mockLocationDetector.checkDeviceSecurity(deviceSecurity || {})),
        
        // Level 3: Speed Validation
        speedValidator.validateSpeed(locationData, employeeId),
        
        // Level 4: Network Location Validation
        Promise.resolve(networkLocationValidator.validateNetworkLocation({
          gps: location,
          network: networkLocation,
          ip: ipLocation
        })),
        
        // Level 5: Satellite Validation
        Promise.resolve(satelliteValidator.validateSatelliteSignal(satelliteInfo)),
        
        // Level 6: App State Validation
        Promise.resolve(appStateValidator.validateAppState(appState)),
        
        // Level 7: Face Verification (if selfie provided)
        selfie ? faceVerification.verifyFace(
          selfie,
          employeeId,
          location,
          timestamp || Date.now()
        ) : Promise.resolve({ verified: true, passed: true, suspiciousScore: 0 }),
        
        // Level 8: Movement Pattern Analysis
        movementPatternAnalyzer.analyzeMovementPattern(employeeId, locationData)
      ]);
      
      // Extract results
      const signals = {
        mockLocation: this.extractResult(checks[0]),
        deviceSecurity: this.extractResult(checks[1]),
        speed: this.extractResult(checks[2]),
        network: this.extractResult(checks[3]),
        satellite: this.extractResult(checks[4]),
        appState: this.extractResult(checks[5]),
        faceVerification: this.extractResult(checks[6]),
        movementPattern: this.extractResult(checks[7])
      };
      
      // Calculate overall suspicious score using AI engine
      const aiResult = antiFakeGPSAI.calculateSuspiciousScore(signals);
      
      // Determine if location is valid
      const isValid = aiResult.action !== 'BLOCK';
      
      // Save location to history
      await this.saveLocationHistory(employeeId, locationData, actionType);
      
      // If violations detected, log them
      if (aiResult.violations.length > 0 || aiResult.suspiciousScore > 60) {
        await this.logViolation(employeeId, locationData, signals, aiResult, actionType);
      }
      
      return {
        valid: isValid,
        suspiciousScore: aiResult.suspiciousScore,
        action: aiResult.action,
        message: aiResult.message,
        securityChecks: {
          mockLocation: { passed: signals.mockLocation.passed },
          deviceSecurity: { passed: signals.deviceSecurity.passed },
          speed: { passed: signals.speed.passed },
          network: { passed: signals.network.passed },
          satellite: { passed: signals.satellite.passed },
          appState: { passed: signals.appState.passed },
          faceVerification: { passed: signals.faceVerification.passed },
          aiAnalysis: { passed: aiResult.action !== 'BLOCK' }
        },
        violations: aiResult.violations,
        breakdown: aiResult.breakdown
      };
    } catch (error) {
      logger.error('Error validating location', { error: error.message, employeeId });
      // On error, allow but flag
      return {
        valid: true,
        suspiciousScore: 10,
        action: 'FLAG',
        message: 'Security validation error - Allowing with flag',
        error: error.message
      };
    }
  }
  
  /**
   * Extract result from Promise.allSettled
   */
  extractResult(result) {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      logger.error('Security check failed', { error: result.reason });
      return {
        passed: true,
        suspiciousScore: 0,
        error: result.reason?.message
      };
    }
  }
  
  /**
   * Save location to history
   */
  async saveLocationHistory(employeeId, locationData, actionType) {
    try {
      const { location, networkLocation, ipLocation, satelliteInfo } = locationData;
      
      // Calculate distance from last location
      const distanceData = await LocationHistory.calculateDistanceFromLast(
        employeeId,
        location
      );
      
      const locationHistory = new LocationHistory({
        employee_id: employeeId,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          altitude: location.altitude,
          heading: location.heading,
          speed: location.speed
        },
        network_location: networkLocation ? {
          latitude: networkLocation.latitude,
          longitude: networkLocation.longitude,
          accuracy: networkLocation.accuracy,
          source: networkLocation.source
        } : null,
        ip_location: ipLocation ? {
          latitude: ipLocation.latitude,
          longitude: ipLocation.longitude,
          city: ipLocation.city,
          region: ipLocation.region,
          country: ipLocation.country,
          ip: ipLocation.ip
        } : null,
        satellite_info: satelliteInfo ? {
          satellite_count: satelliteInfo.satelliteCount,
          average_snr: satelliteInfo.averageSNR,
          available: satelliteInfo.available !== false
        } : null,
        distance_from_last: distanceData.distance,
        speed_from_last: distanceData.speed,
        time_from_last: distanceData.timeDiff,
        action_type: actionType,
        timestamp: locationData.timestamp || Date.now()
      });
      
      await locationHistory.save();
    } catch (error) {
      logger.error('Error saving location history', { error: error.message, employeeId });
      // Don't throw, just log
    }
  }
  
  /**
   * Log violation
   */
  async logViolation(employeeId, locationData, signals, aiResult, actionType) {
    try {
      const violation = new LocationViolation({
        employee_id: employeeId,
        violation_type: aiResult.violations.length === 1 
          ? aiResult.violations[0].type 
          : 'MULTIPLE_VIOLATIONS',
        suspicious_score: aiResult.suspiciousScore,
        action_taken: aiResult.action,
        location_data: {
          gps: locationData.location,
          network: locationData.networkLocation,
          ip: locationData.ipLocation,
          satellite_count: locationData.satelliteInfo?.satelliteCount,
          average_snr: locationData.satelliteInfo?.averageSNR
        },
        device_info: locationData.deviceSecurity || {},
        app_state: locationData.appState || {},
        security_checks: {
          mockLocation: signals.mockLocation,
          deviceSecurity: signals.deviceSecurity,
          speed: signals.speed,
          network: signals.network,
          satellite: signals.satellite,
          appState: signals.appState,
          faceVerification: signals.faceVerification,
          aiAnalysis: signals.movementPattern
        },
        violations: aiResult.violations,
        action_type: actionType
      });
      
      await violation.save();
      
      logger.warn('Location violation logged', {
        violationId: violation.violation_id,
        employeeId,
        suspiciousScore: aiResult.suspiciousScore,
        action: aiResult.action
      });
      
      return violation;
    } catch (error) {
      logger.error('Error logging violation', { error: error.message, employeeId });
      // Don't throw, just log
    }
  }
  
  /**
   * Get IP geolocation
   * @param {string} ip - IP address (optional, will use request IP if not provided)
   * @returns {Promise<Object>} IP geolocation data
   */
  async getIPGeolocation(ip = null) {
    try {
      // Use IP geolocation service
      // For now, return placeholder
      // TODO: Integrate with MaxMind, IPStack, or similar service
      
      // If IP not provided, you would get it from the request
      // For now, return mock data structure
      
      return {
        latitude: null,
        longitude: null,
        city: null,
        region: null,
        country: null,
        ip: ip,
        accuracy: 5000, // IP geolocation is less accurate
        source: 'ip_geolocation',
        note: 'IP geolocation service not configured'
      };
    } catch (error) {
      logger.error('Error getting IP geolocation', { error: error.message });
      return null;
    }
  }
}

module.exports = new SecurityService();

