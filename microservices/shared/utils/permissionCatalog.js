/**
 * Single source of truth for UI matrix + API validation.
 * effective = role_permissions ∪ custom_permissions ∪ legacy user.permissions \ permission_denials
 */

const PERMISSION_CATALOG_VERSION = 4;

const { SHELL_ROUTE_CODES } = require('./shellRoutes.constants');

const PERMISSION_GROUPS = [
  {
    id: 'users',
    label: 'User management',
    items: [
      { id: 'read_users', label: 'Read users' },
      { id: 'write_users', label: 'Write users' },
      { id: 'delete_users', label: 'Delete users' },
      { id: 'create_users', label: 'Create users' },
      { id: 'update_users', label: 'Update users' },
      { id: 'activate_users', label: 'Activate users' },
      { id: 'deactivate_users', label: 'Deactivate users' }
    ]
  },
  {
    id: 'attendance',
    label: 'Attendance',
    items: [
      { id: 'read_attendance', label: 'Read attendance' },
      { id: 'write_attendance', label: 'Write attendance' },
      { id: 'approve_attendance', label: 'Approve attendance' },
      { id: 'create_attendance', label: 'Create attendance' },
      { id: 'update_attendance', label: 'Update attendance' },
      { id: 'delete_attendance', label: 'Delete attendance' }
    ]
  },
  {
    id: 'reports',
    label: 'Reports',
    items: [
      { id: 'read_reports', label: 'Read reports' },
      { id: 'write_reports', label: 'Write reports' },
      { id: 'export_reports', label: 'Export reports' },
      { id: 'create_reports', label: 'Create reports' },
      { id: 'update_reports', label: 'Update reports' },
      { id: 'delete_reports', label: 'Delete reports' }
    ]
  },
  {
    id: 'assets',
    label: 'Assets',
    items: [
      { id: 'read_assets', label: 'Read assets' },
      { id: 'write_assets', label: 'Write assets' },
      { id: 'assign_assets', label: 'Assign assets' },
      { id: 'create_assets', label: 'Create assets' },
      { id: 'update_assets', label: 'Update assets' },
      { id: 'delete_assets', label: 'Delete assets' }
    ]
  },
  {
    id: 'documents',
    label: 'Documents',
    items: [
      { id: 'read_documents', label: 'Read documents' },
      { id: 'write_documents', label: 'Write documents' },
      { id: 'delete_documents', label: 'Delete documents' },
      { id: 'upload_documents', label: 'Upload documents' },
      { id: 'download_documents', label: 'Download documents' },
      { id: 'update_documents', label: 'Update documents' }
    ]
  },
  {
    id: 'transfers',
    label: 'Transfers',
    items: [
      { id: 'read_transfers', label: 'Read transfers' },
      { id: 'write_transfers', label: 'Write transfers' },
      { id: 'approve_transfers', label: 'Approve transfers' },
      { id: 'create_transfers', label: 'Create transfers' },
      { id: 'update_transfers', label: 'Update transfers' },
      { id: 'delete_transfers', label: 'Delete transfers' }
    ]
  },
  {
    id: 'stores',
    label: 'Stores',
    items: [
      { id: 'read_stores', label: 'Read stores' },
      { id: 'write_stores', label: 'Write stores' },
      { id: 'create_stores', label: 'Create stores' },
      { id: 'update_stores', label: 'Update stores' }
    ]
  },
  {
    id: 'roles',
    label: 'Roles',
    items: [
      { id: 'read_roles', label: 'Read roles' },
      { id: 'write_roles', label: 'Write roles' },
      { id: 'create_roles', label: 'Create roles' },
      { id: 'update_roles', label: 'Update roles' }
    ]
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { id: 'system_admin', label: 'System admin' },
      { id: 'audit_logs', label: 'Audit logs' },
      { id: 'backup_restore', label: 'Backup / restore' }
    ]
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    items: [
      { id: 'view_dashboard', label: 'View dashboard' },
      { id: 'manage_dashboard', label: 'Manage dashboard' },
      { id: 'view_all_widgets', label: 'View all widgets' },
      { id: 'manage_widgets', label: 'Manage widgets' },
      { id: 'view_attendance_summary', label: 'Attendance summary' },
      { id: 'view_employee_count', label: 'Employee count' },
      { id: 'view_asset_summary', label: 'Asset summary' },
      { id: 'view_transfer_requests', label: 'Transfer requests' },
      { id: 'view_document_status', label: 'Document status' },
      { id: 'view_store_performance', label: 'Store performance' },
      { id: 'view_attendance_chart', label: 'Attendance chart' },
      { id: 'view_employee_chart', label: 'Employee chart' },
      { id: 'view_asset_chart', label: 'Asset chart' },
      { id: 'view_transfer_chart', label: 'Transfer chart' },
      { id: 'view_document_chart', label: 'Document chart' },
      { id: 'view_store_chart', label: 'Store chart' },
      { id: 'view_recent_activities', label: 'Recent activities' },
      { id: 'view_pending_approvals', label: 'Pending approvals' },
      { id: 'view_system_alerts', label: 'System alerts' },
      { id: 'view_attendance_trends', label: 'Attendance trends' },
      { id: 'view_employee_trends', label: 'Employee trends' },
      { id: 'view_asset_trends', label: 'Asset trends' },
      { id: 'view_compliance_status', label: 'Compliance status' },
      { id: 'view_audit_logs', label: 'View audit logs' },
      { id: 'view_system_metrics', label: 'System metrics' }
    ]
  },
  {
    id: 'sales_clinical',
    label: 'Sales & clinical',
    items: [
      { id: 'view_sales_data', label: 'View sales data' },
      { id: 'manage_sales', label: 'Manage sales' },
      { id: 'view_customer_data', label: 'View customer data' },
      { id: 'manage_customers', label: 'Manage customers' },
      { id: 'view_customers', label: 'View customers' },
      { id: 'view_optometry_data', label: 'View optometry data' },
      { id: 'manage_optometry', label: 'Manage optometry' },
      { id: 'view_prescriptions', label: 'View prescriptions' },
      { id: 'prescription:create', label: 'Prescription create' },
      { id: 'prescription:read', label: 'Prescription read' },
      { id: 'prescription:update', label: 'Prescription update' },
      { id: 'prescription:sign', label: 'Prescription sign' },
      { id: 'prescription:delete', label: 'Prescription delete' },
      { id: 'checkup:create', label: 'Checkup create' },
      { id: 'checkup:read', label: 'Checkup read' },
      { id: 'checkup:update', label: 'Checkup update' },
      { id: 'qr_lead:create', label: 'QR lead create' },
      { id: 'qr_lead:read', label: 'QR lead read' },
      { id: 'qr_lead:link', label: 'QR lead link' },
      { id: 'rxlink:read', label: 'Rx link read' },
      { id: 'rxlink:redeem', label: 'Rx link redeem' },
      { id: 'clinical:calculate', label: 'Clinical calculate' },
      { id: 'prescription:export', label: 'Prescription export' },
      { id: 'prescription:audit', label: 'Prescription audit' },
      { id: 'geofencing_access', label: 'Geofencing access' },
      { id: 'location_tracking', label: 'Location tracking' },
      { id: 'store_geofencing', label: 'Store geofencing' }
    ]
  },
  {
    id: 'erp_inventory',
    label: 'ERP & inventory',
    items: [
      { id: 'view_aging_dashboard', label: 'Aging dashboard' },
      { id: 'generate_aging_report', label: 'Generate aging report' },
      { id: 'view_aging_reports', label: 'View aging reports' },
      { id: 'view_transfer_recommendations', label: 'Transfer recommendations' },
      { id: 'create_transfer_order', label: 'Create transfer order' },
      { id: 'view_transfer_orders', label: 'View transfer orders' },
      { id: 'approve_transfer_order', label: 'Approve transfer order' },
      { id: 'calculate_gst', label: 'Calculate GST' },
      { id: 'view_hsn_details', label: 'HSN details' },
      { id: 'view_inventory_aging', label: 'Inventory aging' },
      { id: 'view_slow_moving_items', label: 'Slow moving items' },
      { id: 'view_dead_stock_items', label: 'Dead stock items' },
      { id: 'create_sales_orders', label: 'Create sales orders' },
      { id: 'view_sales_orders', label: 'View sales orders' },
      { id: 'update_sales_orders', label: 'Update sales orders' },
      { id: 'view_sales_dashboard', label: 'Sales dashboard' },
      { id: 'view_product_availability', label: 'Product availability' }
    ]
  },
  {
    id: 'financial',
    label: 'Financial',
    items: [
      { id: 'manage_pandl', label: 'Manage P&L' },
      { id: 'view_pandl', label: 'View P&L' },
      { id: 'view_pandl_summary', label: 'P&L summary' },
      { id: 'manage_expenses', label: 'Manage expenses' },
      { id: 'view_expenses', label: 'View expenses' },
      { id: 'manage_ledger', label: 'Manage ledger' },
      { id: 'view_ledger', label: 'View ledger' },
      { id: 'view_trial_balance', label: 'Trial balance' },
      { id: 'view_account_balance', label: 'Account balance' },
      { id: 'manage_tds', label: 'Manage TDS' },
      { id: 'view_tds', label: 'View TDS' },
      { id: 'view_tds_summary', label: 'TDS summary' },
      { id: 'view_financial_dashboard', label: 'Financial dashboard' }
    ]
  },
  {
    id: 'payroll',
    label: 'Payroll',
    items: [
      { id: 'write_employee_master', label: 'Write employee master' },
      { id: 'read_employee_master', label: 'Read employee master' },
      { id: 'write_payroll', label: 'Write payroll' },
      { id: 'read_payroll', label: 'Read payroll' },
      { id: 'read_payroll_summary', label: 'Payroll summary' },
      { id: 'lock_payroll', label: 'Lock payroll' },
      { id: 'read_analytics', label: 'Read analytics' },
      { id: 'payroll_gates_read', label: 'Payroll — view readiness gates' },
      { id: 'payroll_run_execute', label: 'Payroll — run dry/final payroll' },
      { id: 'payroll_cycle_manage', label: 'Payroll — initiate cycle' },
      { id: 'payroll_hr_submit', label: 'Payroll — HR submit for approval' },
      { id: 'payroll_finance_approve', label: 'Payroll — finance approve/reject' },
      { id: 'payroll_freeze', label: 'Payroll — freeze (immutable)' },
      { id: 'payroll_post_finance', label: 'Payroll — post to finance' },
      { id: 'payroll_reconcile', label: 'Payroll — reconcile with finance' },
      { id: 'payroll_cycle_unlock', label: 'Payroll — unlock frozen cycle (super admin)' },
      { id: 'payroll_audit_read', label: 'Payroll — read audit trail' },
      { id: 'payroll_reports_export', label: 'Payroll — statutory/report export' },
      { id: 'payroll_payslip_manage', label: 'Payroll — generate/send payslips' },
      { id: 'payroll_payslip_self', label: 'Payroll — download own payslip (self-service)' }
    ]
  },
  {
    id: 'purchase',
    label: 'Purchase',
    items: [
      { id: 'manage_vendors', label: 'Manage vendors' },
      { id: 'view_vendors', label: 'View vendors' },
      { id: 'manage_purchase_orders', label: 'Manage POs' },
      { id: 'view_purchase_orders', label: 'View POs' },
      { id: 'manage_grn', label: 'Manage GRN' },
      { id: 'view_grn', label: 'View GRN' },
      { id: 'manage_purchase_invoices', label: 'Manage purchase invoices' },
      { id: 'view_purchase_invoices', label: 'View purchase invoices' },
      { id: 'manage_vendor_payments', label: 'Manage vendor payments' },
      { id: 'view_vendor_payments', label: 'View vendor payments' },
      { id: 'manage_purchase_returns', label: 'Manage purchase returns' },
      { id: 'view_purchase_returns', label: 'View purchase returns' },
      { id: 'manage_reorder_rules', label: 'Reorder rules' },
      { id: 'view_reorder_rules', label: 'View reorder rules' },
      { id: 'view_po_suggestions', label: 'PO suggestions' },
      { id: 'generate_po_suggestions', label: 'Generate PO suggestions' },
      { id: 'view_vendor_performance', label: 'Vendor performance' },
      { id: 'view_purchase_dashboard', label: 'Purchase dashboard' }
    ]
  },
  {
    id: 'service_cpp',
    label: 'Service & CPP',
    items: [
      { id: 'create_tickets', label: 'Create tickets' },
      { id: 'view_tickets', label: 'View tickets' },
      { id: 'assign_tickets', label: 'Assign tickets' },
      { id: 'update_ticket_status', label: 'Update ticket status' },
      { id: 'pause_tickets', label: 'Pause tickets' },
      { id: 'resume_tickets', label: 'Resume tickets' },
      { id: 'manage_sla', label: 'Manage SLA' },
      { id: 'manage_sla_policies', label: 'SLA policies' },
      { id: 'view_sla_policies', label: 'View SLA policies' },
      { id: 'manage_escalation_matrix', label: 'Escalation matrix' },
      { id: 'view_escalation_matrix', label: 'View escalation matrix' },
      { id: 'view_sla_reports', label: 'SLA reports' },
      { id: 'view_ticket_analytics', label: 'Ticket analytics' },
      { id: 'view_red_alert_dashboard', label: 'Red alert dashboard' },
      { id: 'send_ticket_notifications', label: 'Ticket notifications' },
      { id: 'view_service_dashboard', label: 'Service dashboard' },
      { id: 'manage_cpp_policies', label: 'CPP policies' },
      { id: 'view_cpp_policies', label: 'View CPP policies' },
      { id: 'manage_cpp_enrollments', label: 'CPP enrollments' },
      { id: 'view_cpp_enrollments', label: 'View CPP enrollments' },
      { id: 'create_cpp_claims', label: 'Create CPP claims' },
      { id: 'view_cpp_claims', label: 'View CPP claims' },
      { id: 'assess_cpp_claims', label: 'Assess CPP claims' },
      { id: 'fulfill_cpp_claims', label: 'Fulfill CPP claims' },
      { id: 'manage_cpp_claims', label: 'Manage CPP claims' },
      { id: 'view_cpp_pricing', label: 'CPP pricing' },
      { id: 'check_cpp_eligibility', label: 'CPP eligibility' },
      { id: 'view_cpp_analytics', label: 'CPP analytics' },
      { id: 'view_cpp_dashboard', label: 'CPP dashboard' }
    ]
  },
  {
    id: 'engagement',
    label: 'Engagement & incentives',
    items: [
      { id: 'manage_appointments', label: 'Manage appointments' },
      { id: 'view_appointments', label: 'View appointments' },
      { id: 'manage_prescriptions', label: 'Manage prescriptions (CRM)' },
      { id: 'manage_contact_lens_plans', label: 'Contact lens plans' },
      { id: 'manage_campaigns', label: 'Campaigns' },
      { id: 'view_campaigns', label: 'View campaigns' },
      { id: 'manage_templates', label: 'Templates' },
      { id: 'view_templates', label: 'View templates' },
      { id: 'manage_automation_rules', label: 'Automation rules' },
      { id: 'view_automation_rules', label: 'View automation rules' },
      { id: 'create_tasks', label: 'Create tasks' },
      { id: 'view_tasks', label: 'View tasks' },
      { id: 'update_tasks', label: 'Update tasks' },
      { id: 'run_automation', label: 'Run automation' },
      { id: 'send_messages', label: 'Send messages' },
      { id: 'submit_feedback', label: 'Submit feedback' },
      { id: 'view_engagement_analytics', label: 'Engagement analytics' },
      { id: 'view_message_logs', label: 'Message logs' },
      { id: 'manage_incentive_rules', label: 'Incentive rules' },
      { id: 'view_incentive_rules', label: 'View incentive rules' },
      { id: 'record_performance', label: 'Record performance' },
      { id: 'view_performance', label: 'View performance' },
      { id: 'calculate_incentives', label: 'Calculate incentives' },
      { id: 'use_gamification', label: 'Use gamification' },
      { id: 'view_gamification', label: 'View gamification' },
      { id: 'view_leaderboards', label: 'Leaderboards' },
      { id: 'view_payouts', label: 'View payouts' },
      { id: 'approve_payouts', label: 'Approve payouts' },
      { id: 'process_payouts', label: 'Process payouts' },
      { id: 'manage_teams', label: 'Manage teams' },
      { id: 'view_teams', label: 'View teams' },
      { id: 'view_incentive_analytics', label: 'Incentive analytics' },
      { id: 'view_incentive_dashboard', label: 'Incentive dashboard' }
    ]
  },
  {
    id: 'shell_routes',
    label: 'Shell routes (navigation)',
    items: SHELL_ROUTE_CODES.map((routeCode) => ({
      id: routeCode,
      label: `Route: ${routeCode.replace(/^route:/, '')}`
    }))
  }
];

