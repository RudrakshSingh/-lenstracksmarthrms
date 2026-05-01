# Etelios Enterprise — Canonical API Contract
**Version:** 1.1 · **Last Updated:** May 1, 2026  
**Base domain:** `https://api.etelios.com`  
**Auth:** `Authorization: Bearer <JWT>` + `X-Tenant-Id: <tenantId>` on every request  
**Correlated tracing:** `X-Request-Id` forwarded by BFF; logged by every service  
**Response envelope:** `{ success: boolean, data?: any, message?: string, code?: string }`

---

## 1. Authentication — `auth-service` (port 3001)

| Method | Path | Description | Auth required |
|---|---|---|---|
| POST | `/api/auth/login` | Email + password login; returns `{ token, refreshToken, user }` | No |
| POST | `/api/auth/refresh` | Exchange refresh token for new JWT | No |
| POST | `/api/auth/logout` | Invalidate refresh token | Yes |
| GET  | `/api/auth/me` | Current user profile + permissions | Yes |
| POST | `/api/auth/change-password` | Change own password | Yes |
| POST | `/api/user/reset-password` | Admin-initiated password reset | Yes + admin role |
| GET  | `/api/permission` | List permission catalog for tenant | Yes + admin |
| PUT  | `/api/permission/:userId` | Update user permissions | Yes + admin |
| GET  | `/api/user` | List real users (admin user management) | Yes + admin |
| POST | `/api/user` | Create user | Yes + admin |
| PUT  | `/api/user/:id` | Update user | Yes + admin |

---

## 2. Tenant & Platform — `tenant-registry-service` + `tenant-management-service`

| Method | Path | Service | Description |
|---|---|---|---|
| GET  | `/api/tenant` | registry | Current tenant info + featureFlags + plan |
| GET  | `/api/tenants` | registry | List all tenants (super admin only) |
| POST | `/api/admin/tenants` | registry | Create new tenant |
| PUT  | `/api/admin/tenants/:id` | registry | Update tenant settings |
| PATCH | `/api/admin/tenants/:id/status` | registry | Activate / suspend / deactivate |
| GET  | `/api/admin/v1/tenants` | management | Platform tenant list (super admin) |
| GET  | `/api/admin/v1/platform` | management | Platform health dashboard |
| POST | `/api/admin/v1/support-grants` | management | Tenant admin creates support access grant |
| DELETE | `/api/admin/v1/support-grants/:id` | management | Revoke support grant |
| GET  | `/api/admin/v1/support-grants` | management | List active support grants for tenant |

**Entitlement endpoint (BFF-facing, served by registry):**
```
GET /api/tenant/entitlements
Response: { plan: 'CORE'|'GROWTH'|'ENTERPRISE', featureFlags: {...}, warehouse: { storeId, role, permissions[] } }
```

---

## 3. HR — `hr-service` (port 3002, ingress prefix `/api/hr`)

| Method | Path | Description |
|---|---|---|
| GET  | `/api/hr/employees` | List employees (paginated, filterable by dept/store/status) |
| POST | `/api/hr/employees` | Create employee |
| GET  | `/api/hr/employees/:id` | Employee detail |
| PUT  | `/api/hr/employees/:id` | Update employee |
| PATCH | `/api/hr/employees/:id/status` | Activate / deactivate |
| GET  | `/api/hr/departments` | List departments |
| POST | `/api/hr/departments` | Create department |
| GET  | `/api/hr/stores` | List stores |
| POST | `/api/hr/stores` | Create store |
| POST | `/api/hr/onboarding` | Start onboarding flow |
| GET  | `/api/hr/leave` | Leave applications (filterable) |
| POST | `/api/hr/leave` | Apply for leave |
| PATCH | `/api/hr/leave/:id/approve` | Approve / reject leave |
| GET  | `/api/hr/leave/balances` | Leave balances for employee |
| GET  | `/api/hr/performance` | Performance reviews |
| GET  | `/api/hr/roster` | Roster list |
| POST | `/api/hr/roster` | Create roster |

---

## 4. Attendance — `attendance-service` (port 3003)

