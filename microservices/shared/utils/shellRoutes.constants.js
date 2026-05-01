/**
 * Canonical Shell route permission codes (host route-first gating).
 * Keep paths lowercase and without trailing slash, per product contract.
 */
const SHELL_ROUTE_CODES = [
  'route:/dashboard',
  'route:/tenant-admin',
  'route:/store-dashboard',
  'route:/store-management',
  'route:/store-details',
  'route:/documents',
  'route:/notifications',

  // HRMS module
  'route:/',
  'route:/employees',
  'route:/stores',
  'route:/attendance',
  'route:/geofencing',
  'route:/payroll',
  'route:/payroll/deductions/manage',
  'route:/payslips',
  'route:/performance',
  'route:/recruitment',
  'route:/training',
  'route:/benefits',
  'route:/compliance',

  // Sales module
  'route:/orders',
  'route:/customers',
  'route:/products',
  'route:/pos',
  'route:/reports',

  // Inventory / ERP (host route)
  'route:/inventory',

  // Optical Supply — Lens & CL Masters (CORE+)
  'route:/inventory/lens-master',
  'route:/inventory/cl-master',

  // Optical Supply — Vendor & Inward (GROWTH+)
  'route:/inventory/rx-orders',
  'route:/inventory/inward',
  'route:/inventory/vendor-returns',
  'route:/inventory/vendor-scorecard',

  // Optical Supply — Barcode / QR (GROWTH+)
  'route:/inventory/barcode',
  'route:/inventory/barcode/generate',
  'route:/inventory/barcode/scan',

  // Control & Loss — Damage, Audit, Dead Stock (GROWTH+ / ENTERPRISE)
  'route:/inventory/damage',
  'route:/inventory/breakage',
  'route:/inventory/audits',
  'route:/inventory/dead-stock',
  'route:/inventory/stock-transfer',

  // Customer & Sale — Optical Orders and Lab (CORE+)
  'route:/orders/optical',
  'route:/lab',
  'route:/lab/kanban',

  // After-Sales — Complaints (GROWTH+)
  'route:/complaints',

  // Financial module (host route)
  'route:/financial',

  // Admin routes
  'route:/admin',
  'route:/admin/permissions',
  'route:/admin/super-admin',
  'route:/admin/tenants/new',
  'route:/admin/tenants/analytics',
  'route:/admin/users',
  'route:/admin/users/roles',
  'route:/admin/users/permissions',
  'route:/admin/system/general',
  'route:/admin/system/security',
  'route:/admin/system/integrations',
  'route:/admin/system/backups',
  'route:/admin/billing/invoices',
  'route:/admin/billing/payments',
  'route:/admin/billing/plans',
  'route:/admin/calendar',
  'route:/admin/help/documentation',
  'route:/admin/help/tickets',
  'route:/admin/help/faq',

  // Monitoring / analytics
  'route:/analytics/dashboard',
  'route:/analytics/reports',
  'route:/analytics/insights',
  'route:/monitoring/dashboard',
  'route:/monitoring/alerts',
  'route:/monitoring/logs',

  // Finance Optical — Deposits, Dues, GST (ENTERPRISE)
  'route:/financial/deposits',
  'route:/financial/dues',
  'route:/financial/gst',
  'route:/financial/gst/gstin',
  'route:/financial/gst/categories',
  'route:/financial/reports',
  'route:/financial/reports/pl',

  // Admin — JTS triggers checklist + Support Access (ENTERPRISE)
  'route:/admin/jts-triggers',
  'route:/admin/support-access'
];

module.exports = { SHELL_ROUTE_CODES };
