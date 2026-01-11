const User = require('../models/User.model');
const Store = require('../models/Store.model');
const Department = require('../models/Department.model');
const LeaveBalance = require('../models/LeaveBalance.model');
const LeaveRequest = require('../models/LeaveRequest.model');
const leaveService = require('./leave.service');
const mongoose = require('mongoose');
const logger = require('../config/logger');
const axios = require('axios');

const ATTENDANCE_SERVICE_URL = process.env.ATTENDANCE_SERVICE_URL || 'http://attendance-service:3003';

/**
 * Get Unified Dashboard Data (Role-based)
 * Main dashboard endpoint that returns different widgets based on user role
 */
const getUnifiedDashboard = async (userId, role) => {
  try {
    logger.info('Fetching unified dashboard', { userId, role });

    // Get user details
    const user = await User.findById(userId)
      .populate('role', 'name permissions')
      .populate('store', 'name address coordinates')
      .populate('departmentRef', 'name code')
      .lean();

    if (!user) {
      throw new Error('User not found');
    }

    // Base widgets for all users
    const dashboardData = {
      user: {
        id: user.employeeId || user._id,
        name: user.fullName || `${user.firstName} ${user.lastName}`,
        role: role,
        department: user.department || user.departmentRef?.name,
        store: user.store?.name
      },
      widgets: {},
      quickActions: []
    };

    // Get attendance data for all users
    try {
      const attendanceResponse = await axios.get(
        `${ATTENDANCE_SERVICE_URL}/api/attendance/summary`,
        {
          params: { employeeId: user._id },
          timeout: 5000
        }
      );
      
      if (attendanceResponse.data.success) {
        dashboardData.widgets.attendance = attendanceResponse.data.data;
      }
    } catch (error) {
      logger.warn('Failed to fetch attendance data', { error: error.message });
      dashboardData.widgets.attendance = {
        today: { status: 'Unknown', checkIn: null, checkOut: null },
        weekly: { present: 0, total: 5 }
      };
    }

    // Tasks widget (placeholder - would integrate with task service)
    dashboardData.widgets.tasks = {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0
    };

    // Performance widget
    dashboardData.widgets.performance = {
      score: 75.0,
      grade: 'B',
      xp: 850,
      level: 3
    };

    // Roster widget (if user has store assignment)
    if (user.store) {
      dashboardData.widgets.roster = {
        today: {
          shift: 'MORNING',
          shiftStart: '09:00',
          shiftEnd: '18:00',
          storeName: user.store.name
        }
      };
    }

    // Payroll widget
    dashboardData.widgets.payroll = {
      currentMonth: {
        grossSalary: user.salary || 0,
        netSalary: (user.salary || 0) * 0.9, // Estimate
        status: 'Processing'
      }
    };

    // Leave balance widget (✅ LIVE - integrated with leave service)
    try {
      const leaveBalance = await leaveService.getLeaveBalance(user.employeeId);
      
      // Get pending leave requests count
      const pendingLeavesCount = await LeaveRequest.countDocuments({
        employee_id: user._id,
        status: 'pending'
      });
      
      dashboardData.widgets.leaves = {
        available: {
          casual: leaveBalance.casualLeave.available,
          sick: leaveBalance.sickLeave.available,
          earned: leaveBalance.earnedLeave.available,
          paid: leaveBalance.paidLeave.available,
          compensatoryOff: leaveBalance.compensatoryOff.available
        },
        total: {
          casual: leaveBalance.casualLeave.total,
          sick: leaveBalance.sickLeave.total,
          earned: leaveBalance.earnedLeave.total,
          paid: leaveBalance.paidLeave.total,
          compensatoryOff: leaveBalance.compensatoryOff.total
        },
        used: {
          casual: leaveBalance.casualLeave.used,
          sick: leaveBalance.sickLeave.used,
          earned: leaveBalance.earnedLeave.used,
          paid: leaveBalance.paidLeave.used,
          compensatoryOff: leaveBalance.compensatoryOff.used
        },
        pending: pendingLeavesCount,
        leaveYear: leaveBalance.leaveYear
      };
    } catch (error) {
      logger.warn('Failed to fetch leave balance', { error: error.message, userId: user._id });
      // Fallback to placeholder if service fails
      dashboardData.widgets.leaves = {
        available: {
          casual: 0,
          sick: 0,
          earned: 0
        },
        pending: 0
      };
    }

    // Quick actions for employees
    dashboardData.quickActions = [
      {
        label: 'Mark Attendance',
        icon: 'clock',
        route: '/attendance/mark'
      },
      {
        label: 'Apply Leave',
        icon: 'calendar',
        route: '/leaves/apply'
      },
      {
        label: 'View Tasks',
        icon: 'target',
        route: '/tasks'
      }
    ];

    // Role-specific widgets
    if (['manager', 'hr', 'admin', 'superadmin'].includes(role.toLowerCase())) {
      // Team widgets for managers
      dashboardData.widgets.teamPerformance = await getTeamPerformance(user);
      dashboardData.widgets.teamTasks = await getTeamTasks(user);
      dashboardData.widgets.teamAttendance = await getTeamAttendance(user);
    }

    if (['hr', 'admin', 'superadmin'].includes(role.toLowerCase())) {
      // HR-specific widgets
      dashboardData.widgets.recruitment = await getRecruitmentPipeline();
      dashboardData.widgets.compliance = await getComplianceTracker();
      dashboardData.widgets.payrollSummary = await getPayrollSummary();
    }

    return dashboardData;
  } catch (error) {
    logger.error('Error fetching unified dashboard', {
      error: error.message,
      userId,
      role
    });
    throw error;
  }
};

