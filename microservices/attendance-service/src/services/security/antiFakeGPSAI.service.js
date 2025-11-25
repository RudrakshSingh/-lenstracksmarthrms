const movementPatternAnalyzer = require('./movementPatternAnalyzer.service');
const logger = require('../../config/logger');

/**
 * Anti-Fake GPS AI Engine
 * Aggregates all security signals and calculates suspicious score
 */
class AntiFakeGPSAIService {
  /**
   * Calculate suspicious score from all signals
   * @param {Object} signals - All security check signals
   * @returns {Object} Aggregated result
   */
  calculateSuspiciousScore(signals) {
    try {
      let totalSuspiciousScore = 0;
      const allViolations = [];
      
      // Aggregate scores from all checks
      if (signals.mockLocation) {
        totalSuspiciousScore += signals.mockLocation.suspiciousScore || 0;
        if (signals.mockLocation.violations) {
          allViolations.push(...signals.mockLocation.violations);
        }
      }
      
      if (signals.deviceSecurity) {
        totalSuspiciousScore += signals.deviceSecurity.suspiciousScore || 0;
        if (signals.deviceSecurity.violations) {
          allViolations.push(...signals.deviceSecurity.violations);
        }
      }
      
      if (signals.speed) {
        totalSuspiciousScore += signals.speed.suspiciousScore || 0;
        if (signals.speed.violations) {
          allViolations.push(...signals.speed.violations);
        }
      }
      
      if (signals.network) {
        totalSuspiciousScore += signals.network.suspiciousScore || 0;
        if (signals.network.violations) {
          allViolations.push(...signals.network.violations);
        }
      }
      
      if (signals.satellite) {
        totalSuspiciousScore += signals.satellite.suspiciousScore || 0;
        if (signals.satellite.violations) {
          allViolations.push(...signals.satellite.violations);
        }
      }
      
      if (signals.appState) {
        totalSuspiciousScore += signals.appState.suspiciousScore || 0;
        if (signals.appState.violations) {
          allViolations.push(...signals.appState.violations);
        }
      }
      
      if (signals.faceVerification) {
        totalSuspiciousScore += signals.faceVerification.suspiciousScore || 0;
        if (signals.faceVerification.violations) {
          allViolations.push(...signals.faceVerification.violations);
        }
      }
      
      if (signals.movementPattern) {
        totalSuspiciousScore += signals.movementPattern.suspiciousScore || 0;
        if (signals.movementPattern.violations) {
          allViolations.push(...signals.movementPattern.violations);
        }
      }
      
      // Cap score at 100
      const finalScore = Math.min(100, totalSuspiciousScore);
      
      // Determine action
      const action = this.determineAction(finalScore);
      
      return {
        suspiciousScore: finalScore,
        action: action.type,
        message: action.message,
        violations: allViolations,
        signals: signals,
        breakdown: {
          mockLocation: signals.mockLocation?.suspiciousScore || 0,
          deviceSecurity: signals.deviceSecurity?.suspiciousScore || 0,
          speed: signals.speed?.suspiciousScore || 0,
          network: signals.network?.suspiciousScore || 0,
          satellite: signals.satellite?.suspiciousScore || 0,
          appState: signals.appState?.suspiciousScore || 0,
          faceVerification: signals.faceVerification?.suspiciousScore || 0,
          movementPattern: signals.movementPattern?.suspiciousScore || 0
        }
      };
    } catch (error) {
      logger.error('Error calculating suspicious score', { error: error.message });
      return {
        suspiciousScore: 0,
        action: 'ALLOW',
        message: 'Error in AI analysis',
        violations: [],
        error: error.message
      };
    }
  }
  
  /**
   * Determine action based on suspicious score
   * @param {number} score - Suspicious score (0-100)
   * @returns {Object} Action details
   */
  determineAction(score) {
    if (score > 85) {
      return {
        type: 'BLOCK',
        message: 'Fake GPS detected - Check-in blocked'
      };
    } else if (score > 60) {
      return {
        type: 'FLAG',
        message: 'Suspicious activity detected - Requires review'
      };
    } else {
      return {
        type: 'ALLOW',
        message: 'Location verified'
      };
    }
  }
}

module.exports = new AntiFakeGPSAIService();

