const leaveManagementService = require('../services/leaveManagement.service');
const LeaveRequest = require('../models/LeaveRequest.model');
const LeavePolicy = require('../models/LeavePolicy.model');
const LeaveLedger = require('../models/LeaveLedger.model');
const logger = require('../config/logger');

/**
 * @desc Get leave policy for employee
 * @route GET /api/hr/policies/leave
 * @access Private
 */
const getLeavePolicy = async (req, res, next) => {
  try {
    const employeeId = req.query.employee_id || req.user.id || req.user._id;
    
    // If no employee ID, return empty policy
    if (!employeeId) {
      return res.status(200).json({
        success: true,
        message: 'No employee ID provided',
        data: null
      });
    }
    
    const policy = await leaveManagementService.getLeavePolicyForEmployee(employeeId);
    
    if (!policy) {
      return res.status(200).json({
        success: true,
        message: 'No active leave policy found',
        data: null
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Leave policy retrieved successfully',
      data: policy
    });
  } catch (error) {
    logger.error('Error in getLeavePolicy controller:', error);
    next(error);
  }
};

/**
 * @desc Create leave request
 * @route POST /api/hr/leave-requests
 * @access Private
 */
const createLeaveRequest = async (req, res, next) => {
  try {
    const requestData = req.body;
    const createdBy = req.user.id;
    
    const request = await leaveManagementService.createLeaveRequest(requestData, createdBy);
    
    res.status(201).json({
      success: true,
      message: 'Leave request created successfully',
      data: request
    });
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
    const { employee_id, status, leave_type, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (employee_id) query.employee_id = employee_id;
    if (status) query.status = status;
    if (leave_type) query.leave_type = leave_type;
    
    const requests = await LeaveRequest.find(query)
      .sort({ submitted_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await LeaveRequest.countDocuments(query);
    
    res.status(200).json({
      success: true,
      message: 'Leave requests retrieved successfully',
      data: {
        requests,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_records: total
        }
      }
    });
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
 * @desc Approve leave request
 * @route PATCH /api/hr/leave-requests/:id
 * @access Private
 */
const approveLeaveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { level, comments } = req.body;
    const approverId = req.user.id;
    
    const request = await leaveManagementService.approveLeaveRequest(id, approverId, level, comments);
    
    res.status(200).json({
      success: true,
      message: 'Leave request approved successfully',
      data: request
    });
  } catch (error) {
    logger.error('Error in approveLeaveRequest controller:', error);
    next(error);
  }
};

/**
 * @desc Reject leave request
 * @route POST /api/hr/leave-requests/:id/reject
 * @access Private
 */
const rejectLeaveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const rejectorId = req.user.id;
    
    const request = await LeaveRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    
    request.status = 'REJECTED';
    request.rejected_by = rejectorId;
    request.rejected_at = new Date();
    request.rejection_reason = reason;
    
    await request.save();
    
    res.status(200).json({
      success: true,
      message: 'Leave request rejected successfully',
      data: request
    });
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

module.exports = {
  getLeavePolicy,
  createLeaveRequest,
  getLeaveRequests,
  getLeaveRequestById,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
  getLeaveLedger
};

