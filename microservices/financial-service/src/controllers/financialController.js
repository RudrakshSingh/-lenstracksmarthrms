const financialService = require('../services/financialService');
const logger = require('../config/logger');

/**
 * @desc Create or update P&L statement
 * @route POST /api/financial/pandl
 * @access Private (Admin, Manager)
 */
const createOrUpdatePandL = async (req, res, next) => {
  try {
    const pandLData = req.body;
    const createdBy = req.user.id;
    
    const pandL = await financialService.createOrUpdatePandL(pandLData, createdBy);
    
    res.status(201).json({
      success: true,
      message: 'P&L statement created/updated successfully',
      data: pandL
    });
  } catch (error) {
    logger.error('Error in createOrUpdatePandL controller:', error);
    next(error);
  }
};

/**
 * @desc Get P&L statement
 * @route GET /api/financial/pandl
 * @access Private (Admin, Manager)
 */
const getPandL = async (req, res, next) => {
  try {
    const { period_start, period_end, store_id } = req.query;
    
    const pandL = await financialService.getPandL(period_start, period_end, store_id);
    
    if (!pandL) {
      return res.status(404).json({
        success: false,
        message: 'P&L statement not found for the specified period'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'P&L statement retrieved successfully',
      data: pandL
    });
  } catch (error) {
    logger.error('Error in getPandL controller:', error);
    next(error);
  }
};

/**
 * @desc Get P&L summary
 * @route GET /api/financial/pandl/summary
 * @access Private (Admin, Manager)
 */
const getPandLSummary = async (req, res, next) => {
  try {
    const { store_id, limit = 12 } = req.query;
    
    const summary = await financialService.getPandLSummary(store_id, parseInt(limit));
    
    res.status(200).json({
      success: true,
      message: 'P&L summary retrieved successfully',
      data: summary
    });
  } catch (error) {
    logger.error('Error in getPandLSummary controller:', error);
    next(error);
  }
};

/**
 * @desc Create expense entry
 * @route POST /api/financial/expenses
 * @access Private (Admin, Manager, Store Manager)
 */
const createExpense = async (req, res, next) => {
  try {
    const expenseData = req.body;
    const requestedBy = req.user.id;
    
    const expense = await financialService.createExpense(expenseData, requestedBy);
    
    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: expense
    });
  } catch (error) {
    logger.error('Error in createExpense controller:', error);
    next(error);
  }
};

/**
 * @desc Get expenses
 * @route GET /api/financial/expenses
 * @access Private (Admin, Manager, Store Manager)
 */
