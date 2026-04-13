const LeavePolicy = require('../models/LeavePolicy.model');
const LeaveLedger = require('../models/LeaveLedger.model');
const LeaveRequest = require('../models/LeaveRequest.model');
const User = require('../models/User.model');
const mongoose = require('mongoose');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');
const httpStatusPkg = require('http-status');
const httpStatus = httpStatusPkg.default || httpStatusPkg;

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
        attachments,
        tenantId
      } = requestData;
      
      const tenant = tenantId || 'default';
      
      // Get employee (validate ObjectId first) with tenant isolation
      let employeeIdObj = employee_id;
      if (!mongoose.Types.ObjectId.isValid(employee_id)) {
        const user = await User.findOne({ 
          tenantId: tenant,
          $or: [
            { employeeId: employee_id },
            { employee_id: employee_id }
          ]
        });
        if (!user) {
          throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
        }
        employeeIdObj = user._id;
      }
      
      const employee = await User.findOne({ _id: employeeIdObj, tenantId: tenant });
      if (!employee) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
      }
      
      // Get leave policy (make it optional - if not found, allow with default settings)
      let policy = null;
      try {
        policy = await this.getLeavePolicyForEmployee(employee_id);
      } catch (error) {
        logger.warn('Leave policy not found, using default settings', { employee_id, error: error.message });
      }
      
      // If no policy, create a default one or use default leave type config
      if (!policy) {
        // Use default leave type config
        const defaultLeaveTypes = {
          'CL': { days_per_year: 12, monthly_accrual: false, accrual_rate: 0, carry_forward: { enabled: false, max_days: 0 }, medical_certificate_required: false, blackout_dates: [] },
          'SL': { days_per_year: 6, monthly_accrual: false, accrual_rate: 0, carry_forward: { enabled: false, max_days: 0 }, medical_certificate_required: true, medical_certificate_after_days: 3, blackout_dates: [] },
          'EL': { days_per_year: 15, monthly_accrual: true, accrual_rate: 1.25, carry_forward: { enabled: true, max_days: 5 }, medical_certificate_required: false, blackout_dates: [] }
        };
        
        const defaultConfig = defaultLeaveTypes[leave_type] || defaultLeaveTypes['CL'];
        policy = {
          leave_types: [{
            leave_type: leave_type,
            days_per_year: defaultConfig.days_per_year,
            monthly_accrual: defaultConfig.monthly_accrual,
            accrual_rate: defaultConfig.accrual_rate,
            carry_forward: defaultConfig.carry_forward,
            medical_certificate_required: defaultConfig.medical_certificate_required,
            medical_certificate_after_days: defaultConfig.medical_certificate_after_days || 0,
            blackout_dates: defaultConfig.blackout_dates
          }],
          accrual_rules: {
            negative_balance_allowed: false
          }
        };
      }
      
      // Get leave type config
      let leaveTypeConfig = policy.leave_types.find(lt => lt.leave_type === leave_type);
      if (!leaveTypeConfig) {
        // If leave type not in policy, still allow but log warning
        logger.warn(`Leave type ${leave_type} not in policy, allowing with default settings`, { employee_id, leave_type });
        // Use default config for this leave type
        const defaultConfig = {
          leave_type: leave_type,
          medical_certificate_required: false,
          medical_certificate_after_days: 0,
          blackout_dates: []
        };
        policy.leave_types.push(defaultConfig);
        leaveTypeConfig = defaultConfig;
      }
      
      // Check blackout dates (if method exists)
      let isBlackout = false;
      try {
        if (typeof this.checkBlackoutDates === 'function' && leaveTypeConfig.blackout_dates && leaveTypeConfig.blackout_dates.length > 0) {
          isBlackout = this.checkBlackoutDates(from_date, to_date, leaveTypeConfig.blackout_dates);
          if (isBlackout && (!leaveTypeConfig.blackout_dates || !leaveTypeConfig.blackout_dates.some(bd => bd.requires_area_manager_approval))) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Leave request falls on blackout dates');
          }
        }
      } catch (error) {
        if (error.statusCode === 400) throw error;
        logger.warn('Error checking blackout dates', { error: error.message });
      }
      
      // Get current balance
      const currentYear = new Date().getFullYear();
      const ledger = await LeaveLedger.findOne({
        employee_id: employeeIdObj,
        'period.year': currentYear,
        leave_type
      });
      
      const balanceAvailable = ledger ? ledger.closing : 0;
      
      // Calculate days
      let days = 1;
      try {
        if (typeof this.calculateLeaveDays === 'function') {
          days = this.calculateLeaveDays(from_date, to_date, half_day);
        } else {
          // Simple calculation
          const start = new Date(from_date);
          const end = new Date(to_date);
          const diffTime = Math.abs(end - start);
          days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          if (half_day) days = 0.5;
        }
      } catch (error) {
        logger.warn('Error calculating leave days, using default', { error: error.message });
        days = 1;
      }
      
      // Check balance (only if policy has accrual rules)
      if (policy.accrual_rules && !policy.accrual_rules.negative_balance_allowed) {
        if (balanceAvailable < days) {
          throw new ApiError(httpStatus.BAD_REQUEST, `Insufficient leave balance. Available: ${balanceAvailable}, Requested: ${days}`);
        }
      }
      
      // Check medical certificate requirement
      const medicalCertificateRequired = leaveTypeConfig.medical_certificate_required && 
                                        days > (leaveTypeConfig.medical_certificate_after_days || 0);
      
      // Build approval chain (handle case where buildApprovalChain might not exist)
      let approvers = [];
      let currentApproverId = null;
      try {
        if (typeof this.buildApprovalChain === 'function') {
          approvers = this.buildApprovalChain(leaveTypeConfig, employee);
          currentApproverId = this.getFirstApprover ? this.getFirstApprover(leaveTypeConfig, employee) : null;
        }
      } catch (error) {
        logger.warn('Error building approval chain, using default', { error: error.message });
        // Default: No approvers, will be auto-approved or require manual approval
      }
      
      // Create request
      const request = new LeaveRequest({
        request_id: `LR-${employee.employeeId || employee.employee_id || employee.code || 'EMP'}-${Date.now()}`,
        employee_id: employeeIdObj,
        employee_code: employee.employeeId || employee.employee_id || employee.code || 'N/A',
        employee_name: employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown',
        leave_type,
        from_date: new Date(from_date),
        to_date: new Date(to_date),
        days,
        half_day: half_day || false,
        half_day_type: half_day_type || null,
        reason: reason || 'Leave request',
        attachments: attachments || [],
        medical_certificate: {
          required: medicalCertificateRequired
        },
        balance_available: balanceAvailable,
        balance_after: balanceAvailable - days,
        negative_balance: (balanceAvailable - days) < 0,
        status: 'PENDING',
        policy_id: policy?.policy_id || 'DEFAULT',
        tenantId: tenant,
        store_id: employee.workLocation?.storeId || employee.storeId || null,
        approvers: approvers,
        current_approver_id: currentApproverId,
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
   * Also updates LeaveBalance model for dashboard display
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
      
      // CRITICAL: Also update LeaveBalance model for dashboard display
      try {
        const LeaveBalance = require('../models/LeaveBalance.model');
        const leaveYear = new Date(request.from_date).getFullYear();
        
        // Find or create leave balance
        let leaveBalance = await LeaveBalance.findOne({
          employee: request.employee_id,
          leaveYear: leaveYear
        });
        
        if (!leaveBalance) {
          // Get employee to initialize balance
          const User = require('../models/User.model');
          const employee = await User.findById(request.employee_id);
          if (employee) {
            leaveBalance = await LeaveBalance.initializeForEmployee(
              employee.employeeId || employee.employee_id,
              employee._id,
              request.tenantId || 'default',
              leaveYear
            );
          }
        }
        
        if (leaveBalance) {
          // Map leave_type to LeaveBalance field
          const typeMap = {
            'CL': 'casualLeave',
            'SICK': 'sickLeave',
            'SL': 'sickLeave',
            'EL': 'earnedLeave',
            'EARNED': 'earnedLeave',
            'PAID': 'paidLeave',
            'PL': 'paidLeave',
            'MATERNITY': 'maternityPaternityLeave',
            'PATERNITY': 'maternityPaternityLeave',
            'COMP_OFF': 'compensatoryOff',
            'COMPENSATORY': 'compensatoryOff'
          };
          
          const field = typeMap[request.leave_type?.toUpperCase()];
          if (field && leaveBalance[field]) {
            // Increment used count
            // Note: available will be auto-calculated by pre-save hook (available = total - used)
            leaveBalance[field].used = (leaveBalance[field].used || 0) + request.days;
            
            await leaveBalance.save();
            
            logger.info('LeaveBalance updated after approval', {
              employeeId: request.employee_id,
              leaveType: request.leave_type,
              days: request.days,
              field: field,
              used: leaveBalance[field].used,
              available: leaveBalance[field].available
            });
          } else {
            logger.warn('Leave type not mapped to LeaveBalance field', {
              leaveType: request.leave_type,
              availableFields: Object.keys(typeMap)
            });
          }
        }
      } catch (balanceError) {
        // Don't fail the approval if balance update fails, but log it
        logger.error('Error updating LeaveBalance after approval', {
          error: balanceError.message,
          requestId: request._id,
          employeeId: request.employee_id
        });
      }
      
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

