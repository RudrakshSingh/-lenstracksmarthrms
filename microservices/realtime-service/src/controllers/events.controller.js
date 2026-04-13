const realtimeService = require('../services/realtime.service');
const logger = require('../utils/logger');

/**
 * Events Controller
 * REST API endpoints for other services to emit real-time events
 */

/**
 * Send notification to user
 * POST /api/events/notification
 */
/**
 * JTS → Realtime: in-app notification (tenant-scoped; client filters recipient)
 * POST /api/events/jts-in-app
 */
exports.broadcastJtsInApp = async (req, res) => {
  try {
    const {
      tenantId,
      recipient_id,
      recipient_email,
      title,
      message,
      type,
      notification_id,
      payload
    } = req.body;

    if (!tenantId || !recipient_id) {
      return res.status(400).json({
        success: false,
        message: 'tenantId and recipient_id are required'
      });
    }

    realtimeService.broadcastJtsInAppToTenant(String(tenantId), {
      recipient_id: String(recipient_id),
      recipient_email: recipient_email || null,
      title: title || '',
      message: message || '',
      type: type || 'notification',
      notification_id: notification_id ? String(notification_id) : null,
      payload: payload && typeof payload === 'object' ? payload : {}
    });

    return res.json({ success: true, message: 'JTS in-app notification broadcast' });
  } catch (error) {
    logger.error('Broadcast JTS in-app error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to broadcast JTS notification',
      error: error.message
    });
  }
};

exports.sendNotification = async (req, res) => {
  try {
    const { userId, notification } = req.body;

    if (!userId || !notification) {
      return res.status(400).json({
        success: false,
        message: 'userId and notification are required'
      });
    }

    realtimeService.sendNotificationToUser(userId, notification);

    res.json({
      success: true,
      message: 'Notification sent successfully'
    });
  } catch (error) {
    logger.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
};

/**
 * Broadcast dashboard update
 * POST /api/events/dashboard
 */
exports.broadcastDashboard = async (req, res) => {
  try {
    const { tenantId, stats } = req.body;

    if (!tenantId || !stats) {
      return res.status(400).json({
        success: false,
        message: 'tenantId and stats are required'
      });
    }

    realtimeService.broadcastDashboardUpdate(tenantId, stats);

    res.json({
      success: true,
      message: 'Dashboard update broadcasted successfully'
    });
  } catch (error) {
    logger.error('Broadcast dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to broadcast dashboard update',
      error: error.message
    });
  }
};

/**
 * Broadcast attendance update
 * POST /api/events/attendance
 */
exports.broadcastAttendance = async (req, res) => {
  try {
    const { tenantId, attendanceData } = req.body;

    if (!tenantId || !attendanceData) {
      return res.status(400).json({
        success: false,
        message: 'tenantId and attendanceData are required'
      });
    }

    realtimeService.broadcastAttendanceUpdate(tenantId, attendanceData);

    res.json({
      success: true,
      message: 'Attendance update broadcasted successfully'
    });
  } catch (error) {
    logger.error('Broadcast attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to broadcast attendance update',
      error: error.message
    });
  }
};

/**
 * Send task to user
 * POST /api/events/task
 */
exports.sendTask = async (req, res) => {
  try {
    const { userId, task } = req.body;

    if (!userId || !task) {
      return res.status(400).json({
        success: false,
        message: 'userId and task are required'
      });
    }

    realtimeService.sendTaskToUser(userId, task);

    res.json({
      success: true,
      message: 'Task sent successfully'
    });
  } catch (error) {
    logger.error('Send task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send task',
      error: error.message
    });
  }
};

/**
 * Send time tracking event
 * POST /api/events/time-tracking
 */
exports.sendTimeTracking = async (req, res) => {
  try {
    const { userId, timeTrackingData } = req.body;

    if (!userId || !timeTrackingData) {
      return res.status(400).json({
        success: false,
        message: 'userId and timeTrackingData are required'
      });
    }

    realtimeService.sendTimeTrackingToUser(userId, timeTrackingData);

    res.json({
      success: true,
      message: 'Time tracking event sent successfully'
    });
  } catch (error) {
    logger.error('Send time tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send time tracking event',
      error: error.message
    });
  }
};

/**
 * Broadcast to workforce
 * POST /api/events/workforce
 */
exports.broadcastToWorkforce = async (req, res) => {
  try {
    const { eventName, data } = req.body;

    if (!eventName || !data) {
      return res.status(400).json({
        success: false,
        message: 'eventName and data are required'
      });
    }

    realtimeService.broadcastToWorkforce(eventName, data);

    res.json({
      success: true,
      message: 'Event broadcasted to workforce successfully'
    });
  } catch (error) {
    logger.error('Broadcast to workforce error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to broadcast to workforce',
      error: error.message
    });
  }
};

/**
 * Send custom event to user
 * POST /api/events/user
 */
exports.sendToUser = async (req, res) => {
  try {
    const { userId, eventName, data } = req.body;

    if (!userId || !eventName || !data) {
      return res.status(400).json({
        success: false,
        message: 'userId, eventName, and data are required'
      });
    }

    realtimeService.sendToUser(userId, eventName, data);

    res.json({
      success: true,
      message: 'Event sent to user successfully'
    });
  } catch (error) {
    logger.error('Send to user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send event to user',
      error: error.message
    });
  }
};

/**
 * Broadcast custom event to all
 * POST /api/events/broadcast
 */
exports.broadcastToAll = async (req, res) => {
  try {
    const { eventName, data } = req.body;

    if (!eventName || !data) {
      return res.status(400).json({
        success: false,
        message: 'eventName and data are required'
      });
    }

    realtimeService.broadcastToAll(eventName, data);

    res.json({
      success: true,
      message: 'Event broadcasted to all clients successfully'
    });
  } catch (error) {
    logger.error('Broadcast to all error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to broadcast event',
      error: error.message
    });
  }
};