const getExpenses = async (req, res, next) => {
  try {
    const filters = req.query;
    
    const result = await financialService.getExpenses(filters);
    
    res.status(200).json({
      success: true,
      message: 'Expenses retrieved successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in getExpenses controller:', error);
    next(error);
  }
};

/**
 * @desc Approve expense
 * @route POST /api/financial/expenses/:id/approve
 * @access Private (Admin, Manager)
 */
const approveExpense = async (req, res, next) => {
  try {
    const expense = await financialService.approveExpense(
      req.params.id,
      req.user.id,
      req.body.comments
    );
    
    res.status(200).json({
      success: true,
      message: 'Expense approved successfully',
      data: expense
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    logger.error('Error in approveExpense controller:', error);
    next(error);
  }
};

/**
 * @desc Reject expense
 * @route POST /api/financial/expenses/:id/reject
 * @access Private (Admin, Manager)
 */
const rejectExpense = async (req, res, next) => {
  try {
    const expense = await financialService.rejectExpense(
      req.params.id,
      req.user.id,
      req.body.reason
    );
    
    res.status(200).json({
      success: true,
      message: 'Expense rejected successfully',
      data: expense
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    logger.error('Error in rejectExpense controller:', error);
    next(error);
  }
};

/**
 * @desc Create ledger entry
 * @route POST /api/financial/ledger
 * @access Private (Admin, Manager)
 */
const createLedgerEntry = async (req, res, next) => {
  try {
    const ledgerData = req.body;
    const createdBy = req.user.id;
    
    const ledger = await financialService.createLedgerEntry(ledgerData, createdBy);
    
    res.status(201).json({
      success: true,
      message: 'Ledger entry created successfully',
      data: ledger
    });
  } catch (error) {
    logger.error('Error in createLedgerEntry controller:', error);
    next(error);
  }
};

/**
 * @desc Get ledger entries
 * @route GET /api/financial/ledger
 * @access Private (Admin, Manager)
 */
const getLedgerEntries = async (req, res, next) => {
  try {
    const filters = req.query;
    
    const result = await financialService.getLedgerEntries(filters);
    
    res.status(200).json({
      success: true,
      message: 'Ledger entries retrieved successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in getLedgerEntries controller:', error);
    next(error);
  }
};

/**
 * @desc Get trial balance
 * @route GET /api/financial/trial-balance
 * @access Private (Admin, Manager)
 */
const getTrialBalance = async (req, res, next) => {
  try {
    const { store_id, as_of_date } = req.query;
    
    const trialBalance = await financialService.getTrialBalance(store_id, as_of_date);
    
    res.status(200).json({
      success: true,
      message: 'Trial balance retrieved successfully',
      data: trialBalance
    });
  } catch (error) {
    logger.error('Error in getTrialBalance controller:', error);
    next(error);
  }
};

/**
 * @desc Get account balance
 * @route GET /api/financial/account-balance
 * @access Private (Admin, Manager)
 */
const getAccountBalance = async (req, res, next) => {
  try {
    const { account_head, store_id, as_of_date } = req.query;
    
    if (!account_head) {
      return res.status(400).json({
        success: false,
        message: 'Account head is required'
      });
    }
    
    const balance = await financialService.getAccountBalance(account_head, store_id, as_of_date);
    
    res.status(200).json({
      success: true,
      message: 'Account balance retrieved successfully',
      data: balance
    });
  } catch (error) {
    logger.error('Error in getAccountBalance controller:', error);
    next(error);
  }
};

/**
 * @desc Create TDS entry
 * @route POST /api/financial/tds
 * @access Private (Admin, Manager)
 */
const createTDSEntry = async (req, res, next) => {
  try {
    const tdsData = req.body;
    const createdBy = req.user.id;
    
    const tds = await financialService.createTDSEntry(tdsData, createdBy);
    
    res.status(201).json({
      success: true,
      message: 'TDS entry created successfully',
      data: tds
    });
  } catch (error) {
    logger.error('Error in createTDSEntry controller:', error);
    next(error);
  }
};

/**
 * @desc Get TDS entries
 * @route GET /api/financial/tds
 * @access Private (Admin, Manager)
 */
const getTDSEntries = async (req, res, next) => {
  try {
    const filters = req.query;
    
    const result = await financialService.getTDSEntries(filters);
    
    res.status(200).json({
      success: true,
      message: 'TDS entries retrieved successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in getTDSEntries controller:', error);
    next(error);
  }
};

/**
 * @desc Get TDS summary
 * @route GET /api/financial/tds/summary
 * @access Private (Admin, Manager)
 */
const getTDSSummary = async (req, res, next) => {
  try {
    const { store_id, period_start, period_end } = req.query;
    
    const period = period_start && period_end ? {
      start: new Date(period_start),
      end: new Date(period_end)
    } : null;
    
    const summary = await financialService.getTDSSummary(store_id, period);
    
    res.status(200).json({
      success: true,
      message: 'TDS summary retrieved successfully',
      data: summary
    });
  } catch (error) {
    logger.error('Error in getTDSSummary controller:', error);
    next(error);
  }
};

/**
 * @desc Get financial dashboard
 * @route GET /api/financial/dashboard
 * @access Private (Admin, Manager)
 */
const getFinancialDashboard = async (req, res, next) => {
  try {
    const { store_id, period_start, period_end } = req.query;
    
    const period = period_start && period_end ? {
      start: new Date(period_start),
      end: new Date(period_end)
    } : null;
    
    const dashboard = await financialService.getFinancialDashboard(store_id, period);
    
    res.status(200).json({
      success: true,
      message: 'Financial dashboard retrieved successfully',
      data: dashboard
    });
  } catch (error) {
    logger.error('Error in getFinancialDashboard controller:', error);
    next(error);
  }
};

module.exports = {
  approveExpense,
  rejectExpense,
  createOrUpdatePandL,
  getPandL,
  getPandLSummary,
  createExpense,
  getExpenses,
  createLedgerEntry,
  getLedgerEntries,
  getTrialBalance,
  getAccountBalance,
  createTDSEntry,
  getTDSEntries,
  getTDSSummary,
  getFinancialDashboard
};
