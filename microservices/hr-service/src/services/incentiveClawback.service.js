const IncentiveClaim = require('../models/IncentiveClaim.model');
const ReturnsRemakesFeed = require('../models/ReturnsRemakesFeed.model');
const PayrollComponent = require('../models/PayrollComponent.model');
const PayrollRun = require('../models/PayrollRun.model');
const Employee = require('../models/Employee.model');
const logger = require('../config/logger');

class IncentiveClawbackService {
  
  /**
   * Create incentive claim
   */
  async createIncentiveClaim(claimData, createdBy) {
    try {
      const {
        employee_id,
        month,
        year,
        store_id,
        target_sales,
        actual_sales,
        basis_json
      } = claimData;
      
      const employee = await Employee.findById(employee_id);
      if (!employee) {
        throw new Error('Employee not found');
      }
      
      // Calculate achievement percentage
      const achievement_percentage = target_sales > 0 
        ? (actual_sales / target_sales) * 100 
        : 0;
      
      // Get incentive slab (from employee master or policy)
      const incentiveSlab = this.calculateIncentiveSlab(actual_sales, target_sales, employee);
      
      // Calculate incentive amount
      const calculated_amount = this.calculateIncentiveAmount(
        actual_sales,
        target_sales,
        incentiveSlab,
        employee
      );
      
      // Check eligibility gates
      const eligibility = await this.checkEligibility(employee_id, month, year);
      
      // Determine tier
      const tier = this.determineTier(calculated_amount);
      
      // Create claim
      const claim = new IncentiveClaim({
        employee_id,
        employee_code: employee.code,
        employee_name: employee.fullName,
        month,
        year,
        period: `${year}-${String(month).padStart(2, '0')}`,
        store_id,
        store_name: employee.workLocation?.storeName || 'Unknown',
        target_sales,
        actual_sales,
        achievement_percentage,
        incentive_slab: incentiveSlab,
        calculated_amount,
        approved_amount: calculated_amount, // Initially same, can be adjusted
        basis_json: basis_json || {},
        eligibility,
        status: 'PENDING',
        tier,
        created_by: createdBy
      });
      
      await claim.save();
      
      logger.info(`Incentive claim created: ${claim.claim_id}`);
      return claim;
    } catch (error) {
      logger.error('Error creating incentive claim:', error);
      throw error;
    }
  }
  
  /**
   * Approve incentive claim
   */
  async approveIncentiveClaim(claimId, approverId, level, amount, comments) {
    try {
      const claim = await IncentiveClaim.findById(claimId);
      if (!claim) {
        throw new Error('Incentive claim not found');
      }
      
      // Update approval based on level
      if (level === 1) {
        // Store Manager approval
        claim.approvals_json.store_manager.proposed = true;
        claim.approvals_json.store_manager.proposed_by = approverId;
        claim.approvals_json.store_manager.proposed_at = new Date();
        claim.approvals_json.store_manager.amount = amount || claim.calculated_amount;
        claim.approvals_json.store_manager.comments = comments;
      } else if (level === 2) {
        // Area Manager approval
        claim.approvals_json.area_manager.validated = true;
        claim.approvals_json.area_manager.validated_by = approverId;
        claim.approvals_json.area_manager.validated_at = new Date();
        claim.approvals_json.area_manager.amount = amount || claim.approvals_json.store_manager.amount;
        claim.approvals_json.area_manager.comments = comments;
      } else if (level === 3) {
        // Finance approval
        claim.approvals_json.finance.posted = true;
        claim.approvals_json.finance.posted_by = approverId;
        claim.approvals_json.finance.posted_at = new Date();
        claim.approvals_json.finance.amount = amount || claim.approvals_json.area_manager.amount;
        claim.approvals_json.finance.comments = comments;
        claim.status = 'APPROVED';
        claim.approved_amount = amount || claim.approvals_json.area_manager.amount;
      }
      
      await claim.save();
      
      logger.info(`Incentive claim ${claimId} approved at level ${level}`);
      return claim;
    } catch (error) {
      logger.error('Error approving incentive claim:', error);
      throw error;
    }
  }
  
