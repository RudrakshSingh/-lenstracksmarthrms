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

  // ── Optical: Lens & CL Masters (CORE+) ──────────────────────────────────
  if (hasAny(effective, ['view_lens_master', 'manage_lens_master', 'create_lens_master', 'update_lens_master'])) {
    routes.add('route:/inventory/lens-master');
    routes.add('route:/inventory/cl-master');
    routes.add('route:/inventory');
  }

  // ── Optical: Orders & Lab Kanban (CORE+) ────────────────────────────────
  if (hasAny(effective, [
    'create_optical_orders', 'view_optical_orders', 'update_optical_orders',
    'manage_optical_orders', 'view_lab_orders', 'manage_lab_orders'
  ])) {
    routes.add('route:/orders');
    routes.add('route:/orders/optical');
    routes.add('route:/lab');
    routes.add('route:/lab/kanban');
  }

  // ── Optical Supply: Vendor RX, Inward, Returns, Scorecard (GROWTH+) ─────
  if (hasAny(effective, [
    'manage_vendor_orders', 'view_vendor_orders', 'create_vendor_orders',
    'manage_inward', 'view_inward', 'manage_vendor_returns', 'view_vendor_returns'
  ])) {
    routes.add('route:/inventory/rx-orders');
    routes.add('route:/inventory/inward');
    routes.add('route:/inventory/vendor-returns');
    routes.add('route:/inventory/vendor-scorecard');
    routes.add('route:/inventory');
  }

  // ── Barcode / QR (GROWTH+) ───────────────────────────────────────────────
  if (hasAny(effective, ['manage_barcode', 'view_barcode', 'generate_barcode', 'scan_barcode'])) {
    routes.add('route:/inventory/barcode');
    routes.add('route:/inventory/barcode/generate');
    routes.add('route:/inventory/barcode/scan');
    routes.add('route:/inventory');
  }

  // ── Damage & Breakage (GROWTH+) ──────────────────────────────────────────
  if (hasAny(effective, [
    'create_damage_entry', 'view_damage_entries', 'approve_damage_entry',
    'create_breakage_entry', 'view_breakage_entries', 'approve_breakage_entry'
  ])) {
    routes.add('route:/inventory/damage');
    routes.add('route:/inventory/breakage');
    routes.add('route:/inventory');
  }

  // ── Audit System (ENTERPRISE) ────────────────────────────────────────────
  if (hasAny(effective, ['create_audit_session', 'view_audit_sessions', 'manage_audits', 'scan_audit_items'])) {
    routes.add('route:/inventory/audits');
    routes.add('route:/inventory');
  }

  // ── Dead Stock (ENTERPRISE) ──────────────────────────────────────────────
  if (hasAny(effective, ['view_dead_stock_items', 'manage_dead_stock', 'suggest_stock_transfer'])) {
    routes.add('route:/inventory/dead-stock');
    routes.add('route:/inventory');
  }

  // ── Stock Transfer (ENTERPRISE) ──────────────────────────────────────────
  if (hasAny(effective, ['create_transfer_order', 'approve_transfer_order', 'view_transfer_orders'])) {
    routes.add('route:/inventory/stock-transfer');
    routes.add('route:/inventory');
  }

  // ── Complaints / After-Sales (GROWTH+) ──────────────────────────────────
  if (hasAny(effective, [
    'create_complaint', 'view_complaints', 'manage_complaints',
    'resolve_complaint', 'approve_complaint_replacement'
  ])) {
    routes.add('route:/complaints');
  }

  // ── Finance: Deposits (ENTERPRISE) ──────────────────────────────────────
  if (hasAny(effective, ['submit_store_deposit', 'verify_deposit', 'view_deposits', 'manage_deposits'])) {
    routes.add('route:/financial/deposits');
    routes.add('route:/financial');
  }

  // ── Finance: Customer Due / Udhari (ENTERPRISE) ──────────────────────────
  if (hasAny(effective, ['view_customer_dues', 'manage_customer_dues', 'collect_due_payment', 'write_off_due'])) {
    routes.add('route:/financial/dues');
    routes.add('route:/financial');
  }

  // ── GST Engine (ENTERPRISE) ──────────────────────────────────────────────
  if (hasAny(effective, [
    'manage_gstin', 'view_gstin', 'manage_gst_categories',
    'view_gst_liability', 'manage_gst_settings'
  ])) {
    routes.add('route:/financial/gst');
    routes.add('route:/financial/gst/gstin');
    routes.add('route:/financial/gst/categories');
    routes.add('route:/financial');
  }

  // ── Finance Reports & P&L (ENTERPRISE) ───────────────────────────────────
  if (hasAny(effective, ['view_financial_reports', 'view_pl_report', 'export_financial_data'])) {
    routes.add('route:/financial/reports');
    routes.add('route:/financial/reports/pl');
    routes.add('route:/financial');
  }

  // ── JTS Trigger Checklist + Support Access (ENTERPRISE / Admin) ──────────
  if (hasAny(effective, ['manage_jts_config', 'view_jts_triggers', 'audit_jts'])) {
    routes.add('route:/admin/jts-triggers');
    routes.add('route:/admin');
  }
  if (hasAny(effective, ['manage_support_access', 'grant_support_access', 'revoke_support_access'])) {
    routes.add('route:/admin/support-access');
    routes.add('route:/admin');
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

    if (rn === 'storeadmin' || rn === 'store_manager') {
      for (const r of [
        'route:/dashboard',
        // Sales & optical orders
        'route:/orders',
        'route:/orders/optical',
        'route:/pos',
        'route:/customers',
        // Lab Kanban — store manager can see, not advance stages
        'route:/lab',
        'route:/lab/kanban',
        // Complaints — raise and view
        'route:/complaints',
        // Inventory (own store only)
        'route:/inventory',
        'route:/inventory/lens-master',
        'route:/inventory/cl-master',
        'route:/inventory/barcode',
        'route:/inventory/barcode/scan',
        'route:/inventory/damage',
        // Finance — deposit submission + due collection
        'route:/financial',
        'route:/financial/deposits',
        'route:/financial/dues',
        // HR & Ops
        'route:/attendance',
        'route:/notifications',
        'route:/reports'
      ]) {
        routes.push(r);
      }
    }

    if (rn === 'deptadmin' || rn === 'department_admin') {
      for (const r of [
        'route:/dashboard',
        'route:/employees',
        'route:/attendance',
        'route:/documents',
        'route:/reports',
        'route:/notifications',
        // Dept admins in accounts can access deposit verification
        'route:/financial',
        'route:/financial/deposits',
        'route:/financial/dues'
      ]) {
        routes.push(r);
      }
    }

    // Employee baseline navigation so post-login dashboard is never blocked
    // when detailed permission catalog is missing/partial for a tenant.
    if (rn === 'employee') {
      for (const r of ['route:/dashboard', 'route:/attendance', 'route:/documents', 'route:/notifications']) {
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
