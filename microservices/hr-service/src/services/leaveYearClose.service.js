const LeaveLedger = require('../models/LeaveLedger.model');
const LeavePolicy = require('../models/LeavePolicy.model');
const Employee = require('../models/Employee.model');
const logger = require('../config/logger');

class LeaveYearCloseService {
  
  /**
   * Process leave year close
   */
  async processLeaveYearClose(year, processedBy) {
    try {
      const employees = await Employee.find({ status: 'ACTIVE' });
      
      const results = {
        processed: 0,
        carry_forwarded: 0,
        encashed: 0,
        errors: []
      };
      
      for (const employee of employees) {
        try {
          // Get leave policy
          const policy = await this.getLeavePolicyForEmployee(employee._id);
          if (!policy) continue;
          
          // Process each leave type
          for (const leaveTypeConfig of policy.leave_types) {
            const leaveType = leaveTypeConfig.leave_type;
            
            // Get December ledger (last month of year)
            const decLedger = await LeaveLedger.findOne({
              employee_id: employee._id,
              'period.year': year,
              'period.month': 12,
              leave_type
            });
            
            if (!decLedger) continue;
            
            // Process carry-forward
            if (leaveTypeConfig.carry_forward.enabled && decLedger.closing > 0) {
              const carryForwardDays = Math.min(
                decLedger.closing,
                leaveTypeConfig.carry_forward.max_days || 0
              );
              
              if (carryForwardDays > 0) {
                // Create January ledger for next year with carry-forward
                const janLedger = await LeaveLedger.findOne({
                  employee_id: employee._id,
                  'period.year': year + 1,
                  'period.month': 1,
                  leave_type
                });
                
                if (!janLedger) {
                  const newLedger = new LeaveLedger({
                    employee_id: employee._id,
                    employee_code: employee.code,
                    period: { year: year + 1, month: 1 },
                    leave_type,
                    opening: carryForwardDays,
                    accrual: 0,
                    used: 0,
                    encashed: 0,
                    carried_forward: carryForwardDays,
                    carried_from_period: { year, month: 12 },
                    closing: carryForwardDays
                  });
                  
                  await newLedger.save();
                  results.carry_forwarded += carryForwardDays;
                }
              }
            }
            
            // Process EL encashment if applicable
            if (leaveType === 'EL' && 
                leaveTypeConfig.encashment.enabled &&
                leaveTypeConfig.encashment.applicable_at === 'YEAR_END' &&
                decLedger.closing > 0) {
              
              await this.processELEncashment(employee, decLedger, leaveTypeConfig, year);
              results.encashed += decLedger.closing;
            }
          }
          
          // Generate statement for employee
          await this.generateLeaveStatement(employee, year);
          
          results.processed++;
        } catch (error) {
          logger.error(`Error processing year close for employee ${employee.code}:`, error);
          results.errors.push({
            employee_code: employee.code,
            error: error.message
          });
        }
      }
      
      logger.info(`Leave year close processed for ${year}: ${results.processed} employees`);
      return results;
    } catch (error) {
      logger.error('Error processing leave year close:', error);
      throw error;
    }
  }
  
  /**
   * Process EL encashment
   */
  async processELEncashment(employee, ledger, leaveTypeConfig, year) {
    const encashmentDays = ledger.closing;
    const encashmentRate = leaveTypeConfig.encashment.rate; // BASIC or GROSS
    
    // Get basic salary
    const basicSalary = employee.base_salary || 0;
    const dailyRate = basicSalary / 30;
    const encashmentAmount = dailyRate * encashmentDays;
    
    // Update ledger
    ledger.encashed = encashmentDays;
    ledger.encashed_amount = encashmentAmount;
    ledger.encashment_date = new Date();
    ledger.closing = 0; // All encashed
    await ledger.save();
    
    // Create EL encashment JV entry (would integrate with financial service)
    // For now, just log
    logger.info(`EL encashment for ${employee.code}: ${encashmentDays} days = ₹${encashmentAmount}`);
    
    return {
      days: encashmentDays,
      amount: encashmentAmount,
      rate: encashmentRate
    };
  }
  
  /**
   * Generate leave statement
   */
  async generateLeaveStatement(employee, year) {
    // Get all leave ledgers for the year
    const ledgers = await LeaveLedger.find({
      employee_id: employee._id,
      'period.year': year
    }).sort({ 'period.month': 1, leave_type: 1 });
    
    // Generate statement (would create PDF)
    const statement = {
      employee_code: employee.code,
      employee_name: employee.fullName,
      year,
      leave_summary: ledgers.map(l => ({
        leave_type: l.leave_type,
        opening: l.opening,
        accrual: l.accrual,
        used: l.used,
        encashed: l.encashed,
        closing: l.closing
      }))
    };
    
    // Save statement URL (would generate PDF)
    const statementUrl = `/documents/leave-statements/${employee.code}-${year}.pdf`;
    
    logger.info(`Leave statement generated for ${employee.code} - ${year}`);
    return { statement, statementUrl };
  }
  
  /**
   * Get leave policy for employee
   */
  async getLeavePolicyForEmployee(employeeId) {
    const employee = await Employee.findById(employeeId);
    if (!employee) return null;
    
    return await LeavePolicy.findOne({
      $or: [
        { role_group: employee.roleFamily },
        { role_group: 'ALL' }
      ],
      is_active: true,
      applicable_from: { $lte: new Date() },
      $or: [
        { applicable_to: null },
        { applicable_to: { $gte: new Date() } }
      ]
    }).sort({ version: -1 });
  }
}

module.exports = new LeaveYearCloseService();

