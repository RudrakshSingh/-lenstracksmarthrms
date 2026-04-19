const { Worker } = require('bullmq');
const TransferWorkflows = require('../jobs/transferWorkflows');
const logger = require('../config/logger');

/**
 * Transfer Worker
 * Processes transfer-related background jobs
 */
class TransferWorker {
  constructor() {
    this.worker = null;
    this.initializeWorker();
  }

  /**
   * Initializes the transfer worker
   */
  initializeWorker() {
    try {
      if (process.env.REDIS_DISABLED === '1') {
        logger.warn('Redis is disabled, transfer worker will not start', {
          service: 'hrms-backend'
        });
        return;
      }

      this.worker = new Worker('transfer-queue', async (job) => {
        await this.processJob(job);
      }, {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD,
          db: process.env.REDIS_DB || 0
        },
        concurrency: 5,
        removeOnComplete: 100,
        removeOnFail: 50
      });

      // Event handlers
      this.worker.on('completed', (job) => {
        logger.info('Transfer job completed', {
          jobId: job.id,
          jobName: job.name,
          duration: Date.now() - job.timestamp
        });
      });

      this.worker.on('failed', (job, err) => {
        logger.error('Transfer job failed', {
          jobId: job.id,
          jobName: job.name,
          error: err.message,
          attempts: job.attemptsMade
        });
      });

      this.worker.on('error', (err) => {
        logger.error('Transfer worker error', {
          error: err.message
        });
      });

      logger.info('Transfer worker initialized', {
        service: 'hrms-backend',
        queue: 'transfer-queue',
        concurrency: 5
      });

    } catch (error) {
      logger.error('Error initializing transfer worker', {
        error: error.message,
        service: 'hrms-backend'
      });
    }
  }

  /**
   * Processes a transfer job
   * @param {Object} job - BullMQ job object
   */
  async processJob(job) {
    const { name, data } = job;
    
    logger.info('Processing transfer job', {
      jobId: job.id,
      jobName: name,
      data
    });

    try {
      switch (name) {
        case 'initiate-transfer-workflow':
          await TransferWorkflows.initiateTransferApprovalWorkflow(data.transferId);
          break;

        case 'escalate-transfer-approval':
          await TransferWorkflows.escalateTransferApproval(data.transferId, data.escalationLevel);
          break;

        case 'execute-transfer':
          await TransferWorkflows.executeTransfer(data.transferId);
          break;

        case 'process-transfer-approval':
          await TransferWorkflows.processTransferApproval(
            data.transferId,
            data.approverId,
            data.status,
            data.comments
          );
          break;

        case 'send-transfer-notifications':
          await this.sendTransferNotifications(data);
          break;

        case 'update-employee-details':
          await this.updateEmployeeDetails(data);
          break;

        case 'cleanup-expired-transfers':
          await this.cleanupExpiredTransfers();
          break;

        default:
          logger.warn('Unknown transfer job type', {
            jobName: name,
            jobId: job.id
          });
      }

      logger.info('Transfer job processed successfully', {
        jobId: job.id,
        jobName: name
      });

    } catch (error) {
      logger.error('Error processing transfer job', {
        jobId: job.id,
        jobName: name,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Sends transfer notifications
   * @param {Object} data - Notification data
   */
  async sendTransferNotifications(data) {
    try {
      const { transferId, notificationType, recipients } = data;
      
      // Implementation for sending various transfer notifications
      logger.info('Sending transfer notifications', {
        transferId,
        notificationType,
        recipientCount: recipients.length
      });

      // Add specific notification logic here based on notificationType
      // This could include emails, SMS, push notifications, etc.

    } catch (error) {
      logger.error('Error sending transfer notifications', {
        error: error.message,
        data
      });
      throw error;
    }
  }

  /**
   * Updates employee details after transfer
   * @param {Object} data - Update data
   */
  async updateEmployeeDetails(data) {
    try {
      const { employeeId, newStore, newDepartment, newDesignation, newManager } = data;
      
      const User = require('../models/User.model');
      const employee = await User.findById(employeeId);
      
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Update employee details
      if (newStore) employee.primary_store = newStore;
      if (newDepartment) employee.department = newDepartment;
      if (newDesignation) employee.designation = newDesignation;
      if (newManager) employee.reportingManager = String(newManager);

      await employee.save();

      if (newManager) {
        try {
          const { promotePeopleManagerById } = require('../utils/peopleManagerRoleSync');
          const sync = await promotePeopleManagerById(newManager);
          logger.info('People-manager role sync (transfer)', { newManager, sync });
        } catch (syncErr) {
          logger.warn('peopleManagerRoleSync failed', { error: syncErr.message });
        }
      }

      logger.info('Employee details updated after transfer', {
        employeeId,
        newStore,
        newDepartment,
        newDesignation
      });

    } catch (error) {
      logger.error('Error updating employee details', {
        error: error.message,
        data
      });
      throw error;
    }
  }

  /**
   * Cleans up expired transfer requests
   */
  async cleanupExpiredTransfers() {
    try {
      const Transfer = require('../models/Transfer.model');
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Find expired transfers
      const expiredTransfers = await Transfer.find({
        status: { $in: ['pending', 'approved_by_manager'] },
        request_date: { $lt: thirtyDaysAgo }
      });

      // Update status to expired
      for (const transfer of expiredTransfers) {
        transfer.status = 'expired';
        transfer.notes = 'Transfer request expired after 30 days';
        await transfer.save();

        logger.info('Transfer marked as expired', {
          transferId: transfer._id,
          requestDate: transfer.request_date
        });
      }

      logger.info('Expired transfers cleanup completed', {
        expiredCount: expiredTransfers.length
      });

    } catch (error) {
      logger.error('Error cleaning up expired transfers', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Stops the transfer worker
   */
  async stop() {
    if (this.worker) {
      await this.worker.close();
      logger.info('Transfer worker stopped', {
        service: 'hrms-backend'
      });
    }
  }

  /**
   * Gets worker status
   */
  getStatus() {
    return {
      isRunning: this.worker !== null,
      queue: 'transfer-queue',
      concurrency: 5
    };
  }
}

// Create singleton instance
const transferWorker = new TransferWorker();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, stopping transfer worker');
  await transferWorker.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, stopping transfer worker');
  await transferWorker.stop();
  process.exit(0);
});

module.exports = transferWorker;