| Method | Path | Description |
|---|---|---|
| POST | `/api/attendance/check-in` | Clock in |
| POST | `/api/attendance/check-out` | Clock out |
| GET  | `/api/attendance/today` | Today's session for current user |
| GET  | `/api/attendance/history` | Attendance history (filterable by employee/date) |
| GET  | `/api/attendance/summary` | Summary stats |
| GET  | `/api/attendance/reports` | Reports (daily/weekly/store/dept) |
| GET  | `/api/geofencing/status` | Geofence check-in status |
| PUT  | `/api/geofencing/settings` | Update geofence settings (admin) |
| GET  | `/api/security/violations` | Location violations list |
| PATCH | `/api/security/violations/:id/resolve` | Resolve violation |

---

## 5. Payroll — `payroll-service` (port 3004)

| Method | Path | Description |
|---|---|---|
| GET  | `/api/payroll-workflow/preview` | Attendance preview before payroll run |
| POST | `/api/payroll-workflow/run` | Initiate payroll run (rate-limited) |
| GET  | `/api/payroll-workflow/runs/:id` | Get run status |
| POST | `/api/payroll-workflow/hr-submit` | HR submits payroll for finance decision |
| POST | `/api/payroll-workflow/finance-decision` | Finance approve / reject |
| POST | `/api/payroll-workflow/freeze` | Freeze payroll cycle (MFA when configured) |
| POST | `/api/payroll-workflow/post-to-finance` | Post payroll to financial ledger |
| GET  | `/api/salary` | Employee salary list |
| POST | `/api/salary` | Create salary record |
| GET  | `/api/payroll/deductions` | Deduction list |
| POST | `/api/payroll/deductions` | Create deduction request |
| GET  | `/api/unified-payroll` | Unified payroll view |

---

## 6. JTS — `jts-service` (port 3018, also `/api/v1/jts`, `/api/jts`)

| Method | Path | Description |
|---|---|---|
| GET  | `/api/v1/tasks` | Task list (filterable by type/status/assignee/priority) |
| POST | `/api/v1/tasks` | Create task |
| GET  | `/api/v1/tasks/:id` | Task detail + comments + subtasks |
| PATCH | `/api/v1/tasks/:id/status` | Update task status |
| POST | `/api/v1/tasks/:id/comments` | Add comment |
| GET  | `/api/v1/timers` | Active timers |
| POST | `/api/v1/timers` | Start timer on task |
| PATCH | `/api/v1/timers/:id/stop` | Stop timer |
| GET  | `/api/v1/notifications` | JTS notifications |
| GET  | `/api/v1/active` | Active tasks for current user |

**JTS Auto-Task Types (created programmatically — not by user):**

| Type | Created when | Assigned to |
|---|---|---|
| `cash-deposit-verification` | Store submits deposit | accountant role |
| `stock-mismatch-investigation` | Audit mismatch detected | store_manager |
| `vendor-return-follow-up` | Inward validation: wrong/damaged | purchase_manager |
| `fine-recovery-payroll-deduction` | Damage fine approved | hr + finance |
| `complaint-review` | Complaint raised | cs_admin |
| `vendor-replacement-overdue` | Replacement pending > 7 days (cron) | purchase_manager |
| `expense-approval` | Expense pending approval | finance |
| `payroll-approval` | Payroll HR-submit stage | finance / superadmin |
| `due-recovery-follow-up` | Customer due past due date (cron) | store_admin |
| `rx-order-follow-up` | RX vendor order no inward after SLA (cron) | purchase_manager |

---

## 7. CRM — `crm-service` (port 3005)

| Method | Path | Description |
|---|---|---|
| GET  | `/api/crm/customers` | Customer list (search by name/phone) |
| POST | `/api/crm/customers` | Create customer |
| GET  | `/api/crm/customers/:id` | Customer profile |
| PUT  | `/api/crm/customers/:id` | Update customer |
| GET  | `/api/crm/customers/:id/orders` | Customer optical order history |
| GET  | `/api/crm/customers/:id/prescriptions` | Prescription history |
| GET  | `/api/crm/customers/:id/dues` | Customer due/udhari history |
| GET  | `/api/crm/complaints` | Complaint list |
| POST | `/api/crm/complaints` | Raise complaint |
| GET  | `/api/crm/complaints/:id` | Complaint detail (order + prescription + product history) |
| PATCH | `/api/crm/complaints/:id/review` | Assign CS rep; status → under-review |
| PATCH | `/api/crm/complaints/:id/decision` | Approve/reject/replace decision; on approve → auto-create replacement OpticalOrder |

