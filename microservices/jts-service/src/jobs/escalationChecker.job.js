const cron = require('node-cron');
const escalationService = require('../services/escalation.service');
const Tenant = require('../models/Tenant.model');
const logger = require('../config/logger');

class EscalationCheckerJob {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Start the escalation checker job
   * Runs every 5 minutes
   */
  start() {
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      if (this.isRunning) {
        logger.warn('Escalation checker already running, skipping...');
        return;
      }

      this.isRunning = true;
      logger.info('Starting escalation checker job...');

      try {
        // Get all active tenants
        const tenants = await Tenant.find({ is_active: true });

        for (const tenant of tenants) {
          try {
            await escalationService.checkAndEscalateForTenant(tenant._id.toString());
          } catch (error) {
            logger.error('Error checking escalations for tenant', {
              tenantId: tenant._id,
              error: error.message
            });
          }
        }

        logger.info('Escalation checker job completed');
      } catch (error) {
        logger.error('Escalation checker job error', { error: error.message });
      } finally {
        this.isRunning = false;
      }
    });

    logger.info('Escalation checker job scheduled (every 5 minutes)');
  }
}

module.exports = new EscalationCheckerJob();

