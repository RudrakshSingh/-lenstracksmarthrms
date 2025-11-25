const logger = require('../../config/logger');

/**
 * Mock Location Detector Service
 * Detects mock location enabled on device
 */
class MockLocationDetectorService {
  /**
   * Check if mock location is enabled
   * @param {Object} deviceSecurity - Device security data from frontend
   * @returns {Object} Detection result
   */
  detectMockLocation(deviceSecurity) {
    try {
      const violations = [];
      let suspiciousScore = 0;
      
      // Check 1: Mock location enabled flag
      if (deviceSecurity.mockLocationEnabled === true) {
        violations.push({
          type: 'MOCK_LOCATION',
          severity: 'CRITICAL',
          message: 'Mock location enabled on device',
          details: {
            source: 'device_flag',
            detected: true
          }
        });
        suspiciousScore += 100; // Immediate block
      }
      
      // Check 2: Developer mode with mock location app
      if (deviceSecurity.developerMode === true && deviceSecurity.mockLocationApp) {
        violations.push({
          type: 'MOCK_LOCATION',
          severity: 'CRITICAL',
          message: 'Mock location app detected in developer options',
          details: {
            source: 'developer_options',
            mockLocationApp: deviceSecurity.mockLocationApp
          }
        });
        suspiciousScore += 100; // Immediate block
      }
      
      // Check 3: Fake GPS apps installed
      if (deviceSecurity.fakeGPSApps && deviceSecurity.fakeGPSApps.length > 0) {
        violations.push({
          type: 'FAKE_GPS_APP',
          severity: 'CRITICAL',
          message: `Fake GPS apps detected: ${deviceSecurity.fakeGPSApps.join(', ')}`,
          details: {
            source: 'app_scan',
            detectedApps: deviceSecurity.fakeGPSApps
          }
        });
        suspiciousScore += 100; // Immediate block
      }
      
      return {
        detected: violations.length > 0,
        violations,
        suspiciousScore: Math.min(100, suspiciousScore),
        passed: violations.length === 0,
        details: {
          mockLocationEnabled: deviceSecurity.mockLocationEnabled || false,
          developerMode: deviceSecurity.developerMode || false,
          fakeGPSApps: deviceSecurity.fakeGPSApps || []
        }
      };
    } catch (error) {
      logger.error('Error detecting mock location', { error: error.message });
      // On error, allow but flag for review
      return {
        detected: false,
        violations: [],
        suspiciousScore: 0,
        passed: true,
        error: error.message
      };
    }
  }
  
  /**
   * Check device security (root/jailbreak)
   * @param {Object} deviceSecurity - Device security data
   * @returns {Object} Detection result
   */
  checkDeviceSecurity(deviceSecurity) {
    try {
      const violations = [];
      let suspiciousScore = 0;
      
      // Check for rooted device (Android)
      if (deviceSecurity.isRooted === true) {
        violations.push({
          type: 'DEVICE_ROOTED',
          severity: 'CRITICAL',
          message: 'Device is rooted',
          details: {
            platform: deviceSecurity.platform,
            isRooted: true
          }
        });
        suspiciousScore += 100; // Immediate block
      }
      
      // Check for jailbroken device (iOS)
      if (deviceSecurity.isJailbroken === true) {
        violations.push({
          type: 'DEVICE_ROOTED',
          severity: 'CRITICAL',
          message: 'Device is jailbroken',
          details: {
            platform: deviceSecurity.platform,
            isJailbroken: true
          }
        });
        suspiciousScore += 100; // Immediate block
      }
      
      return {
        detected: violations.length > 0,
        violations,
        suspiciousScore: Math.min(100, suspiciousScore),
        passed: violations.length === 0,
        details: {
          isRooted: deviceSecurity.isRooted || false,
          isJailbroken: deviceSecurity.isJailbroken || false,
          platform: deviceSecurity.platform
        }
      };
    } catch (error) {
      logger.error('Error checking device security', { error: error.message });
      return {
        detected: false,
        violations: [],
        suspiciousScore: 0,
        passed: true,
        error: error.message
      };
    }
  }
}

module.exports = new MockLocationDetectorService();