---

## 8. Sales & Optical Orders — `sales-service` (port 3005 via ingress `/api/sales`)

### 8A. Optical Orders *(CORE+)*

| Method | Path | Description |
|---|---|---|
| POST | `/api/sales/optical-orders` | Create order; runs stock-check; returns stockStatus per line |
| GET  | `/api/sales/optical-orders` | List; `?storeId=&customerId=&status=&paymentStatus=&dateFrom=&dateTo=` |
| GET  | `/api/sales/optical-orders/:id` | Detail with items + payments + lab order link |
| PATCH | `/api/sales/optical-orders/:id/status` | Advance status (validated transitions only) |
| PATCH | `/api/sales/optical-orders/:id/payment` | Add payment; body: `{ amount, mode, reference }` |
| PATCH | `/api/sales/optical-orders/:id/cancel` | Cancel order; releases stock reservation |
| GET  | `/api/sales/optical-orders/customer/:customerId` | Customer order history |

**Order status transitions:**
```
draft → confirmed → lens-inward → cutting → fitting → qc → packing → dispatched → store-received → delivered
draft → cancelled
confirmed → on-hold → confirmed
qc → cutting (rework)
```

### 8B. Lab Orders *(GROWTH+)*

| Method | Path | Description |
|---|---|---|
| POST  | `/api/sales/lab-orders` | Create lab order (auto-created on optical order status = lens-inward) |
| GET   | `/api/sales/lab-orders` | List; `?stage=&storeId=&technicianId=` |
| GET   | `/api/sales/lab-orders/:id` | Detail with stage history + SLA breach status |
| PATCH | `/api/sales/lab-orders/:id/stage` | Advance stage; auto-checks SLA; creates JTS on breach |
| PATCH | `/api/sales/lab-orders/:id/qc-reject` | QC reject with reason; rework > 2 → JTS escalation |
| GET   | `/api/sales/lab-orders/kanban` | Kanban grouped by stage; `?storeId=` |

### 8C. POS / Generic Sales

| Method | Path | Description |
|---|---|---|
| POST | `/api/sales/pos/sale` | Generic POS sale |
| GET  | `/api/sales/pos/summary` | POS daily summary |
| POST | `/api/sales/discount` | Apply discount |

---

## 9. Inventory — `inventory-service` (port 3010, ingress `/api/inventory`)

### 9A. Lens & CL Masters *(CORE+)*

| Method | Path | Description |
|---|---|---|
| GET   | `/api/inventory/lens-master` | List; `?brand=&visionType=&index=&coating=&page=&limit=` |
| POST  | `/api/inventory/lens-master` | Create |
| GET   | `/api/inventory/lens-master/:id` | Get by id |
| PUT   | `/api/inventory/lens-master/:id` | Full update |
| DELETE | `/api/inventory/lens-master/:id` | Soft delete (isActive: false) |
| GET   | `/api/inventory/lens-master/check-stock` | `?sph=&cyl=&axis=&index=&coating=&storeId=` |
| GET   | `/api/inventory/cl-master` | Contact lens master list |
| POST  | `/api/inventory/cl-master` | Create CL master |
| GET   | `/api/inventory/cl-master/:id` | Get CL master |
| PUT   | `/api/inventory/cl-master/:id` | Update |
| DELETE | `/api/inventory/cl-master/:id` | Soft delete |
| GET   | `/api/inventory/cl-master/check-stock` | `?brand=&power=&cyl=&baseCurve=&modality=&storeId=` |

### 9B. Stock Control *(CORE+)*

