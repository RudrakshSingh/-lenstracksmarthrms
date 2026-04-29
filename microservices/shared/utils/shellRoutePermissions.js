const { SHELL_ROUTE_CODES } = require('./shellRoutes.constants');

function hasAny(effectiveSet, codes) {
  return codes.some((c) => effectiveSet.has(c));
}

function hasWildcardAll(effectiveSet) {
  for (const p of effectiveSet) {
    const v = String(p).trim();
    if (v === '*' || v === '**' || v.toUpperCase() === 'ALL') return true;
  }
  return false;
}

/**
 * Derive additional route:/... grants from business permissions.
 * This is intentionally conservative: only unlock routes when there is a clear capability signal.
 */
function deriveRoutePermissionsFromEffective(effectivePermissions = []) {
  const effective = new Set(
    (effectivePermissions || []).map((p) => String(p).trim()).filter(Boolean)
  );
  const routes = new Set();

  // Always allow dashboard entry if user has any dashboard visibility/management signal.
  if (
    hasAny(effective, [
      'view_dashboard',
      'manage_dashboard',
      'view_all_widgets',
      'manage_widgets',
      'view_attendance_summary',
      'view_employee_count',
      'view_asset_summary',
      'view_transfer_requests',
      'view_document_status',
      'view_store_performance',
      'view_pending_approvals',
      'view_system_alerts'
    ])
  ) {
    routes.add('route:/dashboard');
  }

  if (hasAny(effective, ['read_users', 'write_users', 'create_users', 'update_users', 'activate_users', 'deactivate_users', 'delete_users'])) {
    routes.add('route:/employees');
  }

  if (hasAny(effective, ['read_stores', 'write_stores', 'create_stores', 'update_stores'])) {
    routes.add('route:/stores');
  }

  if (hasAny(effective, ['read_attendance', 'write_attendance', 'approve_attendance', 'create_attendance', 'update_attendance', 'delete_attendance'])) {
    routes.add('route:/attendance');
  }

  if (hasAny(effective, ['geofencing_access', 'location_tracking', 'store_geofencing'])) {
    routes.add('route:/geofencing');
  }

  // Payroll-ish surface area (Phase-1 product uses payroll routes for salary processing UX)
  if (
    hasAny(effective, [
      'read_reports',
      'write_reports',
      'export_reports',
      'create_reports',
      'update_reports',
      'delete_reports'
    ])
  ) {
    routes.add('route:/payroll');
  }

  // Sales / POS / customers
  if (hasAny(effective, ['view_sales_data', 'manage_sales', 'create_sales_orders', 'view_sales_orders', 'update_sales_orders', 'view_sales_dashboard'])) {
    routes.add('route:/orders');
    routes.add('route:/pos');
    routes.add('route:/reports');
  }

  if (hasAny(effective, ['view_customer_data', 'manage_customers', 'view_customers'])) {
    routes.add('route:/customers');
  }

  if (hasAny(effective, ['view_product_availability'])) {
    routes.add('route:/products');
  }

  // ERP / inventory module surface (host route inventory uses /inventory style in some deployments)
  if (
    hasAny(effective, [
      'view_transfer_orders',
      'create_transfer_order',
      'approve_transfer_order',
      'view_inventory_aging',
      'view_slow_moving_items',
      'view_dead_stock_items',
      'view_product_availability'
    ])
  ) {
    routes.add('route:/inventory');
  }

  // Financial module surface (host route may be /financial)
  if (
    hasAny(effective, [
      'manage_expenses',
      'view_expenses',
      'approve_expenses',
      'manage_ledger',
      'view_ledger',
      'view_trial_balance',
      'view_account_balance',
      'manage_tds',
      'view_tds',
      'view_tds_summary',
      'view_financial_dashboard'
    ])
  ) {
    routes.add('route:/financial');
  }

  // Documents
  if (hasAny(effective, ['read_documents', 'write_documents', 'upload_documents', 'download_documents', 'update_documents', 'delete_documents'])) {
    routes.add('route:/documents');
  }

  // Notifications (often tied to dashboard widgets / approvals)
  if (hasAny(effective, ['view_pending_approvals', 'view_system_alerts'])) {
    routes.add('route:/notifications');
  }

  // Admin-ish capabilities (tenant admin / permission matrix)
  if (
    hasAny(effective, [
      'read_roles',
      'write_roles',
      'create_roles',
      'update_roles',
      'system_admin',
      'audit_logs',
      'backup_restore'
    ])
  ) {
    routes.add('route:/admin');
    routes.add('route:/admin/permissions');
    routes.add('route:/tenant-admin');
  }

  return [...routes].sort();
}

function deriveViewPermissionsFromEffective(effectivePermissions = [], roleName = '') {
  const effective = new Set(
    (effectivePermissions || []).map((p) => String(p).trim()).filter(Boolean)
  );
  const views = new Set();

  const rn = String(roleName || '').toLowerCase().trim();
  if (rn === 'admin' || rn === 'superadmin') {
    views.add('view:hr_dashboard:admin');
    views.add('view:tenant_admin:full');
    return [...views].sort();
  }

  if (hasAny(effective, ['system_admin', 'audit_logs', 'backup_restore', 'read_roles', 'write_roles'])) {
    views.add('view:tenant_admin:full');
  } else if (hasAny(effective, ['view_dashboard', 'manage_dashboard'])) {
    views.add('view:hr_dashboard:summary');
  }

  return [...views].sort();
}

function compileShellRouteAndViewPermissions(effectivePermissions = [], roleName = '', deniedPermissions = []) {
  const rn = String(roleName || '').toLowerCase().trim();
  const baseEffective = [...new Set((effectivePermissions || []).map((p) => String(p).trim()).filter(Boolean))];
  const effectiveSet = new Set(baseEffective);
  const deniedSet = new Set((deniedPermissions || []).map((p) => String(p).trim()).filter(Boolean));

  let routes = [];
  if (rn === 'admin' || rn === 'superadmin' || hasWildcardAll(effectiveSet)) {
    routes = [...SHELL_ROUTE_CODES];
  } else {
    routes = deriveRoutePermissionsFromEffective(baseEffective);

    // Role-based navigation bundles (Shell UX expects these even when business-permission mapping is incomplete)
    if (rn === 'hr') {
      for (const r of [
        'route:/dashboard',
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
        'route:/documents',
        'route:/notifications'
      ]) {
        routes.push(r);
      }
    }

    if (rn === 'finance' || rn === 'accountant') {
      for (const r of [
        'route:/dashboard',
        'route:/financial',
        'route:/reports',
        'route:/documents',
        'route:/notifications'
      ]) {
        routes.push(r);
      }
    }
  }

  const views = deriveViewPermissionsFromEffective(baseEffective, rn);

  const merged = new Set([...baseEffective, ...routes, ...views]);
  if (deniedSet.size === 0) return [...merged].sort();
  return [...merged].filter((p) => !deniedSet.has(p)).sort();
}

module.exports = {
  compileShellRouteAndViewPermissions
};
