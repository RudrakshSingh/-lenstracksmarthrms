const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../config/logger');
const {
  getMyMetrics,
  getMyTrends,
  getMyPeers,
  getPerformanceReviews,
  getPerformanceAnalytics
} = require('../controllers/performanceController');

// All routes require authentication
router.use(authenticate);

// Routes
// CRITICAL: Employee performance routes MUST be registered FIRST to avoid route conflicts
// Express matches routes in order, so specific routes must come before generic ones

// Get employee performance by ID - MUST be FIRST before other /performance routes
// Route: /api/hr/performance/employee/:employeeId OR /api/performance/employee/:employeeId
// Use exact match pattern to avoid conflicts with /performance/me routes
router.get(
  '/performance/employee/:employeeId',
  requireRole(['hr', 'admin', 'manager', 'employee'], []), // Make permission optional
  asyncHandler(async (req, res, next) => {
    const { employeeId } = req.params;
    const { period = 'monthly' } = req.query;
    
    try {
      const User = require('../models/User.model');
      const PerformanceReview = require('../models/PerformanceReview.model');
      const mongoose = require('mongoose');
      const logger = require('../config/logger');
      
      // CRITICAL: Get tenantId for tenant isolation
      const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
      
      // Try to find employee by employee_id string first (most common), then by Mongo ID
      let employee = null;
      
      // Check if employeeId is a valid Mongo ID (exactly 24 hex characters)
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(employeeId);
      
      // ALWAYS try employee_id string first (most common case - e.g., "EMP-2026-116865")
      // CRITICAL: Add tenantId filter for tenant isolation
      try {
        const employeeQuery = {
          $or: [
            { employee_id: employeeId },
            { employeeId: employeeId }
          ]
        };
        
        // Add tenantId filter if available
        if (tenantId && tenantId !== 'default') {
          employeeQuery.tenantId = tenantId;
        }
        
        employee = await User.findOne(employeeQuery).select('fullName employeeId employee_id name').lean();
      } catch (findError) {
        logger.warn('employee_id lookup failed', { employeeId, error: findError.message });
      }
      
      // If not found and it's a valid ObjectId, try by ID with tenant filter
      if (!employee && isValidObjectId) {
        try {
          const idQuery = { _id: employeeId };
          // Add tenantId filter if available
          if (tenantId && tenantId !== 'default') {
            idQuery.tenantId = tenantId;
          }
          employee = await User.findOne(idQuery).select('fullName employeeId employee_id name').lean();
        } catch (findError) {
          logger.warn('findById failed', { employeeId, error: findError.message });
        }
      }
      
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found',
          error: 'EMPLOYEE_NOT_FOUND'
        });
      }
      
      // Use the actual employee_id from the found employee
      const actualEmployeeId = employee.employee_id || employee.employeeId || employeeId;
      
      // Calculate date range based on period
      const now = new Date();
      let periodStart, periodEnd;
      
      if (period === 'weekly') {
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - 7);
        periodEnd = now;
      } else if (period === 'monthly') {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      } else if (period === 'quarterly') {
        const quarter = Math.floor(now.getMonth() / 3);
        periodStart = new Date(now.getFullYear(), quarter * 3, 1);
        periodEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
      } else {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }
      
      // Build review query with tenant isolation
      const reviewQuery = {
        $or: [
          { employee_id: actualEmployeeId },
          { employee: employee._id }
        ],
        period: period,
        periodStart: { $gte: periodStart },
        periodEnd: { $lte: periodEnd }
      };
      
      // Add tenantId filter if available
      if (tenantId && tenantId !== 'default') {
        reviewQuery.tenantId = tenantId;
      }
      
      const review = await PerformanceReview.findOne(reviewQuery).sort({ periodStart: -1 }).lean();
      
      if (!review) {
        return res.json({
          success: true,
          data: {
            employeeId: employee.employee_id || employee.employeeId || actualEmployeeId,
            employeeName: employee.fullName || employee.name || 'Unknown',
            overallScore: 0,
            breakdown: {
              completion: 0,
              sla: 0,
              quality: 0,
              efficiency: 0,
              reliability: 0
            },
            period: period
          },
          message: 'Performance metrics retrieved successfully (no review found)'
        });
      }
      
      return res.json({
        success: true,
        data: {
          employeeId: employee.employee_id || employee.employeeId || actualEmployeeId,
          employeeName: employee.fullName || employee.name || 'Unknown',
          overallScore: review.overallScore || 0,
          breakdown: review.breakdown || {
            completion: 0,
            sla: 0,
            quality: 0,
            efficiency: 0,
            reliability: 0
          },
          period: period,
          reviewDate: review.periodStart
        },
        message: 'Performance metrics retrieved successfully'
      });
    } catch (error) {
      logger.error('Error in getEmployeePerformance', { error: error.message, stack: error.stack });
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve employee performance',
        error: error.message
      });
    }
  })
);