| Method | Path | Description |
|---|---|---|
| GET  | `/api/inventory/stock` | Stock list; `?storeId=&productType=&lowStock=` |
| POST | `/api/inventory/stock/reserve` | Reserve stock for an order line (called internally from optical order create) |
| POST | `/api/inventory/stock/release` | Release reserved stock (on order cancel) |
| GET  | `/api/inventory/stock/transfer` | List stock transfers |
| POST | `/api/inventory/stock/transfer` | Initiate stock transfer between stores |

### 9C. Barcode / QR *(GROWTH+)*

| Method | Path | Description |
|---|---|---|
| POST | `/api/inventory/barcode/generate` | Generate barcodes; body: `{ productType, productId, qty }` |
| GET  | `/api/inventory/scan/:code` | Scan lookup; returns product + stock status |
| POST | `/api/inventory/audit/scan` | Audit-mode scan; body: `{ auditSessionId?, code, scannedQty }` |
| GET  | `/api/inventory/barcode/print/:productId` | Returns PDF-ready label sheet |

### 9D. Damage & Breakage *(GROWTH+)*

| Method | Path | Description |
|---|---|---|
| POST  | `/api/inventory/damage` | Create damage entry; stock blocked immediately |
| GET   | `/api/inventory/damage` | List; `?storeId=&reviewStatus=&dateFrom=&dateTo=` |
| GET   | `/api/inventory/damage/:id` | Detail |
| PATCH | `/api/inventory/damage/:id/assign-auditor` | Assign auditor; status → under-review |
| PATCH | `/api/inventory/damage/:id/approve` | Approve; `{ fineDecision, fineAmount, fineAppliedTo }` |
| PATCH | `/api/inventory/damage/:id/reject` | Reject; stock unblocked |
| POST  | `/api/inventory/damage/:id/photo` | Upload evidence photo |
| POST  | `/api/inventory/breakage` | Create breakage entry |
| GET   | `/api/inventory/breakage` | List breakage; `?storeId=&staffId=&type=&dateFrom=&dateTo=` |
| PATCH | `/api/inventory/breakage/:id/approve` | Approve; writes off stock + flags finance |
| PATCH | `/api/inventory/breakage/:id/reject` | Reject; stock unblocked |

### 9E. Audit System *(ENTERPRISE)*

| Method | Path | Description |
|---|---|---|
| POST  | `/api/inventory/audits` | Create audit session |
| GET   | `/api/inventory/audits` | List sessions |
| GET   | `/api/inventory/audits/:sessionId` | Session detail |
| POST  | `/api/inventory/audits/:sessionId/scan` | Record scan; auto-calculates mismatch |
| GET   | `/api/inventory/audits/:sessionId/mismatches` | List mismatches for session |
| POST  | `/api/inventory/audits/:sessionId/complete` | Mark scan complete; triggers JTS auto-task per mismatch |
| POST  | `/api/inventory/stock-corrections` | Propose stock correction (read-only until approved) |
| PATCH | `/api/inventory/stock-corrections/:id/approve` | Apply correction; manager-gated |
| PATCH | `/api/inventory/stock-corrections/:id/reject` | Reject correction |

### 9F. Dead Stock *(ENTERPRISE)*

| Method | Path | Description |
|---|---|---|
| GET  | `/api/inventory/dead-stock` | Dead stock report; `?storeId=&type=&minDays=` |
| POST | `/api/inventory/dead-stock/:id/clearance` | Flag for clearance sale |
| GET  | `/api/inventory/dead-stock/transfer-suggestions` | Store A dead + Store B zero qty → suggest transfer |

---

## 10. Purchase / Vendor — `purchase-service`

### 10A. Vendor RX Orders *(GROWTH+)*

| Method | Path | Description |
|---|---|---|
| POST  | `/api/purchase/rx-orders/aggregate` | Aggregate open PendingRXRequirements → create VendorRXOrder per vendor |
| GET   | `/api/purchase/rx-orders` | List; `?vendorId=&status=&storeId=` |
| GET   | `/api/purchase/rx-orders/:id` | Detail with linked requirement orders |
| PATCH | `/api/purchase/rx-orders/:id/send` | Mark as sent to vendor |
| PATCH | `/api/purchase/rx-orders/:id/acknowledge` | Vendor acknowledged; set expectedDelivery |

### 10B. Inward Validation *(GROWTH+)*

