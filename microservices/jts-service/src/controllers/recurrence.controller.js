const RecurrenceRule = require('../models/RecurrenceRule.model');
const logger = require('../config/logger');
const { buildErrorBody } = require('../utils/apiError.util');
const { toErrorPayload } = require('../utils/errorResponse');

class RecurrenceController {
  async list(req, res) {
    try {
      const { tenant_id } = req.user;
      const q = { tenant_id };
      if (String(req.query.active || '').toLowerCase() === 'true') q.is_active = true;
      const rows = await RecurrenceRule.find(q).sort({ created_at: -1 }).limit(200);
      res.json({ success: true, data: rows, message: 'Recurrence rules retrieved' });
    } catch (error) {
      logger.error('Recurrence list error', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_RECURRENCE_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async getById(req, res) {
    try {
      const { tenant_id } = req.user;
      const row = await RecurrenceRule.findOne({ _id: req.params.id, tenant_id: tenant_id });
      if (!row) {
        return res.status(404).json(buildErrorBody({ code: 'JTS_RECURRENCE_RULE_NOT_FOUND' }));
      }
      res.json({ success: true, data: row, message: 'Recurrence rule retrieved' });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_RECURRENCE_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async create(req, res) {
    try {
      const { tenant_id } = req.user;
      const row = await RecurrenceRule.create({
        tenant_id,
        name: req.body.name,
        frequency: req.body.frequency,
        interval: req.body.interval || 1,
        config: req.body.config || {},
        next_run_at: req.body.next_run_at ? new Date(req.body.next_run_at) : undefined,
        is_active: req.body.is_active !== false,
        task_template: req.body.task_template || {}
      });
      res.status(201).json({ success: true, data: row, message: 'Recurrence rule created' });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_RECURRENCE_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async update(req, res) {
    try {
      const { tenant_id } = req.user;
      const row = await RecurrenceRule.findOne({ _id: req.params.id, tenant_id: tenant_id });
      if (!row) {
        return res.status(404).json(buildErrorBody({ code: 'JTS_RECURRENCE_RULE_NOT_FOUND' }));
      }
      const b = req.body;
      if (b.name != null) row.name = b.name;
      if (b.frequency != null) row.frequency = b.frequency;
      if (b.interval != null) row.interval = b.interval;
      if (b.config != null) row.config = b.config;
      if (b.next_run_at != null) row.next_run_at = new Date(b.next_run_at);
      if (typeof b.is_active === 'boolean') row.is_active = b.is_active;
      if (b.task_template != null) row.task_template = b.task_template;
      await row.save();
      res.json({ success: true, data: row, message: 'Recurrence rule updated' });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_RECURRENCE_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async remove(req, res) {
    try {
      const { tenant_id } = req.user;
      const r = await RecurrenceRule.deleteOne({ _id: req.params.id, tenant_id: tenant_id });
      if (r.deletedCount === 0) {
        return res.status(404).json(buildErrorBody({ code: 'JTS_RECURRENCE_RULE_NOT_FOUND' }));
      }
      res.status(204).send();
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_RECURRENCE_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }
}

module.exports = new RecurrenceController();
