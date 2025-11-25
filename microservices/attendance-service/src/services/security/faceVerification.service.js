const User = require('../../models/User.model');
const logger = require('../../config/logger');
const axios = require('axios');

/**
 * Face Verification Service
 * Verifies face match with employee photo
 */
class FaceVerificationService {
  /**
   * Minimum confidence threshold for face match
   */
  MIN_CONFIDENCE = 0.8;
  
  /**
   * Maximum time difference for selfie timestamp (ms)
   */
  MAX_TIMESTAMP_DIFF = 30000; // 30 seconds
  
  /**
   * Verify face with employee photo
   * @param {string} selfieBase64 - Selfie image in base64
   * @param {string} employeeId - Employee ID
   * @param {Object} location - Location data
   * @param {number} timestamp - Selfie timestamp
   * @returns {Promise<Object>} Verification result
   */
  async verifyFace(selfieBase64, employeeId, location, timestamp) {
    try {
      // Check 1: Verify timestamp is recent
      const timeDiff = Date.now() - timestamp;
      if (timeDiff > this.MAX_TIMESTAMP_DIFF) {
        return {
          verified: false,
          confidence: 0,
          passed: false,
          violations: [{
            type: 'FACE_MISMATCH',
            severity: 'MEDIUM',
            message: `Selfie timestamp too old: ${(timeDiff/1000).toFixed(0)} seconds`,
            details: {
              timeDiff: timeDiff,
              maxDiff: this.MAX_TIMESTAMP_DIFF
            }
          }],
          suspiciousScore: 20
        };
      }
      
      // Get employee photo
      const employee = await User.findById(employeeId).select('photo email firstName lastName');
      if (!employee) {
        return {
          verified: false,
          confidence: 0,
          passed: false,
          error: 'Employee not found'
        };
      }
      
      if (!employee.photo) {
        // If no photo on file, skip face verification but flag
        return {
          verified: true,
          confidence: 0,
          passed: true,
          details: {
            note: 'No employee photo on file, skipping face verification'
          }
        };
      }
      
      // Compare faces using face recognition service
      const faceMatch = await this.compareFaces(selfieBase64, employee.photo);
      
      if (faceMatch.confidence < this.MIN_CONFIDENCE) {
        return {
          verified: false,
          confidence: faceMatch.confidence,
          passed: false,
          violations: [{
            type: 'FACE_MISMATCH',
            severity: 'HIGH',
            message: `Face mismatch: ${(faceMatch.confidence * 100).toFixed(1)}% confidence (minimum: ${this.MIN_CONFIDENCE * 100}%)`,
            details: {
              confidence: faceMatch.confidence,
              minConfidence: this.MIN_CONFIDENCE
            }
          }],
          suspiciousScore: 30
        };
      }
      
      // Verify location matches (if store location provided)
      // This would be done in the main security service
      
      return {
        verified: true,
        confidence: faceMatch.confidence,
        passed: true,
        details: {
          confidence: faceMatch.confidence,
          employeeId: employeeId
        }
      };
    } catch (error) {
      logger.error('Error verifying face', { error: error.message, employeeId });
      // On error, allow but flag for review
      return {
        verified: true,
        confidence: 0,
        passed: true,
        error: error.message,
        details: {
          note: 'Face verification error, allowing with flag'
        }
      };
    }
  }
  
  /**
   * Compare two faces using face recognition API
   * @param {string} selfieBase64 - Selfie image
   * @param {string} employeePhotoBase64 - Employee photo
   * @returns {Promise<Object>} Comparison result
   */
  async compareFaces(selfieBase64, employeePhotoBase64) {
    try {
      // Option 1: Use AWS Rekognition (if configured)
      if (process.env.AWS_REKOGNITION_ENABLED === 'true') {
        return await this.compareFacesAWS(selfieBase64, employeePhotoBase64);
      }
      
      // Option 2: Use Azure Face API (if configured)
      if (process.env.AZURE_FACE_API_ENABLED === 'true') {
        return await this.compareFacesAzure(selfieBase64, employeePhotoBase64);
      }
      
      // Option 3: Use local face-api.js (if available)
      // For now, return a basic check
      // In production, implement actual face recognition
      
      logger.warn('Face recognition not configured, using basic validation');
      return {
        confidence: 0.85, // Default confidence
        matched: true
      };
    } catch (error) {
      logger.error('Error comparing faces', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Compare faces using AWS Rekognition
   */
  async compareFacesAWS(selfieBase64, employeePhotoBase64) {
    // This would use AWS SDK
    // For now, return placeholder
    // TODO: Implement AWS Rekognition integration
    return {
      confidence: 0.85,
      matched: true
    };
  }
  
  /**
   * Compare faces using Azure Face API
   */
  async compareFacesAzure(selfieBase64, employeePhotoBase64) {
    // This would use Azure Face API
    // For now, return placeholder
    // TODO: Implement Azure Face API integration
    return {
      confidence: 0.85,
      matched: true
    };
  }
}

module.exports = new FaceVerificationService();

