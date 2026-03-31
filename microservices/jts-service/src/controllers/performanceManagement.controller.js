const performanceManagementService = require('../services/performanceManagement.service');
const logger = require('../config/logger');
const { toErrorPayload } = require('../utils/errorResponse');
const { resolveEmployeeId } = require('../utils/actor.util');

class PerformanceManagementController {
  async listMetrics(req, res) {
    try {
      const rows = await performanceManagementService.listMetrics(req.user.tenant_id, req.query);
      res.json({ success: true, data: rows });
    } catch (error) {
      logger.error('perf metrics', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_PERF_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async listScores(req, res) {
    try {
      const rows = await performanceManagementService.listScores(req.user.tenant_id, req.query);
      res.json({ success: true, data: rows });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_PERF_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async calculateDaily(req, res) {
    try {
      const result = await performanceManagementService.runDailyCalculation(
        req.user.tenant_id,
        req.body.employee_id,
        req.body.date || new Date().toISOString()
      );
      res.json({ success: true, data: result });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_PERF_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async listReviews(req, res) {
    try {
      const rows = await performanceManagementService.listReviews(req.user.tenant_id, req.query);
      res.json({ success: true, data: rows });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_PERF_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async createReview(req, res) {
    try {
      const row = await performanceManagementService.createReview(req.user.tenant_id, req.body);
      res.status(201).json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_PERF_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async updateReview(req, res) {
    try {
      const row = await performanceManagementService.updateReview(
        req.user.tenant_id,
        req.params.id,
        req.body
      );
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_PERF_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async deleteReview(req, res) {
    try {
      const row = await performanceManagementService.deleteReview(req.user.tenant_id, req.params.id);
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_PERF_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async addGoal(req, res) {
    try {
      const row = await performanceManagementService.addReviewGoal(
        req.user.tenant_id,
        req.params.reviewId,
        req.body
      );
      res.status(201).json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_PERF_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async listGoals(req, res) {
    try {
      const rows = await performanceManagementService.listReviewGoals(
        req.user.tenant_id,
        req.params.reviewId
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_PERF_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async acknowledge(req, res) {
    try {
      const employeeId = await resolveEmployeeId(req.user.tenant_id, req.user);
      if (!employeeId) {
        return res.status(403).json({
          success: false,
          code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED'
        });
      }
      const row = await performanceManagementService.acknowledgeReview(
        req.user.tenant_id,
        req.params.reviewId,
        employeeId,
        req.body
      );
      res.status(201).json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_PERF_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async listAlerts(req, res) {
    try {
      const rows = await performanceManagementService.listAlerts(req.user.tenant_id, req.query);
      res.json({ success: true, data: rows });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_PERF_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async createAlert(req, res) {
    try {
      const row = await performanceManagementService.createAlert(req.user.tenant_id, req.body);
      res.status(201).json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_PERF_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async resolveAlert(req, res) {
    try {
      const row = await performanceManagementService.resolveAlert(
        req.user.tenant_id,
        req.params.id,
        req.body
      );
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_PERF_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }
}

module.exports = new PerformanceManagementController();
