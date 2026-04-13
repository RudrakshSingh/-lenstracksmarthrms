const EmployeeMaster = require('../models/EmployeeMaster.model');
// AttendanceRecord model is optional - only needed if attendance integration is required
// const AttendanceRecord = require('../models/AttendanceRecord.model');
const PayrollRecord = require('../models/PayrollRecord.model');
const logger = require('../config/logger');

class UnifiedPayrollService {
  
  /**
   * Calculate attendance-adjusted gross salary
   */
  calculateAdjustedGross(baseSalary, totalDays, eligibleDays) {
    return (baseSalary / totalDays) * eligibleDays;
  }
  
  /**
   * Calculate performance adjustments for Sales staff
   */
  calculatePerformanceAdjustments(actualSales, targetSales, adjustedGross, performanceRules) {
    const salesPercentage = (actualSales / targetSales) * 100;
    let salesDeduction = 0;
    let salesIncentive = 0;
    let performanceStatus = 'AVERAGE';
    let performanceColor = 'YELLOW';
    
    if (salesPercentage < performanceRules.safety_floor) {
      // Below safety floor - maximum deduction
      salesDeduction = adjustedGross * (performanceRules.deduction_percentage / 100);
      performanceStatus = 'POOR';
      performanceColor = 'RED';
    } else if (salesPercentage < performanceRules.buffer_threshold) {
      // Between safety floor and buffer - partial deduction
      const deductionFactor = (performanceRules.buffer_threshold - salesPercentage) / 
                             (performanceRules.buffer_threshold - performanceRules.safety_floor);
      salesDeduction = adjustedGross * (performanceRules.deduction_percentage / 100) * deductionFactor;
      performanceStatus = 'BELOW_AVERAGE';
      performanceColor = 'RED';
    } else if (salesPercentage >= 100) {
      // Above target - incentive
      const incentiveFactor = (salesPercentage - 100) / 100;
      salesIncentive = adjustedGross * 0.1 * incentiveFactor; // 10% of gross as max incentive
      performanceStatus = 'EXCELLENT';
      performanceColor = 'GREEN';
    } else {
      // Between buffer and target - no deduction, no incentive
      performanceStatus = 'GOOD';
      performanceColor = 'YELLOW';
    }
    
    return {
      salesPercentage,
      salesDeduction,
      salesIncentive,
      performanceStatus,
      performanceColor
    };
  }
  
  /**
   * Calculate salary components based on category
   */
  calculateSalaryComponents(category, adjustedGross, salesDeduction, salesIncentive) {
    let basic, hra, da, specialAllowance, variablePay;
    
    if (category === 'SALES') {
      // Sales staff structure
      basic = adjustedGross * 0.5;
      hra = basic * 0.5;
      da = 0;
      specialAllowance = adjustedGross - basic - hra - salesDeduction;
      variablePay = salesIncentive;
    } else {
      // Backend staff structure
      basic = adjustedGross * 0.6;
      hra = basic * 0.5;
      da = basic * 0.05;
      specialAllowance = adjustedGross - basic - hra - da;
      variablePay = 0;
    }
    
    return {
      basic: Math.max(0, basic),
      hra: Math.max(0, hra),
      da: Math.max(0, da),
      specialAllowance: Math.max(0, specialAllowance),
      variablePay: Math.max(0, variablePay)
    };
  }
  
  /**
   * Calculate statutory deductions
   */
  calculateStatutoryDeductions(basic, gross, state, ptRate = 200, tdsAmount = 0) {
    // EPF calculation (12% of basic, capped at ₹1,800)
    const epfEmployee = Math.min(basic * 0.12, 1800);
    const epfEmployer = Math.min(basic * 0.12, 1800);
    
    // ESIC calculation (only if gross <= ₹21,000)
    let esicEmployee = 0;
    let esicEmployer = 0;
    if (gross <= 21000) {
      esicEmployee = gross * 0.0075;
      esicEmployer = gross * 0.0325;
    }
    
    // Professional Tax (state-specific)
    const professionalTax = ptRate;
    
    // TDS
    const tds = tdsAmount;
    
    const totalEmployeeDeductions = epfEmployee + esicEmployee + professionalTax + tds;
    
    return {
      epfEmployee,
      epfEmployer,
      esicEmployee,
      esicEmployer,
      professionalTax,
      tds,
      totalEmployeeDeductions
    };
  }
  
