const leaveManagementService = require('../services/leaveManagement.service');
const LeaveRequest = require('../models/LeaveRequest.model');
const LeavePolicy = require('../models/LeavePolicy.model');
const LeaveLedger = require('../models/LeaveLedger.model');
const User = require('../models/User.model');
const mongoose = require('mongoose');
const { sendSuccess, sendError } = require('../../shared/utils/response.util.js');
const logger = require('../config/logger');

/**
 * @desc Get leave policy for employee
 * @route GET /api/hr/policies/leave
 * @access Private
 */
const getLeavePolicy = async (req, res, next) => {
  try {
    const employeeId = req.query.employee_id || req.user.id || req.user._id;
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    
    // If no employee ID, return policy with leave types
    if (!employeeId) {
      // Return policy with leave types structure
      const LeavePolicy = require('../models/LeavePolicy.model');
      const policy = await LeavePolicy.findOne({ 
        tenantId,
        is_active: true 
      });
      
      if (policy && policy.leave_types) {
        const leaveTypes = policy.leave_types.map(lt => ({
          id: lt._id,
          code: lt.leave_type,
          name: lt.leave_type === 'CL' ? 'Casual Leave' : 
                lt.leave_type === 'SL' ? 'Sick Leave' :
                lt.leave_type === 'EL' ? 'Earned Leave' : lt.leave_type,
          annualAllocation: lt.days_per_year,
          accrual: lt.monthly_accrual ? `Monthly ${lt.accrual_rate}/day` : 'Annual Fixed',
          carryForward: lt.carry_forward?.max_days || 0,
          maxContinuous: lt.special_rules?.maxContinuous || null,
          active: lt.special_rules?.active !== false
        }));
        
        return res.status(200).json({
          success: true,
          message: 'Leave policy retrieved successfully',
          data: { leaveTypes }
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'No active leave policy found',
        data: { leaveTypes: [] }
      });
    }
    
    const policy = await leaveManagementService.getLeavePolicyForEmployee(employeeId);
    
    if (!policy) {
      return res.status(200).json({
        success: true,
        message: 'No active leave policy found',
        data: { leaveTypes: [] }
      });
    }
    
    // Transform to include leaveTypes array
    const responseData = {
      ...policy,
      leaveTypes: policy.leave_types ? policy.leave_types.map(lt => ({
        id: lt._id,
        code: lt.leave_type,
        name: lt.leave_type === 'CL' ? 'Casual Leave' : 
              lt.leave_type === 'SL' ? 'Sick Leave' :
              lt.leave_type === 'EL' ? 'Earned Leave' : lt.leave_type,
        annualAllocation: lt.days_per_year,
        accrual: lt.monthly_accrual ? `Monthly ${lt.accrual_rate}/day` : 'Annual Fixed',
        carryForward: lt.carry_forward?.max_days || 0,
        maxContinuous: lt.special_rules?.maxContinuous || null,
        active: lt.special_rules?.active !== false
      })) : []
    };
    
    res.status(200).json({
      success: true,
      message: 'Leave policy retrieved successfully',
      data: responseData
    });
  } catch (error) {
    logger.error('Error in getLeavePolicy controller:', error);
    next(error);
  }
};

/**
 * @desc Create leave request
 * @route POST /api/hr/leave-requests
 * @access Private (Employee can create for themselves, HR/Admin can create for anyone)
 */
const createLeaveRequest = async (req, res, next) => {
  try {
    const requestData = req.body;
    const createdBy = req.user._id || req.user.id;
    const userRole = (req.user?.role || '').toUpperCase();
    const isAdminOrHR = ['ADMIN', 'HR', 'SUPERADMIN'].includes(userRole);
    const isManager = ['MANAGER'].includes(userRole);
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    
    // For employees: Auto-set employee_id from logged-in user if not provided or if they're creating for themselves
    if (!isAdminOrHR && !isManager) {
      // Find the logged-in user's employee record - try multiple methods
      let userEmployee = null;
      
      // Method 1: By user._id (most reliable)
      userEmployee = await User.findOne({
        tenantId,
        _id: createdBy
      }).lean();
      
      // Method 2: By employee_id from token
      if (!userEmployee && (req.user.employee_id || req.user.employeeId)) {
        userEmployee = await User.findOne({
          tenantId,
          $or: [
            { employeeId: (req.user.employee_id || req.user.employeeId).toUpperCase().trim() },
            { employee_id: (req.user.employee_id || req.user.employeeId).toUpperCase().trim() }
          ]
        }).lean();
      }
      
      // Method 3: By email (fallback)
      if (!userEmployee && req.user.email) {
        userEmployee = await User.findOne({
          tenantId,
          email: req.user.email.toLowerCase().trim()
        }).lean();
      }
      
      // Method 4: By employee_code from token
      if (!userEmployee && req.user.employee_code) {
        userEmployee = await User.findOne({
          tenantId,
          $or: [
            { employeeId: req.user.employee_code.toUpperCase().trim() },
            { employee_id: req.user.employee_code.toUpperCase().trim() },
            { code: req.user.employee_code.toUpperCase().trim() }
          ]
        }).lean();
      }
      
      if (!userEmployee) {
        logger.error('Employee record not found for leave request', {
          userId: createdBy,
          tenantId,
          userEmployeeId: req.user.employee_id || req.user.employeeId,
          userEmail: req.user.email
        });
        return sendError(res, 'Employee record not found for logged-in user', 'NOT_FOUND', 404);
      }
      
      // If employee_id is provided, verify it matches the logged-in user
      if (requestData.employee_id) {
        let targetEmployee;
        if (mongoose.Types.ObjectId.isValid(requestData.employee_id)) {
          targetEmployee = await User.findOne({ _id: requestData.employee_id, tenantId }).lean();
        } else {
          targetEmployee = await User.findOne({
            tenantId,
            $or: [
              { employeeId: requestData.employee_id.toUpperCase() },
              { employee_id: requestData.employee_id.toUpperCase() }
            ]
          }).lean();
        }
        
        if (!targetEmployee) {
          return sendError(res, 'Employee not found', 'NOT_FOUND', 404);
        }
        
        // Verify employee is creating for themselves
        if (targetEmployee._id.toString() !== userEmployee._id.toString()) {
          return sendError(res, 'You can only create leave requests for yourself', 'FORBIDDEN', 403);
        }
        
        // Use the verified employee ID
        requestData.employee_id = userEmployee._id.toString();
      } else {
        // No employee_id provided - use logged-in user's employee ID
        requestData.employee_id = userEmployee._id.toString();
      }
    } else if (isManager) {
      // Manager - can create for themselves or team members
      if (!requestData.employee_id) {
        // No employee_id provided - use logged-in user's employee ID
        const userEmployee = await User.findOne({
          tenantId,
          $or: [
            { _id: createdBy },
            { employeeId: req.user.employee_id || req.user.employeeId },
            { employee_id: req.user.employee_id || req.user.employeeId }
          ]
        }).lean();
        
        if (!userEmployee) {
          return sendError(res, 'Employee record not found for logged-in user', 'NOT_FOUND', 404);
        }
        
        requestData.employee_id = userEmployee._id.toString();
      } else {
        // Validate that employee_id belongs to manager's team
        let targetEmployee;
        if (mongoose.Types.ObjectId.isValid(requestData.employee_id)) {
          targetEmployee = await User.findOne({ _id: requestData.employee_id, tenantId }).lean();
        } else {
          targetEmployee = await User.findOne({
            tenantId,
            $or: [
              { employeeId: requestData.employee_id.toUpperCase() },
              { employee_id: requestData.employee_id.toUpperCase() }
            ]
          }).lean();
        }
        
        if (!targetEmployee) {
          return sendError(res, 'Employee not found', 'NOT_FOUND', 404);
        }
        
        // Check if employee reports to this manager
        if (targetEmployee.reportingManager?.toString() !== createdBy.toString()) {
          return sendError(res, 'You can only create leave requests for your team members', 'FORBIDDEN', 403);
        }
        
        requestData.employee_id = targetEmployee._id.toString();
      }
    } else {
      // HR/Admin - can create for any employee
      // If employee_id not provided, try to find from logged-in user (for self-application)
      if (!requestData.employee_id) {
        // Try to find logged-in user's employee record
        let userEmployee = null;
        
        // Method 1: By user._id
        userEmployee = await User.findOne({
          tenantId,
          _id: createdBy
        }).lean();
        
        // Method 2: By employee_id from token
        if (!userEmployee && (req.user.employee_id || req.user.employeeId)) {
          userEmployee = await User.findOne({
            tenantId,
            $or: [
              { employeeId: (req.user.employee_id || req.user.employeeId).toUpperCase().trim() },
              { employee_id: (req.user.employee_id || req.user.employeeId).toUpperCase().trim() }
            ]
          }).lean();
        }
        
        // Method 3: By email
        if (!userEmployee && req.user.email) {
          userEmployee = await User.findOne({
            tenantId,
            email: req.user.email.toLowerCase().trim()
          }).lean();
        }
        
        if (userEmployee) {
          // Use logged-in user's employee ID
          requestData.employee_id = userEmployee._id.toString();
          logger.info('HR/Admin creating leave for themselves', {
            userId: createdBy,
            employeeId: requestData.employee_id,
            tenantId
          });
        } else {
          // For HR/Admin, employee_id is required if logged-in user doesn't have employee record
          logger.warn('HR/Admin user does not have employee record, employee_id required', {
            userId: createdBy,
            email: req.user.email,
            tenantId
          });
          return sendError(res, 
            'employee_id is required. Please specify the employee for whom you are creating the leave request. If you are an admin without an employee record, you must provide the employee_id.', 
            'VALIDATION_ERROR', 
            400
          );
        }
      } else {
        // Validate provided employee_id
        let targetEmployee;
        if (mongoose.Types.ObjectId.isValid(requestData.employee_id)) {
          targetEmployee = await User.findOne({ _id: requestData.employee_id, tenantId }).lean();
        } else {
          targetEmployee = await User.findOne({
            tenantId,
            $or: [
              { employeeId: requestData.employee_id.toUpperCase() },
              { employee_id: requestData.employee_id.toUpperCase() }
            ]
          }).lean();
        }
        
        if (!targetEmployee) {
          return sendError(res, 'Employee not found', 'NOT_FOUND', 404);
        }
        
        requestData.employee_id = targetEmployee._id.toString();
      }
    }
    
    // Add tenantId to requestData for service layer
    requestData.tenantId = tenantId;
    
    const request = await leaveManagementService.createLeaveRequest(requestData, createdBy);
    
    return sendSuccess(res, request, 'Leave request created successfully', null, 201);
  } catch (error) {
    logger.error('Error in createLeaveRequest controller:', error);
    next(error);
  }
};

/**
 * @desc Get leave requests
 * @route GET /api/hr/leave-requests
 * @access Private
 */
const getLeaveRequests = async (req, res, next) => {
  try {
    const { employee_id, status, leave_type, page = 1, limit = 10, pending_for_me } = req.query;
    const userId = req.user._id || req.user.id;
    const userRole = (req.user?.role || '').toUpperCase();
    const isAdminOrHR = ['ADMIN', 'HR', 'SUPERADMIN'].includes(userRole);
    const isManager = ['MANAGER'].includes(userRole);
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    
    const query = {};
    
    // Tenant isolation
    if (employee_id) {
      // Get employee and check tenant
      const employee = await User.findOne({
        $or: [
          { _id: employee_id },
          { employeeId: employee_id },
          { employee_id: employee_id }
        ],
        tenantId: tenantId
      });
      
      if (employee) {
        query.employee_id = employee._id;
      } else {
        // Employee not found in tenant
        return sendSuccess(res, {
          requests: [],
          pagination: {
            current_page: parseInt(page),
            total_pages: 0,
            total_records: 0
          }
        }, 'Leave requests retrieved successfully');
      }
    } else if (!isAdminOrHR && !isManager) {
      // Employee can only see their own requests
      const employee = await User.findOne({
        $or: [
          { _id: userId },
          { employeeId: req.user.employee_id || req.user.employeeId },
          { employee_id: req.user.employee_id || req.user.employeeId }
        ],
        tenantId: tenantId
      });
      
      if (employee) {
        query.employee_id = employee._id;
      }
    } else if (isManager && pending_for_me === 'true') {
      // Manager wants to see pending requests for their team
      const teamMembers = await User.find({
        reportingManager: userId,
        tenantId: tenantId,
        isDeleted: false,
        status: 'active'
      }).select('_id');
      
      const teamMemberIds = teamMembers.map(m => m._id);
      query.employee_id = { $in: teamMemberIds };
      query.status = 'PENDING';
    } else if (isAdminOrHR && pending_for_me === 'true') {
      // HR wants to see all pending requests in their tenant
      const allEmployees = await User.find({
        tenantId: tenantId,
        isDeleted: false,
        status: { $in: ['active', 'on-leave'] }
      }).select('_id');
      
      const allEmployeeIds = allEmployees.map(e => e._id);
      query.employee_id = { $in: allEmployeeIds };
      query.status = 'PENDING';
    } else if (isAdminOrHR) {
      // HR can see all requests in their tenant
      const allEmployees = await User.find({
        tenantId: tenantId,
        isDeleted: false,
        status: { $in: ['active', 'on-leave'] }
      }).select('_id');
      
      const allEmployeeIds = allEmployees.map(e => e._id);
      query.employee_id = { $in: allEmployeeIds };
    }
    
    if (status) query.status = status;
    if (leave_type) query.leave_type = leave_type;
    
    const requests = await LeaveRequest.find(query)
      .populate('employee_id', 'employeeId employee_id firstName lastName fullName email')
      .populate('approvers.approver_id', 'fullName name email')
      .sort({ submitted_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    
    const total = await LeaveRequest.countDocuments(query);
    
    return sendSuccess(res, {
      requests,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_records: total
      }
    }, 'Leave requests retrieved successfully');
  } catch (error) {
    logger.error('Error in getLeaveRequests controller:', error);
    next(error);
  }
};

/**
 * @desc Get leave request by ID
 * @route GET /api/hr/leave-requests/:id
 * @access Private
 */
const getLeaveRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const request = await LeaveRequest.findById(id)
      .populate('employee_id', 'fullName code email')
      .populate('approvers.approver_id', 'name email');
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Leave request retrieved successfully',
      data: request
    });
  } catch (error) {
    logger.error('Error in getLeaveRequestById controller:', error);
    next(error);
  }
};