| Method | Path | Description |
|---|---|---|
| POST  | `/api/purchase/inward` | Create inward entry; accepted → LensStock updated; rejected → VendorReturn auto-created |
| GET   | `/api/purchase/inward` | List inward entries |
| GET   | `/api/purchase/inward/:id` | Detail |
| PATCH | `/api/purchase/inward/:id/item/:idx/photo` | Upload validation photo |

### 10C. Vendor Returns & Scorecard *(GROWTH+)*

| Method | Path | Description |
|---|---|---|
| GET   | `/api/purchase/vendor-returns` | List |
| GET   | `/api/purchase/vendor-returns/:id` | Detail |
| PATCH | `/api/purchase/vendor-returns/:id/status` | Update status (return-required → returned → replacement-pending → replacement-received) |
| GET   | `/api/purchase/vendor-score` | All vendor scores for current period |
| GET   | `/api/purchase/vendor-score/:vendorId` | Vendor scorecard with monthly trend |

---

## 11. Financial — `financial-service`

### 11A. Core Finance *(CORE+)*

| Method | Path | Description |
|---|---|---|
| POST | `/api/financial/expenses` | Create expense record |
| GET  | `/api/financial/expenses` | List; `?storeId=&category=&dateFrom=&dateTo=` |
| PATCH | `/api/financial/expenses/:id/approve` | Approve expense; auto-creates JTS if pending |
| GET  | `/api/financial/ledger` | Ledger entries |
| POST | `/api/financial/ledger` | Create ledger entry |
| GET  | `/api/financial/pl` | Basic P&L by period |
| POST | `/api/financial/payroll/posting` | Post payroll to ledger (idempotent) |

### 11B. Cash Deposit Verification *(ENTERPRISE)*

| Method | Path | Description |
|---|---|---|
| POST  | `/api/financial/deposits` | Submit deposit; auto-creates JTS task for accountant |
| GET   | `/api/financial/deposits` | List; `?storeId=&status=&dateFrom=&dateTo=` |
| GET   | `/api/financial/deposits/:id` | Detail |
| PATCH | `/api/financial/deposits/:id/verify` | Verify; creates finance ledger entry |
| PATCH | `/api/financial/deposits/:id/reject` | Reject with reason |
| PATCH | `/api/financial/deposits/:id/discrepancy` | Flag discrepancy; creates follow-up JTS |
| GET   | `/api/financial/deposits/reconciliation` | Monthly reconciliation; `?storeId=&month=` |

### 11C. Customer Due / Udhari *(ENTERPRISE)*

| Method | Path | Description |
|---|---|---|
| POST  | `/api/financial/customer-due` | Create due record (auto-called from optical order partial payment) |
| GET   | `/api/financial/customer-due` | List; `?customerId=&storeId=&status=&overdue=` |
| GET   | `/api/financial/customer-due/:id` | Detail with reminder log |
| PATCH | `/api/financial/customer-due/:id/collect` | Record payment; updates dueAmount + recoveryStatus |
| POST  | `/api/financial/customer-due/:id/reminder` | Log reminder (channel, outcome) |
| PATCH | `/api/financial/customer-due/:id/write-off` | Write off; superadmin-gated |
| GET   | `/api/financial/customer-due/aging` | Aging buckets (0–30/30–60/60–90/90+); `?storeId=` |

### 11D. GST Engine *(ENTERPRISE)*

| Method | Path | Description |
|---|---|---|
| POST  | `/api/financial/gstin` | Create GSTIN record |
| GET   | `/api/financial/gstin` | List GSTINs; `?storeId=` (returns GSTIN for store) |
| PUT   | `/api/financial/gstin/:id` | Update |
| PATCH | `/api/financial/gstin/:id/stores` | Assign/unassign stores to GSTIN |
| POST  | `/api/financial/gst-categories` | Create category GST + HSN |
| GET   | `/api/financial/gst-categories` | List; `?category=` |
| PUT   | `/api/financial/gst-categories/:id` | Update |
| POST  | `/api/financial/stock-transfer-invoice` | Generate interstate transfer invoice with IGST |
| GET   | `/api/financial/reports/gst-liability` | GST liability; `?tenantId=&month=` |
| GET   | `/api/financial/reports/pl` | P&L view; `?tenantId=&month=` |

