const PayrollRecord = require('../models/PayrollRecord.model');
const EmployeeMaster = require('../models/EmployeeMaster.model');
const User = require('../models/User.model');
const logger = require('../config/logger');

/**
 * Get salary deductions for an employee
 * @route GET /api/payroll/salary/deductions
 */
const getSalaryDeductions = async (req, res, next) => {
  try {
    const { employeeCode, month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    let deductions = [];

    if (employeeCode) {
      // Get deductions for specific employee
      const payrollRecord = await PayrollRecord.findOne({
        employee_code: employeeCode,
        month: parseInt(month),
        year: parseInt(year)
      });

      if (payrollRecord) {
        deductions = [
          {
            id: 'ded_pf',
            employeeCode: employeeCode,
            type: 'PF',
            description: 'Provident Fund',
            amount: payrollRecord.epf_employee || 0,
            percentage: 12,
            isFixed: false,
            isActive: true,
            effectiveDate: payrollRecord.created_at || new Date(),
            createdAt: payrollRecord.created_at || new Date()
          },
          {
            id: 'ded_esi',
            employeeCode: employeeCode,
            type: 'ESI',
            description: 'Employee State Insurance',
            amount: payrollRecord.esic_employee || 0,
            percentage: 0.75,
            isFixed: false,
            isActive: true,
            effectiveDate: payrollRecord.created_at || new Date(),
            createdAt: payrollRecord.created_at || new Date()
          },
          {
            id: 'ded_pt',
            employeeCode: employeeCode,
            type: 'PT',
            description: 'Professional Tax',
            amount: payrollRecord.professional_tax || 0,
            percentage: 0,
            isFixed: true,
            isActive: true,
            effectiveDate: payrollRecord.created_at || new Date(),
            createdAt: payrollRecord.created_at || new Date()
          },
          {
            id: 'ded_tds',
            employeeCode: employeeCode,
            type: 'TDS',
            description: 'Tax Deducted at Source',
            amount: payrollRecord.tds || 0,
            percentage: 0,
            isFixed: false,
            isActive: true,
            effectiveDate: payrollRecord.created_at || new Date(),
            createdAt: payrollRecord.created_at || new Date()
          }
        ].filter(d => d.amount > 0);
      }
    } else {
      // Return empty array if no employee code provided
      deductions = [];
    }

    res.status(200).json({
      success: true,
      data: deductions
    });
  } catch (error) {
    logger.error('Error in getSalaryDeductions controller', {
      error: error.message,
      employeeCode: req.query.employeeCode
    });
    next(error);
  }
};

/**
 * Search employees for payroll
 * @route GET /api/payroll/employees
 */
const searchEmployees = async (req, res, next) => {
  try {
    const { search, limit = 50 } = req.query;

    const query = { isDeleted: false, status: 'active' };

    if (search) {
      query.$or = [
        { employeeId: new RegExp(search, 'i') },
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }

    const employees = await User.find(query)
      .select('employeeId firstName lastName email department jobTitle')
      .populate('role', 'name')
      .limit(parseInt(limit))
      .lean();

    const formattedEmployees = employees.map(emp => ({
      id: emp._id,
      name: `${emp.firstName} ${emp.lastName}`,
      employeeCode: emp.employeeId,
      department: emp.department || 'N/A',
      designation: emp.jobTitle || 'N/A',
      salary: 0 // Would need to fetch from salary/payroll records
    }));

    res.status(200).json({
      success: true,
      data: formattedEmployees
    });
  } catch (error) {
    logger.error('Error in searchEmployees controller', {
      error: error.message,
      search: req.query.search
    });
    next(error);
  }
};

module.exports = {
  getSalaryDeductions,
  searchEmployees
};