/**
 * @desc Approve leave request (Simple - for Manager/HR)
 * @route POST /api/hr/leave-requests/:id/approve
 * @access Private (Manager/HR)
 */
const approveLeaveRequestSimple = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const approverId = req.user._id || req.user.id;
    const approverName = req.user.fullName || req.user.name || 'Manager';
    const userRole = (req.user?.role || '').toUpperCase();
    const isAdminOrHR = ['ADMIN', 'HR', 'SUPERADMIN'].includes(userRole);
    const isManager = ['MANAGER'].includes(userRole);
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    
    const request = await LeaveRequest.findById(id)
      .populate('employee_id', 'employeeId employee_id reportingManager department');
    
    if (!request) {
      return sendError(res, 'Leave request not found', 'NOT_FOUND', 404);
    }
    
    // Check permissions
    // HR/Admin can approve any leave request
    // Manager can only approve their team members' leave requests
    if (!isAdminOrHR && isManager) {
      const employee = await User.findById(request.employee_id);
      if (!employee || employee.reportingManager?.toString() !== approverId.toString()) {
        return sendError(res, 'You can only approve leave requests from your team members', 'FORBIDDEN', 403);
      }
    } else if (!isAdminOrHR && !isManager) {
      return sendError(res, 'Only Managers and HR can approve leave requests', 'FORBIDDEN', 403);
    }
    
    // CRITICAL: Tenant isolation check
    const employee = await User.findById(request.employee_id);
    if (!employee) {
      return sendError(res, 'Employee not found', 'NOT_FOUND', 404);
    }
    
    if (employee.tenantId !== tenantId) {
      return sendError(res, 'You can only approve leave requests from your own tenant', 'FORBIDDEN', 403);
    }
    
    // Check if already processed
    if (request.status === 'APPROVED' || request.status === 'REJECTED' || request.status === 'CANCELLED') {
      return sendError(res, `Leave request is already ${request.status.toLowerCase()}`, 'ALREADY_PROCESSED', 400);
    }
    
    // Simple approval - directly approve if HR/Admin, or use approval chain if manager
    if (isAdminOrHR) {
      // HR/Admin can directly approve
      request.status = 'APPROVED';
      request.approved_by = approverId;
      request.approved_at = new Date();
      
      // Update approvers if they exist
      if (request.approvers && request.approvers.length > 0) {
        request.approvers.forEach(approver => {
          if (approver.status === 'PENDING') {
            approver.status = 'APPROVED';
            approver.approved_at = new Date();
            approver.comments = comments || 'Approved by HR/Admin';
          }
        });
      } else {
        // Add approver entry
        request.approvers = [{
          level: 1,
          approver_id: approverId,
          approver_name: approverName,
          approver_role: userRole,
          status: 'APPROVED',
          approved_at: new Date(),
          comments: comments || 'Approved by HR/Admin'
        }];
      }
      
      // Update leave ledger
      try {
        await leaveManagementService.updateLeaveLedger(request);
      } catch (ledgerError) {
        logger.warn('Error updating leave ledger', { error: ledgerError.message });
      }
    } else if (isManager) {
      // Manager approval - use approval chain
      const approver = request.approvers?.find(a => 
        a.approver_id?.toString() === approverId.toString() && a.status === 'PENDING'
      );
      
      if (approver) {
        approver.status = 'APPROVED';
        approver.approved_at = new Date();
        approver.comments = comments || 'Approved by Manager';
        
        // Check if all approvals done
        const allApproved = request.approvers.every(a => a.status === 'APPROVED');
        
        if (allApproved) {
          request.status = 'APPROVED';
          request.approved_by = approverId;
          request.approved_at = new Date();
          
          // Update leave ledger
          try {
            await leaveManagementService.updateLeaveLedger(request);
          } catch (ledgerError) {
            logger.warn('Error updating leave ledger', { error: ledgerError.message });
          }
        }
      } else {
        // Manager not in approval chain, but has permission - add approval
        const maxLevel = Math.max(...(request.approvers?.map(a => a.level) || [0]));
        request.approvers = request.approvers || [];
        request.approvers.push({
          level: maxLevel + 1,
          approver_id: approverId,
          approver_name: approverName,
          approver_role: userRole,
          status: 'APPROVED',
          approved_at: new Date(),
          comments: comments || 'Approved by Manager'
        });
        
        // If this is the only approver or all are approved, mark as approved
        const allApproved = request.approvers.every(a => a.status === 'APPROVED');
        if (allApproved || request.approvers.length === 1) {
          request.status = 'APPROVED';
          request.approved_by = approverId;
          request.approved_at = new Date();
          
          // Update leave ledger
          try {
            await leaveManagementService.updateLeaveLedger(request);
          } catch (ledgerError) {
            logger.warn('Error updating leave ledger', { error: ledgerError.message });
          }
        }
      }
    }
    
    await request.save();
    
    logger.info('Leave request approved', {
      requestId: id,
      approvedBy: approverId,
      employeeId: request.employee_id,
      status: request.status
    });
    
    return sendSuccess(res, request, 'Leave request approved successfully');
  } catch (error) {
    logger.error('Error in approveLeaveRequestSimple controller:', error);
    next(error);
  }
};