  /**
   * Apply claw-back
   */
  async applyClawback(runId, method = 'OFFSET_NEXT_MONTH') {
    try {
      const run = await PayrollRun.findOne({ run_id: runId });
      if (!run) {
        throw new Error('Payroll run not found');
      }
      
      // Get all returns/remakes for the period
      const returnsRemakes = await ReturnsRemakesFeed.find({
        month: run.month,
        year: run.year,
        policy_applicable: true,
        clawback_applicable: true,
        clawback_applied: false,
        exemption: false
      });
      
      const clawbackResults = [];
      
      for (const rr of returnsRemakes) {
        if (method === 'OFFSET_NEXT_MONTH') {
          // Find original incentive and deduct
          const originalIncentive = await IncentiveClaim.findOne({
            employee_id: rr.employee_id,
            invoice_id: rr.invoice_id,
            status: 'PAID'
          });
          
          if (originalIncentive) {
            // Calculate claw-back amount (proportional to incentive)
            const clawbackAmount = (rr.amount / originalIncentive.actual_sales) * originalIncentive.approved_amount;
            
            // Create payroll component for claw-back
            const component = new PayrollComponent({
              employee_id: rr.employee_id,
              employee_code: rr.employee_code,
              run_id: runId,
              month: run.month,
              year: run.year,
              type: 'DEDUCTIONS',
              code: 'CLAWBACK',
              name: 'Claw-back (Return/Remake)',
              amount: clawbackAmount,
              source: 'CALC',
              clawback: {
                return_remake_id: rr._id,
                invoice_id: rr.invoice_id,
                original_incentive_amount: originalIncentive.approved_amount,
                clawback_amount: clawbackAmount,
                reason: `Return/Remake for invoice ${rr.invoice_id}`
              }
            });
            
            await component.save();
            
            // Update returns/remakes feed
            rr.clawback_applied = true;
            rr.clawback_amount = clawbackAmount;
            rr.clawback_applied_in_run_id = runId;
            rr.clawback_applied_at = new Date();
            await rr.save();
            
            clawbackResults.push({
              employee_code: rr.employee_code,
              invoice_id: rr.invoice_id,
              clawback_amount: clawbackAmount
            });
          }
        } else if (method === 'POOL_PENALTY') {
          // Distribute penalty across store team
          const storeEmployees = await Employee.find({
            'workLocation.storeId': rr.store_id,
            status: 'ACTIVE'
          });
          
          const penaltyPercentage = 0.1; // 10% of amount
          const totalPenalty = rr.amount * penaltyPercentage;
          const perEmployeePenalty = totalPenalty / storeEmployees.length;
          
          for (const emp of storeEmployees) {
            const component = new PayrollComponent({
              employee_id: emp._id,
              employee_code: emp.code,
              run_id: runId,
              month: run.month,
              year: run.year,
              type: 'DEDUCTIONS',
              code: 'CLAWBACK',
              name: 'Claw-back (Pool Penalty)',
              amount: perEmployeePenalty,
              source: 'CALC',
              clawback: {
                return_remake_id: rr._id,
                invoice_id: rr.invoice_id,
                original_incentive_amount: 0,
                clawback_amount: perEmployeePenalty,
                reason: `Pool penalty for return/remake ${rr.invoice_id}`
              }
            });
            
            await component.save();
          }
          
          rr.clawback_applied = true;
          rr.clawback_method = 'POOL_PENALTY';
          rr.pool_penalty.enabled = true;
          rr.pool_penalty.percentage = penaltyPercentage;
          rr.pool_penalty.distributed_amount = totalPenalty;
          await rr.save();
        }
      }
      
      // Update run totals
      run.total_clawback = clawbackResults.reduce((sum, r) => sum + r.clawback_amount, 0);
      await run.save();
      
      logger.info(`Claw-back applied for run ${runId}: ${clawbackResults.length} items`);
      return { applied: clawbackResults.length, results: clawbackResults };
    } catch (error) {
      logger.error('Error applying claw-back:', error);
      throw error;
    }
  }
  
