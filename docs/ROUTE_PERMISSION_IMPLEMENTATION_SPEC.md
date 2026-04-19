# Route Permission Implementation Spec

Last updated: 2026-04-15  
Audience: Frontend + Backend developers  
Applies to: Shell (`localhost:3000`) and connected MFEs (HRMS/CRM/Sales/Inventory/Financial/Admin)

---

## 0) Backend implementation status (this repo)

Implemented in auth-service effective permission resolution:

- `route:/...` tokens are first-class and included in `ALL_PERMISSION_CODES` (catalog version bumped).
- `view:...` tokens are accepted by validation even if not listed in the matrix catalog.
- Effective permissions returned on login/refresh now **append compiled route + view tokens** via:
  - `microservices/shared/utils/shellRoutePermissions.js`
  - `microservices/auth-service/src/utils/effectivePermissions.js`

Note: route tokens unlock **UI navigation** only; service APIs must still enforce authorization.

---

## 1) Goal

Define one shared contract so all of these work consistently from permissions:

1. Sidebar visibility (which modules/menus are visible)
2. Route access (direct URL open allowed/blocked)
3. In-page capabilities (buttons/actions)
4. View mode inside same page (summary/manager/admin layout)

If backend emits only business permissions (`read_users`, `write_reports`) and not route permissions, sidebar and routing become inconsistent.

---

## 2) Permission model (must use all 3)

### A. Route permissions (navigation + page entry)

Format:

- `route:/<path>`
- lowercase path
- no trailing spaces/dots

Examples:

- `route:/dashboard`
- `route:/employees`
- `route:/attendance`
- `route:/admin/permissions`

### B. Action permissions (business operations)

Examples:

- `read_users`, `write_users`, `approve_attendance`, `manage_expenses`

### C. View permissions (optional but recommended)

Use to control which layout/sections show inside same route.

Examples:

- `view:hr_dashboard:summary`
- `view:hr_dashboard:manager`
- `view:hr_dashboard:admin`
- `view:inventory:minimal`
- `view:inventory:full`

---

## 3) How frontend currently decides sidebar visibility

Shell route gate is route-first:

1. wildcard (`*`, `**`, `ALL`) => allow all
2. check `route:/...` aliases for current path
3. tenant-admin fallback hints:
   - `route:/tenant-admin`
   - `route:/admin`
   - `view_admin_dashboard`
   - `view_tenant_admin`
   - `manage_permission_matrix`
   - `admin_settings`

Important:

- Catalog codes like `read_users`, `write_assets`, `view_sales_data` do not automatically unlock sidebar links.
- Backend must emit explicit `route:/...` for reliable nav.

---

## 4) Shell route inventory (what backend must know)

Below are core routes used by Shell menus. Backend should emit matching `route:/...` as applicable.

### Core

- `route:/dashboard`
- `route:/tenant-admin`
- `route:/store-dashboard`
- `route:/store-management`
- `route:/store-details`
- `route:/documents`
- `route:/notifications`

### HRMS module (shell links)

- `route:/` (HR dashboard entry for HRMS MFE)
- `route:/employees`
- `route:/stores`
- `route:/attendance`
- `route:/geofencing`
- `route:/payroll`
- `route:/payroll/deductions/manage`
- `route:/payslips`
- `route:/performance`
- `route:/recruitment`
- `route:/training`
- `route:/benefits`
- `route:/compliance`

### Sales module (shell links)

- `route:/orders`
- `route:/customers`
- `route:/products`
- `route:/pos`
- `route:/reports`

### Admin routes (shell-origin)

- `route:/admin`
- `route:/admin/permissions`
- `route:/admin/super-admin`
- `route:/admin/tenants/new`
- `route:/admin/tenants/analytics`
- `route:/admin/users`
- `route:/admin/users/roles`
- `route:/admin/users/permissions`
- `route:/admin/system/general`
- `route:/admin/system/security`
- `route:/admin/system/integrations`
- `route:/admin/system/backups`
- `route:/admin/billing/invoices`
- `route:/admin/billing/payments`
- `route:/admin/billing/plans`
- `route:/admin/calendar`
- `route:/admin/help/documentation`
- `route:/admin/help/tickets`
- `route:/admin/help/faq`

