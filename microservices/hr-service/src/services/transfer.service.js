const Transfer = require('../models/Transfer.model');
const User = require('../models/User.model');
const Store = require('../models/Store.model');
const logger = require('../config/logger');
const { recordAuditLog } = require('../utils/audit');
const { sendTransferNotificationEmail } = require('../jobs/emailJobs');
const TransferWorkflows = require('../jobs/transferWorkflows');
const { addJob } = require('../utils/queueUtils');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

/**
 * Creates a transfer request
 * @param {string} employeeId - Employee ID
 * @param {Object} transferData - Transfer data
 * @returns {Promise<Object>} Created transfer request
 */
const createTransferRequest = async (employeeId, transferData) => {
  try {
    const { requestedStoreId, effectiveDate, reason } = transferData;

    // Verify employee exists and get current store
    const employee = await User.findById(employeeId).populate('store');
    if (!employee) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
    }

    if (!employee.store) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Employee not assigned to any store');
    }

    // Verify requested store exists
    const requestedStore = await Store.findById(requestedStoreId);
    if (!requestedStore) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Requested store not found');
    }

    // Check if employee is already at the requested store
    if (employee.store._id.toString() === requestedStoreId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Employee is already at the requested store');
    }

    // Check for existing pending transfer request
    const existingTransfer = await Transfer.findOne({
      employee: employeeId,
      status: 'pending'
    });

    if (existingTransfer) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Employee already has a pending transfer request');
    }

    const transfer = new Transfer({
      employee: employeeId,
      currentStore: employee.store._id,
      requestedStore: requestedStoreId,
      effectiveDate: new Date(effectiveDate),
      reason,
      status: 'pending'
    });

    await transfer.save();

    // Send notification email
    try {
      await sendTransferNotificationEmail(
        employee.email,
        employee.firstName,
        transfer._id.toString(),
        employee.store.name,
        requestedStore.name,
        effectiveDate
      );
    } catch (emailError) {
      logger.warn('Failed to send transfer notification email', { 
        error: emailError.message, 
        transferId: transfer._id 
      });
    }

    await recordAuditLog(employeeId, 'TRANSFER_REQUESTED', { 
      transferId: transfer._id, 
      fromStore: employee.store.name,
      toStore: requestedStore.name 
    });

    // Initiate transfer approval workflow
    try {
      await addJob('transfer-queue', 'initiate-transfer-workflow', {
        transferId: transfer._id
      }, {
        delay: 1000, // 1 second delay
        attempts: 3
      });

      logger.info('Transfer workflow initiated', {
        transferId: transfer._id
      });
    } catch (workflowError) {
      logger.warn('Failed to initiate transfer workflow', {
        error: workflowError.message,
        transferId: transfer._id
      });
    }

    logger.info('Transfer request created successfully', { 
      transferId: transfer._id, 
      employeeId,
      fromStore: employee.store.name,
      toStore: requestedStore.name 
    });

    return transfer;
  } catch (error) {
    logger.error('Error in createTransferRequest service', { error: error.message, employeeId });
    throw error;
  }
};

/**
 * Gets transfer requests with filtering
 * @param {Object} filters - Filter options
 * @param {number} page - Page number
 * @param {number} limit - Records per page
 * @returns {Promise<Object>} Paginated transfer requests
 */
const getTransferRequests = async (filters = {}, page = 1, limit = 10) => {
  try {
    const query = {};

    // Apply filters
    if (filters.employee) {
      query.employee = filters.employee;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.currentStore) {
      query.currentStore = filters.currentStore;
    }
    if (filters.requestedStore) {
      query.requestedStore = filters.requestedStore;
    }

    const skip = (page - 1) * limit;

    const [transfers, total] = await Promise.all([
      Transfer.find(query)
        .populate('employee', 'firstName lastName employeeId email')
        .populate('currentStore', 'name address')
        .populate('requestedStore', 'name address')
        .populate('approvedBy', 'firstName lastName employeeId')
        .sort({ requestDate: -1 })
        .skip(skip)
        .limit(limit),
      Transfer.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      transfers,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  } catch (error) {
    logger.error('Error in getTransferRequests service', { error: error.message });
    throw error;
  }
};

/**
 * Approves a transfer request
 * @param {string} transferId - Transfer ID
 * @param {string} approvedBy - ID of the user approving
 * @param {string} comments - Approval comments
 * @returns {Promise<Object>} Updated transfer request
 */
const approveTransferRequest = async (transferId, approvedBy, comments = '') => {
  try {
    // Use the new workflow-based approval process
    const transfer = await TransferWorkflows.processTransferApproval(
      transferId,
      approvedBy,
      'approved',
      comments
    );

    logger.info('Transfer request approved successfully', { 
      transferId, 
      approvedBy,
      employeeId: transfer.employee._id 
    });

    return transfer;
  } catch (error) {
    logger.error('Error in approveTransferRequest service', { error: error.message, transferId, approvedBy });
    throw error;
  }
};

/**
 * Rejects a transfer request
 * @param {string} transferId - Transfer ID
 * @param {string} rejectedBy - ID of the user rejecting
 * @param {string} rejectionReason - Reason for rejection
 * @returns {Promise<Object>} Updated transfer request
 */
const rejectTransferRequest = async (transferId, rejectedBy, rejectionReason) => {
  try {
    // Use the new workflow-based rejection process
    const transfer = await TransferWorkflows.processTransferApproval(
      transferId,
      rejectedBy,
      'rejected',
      rejectionReason
    );

    await recordAuditLog(rejectedBy, 'TRANSFER_REJECTED', { 
      transferId: transfer._id, 
      employeeId: transfer.employee._id,
      rejectionReason 
    });

    logger.info('Transfer request rejected successfully', { 
      transferId: transfer._id, 
      rejectedBy,
      employeeId: transfer.employee._id 
    });

    return transfer;
  } catch (error) {
    logger.error('Error in rejectTransferRequest service', { error: error.message, transferId, rejectedBy });
    throw error;
  }
};

/**
 * Cancels a transfer request
 * @param {string} transferId - Transfer ID
 * @param {string} cancelledBy - ID of the user cancelling
 * @returns {Promise<Object>} Updated transfer request
 */
const cancelTransferRequest = async (transferId, cancelledBy) => {
  try {
    const transfer = await Transfer.findById(transferId);

    if (!transfer) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Transfer request not found');
    }

    if (transfer.status !== 'pending') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Only pending transfer requests can be cancelled');
    }

    // Update transfer status
    transfer.status = 'cancelled';
    transfer.approvedBy = cancelledBy;
    transfer.approvalDate = new Date();
    await transfer.save();

    await recordAuditLog(cancelledBy, 'TRANSFER_CANCELLED', { 
      transferId: transfer._id, 
      employeeId: transfer.employee 
    });

    logger.info('Transfer request cancelled successfully', { 
      transferId: transfer._id, 
      cancelledBy 
    });

    return transfer;
  } catch (error) {
    logger.error('Error in cancelTransferRequest service', { error: error.message, transferId, cancelledBy });
    throw error;
  }
};

module.exports = {
  createTransferRequest,
  getTransferRequests,
  approveTransferRequest,
  rejectTransferRequest,
  cancelTransferRequest
};