/**
 * @desc Approve leave request (Original - with level)
 * @route PATCH /api/hr/leave-requests/:id
 * @access Private
 */
const approveLeaveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { level, comments } = req.body;
    const approverId = req.user._id || req.user.id;
    
    const request = await leaveManagementService.approveLeaveRequest(id, approverId, level, comments);
    
    return sendSuccess(res, request, 'Leave request approved successfully');
  } catch (error) {
    logger.error('Error in approveLeaveRequest controller:', error);
    next(error);
  }
};

/**
 * @desc Reject leave request
 * @route POST /api/hr/leave-requests/:id/reject
 * @access Private (Manager/HR)
 */
const rejectLeaveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const rejectorId = req.user._id || req.user.id;
    const userRole = (req.user?.role || '').toUpperCase();
    const isAdminOrHR = ['ADMIN', 'HR', 'SUPERADMIN'].includes(userRole);
    const isManager = ['MANAGER'].includes(userRole);
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    
    if (!reason || reason.trim().length === 0) {
      return sendError(res, 'Rejection reason is required', 'VALIDATION_ERROR', 400);
    }
    
    const request = await LeaveRequest.findById(id)
      .populate('employee_id', 'employeeId employee_id reportingManager department');
    
    if (!request) {
      return sendError(res, 'Leave request not found', 'NOT_FOUND', 404);
    }
    
    // Check permissions
    // HR/Admin can reject any leave request
    // Manager can only reject their team members' leave requests
    if (!isAdminOrHR && isManager) {
      const employee = await User.findById(request.employee_id);
      if (!employee || employee.reportingManager?.toString() !== rejectorId.toString()) {
        return sendError(res, 'You can only reject leave requests from your team members', 'FORBIDDEN', 403);
      }
    } else if (!isAdminOrHR && !isManager) {
      return sendError(res, 'Only Managers and HR can reject leave requests', 'FORBIDDEN', 403);
    }
    
    // CRITICAL: Tenant isolation check
    const employee = await User.findById(request.employee_id);
    if (!employee) {
      return sendError(res, 'Employee not found', 'NOT_FOUND', 404);
    }
    
    if (employee.tenantId !== tenantId) {
      return sendError(res, 'You can only reject leave requests from your own tenant', 'FORBIDDEN', 403);
    }
    
    // Check if already processed
    if (request.status === 'APPROVED' || request.status === 'REJECTED' || request.status === 'CANCELLED') {
      return sendError(res, `Leave request is already ${request.status.toLowerCase()}`, 'ALREADY_PROCESSED', 400);
    }
    
    // Update approvers if they exist
    if (request.approvers && request.approvers.length > 0) {
      const currentApprover = request.approvers.find(a => 
        a.approver_id?.toString() === rejectorId.toString() && a.status === 'PENDING'
      );
      
      if (currentApprover) {
        currentApprover.status = 'REJECTED';
        currentApprover.rejected_at = new Date();
        currentApprover.comments = reason;
      }
    }
    
    // Update request status
    request.status = 'REJECTED';
    request.rejected_by = rejectorId;
    request.rejected_at = new Date();
    request.rejection_reason = reason;
    
    await request.save();
    
    logger.info('Leave request rejected', {
      requestId: id,
      rejectedBy: rejectorId,
      employeeId: request.employee_id,
      reason: reason.substring(0, 50)
    });
    
    return sendSuccess(res, request, 'Leave request rejected successfully');
  } catch (error) {
    logger.error('Error in rejectLeaveRequest controller:', error);
    next(error);
  }
};