### Monitoring/Analytics routes

- `route:/analytics/dashboard`
- `route:/analytics/reports`
- `route:/analytics/insights`
- `route:/monitoring/dashboard`
- `route:/monitoring/alerts`
- `route:/monitoring/logs`

Note:

- If backend emits parent route only (e.g. `route:/admin`), frontend alias check also allows descendants like `/admin/users`.
- Prefer emitting both parent and critical child routes for clarity and auditability.

---

## 5) Backend emission contract (mandatory)

For every effective permission payload (login + refresh + user-state):

- include route codes (`route:/...`)
- include action codes (`read_...`, `manage_...`)
- optionally include view codes (`view:...`)

### Required endpoints to include effective permissions

- `POST /api/auth/login` response user permissions
- token refresh endpoint response (if user payload included)
- `GET /api/permission/user/:id` effective state
- optionally `GET /api/permission/users?includePermissions=true` (admin matrix views)

---

## 6) Suggested backend mapping logic

Create one canonical compiler:

`effectivePermissions = compile(rolePermissions, groupPermissions, userOverrides, tenantPolicy)`

Then append route permissions from policy map:

`routePermissions = resolveRoutePermissions(effectivePermissions, role, tenantContext)`

Final emitted list:

`finalPermissions = unique([...effectivePermissions, ...routePermissions])`

Do this only on backend. Frontend should consume, not infer.

---

## 7) Sample payload (recommended)

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "u_admin_1",
      "email": "admin@lenstrack.com",
      "role": "admin",
      "tenantId": "lenstrack",
      "permissions": [
        "read_users",
        "write_users",
        "manage_permission_matrix",
        "view_dashboard",
        "route:/dashboard",
        "route:/tenant-admin",
        "route:/admin",
        "route:/admin/permissions",
        "route:/employees",
        "route:/attendance",
        "view:hr_dashboard:admin"
      ]
    }
  }
}
```

---

## 8) Use-case scenarios (QA acceptance)

### Scenario A: HR-only manager

Expected emitted route permissions:

- `route:/dashboard`
- `route:/employees`
- `route:/attendance`
- `route:/payroll`

Expected not emitted:

- `route:/inventory`
- `route:/admin`

### Scenario B: Inventory lead

Expected emitted route permissions:

- `route:/dashboard`
- inventory-specific routes (as per product decision)

Expected not emitted:

- HR/admin-only routes unless explicitly granted

### Scenario C: Tenant admin

Expected emitted route permissions:

- `route:/tenant-admin`
- `route:/admin`
- `route:/admin/permissions`

And relevant module routes as per tenant policy.

---

## 9) Security and correctness rules

- Never grant wildcard outside intended super-admin scope
- Always enforce tenant match (`X-Tenant-Id` vs token tenant)
- Route permission grants UI navigation only; backend APIs must still enforce authorization
- Avoid frontend-side hardcoded mapping from business permissions to routes as primary behavior

---

## 10) Rollout plan

1. Backend adds route-permission compiler + payload emission
2. Backend shares test users with expected permission snapshots
3. Frontend verifies sidebar + deep-link + action visibility for each snapshot
4. QA signs off using scenarios A/B/C

---

## 11) Quick checklist

### Backend

- [ ] Emit `route:/...` for all navigable pages
- [ ] Emit action permissions for in-page operations
- [ ] Emit optional `view:*` permissions for layout variants
- [ ] Keep permissions stable across login + user-state APIs

### Frontend

- [ ] Sidebar uses route permissions only (already implemented)
- [ ] Page/action gates use action permissions
- [ ] Optional view variants consume `view:*`
- [ ] No hard dependency on JWT embedded permissions only

---

## 12) Frontend integration deep dive (minute detail)

This section is the canonical frontend behavior guide. Follow this exactly to avoid sidebar/route/action drift.

### 12.1 Data sources and priority order

Frontend may receive permissions from multiple places. Always apply this priority:

1. `GET /api/permission/user/:id` (canonical effective set)
2. login payload `data.user.permissions` (bootstrap only)
3. cached previous session state (fallback only, short-lived)

Rule:

- If canonical endpoint succeeds, overwrite all previously cached permission arrays.
- Do not merge old cache with canonical response unless explicitly required by product logic.

### 12.2 Permission store shape (recommended)

Maintain a normalized store object:

- `effectivePermissions: string[]`
- `routePermissions: string[]` (derived by prefix filter `route:/`)
- `actionPermissions: string[]` (everything not `route:/` and not `view:`)
- `viewPermissions: string[]` (prefix `view:`)
- `loadedAt: timestamp`
- `source: "login" | "user-endpoint" | "refresh"`

Why:

- avoids repeated expensive parsing across components
- keeps gating deterministic and testable

### 12.3 Normalization rules before any gate

Before storing/evaluating:

- coerce non-string values safely to string only if unavoidable
- trim whitespace
- remove empty strings
- deduplicate with set
- preserve case-sensitive exact token values (especially route/view prefixes)

Avoid:

- lowercasing all action permissions blindly (could break future namespaced permissions)

### 12.4 Route path normalization rules

When checking current path against permission:

- remove querystring and hash
- normalize trailing slash (except root `/`)
- keep lowercase path for comparison if your route system is case-insensitive
- ensure path is compared in `route:/...` format

Example:

- URL `/admin/users?tab=roles#x` -> compare with `route:/admin/users`

