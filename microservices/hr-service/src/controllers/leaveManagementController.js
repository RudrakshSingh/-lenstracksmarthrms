const Holiday = require('../models/Holiday.model');
const BlackoutPeriod = require('../models/BlackoutPeriod.model');
const ApprovalWorkflow = require('../models/ApprovalWorkflow.model');
const LeavePolicy = require('../models/LeavePolicy.model');
const SystemSettings = require('../models/SystemSettings.model');
const LeaveRequest = require('../models/LeaveRequest.model');
const User = require('../models/User.model');
const { sendSuccess, sendError } = require('../../shared/utils/response.util.js');
const logger = require('../config/logger');
const mongoose = require('mongoose');

/**
 * Leave Type Management
 */

/**
 * @desc Create leave type
 * @route POST /api/hr/policies/leave/types
 * @access Private (HR/Admin)
 */
const createLeaveType = async (req, res, next) => {
  try {
    const { code, name, annualAllocation, accrual, carryForward, maxContinuous, active } = req.body;
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    
    if (!code || !name || annualAllocation === undefined) {
      return sendError(res, 'code, name, and annualAllocation are required', 'VALIDATION_ERROR', 400);
    }
    
    // Find or create leave policy for tenant
    let policy = await LeavePolicy.findOne({ 
      $or: [
        { tenantId },
        { tenantId: { $exists: false } } // Backward compatibility
      ],
      is_active: true 
    });
    
    if (!policy) {
      // Create default policy if doesn't exist
      policy = new LeavePolicy({
        policy_id: `POL-${tenantId}-${Date.now()}`,
        name: `${tenantId} Leave Policy`,
        version: '1.0',
        role_group: 'ALL',
        applicable_from: new Date(),
        tenantId,
        is_active: true,
        created_by: req.user._id || req.user.id
      });
    } else {
      // Update tenantId if missing
      if (!policy.tenantId) {
        policy.tenantId = tenantId;
        await policy.save();
      }
    }
    
    // Check if leave type already exists
    const existingType = policy.leave_types.find(lt => lt.leave_type === code.toUpperCase());
    if (existingType) {
      return sendError(res, `Leave type ${code} already exists`, 'ALREADY_EXISTS', 400);
    }
    
    // Add new leave type
    policy.leave_types.push({
      leave_type: code.toUpperCase(),
      days_per_year: annualAllocation,
      monthly_accrual: accrual && accrual.includes('Monthly'),
      accrual_rate: accrual ? parseFloat(accrual.match(/\d+\.?\d*/)?.[0] || 0) : 0,
      carry_forward: {
        enabled: carryForward > 0,
        max_days: carryForward || 0
      },
      special_rules: {
        maxContinuous: maxContinuous || null,
        active: active !== false
      }
    });
    
    await policy.save();
    
    const leaveType = policy.leave_types[policy.leave_types.length - 1];
    
    return sendSuccess(res, {
      id: leaveType._id,
      code: leaveType.leave_type,
      name,
      annualAllocation: leaveType.days_per_year,
      accrual,
      carryForward: leaveType.carry_forward.max_days,
      maxContinuous: leaveType.special_rules.maxContinuous,
      active: leaveType.special_rules.active !== false
    }, 'Leave type created successfully');
  } catch (error) {
    logger.error('Error in createLeaveType controller:', error);
    next(error);
  }
};

/**
 * @desc Update leave type
 * @route PUT /api/hr/policies/leave/types/:id
 * @access Private (HR/Admin)
 */
