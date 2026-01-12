const axios = require('axios');
const logger = require('../config/logger');

const REALTIME_SERVICE_URL = process.env.REALTIME_SERVICE_URL || 'http://realtime-service:3021';

/**
 * Realtime Client
 * Helper functions to emit real-time events to frontend
 */
class RealtimeClient {
  /**
   * Send notification to user
   * @param {string} userId - User ID
   * @param {object} notification - Notification data
   */
  async sendNotification(userId, notification) {
    try {
      await axios.post(`${REALTIME_SERVICE_URL}/api/events/notification`, {
        userId,
        notification: {
          ...notification,
          timestamp: notification.timestamp || new Date().toISOString()
        }
      }, {
        timeout: 5000
      });

      logger.info('Notification sent via realtime service', { userId, notification });
    } catch (error) {
      // Don't throw error - realtime is optional
      logger.warn('Failed to send realtime notification', {
        userId,
        error: error.message
      });
    }
  }

  /**
   * Broadcast attendance update
   * @param {string} tenantId - Tenant ID
   * @param {object} attendanceData - Attendance data
   */
  async broadcastAttendance(tenantId, attendanceData) {
    try {
      await axios.post(`${REALTIME_SERVICE_URL}/api/events/attendance`, {
        tenantId,
        attendanceData
      }, {
        timeout: 5000
      });

      logger.info('Attendance update broadcasted via realtime service', { tenantId, attendanceData });
    } catch (error) {
      logger.warn('Failed to broadcast attendance update', {
        tenantId,
        error: error.message
      });
    }
  }

  /**
   * Send time tracking event to user
   * @param {string} userId - User ID
   * @param {object} timeTrackingData - Time tracking data
   */
  async sendTimeTracking(userId, timeTrackingData) {
    try {
      await axios.post(`${REALTIME_SERVICE_URL}/api/events/time-tracking`, {
        userId,
        timeTrackingData
      }, {
        timeout: 5000
      });

      logger.info('Time tracking event sent via realtime service', { userId, timeTrackingData });
    } catch (error) {
      logger.warn('Failed to send time tracking event', {
        userId,
        error: error.message
      });
    }
  }
}

module.exports = new RealtimeClient();