### 12.5 Sidebar visibility algorithm

For each menu item:

1. build candidate aliases (if any)
2. check wildcard
3. check exact route token
4. optionally check parent route allowance rules
5. if denied, hide menu item

Important:

- no fallback from `read_*` to route visibility
- no module-wide default allow unless explicitly in product requirement

### 12.6 Deep-link guard algorithm

On route enter:

1. if permission state not loaded -> show loading/skeleton (do not allow by default)
2. once loaded -> evaluate route permission
3. if denied -> redirect unauthorized/landing page
4. log guard decision in debug mode (path + missing token)

This prevents unauthorized flicker where restricted page briefly appears.

### 12.7 In-page action gating algorithm

Each action component should receive `can(<actionToken>)` and optionally `whyDenied`.

Behavior options:

- hide action entirely (security-sensitive operations)
- disable action with tooltip (discoverability-friendly operations)

Never bind in-page actions directly to route permission checks.

### 12.8 View permission rendering strategy

For pages supporting multiple layouts:

- evaluate explicit `view:*` tokens first
- if multiple view tokens exist, define deterministic precedence (e.g. admin > manager > summary)
- if no view token exists, use safest minimal layout

Document page-level view policy to avoid team-by-team divergence.

### 12.9 Catalog screen rendering behavior

Catalog endpoint can expose:

- grouped list via `groups`
- flattened list via `flat`

Frontend matrix must:

- render business categories from `groups`
- render route codes from either:
  - dedicated route group, or
  - fallback filter from `flat` (`startsWith('route:/')`)

This prevents false "missing route catalog" reports.

### 12.10 Admin user list with permission chips

When permissions are shown in admin user list:

- call `GET /api/permission/users?includePermissions=true`
- if omitted, do not assume effective permission list exists
- display explicit indicator when list is not requested (for debugging)

### 12.11 Refresh and invalidation events

Refetch effective permissions when:

- login success
- token refresh success (if payload/user context changes)
- permission override update success
- role change detected
- tenant switch detected

Optional:

- periodic soft-refresh for long-running sessions

### 12.12 Error behavior and safe fallbacks

If canonical permission fetch fails:

- keep app in restricted mode
- hide privileged menus and actions
- show retry action
- avoid permissive fallback

If catalog fetch fails:

- keep matrix page unavailable
- show explicit error state

### 12.13 Telemetry and debug logs (recommended)

Log non-sensitive permission diagnostics:

- permission source used (login/canonical/cache)
- route denied events (path + missing token)
- count of route/action/view tokens
- stale cache age