function buildAllCodes() {
  const set = new Set();
  for (const g of PERMISSION_GROUPS) {
    for (const it of g.items) set.add(it.id);
  }
  // Shell route tokens are first-class permission strings for host navigation gating.
  for (const r of SHELL_ROUTE_CODES) set.add(r);
  return [...set].sort();
}

const ALL_PERMISSION_CODES = buildAllCodes();
const PERMISSION_CODE_SET = new Set(ALL_PERMISSION_CODES);

function isShellRoutePermissionToken(code) {
  if (typeof code !== 'string') return false;
  const c = code.trim();
  if (!c.startsWith('route:/')) return false;
  // conservative: lowercase path segments, no whitespace
  if (c !== c.toLowerCase()) return false;
  if (/\s/.test(c)) return false;
  return true;
}

function isViewPermissionToken(code) {
  if (typeof code !== 'string') return false;
  const c = code.trim();
  if (!c.startsWith('view:')) return false;
  if (/\s/.test(c)) return false;
  // view:<area>:<variant> (extra segments allowed but must be sane)
  const parts = c.split(':').filter(Boolean);
  return parts.length >= 3;
}

function isValidPermissionCode(code) {
  if (typeof code !== 'string') return false;
  const c = code.trim();
  if (!c) return false;
  if (PERMISSION_CODE_SET.has(c)) return true;
  if (isShellRoutePermissionToken(c)) return true;
  if (isViewPermissionToken(c)) return true;
  return false;
}

function filterValidCodes(arr) {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map((c) => String(c).trim()).filter((c) => isValidPermissionCode(c)))];
}

module.exports = {
  PERMISSION_CATALOG_VERSION,
  PERMISSION_GROUPS,
  SHELL_ROUTE_CODES,
  ALL_PERMISSION_CODES,
  PERMISSION_CODE_SET,
  isValidPermissionCode,
  filterValidCodes
};
