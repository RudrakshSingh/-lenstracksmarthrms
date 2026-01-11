const EmergencyLock = require('../models/EmergencyLock.model');
const logger = require('../config/logger');

/**
 * Emergency Lock Middleware
 * Checks if the system is locked and blocks access if necessary
 */
const emergencyLockMiddleware = async (req, res, next) => {
  try {
    // Skip lock check for certain paths
    const skipPaths = [
      '/health',
      '/api/auth/login',
      '/api/auth/emergency/unlock',
      '/api/auth/emergency/status',
      '/api/auth/emergency/recovery',
      '/api/auth/emergency/sos',
      '/api/auth/emergency/verify-keys',
      '/api/auth/emergency/contact',
      '/static',
      '/favicon.ico'
    ];
    
    const shouldSkip = skipPaths.some(path => req.path.startsWith(path));
    if (shouldSkip) {
      return next();
    }
    
    // Get tenant ID from request
    const tenantId = req.tenant?.subdomain || req.headers['x-tenant-id'] || 'default';
    
    // Check for active emergency lock
    const activeLock = await EmergencyLock.getActiveLock(tenantId);
    
    if (activeLock && activeLock.isLocked) {
      logger.warn(`Emergency lock active for tenant ${tenantId}. Blocking request to ${req.path}`);
      
      // Check if partial access is allowed for this module
      const currentModule = getModuleFromPath(req.path);
      const isModuleAllowed = activeLock.lockConfig.allowPartialAccess && 
                             activeLock.lockConfig.allowedModules.includes(currentModule);
      
      if (!isModuleAllowed) {
        return res.status(423).json({
          success: false,
          error: 'SYSTEM_LOCKED',
          message: activeLock.lockConfig.customLockMessage || activeLock.lockConfig.lockMessage,
          lockDetails: {
            lockId: activeLock.lockId,
            lockedAt: activeLock.lockedAt,
            lockReason: activeLock.lockReason,
            lockDescription: activeLock.lockDescription,
            triggeredBy: {
              userName: activeLock.triggeredBy.userName,
              userRole: activeLock.triggeredBy.userRole,
              triggeredAt: activeLock.lockedAt
            },
            showRecoveryForm: activeLock.lockConfig.showRecoveryForm,
            recoveryAttempts: activeLock.recoveryAttempts.length,
            maxRecoveryAttempts: activeLock.lockConfig.maxRecoveryAttempts,
            emergencyContacts: activeLock.emergencyContacts.map(contact => ({
              name: contact.name,
              email: contact.email,
              phone: contact.phone,
              role: contact.role
            }))
          },
          recoveryInfo: {
            message: 'To unlock the system, you need both recovery keys:',
            instructions: [
              '1. Enter your customer recovery key (provided during software installation)',
              '2. Contact Etelios support for the developer recovery key',
              '3. Both keys are required to unlock the system'
            ],
            supportContact: {
              email: 'support@etelios.com',
              phone: '+1-800-ETELIOS',
              emergency: 'emergency@etelios.com'
            }
          }
        });
      }
    }
    
    // Add lock status to request for logging
    req.emergencyLockStatus = activeLock ? 'locked' : 'unlocked';
    
    next();
  } catch (error) {
    logger.error('Emergency lock middleware error:', error);
    // In case of error, allow request to proceed but log the issue
    req.emergencyLockStatus = 'error';
    next();
  }
};

/**
 * Extract module name from request path
 */
const getModuleFromPath = (path) => {
  const pathSegments = path.split('/').filter(segment => segment);
  
  if (pathSegments.length >= 2) {
    const module = pathSegments[1]; // e.g., /api/hr/employees -> hr
    return module;
  }
  
  return 'unknown';
};

/**
 * SOS Emergency Lock Middleware
 * Special middleware for SOS button functionality
 */
const sosLockMiddleware = async (req, res, next) => {
  try {
    // Verify user has SOS permissions
    const user = req.user;
    if (!user || !['superadmin', 'admin', 'store_manager'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'Only administrators and store managers can trigger emergency locks'
      });
    }
    
    // Check if there's already an active lock
    const tenantId = req.tenant?.subdomain || req.headers['x-tenant-id'] || 'default';
    const existingLock = await EmergencyLock.getActiveLock(tenantId);
    
    if (existingLock) {
      return res.status(409).json({
        success: false,
        error: 'LOCK_ALREADY_ACTIVE',
        message: 'An emergency lock is already active',
        lockDetails: {
          lockId: existingLock.lockId,
          lockedAt: existingLock.lockedAt,
          triggeredBy: existingLock.triggeredBy.userName
        }
      });
    }
    
    next();
  } catch (error) {
    logger.error('SOS lock middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to process SOS lock request'
    });
  }
};

/**
 * Recovery Key Validation Middleware
 */
const recoveryKeyMiddleware = async (req, res, next) => {
  try {
    const { lockId, customerKey, eteliosKey } = req.body;
    
    if (!lockId || !customerKey || !eteliosKey) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_KEYS',
        message: 'Both customer key and Etelios key are required'
      });
    }
    
    // Validate key format (should be 32 character hex strings)
    const keyRegex = /^[a-fA-F0-9]{32}$/;
    if (!keyRegex.test(customerKey) || !keyRegex.test(eteliosKey)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_KEY_FORMAT',
        message: 'Recovery keys must be 32-character hexadecimal strings'
      });
    }
    
    // Check if lock exists and is active
    const lock = await EmergencyLock.findOne({ lockId, isLocked: true, status: 'active' });
    if (!lock) {
      return res.status(404).json({
        success: false,
        error: 'LOCK_NOT_FOUND',
        message: 'Emergency lock not found or not active'
      });
    }
    
    // Check recovery attempt limits
    if (lock.recoveryAttempts.length >= lock.lockConfig.maxRecoveryAttempts) {
      return res.status(429).json({
        success: false,
        error: 'MAX_ATTEMPTS_EXCEEDED',
        message: 'Maximum recovery attempts exceeded. Contact Etelios support.',
        supportContact: {
          email: 'support@etelios.com',
          phone: '+1-800-ETELIOS',
          emergency: 'emergency@etelios.com'
        }
      });
    }
    
    // Verify the keys
    const isValid = await EmergencyLock.verifyRecoveryKeys(lockId, customerKey, eteliosKey);
    
    // Record the attempt
    await lock.addRecoveryAttempt({
      customerKeyProvided: customerKey,
      eteliosKeyProvided: eteliosKey,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      success: isValid,
      failureReason: isValid ? null : 'Invalid recovery keys'
    });
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_KEYS',
        message: 'Invalid recovery keys provided',
        attemptsRemaining: lock.lockConfig.maxRecoveryAttempts - lock.recoveryAttempts.length - 1
      });
    }
    
    // Keys are valid, add lock info to request
    req.emergencyLock = lock;
    next();
  } catch (error) {
    logger.error('Recovery key middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to validate recovery keys'
    });
  }
};

module.exports = {
  emergencyLockMiddleware,
  sosLockMiddleware,
  recoveryKeyMiddleware
};
