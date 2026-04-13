const unifiedPayrollService = require('../services/unifiedPayroll.service');
const EmployeeMaster = require('../models/EmployeeMaster.model');
// AttendanceRecord model is optional - only needed if attendance integration is required
let AttendanceRecord = null;
try {
  AttendanceRecord = require('../models/AttendanceRecord.model');
} catch (err) {
  // AttendanceRecord model not available - unified payroll will use defaults
}
const PayrollRecord = require('../models/PayrollRecord.model');
const logger = require('../config/logger');
const { publishPayrollProcessed, publishPayrollApproved } = require('../utils/payrollEvents');

/**
 * @desc Process payroll for a single employee
 * @route POST /api/payroll/employee/:employeeCode
 * @access Private (HR/Admin)
 */
const processEmployeePayroll = async (req, res, next) => {
  try {
    const { employeeCode } = req.params;
    const { month, year } = req.body;
    const userId = req.user.id;
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }
    
    const payroll = await unifiedPayrollService.processEmployeePayroll(
      employeeCode,
      month,
      year,
      userId
    );
    
    res.status(200).json({
      success: true,
      message: 'Employee payroll processed successfully',
      data: payroll
    });
    await publishPayrollProcessed({
      employeeCode,
      payrollId: payroll?._id?.toString(),
      month,
      year,
      status: payroll?.status,
      tenantId: req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'],
      requestId: req.headers['x-request-id'] || req.headers['X-Request-ID']
    });
    
  } catch (error) {
    logger.error('Error in processEmployeePayroll controller', {
      error: error.message,
      employeeCode: req.params.employeeCode
    });
    next(error);
  }
};

/**
 * @desc Process payroll for all employees in a month
 * @route POST /api/payroll/monthly
 * @access Private (HR/Admin)
 */
const processMonthlyPayroll = async (req, res, next) => {
  try {
    const { month, year } = req.body;
    const userId = req.user.id;
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }
    
    const results = await unifiedPayrollService.processMonthlyPayroll(
      month,
      year,
      userId
    );
    
    res.status(200).json({
      success: true,
      message: 'Monthly payroll processing completed',
      data: {
        results,
        summary: {
          total: results.length,
          successful: results.filter(r => r.status === 'SUCCESS').length,
          failed: results.filter(r => r.status === 'ERROR').length
        }
      }
    });
    
  } catch (error) {
    logger.error('Error in processMonthlyPayroll controller', {
      error: error.message,
      month: req.body.month,
      year: req.body.year
    });
    next(error);
  }
};

/**
 * @desc Get payroll summary for a month
 * @route GET /api/payroll/summary/:month/:year
 * @access Private (HR/Admin)
 */
const getPayrollSummary = async (req, res, next) => {
  try {
    const { month, year } = req.params;
    
    const summary = await unifiedPayrollService.getPayrollSummary(
      parseInt(month),
      parseInt(year)
    );
    
    res.status(200).json({
      success: true,
      message: 'Payroll summary retrieved successfully',
      data: summary
    });
    
  } catch (error) {
    logger.error('Error in getPayrollSummary controller', {
      error: error.message,
      month: req.params.month,
      year: req.params.year
    });
    next(error);
  }
};

/**
 * @desc Get employee payroll details
 * @route GET /api/payroll/employee/:employeeCode/:month/:year
 * @access Private (Employee, Manager, HR/Admin)
 */
const getEmployeePayroll = async (req, res, next) => {
  try {
    const { employeeCode, month, year } = req.params;
    
    const payroll = await PayrollRecord.getEmployeePayroll(
      employeeCode,
      parseInt(month),
      parseInt(year)
    );
    
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Employee payroll retrieved successfully',
      data: payroll
    });
    
  } catch (error) {
    logger.error('Error in getEmployeePayroll controller', {
      error: error.message,
      employeeCode: req.params.employeeCode
    });
    next(error);
  }
};

/**
 * @desc Lock monthly payroll
 * @route POST /api/payroll/lock/:month/:year
 * @access Private (HR/Admin)
 */
