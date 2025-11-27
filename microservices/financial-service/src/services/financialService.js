const ProfitLoss = require('../models/ProfitLoss.model');
const Expense = require('../models/Expense.model');
const Ledger = require('../models/Ledger.model');
const TDS = require('../models/TDS.model');
const logger = require('../config/logger');

class FinancialService {
  /**
   * Create or update P&L statement
   */
  async createOrUpdatePandL(pandLData, createdBy) {
    try {
      const { period_start, period_end, store_id, period_type } = pandLData;
      
      // Check if P&L already exists for the period
      let pandL = await ProfitLoss.findOne({
        period_start,
        period_end,
        store_id,
        period_type
      });
      
      if (pandL) {
        // Update existing P&L
        Object.assign(pandL, pandLData);
        pandL.updated_at = new Date();
        await pandL.save();
      } else {
        // Create new P&L
        pandL = new ProfitLoss({
          ...pandLData,
          created_by: createdBy
        });
        await pandL.save();
      }
      
      logger.info(`P&L ${pandL.status} for period ${period_start} to ${period_end}`);
      return pandL;
    } catch (error) {
      logger.error('Error creating/updating P&L:', error);
      throw error;
    }
  }

  /**
   * Get P&L statement for a period
   */
  async getPandL(period_start, period_end, store_id = null) {
    try {
      const filter = { period_start, period_end };
      if (store_id) filter.store_id = store_id;
      
      const pandL = await ProfitLoss.findOne(filter)
        .populate('created_by', 'name email')
        .populate('approved_by', 'name email')
        .populate('store_id', 'name address');
      
      return pandL;
    } catch (error) {
      logger.error('Error getting P&L:', error);
      throw error;
    }
  }

  /**
   * Get P&L summary for multiple periods
   */
  async getPandLSummary(store_id = null, limit = 12) {
    try {
      const filter = {};
      if (store_id) filter.store_id = store_id;
      
      const pandLSummary = await ProfitLoss.find(filter)
        .populate('store_id', 'name')
        .sort({ period_start: -1 })
        .limit(limit);
      
      return pandLSummary;
    } catch (error) {
      logger.error('Error getting P&L summary:', error);
      throw error;
    }
  }

  /**
   * Create expense entry
   */
  async createExpense(expenseData, requestedBy) {
    try {
      const expense = new Expense({
        ...expenseData,
        requested_by: requestedBy
      });
      
      await expense.save();
      
      // Create corresponding ledger entry
      await this.createExpenseLedgerEntry(expense);
      
      logger.info(`Expense created: ${expense.expense_number}`);
      return expense;
    } catch (error) {
      logger.error('Error creating expense:', error);
      throw error;
    }
  }

  /**
   * Create ledger entry for expense
   */
  async createExpenseLedgerEntry(expense) {
    try {
      const ledgerEntry = new Ledger({
        transaction_date: expense.expense_date,
        transaction_type: 'EXPENSE',
        account_head: 'EXPENSES',
        sub_account: expense.category,
        store_id: expense.store_id,
        description: expense.description,
        reference_number: expense.expense_number,
        reference_type: 'EXPENSE',
        debit_amount: expense.total_amount,
        credit_amount: 0,
        vendor_id: expense.vendor_id,
        vendor_name: expense.vendor_name,
        payment_method: expense.payment_method,
        payment_reference: expense.payment_reference,
        status: 'PENDING',
        created_by: expense.requested_by
      });
      
      await ledgerEntry.save();
      
      // Create corresponding payment entry
      const paymentEntry = new Ledger({
        transaction_date: expense.payment_date || expense.expense_date,
        transaction_type: 'PAYMENT',
        account_head: expense.payment_method === 'CASH' ? 'CASH' : 'BANK',
        sub_account: expense.payment_method,
        store_id: expense.store_id,
        description: `Payment for ${expense.description}`,
        reference_number: expense.expense_number,
        reference_type: 'PAYMENT',
        debit_amount: 0,
        credit_amount: expense.total_amount,
        vendor_id: expense.vendor_id,
        vendor_name: expense.vendor_name,
        payment_method: expense.payment_method,
        payment_reference: expense.payment_reference,
        status: 'PENDING',
        created_by: expense.requested_by
      });
      
      await paymentEntry.save();
      
      return { ledgerEntry, paymentEntry };
    } catch (error) {
      logger.error('Error creating expense ledger entry:', error);
      throw error;
    }
  }

