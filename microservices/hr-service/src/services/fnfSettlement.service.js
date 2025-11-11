const FnFCase = require('../models/FnFCase.model');
const LeaveLedger = require('../models/LeaveLedger.model');
const IncentiveClaim = require('../models/IncentiveClaim.model');
const Employee = require('../models/Employee.model');
const logger = require('../config/logger');

class FnFSettlementService {
  
  /**
   * Initiate F&F case
   */
  async initiateFnFCase(caseData, initiatedBy) {
    try {
      const {
        employee_id,
        lwd,
        reason,
        reason_details
      } = caseData;
      
      const employee = await Employee.findById(employee_id);
      if (!employee) {
        throw new Error('Employee not found');
      }
      
      // Create F&F case
      const fnfCase = new FnFCase({
        employee_id,
        employee_code: employee.code,
        employee_name: employee.fullName,
        lwd: new Date(lwd),
        doj: employee.doj,
        reason,
        reason_details,
        status: 'INITIATED',
        initiated_by: initiatedBy,
        initiated_at: new Date()
      });
      
      await fnfCase.save();
      
      // Start calculation process
      await this.calculateFnFComponents(fnfCase._id);
      
      logger.info(`F&F case initiated: ${fnfCase.case_id}`);
      return fnfCase;
    } catch (error) {
      logger.error('Error initiating F&F case:', error);
      throw error;
    }
  }
  
  /**
   * Calculate F&F components
   */
  async calculateFnFComponents(caseId) {
    try {
      const fnfCase = await FnFCase.findById(caseId);
      if (!fnfCase) {
        throw new Error('F&F case not found');
      }
      
      fnfCase.status = 'CALCULATING';
      await fnfCase.save();
      
      const employee = await Employee.findById(fnfCase.employee_id);
      
      // 1. Calculate unpaid salary
      await this.calculateUnpaidSalary(fnfCase, employee);
      
      // 2. Calculate EL encashment
      await this.calculateELEncashment(fnfCase, employee);
      
      // 3. Calculate approved incentives
      await this.calculateApprovedIncentives(fnfCase, employee);
      
      // 4. Calculate recoveries
      await this.calculateRecoveries(fnfCase, employee);
      
      // 5. Calculate statutory deductions
      await this.calculateStatutoryDeductions(fnfCase, employee);
      
      // Calculate totals
      fnfCase.total_payable = 
        fnfCase.components.unpaid_salary.amount +
        fnfCase.components.el_encashment.amount +
        fnfCase.components.approved_incentives.amount;
      
      fnfCase.total_receivable = fnfCase.components.recoveries.total;
      
      fnfCase.net_settlement = fnfCase.total_payable - fnfCase.total_receivable;
      
      fnfCase.status = 'PENDING_APPROVAL';
      await fnfCase.save();
      
      logger.info(`F&F components calculated for case: ${fnfCase.case_id}`);
      return fnfCase;
    } catch (error) {
      logger.error('Error calculating F&F components:', error);
      throw error;
    }
  }
  
  /**
   * Calculate unpaid salary
   */
  async calculateUnpaidSalary(fnfCase, employee) {
    // Calculate days from last salary date to LWD
    const lwd = new Date(fnfCase.lwd);
    const lastSalaryDate = new Date(lwd.getFullYear(), lwd.getMonth(), 1);
    const daysWorked = Math.ceil((lwd - lastSalaryDate) / (1000 * 60 * 60 * 24));
    const totalDaysInMonth = new Date(lwd.getFullYear(), lwd.getMonth() + 1, 0).getDate();
    
    const dailyRate = (employee.base_salary || 0) / totalDaysInMonth;
    const unpaidAmount = dailyRate * daysWorked;
    
    fnfCase.components.unpaid_salary.amount = Math.round(unpaidAmount);
    fnfCase.components.unpaid_salary.days = daysWorked;
    fnfCase.components.unpaid_salary.calculated = true;
  }
  
