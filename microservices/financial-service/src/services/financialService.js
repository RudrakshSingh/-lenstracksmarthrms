const ProfitLoss = require('../models/ProfitLoss.model');
const Expense = require('../models/Expense.model');
const Ledger = require('../models/Ledger.model');
const TDS = require('../models/TDS.model');
const FinanceRecord = require('../models/FinanceRecord.model');
const FinanceLog = require('../models/FinanceLog.model');
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
        requested_by: requestedBy,
        source_module: expenseData.source_module || 'MANUAL',
        logs: [
          {
            event: 'expense_created',
            actor_id: requestedBy,
            details: {
              source_module: expenseData.source_module || 'MANUAL'
            }
          }
        ]
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
      const baseTxnId = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const ledgerEntry = new Ledger({
        transaction_id: `${baseTxnId}-DR`,
        transaction_date: expense.expense_date,
        transaction_type: 'EXPENSE',
        account_head: 'EXPENSES',
        sub_account: expense.category,
        store_id: expense.store_id,
        description: expense.description,
        reference_number: expense.expense_number,
        reference_type: 'ADJUSTMENT',
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
        transaction_id: `${baseTxnId}-CR`,
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
      expense.logs = expense.logs || [];
      expense.logs.push({
        event: 'expense_approved',
        actor_id: approvedBy,
        details: {
          comments: comments || null
        }
      });
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
      expense.logs = expense.logs || [];
      expense.logs.push({
        event: 'expense_rejected',
        actor_id: rejectedBy,
        details: { reason }
      });

      await expense.save();
      
      logger.info(`Expense rejected: ${expense.expense_number}`);
      return expense;
    } catch (error) {
      logger.error('Error rejecting expense:', error);
      throw error;
    }
  }

  /**
   * Reflect payroll month as finance expense (idempotent).
   */
  async createSalaryExpenseFromPayroll(payload, requestedBy) {
    const {
      month,
      year,
      store_id,
      payment_method = 'BANK_TRANSFER',
      employee_count = 0,
      total_gross_salary = 0,
      total_net_salary = 0
    } = payload;

    if (!month || !year || !store_id) {
      const error = new Error('month, year and store_id are required');
      error.statusCode = 400;
      throw error;
    }

    const sourceRefId = `PAYROLL-${year}-${String(month).padStart(2, '0')}`;
    const existing = await Expense.findOne({
      source_module: 'PAYROLL',
      source_ref_id: sourceRefId
    });

    if (existing) {
      return existing;
    }

    const expense = new Expense({
      expense_number: `EXP-PAY-${year}${String(month).padStart(2, '0')}-${Date.now().toString().slice(-6)}`,
      expense_date: new Date(Number(year), Number(month) - 1, 1),
      store_id,
      source_module: 'PAYROLL',
      source_ref_id: sourceRefId,
      category: 'SALARIES',
      sub_category: 'PAYROLL_MONTHLY',
      description: `Payroll salary reflection for ${sourceRefId}`,
      amount: Number(total_net_salary || 0),
      tax_amount: 0,
      total_amount: Number(total_net_salary || 0),
      payment_method,
      status: 'APPROVED',
      requested_by: requestedBy,
      approved_by: requestedBy,
      approved_at: new Date(),
      logs: [
        {
          event: 'salary_expense_reflected',
          actor_id: requestedBy,
          details: {
            source_ref_id: sourceRefId,
            employee_count: Number(employee_count || 0),
            total_gross_salary: Number(total_gross_salary || 0),
            total_net_salary: Number(total_net_salary || 0)
          }
        }
      ]
    });

    await expense.save();
    await this.createExpenseLedgerEntry(expense);

    const financeRecord = await FinanceRecord.create({
      external_ref_id: sourceRefId,
      source_module: 'PAYROLL',
      record_type: 'SALARY_EXPENSE',
      record_status: 'POSTED',
      amount: Number(total_net_salary || 0),
      expense_id: expense._id,
      company_id: payload.company_id || null,
      brand_id: payload.brand_id || null,
      branch_id: payload.branch_id || null,
      department_id: payload.department_id || null,
      employee_id: payload.employee_id || null,
      tenant_id: payload.tenant_id || null,
      metadata: {
        employee_count: Number(employee_count || 0),
        total_gross_salary: Number(total_gross_salary || 0)
      },
      created_by: requestedBy
    });

    await FinanceLog.create({
      external_ref_id: sourceRefId,
      finance_record_id: financeRecord._id,
      event_type: 'salary_expense_reflected',
      status: 'SUCCESS',
      actor_id: requestedBy,
      details: {
        expense_id: expense._id,
        amount: expense.total_amount
      }
    });

    return expense;
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
        source_module,
        source_ref_id,
        date_from,
        date_to,
        page = 1,
        limit = 10
      } = filters;
      
      const query = {};
      if (store_id) query.store_id = store_id;
      if (category) query.category = category;
      if (status) query.status = status;
      if (source_module) query.source_module = source_module;
      if (source_ref_id) query.source_ref_id = source_ref_id;
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

  async getExpenseBySourceRef(sourceRefId) {
    return Expense.findOne({ source_ref_id: sourceRefId });
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
   * Create payroll posting in ledger with idempotency.
   */
  async createPayrollPosting(postingData, createdBy) {
    const {
      payrollRunId,
      period,
      month,
      year,
      postDate,
      jvNumber,
      amountBreakdown = {},
      metadata = {}
    } = postingData;

    if (!payrollRunId) {
      const error = new Error('payrollRunId is required');
      error.statusCode = 400;
      throw error;
    }

    const idempotencyKey = metadata.idempotencyKey || `payroll-run-${payrollRunId}`;
    const existingFinanceRecord = await FinanceRecord.findOne({ external_ref_id: idempotencyKey });
    const existing = await Ledger.findOne({ transaction_id: `${idempotencyKey}-salary-expense` });
    if (existing || existingFinanceRecord) {
      return {
        already_posted: true,
        idempotency_key: idempotencyKey,
        reference_number: jvNumber || payrollRunId,
        finance_record_id: existingFinanceRecord?._id || null
      };
    }

    const grossSalary = Number(amountBreakdown.grossSalary || 0);
    const netSalary = Number(amountBreakdown.netSalary || 0);
    const epfEmployee = Number(amountBreakdown.epfEmployee || 0);
    const esicEmployee = Number(amountBreakdown.esicEmployee || 0);
    const professionalTax = Number(amountBreakdown.professionalTax || amountBreakdown.pt || 0);
    const tds = Number(amountBreakdown.tds || 0);
    const epfEmployer = Number(amountBreakdown.epfEmployer || 0);
    const esicEmployer = Number(amountBreakdown.esicEmployer || 0);
    const employerCost = Number(amountBreakdown.employerCost || (epfEmployer + esicEmployer));
    const employeeDeductions = epfEmployee + esicEmployee + professionalTax + tds;
    const totalPayrollExpense = Math.max(0, grossSalary + employerCost);

    const descriptionBase = `Payroll posting ${period || `${year}-${month}`}`;
    const referenceNumber = jvNumber || payrollRunId;
    const transactionDate = postDate ? new Date(postDate) : new Date();

    const debitEntry = new Ledger({
      transaction_id: `${idempotencyKey}-salary-expense`,
      transaction_date: transactionDate,
      transaction_type: 'JOURNAL',
      account_head: 'EXPENSES',
      sub_account: 'SALARY_EXPENSE',
      description: `${descriptionBase} - salary expense`,
      reference_number: referenceNumber,
      reference_type: 'JOURNAL',
      debit_amount: totalPayrollExpense,
      credit_amount: 0,
      status: 'CONFIRMED',
      created_by: createdBy
    });

    const employerExpenseEntry = new Ledger({
      transaction_id: `${idempotencyKey}-employer-contrib-expense`,
      transaction_date: transactionDate,
      transaction_type: 'JOURNAL',
      account_head: 'EXPENSES',
      sub_account: 'EMPLOYER_CONTRIBUTION_EXPENSE',
      description: `${descriptionBase} - employer contribution expense`,
      reference_number: referenceNumber,
      reference_type: 'JOURNAL',
      debit_amount: Math.max(0, employerCost),
      credit_amount: 0,
      status: 'CONFIRMED',
      created_by: createdBy
    });

    const deductionPayableEntry = new Ledger({
      transaction_id: `${idempotencyKey}-deduction-payable`,
      transaction_date: transactionDate,
      transaction_type: 'JOURNAL',
      account_head: 'LIABILITIES',
      sub_account: 'PAYROLL_DEDUCTION_PAYABLE',
      description: `${descriptionBase} - employee deductions payable`,
      reference_number: referenceNumber,
      reference_type: 'JOURNAL',
      debit_amount: 0,
      credit_amount: Math.max(0, employeeDeductions),
      status: 'CONFIRMED',
      created_by: createdBy
    });

    const employerPayableEntry = new Ledger({
      transaction_id: `${idempotencyKey}-employer-payable`,
      transaction_date: transactionDate,
      transaction_type: 'JOURNAL',
      account_head: 'LIABILITIES',
      sub_account: 'EMPLOYER_CONTRIBUTION_PAYABLE',
      description: `${descriptionBase} - employer contributions payable`,
      reference_number: referenceNumber,
      reference_type: 'JOURNAL',
      debit_amount: 0,
      credit_amount: Math.max(0, employerCost),
      status: 'CONFIRMED',
      created_by: createdBy
    });

    const creditEntry = new Ledger({
      transaction_id: `${idempotencyKey}-salary-payable`,
      transaction_date: transactionDate,
      transaction_type: 'JOURNAL',
      account_head: 'LIABILITIES',
      sub_account: 'SALARY_PAYABLE',
      description: `${descriptionBase} - salary payable`,
      reference_number: referenceNumber,
      reference_type: 'JOURNAL',
      debit_amount: 0,
      credit_amount: Math.max(0, netSalary || (grossSalary - employeeDeductions)),
      status: 'CONFIRMED',
      created_by: createdBy
    });

    await debitEntry.save();
    await employerExpenseEntry.save();
    await deductionPayableEntry.save();
    await employerPayableEntry.save();
    await creditEntry.save();

    const financeRecord = await FinanceRecord.create({
      external_ref_id: idempotencyKey,
      source_module: 'PAYROLL',
      record_type: 'LEDGER_POSTING',
      record_status: 'POSTED',
      amount: totalPayrollExpense,
      ledger_refs: [
        debitEntry.transaction_id,
        employerExpenseEntry.transaction_id,
        deductionPayableEntry.transaction_id,
        employerPayableEntry.transaction_id,
        creditEntry.transaction_id
      ],
      metadata: {
        payrollRunId,
        period,
        referenceNumber
      },
      created_by: createdBy
    });
    await FinanceLog.create({
      external_ref_id: idempotencyKey,
      finance_record_id: financeRecord._id,
      event_type: 'record_posted',
      status: 'SUCCESS',
      actor_id: createdBy,
      details: {
        ledger_refs: [
          debitEntry.transaction_id,
          employerExpenseEntry.transaction_id,
          deductionPayableEntry.transaction_id,
          employerPayableEntry.transaction_id,
          creditEntry.transaction_id
        ]
      }
    });

    return {
      already_posted: false,
      idempotency_key: idempotencyKey,
      reference_number: referenceNumber,
      ledger_entries: [
        debitEntry._id,
        employerExpenseEntry._id,
        deductionPayableEntry._id,
        employerPayableEntry._id,
        creditEntry._id
      ],
      finance_record_id: financeRecord._id
    };
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
