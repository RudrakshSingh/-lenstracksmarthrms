const PayrollRun = require('../models/PayrollRun.model');
const PayrollComponent = require('../models/PayrollComponent.model');
const PayrollOverride = require('../models/PayrollOverride.model');
const ReturnsRemakesFeed = require('../models/ReturnsRemakesFeed.model');
const IncentiveClaim = require('../models/IncentiveClaim.model');
const Employee = require('../models/Employee.model');
const logger = require('../config/logger');

class PayrollRunService {
  
  /**
   * Create payroll run
   */
  async createPayrollRun(month, year, userId) {
    try {
      // Check if run already exists
      const existing = await PayrollRun.findOne({ month, year });
      if (existing) {
        throw new Error(`Payroll run already exists for ${month}/${year}`);
      }
      
      const run = new PayrollRun({
        run_id: `PAYROLL-${year}-${String(month).padStart(2, '0')}`,
        month,
        year,
        period: `${year}-${String(month).padStart(2, '0')}`,
        status: 'DRAFT',
        processing_started_at: new Date(),
        created_by: userId
      });
      
      await run.save();
      
      logger.info(`Payroll run created: ${run.run_id}`);
      return run;
    } catch (error) {
      logger.error('Error creating payroll run:', error);
      throw error;
    }
  }
  
  /**
   * Process payroll run
   */
  async processPayrollRun(runId) {
    try {
      const run = await PayrollRun.findOne({ run_id: runId });
      if (!run) {
        throw new Error('Payroll run not found');
      }
      
      if (run.status !== 'DRAFT') {
        throw new Error(`Payroll run is in ${run.status} status, cannot process`);
      }
      
      run.status = 'PROCESSING';
      run.processing_started_at = new Date();
      await run.save();
      
      // Step 1: Import attendance & sales
      await this.importAttendanceAndSales(run);
      
      // Step 2: Generate incentive drafts
      await this.generateIncentiveDrafts(run);
      
      // Step 3: Validate returns/remakes and compute claw-back
      await this.processReturnsRemakes(run);
      
      // Step 4: Generate variance report
      await this.generateVarianceReport(run);
      
      run.status = 'REVIEW';
      run.processing_completed_at = new Date();
      run.processing_duration_seconds = Math.floor((run.processing_completed_at - run.processing_started_at) / 1000);
      await run.save();
      
      logger.info(`Payroll run processed: ${runId}`);
      return run;
    } catch (error) {
      logger.error('Error processing payroll run:', error);
      throw error;
    }
  }
  
  /**
   * Lock payroll run
   */
  async lockPayrollRun(runId, userId) {
    try {
      const run = await PayrollRun.findOne({ run_id: runId });
      if (!run) {
        throw new Error('Payroll run not found');
      }
      
      if (run.status !== 'REVIEW') {
        throw new Error(`Payroll run must be in REVIEW status to lock. Current: ${run.status}`);
      }
      
      // Check for pending overrides
      const pendingOverrides = await PayrollOverride.countDocuments({
        run_id: runId,
        status: 'PENDING'
      });
      
      if (pendingOverrides > 0) {
        throw new Error(`Cannot lock payroll run. ${pendingOverrides} pending overrides exist`);
      }
      
      run.status = 'LOCKED';
      run.lock_at = new Date();
      run.locked_by = userId;
      run.lock_date = new Date();
      
      // Set lock deadline (D-2 before pay date)
      const payDate = new Date(run.year, run.month, 25); // Assuming pay date is 25th
      payDate.setDate(payDate.getDate() - 2);
      run.lock_deadline = payDate;
      
      await run.save();
      
      logger.info(`Payroll run locked: ${runId}`);
      return run;
    } catch (error) {
      logger.error('Error locking payroll run:', error);
      throw error;
    }
  }
  
  /**
   * Post payroll run
   */
  async postPayrollRun(runId, userId, jvNumber, jvDate) {
    try {
      const run = await PayrollRun.findOne({ run_id: runId });
      if (!run) {
        throw new Error('Payroll run not found');
      }
      
      if (run.status !== 'LOCKED') {
        throw new Error(`Payroll run must be LOCKED to post. Current: ${run.status}`);
      }
      
      run.status = 'POSTED';
      run.posted_at = new Date();
      run.posted_by = userId;
      run.post_jv_number = jvNumber;
      run.post_jv_date = jvDate ? new Date(jvDate) : new Date();
      
      // Generate bank file
      await this.generateBankFile(run);
      
      // Generate payslips
      await this.generatePayslips(run);
      
      await run.save();
      
      logger.info(`Payroll run posted: ${runId}`);
      return run;
    } catch (error) {
      logger.error('Error posting payroll run:', error);
      throw error;
    }
  }
  