---

## 12. Analytics — `analytics-service`

| Method | Path | Plan | Description |
|---|---|---|---|
| GET | `/api/analytics/sales/daily` | CORE+ | `?storeId=&date=` |
| GET | `/api/analytics/sales/stores` | GROWTH+ | `?tenantId=&dateFrom=&dateTo=` |
| GET | `/api/analytics/sales/categories` | GROWTH+ | `?storeId=&dateFrom=&dateTo=` |
| GET | `/api/analytics/sales/payment-modes` | GROWTH+ | `?storeId=&dateFrom=&dateTo=` |
| GET | `/api/analytics/inventory/lens-power-stock` | GROWTH+ | `?storeId=&brand=&index=` |
| GET | `/api/analytics/inventory/cl-stock` | GROWTH+ | `?storeId=&brand=&modality=` |
| GET | `/api/analytics/inventory/dead-stock` | ENTERPRISE | `?storeId=` |
| GET | `/api/analytics/inventory/audit-mismatches` | ENTERPRISE | `?storeId=&month=` |
| GET | `/api/analytics/inventory/damage` | GROWTH+ | `?storeId=&dateFrom=&dateTo=` |
| GET | `/api/analytics/vendor/scorecard` | GROWTH+ | All vendors for period |
| GET | `/api/analytics/vendor/return-pending` | GROWTH+ | Returns pending > N days |
| GET | `/api/analytics/lab/pending` | GROWTH+ | `?storeId=` |
| GET | `/api/analytics/lab/delay` | GROWTH+ | `?storeId=&dateFrom=&dateTo=` |
| GET | `/api/analytics/lab/qc-rejections` | GROWTH+ | `?storeId=&dateFrom=&dateTo=` |
| GET | `/api/analytics/lab/breakage-value` | GROWTH+ | `?storeId=&dateFrom=&dateTo=` |
| GET | `/api/analytics/hr/attendance-payroll` | ENTERPRISE | `?storeId=&month=` |
| GET | `/api/analytics/jts/productivity` | ENTERPRISE | `?storeId=&month=` |

All analytics endpoints support `?export=csv` for CSV download.

---

## 13. Notifications — `notification-service`

| Method | Path | Description |
|---|---|---|
| GET  | `/api/notification` | Notification list for current user |
| POST | `/api/notification/mark-read` | Mark notifications read |
| POST | `/api/notification/send` | Send notification (internal service-to-service) |

---

## 14. Error Codes Reference

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body / query param failed validation |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Valid JWT but insufficient role/permission |
| 403 | `SUPERADMIN_ISOLATION_BLOCKED` | Super admin tried to access tenant business data without grant |
| 403 | `SUPPORT_ACCESS_REQUIRED` | Support grant missing or expired |
| 403 | `PLAN_GATE_BLOCKED` | Feature not available on tenant's current plan |
| 404 | `NOT_FOUND` | Resource does not exist for this tenant |
| 409 | `DUPLICATE` | Unique constraint violation (e.g. lens master already exists for this spec) |
| 422 | `INVALID_TRANSITION` | Attempted an invalid status transition (e.g. delivered → fitting) |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error; `X-Request-Id` in response for tracing |

---

## 15. Common Headers

| Header | Direction | Description |
|---|---|---|
| `Authorization: Bearer <JWT>` | Request | Required on all authenticated endpoints |
| `X-Tenant-Id: <tenantId>` | Request | Required on all authenticated endpoints; injected by BFF |
| `X-Request-Id: <uuid>` | Request + Response | Correlated tracing; generated at BFF, forwarded downstream |
| `X-Plan: CORE\|GROWTH\|ENTERPRISE` | Response | Added by gateway; indicates tenant plan for client-side gating |

---

*Source of truth: this file + individual service Swagger annotations. Updated when a new endpoint is added or deprecated.*  
*Kong routes: see `microservices/api-gateway/kong.yml`*  
*Ingress: see `INGRESS_SOURCE_OF_TRUTH.md`*
