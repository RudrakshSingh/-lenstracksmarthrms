const payrollRunService = require('../services/payrollRun.service');
const PayrollRun = require('../models/PayrollRun.model');
const PayrollOverride = require('../models/PayrollOverride.model');
const User = require('../models/User.model');
const logger = require('../config/logger');
const { sendSuccess, sendError } = require('../../../shared/utils/response.util.js');

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

/**
 * @desc Get payroll statistics
 * @route GET /api/hr/payroll/stats
 * @access Private
 */
const getPayrollStats = async (req, res, next) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get total employees
    const totalEmployees = await User.countDocuments({ 
      isDeleted: { $ne: true },
      status: { $in: ['active', 'ACTIVE'] }
    });

    // Get current month payroll run
    const currentRun = await PayrollRun.findOne({
      month: currentMonth,
      year: currentYear
    });

    const processedThisMonth = currentRun ? (currentRun.payroll_items?.length || 0) : 0;
    const pendingApprovals = await PayrollRun.countDocuments({ status: 'pending_approval' });
    const lockedPayrolls = await PayrollRun.countDocuments({ status: 'locked' });

    // Calculate totals from current run
    let totalGross = 0;
    let totalNetPay = 0;
    let employerCost = 0;
    let totalCTC = 0;

    if (currentRun && currentRun.payroll_items) {
      currentRun.payroll_items.forEach(item => {
        totalGross += item.gross_salary || 0;
        totalNetPay += item.net_pay || 0;
        employerCost += (item.employer_pf || 0) + (item.employer_esi || 0);
        totalCTC += item.ctc || 0;
      });
    }

    const stats = {
      totalEmployees,
      processedThisMonth,
      pendingApprovals,
      lockedPayrolls,
      totalGross,
      totalNetPay,
      employerCost,
      totalCTC
    };

    return sendSuccess(res, stats, 'Payroll statistics retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getPayrollStats controller:', error);
    return sendError(res, error.message || 'Failed to retrieve payroll statistics', 'Internal server error', 500);
  }
};

/**
 * @desc Get payroll employees
 * @route GET /api/hr/payroll/employees
 * @access Private
 */
const getPayrollEmployees = async (req, res, next) => {
  try {
    const { month, year, status, page = 1, limit = 10 } = req.query;
    const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    // Get payroll run for the month
    const payrollRun = await PayrollRun.findOne({
      month: currentMonth,
      year: currentYear
    });

    let payrollData = [];
    if (payrollRun && payrollRun.payroll_items) {
      payrollData = payrollRun.payroll_items.map(item => ({
        employeeId: item.employee_id,
        employeeName: item.employee_name,
        grossSalary: item.gross_salary,
        netPay: item.net_pay,
        status: item.status || 'processed'
      }));

      // Filter by status if provided
      if (status) {
        payrollData = payrollData.filter(item => item.status === status);
      }

      // Paginate
      const start = (page - 1) * limit;
      const end = start + parseInt(limit);
      payrollData = payrollData.slice(start, end);
    }

    return sendSuccess(res, payrollData, 'Payroll employees retrieved successfully', {
      page: parseInt(page),
      limit: parseInt(limit),
      totalRecords: payrollData.length,
      totalPages: Math.ceil(payrollData.length / limit)
    }, 200);
  } catch (error) {
    logger.error('Error in getPayrollEmployees controller:', error);
    return sendError(res, error.message || 'Failed to retrieve payroll employees', 'Internal server error', 500);
  }
};

/**
 * @desc Preview salary calculation
 * @route POST /api/hr/payroll/salary/preview
 * @access Private
 */
const previewSalary = async (req, res, next) => {
  try {
    const { employeeId, month, year, adjustments = [] } = req.body;

    if (!employeeId || !month || !year) {
      return sendError(res, 'Validation failed', 'employeeId, month, and year are required', 400);
    }

    // Get employee - check if employeeId is a valid ObjectId
    const mongoose = require('mongoose');
    const query = { employee_id: employeeId };
    
    // Only add _id query if employeeId is a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(employeeId)) {
      query.$or = [
        { _id: employeeId },
        { employee_id: employeeId }
      ];
    }
    
    const employee = await User.findOne(query);

    if (!employee) {
      return sendError(res, 'Employee not found', 'Employee not found', 404);
    }

    // Calculate base salary (placeholder - would use actual salary calculation logic)
    const baseSalary = employee.base_salary || 0;
    let grossSalary = baseSalary;
    let deductions = 0;
    let allowances = 0;

    // Apply adjustments
    adjustments.forEach(adj => {
      if (adj.type === 'Bonus' || adj.type === 'Allowance') {
        allowances += adj.amount || 0;
      } else if (adj.type === 'Deduction') {
        deductions += adj.amount || 0;
      }
    });

    grossSalary += allowances;
    const netPay = grossSalary - deductions;

    const preview = {
      employeeId: employee.employee_id || employeeId,
      employeeName: employee.fullName,
      month: parseInt(month),
      year: parseInt(year),
      baseSalary,
      allowances,
      deductions,
      grossSalary,
      netPay,
      breakdown: {
        basic: baseSalary * 0.5,
        hra: baseSalary * 0.2,
        otherAllowances: allowances,
        pf: deductions * 0.5,
        otherDeductions: deductions * 0.5
      }
    };

    return sendSuccess(res, preview, 'Salary preview calculated successfully', null, 200);
  } catch (error) {
    logger.error('Error in previewSalary controller:', error);
    return sendError(res, error.message || 'Failed to calculate salary preview', 'Internal server error', 500);
  }
};

/**
 * @desc Get payroll approvals
 * @route GET /api/hr/payroll/approvals
 * @access Private
 */
const getPayrollApprovals = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // Get payroll runs pending approval
    const runs = await PayrollRun.find({ status: 'pending_approval' })
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await PayrollRun.countDocuments({ status: 'pending_approval' });

    const approvals = runs.map(run => ({
      id: run._id,
      runId: run.run_id,
      month: run.month,
      year: run.year,
      status: run.status,
      totalEmployees: run.payroll_items?.length || 0,
      totalAmount: run.total_amount || 0,
      createdAt: run.created_at,
      requiresApproval: true
    }));

    return sendSuccess(res, approvals, 'Payroll approvals retrieved successfully', {
      page: parseInt(page),
      limit: parseInt(limit),
      totalRecords: total,
      totalPages: Math.ceil(total / limit)
    }, 200);
  } catch (error) {
    logger.error('Error in getPayrollApprovals controller:', error);
    return sendError(res, error.message || 'Failed to retrieve payroll approvals', 'Internal server error', 500);
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
  getPayslips,
  getPayrollStats,
  getPayrollEmployees,
  previewSalary,
  getPayrollApprovals
};

