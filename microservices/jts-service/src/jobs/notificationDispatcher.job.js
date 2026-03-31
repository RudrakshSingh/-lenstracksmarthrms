const cron = require('node-cron');
const notificationService = require('../services/notification.service');
const logger = require('../config/logger');

class NotificationDispatcherJob {
  constructor() {
    this.isRunning = false;
  }

  start() {
    cron.schedule('*/1 * * * *', async () => {
      if (this.isRunning) {
        logger.warn('Notification dispatcher already running, skipping...');
        return;
      }

      this.isRunning = true;
      try {
        const result = await notificationService.processPendingQueues(200);
        logger.info('Notification dispatcher run completed', result);
      } catch (error) {
        logger.error('Notification dispatcher failed', { error: error.message });
      } finally {
        this.isRunning = false;
      }
    });

    logger.info('Notification dispatcher job scheduled (every 1 minute)');
  }
}

module.exports = new NotificationDispatcherJob();