/**
 * @desc Cancel leave request
 * @route POST /api/hr/leave-requests/:id/cancel
 * @access Private
 */
const cancelLeaveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const cancellerId = req.user.id;
    
    const request = await LeaveRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    
    if (request.status === 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel approved leave request'
      });
    }
    
    request.status = 'CANCELLED';
    request.cancelled_by = cancellerId;
    request.cancelled_at = new Date();
    request.cancellation_reason = reason;
    
    await request.save();
    
    res.status(200).json({
      success: true,
      message: 'Leave request cancelled successfully',
      data: request
    });
  } catch (error) {
    logger.error('Error in cancelLeaveRequest controller:', error);
    next(error);
  }
};

/**
 * @desc Get leave ledger
 * @route GET /api/hr/leave-ledger
 * @access Private
 */
const getLeaveLedger = async (req, res, next) => {
  try {
    const { employee_id, year } = req.query;
    const employeeId = employee_id || req.user.id;
    const ledgerYear = year || new Date().getFullYear();
    
    const ledger = await leaveManagementService.getLeaveLedger(employeeId, ledgerYear);
    
    res.status(200).json({
      success: true,
      message: 'Leave ledger retrieved successfully',
      data: ledger
    });
  } catch (error) {
    logger.error('Error in getLeaveLedger controller:', error);
    next(error);
  }
};