  /**
   * Calculate EL encashment
   */
  async calculateELEncashment(fnfCase, employee) {
    const currentYear = new Date().getFullYear();
    const ledger = await LeaveLedger.findOne({
      employee_id: fnfCase.employee_id,
      'period.year': currentYear,
      leave_type: 'EL'
    });
    
    if (ledger && ledger.closing > 0) {
      // Get basic salary for encashment rate
      const basicSalary = employee.base_salary || 0;
      const dailyRate = basicSalary / 30; // Approximate daily rate
      const encashmentAmount = dailyRate * ledger.closing;
      
      fnfCase.components.el_encashment.amount = Math.round(encashmentAmount);
      fnfCase.components.el_encashment.days = ledger.closing;
      fnfCase.components.el_encashment.rate = 'BASIC';
      fnfCase.components.el_encashment.calculated = true;
    } else {
      fnfCase.components.el_encashment.calculated = true;
    }
  }
  
  /**
   * Calculate approved incentives
   */
  async calculateApprovedIncentives(fnfCase, employee) {
    const incentives = await IncentiveClaim.find({
      employee_id: fnfCase.employee_id,
      status: 'APPROVED',
      paid: false
    });
    
    let totalAmount = 0;
    const claims = [];
    
    for (const inc of incentives) {
      totalAmount += inc.approved_amount;
      claims.push({
        claim_id: inc._id,
        amount: inc.approved_amount
      });
    }
    
    fnfCase.components.approved_incentives.amount = totalAmount;
    fnfCase.components.approved_incentives.claims = claims;
    fnfCase.components.approved_incentives.calculated = true;
  }
  
  /**
   * Calculate recoveries
   */
  async calculateRecoveries(fnfCase, employee) {
    // Calculate notice period shortfall
    const noticePeriodDays = fnfCase.notice_period_days || 0;
    const noticeServedDays = fnfCase.notice_served_days || 0;
    const shortfallDays = Math.max(0, noticePeriodDays - noticeServedDays);
    
    if (shortfallDays > 0) {
      const dailyRate = (employee.base_salary || 0) / 30;
      const shortfallAmount = dailyRate * shortfallDays;
      
      fnfCase.components.recoveries.items.push({
        type: 'NOTICE_SHORTFALL',
        description: `Notice period shortfall: ${shortfallDays} days`,
        amount: Math.round(shortfallAmount),
        recovered: false
      });
    }
    
    // Add other recoveries (assets, advances, loans) - would come from other systems
    fnfCase.components.recoveries.total = fnfCase.components.recoveries.items.reduce(
      (sum, item) => sum + item.amount, 0
    );
    fnfCase.components.recoveries.calculated = true;
  }
  
  /**
   * Calculate statutory deductions
   */
  async calculateStatutoryDeductions(fnfCase, employee) {
    // TDS on F&F
    const totalPayable = fnfCase.total_payable;
    const tdsAmount = this.calculateTDS(totalPayable, employee);
    
    fnfCase.components.statutory_deductions.tds = tdsAmount;
    fnfCase.components.statutory_deductions.pf_final = 0; // Would calculate from PF balance
    fnfCase.components.statutory_deductions.esic_final = 0; // Would calculate from ESIC balance
    fnfCase.components.statutory_deductions.calculated = true;
    
    // Update statutory section
    fnfCase.statutory.tds_on_fnf = tdsAmount;
  }
  
  /**
   * Calculate TDS
   */
  calculateTDS(amount, employee) {
    // Simplified TDS calculation
    // In production, would use proper tax slabs
    if (amount > 500000) {
      return amount * 0.30; // 30% for high amounts
    } else if (amount > 250000) {
      return amount * 0.20; // 20%
    } else if (amount > 100000) {
      return amount * 0.10; // 10%
    }
    return 0;
  }
  
  /**
   * Approve F&F case
   */
  async approveFnFCase(caseId, approverId, level, comments) {
    try {
      const fnfCase = await FnFCase.findById(caseId);
      if (!fnfCase) {
        throw new Error('F&F case not found');
      }
      
      if (level === 1) {
        // Manager approval
        fnfCase.approvals.manager.approved = true;
        fnfCase.approvals.manager.approved_by = approverId;
        fnfCase.approvals.manager.approved_at = new Date();
        fnfCase.approvals.manager.comments = comments;
      } else if (level === 2) {
        // Accounts approval
        fnfCase.approvals.accounts.approved = true;
        fnfCase.approvals.accounts.approved_by = approverId;
        fnfCase.approvals.accounts.approved_at = new Date();
        fnfCase.approvals.accounts.comments = comments;
      } else if (level === 3) {
        // HR Head approval
        fnfCase.approvals.hr_head.approved = true;
        fnfCase.approvals.hr_head.approved_by = approverId;
        fnfCase.approvals.hr_head.approved_at = new Date();
        fnfCase.approvals.hr_head.comments = comments;
        fnfCase.status = 'APPROVED';
      }
      
      await fnfCase.save();
      
      logger.info(`F&F case ${caseId} approved at level ${level}`);
      return fnfCase;
    } catch (error) {
      logger.error('Error approving F&F case:', error);
      throw error;
    }
  }
  