  /**
   * Approve expense
   */
  async approveExpense(expenseId, approvedBy, comments = null) {
    try {
      const expense = await Expense.findById(expenseId);
      
      if (!expense) {
        const error = new Error('Expense not found');
        error.statusCode = 404;
        throw error;
      }

      if (expense.status !== 'PENDING') {
        const error = new Error(`Expense is already ${expense.status}`);
        error.statusCode = 400;
        throw error;
      }

      expense.status = 'APPROVED';
      expense.approved_by = approvedBy;
      expense.approved_at = new Date();
      if (comments) {
        expense.notes = (expense.notes || '') + `\nApproval: ${comments}`;
      }

      await expense.save();
      
      logger.info(`Expense approved: ${expense.expense_number}`);
      return expense;
    } catch (error) {
      logger.error('Error approving expense:', error);
      throw error;
    }
  }

  /**
   * Reject expense
   */
  async rejectExpense(expenseId, rejectedBy, reason) {
    try {
      const expense = await Expense.findById(expenseId);
      
      if (!expense) {
        const error = new Error('Expense not found');
        error.statusCode = 404;
        throw error;
      }

      if (expense.status !== 'PENDING') {
        const error = new Error(`Expense is already ${expense.status}`);
        error.statusCode = 400;
        throw error;
      }

      expense.status = 'REJECTED';
      expense.approved_by = rejectedBy;
      expense.approved_at = new Date();
      expense.rejection_reason = reason;

      await expense.save();
      
      logger.info(`Expense rejected: ${expense.expense_number}`);
      return expense;
    } catch (error) {
      logger.error('Error rejecting expense:', error);
      throw error;
    }
  }

