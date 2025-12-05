const EmergencyLock = require('../models/EmergencyLock.model');
const logger = require('../config/logger');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

class EmergencyLockController {
  
  /**
   * Trigger Emergency Lock (SOS Button)
   */
  static async triggerEmergencyLock(req, res) {
    try {
      const {
        lockReason = 'sos_emergency',
        lockDescription,
        customLockMessage,
        allowPartialAccess = false,
        allowedModules = [],
        emergencyContacts = []
      } = req.body;
      
      const tenantId = req.tenant?.subdomain || req.headers['x-tenant-id'] || 'default';
      const user = req.user;
      
      // Create emergency lock
      const lockData = {
        tenantId,
        lockReason,
        lockDescription: lockDescription || 'Emergency lock triggered via SOS button',
        triggeredBy: {
          userId: user.id,
          userRole: user.role,
          userName: user.name,
          userEmail: user.email
        },
        lockConfig: {
          allowPartialAccess,
          allowedModules,
          customLockMessage,
          showRecoveryForm: true,
          maxRecoveryAttempts: 5,
          lockTimeout: 24 * 60 * 60 * 1000 // 24 hours
        },
        emergencyContacts,
        metadata: {
          clientVersion: req.headers['x-client-version'] || 'unknown',
          serverVersion: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'production',
          lockSource: 'emergency_button'
        }
      };
      
      const emergencyLock = await EmergencyLock.createEmergencyLock(lockData);
      
      // Add initial audit log entry
      emergencyLock.auditLog.push({
        action: 'lock_triggered',
        performedBy: user.name,
        details: `Emergency lock triggered by ${user.role}: ${lockDescription}`,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      });
      
      await emergencyLock.save();
      
      // Send emergency notifications
      await EmergencyLockController.sendEmergencyNotifications(emergencyLock);
      
      logger.warn(`Emergency lock triggered for tenant ${tenantId} by ${user.name} (${user.role})`);
      
      res.status(201).json({
        success: true,
        message: 'Emergency lock activated successfully',
        lockDetails: {
          lockId: emergencyLock.lockId,
          lockedAt: emergencyLock.lockedAt,
          lockReason: emergencyLock.lockReason,
          lockDescription: emergencyLock.lockDescription,
          recoveryKeys: {
            customerKey: emergencyLock.recoveryKeys.customerKey,
            eteliosKey: emergencyLock.recoveryKeys.eteliosKey
          },
          emergencyContacts: emergencyLock.emergencyContacts,
          recoveryInstructions: {
            message: 'System is now locked. To unlock:',
            steps: [
              '1. Use the customer recovery key provided above',
              '2. Contact Etelios support for the developer recovery key',
              '3. Both keys are required for system recovery'
            ],
            supportContact: {
              email: 'support@etelios.com',
              phone: '+1-800-ETELIOS',
              emergency: 'emergency@etelios.com'
            }
          }
        }
      });
      
    } catch (error) {
      logger.error('Error triggering emergency lock:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to trigger emergency lock'
      });
    }
  }
  
  /**
   * Get Lock Status
   */
  static async getLockStatus(req, res) {
    try {
      const tenantId = req.tenant?.subdomain || req.headers['x-tenant-id'] || 'default';
      const activeLock = await EmergencyLock.getActiveLock(tenantId);
      
      if (!activeLock) {
        return res.status(200).json({
          success: true,
          isLocked: false,
          message: 'System is operational'
        });
      }
      
      res.status(200).json({
        success: true,
        isLocked: true,
        lockDetails: {
          lockId: activeLock.lockId,
          lockedAt: activeLock.lockedAt,
          lockReason: activeLock.lockReason,
          lockDescription: activeLock.lockDescription,
          triggeredBy: {
            userName: activeLock.triggeredBy.userName,
            userRole: activeLock.triggeredBy.userRole
          },
          lockConfig: {
            allowPartialAccess: activeLock.lockConfig.allowPartialAccess,
            allowedModules: activeLock.lockConfig.allowedModules,
            lockMessage: activeLock.lockConfig.customLockMessage || activeLock.lockConfig.lockMessage,
            showRecoveryForm: activeLock.lockConfig.showRecoveryForm,
            maxRecoveryAttempts: activeLock.lockConfig.maxRecoveryAttempts
          },
          recoveryAttempts: activeLock.recoveryAttempts.length,
          emergencyContacts: activeLock.emergencyContacts.map(contact => ({
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            role: contact.role
          }))
        }
      });
      
    } catch (error) {
      logger.error('Error getting lock status:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to get lock status'
      });
    }
  }
  
  /**
   * Unlock System with Recovery Keys
   */
  static async unlockSystem(req, res) {
    try {
      const { lockId, customerKey, eteliosKey } = req.body;
      const user = req.user;
      
      // Keys are already validated by middleware
      const lock = req.emergencyLock;
      
      // Recover the system
      await lock.recover({
        userId: user?.id,
        userName: user?.name || 'System Recovery',
        userEmail: user?.email || 'system@etelios.com',
        recoveryMethod: 'dual_key'
      });
      
      // Send recovery notification
      await EmergencyLockController.sendRecoveryNotification(lock);
      
      logger.info(`System recovered for tenant ${lock.tenantId} using dual-key method`);
      
      res.status(200).json({
        success: true,
        message: 'System successfully unlocked',
        recoveryDetails: {
          lockId: lock.lockId,
          recoveredAt: new Date(),
          recoveredBy: user?.name || 'System Recovery',
          recoveryMethod: 'dual_key',
          lockDuration: Date.now() - new Date(lock.lockedAt).getTime()
        }
      });
      
    } catch (error) {
      logger.error('Error unlocking system:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to unlock system'
      });
    }
  }
  
  /**
   * Verify Recovery Keys (without unlocking)
   */
  static async verifyRecoveryKeys(req, res) {
    try {
      const { lockId, customerKey, eteliosKey } = req.body;
      
      const isValid = await EmergencyLock.verifyRecoveryKeys(lockId, customerKey, eteliosKey);
      
      if (isValid) {
        res.status(200).json({
          success: true,
          message: 'Recovery keys are valid',
          canUnlock: true
        });
      } else {
        res.status(401).json({
          success: false,
          message: 'Invalid recovery keys',
          canUnlock: false
        });
      }
      
    } catch (error) {
      logger.error('Error verifying recovery keys:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to verify recovery keys'
      });
    }
  }
  
  /**
   * Get Recovery Instructions
   */
  static async getRecoveryInstructions(req, res) {
    try {
      const { lockId } = req.params;
      
      const lock = await EmergencyLock.findOne({ lockId, isLocked: true, status: 'active' });
      if (!lock) {
        return res.status(404).json({
          success: false,
          error: 'LOCK_NOT_FOUND',
          message: 'Emergency lock not found'
        });
      }
      
      res.status(200).json({
        success: true,
        instructions: {
          title: 'System Recovery Instructions',
          message: 'To unlock the system, you need both recovery keys:',
          steps: [
            '1. Enter your customer recovery key (provided during software installation)',
            '2. Contact Etelios support for the developer recovery key',
            '3. Both keys are required to unlock the system'
          ],
          keyFormat: {
            description: 'Recovery keys are 32-character hexadecimal strings',
            example: 'a1b2c3d4e5f6789012345678901234ab',
            length: 32,
            characters: '0-9, a-f (case insensitive)'
          },
          supportContact: {
            email: 'support@etelios.com',
            phone: '+1-800-ETELIOS',
            emergency: 'emergency@etelios.com',
            hours: '24/7 Emergency Support'
          },
          attemptsRemaining: lock.lockConfig.maxRecoveryAttempts - lock.recoveryAttempts.length
        }
      });
      
    } catch (error) {
      logger.error('Error getting recovery instructions:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to get recovery instructions'
      });
    }
  }
  
  /**
   * Contact Emergency Support
   */
  static async contactEmergencySupport(req, res) {
    try {
      const { lockId, message, contactInfo } = req.body;
      
      const lock = await EmergencyLock.findOne({ lockId, isLocked: true, status: 'active' });
      if (!lock) {
        return res.status(404).json({
          success: false,
          error: 'LOCK_NOT_FOUND',
          message: 'Emergency lock not found'
        });
      }
      
      // Send emergency support request
      await EmergencyLockController.sendEmergencySupportRequest(lock, message, contactInfo);
      
      // Add to audit log
      lock.auditLog.push({
        action: 'emergency_contact_notified',
        performedAt: new Date(),
        details: `Emergency support contacted: ${message}`,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      });
      
      await lock.save();
      
      res.status(200).json({
        success: true,
        message: 'Emergency support request sent successfully',
        supportInfo: {
          ticketId: `EMG-${Date.now()}`,
          estimatedResponse: 'Within 15 minutes',
          contactMethods: {
            email: 'emergency@etelios.com',
            phone: '+1-800-ETELIOS',
            chat: 'Available 24/7'
          }
        }
      });
      
    } catch (error) {
      logger.error('Error contacting emergency support:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to contact emergency support'
      });
    }
  }
  
  /**
   * Send Emergency Notifications
   */
  static async sendEmergencyNotifications(lock) {
    try {
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
        subject: `🚨 EMERGENCY LOCK ACTIVATED - Tenant: ${lock.tenantId}`,
        html: `
          <h2>🚨 Emergency Lock Activated</h2>
          <p><strong>Tenant:</strong> ${lock.tenantId}</p>
          <p><strong>Lock ID:</strong> ${lock.lockId}</p>
          <p><strong>Triggered By:</strong> ${lock.triggeredBy.userName} (${lock.triggeredBy.userRole})</p>
          <p><strong>Reason:</strong> ${lock.lockReason}</p>
          <p><strong>Description:</strong> ${lock.lockDescription}</p>
          <p><strong>Locked At:</strong> ${lock.lockedAt}</p>
          
          <h3>Recovery Keys:</h3>
          <p><strong>Customer Key:</strong> ${lock.recoveryKeys.customerKey}</p>
          <p><strong>Etelios Key:</strong> ${lock.recoveryKeys.eteliosKey}</p>
          
          <h3>Emergency Contacts:</h3>
          <ul>
            ${lock.emergencyContacts.map(contact => 
              `<li>${contact.name} (${contact.role}) - ${contact.email} - ${contact.phone}</li>`
            ).join('')}
          </ul>
          
          <p><em>This is an automated notification from the Etelios Emergency Lock System.</em></p>
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
        to: 'emergency@etelios.com'
      });
      
      logger.info(`Emergency notifications sent for lock ${lock.lockId}`);
      
    } catch (error) {
      logger.error('Error sending emergency notifications:', error);
    }
  }
  
  /**
   * Send Recovery Notification
   */
  static async sendRecoveryNotification(lock) {
    try {
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
        subject: `✅ SYSTEM RECOVERED - Tenant: ${lock.tenantId}`,
        html: `
          <h2>✅ System Successfully Recovered</h2>
          <p><strong>Tenant:</strong> ${lock.tenantId}</p>
          <p><strong>Lock ID:</strong> ${lock.lockId}</p>
          <p><strong>Recovered By:</strong> ${lock.recoveredBy.userName}</p>
          <p><strong>Recovery Method:</strong> ${lock.recoveredBy.recoveryMethod}</p>
          <p><strong>Recovered At:</strong> ${lock.recoveredBy.recoveredAt}</p>
          <p><strong>Lock Duration:</strong> ${Math.round((new Date(lock.recoveredBy.recoveredAt) - new Date(lock.lockedAt)) / (1000 * 60))} minutes</p>
          
          <p><em>System is now operational and accessible.</em></p>
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
      
      logger.info(`Recovery notification sent for lock ${lock.lockId}`);
      
    } catch (error) {
      logger.error('Error sending recovery notification:', error);
    }
  }
  
  /**
   * Send Emergency Support Request
   */
  static async sendEmergencySupportRequest(lock, message, contactInfo) {
    try {
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
        to: 'emergency@etelios.com',
        subject: `🚨 EMERGENCY SUPPORT REQUEST - Lock ID: ${lock.lockId}`,
        html: `
          <h2>🚨 Emergency Support Request</h2>
          <p><strong>Lock ID:</strong> ${lock.lockId}</p>
          <p><strong>Tenant:</strong> ${lock.tenantId}</p>
          <p><strong>Message:</strong> ${message}</p>
          
          <h3>Contact Information:</h3>
          <p><strong>Name:</strong> ${contactInfo.name}</p>
          <p><strong>Email:</strong> ${contactInfo.email}</p>
          <p><strong>Phone:</strong> ${contactInfo.phone}</p>
          
          <h3>Lock Details:</h3>
          <p><strong>Triggered By:</strong> ${lock.triggeredBy.userName} (${lock.triggeredBy.userRole})</p>
          <p><strong>Reason:</strong> ${lock.lockReason}</p>
          <p><strong>Locked At:</strong> ${lock.lockedAt}</p>
          
          <p><em>This is an urgent support request from the Etelios Emergency Lock System.</em></p>
        `
      };
      
      await transporter.sendMail(emailContent);
      
      logger.info(`Emergency support request sent for lock ${lock.lockId}`);
      
    } catch (error) {
      logger.error('Error sending emergency support request:', error);
    }
  }
}

module.exports = EmergencyLockController;