  /**
   * Process returns/remakes feed
   */
  async processReturnsRemakesFeed(feedData, createdBy) {
    try {
      const {
        invoice_id,
        employee_id,
        type,
        amount,
        date,
        original_sale_date,
        reason,
        policy_window_days = 30
      } = feedData;
      
      const employee = await Employee.findById(employee_id);
      if (!employee) {
        throw new Error('Employee not found');
      }
      
      // Calculate days since sale
      const daysSinceSale = Math.ceil((new Date(date) - new Date(original_sale_date)) / (1000 * 60 * 60 * 24));
      const withinPolicyWindow = daysSinceSale <= policy_window_days;
      
      const feed = new ReturnsRemakesFeed({
        invoice_id,
        invoice_number: invoice_id,
        invoice_date: new Date(original_sale_date),
        employee_id,
        employee_code: employee.code,
        employee_name: employee.fullName,
        store_id: employee.workLocation?.storeId,
        store_name: employee.workLocation?.storeName || 'Unknown',
        type,
        invoice_amount: amount,
        amount,
        date: new Date(date),
        original_sale_date: new Date(original_sale_date),
        days_since_sale: daysSinceSale,
        policy_applicable: true,
        policy_window_days,
        within_policy_window: withinPolicyWindow,
        clawback_applicable: withinPolicyWindow,
        reason,
        source: 'SALES_SERVICE',
        imported_at: new Date(),
        created_by: createdBy
      });
      
      await feed.save();
      
      logger.info(`Returns/remakes feed created: ${feed.feed_id}`);
      return feed;
    } catch (error) {
      logger.error('Error processing returns/remakes feed:', error);
      throw error;
    }
  }
  
  /**
   * Calculate incentive slab
   */
  calculateIncentiveSlab(actualSales, targetSales, employee) {
    // This would use employee's incentive_slabs from EmployeeMaster
    // For now, return a default slab
    const achievement = targetSales > 0 ? (actualSales / targetSales) * 100 : 0;
    
    if (achievement >= 150) {
      return {
        slab_name: 'EXCELLENT',
        min_sales: targetSales * 1.5,
        max_sales: Infinity,
        incentive_percentage: 10
      };
    } else if (achievement >= 120) {
      return {
        slab_name: 'GOOD',
        min_sales: targetSales * 1.2,
        max_sales: targetSales * 1.5,
        incentive_percentage: 7
      };
    } else if (achievement >= 100) {
      return {
        slab_name: 'TARGET',
        min_sales: targetSales,
        max_sales: targetSales * 1.2,
        incentive_percentage: 5
      };
    } else {
      return {
        slab_name: 'BELOW_TARGET',
        min_sales: 0,
        max_sales: targetSales,
        incentive_percentage: 0
      };
    }
  }
  
  /**
   * Calculate incentive amount
   */
  calculateIncentiveAmount(actualSales, targetSales, slab, employee) {
    if (slab.incentive_percentage === 0) {
      return 0;
    }
    
    // Calculate based on excess sales
    const excessSales = Math.max(0, actualSales - slab.min_sales);
    const cappedSales = Math.min(excessSales, slab.max_sales - slab.min_sales);
    
    // Get base salary for percentage calculation
    const baseSalary = employee.base_salary || 0;
    
    // Calculate incentive
    const incentive = (cappedSales * slab.incentive_percentage) / 100;
    
    return Math.round(incentive);
  }
  
  /**
   * Check eligibility
   */
  async checkEligibility(employeeId, month, year) {
    // Check training completion, discipline, attendance
    // For now, return default eligibility
    return {
      training_completed: true,
      discipline_clear: true,
      attendance_threshold_met: true,
      other_conditions: {}
    };
  }
  
  /**
   * Determine tier
   */
  determineTier(amount) {
    if (amount >= 50000) return 'VERY_HIGH';
    if (amount >= 25000) return 'HIGH';
    if (amount >= 10000) return 'MEDIUM';
    return 'LOW';
  }
  
  /**
   * Get incentive claims
   */
  async getIncentiveClaims(filters = {}) {
    try {
      const {
        employee_id,
        store_id,
        month,
        year,
        status,
        tier,
        page = 1,
        limit = 10
      } = filters;
      
      const query = {};
      if (employee_id) query.employee_id = employee_id;
      if (store_id) query.store_id = store_id;
      if (month) query.month = parseInt(month);
      if (year) query.year = parseInt(year);
      if (status) query.status = status;
      if (tier) query.tier = tier;
      
      const claims = await IncentiveClaim.find(query)
        .populate('employee_id', 'fullName code email')
        .populate('store_id', 'name code')
        .sort({ created_at: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await IncentiveClaim.countDocuments(query);
      
      return {
        claims,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_records: total
        }
      };
    } catch (error) {
      logger.error('Error getting incentive claims:', error);
      throw error;
    }
  }
}

module.exports = new IncentiveClawbackService();

