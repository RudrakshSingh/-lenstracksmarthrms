const HRService = require('../services/hr.service');
const logger = require('../config/logger');

/**
 * Get all employees
 */
const getEmployees = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, store, role, department, search } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (store) filters.store = store;
    if (role) filters.role = role;
    if (department) filters.department = department;
    if (search) filters.search = search;

    const result = await HRService.getEmployees(filters, parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Employees retrieved successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in getEmployees controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Create new employee
 */
const createEmployee = async (req, res, next) => {
  try {
    const employeeData = req.body;
    const createdBy = req.user?._id || req.user?.id;

    if (!createdBy) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const employee = await HRService.createEmployee(employeeData, createdBy);

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: employee
    });
  } catch (error) {
    logger.error('Error in createEmployee controller', { error: error.message, userId: req.user?._id || req.user?.id });
    next(error);
  }
};

/**
 * Update employee
 */
const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updatedBy = req.user._id;

    const employee = await HRService.updateEmployee(id, updateData, updatedBy);

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: employee
    });
  } catch (error) {
    logger.error('Error in updateEmployee controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Delete employee
 */
const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedBy = req.user._id;

    const result = await HRService.deleteEmployee(id, deletedBy);

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Error in deleteEmployee controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Assign role to employee
 */
const assignRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { roleName } = req.body;
    const assignedBy = req.user._id;

    if (!roleName) {
      return res.status(400).json({
        success: false,
        message: 'Role name is required'
      });
    }

    const employee = await HRService.assignRole(id, roleName, assignedBy);

    res.status(200).json({
      success: true,
      message: 'Role assigned successfully',
      data: employee
    });
  } catch (error) {
    logger.error('Error in assignRole controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Update employee status
 */
const updateEmployeeStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updatedBy = req.user._id;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const employee = await HRService.updateEmployeeStatus(id, status, updatedBy);

    res.status(200).json({
      success: true,
      message: 'Employee status updated successfully',
      data: employee
    });
  } catch (error) {
    logger.error('Error in updateEmployeeStatus controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Get all stores
 */
const getStores = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (search) filters.search = search;

    const result = await HRService.getStores(filters, parseInt(page), parseInt(limit));

    // Ensure result has stores array
    const stores = result.stores || result || [];
    const pagination = result.pagination || { current: 1, pages: 1, total: stores.length };

    res.status(200).json({
      success: true,
      message: 'Stores retrieved successfully',
      data: Array.isArray(stores) ? stores : [stores],
      pagination
    });
  } catch (error) {
    logger.error('Error in getStores controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Create a new store
 */
const createStore = async (req, res, next) => {
  try {
    const storeData = req.body;
    const createdBy = req.user?._id || req.user?.id;

    if (!createdBy) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const store = await HRService.createStore(storeData, createdBy);

    res.status(201).json({
      success: true,
      message: 'Store created successfully',
      data: store
    });
  } catch (error) {
    logger.error('Error in createStore controller', { error: error.message, userId: req.user?._id || req.user?.id });
    next(error);
  }
};

/**
 * Get store by ID
 */
const getStoreById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const store = await HRService.getStoreById(id);

    res.status(200).json({
      success: true,
      message: 'Store retrieved successfully',
      data: store
    });
  } catch (error) {
    logger.error('Error in getStoreById controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Update store
 */
const updateStore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updatedBy = req.user._id;

    const store = await HRService.updateStore(id, updateData, updatedBy);

    res.status(200).json({
      success: true,
      message: 'Store updated successfully',
      data: store
    });
  } catch (error) {
    logger.error('Error in updateStore controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Delete store
 */
const deleteStore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedBy = req.user._id;

    await HRService.deleteStore(id, deletedBy);

    res.status(200).json({
      success: true,
      message: 'Store deleted successfully'
    });
  } catch (error) {
    logger.error('Error in deleteStore controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

module.exports = {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  assignRole,
  updateEmployeeStatus,
  getStores,
  createStore,
  getStoreById,
  updateStore,
  deleteStore
};