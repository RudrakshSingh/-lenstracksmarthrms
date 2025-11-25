const logger = require('../../config/logger');

/**
 * Satellite Signal Validator Service
 * Validates GPS satellite signals
 */
class SatelliteValidatorService {
  /**
   * Minimum required satellite count
   */
  MIN_SATELLITES = 4;
  
  /**
   * Minimum average SNR (Signal-to-Noise Ratio)
   */
  MIN_AVERAGE_SNR = 20;
  
  /**
   * Validate satellite signals
   * @param {Object} satelliteInfo - Satellite information
   * @returns {Object} Validation result
   */
  validateSatelliteSignal(satelliteInfo) {
    try {
      const violations = [];
      let suspiciousScore = 0;
      
      // If satellite info not available (web browsers), skip validation
      if (!satelliteInfo || !satelliteInfo.available) {
        return {
          valid: true,
          violations: [],
          suspiciousScore: 0,
          passed: true,
          details: {
            note: 'Satellite info not available (web platform)',
            available: false
          }
        };
      }
      
      const { satelliteCount, averageSNR, satellites } = satelliteInfo;
      
      // Check 1: Minimum satellite count
      if (satelliteCount < this.MIN_SATELLITES) {
        violations.push({
          type: 'SATELLITE_INVALID',
          severity: 'HIGH',
          message: `Insufficient satellite count: ${satelliteCount} (minimum: ${this.MIN_SATELLITES})`,
          details: {
            satelliteCount: satelliteCount,
            minSatellites: this.MIN_SATELLITES
          }
        });
        suspiciousScore += 15;
      }
      
      // Check 2: All SNRs are zero (fake GPS)
      if (satellites && satellites.length > 0) {
        const allSNRZero = satellites.every(sat => sat.snr === 0 || !sat.snr);
        if (allSNRZero) {
          violations.push({
            type: 'SATELLITE_INVALID',
            severity: 'CRITICAL',
            message: 'All satellite SNRs are zero (fake GPS detected)',
            details: {
              satelliteCount: satelliteCount,
              satellites: satellites
            }
          });
          suspiciousScore += 30;
        }
      }
      
      // Check 3: Low average SNR
      if (averageSNR && averageSNR < this.MIN_AVERAGE_SNR) {
        violations.push({
          type: 'SATELLITE_INVALID',
          severity: 'MEDIUM',
          message: `Low signal strength: ${averageSNR} (minimum: ${this.MIN_AVERAGE_SNR})`,
          details: {
            averageSNR: averageSNR,
            minSNR: this.MIN_AVERAGE_SNR
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
          satelliteCount: satelliteCount,
          averageSNR: averageSNR,
          minSatellites: this.MIN_SATELLITES,
          minSNR: this.MIN_AVERAGE_SNR
        }
      };
    } catch (error) {
      logger.error('Error validating satellite signal', { error: error.message });
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

module.exports = new SatelliteValidatorService();

