const crypto = require('crypto');
const logger = require('../config/logger');
const nodemailer = require('nodemailer');

class RecoveryKeyManagementService {
  constructor() {
    this.keyStorage = new Map(); // In-memory storage for demo (use Redis in production)
    this.keyRotationInterval = 24 * 60 * 60 * 1000; // 24 hours
    this.maxKeyAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  }

  /**
   * Generate new recovery key pair
   */
  generateRecoveryKeys() {
    const customerKey = crypto.randomBytes(16).toString('hex');
    const eteliosKey = crypto.randomBytes(16).toString('hex');
    const keyPairId = crypto.randomUUID();
    
    const keyPair = {
      id: keyPairId,
      customerKey,
      eteliosKey,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.maxKeyAge),
      isActive: true,
      usageCount: 0,
      lastUsed: null
    };

    // Store in memory (use Redis in production)
    this.keyStorage.set(keyPairId, keyPair);
    
    logger.info(`Generated new recovery key pair: ${keyPairId}`);
    
    return keyPair;
  }

  /**
   * Validate recovery key pair
   */
  validateRecoveryKeys(customerKey, eteliosKey) {
    // Check format (32 character hex strings)
    const keyRegex = /^[a-fA-F0-9]{32}$/;
    if (!keyRegex.test(customerKey) || !keyRegex.test(eteliosKey)) {
      return {
        valid: false,
        error: 'INVALID_FORMAT',
        message: 'Recovery keys must be 32-character hexadecimal strings'
      };
    }

    // Check if keys exist in storage
    for (const [keyPairId, keyPair] of this.keyStorage) {
      if (keyPair.customerKey === customerKey && keyPair.eteliosKey === eteliosKey) {
        // Check if key pair is still active
        if (!keyPair.isActive) {
          return {
            valid: false,
            error: 'KEYS_INACTIVE',
            message: 'Recovery keys have been deactivated'
          };
        }

        // Check if keys have expired
        if (new Date() > keyPair.expiresAt) {
          return {
            valid: false,
            error: 'KEYS_EXPIRED',
            message: 'Recovery keys have expired'
          };
        }

        // Update usage statistics
        keyPair.usageCount++;
        keyPair.lastUsed = new Date();
        this.keyStorage.set(keyPairId, keyPair);

        return {
          valid: true,
          keyPairId,
          keyPair
        };
      }
    }

    return {
      valid: false,
      error: 'KEYS_NOT_FOUND',
      message: 'Recovery keys not found or invalid'
    };
  }

  /**
   * Deactivate recovery key pair
   */
  deactivateRecoveryKeys(keyPairId) {
    const keyPair = this.keyStorage.get(keyPairId);
    if (keyPair) {
      keyPair.isActive = false;
      keyPair.deactivatedAt = new Date();
      this.keyStorage.set(keyPairId, keyPair);
      
      logger.info(`Deactivated recovery key pair: ${keyPairId}`);
      return true;
    }
    return false;
  }

  /**
   * Rotate recovery keys for a tenant
   */
  async rotateRecoveryKeys(tenantId, reason = 'scheduled_rotation') {
    try {
      // Generate new key pair
      const newKeyPair = this.generateRecoveryKeys();
      
      // Send new keys to tenant
      await this.sendNewRecoveryKeys(tenantId, newKeyPair, reason);
      
      logger.info(`Rotated recovery keys for tenant: ${tenantId}`);
      
      return newKeyPair;
    } catch (error) {
      logger.error(`Error rotating recovery keys for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Send new recovery keys to tenant
   */
  async sendNewRecoveryKeys(tenantId, keyPair, reason) {
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
      subject: `🔑 New Recovery Keys - Tenant: ${tenantId}`,
      html: `
        <h2>🔑 New Recovery Keys Generated</h2>
        <p><strong>Tenant:</strong> ${tenantId}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><strong>Generated At:</strong> ${keyPair.createdAt}</p>
        <p><strong>Expires At:</strong> ${keyPair.expiresAt}</p>
        
        <h3>⚠️ IMPORTANT: Store These Keys Securely</h3>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
          <p><strong>Customer Recovery Key:</strong></p>
          <code style="background-color: #e9ecef; padding: 5px; font-family: monospace;">${keyPair.customerKey}</code>
          
          <p><strong>Etelios Recovery Key:</strong></p>
          <code style="background-color: #e9ecef; padding: 5px; font-family: monospace;">${keyPair.eteliosKey}</code>
        </div>
        
        <h3>Security Instructions:</h3>
        <ul>
          <li>Store these keys in a secure location</li>
          <li>Do not share these keys with unauthorized personnel</li>
          <li>Both keys are required to unlock the system</li>
          <li>Contact Etelios support if you need assistance</li>
        </ul>
        
        <p><em>This is an automated message from the Etelios Recovery Key Management System.</em></p>
      `
    };

    // Send to tenant admin
    await transporter.sendMail({
      ...emailContent,
      to: `admin@${tenantId}.com` // This would be the tenant's admin email
    });

    // Send to Etelios support
    await transporter.sendMail({
      ...emailContent,
      to: 'keys@etelios.com'
    });
  }

  /**
   * Get key usage statistics
   */
  getKeyUsageStats() {
    const stats = {
      totalKeyPairs: this.keyStorage.size,
      activeKeyPairs: 0,
      expiredKeyPairs: 0,
      deactivatedKeyPairs: 0,
      totalUsage: 0,
      recentUsage: 0
    };

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const [keyPairId, keyPair] of this.keyStorage) {
      if (keyPair.isActive) {
        stats.activeKeyPairs++;
      } else {
        stats.deactivatedKeyPairs++;
      }

      if (new Date() > keyPair.expiresAt) {
        stats.expiredKeyPairs++;
      }

      stats.totalUsage += keyPair.usageCount;

      if (keyPair.lastUsed && keyPair.lastUsed > oneDayAgo) {
        stats.recentUsage++;
      }
    }

    return stats;
  }

  /**
   * Clean up expired keys
   */
  cleanupExpiredKeys() {
    const now = new Date();
    let cleanedCount = 0;

    for (const [keyPairId, keyPair] of this.keyStorage) {
      if (now > keyPair.expiresAt) {
        this.keyStorage.delete(keyPairId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired recovery key pairs`);
    }

    return cleanedCount;
  }

  /**
   * Export key pair for backup
   */
  exportKeyPair(keyPairId) {
    const keyPair = this.keyStorage.get(keyPairId);
    if (!keyPair) {
      throw new Error('Key pair not found');
    }

    return {
      id: keyPair.id,
      customerKey: keyPair.customerKey,
      eteliosKey: keyPair.eteliosKey,
      createdAt: keyPair.createdAt,
      expiresAt: keyPair.expiresAt,
      isActive: keyPair.isActive,
      usageCount: keyPair.usageCount,
      lastUsed: keyPair.lastUsed
    };
  }

  /**
   * Import key pair from backup
   */
  importKeyPair(keyPairData) {
    const keyPair = {
      id: keyPairData.id,
      customerKey: keyPairData.customerKey,
      eteliosKey: keyPairData.eteliosKey,
      createdAt: new Date(keyPairData.createdAt),
      expiresAt: new Date(keyPairData.expiresAt),
      isActive: keyPairData.isActive,
      usageCount: keyPairData.usageCount || 0,
      lastUsed: keyPairData.lastUsed ? new Date(keyPairData.lastUsed) : null
    };

    this.keyStorage.set(keyPair.id, keyPair);
    logger.info(`Imported recovery key pair: ${keyPair.id}`);
    
    return keyPair;
  }

  /**
   * Generate emergency backup keys
   */
  generateEmergencyBackupKeys(tenantId) {
    const emergencyKeyPair = this.generateRecoveryKeys();
    
    // Mark as emergency backup
    emergencyKeyPair.isEmergencyBackup = true;
    emergencyKeyPair.tenantId = tenantId;
    emergencyKeyPair.createdAt = new Date();
    emergencyKeyPair.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    this.keyStorage.set(emergencyKeyPair.id, emergencyKeyPair);
    
    logger.warn(`Generated emergency backup keys for tenant: ${tenantId}`);
    
    return emergencyKeyPair;
  }

  /**
   * Validate emergency backup keys
   */
  validateEmergencyBackupKeys(customerKey, eteliosKey) {
    const validation = this.validateRecoveryKeys(customerKey, eteliosKey);
    
    if (validation.valid) {
      const keyPair = validation.keyPair;
      if (keyPair.isEmergencyBackup) {
        return {
          valid: true,
          isEmergencyBackup: true,
          keyPairId: validation.keyPairId,
          keyPair
        };
      }
    }
    
    return validation;
  }

  /**
   * Get all key pairs for a tenant
   */
  getTenantKeyPairs(tenantId) {
    const tenantKeys = [];
    
    for (const [keyPairId, keyPair] of this.keyStorage) {
      if (keyPair.tenantId === tenantId) {
        tenantKeys.push({
          id: keyPair.id,
          createdAt: keyPair.createdAt,
          expiresAt: keyPair.expiresAt,
          isActive: keyPair.isActive,
          isEmergencyBackup: keyPair.isEmergencyBackup || false,
          usageCount: keyPair.usageCount,
          lastUsed: keyPair.lastUsed
        });
      }
    }
    
    return tenantKeys.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Start key rotation scheduler
   */
  startKeyRotationScheduler() {
    // Run cleanup every hour
    setInterval(() => {
      this.cleanupExpiredKeys();
    }, 60 * 60 * 1000);

    // Run key rotation check daily
    setInterval(async () => {
      await this.checkAndRotateKeys();
    }, 24 * 60 * 60 * 1000);

    logger.info('Recovery key rotation scheduler started');
  }

  /**
   * Check and rotate keys if needed
   */
  async checkAndRotateKeys() {
    const now = new Date();
    const rotationThreshold = new Date(now.getTime() - this.keyRotationInterval);

    for (const [keyPairId, keyPair] of this.keyStorage) {
      if (keyPair.isActive && keyPair.createdAt < rotationThreshold) {
        // Key is old enough for rotation
        if (keyPair.tenantId) {
          await this.rotateRecoveryKeys(keyPair.tenantId, 'scheduled_rotation');
        }
      }
    }
  }
}

// Create singleton instance
const keyManagementService = new RecoveryKeyManagementService();

module.exports = keyManagementService;