const updateLeaveType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, name, annualAllocation, accrual, carryForward, maxContinuous, active } = req.body;
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    
    // Find policy
    const policy = await LeavePolicy.findOne({ 
      $or: [
        { tenantId },
        { tenantId: { $exists: false } } // Backward compatibility
      ],
      is_active: true 
    });
    
    if (!policy) {
      return sendError(res, 'Leave policy not found', 'NOT_FOUND', 404);
    }
    
    // Find leave type
    const leaveTypeIndex = policy.leave_types.findIndex(lt => lt._id.toString() === id);
    if (leaveTypeIndex === -1) {
      return sendError(res, 'Leave type not found', 'NOT_FOUND', 404);
    }
    
    const leaveType = policy.leave_types[leaveTypeIndex];
    
    // Update fields
    if (code) leaveType.leave_type = code.toUpperCase();
    if (annualAllocation !== undefined) leaveType.days_per_year = annualAllocation;
    if (accrual) {
      leaveType.monthly_accrual = accrual.includes('Monthly');
      leaveType.accrual_rate = parseFloat(accrual.match(/\d+\.?\d*/)?.[0] || 0);
    }
    if (carryForward !== undefined) {
      leaveType.carry_forward.enabled = carryForward > 0;
      leaveType.carry_forward.max_days = carryForward;
    }
    if (maxContinuous !== undefined) {
      leaveType.special_rules.maxContinuous = maxContinuous;
    }
    if (active !== undefined) {
      leaveType.special_rules.active = active;
    }
    
    await policy.save();
    
    return sendSuccess(res, {
      id: leaveType._id,
      code: leaveType.leave_type,
      name: name || leaveType.leave_type,
      annualAllocation: leaveType.days_per_year,
      accrual: leaveType.monthly_accrual ? `Monthly ${leaveType.accrual_rate}/day` : 'Annual Fixed',
      carryForward: leaveType.carry_forward.max_days,
      maxContinuous: leaveType.special_rules.maxContinuous,
      active: leaveType.special_rules.active !== false
    }, 'Leave type updated successfully');
  } catch (error) {
    logger.error('Error in updateLeaveType controller:', error);
    next(error);
  }
};

/**
 * Holidays Management
 */

/**
 * @desc Get holidays
 * @route GET /api/hr/holidays
 * @access Private
 */
const getHolidays = async (req, res, next) => {
  try {
    const { year, storeId, region } = req.query;
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    
    const query = { tenantId, isActive: true };
    
    if (year) {
      const yearNum = parseInt(year);
      query.date = {
        $gte: new Date(yearNum, 0, 1),
        $lt: new Date(yearNum + 1, 0, 1)
      };
    }
    
    if (storeId) {
      query.storeId = storeId;
    }
    
    if (region) {
      query.region = region;
    }
    
    const holidays = await Holiday.find(query)
      .populate('storeId', 'name code')
      .sort({ date: 1 })
      .lean();
    
    return sendSuccess(res, holidays.map(h => ({
      id: h._id,
      date: h.date.toISOString().split('T')[0],
      name: h.name,
      type: h.type,
      applicableTo: h.applicableTo,
      store: h.storeId ? { id: h.storeId._id, name: h.storeId.name } : null
    })), 'Holidays retrieved successfully');
  } catch (error) {
    logger.error('Error in getHolidays controller:', error);
    next(error);
  }
};

/**
 * @desc Create holiday
 * @route POST /api/hr/holidays
 * @access Private (HR/Admin)
 */
const createHoliday = async (req, res, next) => {
  try {
    const { date, name, type, applicableTo, storeId, region, state } = req.body;
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    
    if (!date || !name) {
      return sendError(res, 'date and name are required', 'VALIDATION_ERROR', 400);
    }
    
    const holiday = new Holiday({
      tenantId,
      date: new Date(date),
      name,
      type: type || 'National',
      applicableTo: applicableTo || 'All Stores',
      storeId: storeId || null,
      region: region || null,
      state: state || null,
      isActive: true,
      created_by: req.user._id || req.user.id
    });
    
    await holiday.save();
    
    return sendSuccess(res, {
      id: holiday._id,
      date: holiday.date.toISOString().split('T')[0],
      name: holiday.name,
      type: holiday.type,
      applicableTo: holiday.applicableTo
    }, 'Holiday created successfully', 201);
  } catch (error) {
    logger.error('Error in createHoliday controller:', error);
    next(error);
  }
};

/**
 * @desc Update holiday
 * @route PUT /api/hr/holidays/:id
 * @access Private (HR/Admin)
 */
const updateHoliday = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, name, type, applicableTo, storeId, region, state, isActive } = req.body;
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    
    const holiday = await Holiday.findOne({ _id: id, tenantId });
    
    if (!holiday) {
      return sendError(res, 'Holiday not found', 'NOT_FOUND', 404);
    }
    
    if (date) holiday.date = new Date(date);
    if (name) holiday.name = name;
    if (type) holiday.type = type;
    if (applicableTo) holiday.applicableTo = applicableTo;
    if (storeId !== undefined) holiday.storeId = storeId;
    if (region !== undefined) holiday.region = region;
    if (state !== undefined) holiday.state = state;
    if (isActive !== undefined) holiday.isActive = isActive;
    holiday.updated_by = req.user._id || req.user.id;
    
    await holiday.save();
    
    return sendSuccess(res, {
      id: holiday._id,
      date: holiday.date.toISOString().split('T')[0],
      name: holiday.name,
      type: holiday.type,
      applicableTo: holiday.applicableTo
    }, 'Holiday updated successfully');
  } catch (error) {
    logger.error('Error in updateHoliday controller:', error);
    next(error);
  }
};

