const logger = require('../../config/logger');

/**
 * App State Validator Service
 * Validates app state and interaction
 */
class AppStateValidatorService {
  /**
   * Maximum time since last interaction (ms)
   */
  MAX_INACTIVE_TIME = 30000; // 30 seconds
  
  /**
   * Maximum time with screen off (ms)
   */
  MAX_SCREEN_OFF_TIME = 15000; // 15 seconds
  
  /**
   * Validate app state
   * @param {Object} appState - App state data
   * @returns {Object} Validation result
   */
  validateAppState(appState) {
    try {
      const violations = [];
      let suspiciousScore = 0;
      
      if (!appState) {
        // If app state not provided, allow but flag
        return {
          valid: true,
          violations: [],
          suspiciousScore: 5,
          passed: true,
          details: {
            note: 'App state not provided'
          }
        };
      }
      
      const { isActive, isOnline, lastInteraction, screenOn } = appState;
      const now = Date.now();
      const timeSinceInteraction = lastInteraction ? (now - lastInteraction) : 0;
      
      // Check 1: App is not active
      if (isActive === false) {
        violations.push({
          type: 'APP_STATE_INVALID',
          severity: 'MEDIUM',
          message: 'App is not in foreground',
          details: {
            isActive: false
          }
        });
        suspiciousScore += 15;
      }
      
      // Check 2: Device is offline
      if (isOnline === false) {
        violations.push({
          type: 'APP_STATE_INVALID',
          severity: 'LOW',
          message: 'Device is offline',
          details: {
            isOnline: false
          }
        });
        suspiciousScore += 5;
      }
      
      // Check 3: Too long since last interaction
      if (timeSinceInteraction > this.MAX_INACTIVE_TIME) {
        violations.push({
          type: 'APP_STATE_INVALID',
          severity: 'MEDIUM',
          message: `No interaction for ${(timeSinceInteraction/1000).toFixed(0)} seconds`,
          details: {
            timeSinceInteraction: timeSinceInteraction,
            maxInactiveTime: this.MAX_INACTIVE_TIME
          }
        });
        suspiciousScore += 10;
      }
      
      // Check 4: Screen off for too long
      if (screenOn === false && timeSinceInteraction > this.MAX_SCREEN_OFF_TIME) {
        violations.push({
          type: 'APP_STATE_INVALID',
          severity: 'MEDIUM',
          message: `Screen off for ${(timeSinceInteraction/1000).toFixed(0)} seconds`,
          details: {
            screenOn: false,
            timeSinceInteraction: timeSinceInteraction
          }
        });
        suspiciousScore += 10;
      }
      
      return {
        valid: violations.length === 0,
        violations,
        suspiciousScore: Math.min(100, suspiciousScore),
        passed: violations.length === 0,
        details: {
          isActive: isActive,
          isOnline: isOnline,
          screenOn: screenOn,
          timeSinceInteraction: timeSinceInteraction
        }
      };
    } catch (error) {
      logger.error('Error validating app state', { error: error.message });
      return {
        valid: true,
        violations: [],
        suspiciousScore: 0,
        passed: true,
        error: error.message
      };
    }
  }
}

module.exports = new AppStateValidatorService();

