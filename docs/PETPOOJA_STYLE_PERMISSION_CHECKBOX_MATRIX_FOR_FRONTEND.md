# Petpooja-style Permission Checkbox Matrix (Frontend Developer Doc)

**Purpose:** Frontend ko exact guidance dena for permission checkboxes:
- kaunse permission IDs valid hain,
- module/group ke hisaab se kaise render karna hai,
- designation (role) ke default permissions kya milte hain.

**Source of truth (code):**
- `microservices/shared/utils/permissionCatalog.js`
- `microservices/shared/utils/defaultRolePermissions.js`
- `microservices/auth-service/src/models/Role.model.js`

---

## 1) Frontend golden rules

- Checkbox IDs **hardcode mat karo** for security logic; always load from `GET /api/permission/catalog`.
- Save ke waqt backend ko do arrays bhejni hain:
  - `custom_permissions` (extra allow)
  - `permission_denials` (explicit deny)
- Effective access frontend side par final mat maan lo; backend ka `effectivePermissions` authoritative hai.

---

## 2) Roles / designations currently defined

Auth Role enum (`Role.model.js`) includes:

- `superadmin`
- `admin`
- `hr`
- `manager`
- `employee`
- `accountant`
- `store_manager`
- `sales`
- `optometrist`

### Important default behavior

- `superadmin` and `admin` -> **all catalog permissions**
- `hr`, `manager`, `employee`, `accountant` -> seeded from `NARROW_DEFAULTS`
- `store_manager`, `sales`, `optometrist` -> shared defaults file me explicit list nahi; unless DB role doc me permissions set hain, default fallback empty ho sakta hai.

---

## 3) Permission groups and checkbox IDs (render these from catalog)

Below is current catalog grouping so frontend team can map module sections.

### 3.1 Users (`users`)
- `read_users`
- `write_users`
- `delete_users`
- `create_users`
- `update_users`
- `activate_users`
- `deactivate_users`

### 3.2 Attendance (`attendance`)
- `read_attendance`
- `write_attendance`
- `approve_attendance`
- `create_attendance`
- `update_attendance`
- `delete_attendance`

### 3.3 Reports (`reports`)
- `read_reports`
- `write_reports`
- `export_reports`
- `create_reports`
- `update_reports`
- `delete_reports`

### 3.4 Assets (`assets`)
- `read_assets`
- `write_assets`
- `assign_assets`
- `create_assets`
- `update_assets`
- `delete_assets`

### 3.5 Documents (`documents`)
- `read_documents`
- `write_documents`
- `delete_documents`
- `upload_documents`
- `download_documents`
- `update_documents`

### 3.6 Transfers (`transfers`)
- `read_transfers`
- `write_transfers`
- `approve_transfers`
- `create_transfers`
- `update_transfers`
- `delete_transfers`

### 3.7 Stores (`stores`)
- `read_stores`
- `write_stores`
- `create_stores`
- `update_stores`

### 3.8 Roles (`roles`)
- `read_roles`
- `write_roles`
- `create_roles`
- `update_roles`

### 3.9 System (`system`)
- `system_admin`
- `audit_logs`
- `backup_restore`

### 3.10 Dashboard (`dashboard`)
- `view_dashboard`
- `manage_dashboard`
- `view_all_widgets`
- `manage_widgets`
- `view_attendance_summary`
- `view_employee_count`
- `view_asset_summary`
- `view_transfer_requests`
- `view_document_status`
- `view_store_performance`
- `view_attendance_chart`
- `view_employee_chart`
- `view_asset_chart`
- `view_transfer_chart`
- `view_document_chart`
- `view_store_chart`
- `view_recent_activities`
- `view_pending_approvals`
- `view_system_alerts`
- `view_attendance_trends`
- `view_employee_trends`
- `view_asset_trends`
- `view_compliance_status`
- `view_audit_logs`
- `view_system_metrics`

### 3.11 Sales & Clinical (`sales_clinical`)
- `view_sales_data`
- `manage_sales`
- `view_customer_data`
- `manage_customers`
- `view_customers`
- `view_optometry_data`
- `manage_optometry`
- `view_prescriptions`
- `prescription:create`
- `prescription:read`
- `prescription:update`
- `prescription:sign`
- `prescription:delete`
- `checkup:create`
- `checkup:read`
- `checkup:update`
- `qr_lead:create`
- `qr_lead:read`
- `qr_lead:link`
- `rxlink:read`
- `rxlink:redeem`
- `clinical:calculate`
- `prescription:export`
- `prescription:audit`
- `geofencing_access`
- `location_tracking`
- `store_geofencing`

