const PayrollRun = require('../models/PayrollRun.model');
const PayrollComponent = require('../models/PayrollComponent.model');
const LeaveLedger = require('../models/LeaveLedger.model');
const LeaveRequest = require('../models/LeaveRequest.model');
const IncentiveClaim = require('../models/IncentiveClaim.model');
const FnFCase = require('../models/FnFCase.model');
const StatExport = require('../models/StatExport.model');
const Employee = require('../models/Employee.model');
const logger = require('../config/logger');

class ReportsService {
  
  /**
   * Get payroll cost by store/role
   */
  async getPayrollCostByStoreRole(filters = {}) {
    try {
      const { month, year, store_id, role } = filters;
      
      const query = { run_id: { $exists: true } };
      if (month) query.month = parseInt(month);
      if (year) query.year = parseInt(year);
      
      const components = await PayrollComponent.find(query)
        .populate('employee_id', 'code roleFamily workLocation')
        .populate('run_id')
        .lean(); // Use lean() for read-only queries
      
      const grouped = {};
      
      for (const comp of components) {
        const employee = comp.employee_id;
        if (!employee) continue;
        
        const storeId = employee.workLocation?.storeId?.toString() || 'UNKNOWN';
        const roleName = employee.roleFamily || 'UNKNOWN';
        
        const key = `${storeId}-${roleName}`;
        
        if (!grouped[key]) {
          grouped[key] = {
            store_id: storeId,
            store_name: employee.workLocation?.storeName || 'Unknown',
            role: roleName,
            total_gross: 0,
            total_deductions: 0,
            total_net: 0,
            employee_count: 0
          };
        }
        
        if (comp.type === 'EARNINGS') {
          grouped[key].total_gross += comp.amount;
        } else if (comp.type === 'DEDUCTIONS') {
          grouped[key].total_deductions += comp.amount;
        }
        
        grouped[key].total_net = grouped[key].total_gross - grouped[key].total_deductions;
      }
      
      // Count employees
      for (const key in grouped) {
        const [storeId, roleName] = key.split('-');
        const count = await Employee.countDocuments({
          'workLocation.storeId': storeId,
          roleFamily: roleName,
          status: 'ACTIVE'
        });
        grouped[key].employee_count = count;
      }
      
      return Object.values(grouped);
    } catch (error) {
      logger.error('Error getting payroll cost by store/role:', error);
      throw error;
    }
  }
  
  /**
   * Get incentive as % of sales
   */
  async getIncentiveAsPercentOfSales(filters = {}) {
    try {
      const { month, year, store_id } = filters;
      
      const query = {};
      if (month) query.month = parseInt(month);
      if (year) query.year = parseInt(year);
      if (store_id) query.store_id = store_id;
      
      const claims = await IncentiveClaim.find(query)
        .populate('store_id', 'name code');
      
      const summary = {
        total_sales: 0,
        total_incentives: 0,
        incentive_percentage: 0,
        by_store: {}
      };
      
      for (const claim of claims) {
        summary.total_sales += claim.actual_sales;
        summary.total_incentives += claim.approved_amount;
        
        const storeId = claim.store_id?._id?.toString() || 'UNKNOWN';
        if (!summary.by_store[storeId]) {
          summary.by_store[storeId] = {
            store_id: storeId,
            store_name: claim.store_name,
            total_sales: 0,
            total_incentives: 0,
            incentive_percentage: 0
          };
        }
        
        summary.by_store[storeId].total_sales += claim.actual_sales;
        summary.by_store[storeId].total_incentives += claim.approved_amount;
      }
      
      // Calculate percentages
      if (summary.total_sales > 0) {
        summary.incentive_percentage = (summary.total_incentives / summary.total_sales) * 100;
      }
      
      for (const storeId in summary.by_store) {
        const store = summary.by_store[storeId];
        if (store.total_sales > 0) {
          store.incentive_percentage = (store.total_incentives / store.total_sales) * 100;
        }
      }
      
      return summary;
    } catch (error) {
      logger.error('Error getting incentive as % of sales:', error);
      throw error;
    }
  }
  
