const PerformanceReview = require('../models/PerformanceReview.model');
const User = require('../models/User.model');
const logger = require('../config/logger');
const { sendSuccess, sendError } = require('../../shared/utils/response.util.js');

/**
 * Get performance metrics for current user
 * GET /api/hr/performance/me/metrics
 */
const getMyMetrics = async (req, res, next) => {
  try {
    const { period } = req.query;
    const employeeId = req.user._id;

    if (!period || !['weekly', 'monthly', 'quarterly'].includes(period)) {
      return sendError(res, 'Validation failed', 'period is required and must be weekly, monthly, or quarterly', 400);
    }

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
    }

    const review = await PerformanceReview.findOne({
      employee_id: employeeId,
      period: period,
      periodStart: { $gte: periodStart },
      periodEnd: { $lte: periodEnd }
    }).sort({ periodStart: -1 }).lean();

    if (!review) {
      // Return default metrics if no review exists
      return sendSuccess(res, {
        overallScore: 0,
        breakdown: {
          completion: 0,
          sla: 0,
          quality: 0,
          efficiency: 0,
          reliability: 0
        },
        period: period
      }, 'Performance metrics retrieved successfully', null, 200);
    }

    const metrics = {
      overallScore: review.overallScore || 0,
      breakdown: review.breakdown || {
        completion: 0,
        sla: 0,
        quality: 0,
        efficiency: 0,
        reliability: 0
      },
      period: period
    };

    return sendSuccess(res, metrics, 'Performance metrics retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getMyMetrics', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to retrieve performance metrics', 'Internal server error', 500);
  }
};

/**
 * Get performance trends
 * GET /api/hr/performance/me/trends
 */
const getMyTrends = async (req, res, next) => {
  try {
    const { period } = req.query;
    const employeeId = req.user._id;

    if (!period) {
      return sendError(res, 'Validation failed', 'period is required', 400);
    }

    // Get last 6 periods
    const reviews = await PerformanceReview.find({
      employee_id: employeeId,
      period: period
    })
    .sort({ periodStart: -1 })
    .limit(6)
    .select('periodStart overallScore breakdown')
    .lean();

    const trends = reviews.map(review => ({
      period: review.periodStart,
      score: review.overallScore || 0,
      breakdown: review.breakdown || {}
    }));

    return sendSuccess(res, trends, 'Performance trends retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getMyTrends', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to retrieve performance trends', 'Internal server error', 500);
  }
};

/**
 * Get peer comparison
 * GET /api/hr/performance/me/peers
 */
const getMyPeers = async (req, res, next) => {
  try {
    const { period } = req.query;
    const employeeId = req.user._id;
    const currentUser = await User.findById(employeeId).select('department store role').lean();

    if (!period) {
      return sendError(res, 'Validation failed', 'period is required', 400);
    }

    // Find peers (same department/store/role)
    const peerQuery = {
      isDeleted: { $ne: true },
      status: { $in: ['active', 'ACTIVE'] }
    };
    if (currentUser.department) peerQuery.department = currentUser.department;
    if (currentUser.store) peerQuery.store = currentUser.store;
    if (currentUser.role) peerQuery.role = currentUser.role;

    const peers = await User.find(peerQuery)
      .select('_id fullName employeeId')
      .limit(10)
      .lean();

    // Get performance reviews for peers
    const peerIds = peers.map(p => p._id);
    const peerReviews = await PerformanceReview.find({
      employee_id: { $in: peerIds },
      period: period
    })
    .sort({ overallScore: -1 })
    .lean();

    const peerComparison = peerReviews.map(review => {
      const peer = peers.find(p => p._id.toString() === review.employee_id.toString());
      return {
        employeeId: peer?.employeeId || 'N/A',
        employeeName: peer?.fullName || 'N/A',
        score: review.overallScore || 0,
        breakdown: review.breakdown || {}
      };
    });

    return sendSuccess(res, peerComparison, 'Peer comparison retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getMyPeers', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to retrieve peer comparison', 'Internal server error', 500);
  }
};

/**
 * Get performance reviews
 * GET /api/hr/performance/reviews
 */
const getPerformanceReviews = async (req, res, next) => {
  try {
    const { employeeId, period, status, page = 1, limit = 10 } = req.query;

    const query = {};
    if (employeeId) query.employee_id = employeeId;
    if (period) query.period = period;
    if (status) query.status = status;

    const reviews = await PerformanceReview.find(query)
      .populate('employee_id', 'fullName employeeId')
      .populate('reviewer_id', 'fullName')
      .sort({ periodStart: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await PerformanceReview.countDocuments(query);

    return sendSuccess(res, reviews, 'Performance reviews retrieved successfully', {
      page: parseInt(page),
      limit: parseInt(limit),
      totalRecords: total,
      totalPages: Math.ceil(total / limit)
    }, 200);
  } catch (error) {
    logger.error('Error in getPerformanceReviews', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to retrieve performance reviews', 'Internal server error', 500);
  }
};

/**
 * Get performance analytics
 * GET /api/hr/performance/analytics
 */
const getPerformanceAnalytics = async (req, res, next) => {
  try {
    const { period, department } = req.query;

    const query = {};
    if (period) query.period = period;

    // Get all reviews
    let reviews = await PerformanceReview.find(query)
      .populate('employee_id', 'department store')
      .lean();

    // Filter by department if provided
    if (department) {
      reviews = reviews.filter(r => r.employee_id?.department === department);
    }

    // Calculate analytics
    const totalReviews = reviews.length;
    const avgScore = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + (r.overallScore || 0), 0) / totalReviews
      : 0;

    const scoreDistribution = {
      excellent: reviews.filter(r => (r.overallScore || 0) >= 90).length,
      good: reviews.filter(r => (r.overallScore || 0) >= 75 && (r.overallScore || 0) < 90).length,
      average: reviews.filter(r => (r.overallScore || 0) >= 60 && (r.overallScore || 0) < 75).length,
      belowAverage: reviews.filter(r => (r.overallScore || 0) < 60).length
    };

    const analytics = {
      totalReviews,
      avgScore: Math.round(avgScore * 100) / 100,
      scoreDistribution,
      period: period || 'all'
    };

    return sendSuccess(res, analytics, 'Performance analytics retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getPerformanceAnalytics', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to retrieve performance analytics', 'Internal server error', 500);
  }
};

module.exports = {
  getMyMetrics,
  getMyTrends,
  getMyPeers,
  getPerformanceReviews,
  getPerformanceAnalytics
};

