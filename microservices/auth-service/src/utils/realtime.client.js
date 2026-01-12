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
   * Broadcast event to all users
   * @param {string} eventName - Event name
   * @param {object} data - Event data
   */
  async broadcastToAll(eventName, data) {
    try {
      await axios.post(`${REALTIME_SERVICE_URL}/api/events/broadcast`, {
        eventName,
        data
      }, {
        timeout: 5000
      });

      logger.info('Event broadcasted via realtime service', { eventName });
    } catch (error) {
      logger.warn('Failed to broadcast realtime event', {
        eventName,
        error: error.message
      });
    }
  }

  /**
   * Send event to specific user
   * @param {string} userId - User ID
   * @param {string} eventName - Event name
   * @param {object} data - Event data
   */
  async sendToUser(userId, eventName, data) {
    try {
      await axios.post(`${REALTIME_SERVICE_URL}/api/events/user`, {
        userId,
        eventName,
        data
      }, {
        timeout: 5000
      });

      logger.info('Event sent to user via realtime service', { userId, eventName });
    } catch (error) {
      logger.warn('Failed to send realtime event to user', {
        userId,
        eventName,
        error: error.message
      });
    }
  }
}

module.exports = new RealtimeClient();

