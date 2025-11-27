const mongoose = require('mongoose');
const User = require('../models/User.model');
const Role = require('../models/Role.model');
const Tenant = require('../models/Tenant.model');
const SystemSettings = require('../models/SystemSettings.model');
const logger = require('../config/logger');
const { sendSuccess, sendError } = require('../../shared/utils/response.util');

/**
 * Get admin health status
 * GET /api/admin/health
 */
const getAdminHealth = async (req, res, next) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'hr-service',
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: {
          status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
          readyState: mongoose.connection.readyState
        },
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
          percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100) + '%'
        },
        uptime: {
          seconds: Math.floor(process.uptime()),
          formatted: formatUptime(process.uptime())
        }
      }
    };

    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      health.status = 'unhealthy';
      health.checks.database.status = 'disconnected';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    return sendSuccess(res, health, 'Health check completed', null, statusCode);
  } catch (error) {
    logger.error('Error in getAdminHealth controller', { error: error.message });
    return sendError(res, 'Health check failed', 'Health check failed', 503);
  }
};

/**
 * Get admin metrics
 * GET /api/admin/metrics
 */
const getAdminMetrics = async (req, res, next) => {
  try {
    const [userCount, activeUserCount, roleCount, tenantCount, settingsCount] = await Promise.all([
      User.countDocuments({ isDeleted: false }),
      User.countDocuments({ isDeleted: false, is_active: true, status: 'active' }),
      Role.countDocuments({ is_active: true }),
      Tenant.countDocuments(),
      SystemSettings.countDocuments()
    ]);

    const metrics = {
      timestamp: new Date().toISOString(),
      users: {
        total: userCount,
        active: activeUserCount,
        inactive: userCount - activeUserCount
      },
      roles: {
        total: roleCount
      },
      tenants: {
        total: tenantCount
      },
      settings: {
        total: settingsCount
      },
      system: {
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
          percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100) + '%'
        },
        uptime: {
          seconds: Math.floor(process.uptime()),
          formatted: formatUptime(process.uptime())
        },
        nodeVersion: process.version,
        platform: process.platform
      }
    };

    return sendSuccess(res, metrics, 'Metrics retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getAdminMetrics controller', { error: error.message });
    next(error);
  }
};

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

module.exports = {
  getAdminHealth,
  getAdminMetrics
};

