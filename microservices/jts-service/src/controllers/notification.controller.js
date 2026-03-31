const notificationService = require('../services/notification.service');
const logger = require('../config/logger');
const { toErrorPayload } = require('../utils/errorResponse');
const { resolveEmployeeId } = require('../utils/actor.util');

class NotificationController {
  async getMyInbox(req, res) {
    try {
      const { tenant_id } = req.user;
      const employeeId = await resolveEmployeeId(tenant_id, req.user);
      if (!employeeId) {
        return res.status(403).json({
          success: false,
          error: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED',
          code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED'
        });
      }
      const result = await notificationService.getInbox(tenant_id, employeeId, req.query);
      res.json({
        success: true,
        data: result.notifications,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Get inbox error', { error: error.message });
      const mapped = toErrorPayload(error, 'NOTIFICATION_FETCH_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async markAsRead(req, res) {
    try {
      const { tenant_id } = req.user;
      const employeeId = await resolveEmployeeId(tenant_id, req.user);
      if (!employeeId) {
        return res.status(403).json({
          success: false,
          error: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED',
          code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED'
        });
      }
      const notification = await notificationService.markAsRead(
        tenant_id,
        employeeId,
        req.params.id
      );
      res.json({ success: true, data: notification });
    } catch (error) {
      logger.error('Mark as read error', { error: error.message });
      const mapped = toErrorPayload(error, 'NOTIFICATION_UPDATE_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async markAllAsRead(req, res) {
    try {
      const { tenant_id } = req.user;
      const employeeId = await resolveEmployeeId(tenant_id, req.user);
      if (!employeeId) {
        return res.status(403).json({
          success: false,
          error: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED',
          code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED'
        });
      }
      const result = await notificationService.markAllAsRead(tenant_id, employeeId);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Mark all as read error', { error: error.message });
      const mapped = toErrorPayload(error, 'NOTIFICATION_UPDATE_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async getMyPreferences(req, res) {
    try {
      const { tenant_id } = req.user;
      const employeeId = await resolveEmployeeId(tenant_id, req.user);
      if (!employeeId) {
        return res.status(403).json({
          success: false,
          error: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED',
          code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED'
        });
      }
      const preference = await notificationService.getOrCreatePreference(tenant_id, employeeId);
      res.json({ success: true, data: preference });
    } catch (error) {
      logger.error('Get notification preferences error', { error: error.message });
      const mapped = toErrorPayload(error, 'NOTIFICATION_PREF_FETCH_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async updateMyPreferences(req, res) {
    try {
      const { tenant_id } = req.user;
      const employeeId = await resolveEmployeeId(tenant_id, req.user);
      if (!employeeId) {
        return res.status(403).json({
          success: false,
          error: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED',
          code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED'
        });
      }
      const preference = await notificationService.updatePreference(tenant_id, employeeId, req.body);
      res.json({ success: true, data: preference });
    } catch (error) {
      logger.error('Update notification preferences error', { error: error.message });
      const mapped = toErrorPayload(error, 'NOTIFICATION_PREF_UPDATE_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async dispatch(req, res) {
    try {
      const { tenant_id } = req.user;
      const result = await notificationService.dispatch(tenant_id, req.body);
      res.status(202).json({ success: true, data: result });
    } catch (error) {
      logger.error('Dispatch notification error', { error: error.message });
      const mapped = toErrorPayload(error, 'NOTIFICATION_DISPATCH_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async processQueues(req, res) {
    try {
      const result = await notificationService.processPendingQueues(req.body.limit || 100);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Process notification queues error', { error: error.message });
      const mapped = toErrorPayload(error, 'NOTIFICATION_PROCESS_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async providerHealth(req, res) {
    try {
      const result = await notificationService.providersHealth();
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Notification provider health error', { error: error.message });
      const mapped = toErrorPayload(error, 'NOTIFICATION_PROCESS_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async sendTestEmail(req, res) {
    try {
      const result = await notificationService.sendTestEmail(req.body);
      res.json({
        success: true,
        message: 'Test email sent via SES',
        data: result
      });
    } catch (error) {
      logger.error('Send test email error', { error: error.message });
      const mapped = toErrorPayload(error, 'NOTIFICATION_TEST_EMAIL_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }
}

module.exports = new NotificationController();