/**
 * Blackout Periods Management
 */

/**
 * @desc Get blackout periods
 * @route GET /api/hr/leave/blackout
 * @access Private
 */
const getBlackoutPeriods = async (req, res, next) => {
  try {
    const { year, leaveType } = req.query;
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    
    const query = { tenantId, isActive: true };
    
    if (year) {
      const yearNum = parseInt(year);
      query.$or = [
        { startDate: { $gte: new Date(yearNum, 0, 1), $lt: new Date(yearNum + 1, 0, 1) } },
        { endDate: { $gte: new Date(yearNum, 0, 1), $lt: new Date(yearNum + 1, 0, 1) } }
      ];
    }
    
    if (leaveType) {
      query.leaveTypes = leaveType.toUpperCase();
    }
    
    const blackouts = await BlackoutPeriod.find(query)
      .populate('departmentIds', 'name')
      .populate('storeIds', 'name code')
      .sort({ startDate: 1 })
      .lean();
    
    return sendSuccess(res, blackouts.map(b => ({
      id: b._id,
      startDate: b.startDate.toISOString().split('T')[0],
      endDate: b.endDate.toISOString().split('T')[0],
      description: b.description,
      applicableTo: b.applicableTo,
      leaveTypes: b.leaveTypes,
      departments: b.departmentIds,
      stores: b.storeIds
    })), 'Blackout periods retrieved successfully');
  } catch (error) {
    logger.error('Error in getBlackoutPeriods controller:', error);
    next(error);
  }
};

/**
 * @desc Create blackout period
 * @route POST /api/hr/leave/blackout
 * @access Private (HR/Admin)
 */
const createBlackoutPeriod = async (req, res, next) => {
  try {
    const { startDate, endDate, description, applicableTo, leaveTypes, departmentIds, storeIds, requiresAreaManagerApproval } = req.body;
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    
    if (!startDate || !endDate || !description) {
      return sendError(res, 'startDate, endDate, and description are required', 'VALIDATION_ERROR', 400);
    }
    
    const blackout = new BlackoutPeriod({
      tenantId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      description,
      applicableTo: applicableTo || 'All Employees',
      leaveTypes: leaveTypes || ['CL', 'EL'],
      departmentIds: departmentIds || [],
      storeIds: storeIds || [],
      requiresAreaManagerApproval: requiresAreaManagerApproval || false,
      isActive: true,
      created_by: req.user._id || req.user.id
    });
    
    await blackout.save();
    
    return sendSuccess(res, {
      id: blackout._id,
      startDate: blackout.startDate.toISOString().split('T')[0],
      endDate: blackout.endDate.toISOString().split('T')[0],
      description: blackout.description,
      applicableTo: blackout.applicableTo,
      leaveTypes: blackout.leaveTypes
    }, 'Blackout period created successfully', 201);
  } catch (error) {
    logger.error('Error in createBlackoutPeriod controller:', error);
    next(error);
  }
};

/**
 * @desc Update blackout period
 * @route PUT /api/hr/leave/blackout/:id
 * @access Private (HR/Admin)
 */
