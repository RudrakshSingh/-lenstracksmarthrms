const TrainingProgram = require('../models/TrainingProgram.model');
const TrainingProgress = require('../models/TrainingProgress.model');
const User = require('../models/User.model');
const logger = require('../config/logger');
const { sendSuccess, sendError, createPagination, parsePagination } = require('../../../shared/utils/response.util.js');

/**
 * Get training programs
 * GET /api/hr/training/programs
 */
const getTrainingPrograms = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { search, category, status } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { programName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.category = category;
    if (status) query.status = status;

    const programs = await TrainingProgram.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await TrainingProgram.countDocuments(query);
    const pagination = createPagination(page, limit, total);

    return sendSuccess(res, programs, 'Training programs retrieved successfully', pagination, 200);
  } catch (error) {
    logger.error('Error in getTrainingPrograms', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to retrieve training programs', 'Internal server error', 500);
  }
};

/**
 * Create training program
 * POST /api/hr/training/programs
 */
const createTrainingProgram = async (req, res, next) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user._id) {
      return sendError(res, 'Authentication required', 'User not authenticated', 401);
    }

    const programData = {
      ...req.body,
      created_by: req.user._id
    };

    const program = new TrainingProgram(programData);
    await program.save();

    return sendSuccess(res, program, 'Training program created successfully', null, 201);
  } catch (error) {
    logger.error('Error in createTrainingProgram', { error: error.message, stack: error.stack });
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map(e => e.message).join(', ');
      return sendError(res, validationErrors || error.message, 'Validation failed', 400);
    }
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return sendError(res, `${field} already exists`, 'Duplicate entry', 409);
    }
    return sendError(res, error.message || 'Failed to create training program', 'Internal server error', 500);
  }
};

/**
 * Get training progress
 * GET /api/hr/training/progress
 */
const getTrainingProgress = async (req, res, next) => {
  try {
    const { employeeId, programId, status } = req.query;

    const query = {};
    if (employeeId) query.employee_id = employeeId;
    if (programId) query.program_id = programId;
    if (status) query.status = status;

    const progress = await TrainingProgress.find(query)
      .populate('employee_id', 'fullName employeeId')
      .populate('program_id', 'programName category')
      .sort({ updatedAt: -1 })
      .lean();

    const formattedProgress = progress.map(p => ({
      id: p._id,
      employee: p.employee || p.employee_id?.fullName || 'N/A',
      store: p.store || 'N/A',
      role: p.role || 'N/A',
      watchPercent: p.watchPercent,
      quizScore: p.quizScore,
      status: p.status,
      lastEvent: p.lastEvent
    }));

    return sendSuccess(res, formattedProgress, 'Training progress retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getTrainingProgress', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to retrieve training progress', 'Internal server error', 500);
  }
};

/**
 * Get training statistics
 * GET /api/hr/training/stats
 */
const getTrainingStats = async (req, res, next) => {
  try {
    const [totalPrograms, activePrograms, totalEnrolled, certifiedCount] = await Promise.all([
      TrainingProgram.countDocuments(),
      TrainingProgram.countDocuments({ status: 'Active' }),
      TrainingProgress.countDocuments(),
      TrainingProgress.countDocuments({ status: 'Certified' })
    ]);

    const avgCoverage = totalEnrolled > 0 ? (certifiedCount / totalEnrolled) * 100 : 0;

    const stats = {
      totalPrograms,
      activePrograms,
      totalEnrolled,
      certifiedCount,
      avgCoverage: Math.round(avgCoverage * 100) / 100
    };

    return sendSuccess(res, stats, 'Training statistics retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getTrainingStats', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to retrieve training statistics', 'Internal server error', 500);
  }
};

/**
 * Get training activity
 * GET /api/hr/training/activity
 */
const getTrainingActivity = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const activities = await TrainingProgress.find()
      .sort({ updatedAt: -1 })
      .limit(limit)
      .populate('employee_id', 'fullName employeeId')
      .populate('program_id', 'programName')
      .lean();

    const formattedActivities = activities.map(activity => ({
      id: activity._id,
      employee: activity.employee_id?.fullName || 'N/A',
      program: activity.program_id?.programName || 'N/A',
      status: activity.status,
      watchPercent: activity.watchPercent,
      quizScore: activity.quizScore,
      time: activity.updatedAt
    }));

    return sendSuccess(res, formattedActivities, 'Training activity retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getTrainingActivity', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to retrieve training activity', 'Internal server error', 500);
  }
};

/**
 * Get training leaderboard
 * GET /api/hr/training/leaderboard
 */
const getTrainingLeaderboard = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const leaderboard = await TrainingProgress.aggregate([
      {
        $group: {
          _id: '$employee_id',
          totalPrograms: { $sum: 1 },
          certifiedPrograms: {
            $sum: { $cond: [{ $eq: ['$status', 'Certified'] }, 1, 0] }
          },
          avgQuizScore: { $avg: '$quizScore' },
          avgWatchPercent: { $avg: '$watchPercent' }
        }
      },
      {
        $sort: { certifiedPrograms: -1, avgQuizScore: -1 }
      },
      {
        $limit: limit
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'employee'
        }
      },
      {
        $unwind: { path: '$employee', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          employeeId: '$employee.employeeId',
          employeeName: '$employee.fullName',
          totalPrograms: 1,
          certifiedPrograms: 1,
          avgQuizScore: { $round: ['$avgQuizScore', 2] },
          avgWatchPercent: { $round: ['$avgWatchPercent', 2] }
        }
      }
    ]);

    return sendSuccess(res, leaderboard, 'Training leaderboard retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getTrainingLeaderboard', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to retrieve training leaderboard', 'Internal server error', 500);
  }
};

module.exports = {
  getTrainingPrograms,
  createTrainingProgram,
  getTrainingProgress,
  getTrainingStats,
  getTrainingActivity,
  getTrainingLeaderboard
};

