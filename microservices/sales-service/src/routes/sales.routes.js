const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');

// All sales routes require authentication
router.use(authenticate);

// Customer Management Routes
router.post(
  '/customers',
  requireRole(['admin', 'manager', 'sales']),
  requirePermission('manage_customers'),
  salesController.createOrUpdateCustomer
);

router.get(
  '/customers/:identifier',
  requireRole(['admin', 'manager', 'sales']),
  requirePermission('view_customers'),
  salesController.getCustomer
);

router.get(
  '/customers/search',
  requireRole(['admin', 'manager', 'sales']),
  requirePermission('view_customers'),
  salesController.searchCustomers
);

// Sales Order Management Routes
router.post(
  '/orders',
  requireRole(['admin', 'manager', 'sales', 'accountant']),
  requirePermission('create_sales_orders'),
  salesController.createSalesOrder
);

router.get(
  '/orders',
  requireRole(['admin', 'manager', 'sales', 'accountant']),
  requirePermission('view_sales_orders'),
  salesController.getSalesOrders
);

router.get(
  '/orders/:orderId',
  requireRole(['admin', 'manager', 'sales', 'accountant']),
  requirePermission('view_sales_orders'),
  salesController.getSalesOrderById
);

router.put(
  '/orders/:orderId/status',
  requireRole(['admin', 'manager', 'sales', 'accountant']),
  requirePermission('update_sales_orders'),
  salesController.updateSalesOrderStatus
);

// Prescription Management Routes
router.post(
  '/prescriptions',
  requireRole(['admin', 'manager', 'sales']),
  requirePermission('manage_prescriptions'),
  salesController.createPrescription
);

router.get(
  '/prescriptions',
  requireRole(['admin', 'manager', 'sales']),
  requirePermission('view_prescriptions'),
  salesController.getPrescriptions
);

// Sales Dashboard
router.get(
  '/dashboard',
  requireRole(['admin', 'manager', 'sales', 'accountant']),
  requirePermission('view_sales_dashboard'),
  salesController.getSalesDashboard
);

// Product Availability
router.get(
  '/products/availability',
  requireRole(['admin', 'manager', 'sales', 'accountant']),
  requirePermission('view_product_availability'),
  salesController.getProductAvailability
);

// Manual Sales Entry (Temporary Entry)
router.post(
  '/manual-entry',
  requireRole(['admin', 'manager', 'sales', 'accountant']),
  requirePermission('create_sales_orders'),
  salesController.createManualSalesEntry
);

module.exports = router;
