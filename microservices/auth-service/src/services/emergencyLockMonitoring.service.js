const EmergencyLock = require('../models/EmergencyLock.model');
const logger = require('../config/logger');
const nodemailer = require('nodemailer');

class EmergencyLockMonitoringService {
  constructor() {
    this.monitoringInterval = null;
    this.alertThresholds = {
      maxLockDuration: 24 * 60 * 60 * 1000, // 24 hours
      maxRecoveryAttempts: 5,
      alertInterval: 60 * 60 * 1000 // 1 hour
    };
    this.lastAlertTimes = new Map();
  }

  /**
   * Start monitoring service
   */
  startMonitoring() {
    logger.info('Starting Emergency Lock Monitoring Service');
    
    // Check every 5 minutes
    this.monitoringInterval = setInterval(async () => {
      await this.checkActiveLocks();
    }, 5 * 60 * 1000);
    
    // Initial check
    this.checkActiveLocks();
  }

  /**
   * Stop monitoring service
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('Emergency Lock Monitoring Service stopped');
    }
  }

  /**
   * Check all active locks
   */
  async checkActiveLocks() {
    try {
      const activeLocks = await EmergencyLock.find({
        isLocked: true,
        status: 'active'
      });

      logger.info(`Checking ${activeLocks.length} active emergency locks`);

      for (const lock of activeLocks) {
        await this.checkLockStatus(lock);
      }
    } catch (error) {
      logger.error('Error checking active locks:', error);
    }
  }

  /**
   * Check individual lock status
   */
  async checkLockStatus(lock) {
    const now = Date.now();
    const lockDuration = now - new Date(lock.lockedAt).getTime();
    const lockId = lock.lockId;

    // Check if lock has expired
    if (lockDuration > this.alertThresholds.maxLockDuration) {
      await this.handleExpiredLock(lock);
      return;
    }

    // Check recovery attempts
    if (lock.recoveryAttempts.length >= this.alertThresholds.maxRecoveryAttempts) {
      await this.handleMaxAttemptsReached(lock);
      return;
    }

    // Check if we need to send periodic alerts
    const lastAlertTime = this.lastAlertTimes.get(lockId);
    const timeSinceLastAlert = lastAlertTime ? now - lastAlertTime : Infinity;

    if (timeSinceLastAlert > this.alertThresholds.alertInterval) {
      await this.sendPeriodicAlert(lock);
      this.lastAlertTimes.set(lockId, now);
    }

    // Check for suspicious activity
    await this.checkSuspiciousActivity(lock);
  }

  /**
   * Handle expired lock
   */
  async handleExpiredLock(lock) {
    logger.warn(`Emergency lock ${lock.lockId} has expired (${Math.round((Date.now() - new Date(lock.lockedAt).getTime()) / (1000 * 60 * 60))} hours)`);

    // Update lock status
    lock.status = 'expired';
    lock.isLocked = false;
    
    // Add to audit log
    lock.auditLog.push({
      action: 'lock_expired',
      performedBy: 'System',
      details: 'Lock expired due to timeout',
      performedAt: new Date()
    });

    await lock.save();

    // Send expiration notification
    await this.sendExpirationNotification(lock);
  }

  /**
   * Handle max recovery attempts reached
   */
  async handleMaxAttemptsReached(lock) {
    logger.warn(`Emergency lock ${lock.lockId} has reached maximum recovery attempts`);

    // Send critical alert
    await this.sendCriticalAlert(lock, 'MAX_RECOVERY_ATTEMPTS');

    // Notify emergency contacts
    await this.notifyEmergencyContacts(lock, 'MAX_RECOVERY_ATTEMPTS');
  }

