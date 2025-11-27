const express = require('express');
const router = express.Router();
const financialController = require('../controllers/financialController');
const invoiceController = require('../controllers/invoiceController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.middleware');
const Joi = require('joi');

// All financial routes require authentication
router.use(authenticate);

// P&L Management Routes
router.post(
  '/pandl',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('manage_pandl'),
  financialController.createOrUpdatePandL
);

router.get(
  '/pandl',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('view_pandl'),
  financialController.getPandL
);

router.get(
  '/pandl/summary',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('view_pandl'),
  financialController.getPandLSummary
);

// Expense Management Routes
router.post(
  '/expenses',
  requireRole(['admin', 'manager', 'store_manager', 'accountant']),
  requirePermission('manage_expenses'),
  financialController.createExpense
);

router.get(
  '/expenses',
  requireRole(['admin', 'manager', 'store_manager', 'accountant']),
  requirePermission('view_expenses'),
  financialController.getExpenses
);

router.post(
  '/expenses/:id/approve',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('approve_expenses'),
  financialController.approveExpense
);

router.post(
  '/expenses/:id/reject',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('approve_expenses'),
  financialController.rejectExpense
);

// Ledger Management Routes
router.post(
  '/ledger',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('manage_ledger'),
  financialController.createLedgerEntry
);

router.get(
  '/ledger',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('view_ledger'),
  financialController.getLedgerEntries
);

router.get(
  '/trial-balance',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('view_trial_balance'),
  financialController.getTrialBalance
);

router.get(
  '/account-balance',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('view_account_balance'),
  financialController.getAccountBalance
);

// TDS Management Routes
router.post(
  '/tds',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('manage_tds'),
  financialController.createTDSEntry
);

router.get(
  '/tds',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('view_tds'),
  financialController.getTDSEntries
);

router.get(
  '/tds/summary',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('view_tds_summary'),
  financialController.getTDSSummary
);

// Financial Dashboard
router.get(
  '/dashboard',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('view_financial_dashboard'),
  financialController.getFinancialDashboard
);

// Invoice Management Routes
const createInvoiceSchema = {
  body: Joi.object({
    invoice_date: Joi.date().required(),
    due_date: Joi.date().required(),
    customer_id: Joi.string().required(),
    customer_name: Joi.string().required(),
    customer_email: Joi.string().email().optional(),
    customer_address: Joi.string().optional(),
    store_id: Joi.string().required(),
    items: Joi.array().items(Joi.object({
      description: Joi.string().required(),
      quantity: Joi.number().min(1).required(),
      unit_price: Joi.number().min(0).required(),
      tax_rate: Joi.number().min(0).max(100).optional()
    })).min(1).required(),
    discount: Joi.number().min(0).optional(),
    notes: Joi.string().optional().max(1000),
    terms: Joi.string().optional().max(500)
  })
};

const sendInvoiceSchema = {
  body: Joi.object({
    send_to: Joi.string().email().optional()
  })
};

router.get(
  '/invoices',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('view_invoices'),
  invoiceController.getInvoices
);

router.post(
  '/invoices',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('manage_invoices'),
  validateRequest(createInvoiceSchema),
  invoiceController.createInvoice
);

router.get(
  '/invoices/:id',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('view_invoices'),
  invoiceController.getInvoiceById
);

router.post(
  '/invoices/:id/send',
  requireRole(['admin', 'manager', 'accountant']),
  requirePermission('manage_invoices'),
  validateRequest(sendInvoiceSchema),
  invoiceController.sendInvoice
);

module.exports = router;