/**
 * Get Team Performance Widget Data
 */
const getTeamPerformance = async (user) => {
  try {
    const teamMembers = await User.find({
      $or: [
        { reportingManager: user._id },
        { department: user.department }
      ],
      isDeleted: false,
      status: 'active'
    }).select('employeeId fullName firstName lastName').lean();

    return {
      totalMembers: teamMembers.length,
      avgPerformance: 78.5,
      topPerformers: teamMembers.slice(0, 5).map(m => ({
        name: m.fullName || `${m.firstName} ${m.lastName}`,
        score: 85 + Math.random() * 15
      })),
      needsAttention: []
    };
  } catch (error) {
    logger.error('Error fetching team performance', { error: error.message });
    return { totalMembers: 0, avgPerformance: 0, topPerformers: [], needsAttention: [] };
  }
};

/**
 * Get Team Tasks Widget Data
 */
const getTeamTasks = async (user) => {
  return {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0
  };
};

/**
 * Get Team Attendance Widget Data
 */
const getTeamAttendance = async (user) => {
  try {
    const teamMembers = await User.find({
      $or: [
        { reportingManager: user._id },
        { department: user.department }
      ],
      isDeleted: false,
      status: 'active'
    }).select('employeeId fullName firstName lastName').lean();

    return {
      totalMembers: teamMembers.length,
      present: Math.floor(teamMembers.length * 0.9),
      absent: Math.floor(teamMembers.length * 0.05),
      onLeave: Math.floor(teamMembers.length * 0.05),
      late: 0
    };
  } catch (error) {
    logger.error('Error fetching team attendance', { error: error.message });
    return { totalMembers: 0, present: 0, absent: 0, onLeave: 0, late: 0 };
  }
};

/**
 * Get Recruitment Pipeline Widget Data
 */
const getRecruitmentPipeline = async () => {
  return {
    openPositions: 5,
    applicants: 45,
    interviews: 12,
    offersPending: 3
  };
};

/**
 * Get Compliance Tracker Widget Data
 */
const getComplianceTracker = async () => {
  return {
    pendingDocuments: 8,
    expiringCertificates: 3,
    policyAcknowledgments: 15,
    complianceScore: 92
  };
};

/**
 * Get Payroll Summary Widget Data
 */
const getPayrollSummary = async () => {
  return {
    monthlyPayroll: 5000000,
    processingStatus: 'Scheduled',
    pendingApprovals: 2,
    disbursementDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
  };
};

/**
 * Get Store Manager Dashboard
 */
