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
  'route:/monitoring/logs'
];

module.exports = { SHELL_ROUTE_CODES };