  /**
   * Get expenses with filtering
   */
  async getExpenses(filters = {}) {
    try {
      const {
        store_id,
        category,
        status,
        date_from,
        date_to,
        page = 1,
        limit = 10
      } = filters;
      
      const query = {};
      if (store_id) query.store_id = store_id;
      if (category) query.category = category;
      if (status) query.status = status;
      if (date_from || date_to) {
        query.expense_date = {};
        if (date_from) query.expense_date.$gte = new Date(date_from);
        if (date_to) query.expense_date.$lte = new Date(date_to);
      }
      
      const expenses = await Expense.find(query)
        .populate('requested_by', 'name email')
        .populate('approved_by', 'name email')
        .populate('store_id', 'name')
        .populate('vendor_id', 'name')
        .sort({ expense_date: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await Expense.countDocuments(query);
      
      return {
        expenses,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_records: total
        }
      };
    } catch (error) {
      logger.error('Error getting expenses:', error);
      throw error;
    }
  }

  /**
   * Create ledger entry
   */
  async createLedgerEntry(ledgerData, createdBy) {
    try {
      const ledger = new Ledger({
        ...ledgerData,
        created_by: createdBy
      });
      
      await ledger.save();
      
      logger.info(`Ledger entry created: ${ledger.transaction_id}`);
      return ledger;
    } catch (error) {
      logger.error('Error creating ledger entry:', error);
      throw error;
    }
  }

  /**
   * Get ledger entries with filtering
   */
  async getLedgerEntries(filters = {}) {
    try {
      const {
        store_id,
        account_head,
        transaction_type,
        date_from,
        date_to,
        page = 1,
        limit = 10
      } = filters;
      
      const query = {};
      if (store_id) query.store_id = store_id;
      if (account_head) query.account_head = account_head;
      if (transaction_type) query.transaction_type = transaction_type;
      if (date_from || date_to) {
        query.transaction_date = {};
        if (date_from) query.transaction_date.$gte = new Date(date_from);
        if (date_to) query.transaction_date.$lte = new Date(date_to);
      }
      
      const ledgerEntries = await Ledger.find(query)
        .populate('created_by', 'name email')
        .populate('store_id', 'name')
        .populate('customer_id', 'name')
        .populate('vendor_id', 'name')
        .sort({ transaction_date: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await Ledger.countDocuments(query);
      
      return {
        ledgerEntries,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_records: total
        }
      };
    } catch (error) {
      logger.error('Error getting ledger entries:', error);
      throw error;
    }
  }

  /**
   * Get trial balance
   */
  async getTrialBalance(store_id = null, as_of_date = null) {
    try {
      const trialBalance = await Ledger.getTrialBalance(store_id, as_of_date);
      return trialBalance;
    } catch (error) {
      logger.error('Error getting trial balance:', error);
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(account_head, store_id = null, as_of_date = null) {
    try {
      const balance = await Ledger.getAccountBalance(account_head, store_id, as_of_date);
      return balance;
    } catch (error) {
      logger.error('Error getting account balance:', error);
      throw error;
    }
  }

  /**
   * Create TDS entry
   */
  async createTDSEntry(tdsData, createdBy) {
    try {
      const tds = new TDS({
        ...tdsData,
        created_by: createdBy
      });
      
      await tds.save();
      
      // Create corresponding ledger entries
      await this.createTDSLedgerEntries(tds);
      
      logger.info(`TDS entry created: ${tds.tds_number}`);
      return tds;
    } catch (error) {
      logger.error('Error creating TDS entry:', error);
      throw error;
    }
  }

  /**
   * Create TDS ledger entries
   */
  async createTDSLedgerEntries(tds) {
    try {
      // TDS payable entry
      const tdsPayableEntry = new Ledger({
        transaction_date: tds.tds_date,
        transaction_type: 'PAYMENT',
        account_head: 'LIABILITIES',
        sub_account: 'TDS_PAYABLE',
        store_id: tds.store_id,
        description: `TDS deducted from ${tds.vendor_name}`,
        reference_number: tds.tds_number,
        reference_type: 'TDS',
        debit_amount: 0,
        credit_amount: tds.tds_amount,
        vendor_id: tds.vendor_id,
        vendor_name: tds.vendor_name,
        tax_type: 'TDS',
        tax_amount: tds.tds_amount,
        status: 'PENDING',
        created_by: tds.created_by
      });
      
      await tdsPayableEntry.save();
      
      // TDS expense entry
      const tdsExpenseEntry = new Ledger({
        transaction_date: tds.tds_date,
        transaction_type: 'EXPENSE',
        account_head: 'EXPENSES',
        sub_account: 'TDS_EXPENSE',
        store_id: tds.store_id,
        description: `TDS expense for ${tds.vendor_name}`,
        reference_number: tds.tds_number,
        reference_type: 'TDS',
        debit_amount: tds.tds_amount,
        credit_amount: 0,
        vendor_id: tds.vendor_id,
        vendor_name: tds.vendor_name,
        tax_type: 'TDS',
        tax_amount: tds.tds_amount,
        status: 'PENDING',
        created_by: tds.created_by
      });
      
      await tdsExpenseEntry.save();
      
      return { tdsPayableEntry, tdsExpenseEntry };
    } catch (error) {
      logger.error('Error creating TDS ledger entries:', error);
      throw error;
    }
  }

  /**
   * Get TDS entries with filtering
   */
  async getTDSEntries(filters = {}) {
    try {
      const {
        store_id,
        vendor_id,
        tds_section,
        status,
        date_from,
        date_to,
        page = 1,
        limit = 10
      } = filters;
      
      const query = {};
      if (store_id) query.store_id = store_id;
      if (vendor_id) query.vendor_id = vendor_id;
      if (tds_section) query.tds_section = tds_section;
      if (status) query.status = status;
      if (date_from || date_to) {
        query.tds_date = {};
        if (date_from) query.tds_date.$gte = new Date(date_from);
        if (date_to) query.tds_date.$lte = new Date(date_to);
      }
      
      const tdsEntries = await TDS.find(query)
        .populate('created_by', 'name email')
        .populate('approved_by', 'name email')
        .populate('store_id', 'name')
        .populate('vendor_id', 'name')
        .sort({ tds_date: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await TDS.countDocuments(query);
      
      return {
        tdsEntries,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_records: total
        }
      };
    } catch (error) {
      logger.error('Error getting TDS entries:', error);
      throw error;
    }
  }

  /**
   * Get TDS summary
   */
  async getTDSSummary(store_id = null, period = null) {
    try {
      const summary = await TDS.getTDSSummary(store_id, period);
      return summary;
    } catch (error) {
      logger.error('Error getting TDS summary:', error);
      throw error;
    }
  }

  /**
   * Get financial dashboard data
   */
  async getFinancialDashboard(store_id = null, period = null) {
    try {
      const dashboard = {
        revenue: await this.getAccountBalance('SALES', store_id, period?.end),
        expenses: await this.getAccountBalance('EXPENSES', store_id, period?.end),
        cash: await this.getAccountBalance('CASH', store_id, period?.end),
        bank: await this.getAccountBalance('BANK', store_id, period?.end),
        receivables: await this.getAccountBalance('ACCOUNTS_RECEIVABLE', store_id, period?.end),
        payables: await this.getAccountBalance('ACCOUNTS_PAYABLE', store_id, period?.end),
        tds_summary: await this.getTDSSummary(store_id, period)
      };
      
      return dashboard;
    } catch (error) {
      logger.error('Error getting financial dashboard:', error);
      throw error;
    }
  }
}

module.exports = new FinancialService();