This significantly reduces triage time in frontend-backend integration bugs.

---

## 13) Edge-case matrix (small but critical points)

### 13.1 Parent-only route grant

If user has `route:/admin` but not explicit child:

- sidebar may still show child links if alias rules allow descendants
- for strict deployments, require explicit child token checks

Choose one behavior globally; do not mix by page.

### 13.2 Wildcard leakage risk

If wildcard appears accidentally on non-admin users:

- every route becomes visible/open

Mitigation:

- frontend should still record suspicious wildcard usage in debug logs
- backend should restrict wildcard issuance by role policy

### 13.3 Mixed stale + fresh permission sets

Common bug:

- sidebar using old cached permissions
- route guard using fresh permissions

Result:

- menu visible but direct route blocked (or opposite)

Fix:

- single source permission store shared by all gates

### 13.4 Path alias mismatch

If shell route is `/attendance` but MFE resolves `/hr/attendance`, mapping may break.

Fix:

- maintain explicit alias table for route guard
- ensure alias table is versioned and reviewed with backend route inventory

### 13.5 Optional view permission missing

No `view:*` token should not break page.

Fallback:

- render minimal safe view, not blank screen

### 13.6 Hidden action but callable API

Even if frontend hides action button, user may call API externally.

Rule:

- backend must enforce authorization independently

---

## 14) QA execution plan (expanded)

### 14.1 Test layers

- Unit tests: permission parsing + gate helpers
- Integration tests: route guard + menu rendering with mocked permission payloads
- E2E tests: login -> sidebar -> deep-link -> action visibility across roles

### 14.2 Mandatory role snapshots

Prepare fixed users:

- `hr_manager`
- `inventory_lead`
- `tenant_admin`
- `finance_accountant`
- `employee_basic`

Each snapshot should include expected:

- visible menus
- allowed routes
- denied routes
- enabled actions
- view mode

### 14.3 Regression checks after backend updates

Whenever backend route inventory changes:

- rerun route snapshot tests
- compare added/removed route tokens
- verify parent-child route policy still consistent

### 14.4 Sign-off criteria

QA sign-off only when all pass:

- sidebar visibility matches expected snapshot
- deep-link blocks unauthorized routes reliably
- action controls follow action permissions only
- view variants respect `view:*`
- no mismatch between login and canonical user endpoint after refresh

---

## 15) Troubleshooting playbook (frontend + backend handoff)

When user reports "route not visible" or "route denied unexpectedly":

1. capture current path and user role
2. inspect canonical effective permissions from `/api/permission/user/:id`
3. verify token presence (`route:/target`)
4. verify frontend path normalization output
5. verify route alias config
6. verify menu gate and route guard are using same store snapshot
7. verify no stale cache
8. verify backend payload at login vs user endpoint for drift

If route token absent in canonical payload:

- issue is backend mapping/emission/policy

If token present but route blocked:

- issue is frontend guard logic/normalization/aliasing

---

## 16) Release readiness checklist (detailed)

### Backend readiness

- [ ] Route compiler emits required `route:/...` tokens for each role/profile
- [ ] Effective payload is stable across login, refresh, user endpoint
- [ ] Tenant scope validated in permission endpoints
- [ ] Wildcard issuance restricted to intended privileged roles

### Frontend readiness

- [ ] Single centralized permission store used by sidebar + guard + action gates
- [ ] Canonical endpoint refresh integrated post-login
- [ ] Catalog route list uses `groups` + `flat` fallback logic
- [ ] Deep-link guard denies unauthorized routes without flicker
- [ ] Minimal-safe fallback behavior implemented for permission fetch failure

### QA readiness

- [ ] Snapshot fixtures prepared for all required roles
- [ ] E2E permission scenarios automated or documented manual script available
- [ ] Regression checklist attached to release ticket

---

## 17) Reference docs

- Main spec (this file): `docs/ROUTE_PERMISSION_IMPLEMENTATION_SPEC.md`
- Frontend-only deep implementation companion: `docs/FRONTEND_ROUTE_PERMISSION_INTEGRATION_FINAL.md`