/**
 * @desc Mark employee on leave for today
 * @route POST /api/hr/leave/mark-today
 * @access Private (Employee can mark themselves, HR/Admin can mark any employee)
 */
const markLeaveToday = async (req, res, next) => {
  try {
    const { employeeId, leaveType = 'CL', reason = 'On leave today' } = req.body;
    const userRole = (req.user?.role || '').toUpperCase();
    const isAdminOrHR = ['ADMIN', 'HR', 'SUPERADMIN', 'MANAGER'].includes(userRole);
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    
    // Determine target employee
    let targetEmployeeId = employeeId;
    if (!targetEmployeeId) {
      // Employee marking themselves
      targetEmployeeId = req.user?.employee_id || req.user?.employeeId || req.user?._id;
    } else if (!isAdminOrHR) {
      // Employee trying to mark someone else - not allowed
      return sendError(res, 'You can only mark yourself on leave', 'FORBIDDEN', 403);
    }
    
    if (!targetEmployeeId) {
      return sendError(res, 'Employee ID is required', 'VALIDATION_ERROR', 400);
    }
    
    // Find employee
    let employee;
    if (mongoose.Types.ObjectId.isValid(targetEmployeeId)) {
      employee = await User.findOne({ _id: targetEmployeeId, tenantId }).lean();
    } else {
      employee = await User.findOne({ 
        tenantId,
        $or: [
          { employeeId: targetEmployeeId.toUpperCase() },
          { employee_id: targetEmployeeId.toUpperCase() }
        ]
      }).lean();
    }
    
    if (!employee) {
      return sendError(res, 'Employee not found', 'NOT_FOUND', 404);
    }
    
    // Check if already on leave today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    const existingLeave = await LeaveRequest.findOne({
      employee_id: employee._id,
      status: { $in: ['APPROVED', 'AUTO_APPROVED', 'PENDING'] },
      from_date: { $lte: todayEnd },
      to_date: { $gte: today }
    });
    
    if (existingLeave) {
      return sendError(res, 'Employee is already on leave for today', 'ALREADY_EXISTS', 400);
    }
    
    // Create leave request for today
    const leaveRequest = new LeaveRequest({
      request_id: `LR-${employee.employeeId || employee.employee_id || employee.code}-${Date.now()}`,
      employee_id: employee._id,
      employee_code: employee.employeeId || employee.employee_id || employee.code || 'N/A',
      employee_name: employee.fullName || `${employee.firstName} ${employee.lastName}`.trim() || 'Unknown',
      leave_type: leaveType,
      from_date: today,
      to_date: today,
      days: 1,
      half_day: false,
      reason: reason,
      status: isAdminOrHR ? 'APPROVED' : 'PENDING', // Auto-approve if HR/Admin marks it
      submitted_at: new Date(),
      created_by: req.user._id || req.user.id
    });
    
    if (isAdminOrHR) {
      leaveRequest.approved_at = new Date();
      leaveRequest.approvers = [{
        approver_id: req.user._id || req.user.id,
        approver_name: req.user.fullName || req.user.name || 'Admin',
        level: 1,
        status: 'APPROVED',
        approved_at: new Date(),
        comments: 'Marked on leave by HR/Admin'
      }];
    }
    
    await leaveRequest.save();
    
    logger.info('Leave marked for today', {
      employeeId: targetEmployeeId,
      leaveType,
      markedBy: req.user._id || req.user.id,
      isAdminOrHR
    });
    
    return sendSuccess(res, {
      leaveRequest,
      message: isAdminOrHR 
        ? 'Employee marked on leave for today' 
        : 'Leave request created for today (pending approval)'
    }, isAdminOrHR 
      ? 'Employee marked on leave successfully' 
      : 'Leave request created successfully');
  } catch (error) {
    logger.error('Error in markLeaveToday controller', { error: error.message, stack: error.stack });
    next(error);
  }
};