  /**
   * Process payout
   */
  async processPayout(caseId, payoutData, initiatedBy) {
    try {
      const fnfCase = await FnFCase.findById(caseId);
      if (!fnfCase) {
        throw new Error('F&F case not found');
      }
      
      if (fnfCase.status !== 'APPROVED') {
        throw new Error('F&F case must be approved before payout');
      }
      
      const {
        payout_method,
        bank_details,
        payout_ref
      } = payoutData;
      
      fnfCase.payout.initiated = true;
      fnfCase.payout.initiated_at = new Date();
      fnfCase.payout.initiated_by = initiatedBy;
      fnfCase.payout.payout_method = payout_method;
      fnfCase.payout.bank_details = bank_details;
      fnfCase.payout.payout_ref = payout_ref;
      fnfCase.payout.payout_date = new Date();
      fnfCase.payout.paid = true;
      fnfCase.payout.paid_at = new Date();
      
      // Generate F&F statement
      await this.generateFnFStatement(fnfCase);
      
      // Generate relieving/experience letters
      await this.generateRelievingLetters(fnfCase);
      
      // Disable system access
      fnfCase.system_access.disabled = true;
      fnfCase.system_access.disabled_at = new Date();
      fnfCase.system_access.disabled_by = initiatedBy;
      
      // Update Form-16
      fnfCase.statutory.form16_updated = true;
      fnfCase.statutory.form16_updated_at = new Date();
      
      await fnfCase.save();
      
      logger.info(`F&F payout processed for case: ${fnfCase.case_id}`);
      return fnfCase;
    } catch (error) {
      logger.error('Error processing F&F payout:', error);
      throw error;
    }
  }
  
  /**
   * Generate F&F statement
   */
  async generateFnFStatement(fnfCase) {
    // This would generate PDF
    // For now, just mark as generated
    fnfCase.statement_generated = true;
    fnfCase.statement_generated_at = new Date();
    fnfCase.statement_url = `/documents/fnf/${fnfCase.case_id}/statement.pdf`;
  }
  
  /**
   * Generate relieving letters
   */
  async generateRelievingLetters(fnfCase) {
    // This would generate PDFs
    fnfCase.relieving_letter_url = `/documents/fnf/${fnfCase.case_id}/relieving-letter.pdf`;
    fnfCase.experience_letter_url = `/documents/fnf/${fnfCase.case_id}/experience-letter.pdf`;
  }
  
  /**
   * Get F&F case
   */
  async getFnFCase(caseId) {
    try {
      const fnfCase = await FnFCase.findById(caseId)
        .populate('employee_id', 'fullName code email doj')
        .populate('initiated_by', 'name email');
      
      if (!fnfCase) {
        throw new Error('F&F case not found');
      }
      
      return fnfCase;
    } catch (error) {
      logger.error('Error getting F&F case:', error);
      throw error;
    }
  }
  
  /**
   * Get F&F cases
   */
  async getFnFCases(filters = {}) {
    try {
      const {
        employee_id,
        status,
        reason,
        page = 1,
        limit = 10
      } = filters;
      
      const query = {};
      if (employee_id) query.employee_id = employee_id;
      if (status) query.status = status;
      if (reason) query.reason = reason;
      
      const cases = await FnFCase.find(query)
        .populate('employee_id', 'fullName code email')
        .sort({ created_at: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await FnFCase.countDocuments(query);
      
      return {
        cases,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_records: total
        }
      };
    } catch (error) {
      logger.error('Error getting F&F cases:', error);
      throw error;
    }
  }
}

module.exports = new FnFSettlementService();

