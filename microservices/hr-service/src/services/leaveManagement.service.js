const LeavePolicy = require('../models/LeavePolicy.model');
const LeaveLedger = require('../models/LeaveLedger.model');
const LeaveRequest = require('../models/LeaveRequest.model');
const User = require('../models/User.model');
const mongoose = require('mongoose');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

class LeaveManagementService {
  
  /**
   * Get leave policy for employee
   */
  async getLeavePolicyForEmployee(employeeId) {
    try {
      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        // If not a valid ObjectId, try to find by employeeId string
        const user = await User.findOne({ employeeId: employeeId });
        if (!user) {
          throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
        }
        employeeId = user._id;
      }
      
      const employee = await User.findById(employeeId);
      if (!employee) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
      }
      
      // Find applicable policy based on role and store
      const policy = await LeavePolicy.findOne({
        $or: [
          { role_group: employee.roleFamily },
          { role_group: 'ALL' }
        ],
        $or: [
          { store_ids: { $in: [employee.workLocation?.storeId] } },
          { store_ids: { $size: 0 } }
        ],
        is_active: true,
        applicable_from: { $lte: new Date() },
        $or: [
          { applicable_to: null },
          { applicable_to: { $gte: new Date() } }
        ]
      }).sort({ version: -1 });
      