  /**
   * Send periodic alert
   */
  async sendPeriodicAlert(lock) {
    const lockDurationHours = Math.round((Date.now() - new Date(lock.lockedAt).getTime()) / (1000 * 60 * 60));
    
    logger.info(`Sending periodic alert for lock ${lock.lockId} (${lockDurationHours} hours locked)`);

    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const emailContent = {
      from: process.env.SMTP_FROM || 'noreply@etelios.com',
      subject: `⚠️ Emergency Lock Still Active - ${lockDurationHours} hours`,
      html: `
        <h2>⚠️ Emergency Lock Still Active</h2>
        <p><strong>Lock ID:</strong> ${lock.lockId}</p>
        <p><strong>Tenant:</strong> ${lock.tenantId}</p>
        <p><strong>Duration:</strong> ${lockDurationHours} hours</p>
        <p><strong>Triggered By:</strong> ${lock.triggeredBy.userName} (${lock.triggeredBy.userRole})</p>
        <p><strong>Reason:</strong> ${lock.lockReason}</p>
        <p><strong>Recovery Attempts:</strong> ${lock.recoveryAttempts.length}/${lock.lockConfig.maxRecoveryAttempts}</p>
        
        <h3>Recovery Keys:</h3>
        <p><strong>Customer Key:</strong> ${lock.recoveryKeys.customerKey}</p>
        <p><strong>Etelios Key:</strong> ${lock.recoveryKeys.eteliosKey}</p>
        
        <p><em>This is an automated periodic alert from the Etelios Emergency Lock Monitoring System.</em></p>
      `
    };

    // Send to emergency contacts
    for (const contact of lock.emergencyContacts) {
      await transporter.sendMail({
        ...emailContent,
        to: contact.email
      });
    }

    // Send to Etelios support
    await transporter.sendMail({
      ...emailContent,
      to: 'monitoring@etelios.com'
    });
  }

  /**
   * Send critical alert
   */
  async sendCriticalAlert(lock, alertType) {
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const alertMessages = {
      MAX_RECOVERY_ATTEMPTS: 'Maximum recovery attempts exceeded',
      SUSPICIOUS_ACTIVITY: 'Suspicious recovery activity detected',
      LOCK_EXPIRED: 'Emergency lock has expired'
    };

    const emailContent = {
      from: process.env.SMTP_FROM || 'noreply@etelios.com',
      subject: `🚨 CRITICAL ALERT: ${alertMessages[alertType]} - Lock ${lock.lockId}`,
      html: `
        <h2>🚨 CRITICAL ALERT</h2>
        <p><strong>Alert Type:</strong> ${alertMessages[alertType]}</p>
        <p><strong>Lock ID:</strong> ${lock.lockId}</p>
        <p><strong>Tenant:</strong> ${lock.tenantId}</p>
        <p><strong>Triggered By:</strong> ${lock.triggeredBy.userName} (${lock.triggeredBy.userRole})</p>
        <p><strong>Lock Duration:</strong> ${Math.round((Date.now() - new Date(lock.lockedAt).getTime()) / (1000 * 60 * 60))} hours</p>
        
        <h3>Immediate Action Required:</h3>
        <ul>
          <li>Contact the tenant immediately</li>
          <li>Verify the legitimacy of the lock</li>
          <li>Provide recovery assistance if needed</li>
          <li>Escalate to senior support if necessary</li>
        </ul>
        
        <h3>Recovery Keys:</h3>
        <p><strong>Customer Key:</strong> ${lock.recoveryKeys.customerKey}</p>
        <p><strong>Etelios Key:</strong> ${lock.recoveryKeys.eteliosKey}</p>
        
        <p><em>This is a CRITICAL alert requiring immediate attention.</em></p>
      `
    };

    // Send to all emergency contacts
    for (const contact of lock.emergencyContacts) {
      await transporter.sendMail({
        ...emailContent,
        to: contact.email
      });
    }

    // Send to Etelios critical support
    await transporter.sendMail({
      ...emailContent,
      to: 'critical@etelios.com'
    });

    // Send SMS alert (if SMS service is configured)
    await this.sendSMSAlert(lock, alertType);
  }

  /**
   * Send SMS alert
   */
  async sendSMSAlert(lock, alertType) {
    try {
      // This would integrate with an SMS service like Twilio
      // For now, we'll just log the SMS alert
      logger.warn(`SMS Alert: ${alertType} for lock ${lock.lockId}`);
      
      // Example SMS integration:
      // const twilio = require('twilio');
      // const client = twilio(accountSid, authToken);
      // 
      // for (const contact of lock.emergencyContacts) {
      //   if (contact.phone) {
      //     await client.messages.create({
      //       body: `🚨 ETELIOS ALERT: ${alertType} - Lock ${lock.lockId}`,
      //       from: '+1234567890',
      //       to: contact.phone
      //     });
      //   }
      // }
    } catch (error) {
      logger.error('Error sending SMS alert:', error);
    }
  }