### 3.12 ERP & Inventory (`erp_inventory`)
- `view_aging_dashboard`
- `generate_aging_report`
- `view_aging_reports`
- `view_transfer_recommendations`
- `create_transfer_order`
- `view_transfer_orders`
- `approve_transfer_order`
- `calculate_gst`
- `view_hsn_details`
- `view_inventory_aging`
- `view_slow_moving_items`
- `view_dead_stock_items`
- `create_sales_orders`
- `view_sales_orders`
- `update_sales_orders`
- `view_sales_dashboard`
- `view_product_availability`

### 3.13 Financial (`financial`)
- `manage_pandl`
- `view_pandl`
- `view_pandl_summary`
- `manage_expenses`
- `view_expenses`
- `manage_ledger`
- `view_ledger`
- `view_trial_balance`
- `view_account_balance`
- `manage_tds`
- `view_tds`
- `view_tds_summary`
- `view_financial_dashboard`

### 3.14 Payroll (`payroll`)
- `write_employee_master`
- `read_employee_master`
- `write_payroll`
- `read_payroll`
- `read_payroll_summary`
- `lock_payroll`
- `read_analytics`

### 3.15 Purchase (`purchase`)
- `manage_vendors`
- `view_vendors`
- `manage_purchase_orders`
- `view_purchase_orders`
- `manage_grn`
- `view_grn`
- `manage_purchase_invoices`
- `view_purchase_invoices`
- `manage_vendor_payments`
- `view_vendor_payments`
- `manage_purchase_returns`
- `view_purchase_returns`
- `manage_reorder_rules`
- `view_reorder_rules`
- `view_po_suggestions`
- `generate_po_suggestions`
- `view_vendor_performance`
- `view_purchase_dashboard`

### 3.16 Service & CPP (`service_cpp`)
- `create_tickets`
- `view_tickets`
- `assign_tickets`
- `update_ticket_status`
- `pause_tickets`
- `resume_tickets`
- `manage_sla`
- `manage_sla_policies`
- `view_sla_policies`
- `manage_escalation_matrix`
- `view_escalation_matrix`
- `view_sla_reports`
- `view_ticket_analytics`
- `view_red_alert_dashboard`
- `send_ticket_notifications`
- `view_service_dashboard`
- `manage_cpp_policies`
- `view_cpp_policies`
- `manage_cpp_enrollments`
- `view_cpp_enrollments`
- `create_cpp_claims`
- `view_cpp_claims`
- `assess_cpp_claims`
- `fulfill_cpp_claims`
- `manage_cpp_claims`
- `view_cpp_pricing`
- `check_cpp_eligibility`
- `view_cpp_analytics`
- `view_cpp_dashboard`

### 3.17 Engagement & Incentives (`engagement`)
- `manage_appointments`
- `view_appointments`
- `manage_prescriptions`
- `manage_contact_lens_plans`
- `manage_campaigns`
- `view_campaigns`
- `manage_templates`
- `view_templates`
- `manage_automation_rules`
- `view_automation_rules`
- `create_tasks`
- `view_tasks`
- `update_tasks`
- `run_automation`
- `send_messages`
- `submit_feedback`
- `view_engagement_analytics`
- `view_message_logs`
- `manage_incentive_rules`
- `view_incentive_rules`
- `record_performance`
- `view_performance`
- `calculate_incentives`
- `use_gamification`
- `view_gamification`
- `view_leaderboards`
- `view_payouts`
- `approve_payouts`
- `process_payouts`
- `manage_teams`
- `view_teams`
- `view_incentive_analytics`
- `view_incentive_dashboard`

---

## 4) Designation-wise default permissions (seed baseline)

This is the default template if role doc has no custom role permissions.

## 4.1 `superadmin`
- Baseline: all catalog IDs (full access).

## 4.2 `admin`
- Baseline: all catalog IDs (full access).