/**
 * @desc Get leave applications for an employee (alias for getLeaveRequests with employeeId filter)
 * @route GET /api/hr/leaves/applications
 * @access Private
 */
const getLeaveApplications = async (req, res, next) => {
  try {
    // This is essentially the same as getLeaveRequests but with employeeId required
    const { employeeId } = req.query;
    
    if (!employeeId) {
      return sendError(res, 'employeeId is required', 'VALIDATION_ERROR', 400);
    }
    
    // Set employeeId in query and call getLeaveRequests
    req.query.employee_id = employeeId;
    return getLeaveRequests(req, res, next);
  } catch (error) {
    logger.error('Error in getLeaveApplications controller:', error);
    next(error);
  }
};

/**
 * @desc Bulk approve/reject leave requests
 * @route POST /api/hr/leaves/bulk-action
 * @access Private (Manager/HR)
 */
const bulkApproveRejectLeave = async (req, res, next) => {
  try {
    const { ids, action, comment } = req.body;
    const approverId = req.user._id || req.user.id;
    const approverName = req.user.fullName || req.user.name || 'Manager';
    const userRole = (req.user?.role || '').toUpperCase();
    const isAdminOrHR = ['ADMIN', 'HR', 'SUPERADMIN'].includes(userRole);
    const isManager = ['MANAGER'].includes(userRole);
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return sendError(res, 'ids array is required', 'VALIDATION_ERROR', 400);
    }
    
    if (!action || !['approve', 'reject'].includes(action.toLowerCase())) {
      return sendError(res, 'action must be "approve" or "reject"', 'VALIDATION_ERROR', 400);
    }
    
    if (!isAdminOrHR && !isManager) {
      return sendError(res, 'Only Managers and HR can perform bulk actions', 'FORBIDDEN', 403);
    }
    
    const succeeded = [];
    const failed = [];
    
    for (const id of ids) {
      try {
        const request = await LeaveRequest.findById(id)
          .populate('employee_id', 'employeeId employee_id reportingManager department tenantId');
        
        if (!request) {
          failed.push({ id, reason: 'Leave request not found' });
          continue;
        }
        
        // Tenant isolation check
        const employee = await User.findById(request.employee_id);
        if (!employee || employee.tenantId !== tenantId) {
          failed.push({ id, reason: 'Leave request belongs to different tenant' });
          continue;
        }
        
        // Permission check for managers
        if (!isAdminOrHR && isManager) {
          if (!employee || employee.reportingManager?.toString() !== approverId.toString()) {
            failed.push({ id, reason: 'You can only approve/reject leave requests from your team members' });
            continue;
          }
        }
        
        // Check if already processed
        if (request.status === 'APPROVED' || request.status === 'REJECTED' || request.status === 'CANCELLED') {
          failed.push({ id, reason: `Leave request is already ${request.status.toLowerCase()}` });
          continue;
        }
        
        // Perform action
        if (action.toLowerCase() === 'approve') {
          request.status = 'APPROVED';
          request.approved_at = new Date();
          if (!request.approvers) request.approvers = [];
          request.approvers.push({
            approver_id: approverId,
            approver_name: approverName,
            level: 1,
            status: 'APPROVED',
            approved_at: new Date(),
            comments: comment || 'Bulk approved'
          });
        } else {
          request.status = 'REJECTED';
          request.rejected_at = new Date();
          request.rejection_reason = comment || 'Bulk rejected';
          if (!request.approvers) request.approvers = [];
          request.approvers.push({
            approver_id: approverId,
            approver_name: approverName,
            level: 1,
            status: 'REJECTED',
            rejected_at: new Date(),
            comments: comment || 'Bulk rejected'
          });
        }
        
        await request.save();
        
        // Update leave ledger if approved
        if (action.toLowerCase() === 'approve') {
          try {
            await leaveManagementService.updateLeaveLedger(request);
          } catch (ledgerError) {
            logger.warn('Failed to update leave ledger for bulk approval', { 
              leaveRequestId: id, 
              error: ledgerError.message 
            });
          }
        }
        
        succeeded.push(id);
      } catch (error) {
        logger.error('Error processing bulk action for leave request', { id, error: error.message });
        failed.push({ id, reason: error.message || 'Internal error' });
      }
    }
    
    return sendSuccess(res, {
      processed: ids.length,
      succeeded,
      failed: failed.length > 0 ? failed : undefined
    }, `Bulk ${action} completed: ${succeeded.length} succeeded, ${failed.length} failed`);
  } catch (error) {
    logger.error('Error in bulkApproveRejectLeave controller:', error);
    next(error);
  }
};