  /**
   * Check for suspicious activity
   */
  async checkSuspiciousActivity(lock) {
    const recentAttempts = lock.recoveryAttempts.filter(attempt => 
      Date.now() - new Date(attempt.attemptedAt).getTime() < 60 * 60 * 1000 // Last hour
    );

    // Check for rapid-fire attempts
    if (recentAttempts.length > 3) {
      await this.sendCriticalAlert(lock, 'SUSPICIOUS_ACTIVITY');
      return;
    }

    // Check for attempts from different IPs
    const uniqueIPs = new Set(recentAttempts.map(attempt => attempt.ipAddress));
    if (uniqueIPs.size > 2) {
      await this.sendCriticalAlert(lock, 'SUSPICIOUS_ACTIVITY');
      return;
    }
  }

  /**
   * Send expiration notification
   */
  async sendExpirationNotification(lock) {
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const emailContent = {
      from: process.env.SMTP_FROM || 'noreply@etelios.com',
      subject: `⏰ Emergency Lock Expired - Lock ${lock.lockId}`,
      html: `
        <h2>⏰ Emergency Lock Expired</h2>
        <p><strong>Lock ID:</strong> ${lock.lockId}</p>
        <p><strong>Tenant:</strong> ${lock.tenantId}</p>
        <p><strong>Duration:</strong> ${Math.round((Date.now() - new Date(lock.lockedAt).getTime()) / (1000 * 60 * 60))} hours</p>
        <p><strong>Status:</strong> System automatically unlocked due to timeout</p>
        
        <p><em>The emergency lock has expired and the system has been automatically unlocked.</em></p>
      `
    };

    // Send to emergency contacts
    for (const contact of lock.emergencyContacts) {
      await transporter.sendMail({
        ...emailContent,
        to: contact.email
      });
    }

    // Send to Etelios support
    await transporter.sendMail({
      ...emailContent,
      to: 'support@etelios.com'
    });
  }

  /**
   * Notify emergency contacts
   */
  async notifyEmergencyContacts(lock, alertType) {
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const emailContent = {
      from: process.env.SMTP_FROM || 'noreply@etelios.com',
      subject: `🚨 Emergency Alert: ${alertType} - Lock ${lock.lockId}`,
      html: `
        <h2>🚨 Emergency Alert</h2>
        <p><strong>Alert Type:</strong> ${alertType}</p>
        <p><strong>Lock ID:</strong> ${lock.lockId}</p>
        <p><strong>Tenant:</strong> ${lock.tenantId}</p>
        <p><strong>Immediate Action Required</strong></p>
        
        <h3>Contact Information:</h3>
        <p><strong>Etelios Support:</strong> support@etelios.com</p>
        <p><strong>Emergency Hotline:</strong> +1-800-ETELIOS</p>
        
        <p><em>This is an automated emergency notification.</em></p>
      `
    };

    // Send to all emergency contacts
    for (const contact of lock.emergencyContacts) {
      await transporter.sendMail({
        ...emailContent,
        to: contact.email
      });
    }
  }

  /**
   * Get monitoring statistics
   */
  async getMonitoringStats() {
    try {
      const stats = await EmergencyLock.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const activeLocks = await EmergencyLock.countDocuments({
        isLocked: true,
        status: 'active'
      });

      const expiredLocks = await EmergencyLock.countDocuments({
        status: 'expired'
      });

      const recoveredLocks = await EmergencyLock.countDocuments({
        status: 'recovered'
      });

      return {
        activeLocks,
        expiredLocks,
        recoveredLocks,
        totalLocks: activeLocks + expiredLocks + recoveredLocks,
        statusBreakdown: stats
      };
    } catch (error) {
      logger.error('Error getting monitoring stats:', error);
      return null;
    }
  }
}

// Create singleton instance
const monitoringService = new EmergencyLockMonitoringService();

module.exports = monitoringService;