const getStoreDashboard = async (storeId, managerId) => {
  try {
    logger.info('Fetching store dashboard', { storeId, managerId });

    // Get store details
    const store = await Store.findById(storeId)
      .populate('manager', 'fullName employeeId')
      .lean();

    if (!store) {
      throw new Error('Store not found');
    }

    // Get store staff
    const staffMembers = await User.find({
      store: storeId,
      isDeleted: false
    })
      .select('employeeId fullName firstName lastName role status')
      .populate('role', 'name')
      .lean();

    const dashboardData = {
      storeInfo: {
        id: store._id,
        name: store.name,
        code: store.code,
        location: store.address?.city,
        manager: store.manager?.fullName || 'Not Assigned',
        status: store.status
      },
      stats: {
        dailySales: 0, // Would integrate with sales service
        monthlySales: 0,
        monthlyTarget: 4000000,
        salesGrowth: 0,
        inventoryValue: 0, // Would integrate with inventory service
        lowStockItems: 0,
        totalStaff: staffMembers.length,
        activeStaff: staffMembers.filter(s => s.status === 'active').length,
        customerVisits: 0,
        transactions: 0
      },
      recentTransactions: [],
      lowStockItems: [],
      staffMembers: staffMembers.map(s => ({
        id: s.employeeId,
        name: s.fullName || `${s.firstName} ${s.lastName}`,
        role: s.role?.name || 'Employee',
        status: s.status,
        shift: 'Morning (9:00-18:00)' // Would integrate with roster
      }))
    };

    return dashboardData;
  } catch (error) {
    logger.error('Error fetching store dashboard', {
      error: error.message,
      storeId,
      managerId
    });
    throw error;
  }
};

/**
 * Get HRMS Dashboard
 */
const getHRMSDashboard = async (userId, role) => {
  try {
    logger.info('Fetching HRMS dashboard', { userId, role });

    if (['hr', 'admin', 'superadmin'].includes(role.toLowerCase())) {
      // HR Overview
      const totalEmployees = await User.countDocuments({
        isDeleted: false,
        status: { $in: ['active', 'on-leave'] }
      });

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const newHires = await User.countDocuments({
        isDeleted: false,
        createdAt: { $gte: thirtyDaysAgo }
      });

      return {
        overview: {
          totalEmployees,
          newHires,
          pendingApprovals: 0, // Would integrate with leave service
          attendanceRate: 94.5,
          openPositions: 5,
          attritionRate: 2.3
        },
        recentActivities: [],
        upcomingEvents: []
      };
    } else {
      // Employee Self-Service
      const user = await User.findById(userId).lean();

      return {
        myInfo: {
          attendance: { present: 22, absent: 0, leave: 0 },
          leaves: { available: 15, pending: 0 },
          tasks: { assigned: 0, completed: 0 },
          performance: { score: 75, grade: 'B' }
        },
        recentActivities: [],
        upcomingEvents: []
      };
    }
  } catch (error) {
    logger.error('Error fetching HRMS dashboard', { error: error.message, userId });
    throw error;
  }
};

/**
 * Get Dashboard Statistics (Legacy - for backwards compatibility)
 */
const getDashboardStats = async (role) => {
  try {
    const stats = {
      totalEmployees: 0,
      activeEmployees: 0,
      onLeave: 0,
      totalStores: 0,
      activeStores: 0,
      totalDepartments: 0
    };

    // Get employee counts
    const [total, active, onLeave] = await Promise.all([
      User.countDocuments({ isDeleted: false }),
      User.countDocuments({ isDeleted: false, status: 'active' }),
      User.countDocuments({ isDeleted: false, status: 'on-leave' })
    ]);

    stats.totalEmployees = total;
    stats.activeEmployees = active;
    stats.onLeave = onLeave;

    // Get store counts
    const [totalStores, activeStores] = await Promise.all([
      Store.countDocuments({ isDeleted: false }),
      Store.countDocuments({ isDeleted: false, status: 'active' })
    ]);

    stats.totalStores = totalStores;
    stats.activeStores = activeStores;

    // Get department count
    stats.totalDepartments = await Department.countDocuments({ status: 'active' });

    return stats;
  } catch (error) {
    logger.error('Error fetching dashboard stats', { error: error.message });
    throw error;
  }
};

module.exports = {
  getUnifiedDashboard,
  getStoreDashboard,
  getHRMSDashboard,
  getDashboardStats,
  getTeamPerformance,
  getRecruitmentPipeline,
  getComplianceTracker,
  getPayrollSummary
};

