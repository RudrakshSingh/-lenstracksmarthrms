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
   * Broadcast dashboard update
   * @param {string} tenantId - Tenant ID
   * @param {object} stats - Dashboard statistics
   */
  async broadcastDashboard(tenantId, stats) {
    try {
      await axios.post(`${REALTIME_SERVICE_URL}/api/events/dashboard`, {
        tenantId,
        stats
      }, {
        timeout: 5000
      });

      logger.info('Dashboard update broadcasted via realtime service', { tenantId });
    } catch (error) {
      logger.warn('Failed to broadcast dashboard update', {
        tenantId,
        error: error.message
      });
    }
  }

  /**
   * Send task to user
   * @param {string} userId - User ID
   * @param {object} task - Task data
   */
  async sendTask(userId, task) {
    try {
      await axios.post(`${REALTIME_SERVICE_URL}/api/events/task`, {
        userId,
        task
      }, {
        timeout: 5000
      });

      logger.info('Task sent via realtime service', { userId, task });
    } catch (error) {
      logger.warn('Failed to send task via realtime', {
        userId,
        error: error.message
      });
    }
  }

  /**
   * Broadcast to workforce
   * @param {string} eventName - Event name
   * @param {object} data - Event data
   */
  async broadcastToWorkforce(eventName, data) {
    try {
      await axios.post(`${REALTIME_SERVICE_URL}/api/events/workforce`, {
        eventName,
        data
      }, {
        timeout: 5000
      });

      logger.info('Event broadcasted to workforce', { eventName });
    } catch (error) {
      logger.warn('Failed to broadcast to workforce', {
        eventName,
        error: error.message
      });
    }
  }
}

module.exports = new RealtimeClient();

