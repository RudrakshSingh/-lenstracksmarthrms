const logger = require('../config/logger');
const User = require('../models/User.model');
const Department = require('../models/Department.model');
const Store = require('../models/Store.model');
const LeaveRequest = require('../models/LeaveRequest.model');
const PayrollRun = require('../models/PayrollRun.model');
const { sendSuccess, sendError } = require('../../../shared/utils/response.util.js');

/**
 * Get dashboard statistics
 * GET /api/hr/dashboard/stats
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get employee statistics
    const [
      totalEmployees,
      activeEmployees,
      newHires,
      totalStores,
      pendingLeaves,
      avgSalary,
      attendanceRate
    ] = await Promise.all([
      User.countDocuments({ isDeleted: { $ne: true } }),
      User.countDocuments({ 
        isDeleted: { $ne: true },
        status: { $in: ['active', 'ACTIVE'] }
      }),
      User.countDocuments({
        isDeleted: { $ne: true },
        createdAt: { $gte: startOfMonth }
      }),
      Store.countDocuments({ status: { $ne: 'inactive' } }),
      LeaveRequest.countDocuments({ 
        status: 'pending',
        from_date: { $gte: now }
      }),
      // Calculate average salary from payroll runs
      PayrollRun.aggregate([
        { $match: { month: now.getMonth() + 1, year: now.getFullYear() } },
        { $unwind: '$payroll_items' },
        { $group: { _id: null, avgSalary: { $avg: '$payroll_items.net_pay' } } }
      ]).then(result => result[0]?.avgSalary || 0),
      // Calculate attendance rate (simplified - would need actual attendance data)
      Promise.resolve(85) // Placeholder - would calculate from attendance records
    ]);

    // Get performance score (placeholder - would calculate from performance data)
    const performanceScore = 78; // Placeholder

    // Get training statistics (placeholder - would calculate from training data)
    const totalPrograms = 0; // Placeholder
    const activePrograms = 0; // Placeholder
    const totalEnrolled = 0; // Placeholder
    const avgCoverage = 0; // Placeholder

    // Get benefits statistics (placeholder - would calculate from benefits data)
    const totalCost = 0; // Placeholder
    const satisfaction = 0; // Placeholder

    const stats = {
      totalEmployees,
      activeEmployees,
      newHires,
      attendanceRate,
      totalStores,
      avgSalary: Math.round(avgSalary),
      pendingLeaves,
      performanceScore,
      totalPrograms,
      activePrograms,
      totalEnrolled,
      avgCoverage,
      totalCost,
      satisfaction
    };

    return sendSuccess(res, stats, 'Dashboard statistics retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getDashboardStats', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to retrieve dashboard statistics', 'Internal server error', 500);
  }
};

/**
 * Get recent activities
 * GET /api/hr/dashboard/recent-activities
 */
const getRecentActivities = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const activities = [];

    // Get recent employee hires
    const recentHires = await User.find({
      isDeleted: { $ne: true },
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('employeeId fullName department createdAt')
    .populate('department', 'name')
    .lean();

    recentHires.forEach(emp => {
      activities.push({
        id: emp._id,
        type: 'hire',
        employee: emp.fullName || `${emp.employeeId}`,
        department: emp.department?.name || 'N/A',
        time: emp.createdAt,
        status: 'completed'
      });
    });

    // Get recent leave requests
    const recentLeaves = await LeaveRequest.find()
      .sort({ submitted_at: -1 })
      .limit(5)
      .select('employee_id leave_type from_date to_date status submitted_at')
      .populate('employee_id', 'fullName employeeId')
      .lean();

    recentLeaves.forEach(leave => {
      activities.push({
        id: leave._id,
        type: 'leave',
        employee: leave.employee_id?.fullName || leave.employee_id?.employeeId || 'N/A',
        department: 'N/A', // Would need to populate
        time: leave.submitted_at,
        status: leave.status === 'approved' ? 'completed' : leave.status === 'pending' ? 'pending' : 'in-progress'
      });
    });

    // Sort by time (most recent first) and limit
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    const limitedActivities = activities.slice(0, limit);

    return sendSuccess(res, limitedActivities, 'Recent activities retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getRecentActivities', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to retrieve recent activities', 'Internal server error', 500);
  }
};

/**
 * Get department overview for dashboard
 * GET /api/hr/dashboard/departments
 */
const getDashboardDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({ status: 'active' })
      .select('name code head employeeCount')
      .populate('head', 'fullName employeeId')
      .lean();

    // Get employee count for each department
    const departmentsWithCounts = await Promise.all(
      departments.map(async (dept) => {
        const employeeCount = await User.countDocuments({
          isDeleted: { $ne: true },
          department: dept._id,
          status: { $in: ['active', 'ACTIVE'] }
        });

        return {
          id: dept._id,
          name: dept.name,
          code: dept.code,
          manager: dept.head?.fullName || 'N/A',
          managerName: dept.head?.fullName || 'N/A',
          employees: employeeCount,
          employeeCount: employeeCount
        };
      })
    );

    return sendSuccess(res, departmentsWithCounts, 'Department overview retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getDashboardDepartments', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to retrieve department overview', 'Internal server error', 500);
  }
};

module.exports = {
  getDashboardStats,
  getRecentActivities,
  getDashboardDepartments
};