## 4.3 `hr` (default set)
- Users: `read_users`, `write_users`, `create_users`, `update_users`, `activate_users`, `deactivate_users`
- Attendance: `read_attendance`, `write_attendance`, `approve_attendance`, `create_attendance`
- Reports: `read_reports`, `write_reports`, `export_reports`, `create_reports`
- Assets: `read_assets`, `write_assets`, `assign_assets`, `create_assets`, `update_assets`
- Documents: `read_documents`, `write_documents`, `upload_documents`, `download_documents`
- Transfers: `read_transfers`, `write_transfers`, `approve_transfers`, `create_transfers`
- Stores: `read_stores`, `write_stores`, `create_stores`, `update_stores`
- Roles: `read_roles`, `write_roles`, `create_roles`, `update_roles`
- Dashboard (subset): `view_dashboard`, `view_attendance_summary`, `view_employee_count`, `view_asset_summary`, `view_transfer_requests`, `view_document_status`, `view_store_performance`, `view_attendance_chart`, `view_employee_chart`, `view_asset_chart`, `view_transfer_chart`, `view_document_chart`, `view_store_chart`, `view_recent_activities`, `view_pending_approvals`, `view_attendance_trends`, `view_employee_trends`

## 4.4 `manager` (default set)
- Users: `read_users`, `write_users`, `create_users`, `update_users`
- Attendance: `read_attendance`, `write_attendance`, `approve_attendance`, `create_attendance`
- Reports: `read_reports`, `write_reports`, `export_reports`
- Assets: `read_assets`, `write_assets`, `assign_assets`, `create_assets`, `update_assets`
- Documents: `read_documents`, `write_documents`, `upload_documents`, `download_documents`
- Transfers: `read_transfers`, `write_transfers`, `approve_transfers`, `create_transfers`
- Stores: `read_stores`, `write_stores`
- Dashboard (subset): `view_dashboard`, `view_attendance_summary`, `view_employee_count`, `view_asset_summary`, `view_transfer_requests`, `view_attendance_chart`, `view_employee_chart`, `view_asset_chart`, `view_transfer_chart`, `view_recent_activities`, `view_pending_approvals`

## 4.5 `employee` (default set)
- `read_users`
- Attendance: `read_attendance`, `write_attendance`, `create_attendance`
- `read_reports`
- `read_assets`
- Documents: `read_documents`, `upload_documents`, `download_documents`
- Transfers: `read_transfers`, `write_transfers`, `create_transfers`
- `read_stores`
- Dashboard (subset): `view_dashboard`, `view_attendance_summary`, `view_asset_summary`, `view_document_status`, `view_attendance_chart`, `view_asset_chart`, `view_document_chart`

## 4.6 `accountant` (default set)
- User/employee alignment: `read_users`, `write_users`, `create_users`, `update_users`, `activate_users`, `deactivate_users`, `read_employee_master`, `write_employee_master`
- Attendance/report/docs/stores: `read_attendance`, `read_reports`, `write_reports`, `export_reports`, `read_documents`, `upload_documents`, `download_documents`, `read_stores`
- Financial: `view_pandl`, `view_pandl_summary`, `manage_pandl`, `view_expenses`, `manage_expenses`, `view_ledger`, `manage_ledger`, `view_trial_balance`, `view_account_balance`, `view_tds`, `view_tds_summary`, `manage_tds`, `view_financial_dashboard`
- Payroll: `read_payroll`, `write_payroll`, `read_payroll_summary`, `read_analytics`
- Purchase/AP: `view_vendors`, `view_purchase_orders`, `view_grn`, `view_purchase_invoices`, `manage_purchase_invoices`, `view_vendor_payments`, `manage_vendor_payments`, `view_purchase_returns`, `view_purchase_dashboard`, `view_po_suggestions`, `view_vendor_performance`
- Dashboard subset: `view_dashboard`, `view_employee_count`, `view_recent_activities`, `view_compliance_status`

## 4.7 `store_manager`, `sales`, `optometrist`
- Role enum me available hain.
- Shared default map me explicit baseline list defined nahi.
- Frontend expectation:
  - user detail API se `rolePermissions` and `effectivePermissions` read karo;
  - matrix me catalog ke saare checkboxes render karo;
  - existing effective/custom/deny state prefill karo.

---

## 5) What frontend should put as checkbox behavior

- Use `catalog.groups[].items[]` for all checkboxes.
- Each checkbox should map to one permission id.
- Save button should send full arrays via `PATCH /api/permission/user/:userId/overrides`:
  - `custom_permissions`: explicit extra grants
  - `permission_denials`: explicit remove
- Before save, call `POST /api/permission/user/:userId/escalation-preview` for safe UX.
- Use `If-Match: W/"permrev-<n>"` from user detail response revision for concurrency-safe save.

---

## 6) API endpoints frontend will use