const updateBlackoutPeriod = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, description, applicableTo, leaveTypes, departmentIds, storeIds, requiresAreaManagerApproval, isActive } = req.body;
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    
    const blackout = await BlackoutPeriod.findOne({ _id: id, tenantId });
    
    if (!blackout) {
      return sendError(res, 'Blackout period not found', 'NOT_FOUND', 404);
    }
    
    if (startDate) blackout.startDate = new Date(startDate);
    if (endDate) blackout.endDate = new Date(endDate);
    if (description) blackout.description = description;
    if (applicableTo) blackout.applicableTo = applicableTo;
    if (leaveTypes) blackout.leaveTypes = leaveTypes;
    if (departmentIds) blackout.departmentIds = departmentIds;
    if (storeIds) blackout.storeIds = storeIds;
    if (requiresAreaManagerApproval !== undefined) blackout.requiresAreaManagerApproval = requiresAreaManagerApproval;
    if (isActive !== undefined) blackout.isActive = isActive;
    blackout.updated_by = req.user._id || req.user.id;
    
    await blackout.save();
    
    return sendSuccess(res, {
      id: blackout._id,
      startDate: blackout.startDate.toISOString().split('T')[0],
      endDate: blackout.endDate.toISOString().split('T')[0],
      description: blackout.description,
      applicableTo: blackout.applicableTo,
      leaveTypes: blackout.leaveTypes
    }, 'Blackout period updated successfully');
  } catch (error) {
    logger.error('Error in updateBlackoutPeriod controller:', error);
    next(error);
  }
};

/**
 * Leave Approval Workflow
 */

/**
 * @desc Get leave workflow config
 * @route GET /api/hr/leave/workflow
 * @access Private
 */
const getLeaveWorkflow = async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    
    // Find leave workflow (workflow_type: 'LEAVE')
    let workflow = await ApprovalWorkflow.findOne({
      workflow_type: 'LEAVE',
      is_active: true,
      is_default: true,
      $or: [
        { tenantId: tenantId },
        { tenantId: { $exists: false } } // Backward compatibility
      ]
    }).lean();
    
    if (!workflow) {
      // Return default workflow structure
      workflow = {
        steps: [
          {
            id: 1,
            name: 'Reporting Manager',
            required: true,
            autoApprove: false,
            timeLimit: 48,
            timeoutAction: 'Escalate'
          },
          {
            id: 2,
            name: 'HR Manager',
            required: true,
            autoApprove: false,
            timeLimit: 24,
            timeoutAction: 'Escalate'
          }
        ],
        parallelApprovals: false,
        requireAllApprovals: true
      };
    } else {
      // Transform to frontend format
      workflow = {
        steps: workflow.levels.map((level, index) => ({
          id: level.level,
          name: level.approver_role,
          required: level.is_required,
          autoApprove: level.auto_approve,
          timeLimit: level.timeout_hours,
          timeoutAction: 'Escalate' // Default
        })),
        parallelApprovals: false,
        requireAllApprovals: true
      };
    }
    
    return sendSuccess(res, workflow, 'Workflow config retrieved successfully');
  } catch (error) {
    logger.error('Error in getLeaveWorkflow controller:', error);
    next(error);
  }
};

/**
 * @desc Save leave workflow config
 * @route PUT /api/hr/leave/workflow
 * @access Private (HR/Admin)
 */
const saveLeaveWorkflow = async (req, res, next) => {
  try {
    const { steps, parallelApprovals, requireAllApprovals } = req.body;
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    
    if (!steps || !Array.isArray(steps)) {
      return sendError(res, 'steps array is required', 'VALIDATION_ERROR', 400);
    }
    
    // Find or create workflow
    let workflow = await ApprovalWorkflow.findOne({
      workflow_type: 'LEAVE',
      is_default: true,
      $or: [
        { tenantId: tenantId },
        { tenantId: { $exists: false } } // Backward compatibility
      ]
    });
    
    if (!workflow) {
      workflow = new ApprovalWorkflow({
        name: 'Leave Approval Workflow',
        description: 'Default leave approval workflow',
        workflow_type: 'LEAVE',
        tenantId: tenantId,
        is_active: true,
        is_default: true,
        created_by: req.user._id || req.user.id
      });
    } else {
      // Update tenantId if missing
      if (!workflow.tenantId) {
        workflow.tenantId = tenantId;
      }
    }
    
    // Update levels from steps
    workflow.levels = steps.map(step => ({
      level: step.id,
      approver_role: step.name,
      is_required: step.required !== false,
      auto_approve: step.autoApprove || false,
      timeout_hours: step.timeLimit || 48
    }));
    
    workflow.updated_by = req.user._id || req.user.id;
    await workflow.save();
    
    return sendSuccess(res, {
      steps: workflow.levels.map(level => ({
        id: level.level,
        name: level.approver_role,
        required: level.is_required,
        autoApprove: level.auto_approve,
        timeLimit: level.timeout_hours,
        timeoutAction: 'Escalate'
      })),
      parallelApprovals: parallelApprovals || false,
      requireAllApprovals: requireAllApprovals !== false
    }, 'Workflow config saved successfully');
  } catch (error) {
    logger.error('Error in saveLeaveWorkflow controller:', error);
    next(error);
  }
};