router.get(
  '/performance/me/metrics',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.performance.read'),
  asyncHandler(getMyMetrics)
);

router.get(
  '/performance/me/trends',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.performance.read'),
  asyncHandler(getMyTrends)
);

router.get(
  '/performance/me/peers',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.performance.read'),
  asyncHandler(getMyPeers)
);

router.get(
  '/performance/reviews',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.performance.read'),
  asyncHandler(getPerformanceReviews)
);

router.get(
  '/performance/analytics',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.performance.read'),
  asyncHandler(getPerformanceAnalytics)
);

// Also support /employee/:employeeId when mounted at /api/performance
router.get(
  '/employee/:employeeId',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.performance.read'),
  asyncHandler(async (req, res, next) => {
    const { employeeId } = req.params;
    const { period = 'monthly' } = req.query;
    
    try {
      const User = require('../models/User.model');
      const PerformanceReview = require('../models/PerformanceReview.model');
      const mongoose = require('mongoose');
      
        // Try to find employee by employee_id string first (most common), then by Mongo ID
        let employee = null;
        
        // Check if employeeId is a valid Mongo ID (exactly 24 hex characters)
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(employeeId);
        
        // ALWAYS try employee_id string first (most common case - e.g., "EMP-2026-116865")
        try {
          employee = await User.findOne({ 
            $or: [
              { employee_id: employeeId },
              { employeeId: employeeId }
            ]
          }).select('fullName employeeId employee_id name').lean();
        } catch (findError) {
          logger.warn('employee_id lookup failed', { employeeId, error: findError.message });
        }
        
        // If not found and it's a valid ObjectId, try by ID
        if (!employee && isValidObjectId) {
          try {
            employee = await User.findById(employeeId).select('fullName employeeId employee_id name').lean();
          } catch (findError) {
            logger.warn('findById failed', { employeeId, error: findError.message });
          }
        }
      
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found',
          error: 'EMPLOYEE_NOT_FOUND'
        });
      }
      
      // Use the actual employee_id from the found employee
      const actualEmployeeId = employee.employee_id || employee.employeeId || employeeId;
      
      // Calculate date range based on period
      const now = new Date();
      let periodStart, periodEnd;
      
      if (period === 'weekly') {
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - 7);
        periodEnd = now;
      } else if (period === 'monthly') {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      } else if (period === 'quarterly') {
        const quarter = Math.floor(now.getMonth() / 3);
        periodStart = new Date(now.getFullYear(), quarter * 3, 1);
        periodEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
      } else {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }
      
      // Build review query with tenant isolation
      const reviewQuery = {
        $or: [
          { employee_id: actualEmployeeId },
          { employee: employee._id }
        ],
        period: period,
        periodStart: { $gte: periodStart },
        periodEnd: { $lte: periodEnd }
      };
      
      // Add tenantId filter if available
      if (tenantId && tenantId !== 'default') {
        reviewQuery.tenantId = tenantId;
      }
      
      const review = await PerformanceReview.findOne(reviewQuery).sort({ periodStart: -1 }).lean();
      
      if (!review) {
        return res.json({
          success: true,
          data: {
            employeeId: employee.employee_id || employee.employeeId || actualEmployeeId,
            employeeName: employee.fullName || employee.name || 'Unknown',
            overallScore: 0,
            breakdown: {
              completion: 0,
              sla: 0,
              quality: 0,
              efficiency: 0,
              reliability: 0
            },
            period: period
          },
          message: 'Performance metrics retrieved successfully (no review found)'
        });
      }
      
      return res.json({
        success: true,
        data: {
          employeeId: employee.employee_id || employee.employeeId || actualEmployeeId,
          employeeName: employee.fullName || employee.name || 'Unknown',
          overallScore: review.overallScore || 0,
          breakdown: review.breakdown || {
            completion: 0,
            sla: 0,
            quality: 0,
            efficiency: 0,
            reliability: 0
          },
          period: period,
          reviewDate: review.periodStart
        },
        message: 'Performance metrics retrieved successfully'
      });
    } catch (error) {
      logger.error('Error in getEmployeePerformance', { error: error.message, stack: error.stack });
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve employee performance',
        error: error.message
      });
    }
  })
);

// My performance routes - must come AFTER employee/:id routes
router.get(
  '/performance/me/metrics',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.performance.read'),
  asyncHandler(getMyMetrics)
);

router.get(
  '/performance/me/trends',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.performance.read'),
  asyncHandler(getMyTrends)
);

router.get(
  '/performance/me/peers',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.performance.read'),
  asyncHandler(getMyPeers)
);

router.get(
  '/performance/reviews',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.performance.read'),
  asyncHandler(getPerformanceReviews)
);

router.get(
  '/performance/analytics',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.performance.read'),
  asyncHandler(getPerformanceAnalytics)
);

module.exports = router;