      return policy;
    } catch (error) {
      logger.error('Error getting leave policy for employee:', error);
      throw error;
    }
  }
  
  /**
   * Get leave ledger for employee
   */
  async getLeaveLedger(employeeId, year) {
    try {
      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        const user = await User.findOne({ employeeId: employeeId });
        if (!user) {
          throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
        }
        employeeId = user._id;
      }
      
      const employee = await User.findById(employeeId);
      if (!employee) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
      }
      
      const ledger = await LeaveLedger.find({
        employee_id: employeeId,
        'period.year': year || new Date().getFullYear()
      }).sort({ 'period.month': 1, leave_type: 1 });
      
      return ledger;
    } catch (error) {
      logger.error('Error getting leave ledger:', error);
      throw error;
    }
  }
  
  /**
   * Create leave request
   */
  async createLeaveRequest(requestData, createdBy) {
    try {
      const {
        employee_id,
        leave_type,
        from_date,
        to_date,
        reason,
        half_day,
        half_day_type,
        attachments
      } = requestData;
      
      // Get employee (validate ObjectId first)
      let employeeIdObj = employee_id;
      if (!mongoose.Types.ObjectId.isValid(employee_id)) {
        const user = await User.findOne({ employeeId: employee_id });
        if (!user) {
          throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
        }
        employeeIdObj = user._id;
      }
      
      const employee = await User.findById(employeeIdObj);
      if (!employee) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
      }
      
      // Get leave policy
      const policy = await this.getLeavePolicyForEmployee(employee_id);
      if (!policy) {
        throw new ApiError(httpStatus.NOT_FOUND, 'No active leave policy found for employee');
      }
      
      // Get leave type config
      const leaveTypeConfig = policy.leave_types.find(lt => lt.leave_type === leave_type);
      if (!leaveTypeConfig) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Leave type ${leave_type} not available for this employee`);
      }
      
      // Check blackout dates
      const isBlackout = this.checkBlackoutDates(from_date, to_date, leaveTypeConfig.blackout_dates);
      if (isBlackout && !leaveTypeConfig.blackout_dates.some(bd => bd.requires_area_manager_approval)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Leave request falls on blackout dates');
      }
      
      // Get current balance
      const currentYear = new Date().getFullYear();
      const ledger = await LeaveLedger.findOne({
        employee_id,
        'period.year': currentYear,
        leave_type
      });
      
      const balanceAvailable = ledger ? ledger.closing : 0;
      
      // Calculate days
      const days = this.calculateLeaveDays(from_date, to_date, half_day);
      
      // Check balance
      if (balanceAvailable < days && !policy.accrual_rules.negative_balance_allowed) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Insufficient leave balance. Available: ${balanceAvailable}, Requested: ${days}`);
      }
      
      // Check medical certificate requirement
      const medicalCertificateRequired = leaveTypeConfig.medical_certificate_required && 
                                        days > leaveTypeConfig.medical_certificate_after_days;
      
      // Create request
      const request = new LeaveRequest({
        request_id: `LR-${employee.code}-${Date.now()}`,
        employee_id,
        employee_code: employee.code,
        employee_name: employee.fullName,
        leave_type,
        from_date: new Date(from_date),
        to_date: new Date(to_date),
        days,
        half_day,
        half_day_type,
        reason,
        attachments,
        medical_certificate: {
          required: medicalCertificateRequired
        },
        balance_available: balanceAvailable,
        balance_after: balanceAvailable - days,
        negative_balance: (balanceAvailable - days) < 0,
        status: 'PENDING',
        policy_id: policy.policy_id,
        store_id: employee.workLocation?.storeId,
        approvers: this.buildApprovalChain(leaveTypeConfig, employee),
        current_approver_id: this.getFirstApprover(leaveTypeConfig, employee),
        sla_hours: 48,
        submitted_at: new Date(),
        created_by: createdBy
      });
      
      await request.save();
      
      logger.info(`Leave request created: ${request.request_id}`);
      return request;
    } catch (error) {
      logger.error('Error creating leave request:', error);
      throw error;
    }
  }
  
  /**
   * Approve leave request
   */
  async approveLeaveRequest(requestId, approverId, level, comments) {
    try {
      const request = await LeaveRequest.findById(requestId);
      if (!request) {
        throw new Error('Leave request not found');
      }
      
      // Find approver in chain
      const approver = request.approvers.find(a => a.level === level);
      if (!approver) {
        throw new Error('Approver level not found');
      }
      
      if (approver.status !== 'PENDING') {
        throw new Error('Request already processed at this level');
      }
      
      // Update approver
      approver.status = 'APPROVED';
      approver.approved_at = new Date();
      approver.comments = comments;
      
      // Check if all approvals done
      const allApproved = request.approvers.every(a => a.status === 'APPROVED');
      const hasRejected = request.approvers.some(a => a.status === 'REJECTED');
      
      if (hasRejected) {
        request.status = 'REJECTED';
        request.rejected_at = new Date();
      } else if (allApproved) {
        request.status = 'APPROVED';
        request.approved_at = new Date();
        request.approved_by = approverId;
        
        // Update leave ledger
        await this.updateLeaveLedger(request);
      } else {
        // Move to next approver
        const nextApprover = request.approvers.find(a => a.level === level + 1 && a.status === 'PENDING');
        if (nextApprover) {
          request.current_approver_id = nextApprover.approver_id;
        }
      }
      
      await request.save();
      
      logger.info(`Leave request ${requestId} approved at level ${level}`);
      return request;
    } catch (error) {
      logger.error('Error approving leave request:', error);
      throw error;
    }
  }
  
  /**
   * Update leave ledger after approval
   */
  async updateLeaveLedger(request) {
    try {
      const year = new Date(request.from_date).getFullYear();
      const month = new Date(request.from_date).getMonth() + 1;
      
      let ledger = await LeaveLedger.findOne({
        employee_id: request.employee_id,
        'period.year': year,
        'period.month': month,
        leave_type: request.leave_type
      });
      
      if (!ledger) {
        // Get previous month's closing balance
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        
        const prevLedger = await LeaveLedger.findOne({
          employee_id: request.employee_id,
          'period.year': prevYear,
          'period.month': prevMonth,
          leave_type: request.leave_type
        });
        
        ledger = new LeaveLedger({
          employee_id: request.employee_id,
          employee_code: request.employee_code,
          period: { year, month },
          leave_type: request.leave_type,
          opening: prevLedger ? prevLedger.closing : 0,
          accrual: 0,
          used: 0,
          encashed: 0,
          closing: prevLedger ? prevLedger.closing : 0
        });
      }
      
      // Update used
      ledger.used += request.days;
      ledger.used_details.push({
        request_id: request._id,
        days: request.days,
        from_date: request.from_date,
        to_date: request.to_date
      });
      
      await ledger.save();
      
      // Update request balance
      request.balance_after = ledger.closing;
      await request.save();
      
      return ledger;
    } catch (error) {
      logger.error('Error updating leave ledger:', error);
      throw error;
    }
  }
  
  /**
   * Calculate leave days
   */
  calculateLeaveDays(fromDate, toDate, halfDay) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diffTime = Math.abs(to - from);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return halfDay ? diffDays - 0.5 : diffDays;
  }
  
  /**
   * Check blackout dates
   */
  checkBlackoutDates(fromDate, toDate, blackoutDates) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    return blackoutDates.some(bd => {
      const bdStart = new Date(bd.start_date);
      const bdEnd = new Date(bd.end_date);
      return (from >= bdStart && from <= bdEnd) || (to >= bdStart && to <= bdEnd);
    });
  }
  
  /**
   * Build approval chain
   */
  buildApprovalChain(leaveTypeConfig, employee) {
    const approvers = [];
    const levels = leaveTypeConfig.approval_levels || 2;
    
    for (let i = 1; i <= levels; i++) {
      approvers.push({
        level: i,
        status: 'PENDING',
        sla_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
      });
    }
    
    return approvers;
  }
  
  /**
   * Get first approver
   */
  getFirstApprover(leaveTypeConfig, employee) {
    // This would typically get from employee's reporting manager
    // For now, return null and set in controller
    return null;
  }
  
  /**
   * Process monthly accrual
   */
  async processMonthlyAccrual(month, year) {
    try {
      // Get all active employees
      const employees = await Employee.find({ status: 'ACTIVE' });
      
      for (const employee of employees) {
        const policy = await this.getLeavePolicyForEmployee(employee._id);
        if (!policy) continue;
        
        for (const leaveType of policy.leave_types) {
          if (!leaveType.monthly_accrual) continue;
          
          // Get or create ledger
          let ledger = await LeaveLedger.findOne({
            employee_id: employee._id,
            'period.year': year,
            'period.month': month,
            leave_type: leaveType.leave_type
          });
          
          if (!ledger) {
            // Get previous month's closing
            const prevMonth = month === 1 ? 12 : month - 1;
            const prevYear = month === 1 ? year - 1 : year;
            
            const prevLedger = await LeaveLedger.findOne({
              employee_id: employee._id,
              'period.year': prevYear,
              'period.month': prevMonth,
              leave_type: leaveType.leave_type
            });
            
            ledger = new LeaveLedger({
              employee_id: employee._id,
              employee_code: employee.code,
              period: { year, month },
              leave_type: leaveType.leave_type,
              opening: prevLedger ? prevLedger.closing : 0,
              accrual: leaveType.accrual_rate || (leaveType.days_per_year / 12),
              used: 0,
              encashed: 0,
              closing: (prevLedger ? prevLedger.closing : 0) + (leaveType.accrual_rate || (leaveType.days_per_year / 12))
            });
          } else {
            // Update accrual
            ledger.accrual = leaveType.accrual_rate || (leaveType.days_per_year / 12);
            ledger.accrual_date = new Date();
          }
          
          await ledger.save();
        }
      }
      
      logger.info(`Monthly accrual processed for ${month}/${year}`);
      return { processed: employees.length };
    } catch (error) {
      logger.error('Error processing monthly accrual:', error);
      throw error;
    }
  }
}

module.exports = new LeaveManagementService();

