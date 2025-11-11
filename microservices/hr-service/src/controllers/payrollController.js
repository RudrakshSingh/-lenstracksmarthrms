const payrollRunService = require('../services/payrollRun.service');
const PayrollRun = require('../models/PayrollRun.model');
const PayrollOverride = require('../models/PayrollOverride.model');
const logger = require('../config/logger');

/**
 * @desc Create payroll run
 * @route POST /api/hr/payroll-runs
 * @access Private
 */
const createPayrollRun = async (req, res, next) => {
  try {
    const { month, year } = req.body;
    const userId = req.user.id;
    
    const run = await payrollRunService.createPayrollRun(month, year, userId);
    
    res.status(201).json({
      success: true,
      message: 'Payroll run created successfully',
      data: run
    });
  } catch (error) {
    logger.error('Error in createPayrollRun controller:', error);
    next(error);
  }
};

/**
 * @desc Process payroll run
 * @route POST /api/hr/payroll-runs/:id/process
 * @access Private
 */
const processPayrollRun = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const run = await payrollRunService.processPayrollRun(id);
    
    res.status(200).json({
      success: true,
      message: 'Payroll run processed successfully',
      data: run
    });
  } catch (error) {
    logger.error('Error in processPayrollRun controller:', error);
    next(error);
  }
};

/**
 * @desc Lock payroll run
 * @route POST /api/hr/payroll-runs/:id/lock
 * @access Private
 */
const lockPayrollRun = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const run = await payrollRunService.lockPayrollRun(id, userId);
    
    res.status(200).json({
      success: true,
      message: 'Payroll run locked successfully',
      data: run
    });
  } catch (error) {
    logger.error('Error in lockPayrollRun controller:', error);
    next(error);
  }
};

/**
 * @desc Post payroll run
 * @route POST /api/hr/payroll-runs/:id/post
 * @access Private
 */
const postPayrollRun = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { jv_number, jv_date } = req.body;
    const userId = req.user.id;
    
    const run = await payrollRunService.postPayrollRun(id, userId, jv_number, jv_date);
    
    res.status(200).json({
      success: true,
      message: 'Payroll run posted successfully',
      data: run
    });
  } catch (error) {
    logger.error('Error in postPayrollRun controller:', error);
    next(error);
  }
};

/**
 * @desc Get payroll runs
 * @route GET /api/hr/payroll-runs
 * @access Private
 */
const getPayrollRuns = async (req, res, next) => {
  try {
    const { status, month, year, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    
    const runs = await PayrollRun.find(query)
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await PayrollRun.countDocuments(query);
    
    res.status(200).json({
      success: true,
      message: 'Payroll runs retrieved successfully',
      data: {
        runs,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_records: total
        }
      }
    });
  } catch (error) {
    logger.error('Error in getPayrollRuns controller:', error);
    next(error);
  }
};

/**
 * @desc Get payroll run by ID
 * @route GET /api/hr/payroll-runs/:id
 * @access Private
 */
const getPayrollRunById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const run = await PayrollRun.findOne({ run_id: id });
    
    if (!run) {
      return res.status(404).json({
        success: false,
        message: 'Payroll run not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Payroll run retrieved successfully',
      data: run
    });
  } catch (error) {
    logger.error('Error in getPayrollRunById controller:', error);
    next(error);
  }
};

/**
 * @desc Create payroll override
 * @route POST /api/hr/payroll-runs/:id/override
 * @access Private
 */
const createPayrollOverride = async (req, res, next) => {
  try {
    const overrideData = req.body;
    const createdBy = req.user.id;
    
    const override = await payrollRunService.createPayrollOverride(overrideData, createdBy);
    
    res.status(201).json({
      success: true,
      message: 'Payroll override created successfully',
      data: override
    });
  } catch (error) {
    logger.error('Error in createPayrollOverride controller:', error);
    next(error);
  }
};

/**
 * @desc Get payslips
 * @route GET /api/hr/payslips
 * @access Private
 */
const getPayslips = async (req, res, next) => {
  try {
    const { month, year, employee_id, page = 1, limit = 10 } = req.query;
    
    // This would fetch from PayrollRecord or PayrollComponent
    // For now, return placeholder
    res.status(200).json({
      success: true,
      message: 'Payslips retrieved successfully',
      data: {
        payslips: [],
        pagination: {
          current_page: parseInt(page),
          total_pages: 0,
          total_records: 0
        }
      }
    });
  } catch (error) {
    logger.error('Error in getPayslips controller:', error);
    next(error);
  }
};

module.exports = {
  createPayrollRun,
  processPayrollRun,
  lockPayrollRun,
  postPayrollRun,
  getPayrollRuns,
  getPayrollRunById,
  createPayrollOverride,
  getPayslips
};

