const cron = require('node-cron');
const performanceCalculator = require('../services/performanceCalculator.service');
const Employee = require('../models/Employee.model');
const logger = require('../config/logger');

class PerformanceCalculatorJob {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Start daily performance calculation job
   * Runs at 1 AM daily
   */
  start() {
    // Run at 1 AM daily
    cron.schedule('0 1 * * *', async () => {
      if (this.isRunning) {
        logger.warn('Performance calculator already running, skipping...');
        return;
      }

      this.isRunning = true;
      logger.info('Starting daily performance calculation job...');

      try {
        // Calculate for yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        // Get all active employees
        const employees = await Employee.find({ status: 'ACTIVE' });

        for (const employee of employees) {
          try {
            await performanceCalculator.calculateDailyPerformance(
              employee.tenant_id.toString(),
              employee._id.toString(),
              yesterday
            );
          } catch (error) {
            logger.error('Error calculating performance for employee', {
              employeeId: employee._id,
              error: error.message
            });
          }
        }

        logger.info('Daily performance calculation job completed');
      } catch (error) {
        logger.error('Performance calculator job error', { error: error.message });
      } finally {
        this.isRunning = false;
      }
    });

    logger.info('Daily performance calculation job scheduled (1 AM daily)');
  }
}

module.exports = new PerformanceCalculatorJob();