  /**
   * Get claw-back report
   */
  async getClawbackReport(filters = {}) {
    try {
      const { month, year, store_id } = filters;
      
      const query = { clawback_applied: true };
      if (month) query.month = parseInt(month);
      if (year) query.year = parseInt(year);
      if (store_id) query.store_id = store_id;
      
      const clawbacks = await PayrollComponent.find({
        code: 'CLAWBACK',
        ...query
      })
        .populate('employee_id', 'code name')
        .populate('run_id');
      
      const summary = {
        total_clawback_amount: 0,
        total_cases: clawbacks.length,
        by_store: {},
        by_employee: {}
      };
      
      for (const cb of clawbacks) {
        summary.total_clawback_amount += cb.amount;
        
        const employee = cb.employee_id;
        const storeId = employee?.workLocation?.storeId?.toString() || 'UNKNOWN';
        
        if (!summary.by_store[storeId]) {
          summary.by_store[storeId] = {
            store_id: storeId,
            total_amount: 0,
            case_count: 0
          };
        }
        summary.by_store[storeId].total_amount += cb.amount;
        summary.by_store[storeId].case_count++;
        
        const empId = employee?._id?.toString() || 'UNKNOWN';
        if (!summary.by_employee[empId]) {
          summary.by_employee[empId] = {
            employee_code: employee?.code || 'UNKNOWN',
            employee_name: employee?.name || 'UNKNOWN',
            total_amount: 0,
            case_count: 0
          };
        }
        summary.by_employee[empId].total_amount += cb.amount;
        summary.by_employee[empId].case_count++;
      }
      
      return summary;
    } catch (error) {
      logger.error('Error getting claw-back report:', error);
      throw error;
    }
  }
  
  /**
   * Get LWP days report
   */
  async getLWPDaysReport(filters = {}) {
    try {
      const { month, year, employee_id, store_id } = filters;
      
      const query = { leave_type: 'LWP' };
      if (month) query['period.month'] = parseInt(month);
      if (year) query['period.year'] = parseInt(year);
      if (employee_id) query.employee_id = employee_id;
      
      const lwpLedgers = await LeaveLedger.find(query)
        .populate('employee_id', 'code name workLocation');
      
      const summary = {
        total_lwp_days: 0,
        total_employees: 0,
        by_store: {},
        by_employee: []
      };
      
      for (const ledger of lwpLedgers) {
        summary.total_lwp_days += ledger.used;
        
        const employee = ledger.employee_id;
        if (!employee) continue;
        
        const storeId = employee.workLocation?.storeId?.toString() || 'UNKNOWN';
        if (!summary.by_store[storeId]) {
          summary.by_store[storeId] = {
            store_id: storeId,
            store_name: employee.workLocation?.storeName || 'Unknown',
            total_days: 0,
            employee_count: 0
          };
        }
        summary.by_store[storeId].total_days += ledger.used;
        
        summary.by_employee.push({
          employee_code: employee.code,
          employee_name: employee.name,
          lwp_days: ledger.used,
          period: ledger.period
        });
      }
      
      summary.total_employees = new Set(lwpLedgers.map(l => l.employee_id?.toString())).size;
      
      return summary;
    } catch (error) {
      logger.error('Error getting LWP days report:', error);
      throw error;
    }
  }
  
  /**
   * Get leave utilization report
   */
  async getLeaveUtilizationReport(filters = {}) {
    try {
      const { year, employee_id, leave_type } = filters;
      
      const query = { 'period.year': parseInt(year) || new Date().getFullYear() };
      if (employee_id) query.employee_id = employee_id;
      if (leave_type) query.leave_type = leave_type;
      
      const ledgers = await LeaveLedger.find(query)
        .populate('employee_id', 'code name department');
      
      const summary = {
        total_accrued: 0,
        total_used: 0,
        total_encashed: 0,
        utilization_percentage: 0,
        by_leave_type: {},
        by_employee: []
      };
      
      for (const ledger of ledgers) {
        summary.total_accrued += ledger.accrual;
        summary.total_used += ledger.used;
        summary.total_encashed += ledger.encashed;
        
        const lt = ledger.leave_type;
        if (!summary.by_leave_type[lt]) {
          summary.by_leave_type[lt] = {
            leave_type: lt,
            accrued: 0,
            used: 0,
            utilization_percentage: 0
          };
        }
        summary.by_leave_type[lt].accrued += ledger.accrual;
        summary.by_leave_type[lt].used += ledger.used;
        
        summary.by_employee.push({
          employee_code: ledger.employee_code,
          employee_name: ledger.employee_id?.name || 'Unknown',
          leave_type: lt,
          accrued: ledger.accrual,
          used: ledger.used,
          balance: ledger.closing
        });
      }
      
      // Calculate utilization percentage
      if (summary.total_accrued > 0) {
        summary.utilization_percentage = (summary.total_used / summary.total_accrued) * 100;
      }
      
      for (const lt in summary.by_leave_type) {
        const type = summary.by_leave_type[lt];
        if (type.accrued > 0) {
          type.utilization_percentage = (type.used / type.accrued) * 100;
        }
      }
      
      return summary;
    } catch (error) {
      logger.error('Error getting leave utilization report:', error);
      throw error;
    }
  }
  