  /**
   * Calculate employer contributions
   */
  calculateEmployerContributions(basic, gross) {
    // EPF Employer (12% of basic, capped at ₹1,800)
    const epfEmployer = Math.min(basic * 0.12, 1800);
    
    // ESIC Employer (3.25% of gross if gross <= ₹21,000)
    let esicEmployer = 0;
    if (gross <= 21000) {
      esicEmployer = gross * 0.0325;
    }
    
    // Gratuity (4.81% of basic)
    const gratuity = basic * 0.0481;
    
    const totalEmployerContributions = epfEmployer + esicEmployer + gratuity;
    
    return {
      epfEmployer,
      esicEmployer,
      gratuity,
      totalEmployerContributions
    };
  }
  
  /**
   * Calculate net salary and CTC
   */
  calculateNetSalaryAndCTC(adjustedGross, variablePay, totalEmployeeDeductions, salesDeduction, totalEmployerContributions) {
    const netTakeHome = adjustedGross + variablePay - totalEmployeeDeductions - salesDeduction;
    const monthlyCTC = netTakeHome + totalEmployeeDeductions + totalEmployerContributions;
    const annualCTC = monthlyCTC * 12;
    
    return {
      netTakeHome: Math.max(0, netTakeHome),
      monthlyCTC,
      annualCTC
    };
  }
  
  /**
   * Process unified payroll for an employee
   */
  async processEmployeePayroll(employeeCode, month, year, userId) {
    try {
      // Get employee master data
      const employee = await EmployeeMaster.getCurrentEmployee(employeeCode);
      if (!employee) {
        throw new Error('Employee not found');
      }
      
      // Get attendance record (optional - only if AttendanceRecord model exists)
      let attendance = null;
      try {
        const AttendanceRecord = require('../models/AttendanceRecord.model');
        attendance = await AttendanceRecord.getAttendanceForPayroll(employeeCode, month, year);
      } catch (err) {
        logger.warn('AttendanceRecord model not available, using default attendance', { employeeCode });
        // Use default attendance if model not available
        attendance = {
          total_days: 30,
          present_days: 30,
          eligible_days: 30,
          actual_sales: 0
        };
      }
      if (!attendance) {
        // Use default attendance
        attendance = {
          total_days: 30,
          present_days: 30,
          eligible_days: 30,
          actual_sales: 0
        };
      }
      
      // Check if payroll already exists
      const existingPayroll = await PayrollRecord.getEmployeePayroll(employeeCode, month, year);
      if (existingPayroll && existingPayroll.status === 'LOCKED') {
        throw new Error('Payroll already locked for this period');
      }
      
      // Step 1: Calculate attendance-adjusted gross
      const adjustedGross = this.calculateAdjustedGross(
        employee.base_salary,
        attendance.total_days,
        attendance.eligible_days
      );
      
      // Step 2: Calculate performance adjustments (for Sales staff)
      let performanceData = {
        salesPercentage: 0,
        salesDeduction: 0,
        salesIncentive: 0,
        performanceStatus: 'AVERAGE',
        performanceColor: 'YELLOW'
      };
      
      if (employee.category === 'SALES' && employee.target_sales > 0) {
        performanceData = this.calculatePerformanceAdjustments(
          attendance.actual_sales,
          employee.target_sales,
          adjustedGross,
          employee.performance_rules
        );
      }
      
      // Step 3: Calculate salary components
      const salaryComponents = this.calculateSalaryComponents(
        employee.category,
        adjustedGross,
        performanceData.salesDeduction,
        performanceData.salesIncentive
      );
      
      // Step 4: Calculate statutory deductions
      const statutoryDeductions = this.calculateStatutoryDeductions(
        salaryComponents.basic,
        adjustedGross,
        employee.state,
        200, // PT rate - should be configurable
        0    // TDS amount - should be calculated from tax module
      );
      
      // Step 5: Calculate employer contributions
      const employerContributions = this.calculateEmployerContributions(
        salaryComponents.basic,
        adjustedGross
      );
      
      // Step 6: Calculate net salary and CTC
      const netSalaryCTC = this.calculateNetSalaryAndCTC(
        adjustedGross,
        salaryComponents.variablePay,
        statutoryDeductions.totalEmployeeDeductions,
        performanceData.salesDeduction,
        employerContributions.totalEmployerContributions
      );
      
      // Create or update payroll record
      const payrollData = {
        employee_code: employeeCode,
        month,
        year,
        total_days: attendance.total_days,
        present_days: attendance.present_days,
        eligible_days: attendance.eligible_days,
        base_salary: employee.base_salary,
        adjusted_gross: adjustedGross,
        target_sales: employee.target_sales,
        actual_sales: attendance.actual_sales,
        sales_percentage: performanceData.salesPercentage,
        sales_deduction: performanceData.salesDeduction,
        sales_incentive: performanceData.salesIncentive,
        basic_salary: salaryComponents.basic,
        hra: salaryComponents.hra,
        da: salaryComponents.da,
        special_allowance: salaryComponents.specialAllowance,
        variable_pay: salaryComponents.variablePay,
        epf_employee: statutoryDeductions.epfEmployee,
        esic_employee: statutoryDeductions.esicEmployee,
        professional_tax: statutoryDeductions.professionalTax,
        tds: statutoryDeductions.tds,
        total_employee_deductions: statutoryDeductions.totalEmployeeDeductions,
        net_take_home: netSalaryCTC.netTakeHome,
        epf_employer: employerContributions.epfEmployer,
        esic_employer: employerContributions.esicEmployer,
        gratuity: employerContributions.gratuity,
        total_employer_contributions: employerContributions.totalEmployerContributions,
        monthly_ctc: netSalaryCTC.monthlyCTC,
        annual_ctc: netSalaryCTC.annualCTC,
        performance_status: performanceData.performanceStatus,
        performance_color: performanceData.performanceColor,
        status: 'DRAFT',
        created_by: userId
      };
      
      let payrollRecord;
      if (existingPayroll) {
        payrollRecord = await PayrollRecord.findByIdAndUpdate(
          existingPayroll._id,
          { ...payrollData, updated_by: userId },
          { new: true }
        );
      } else {
        payrollRecord = new PayrollRecord(payrollData);
        await payrollRecord.save();
      }
      
      logger.info('Employee payroll processed successfully', {
        employeeCode,
        month,
        year,
        payrollId: payrollRecord._id
      });
      
      return payrollRecord;
      
    } catch (error) {
      logger.error('Error processing employee payroll', {
        error: error.message,
        employeeCode,
        month,
        year
      });
      throw error;
    }
  }
  
