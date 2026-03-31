const cron = require('node-cron');
const Tenant = require('../models/Tenant.model');
const slaWorkflowService = require('../services/slaWorkflow.service');
const recurrenceGeneratorService = require('../services/recurrenceGenerator.service');
const logger = require('../config/logger');

class SlaAndRecurrenceJob {
  constructor() {
    this.running = false;
  }

  start() {
    cron.schedule('*/5 * * * *', async () => {
      if (this.running) return;
      this.running = true;
      try {
        const tenants = await Tenant.find({ is_active: true }).select('_id');
        for (const tenant of tenants) {
          await slaWorkflowService.runForTenant(tenant._id);
          await recurrenceGeneratorService.generateForTenant(tenant._id);
        }
      } catch (e) {
        logger.error('SLA/recurrence job failed', { error: e.message });
      } finally {
        this.running = false;
      }
    });
    logger.info('SLA+Recurrence job scheduled (every 5 minutes)');
  }
}

module.exports = new SlaAndRecurrenceJob();