/**
 * Leave Reports & Analytics
 */

/**
 * @desc Generate leave report
 * @route GET /api/hr/leave/reports
 * @access Private (HR/Admin/Manager)
 */
const getLeaveReports = async (req, res, next) => {
  try {
    const { reportType, period, department } = req.query;
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    
    if (!reportType || !period) {
      return sendError(res, 'reportType and period are required', 'VALIDATION_ERROR', 400);
    }
    
    // Parse period (YYYY-MM)
    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    // Build query
    const query = {
      tenantId,
      from_date: { $gte: startDate, $lte: endDate }
    };
    
    if (department && department !== 'all') {
      const employees = await User.find({ tenantId, department, isDeleted: false }).select('_id');
      query.employee_id = { $in: employees.map(e => e._id) };
    } else {
      const allEmployees = await User.find({ tenantId, isDeleted: false }).select('_id');
      query.employee_id = { $in: allEmployees.map(e => e._id) };
    }
    
    const leaveRequests = await LeaveRequest.find(query)
      .populate('employee_id', 'employeeId employee_id firstName lastName fullName department')
      .lean();
    
    let reportData = {};
    
    switch (reportType) {
      case 'monthly-utilization':
        const totalApplications = leaveRequests.length;
        const approved = leaveRequests.filter(lr => lr.status === 'APPROVED').length;
        const rejected = leaveRequests.filter(lr => lr.status === 'REJECTED').length;
        const totalDays = leaveRequests
          .filter(lr => lr.status === 'APPROVED')
          .reduce((sum, lr) => sum + (lr.days || 0), 0);
        
        reportData = {
          summary: {
            totalApplications,
            approved,
            rejected,
            averageDays: approved > 0 ? (totalDays / approved).toFixed(2) : 0
          },
          rows: leaveRequests.map(lr => ({
            employeeId: lr.employee_id?.employeeId || lr.employee_id?.employee_id,
            employeeName: lr.employee_id?.fullName || `${lr.employee_id?.firstName} ${lr.employee_id?.lastName}`,
            department: lr.employee_id?.department,
            leaveType: lr.leave_type,
            startDate: lr.from_date?.toISOString().split('T')[0],
            endDate: lr.to_date?.toISOString().split('T')[0],
            days: lr.days,
            status: lr.status,
            appliedOn: lr.submitted_at?.toISOString().split('T')[0],
            approvedOn: lr.approved_at?.toISOString().split('T')[0]
          }))
        };
        break;
        
      case 'department-wise':
        const deptMap = {};
        leaveRequests.forEach(lr => {
          const dept = lr.employee_id?.department || 'Unknown';
          if (!deptMap[dept]) {
            deptMap[dept] = { total: 0, approved: 0, rejected: 0, days: 0 };
          }
          deptMap[dept].total++;
          if (lr.status === 'APPROVED') {
            deptMap[dept].approved++;
            deptMap[dept].days += lr.days || 0;
          } else if (lr.status === 'REJECTED') {
            deptMap[dept].rejected++;
          }
        });
        
        reportData = {
          summary: {
            totalApplications: leaveRequests.length
          },
          rows: Object.entries(deptMap).map(([dept, data]) => ({
            department: dept,
            totalApplications: data.total,
            approved: data.approved,
            rejected: data.rejected,
            totalDays: data.days
          }))
        };
        break;
        
      case 'employee-wise':
        reportData = {
          summary: {
            totalApplications: leaveRequests.length
          },
          rows: leaveRequests.map(lr => ({
            employeeId: lr.employee_id?.employeeId || lr.employee_id?.employee_id,
            employeeName: lr.employee_id?.fullName || `${lr.employee_id?.firstName} ${lr.employee_id?.lastName}`,
            leaveType: lr.leave_type,
            startDate: lr.from_date?.toISOString().split('T')[0],
            endDate: lr.to_date?.toISOString().split('T')[0],
            days: lr.days,
            status: lr.status
          }))
        };
        break;
        
      case 'approval-time':
        const approvalTimes = leaveRequests
          .filter(lr => lr.status === 'APPROVED' && lr.submitted_at && lr.approved_at)
          .map(lr => ({
            employeeId: lr.employee_id?.employeeId || lr.employee_id?.employee_id,
            employeeName: lr.employee_id?.fullName || `${lr.employee_id?.firstName} ${lr.employee_id?.lastName}`,
            leaveType: lr.leave_type,
            appliedOn: lr.submitted_at?.toISOString().split('T')[0],
            approvedOn: lr.approved_at?.toISOString().split('T')[0],
            approvalTimeHours: Math.round((new Date(lr.approved_at) - new Date(lr.submitted_at)) / (1000 * 60 * 60))
          }));
        
        const avgApprovalTime = approvalTimes.length > 0
          ? (approvalTimes.reduce((sum, at) => sum + at.approvalTimeHours, 0) / approvalTimes.length).toFixed(2)
          : 0;
        
        reportData = {
          summary: {
            totalApplications: leaveRequests.length,
            averageApprovalTimeHours: parseFloat(avgApprovalTime)
          },
          rows: approvalTimes
        };
        break;
        
      default:
        return sendError(res, 'Invalid reportType', 'VALIDATION_ERROR', 400);
    }
    
    return sendSuccess(res, reportData, 'Report generated successfully');
  } catch (error) {
    logger.error('Error in getLeaveReports controller:', error);
    next(error);
  }
};

