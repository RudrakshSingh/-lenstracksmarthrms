const { ALL_PERMISSION_CODES } = require('./permissionCatalog');

/**
 * Fallback when Role document has no permissions array (aligned with auth-service Role defaults).
 */
const NARROW_DEFAULTS = {
  hr: [
    'read_users', 'write_users', 'create_users', 'update_users', 'activate_users', 'deactivate_users',
    'read_attendance', 'write_attendance', 'approve_attendance', 'create_attendance',
    'read_reports', 'write_reports', 'export_reports', 'create_reports',
    'read_assets', 'write_assets', 'assign_assets', 'create_assets', 'update_assets',
    'read_documents', 'write_documents', 'upload_documents', 'download_documents',
    'read_transfers', 'write_transfers', 'approve_transfers', 'create_transfers',
    'read_stores', 'write_stores', 'create_stores', 'update_stores',
    'read_roles', 'write_roles', 'create_roles', 'update_roles',
    'view_dashboard', 'view_attendance_summary', 'view_employee_count', 'view_asset_summary',
    'view_transfer_requests', 'view_document_status', 'view_store_performance',
    'view_attendance_chart', 'view_employee_chart', 'view_asset_chart',
    'view_transfer_chart', 'view_document_chart', 'view_store_chart',
    'view_recent_activities', 'view_pending_approvals', 'view_attendance_trends', 'view_employee_trends'
  ],
  manager: [
    'read_users', 'write_users', 'create_users', 'update_users',
    'read_attendance', 'write_attendance', 'approve_attendance', 'create_attendance',
    'read_reports', 'write_reports', 'export_reports',
    'read_assets', 'write_assets', 'assign_assets', 'create_assets', 'update_assets',
    'read_documents', 'write_documents', 'upload_documents', 'download_documents',
    'read_transfers', 'write_transfers', 'approve_transfers', 'create_transfers',
    'read_stores', 'write_stores',
    'view_dashboard', 'view_attendance_summary', 'view_employee_count', 'view_asset_summary',
    'view_transfer_requests', 'view_attendance_chart', 'view_employee_chart', 'view_asset_chart',
    'view_transfer_chart', 'view_recent_activities', 'view_pending_approvals'
  ],
  employee: [
    'read_users', 'read_attendance', 'write_attendance', 'create_attendance',
    'read_reports', 'read_assets', 'read_documents', 'upload_documents', 'download_documents',
    'read_transfers', 'write_transfers', 'create_transfers', 'read_stores',
    'view_dashboard', 'view_attendance_summary', 'view_asset_summary', 'view_document_status',
    'view_attendance_chart', 'view_asset_chart', 'view_document_chart'
  ],
  /**
   * Accounts / finance: books, payroll touchpoints, vendor/AP, plus employee master for salary alignment.
   * No delete_users / role admin / system_admin (use catalog + denials on user if needed).
   */
  accountant: [
    // Employee management (HRMS alignment for accounts)
    'read_users',
    'write_users',
    'create_users',
    'update_users',
    'activate_users',
    'deactivate_users',
    'read_employee_master',
    'write_employee_master',
    // Attendance read (payroll / OT cross-check)
    'read_attendance',
    'read_reports',
    'write_reports',
    'export_reports',
    'read_documents',
    'upload_documents',
    'download_documents',
    'read_stores',
    // Financial
    'view_pandl',
    'view_pandl_summary',
    'manage_pandl',
    'view_expenses',
    'manage_expenses',
    'view_ledger',
    'manage_ledger',
    'view_trial_balance',
    'view_account_balance',
    'view_tds',
    'view_tds_summary',
    'manage_tds',
    'view_financial_dashboard',
    // Payroll
    'read_payroll',
    'write_payroll',
    'read_payroll_summary',
    'read_analytics',
    // Purchase / AP
    'view_vendors',
    'view_purchase_orders',
    'view_grn',
    'view_purchase_invoices',
    'manage_purchase_invoices',
    'view_vendor_payments',
    'manage_vendor_payments',
    'view_purchase_returns',
    'view_purchase_dashboard',
    'view_po_suggestions',
    'view_vendor_performance',
    // Dashboard
    'view_dashboard',
    'view_employee_count',
    'view_recent_activities',
    'view_compliance_status'
  ]
};

function getDefaultRolePermissions(roleName) {
  const n = String(roleName || '').toLowerCase();
  if (n === 'superadmin' || n === 'admin') return [...ALL_PERMISSION_CODES];
  return NARROW_DEFAULTS[n] ? [...NARROW_DEFAULTS[n]] : [];
}

module.exports = { getDefaultRolePermissions, NARROW_DEFAULTS };