/**
 * @desc Get expiring leave balances
 * @route GET /api/attendance/leave/balances
 * @access Private
 */
const getExpiringLeaveBalances = async (req, res, next) => {
  try {
    const expiringWithin = parseInt(req.query.expiringWithin) || 30; // Default 30 days
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    
    // This endpoint should be in attendance-service, but for now we'll implement it here
    // Get all employees with leave balances
    const LeaveBalance = require('../models/LeaveBalance.model');
    const balances = await LeaveBalance.find({ tenantId })
      .populate('employee', 'employeeId employee_id firstName lastName fullName email')
      .lean();
    
    const expiringBalances = [];
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiringWithin);
    
    for (const balance of balances) {
      const expiring = [];
      
      // Check each leave type for expiring balances
      if (balance.casualLeave && balance.casualLeave.available > 0) {
        // Casual leave typically expires at year end
        const yearEnd = new Date(new Date().getFullYear(), 11, 31);
        if (yearEnd <= expiryDate) {
          expiring.push({
            leaveType: 'CL',
            available: balance.casualLeave.available,
            expiresOn: yearEnd.toISOString().split('T')[0]
          });
        }
      }
      
      if (balance.earnedLeave && balance.earnedLeave.available > 0) {
        // Earned leave may have expiry
        const yearEnd = new Date(new Date().getFullYear(), 11, 31);
        if (yearEnd <= expiryDate) {
          expiring.push({
            leaveType: 'EL',
            available: balance.earnedLeave.available,
            expiresOn: yearEnd.toISOString().split('T')[0]
          });
        }
      }
      
      if (expiring.length > 0) {
        expiringBalances.push({
          employee: balance.employee,
          employeeId: balance.employeeId,
          expiringLeaves: expiring
        });
      }
    }
    
    return sendSuccess(res, expiringBalances, 'Expiring leave balances retrieved successfully');
  } catch (error) {
    logger.error('Error in getExpiringLeaveBalances controller:', error);
    next(error);
  }
};

