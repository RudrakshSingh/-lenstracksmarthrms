const cron = require('node-cron');
const Tenant = require('../models/Tenant.model');
const SlaBreachLog = require('../models/SlaBreachLog.model');
const slaWorkflowService = require('../services/slaWorkflow.service');
const notificationService = require('../services/notification.service');
const logger = require('../config/logger');

/**
 * Hourly rollup: if tenant had new SLA breach logs in the last hour, notify tenant admins once.
 */
class SlaAdminDigestJob {
  start() {
    if (process.env.SLA_ADMIN_DIGEST_ENABLED === 'false') {
      logger.info('SLA admin digest job disabled (SLA_ADMIN_DIGEST_ENABLED=false)');
      return;
    }

    cron.schedule('5 * * * *', async () => {
      try {
        const since = new Date(Date.now() - 60 * 60 * 1000);
        const tenants = await Tenant.find({ is_active: true }).select('_id');
        for (const t of tenants) {
          const tid = t._id;
          const count = await SlaBreachLog.countDocuments({
            tenant_id: tid,
            created_at: { $gte: since }
          });
          if (count === 0) continue;

          const admins = await slaWorkflowService.resolveTenantAdminRecipients(tid);
          if (!admins.length) continue;

          try {
            await notificationService.dispatch(tid, {
              recipient_ids: admins,
              type: 'SLA_BREACH_DIGEST_HOURLY',
              title: `SLA: ${count} breach(es) in the last hour`,
              message: `There were ${count} new SLA breach event(s) in the last 60 minutes. Review the SLA executive summary or breach log.`,
              channels: ['in_app', 'email'],
              metadata: { since: since.toISOString(), count }
            });
          } catch (e) {
            logger.warn('SLA digest notification failed', { tenantId: String(tid), error: e.message });
          }
        }
      } catch (e) {
        logger.error('SLA admin digest job error', { error: e.message });
      }
    });

    logger.info('SLA admin digest job scheduled (hourly at :05)');
  }
}

module.exports = new SlaAdminDigestJob();