- `GET /api/permission/catalog`
- `GET /api/permission/users`
- `GET /api/permission/user/:userId`
- `POST /api/permission/user/:userId/escalation-preview`
- `PATCH /api/permission/user/:userId/overrides`
- `POST /api/permission/user/:userId/reset`

Headers:
- `Authorization: Bearer <token>`
- `X-Tenant-Id: <tenantId>`

---

## 7) Quick implementation note for product team

For Petpooja-style matrix, role template sirf starting point hai. Real user access is always:

`effective = role_permissions U custom_permissions U legacy_permissions - permission_denials`

Isliye UI me "Role default" and "User override" dono clearly show karo.

---

## 8) Override permissions (frontend must implement this clearly)

This section is critical for Petpooja-style checkbox UX.

### 8.1 Meaning of overrides

- `custom_permissions` = extra allows (role me na ho tab bhi ON)
- `permission_denials` = force denies (role me ho tab bhi OFF)

Final backend formula:

`effective = role_permissions U custom_permissions U legacy_permissions - permission_denials`

### 8.2 Frontend save flow (recommended)

1. `GET /api/permission/user/:userId`  
   - read: `customPermissions`, `permissionDenials`, `effectivePermissions`, `permissionsRevision`
2. User matrix edits
3. `POST /api/permission/user/:userId/escalation-preview`  
   - use `allowed`, `blockingPermission`, `added`, `removed`
4. `PATCH /api/permission/user/:userId/overrides`  
   - send full arrays:
     - `custom_permissions: [...]`
     - `permission_denials: [...]`
   - include `If-Match: W/"permrev-<revision>"` when available
5. On `412 PERMISSION_REVISION_CONFLICT` -> reload user detail and retry

### 8.3 Hard validation rules for UI

- Same permission id ko dono arrays me mat bhejo.
- Catalog se bahar id mat bhejo (backend strip karega, but frontend clean rakhe).
- `reset` action should call `POST /api/permission/user/:userId/reset` (both arrays clear).
- Matrix me three states clear dikhao:
  - Role default
  - User extra allow
  - User explicit deny

---

## 9) JTS permissions note (important integration caveat)

JTS module mostly **role-first RBAC** follow karta hai (`requireRole([...])`) rather than permission-code checks.

- Meaning: Petpooja checkbox overrides mainly auth-service effective permissions control karte hain.
- JTS screens ke liye frontend ko role gates bhi apply karne padenge (manager tier vs read tier, etc.).
- So JTS visibility/CTA decisions should be:
  - role-based first,
  - then optional permission-based checks where product uses them.

In short: JTS me checkbox permissions useful hain, but route authorization ka primary gate mostly role hai.

### 9.1 Quick JTS frontend role matrix (minimum role guidance)

| JTS feature/screen | Minimum frontend role gate |
|---|---|
| Task list/detail, timer view, own task actions | Any authenticated role |
| Self-task create (`/jts/self-tasks`) | Any authenticated role |
| Manager task create (`POST /jts/tasks`) | `MANAGER` / `STORE_MANAGER` / `CLUSTER_MANAGER` / `COUNTRY_OPS` / `TENANT_ADMIN` / `HOD` (plus `ADMIN`/`SUPERADMIN`) |
| Task update/delete/reassign | Same manager tier as above |
| Force complete | Manager tier + admin/superadmin (backend enforces privileged roles) |
| Analytics overview/slices for operations | Manager-read tier (`MANAGER`, `STORE_MANAGER`, `CLUSTER_MANAGER`, `COUNTRY_OPS`, `TENANT_ADMIN`, `HOD`, `ADMIN`, `SUPERADMIN`) |
| SLA policies + escalation console | Same read tier as above |
| Catalog read (`/jts/catalog` GETs) | Same read tier as above |
| Catalog write (task types, SLA/escalation rules, policies) | Write tier (`TENANT_ADMIN`, `COUNTRY_OPS`, `HOD`, `CLUSTER_MANAGER`, `ADMIN`, `SUPERADMIN`) |
| Notification dispatch/admin ops | Manager tier for dispatch; tighter admin ops for queue/provider health endpoints |

### 9.2 Frontend implementation tip for JTS routes

- UI me JTS feature toggle = `role gate` first.
- Optional second gate = permission/effective permissions (if product wants finer visibility).
- Final authority always backend response (`403 INSUFFICIENT_ROLE` / `INSUFFICIENT_PERMISSION`).

