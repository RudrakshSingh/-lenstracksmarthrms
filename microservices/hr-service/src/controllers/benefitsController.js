const Benefit = require('../models/Benefit.model');
const BenefitEnrollment = require('../models/BenefitEnrollment.model');
const User = require('../models/User.model');
const logger = require('../config/logger');
const { sendSuccess, sendError, createPagination, parsePagination } = require('../../../shared/utils/response.util.js');

/**
 * Get all benefits
 * GET /api/hr/benefits
 */
const getBenefits = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { search, category, status, type, cost } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.category = category;
    if (status) query.status = status;
    if (type) query.type = type;
    if (cost) {
      const costNum = parseFloat(cost);
      query.cost = { $lte: costNum };
    }

    const benefits = await Benefit.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Benefit.countDocuments(query);
    const pagination = createPagination(page, limit, total);

    return sendSuccess(res, benefits, 'Benefits retrieved successfully', pagination, 200);
  } catch (error) {
    logger.error('Error in getBenefits', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to retrieve benefits', 'Internal server error', 500);
  }
};

/**
 * Create benefit
 * POST /api/hr/benefits
 */
const createBenefit = async (req, res, next) => {
  try {
    const benefitData = {
      ...req.body,
      created_by: req.user._id
    };

    const benefit = new Benefit(benefitData);
    await benefit.save();

    return sendSuccess(res, benefit, 'Benefit created successfully', null, 201);
  } catch (error) {
    logger.error('Error in createBenefit', { error: error.message, stack: error.stack });
    if (error.name === 'ValidationError') {
      return sendError(res, error.message, 'Validation failed', 400);
    }
    return sendError(res, error.message || 'Failed to create benefit', 'Internal server error', 500);
  }
};

/**
 * Get benefits statistics
 * GET /api/hr/benefits/stats
 */
const getBenefitsStats = async (req, res, next) => {
  try {
    const [totalBenefits, activeBenefits, totalEnrollment, totalCost] = await Promise.all([
      Benefit.countDocuments(),
      Benefit.countDocuments({ status: 'Active' }),
      BenefitEnrollment.countDocuments({ status: 'Active' }),
      Benefit.aggregate([
        { $match: { status: 'Active' } },
        { $group: { _id: null, total: { $sum: '$cost' } } }
      ])
    ]);

    const stats = {
      totalBenefits,
      activeBenefits,
      totalEnrollment,
      totalCost: totalCost[0]?.total || 0,
      avgCostPerEmployee: totalEnrollment > 0 ? (totalCost[0]?.total || 0) / totalEnrollment : 0
    };

    return sendSuccess(res, stats, 'Benefits statistics retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getBenefitsStats', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to retrieve benefits statistics', 'Internal server error', 500);
  }
};

/**
 * Get benefits activity
 * GET /api/hr/benefits/activity
 */
const getBenefitsActivity = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const enrollments = await BenefitEnrollment.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('employee_id', 'fullName employeeId')
      .populate('benefit_id', 'name category')
      .lean();

    const activities = enrollments.map(enrollment => ({
      id: enrollment._id,
      type: 'enrollment',
      employee: enrollment.employee_id?.fullName || 'N/A',
      benefit: enrollment.benefit_id?.name || 'N/A',
      action: enrollment.status === 'Active' ? 'enrolled' : enrollment.status.toLowerCase(),
      time: enrollment.createdAt
    }));

    return sendSuccess(res, activities, 'Benefits activity retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getBenefitsActivity', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to retrieve benefits activity', 'Internal server error', 500);
  }
};

/**
 * Get pending tasks
 * GET /api/hr/benefits/pending-tasks
 */
const getPendingTasks = async (req, res, next) => {
  try {
    // Get enrollments pending approval or action
    const pendingEnrollments = await BenefitEnrollment.find({
      status: { $in: ['Pending', 'Active'] }
    })
      .populate('employee_id', 'fullName employeeId')
      .populate('benefit_id', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const tasks = pendingEnrollments.map(enrollment => ({
      id: enrollment._id,
      type: 'enrollment',
      employee: enrollment.employee_id?.fullName || 'N/A',
      benefit: enrollment.benefit_id?.name || 'N/A',
      status: enrollment.status,
      createdAt: enrollment.createdAt
    }));

    return sendSuccess(res, tasks, 'Pending tasks retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getPendingTasks', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to retrieve pending tasks', 'Internal server error', 500);
  }
};

/**
 * Enroll in benefit
 * POST /api/hr/benefits/enrollment
 */
const enrollInBenefit = async (req, res, next) => {
  try {
    const { employeeId, benefitId, enrollmentDate, dependents } = req.body;

    if (!employeeId || !benefitId) {
      return sendError(res, 'Validation failed', 'employeeId and benefitId are required', 400);
    }

    // Check if already enrolled
    const existingEnrollment = await BenefitEnrollment.findOne({
      employee_id: employeeId,
      benefit_id: benefitId,
      status: 'Active'
    });

    if (existingEnrollment) {
      return sendError(res, 'Already enrolled', 'Employee is already enrolled in this benefit', 409);
    }

    const enrollment = new BenefitEnrollment({
      employee_id: employeeId,
      benefit_id: benefitId,
      enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : new Date(),
      dependents: dependents || [],
      status: 'Active',
      created_by: req.user._id
    });

    await enrollment.save();

    // Update benefit enrollment count
    await Benefit.findByIdAndUpdate(benefitId, { $inc: { enrollment: 1 } });

    return sendSuccess(res, enrollment, 'Enrolled in benefit successfully', null, 201);
  } catch (error) {
    logger.error('Error in enrollInBenefit', { error: error.message, stack: error.stack });
    if (error.name === 'ValidationError') {
      return sendError(res, error.message, 'Validation failed', 400);
    }
    return sendError(res, error.message || 'Failed to enroll in benefit', 'Internal server error', 500);
  }
};

module.exports = {
  getBenefits,
  createBenefit,
  getBenefitsStats,
  getBenefitsActivity,
  getPendingTasks,
  enrollInBenefit
};