/**
 * Leave Notification Settings
 */

/**
 * @desc Get leave notification settings
 * @route GET /api/hr/leave/notification-settings
 * @access Private
 */
const getLeaveNotificationSettings = async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    
    // Get settings from SystemSettings
    const settings = await SystemSettings.findOne({
      key: `leave_notification_settings_${tenantId}`,
      category: 'notification'
    });
    
    if (!settings) {
      // Return default settings
      return sendSuccess(res, {
        employee: {
          applicationSubmitted: true,
          applicationApproved: true,
          applicationRejected: true,
          balanceUpdated: true,
          balanceLow: true,
          balanceExpiring: true,
          upcomingReminder: true
        },
        employeeChannels: {
          email: true,
          sms: false,
          inApp: true,
          push: false
        },
        manager: {
          requiresApproval: true,
          pending24Hours: true,
          approvedByEmployee: false,
          teamMemberApplied: true,
          multipleOnLeave: true
        },
        hr: {
          allNewApplications: true,
          urgentApprovals: true,
          lowBalance: true,
          monthlyReport: true,
          blackoutApproaching: true
        },
        dailyDigest: {
          enabled: false,
          time: '09:00'
        }
      }, 'Notification settings retrieved successfully');
    }
    
    return sendSuccess(res, settings.value, 'Notification settings retrieved successfully');
  } catch (error) {
    logger.error('Error in getLeaveNotificationSettings controller:', error);
    next(error);
  }
};

/**
 * @desc Save leave notification settings
 * @route PUT /api/hr/leave/notification-settings
 * @access Private (HR/Admin)
 */
const saveLeaveNotificationSettings = async (req, res, next) => {
  try {
    const settings = req.body;
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    
    // Save to SystemSettings
    const existing = await SystemSettings.findOne({
      key: `leave_notification_settings_${tenantId}`,
      category: 'notification'
    });
    
    if (existing) {
      existing.value = settings;
      existing.updated_by = req.user._id || req.user.id;
      await existing.save();
    } else {
      const newSettings = new SystemSettings({
        key: `leave_notification_settings_${tenantId}`,
        value: settings,
        type: 'object',
        category: 'notification',
        description: 'Leave notification preferences',
        updated_by: req.user._id || req.user.id
      });
      await newSettings.save();
    }
    
    return sendSuccess(res, settings, 'Notification settings saved successfully');
  } catch (error) {
    logger.error('Error in saveLeaveNotificationSettings controller:', error);
    next(error);
  }
};

module.exports = {
  // Leave Type Management
  createLeaveType,
  updateLeaveType,
  
  // Holidays Management
  getHolidays,
  createHoliday,
  updateHoliday,
  
  // Blackout Periods
  getBlackoutPeriods,
  createBlackoutPeriod,
  updateBlackoutPeriod,
  
  // Workflow
  getLeaveWorkflow,
  saveLeaveWorkflow,
  
  // Reports
  getLeaveReports,
  
  // Notification Settings
  getLeaveNotificationSettings,
  saveLeaveNotificationSettings
};
