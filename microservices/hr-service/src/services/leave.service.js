const LeaveBalance = require('../models/LeaveBalance.model');
const User = require('../models/User.model');
const logger = require('../config/logger');

/**
 * Leave Service - Business logic for leave management
 */
class LeaveService {
  /**
   * Get leave balance for an employee
   */
  async getLeaveBalance(employeeId, tenantId = 'default', leaveYear = null) {
    try {
      const year = leaveYear || new Date().getFullYear();

      // Find employee
      const employee = await User.findOne({ employeeId, tenantId });
      if (!employee) {
        const error = new Error('Employee not found');
        error.statusCode = 404;
        throw error;
      }

      // Find or create leave balance
      let leaveBalance = await LeaveBalance.findOne({
        employee: employee._id,
        leaveYear: year
      });

      if (!leaveBalance) {
        // Initialize leave balance for new employee
        leaveBalance = await LeaveBalance.initializeForEmployee(
          employeeId,
          employee._id,
          tenantId,
          year
        );
        logger.info('Leave balance initialized', { employeeId, leaveYear: year });
      }

      return leaveBalance;
    } catch (error) {
      logger.error('Error in getLeaveBalance service', { error: error.message, employeeId });
      throw error;
    }
  }

  /**
   * Update leave balance (for admin/HR)
   */
  async updateLeaveBalance(employeeId, updates, tenantId = 'default') {
    try {
      const year = new Date().getFullYear();

      // Find employee
      const employee = await User.findOne({ employeeId, tenantId });
      if (!employee) {
        const error = new Error('Employee not found');
        error.statusCode = 404;
        throw error;
      }

      // Find leave balance
      let leaveBalance = await LeaveBalance.findOne({
        employee: employee._id,
        leaveYear: year
      });

      if (!leaveBalance) {
        leaveBalance = await LeaveBalance.initializeForEmployee(
          employeeId,
          employee._id,
          tenantId,
          year
        );
      }

      // Update allowed fields
      const allowedLeaveTypes = [
        'casualLeave',
        'sickLeave',
        'earnedLeave',
        'paidLeave',
        'maternityPaternityLeave',
        'compensatoryOff'
      ];

      for (const leaveType of allowedLeaveTypes) {
        if (updates[leaveType]) {
          if (updates[leaveType].total !== undefined) {
            leaveBalance[leaveType].total = updates[leaveType].total;
          }
          if (updates[leaveType].used !== undefined) {
            leaveBalance[leaveType].used = updates[leaveType].used;
          }
        }
      }

      await leaveBalance.save();

      logger.info('Leave balance updated', { employeeId });

      return leaveBalance;
    } catch (error) {
      logger.error('Error in updateLeaveBalance service', { error: error.message, employeeId });
      throw error;
    }
  }

  /**
   * Deduct leave (when leave is approved)
   */
  async deductLeave(employeeId, leaveType, days, tenantId = 'default') {
    try {
      // Find employee
      const employee = await User.findOne({ employeeId, tenantId });
      if (!employee) {
        const error = new Error('Employee not found');
        error.statusCode = 404;
        throw error;
      }

      // Deduct leave using model method
      const leaveBalance = await LeaveBalance.deductLeave(employee._id, leaveType, days);

      logger.info('Leave deducted', { employeeId, leaveType, days });

      return leaveBalance;
    } catch (error) {
      logger.error('Error in deductLeave service', { error: error.message, employeeId });
      throw error;
    }
  }

  /**
   * Add compensatory off
   */
  async addCompensatoryOff(employeeId, days, tenantId = 'default') {
    try {
      // Find employee
      const employee = await User.findOne({ employeeId, tenantId });
      if (!employee) {
        const error = new Error('Employee not found');
        error.statusCode = 404;
        throw error;
      }

      // Add compensatory off using model method
      const leaveBalance = await LeaveBalance.addCompensatoryOff(employee._id, days);

      logger.info('Compensatory off added', { employeeId, days });

      return leaveBalance;
    } catch (error) {
      logger.error('Error in addCompensatoryOff service', { error: error.message, employeeId });
      throw error;
    }
  }

  /**
   * Reset leave balance for new year
   */
  async resetLeaveBalance(employeeId, newYear, tenantId = 'default') {
    try {
      // Find employee
      const employee = await User.findOne({ employeeId, tenantId });
      if (!employee) {
        const error = new Error('Employee not found');
        error.statusCode = 404;
        throw error;
      }

      // Check if balance already exists for new year
      const existingBalance = await LeaveBalance.findOne({
        employee: employee._id,
        leaveYear: newYear
      });

      if (existingBalance) {
        const error = new Error(`Leave balance already exists for year ${newYear}`);
        error.statusCode = 409;
        throw error;
      }

      // Create new leave balance for new year
      const leaveBalance = await LeaveBalance.initializeForEmployee(
        employeeId,
        employee._id,
        tenantId,
        newYear
      );

      logger.info('Leave balance reset for new year', { employeeId, newYear });

      return leaveBalance;
    } catch (error) {
      logger.error('Error in resetLeaveBalance service', { error: error.message, employeeId });
      throw error;
    }
  }

  /**
   * Get leave balances for all employees (bulk)
   */
  async getAllLeaveBalances(filters = {}, page = 1, limit = 100) {
    try {
      const {
        tenantId = 'default',
        leaveYear,
        department
      } = filters;

      const year = leaveYear || new Date().getFullYear();

      // Build query
      const query = { leaveYear: year };
      if (tenantId) query.tenantId = tenantId;

      const skip = (page - 1) * limit;

      let leaveBalances = await LeaveBalance.find(query)
        .populate('employee', 'firstName lastName email employeeId department')
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await LeaveBalance.countDocuments(query);

      // Filter by department if provided
      if (department) {
        leaveBalances = leaveBalances.filter(lb => 
          lb.employee && lb.employee.department === department
        );
      }

      return {
        data: leaveBalances,
        total: department ? leaveBalances.length : total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error in getAllLeaveBalances service', { error: error.message });
      throw error;
    }
  }
}

module.exports = new LeaveService();

