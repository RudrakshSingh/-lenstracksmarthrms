# Frontend Route Permission Integration Final

Last updated: 2026-04-16  
Audience: Frontend developers (Shell + MFEs), QA, backend integrators  
Scope: Route, action, and view permission consumption from auth/permission APIs

---

## 1) Objective

Provide one strict frontend integration contract so all of these remain consistent:

- sidebar menu visibility
- direct route/deep-link access
- in-page capability rendering (buttons/actions)
- view-mode rendering inside same page

This document assumes backend emits effective permissions correctly and frontend must consume them without inference drift.

---

## 2) Permission Families (Must Consume All)

### A) Route Permissions

Purpose: navigation and page-entry gating.

Format:

- `route:/<path>`
- lowercase path only
- no whitespace

Examples:

- `route:/dashboard`
- `route:/employees`
- `route:/attendance`
- `route:/admin/permissions`

### B) Action Permissions

Purpose: business operations inside pages/components.

Examples:

- `read_users`
- `write_users`
- `approve_attendance`
- `manage_expenses`

### C) View Permissions

Purpose: layout or section variants inside same route.

Examples:

- `view:hr_dashboard:summary`
- `view:hr_dashboard:manager`
- `view:hr_dashboard:admin`

---

## 3) Backend Endpoints Frontend Must Use

### Bootstrap (post-login)

- `POST /api/auth/login`
  - consume returned user + initial effective permissions
  - do not assume this snapshot is permanent

### Canonical effective permissions

- `GET /api/permission/user/:id`
  - primary source for current effective permission set
  - use this after login hydration and on permission refresh events

### Catalog metadata

- `GET /api/permission/catalog`
  - for matrix rendering and label display
  - includes `groups` and `flat`

### Admin list screens

- `GET /api/permission/users?includePermissions=true`
  - required if list view needs effective permission chips/count/details
  - without `includePermissions=true`, effective list may be absent

---

## 4) Catalog Consumption Rule (Critical)

Catalog response has two useful structures:

- `data.groups`: grouped permission items (mainly business groups)
- `data.flat`: flattened full list (includes route tokens)

### Frontend Rule

Build route permission matrix from:

1. explicit route group if provided
2. else fallback to `data.flat.filter(code => code.startsWith('route:/'))`

Do not treat missing route entries in `groups` as backend failure if `flat` includes them.

---

## 5) Route Gating Contract

### Sidebar visibility

- use only route permission checks
- do not infer menu visibility from business permissions

### Direct URL / deep-link guards

- apply same route permission logic as sidebar
- if denied, redirect to unauthorized/default page

### Parent-child route behavior

- if permission has parent route (example `route:/admin`), frontend alias matching may allow children (`/admin/users`)
- still prefer explicit child checks where menu nodes are critical for auditing clarity

### Wildcard behavior

- wildcard tokens (`*`, `**`, `ALL`) should be treated as elevated scope only
- never grant wildcard semantics for regular users unless explicitly intended

---

## 6) Action Gating Contract

Action permissions control in-page capabilities:

- show/hide or enable/disable buttons
- gate mutation entry points
- gate row-level operations in tables

Examples:

- `approve_attendance` -> show Approve action
- `write_users` -> show Edit employee action
- `manage_expenses` -> allow expense management operations

Route access alone must never unlock privileged actions.

---

## 7) View Mode Contract

If view tokens exist, use them to select layout variant inside same route.

Example on one route:

- `view:hr_dashboard:summary` -> limited summary view
- `view:hr_dashboard:manager` -> manager-level widgets
- `view:hr_dashboard:admin` -> full admin dashboard sections

If none present:

- apply safe default view
- do not auto-upgrade user to richer view based on action permissions only

---

## 8) State Management and Refresh Strategy

### Recommended flow

1. Login success -> set auth state
2. Immediately fetch canonical effective permissions (`/api/permission/user/:id`)
3. Store permissions in centralized auth/permission store
4. Re-evaluate gates on route change and relevant state updates
5. Refetch on:
   - explicit refresh trigger
   - user switched tenant context (if supported)
   - permission update events (admin changes)

### Anti-pattern to avoid

- relying forever on stale JWT embedded permissions
- mixing permissions from old tenant context in the same store

---

## 9) Normalization Rules (Frontend)

Before evaluating permissions:

- trim each permission string
- deduplicate
- ignore empty/null values
- keep route comparisons case-sensitive to backend contract (lowercase)

For route matching:

- normalize current path to expected format
- avoid accidental mismatch from trailing slash differences

---

## 10) Error and Empty-State Handling

### Permission fetch failure

- show deterministic fallback UI (restricted mode)
- do not render privileged routes/actions optimistically
- surface retriable error message and retry action

### Catalog fetch failure (matrix page)

- show matrix-level error state
- do not guess missing labels/groups

### No permissions returned

- treat as minimal-access user
- route guard should block protected routes

---

## 11) QA Acceptance Matrix

### Scenario A: HR-only manager

Expected routes allowed:

- `route:/dashboard`
- `route:/employees`
- `route:/attendance`
- `route:/payroll`

Expected denied:

- `route:/admin`
- `route:/inventory` (unless explicitly granted)

### Scenario B: Inventory lead

Expected:

- dashboard + inventory-approved routes
- no HR/admin routes unless granted

### Scenario C: Tenant admin

Expected:

- `route:/tenant-admin`
- `route:/admin`
- `route:/admin/permissions`

### Scenario D: Action-vs-route separation

- user can open route but cannot execute restricted actions without action permission

### Scenario E: View variants

- same page renders different sections for `summary/manager/admin` view tokens

---

## 12) Debug Checklist (When Sidebar/Route Mismatch Appears)

1. Inspect `effectivePermissions` from `GET /api/permission/user/:id`
2. Confirm required `route:/...` token exists
3. Verify route guard input path normalization
4. Verify catalog page reads `flat` fallback for routes
5. Verify admin list uses `includePermissions=true` when expecting effective sets
6. Confirm frontend not using stale cached/JWT-only set
7. Re-test with direct URL + sidebar + in-page action checks separately

---

## 13) Security and Correctness Guarantees

- Frontend route permission controls UI navigation only.
- Backend API authorization remains mandatory and independent.
- Tenant context must be respected in all permission calls.
- Do not add frontend-side business-to-route inference as primary logic.

---

## 14) Final Implementation Checklist

### Frontend

- [ ] Sidebar uses route permissions only
- [ ] Deep-link guard uses same route permission resolver
- [ ] Action controls use action permissions
- [ ] View layout uses `view:*` permissions
- [ ] Catalog matrix supports `flat` fallback for route list
- [ ] Effective permissions fetched from canonical endpoint after login
- [ ] Admin list uses `includePermissions=true` when required
- [ ] Restricted fallback UI exists for permission fetch errors

### QA

- [ ] Validate scenarios A/B/C/D/E
- [ ] Validate direct URL deny behavior
- [ ] Validate stale permission refresh behavior
- [ ] Validate per-tenant permission isolation behavior

---

## 15) Notes for Backend-Frontend Sync

- Backend may emit parent + child routes; frontend should handle both safely.
- If route token naming changes, update shared constants and re-run matrix QA.
- Keep route catalog and shell route inventory aligned per release.