/**
 * @desc Get leaves for roster (employee profile)
 * @route GET /api/leaves
 * @access Private
 */
const getLeavesForRoster = async (req, res, next) => {
  try {
    const { employeeId, months = 6 } = req.query;
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    
    if (!employeeId) {
      return sendError(res, 'employeeId is required', 'VALIDATION_ERROR', 400);
    }
    
    // Find employee
    const employee = await User.findOne({
      tenantId,
      $or: [
        { employeeId: employeeId.toUpperCase() },
        { employee_id: employeeId.toUpperCase() }
      ]
    });
    
    if (!employee) {
      return sendError(res, 'Employee not found', 'NOT_FOUND', 404);
    }
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));
    
    // Get approved leaves within date range
    const leaves = await LeaveRequest.find({
      employee_id: employee._id,
      status: 'APPROVED',
      from_date: { $lte: endDate },
      to_date: { $gte: startDate }
    })
      .select('request_id leave_type from_date to_date days reason status')
      .sort({ from_date: -1 })
      .lean();
    
    return sendSuccess(res, leaves, 'Leaves retrieved successfully');
  } catch (error) {
    logger.error('Error in getLeavesForRoster controller:', error);
    next(error);
  }
};

module.exports = {
  getLeavePolicy,
  createLeaveRequest,
  getLeaveRequests,
  getLeaveApplications,
  getLeaveRequestById,
  approveLeaveRequest,
  approveLeaveRequestSimple,
  rejectLeaveRequest,
  cancelLeaveRequest,
  getLeaveLedger,
  markLeaveToday,
  bulkApproveRejectLeave,
  getExpiringLeaveBalances,
  getLeavesForRoster
};