  /**
   * Process payroll for all employees in a month
   */
  async processMonthlyPayroll(month, year, userId) {
    try {
      const employees = await EmployeeMaster.find({ is_current: true });
      const results = [];
      
      for (const employee of employees) {
        try {
          const payroll = await this.processEmployeePayroll(
            employee.employee_code,
            month,
            year,
            userId
          );
          results.push({
            employee_code: employee.employee_code,
            status: 'SUCCESS',
            payroll_id: payroll._id
          });
        } catch (error) {
          results.push({
            employee_code: employee.employee_code,
            status: 'ERROR',
            error: error.message
          });
        }
      }
      
      logger.info('Monthly payroll processing completed', {
        month,
        year,
        total_employees: employees.length,
        successful: results.filter(r => r.status === 'SUCCESS').length,
        failed: results.filter(r => r.status === 'ERROR').length
      });
      
      return results;
      
    } catch (error) {
      logger.error('Error processing monthly payroll', {
        error: error.message,
        month,
        year
      });
      throw error;
    }
  }
  
  /**
   * Get payroll summary for a month
   */
  async getPayrollSummary(month, year) {
    try {
      const summary = await PayrollRecord.getMonthlyPayrollSummary(month, year);
      const performanceAnalytics = await PayrollRecord.getPerformanceAnalytics(month, year);
      
      return {
        summary: summary[0] || {},
        performanceAnalytics,
        generatedAt: new Date()
      };
      
    } catch (error) {
      logger.error('Error getting payroll summary', {
        error: error.message,
        month,
        year
      });
      throw error;
    }
  }
  
  /**
   * Lock payroll for a month
   */
  async lockMonthlyPayroll(month, year, userId) {
    try {
      const result = await PayrollRecord.updateMany(
        { month, year, status: { $in: ['DRAFT', 'SUBMITTED', 'APPROVED'] } },
        { 
          $set: { 
            status: 'LOCKED',
            locked_by: userId,
            locked_at: new Date()
          }
        }
      );
      
      logger.info('Monthly payroll locked successfully', {
        month,
        year,
        locked_records: result.modifiedCount
      });
      
      return result;
      
    } catch (error) {
      logger.error('Error locking monthly payroll', {
        error: error.message,
        month,
        year
      });
      throw error;
    }
  }
}

module.exports = new UnifiedPayrollService();