  /**
   * Get attrition report
   */
  async getAttritionReport(filters = {}) {
    try {
      const { year, department, store_id } = filters;
      
      const query = { reason: { $in: ['RESIGNATION', 'TERMINATION'] } };
      if (year) {
        query.lwd = {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        };
      }
      
      const fnfCases = await FnFCase.find(query)
        .populate('employee_id', 'code name department workLocation');
      
      const totalEmployees = await Employee.countDocuments({ status: 'ACTIVE' });
      const separations = fnfCases.length;
      
      const attritionRate = totalEmployees > 0 
        ? (separations / totalEmployees) * 100 
        : 0;
      
      const summary = {
        total_employees: totalEmployees,
        separations: separations,
        attrition_rate: attritionRate,
        by_reason: {},
        by_department: {},
        by_store: {}
      };
      
      for (const fnf of fnfCases) {
        const employee = fnf.employee_id;
        if (!employee) continue;
        
        // By reason
        const reason = fnf.reason;
        if (!summary.by_reason[reason]) {
          summary.by_reason[reason] = 0;
        }
        summary.by_reason[reason]++;
        
        // By department
        const dept = employee.department || 'UNKNOWN';
        if (!summary.by_department[dept]) {
          summary.by_department[dept] = 0;
        }
        summary.by_department[dept]++;
        
        // By store
        const storeId = employee.workLocation?.storeId?.toString() || 'UNKNOWN';
        if (!summary.by_store[storeId]) {
          summary.by_store[storeId] = {
            store_id: storeId,
            store_name: employee.workLocation?.storeName || 'Unknown',
            count: 0
          };
        }
        summary.by_store[storeId].count++;
      }
      
      return summary;
    } catch (error) {
      logger.error('Error getting attrition report:', error);
      throw error;
    }
  }
  
  /**
   * Get F&F stats
   */
  async getFnFStats(filters = {}) {
    try {
      const { year, status } = filters;
      
      const query = {};
      if (year) {
        query.created_at = {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        };
      }
      if (status) query.status = status;
      
      const fnfCases = await FnFCase.find(query);
      
      const stats = {
        total_cases: fnfCases.length,
        by_status: {},
        total_payable: 0,
        total_receivable: 0,
        total_settled: 0,
        avg_settlement_time_days: 0
      };
      
      let totalSettlementTime = 0;
      let settledCount = 0;
      
      for (const fnf of fnfCases) {
        // By status
        if (!stats.by_status[fnf.status]) {
          stats.by_status[fnf.status] = 0;
        }
        stats.by_status[fnf.status]++;
        
        // Totals
        stats.total_payable += fnf.total_payable || 0;
        stats.total_receivable += fnf.total_receivable || 0;
        
        if (fnf.payout.paid) {
          stats.total_settled += fnf.net_settlement || 0;
          
          if (fnf.payout.paid_at && fnf.initiated_at) {
            const days = Math.ceil((fnf.payout.paid_at - fnf.initiated_at) / (1000 * 60 * 60 * 24));
            totalSettlementTime += days;
            settledCount++;
          }
        }
      }
      
      if (settledCount > 0) {
        stats.avg_settlement_time_days = totalSettlementTime / settledCount;
      }
      
      return stats;
    } catch (error) {
      logger.error('Error getting F&F stats:', error);
      throw error;
    }
  }
  
  /**
   * Get statutory filing on-time percentage
   */
  async getStatutoryFilingOnTimePercent(filters = {}) {
    try {
      const { year, type } = filters;
      
      const query = { filing: { filed: true } };
      if (year) query['period.year'] = parseInt(year);
      if (type) query.type = type;
      
      const exports = await StatExport.find(query);
      
      const stats = {
        total_filings: exports.length,
        on_time: 0,
        late: 0,
        on_time_percentage: 0
      };
      
      for (const exp of exports) {
        if (exp.filing.filed_on_time) {
          stats.on_time++;
        } else {
          stats.late++;
        }
      }
      
      if (stats.total_filings > 0) {
        stats.on_time_percentage = (stats.on_time / stats.total_filings) * 100;
      }
      
      return stats;
    } catch (error) {
      logger.error('Error getting statutory filing on-time percentage:', error);
      throw error;
    }
  }
}

module.exports = new ReportsService();