const lockMonthlyPayroll = async (req, res, next) => {
  try {
    const { month, year } = req.params;
    const userId = req.user.id;
    
    const result = await unifiedPayrollService.lockMonthlyPayroll(
      parseInt(month),
      parseInt(year),
      userId
    );
    
    res.status(200).json({
      success: true,
      message: 'Monthly payroll locked successfully',
      data: {
        month: parseInt(month),
        year: parseInt(year),
        locked_records: result.modifiedCount
      }
    });
    await publishPayrollApproved({
      month: parseInt(month),
      year: parseInt(year),
      locked_records: result.modifiedCount,
      tenantId: req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'],
      requestId: req.headers['x-request-id'] || req.headers['X-Request-ID']
    });
    
  } catch (error) {
    logger.error('Error in lockMonthlyPayroll controller', {
      error: error.message,
      month: req.params.month,
      year: req.params.year
    });
    next(error);
  }
};

/**
 * @desc Get performance analytics
 * @route GET /api/payroll/analytics/:month/:year
 * @access Private (HR/Admin)
 */
const getPerformanceAnalytics = async (req, res, next) => {
  try {
    const { month, year } = req.params;
    
    const analytics = await PayrollRecord.getPerformanceAnalytics(
      parseInt(month),
      parseInt(year)
    );
    
    res.status(200).json({
      success: true,
      message: 'Performance analytics retrieved successfully',
      data: analytics
    });
    
  } catch (error) {
    logger.error('Error in getPerformanceAnalytics controller', {
      error: error.message,
      month: req.params.month,
      year: req.params.year
    });
    next(error);
  }
};

/**
 * @desc Create employee master record
 * @route POST /api/payroll/employee-master
 * @access Private (HR/Admin)
 */
const createEmployeeMaster = async (req, res, next) => {
  try {
    const employeeData = req.body;
    employeeData.created_by = req.user.id;
    
    // Generate employee code
    const employee = new EmployeeMaster(employeeData);
    employee.employee_code = await employee.generateEmployeeCode();
    
    await employee.save();
    
    res.status(201).json({
      success: true,
      message: 'Employee master record created successfully',
      data: employee
    });
    
  } catch (error) {
    logger.error('Error in createEmployeeMaster controller', {
      error: error.message
    });
    next(error);
  }
};

/**
 * @desc Get employee master record
 * @route GET /api/payroll/employee-master/:employeeCode
 * @access Private (Employee, Manager, HR/Admin)
 */
const getEmployeeMaster = async (req, res, next) => {
  try {
    const { employeeCode } = req.params;
    
    const employee = await EmployeeMaster.getCurrentEmployee(employeeCode);
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee master record not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Employee master record retrieved successfully',
      data: employee
    });
    
  } catch (error) {
    logger.error('Error in getEmployeeMaster controller', {
      error: error.message,
      employeeCode: req.params.employeeCode
    });
    next(error);
  }
};

/**
 * @desc Submit attendance record
 * @route POST /api/payroll/attendance
 * @access Private (Manager, HR/Admin)
 */
const submitAttendanceRecord = async (req, res, next) => {
  try {
    const attendanceData = req.body;
    attendanceData.created_by = req.user.id;
    
    const attendance = new AttendanceRecord(attendanceData);
    await attendance.save();
    
    res.status(201).json({
      success: true,
      message: 'Attendance record submitted successfully',
      data: attendance
    });
    
  } catch (error) {
    logger.error('Error in submitAttendanceRecord controller', {
      error: error.message
    });
    next(error);
  }
};

/**
 * @desc Approve attendance record
 * @route PUT /api/payroll/attendance/:id/approve
 * @access Private (HR/Admin)
 */
const approveAttendanceRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approval_notes } = req.body;
    
    const attendance = await AttendanceRecord.findByIdAndUpdate(
      id,
      {
        status: 'APPROVED',
        approved_by: req.user.id,
        approved_at: new Date(),
        approval_notes
      },
      { new: true }
    );
    
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Attendance record approved successfully',
      data: attendance
    });
    
  } catch (error) {
    logger.error('Error in approveAttendanceRecord controller', {
      error: error.message,
      attendanceId: req.params.id
    });
    next(error);
  }
};

module.exports = {
  processEmployeePayroll,
  processMonthlyPayroll,
  getPayrollSummary,
  getEmployeePayroll,
  lockMonthlyPayroll,
  getPerformanceAnalytics,
  createEmployeeMaster,
  getEmployeeMaster,
  submitAttendanceRecord,
  approveAttendanceRecord
};