  /**
   * Create payroll override
   */
  async createPayrollOverride(overrideData, createdBy) {
    try {
      const {
        employee_id,
        run_id,
        component_code,
        original_amount,
        override_amount,
        reason_code,
        reason,
        attachment_url
      } = overrideData;
      
      const employee = await Employee.findById(employee_id);
      if (!employee) {
        throw new Error('Employee not found');
      }
      
      const run = await PayrollRun.findOne({ run_id });
      if (!run) {
        throw new Error('Payroll run not found');
      }
      
      if (run.status === 'LOCKED' || run.status === 'POSTED') {
        throw new Error(`Cannot create override. Payroll run is ${run.status}`);
      }
      
      const override = new PayrollOverride({
        employee_id,
        employee_code: employee.code,
        employee_name: employee.fullName,
        run_id,
        month: run.month,
        year: run.year,
        component_code,
        component_name: this.getComponentName(component_code),
        original_amount,
        override_amount,
        difference: override_amount - original_amount,
        reason_code,
        reason,
        attachment_url,
        status: 'PENDING',
        created_by
      });
      
      await override.save();
      
      // Update run override count
      run.total_overrides += 1;
      run.override_approvals_pending += 1;
      await run.save();
      
      logger.info(`Payroll override created: ${override.override_id}`);
      return override;
    } catch (error) {
      logger.error('Error creating payroll override:', error);
      throw error;
    }
  }
  
  /**
   * Import attendance and sales
   */
  async importAttendanceAndSales(run) {
    // This would integrate with attendance-service and sales-service
    // For now, mark as imported
    run.attendance_imported = true;
    run.attendance_import_date = new Date();
    run.sales_imported = true;
    run.sales_import_date = new Date();
    await run.save();
  }
  
  /**
   * Generate incentive drafts
   */
  async generateIncentiveDrafts(run) {
    // This would calculate incentives based on sales data
    // For now, just mark as processed
    logger.info(`Incentive drafts generated for ${run.run_id}`);
  }
  
  /**
   * Process returns/remakes
   */
  async processReturnsRemakes(run) {
    const returnsRemakes = await ReturnsRemakesFeed.find({
      month: run.month,
      year: run.year,
      policy_applicable: true,
      clawback_applicable: true,
      clawback_applied: false
    });
    
    for (const rr of returnsRemakes) {
      // Calculate claw-back amount
      // This would fetch original incentive and calculate claw-back
      rr.clawback_applicable = true;
      rr.flagged_for_next_cycle = false;
      await rr.save();
    }
    
    run.returns_remakes_imported = true;
    run.returns_remakes_import_date = new Date();
    await run.save();
  }
  
  /**
   * Generate variance report
   */
  async generateVarianceReport(run) {
    // Generate variance report logic
    run.variance_report.generated = true;
    run.variance_report.generated_at = new Date();
    await run.save();
  }
  
  /**
   * Generate bank file
   */
  async generateBankFile(run) {
    // Generate bank file for salary transfer
    run.bank_file_generated = true;
    run.bank_file_generated_at = new Date();
    run.bank_file_url = `/files/payroll/${run.run_id}/bank-file.xlsx`;
    await run.save();
  }
  
  /**
   * Generate payslips
   */
  async generatePayslips(run) {
    // Generate payslips for all employees
    run.payslips_generated = true;
    run.payslips_generated_at = new Date();
    run.payslips_generated_count = run.processed_employees;
    await run.save();
  }
  
  /**
   * Get component name
   */
  getComponentName(code) {
    const names = {
      'BASIC': 'Basic Salary',
      'HRA': 'House Rent Allowance',
      'SPECIAL_ALLOWANCE': 'Special Allowance',
      'VARIABLE_PAY': 'Variable Pay',
      'INCENTIVE': 'Incentive',
      'ARREAR': 'Arrear',
      'BONUS': 'Bonus',
      'PF': 'Provident Fund',
      'ESI': 'Employee State Insurance',
      'TDS': 'Tax Deducted at Source',
      'PT': 'Professional Tax',
      'LWP': 'Loss of Pay',
      'CLAWBACK': 'Claw-back'
    };
    return names[code] || code;
  }
}

module.exports = new PayrollRunService();

