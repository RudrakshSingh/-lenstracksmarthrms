# JTS Service — Complete API catalog (by function, RBAC, and path mirrors)

**Service:** `jts-service` (Etelios Jobs / Task System)  
**Generated from codebase:** `microservices/jts-service/src/createApp.js` and route modules (authoritative).  
**Last reviewed:** 2026-03-29  

This document is aimed at **frontend developers**: **§4** explains **API segregation** (URL namespaces, product domains, trust boundaries, RBAC tiers, and how to split clients). **§5** groups endpoints by **product function** with **who may call** each (JWT role / internal token). **§3** lists **path mirrors** (ALB `/jts` vs `/api/...`).

**Automated contracts (request/response):** From `microservices/jts-service`, run **`npm run contract-verify`** — asserts all **369** catalog URLs return the **exact JSON error envelope** when called **without** `Authorization` (401 `AUTH_REQUIRED`), **health** bodies (200), and **internal** routes with token disabled (503 `JTS_INTERNAL_DISABLED`). Run **`npm run contract-export`** to write `scripts/generated/jts-endpoint-contracts.export.json` with **sample request bodies**, **required headers**, and **documented response shapes** (without-auth exact; with-auth typical notes — full success paths need MongoDB + valid JWT + data).

---

## Table of contents

1. [How authentication and tenancy work](#1-how-authentication-and-tenancy-work)  
2. [Role and permission model (middleware)](#2-role-and-permission-model-middleware)  
3. [Path mirrors — one router, many base URLs](#3-path-mirrors--one-router-many-base-urls)  
4. [API segregation](#4-api-segregation--namespaces-trust-zones-and-how-to-split-clients)  
5. [Functional areas (summary tables)](#5-functional-areas-summary-tables)  
   - [5.1 Health](#51-health-no-auth)  
   - [5.2 Internal (service-to-service)](#52-internal-service-to-service)  
   - [5.3 HRMS compatibility shortcuts](#53-hrms-compatibility-shortcuts)  
   - [5.4 Self tasks](#54-self-tasks)  
   - [5.5 Task collaboration](#55-task-collaboration-comments-attachments-approvals-reviews-quality)  
   - [5.6 Task timers](#56-task-timers)  
   - [5.7 Core tasks (CRUD, lifecycle, SLA, subtasks)](#57-core-tasks-crud-lifecycle-sla-subtasks)  
   - [5.8 Catalog & tenant administration](#58-catalog--tenant-administration)  
   - [5.9 Recurrence rules](#59-recurrence-rules)  
   - [5.10 Performance management](#510-performance-management)  
   - [5.11 Notifications](#511-notifications)  
6. [Service-level access rules (beyond Express RBAC)](#6-service-level-access-rules-beyond-express-rbac)  
7. [Endpoint count (all mirrors)](#7-endpoint-count-all-mirrors)  
8. [Quick role → “can use these screens” matrix](#8-quick-role--can-use-these-screens-matrix)  
9. [Appendix A — File map](#appendix-a--file-map-for-engineers)  
10. [Appendix B — Catalog paths (one mirror)](#appendix-b--explicit-catalog-path-list-one-mirror-each)  
11. [Appendix C — Exhaustive 369 URLs](#appendix-c--exhaustive-url-list-369-rows)  

---

## 1. How authentication and tenancy work

### 1.1 User JWT (normal browser / mobile clients)

- **Header:** `Authorization: Bearer <access_token>`  
- **Tenant:** Resolved from JWT (`tid` / `tenant_id` / `tenantId`).  
- **Optional header:** `X-Tenant-Id` — if sent, it **must match** the tenant embedded in the token (or the resolved ObjectId when the token carries a slug). Mismatch → `403` `JTS_TENANT_HEADER_MISMATCH`.  
- **Missing / invalid tenant in token** → `403` `JTS_TENANT_REQUIRED`.  

Implementation: `src/middleware/auth.middleware.js` → `authenticate`, `enforceTenantIsolation`.

### 1.2 JWT payload fields (expected)

The service maps claims roughly as:

| Claim (any of) | Maps to `req.user` |
|----------------|-------------------|
| `sub`, `userId`, `id` | `id` |
| `tid`, `tenant_id`, `tenantId` | `tenant_id` |
| `oid`, `org_node_id` | `org_node_id` |
| `rol`, `role` | `role` |
| `perms`, `permissions` | `permissions` |
| `employee_id`, `employeeId` | `employee_id` |
| `email` | `email` |

### 1.3 Internal calls (no end-user JWT)

- **Mount:** `/api/jts/internal/...` and `/jts/internal/...`  
- **Auth:** `X-JTS-Internal-Token` must equal env `JTS_INTERNAL_SERVICE_TOKEN` (min length 8).  
- **Tenant:** `X-Tenant-Id` = **24-char hex** Mongo tenant ObjectId.  
- **Synthetic user:** `role: TENANT_ADMIN` for downstream checks.  

Implementation: `src/middleware/internalServiceAuth.middleware.js`.

### 1.4 Rate limiting

Routers mounted with `express-rate-limit` (**1000 requests / 15 minutes / IP**) for most JSON APIs (see `createApp.js`). `/health` is outside that stack.

### 1.5 `TEST_MODE`

If `TEST_MODE=true`, auth is bypassed with a fake user and RBAC may allow all — **never enable in production**.

---

## 2. Role and permission model (middleware)

### 2.1 `requireRole(allowedRoles, allowedPermissions)`

File: `src/middleware/rbac.middleware.js`.

- If **no** `req.user` → `401` `AUTH_REQUIRED`.  
- **Bypass (full access to the route):** `SUPERADMIN`, `ADMIN`, `TENANT_ADMIN` — these roles skip both role list and permission list checks.  
- Otherwise the user’s `role` must be in `allowedRoles` (case-insensitive).  
- If `allowedPermissions` is non-empty, at least one permission in JWT must match (not used on most JTS routes today).  

### 2.2 Named role sets used in JTS

**Manager ladder (task create, reassign, update, delete, notification dispatch, recurrence):**

`MANAGER`, `STORE_MANAGER`, `CLUSTER_MANAGER`, `COUNTRY_OPS`, `TENANT_ADMIN`, `HOD`  

(Again: `SUPERADMIN` / `ADMIN` / `TENANT_ADMIN` bypass anyway.)

**Catalog read (`readRoles` in `jtsAdmin.routes.js`):**

`MANAGER`, `STORE_MANAGER`, `CLUSTER_MANAGER`, `COUNTRY_OPS`, `TENANT_ADMIN`, `HOD`, `SUPERADMIN`, `ADMIN`

**Catalog write (`writeRoles`):**

`TENANT_ADMIN`, `COUNTRY_OPS`, `HOD`, `CLUSTER_MANAGER`, `SUPERADMIN`, `ADMIN`

**Tenant document create/update (platform isolation):**

`SUPERADMIN`, `ADMIN` only (`tenantCreateRoles`)

**Performance read:** same as catalog `readRoles`.  
**Performance write:** same as `writeRoles`.

**Notifications:**

- `POST /dispatch` — manager ladder (same as task create).  
- `POST /process-queues`, `GET /providers/health`, `POST /test-email` — `TENANT_ADMIN`, `COUNTRY_OPS` (plus bypass roles).

### 2.3 Routes with **authenticate only** (no `requireRole`)

Any **authenticated** user whose JWT resolves to a valid tenant may call these, subject to **service-level** checks (see §6):

- Most **task reads and lifecycle** endpoints (except explicit `requireRole` on create / update / delete / reassign).  
- **Self-task** create.  
- **Collaboration** routes (comments, attachments, reviews, approvals, quality) — but collaboration service enforces task access.  
- **Timer** routes.  
- **Compat** HRMS routes.  
- **Notification** inbox / read / preferences (except admin endpoints).  

**Important:** `EMPLOYEE` (or any role not in manager ladder) can still hit many task GET/POST routes; product should not assume “only managers see tasks” at the HTTP layer alone.

---

## 3. Path mirrors — one router, many base URLs

Express mounts the **same** router files multiple times. Frontend may use **any** of the bases below for the same relative path.

| Mount group | Base paths (all equivalent for that router) |
|-------------|-----------------------------------------------|
| **Task stack** (tasks + collaboration + timer ordering) | `{base}/api/jts/tasks`, `{base}/api/v1/tasks`, `{base}/jts/tasks` |
| **Self-task nested** | `.../tasks/self` on each of the three bases above → e.g. `POST /api/v1/tasks/self` |
| **Timer** | `{base}/api/jts`, `{base}/api/v1`, `{base}/jts` — timer paths **include** `/tasks/:id/timer/...` |
| **HRMS compat** | `/api/jts`, `/jts` |
| **Catalog** | `/api/v1/jts/catalog`, `/api/jts/catalog`, `/jts/catalog` |
| **Recurrence** | `/api/v1/jts/recurrence-rules`, `/api/jts/recurrence-rules`, `/jts/recurrence-rules` |
| **Performance** | `/api/v1/jts/performance`, `/api/jts/performance`, `/jts/performance` |
| **Internal** | `/api/jts/internal`, `/jts/internal` |
| **Notifications** | `/api/v1/notifications` **only** (no `/jts` mirror in `createApp.js`) |

**Recommended for new frontend work**

- **Ingress / public API:** `https://<host>/jts/...` (ALB strip or prefix as deployed).  
- **Gateway-style:** `/api/v1/...` for versioned calls.  

---

## 4. API segregation — namespaces, trust zones, and how to split clients

JTS does **not** expose one flat `/api` tree. **Segregation** is intentional at four levels: **URL namespace**, **router bundle (product domain)**, **authentication mechanism**, and **RBAC tier**. Use this when you split **micro-frontends**, **OpenAPI SDKs**, or **BFF modules**.

### 4.1 By URL namespace (which prefix the browser or gateway uses)

| Namespace | Typical deployment | What lives here (same code, different mount) |
|-----------|-------------------|---------------------------------------------|
| **`/jts/...`** | ALB / ingress path dedicated to **jts-service** | Compat routes, **task stack** (`/jts/tasks/...`), **timers** (`/jts/tasks/:id/timer/...`, `/jts/active`), **catalog** (`/jts/catalog/...`), **recurrence**, **performance**, **internal** |
| **`/api/jts/...`** | Same as `/jts` but under an `/api` convention | Mirrors the above (tasks, catalog, compat, internal, etc.) |
| **`/api/v1/...`** | Versioned, gateway-friendly surface | **`/api/v1/tasks/...`** (tasks + collaboration + self), timers under **`/api/v1/tasks/:id/timer/...`**, **`/api/v1/jts/catalog/...`**, **`/api/v1/jts/recurrence-rules/...`**, **`/api/v1/jts/performance/...`**, plus **`/api/v1/notifications/...`** |

**Critical outlier — notifications:** In `createApp.js`, notification routes mount **only** at **`/api/v1/notifications`**. There is **no** `/jts/notifications` mirror. Segregate your **notification HTTP client** from your **`/jts` task client** (different base URL or explicit proxy).

### 4.2 By product domain (recommended frontend / MFE boundaries)

| Module | Owns (conceptually) | Call these paths (pick **one** mirror per environment) |
|--------|-------------------|--------------------------------------------------------|
| **Task execution** | CRUD, lifecycle, SLA, summaries, subtasks, self-task aliases | `{origin}/jts/tasks/...` or `{origin}/api/v1/tasks/...` |
| **Collaboration** | Comments, attachments, presign, reviews, approvals, quality | Same base as tasks — paths like `.../approvals/pending/me`, `.../:taskId/comments`, etc. |
| **Timers** | Work timers | `.../tasks/:id/timer/...`, `GET .../active`, `GET .../timers/active` on the **timer** mount (`/jts`, `/api/jts`, `/api/v1`) |
| **HRMS compat** | Shortcuts without extra `/tasks` segment where defined | `/jts/self-tasks`, `/jts/tasks/my`, `/jts/tenant/current`, `/jts/approvals/...`, `/jts/analytics`, `/jts/reviews` (also under `/api/jts/...`) |
| **Admin / catalog** | Tenants, org, employees, task types, SLA, escalation, policies, shifts, reporting, attendance mirror, logs | `{origin}/jts/catalog/...` or `{origin}/api/v1/jts/catalog/...` |
| **Recurrence** | Recurring task rules | `{origin}/jts/recurrence-rules/...` or `{origin}/api/v1/jts/recurrence-rules/...` |
| **Performance** | Metrics, scores, formal reviews, goals, alerts | `{origin}/jts/performance/...` or `{origin}/api/v1/jts/performance/...` |
| **Notifications** | Inbox, read state, preferences, dispatch | **`{origin}/api/v1/notifications/...` only** |
| **Internal (backend-only)** | Service-to-service analytics | `/jts/internal/...` or `/api/jts/internal/...` — **not** for end-user browsers; lock by network + secret |

### 4.3 By trust boundary (auth mechanism)

| Zone | Auth | Intended caller |
|------|------|-----------------|
| **Public** | None | Health checks only (`/health`, `/api/v1/health`) |
| **Standard user** | `Authorization: Bearer` + valid tenant | HRMS / employee / manager flows |
| **Elevated routes** | Same JWT; **stricter** `requireRole` on specific paths | Catalog write, parts of performance, notification ops, tenant create |
| **Internal** | `X-JTS-Internal-Token` + `X-Tenant-Id` | Other microservices, jobs — see §1.3 |

### 4.4 By RBAC tier (coarse permission segregation)

| Tier | Roles (summary) | Typical API areas |
|------|-----------------|-------------------|
| **A — Bypass / full tenant admin** | `SUPERADMIN`, `ADMIN`, `TENANT_ADMIN` | Passes most `requireRole` gates (see §2.1) |
| **B — Manager ladder** | `MANAGER`, `STORE_MANAGER`, `CLUSTER_MANAGER`, `COUNTRY_OPS`, `HOD` (+ Tier A) | Create/reassign/update/delete tasks, recurrence CRUD, `POST .../notifications/dispatch` |
| **C — Catalog read** | `readRoles` in §2.2 | `GET` catalog, list employees/org/types, etc. |
| **D — Catalog / performance write** | `writeRoles` in §2.2 | Mutations on catalog, performance reviews/alerts writes |
| **E — Authenticated, route not role-gated** | Any valid JWT | Many task + collaboration endpoints; **row-level** rules still apply (§6) |

### 4.5 Rules of thumb for API segregation in codebases

1. **One base URL per deployed client** where possible (e.g. production MFE uses only `https://api.example.com/jts` **or** only `.../api/v1`) to avoid duplicate caching and CORS configs.  
2. **Split SDKs or `fetch` wrappers** along §4.2 module lines — at minimum **tasks+collab+timer**, **catalog**, **recurrence**, **performance**, **notifications**, **internal**.  
3. **Never** assume notifications live under `/jts`; always use `/api/v1/notifications` unless your gateway rewrites paths explicitly.

---

## 5. Functional areas (summary tables)

Legend:

- **Auth:** `JWT` = Bearer user token; `Internal` = internal token + `X-Tenant-Id`; `None` = public.  
- **RBAC:** role gate on the route; `—` = authenticate only (or public).  

### 5.1 Health (no auth)

| Method | Path | Auth | RBAC | Purpose |
|--------|------|------|------|---------|
| GET | `/health` | None | — | Liveness JSON |
| GET | `/api/v1/health` | None | — | Same, versioned path |

---

### 5.2 Internal (service-to-service)

| Method | Path (relative to mount) | Auth | RBAC | Purpose |
|--------|---------------------------|------|------|---------|
| GET | `/tenant-analytics` | Internal | Synthetic `TENANT_ADMIN` | Analytics for tenant (compat controller) |

Full paths: `/api/jts/internal/tenant-analytics`, `/jts/internal/tenant-analytics`.

---

### 5.3 HRMS compatibility shortcuts

**Router:** `hrmsJtsCompat.routes.js` — **JWT**, no `requireRole` on these routes.

| Method | Relative path | Purpose |
|--------|-----------------|---------|
| POST | `/self-tasks` | Create self-task (same as main self-task flow) |
| GET | `/self-tasks/my` | My tasks (paged) |
| GET | `/tasks/my` | Alias of my tasks |
| GET | `/tenant/current` | Current tenant info |
| GET | `/approvals/pending` | Pending approvals for approver |
| POST | `/approvals/:approvalId/approve` | Approve |
| POST | `/approvals/:approvalId/reject` | Reject (body needs `reason`) |
| GET | `/analytics` | Dashboard-style analytics |
| GET | `/reviews` | List performance reviews (compat) |

Mirrors: prefix with `/api/jts` **or** `/jts`.

---

### 5.4 Self tasks

**Router:** `selfTask.routes.js` mounted at `{tasksBase}/self`.

| Method | Relative path | Auth | RBAC | Purpose |
|--------|---------------|------|------|---------|
| POST | `/` | JWT | — | Create self-task (employee) |

**Duplicate entry point:** `POST {tasksBase}/self-tasks` on `task.routes.js` (same schema/controller intent).

---

### 5.5 Task collaboration (comments, attachments, approvals, reviews, quality)

**Router:** `taskCollaboration.routes.js` mounted at `{tasksBase}` **before** `task.routes.js`.

| Method | Relative path | Auth | RBAC | Purpose |
|--------|---------------|------|------|---------|
| GET | `/approvals/pending/me` | JWT | — | My pending approvals |
| PATCH | `/approvals/:approvalId` | JWT | — | Approve / reject approval |
| GET | `/:taskId/reviews` | JWT | — | List task reviews |
| POST | `/:taskId/reviews` | JWT | — | Create / submit review |
| GET | `/:taskId/comments` | JWT | — | List comments |
| POST | `/:taskId/comments` | JWT | — | Add comment |
| GET | `/:taskId/attachments` | JWT | — | List attachments |
| POST | `/:taskId/attachments/presign-upload` | JWT | — | Presign upload |
| GET | `/:taskId/attachments/:attachmentId/presign-download` | JWT | — | Presign download |
| POST | `/:taskId/attachments` | JWT | — | Register attachment metadata |
| GET | `/:taskId/quality` | JWT | — | List quality ratings |
| PUT | `/:taskId/quality` | JWT | — | Upsert quality rating |
| GET | `/:taskId/approvals` | JWT | — | List approvals for task |
| POST | `/:taskId/approvals` | JWT | — | Request approval |

**Note:** `approver_employee_id` in collaboration body validation is still **24-char hex** in Joi today — may need alignment with `employeeRefSchema` in a future change.

---

### 5.6 Task timers

**Router:** `timer.routes.js` on `/api/jts`, `/api/v1`, `/jts`.

| Method | Path pattern | Auth | RBAC |
|--------|--------------|------|------|
| POST | `/tasks/:id/timer/start` | JWT | — |
| POST | `/tasks/:id/timer/stop` | JWT | — |
| POST | `/tasks/:id/timer/pause` | JWT | — |
| GET | `/tasks/:id/timer` | JWT | — |
| GET | `/tasks/:id/timer/sessions` | JWT | — |
| GET | `/active` | JWT | — |
| GET | `/timers/active` | JWT | — (alias) |

`:id` must be **24-char hex** task id (Joi in timer routes).

---

### 5.7 Core tasks (CRUD, lifecycle, SLA, subtasks)

**Router:** `task.routes.js` at `{tasksBase}`; **subtasks** `subtask.routes.js` at `{tasksBase}/:id/subtasks`.

| Method | Relative path | RBAC (route) | Notes |
|--------|----------------|--------------|-------|
| POST | `/self-tasks` | — | Self-task create (alias) |
| POST | `/` | Manager ladder | Create manager task |
| GET | `/` | — | List tasks (filters) |
| GET | `/sla/alerts` | — | SLA warning / breach style list |
| GET | `/workday/:workdayId` | — | Tasks for workday |
| GET | `/summary/me` | — | My summary |
| GET | `/summary/:employeeId` | — | Summary for employee ref |
| GET | `/:id/sla` | — | SLA detail |
| GET | `/:id/subtasks/` | — | List subtasks |
| POST | `/:id/subtasks/` | — | Create subtask |
| PATCH | `/:id/subtasks/:subtaskId/status` | — | Subtask status |
| GET | `/:id/activities` | — | Activity + history |
| POST | `/:id/start` | — | Start work |
| POST | `/:id/submit-review` | — | Submit for review |
| POST | `/:id/reopen` | — | Reopen |
| POST | `/:id/cancel` | — | Cancel |
| POST | `/:id/block` | — | Block |
| POST | `/:id/unblock` | — | Unblock |
| POST | `/:id/reassign` | Manager ladder | Reassign assignee |
| PUT | `/:id` | Manager ladder | Update task |
| DELETE | `/:id` | Manager ladder | Soft-delete |
| POST | `/:id/complete` | — | Complete |
| POST | `/:id/accept` | — | Accept assignment |
| POST | `/:id/reject` | — | Reject assignment |
| POST | `/:id/rate` | — | Rate task |
| PATCH | `/:id/status` | — | Change status (validated transition) |
| GET | `/:id` | — | Get one task |

Employee reference fields on create/update use **`employeeRefSchema`** (code, email, ObjectId string, or numeric JSON) and are resolved in the controller.

---

### 5.8 Catalog & tenant administration

**Router:** `jtsAdmin.routes.js` — all routes **JWT** + `requireRole` as below.

#### Tenants

| Method | Path | RBAC |
|--------|------|------|
| GET | `/tenants` | readRoles |
| GET | `/tenant/current` | readRoles |
| POST | `/tenants` | SUPERADMIN, ADMIN |
| PATCH | `/tenants/:id` | SUPERADMIN, ADMIN |

#### Org nodes

| Method | Path | RBAC |
|--------|------|------|
| GET | `/org-nodes` | readRoles |
| POST | `/org-nodes` | writeRoles |
| PATCH | `/org-nodes/:id` | writeRoles |
| DELETE | `/org-nodes/:id` | writeRoles |

#### Employees

| Method | Path | RBAC |
|--------|------|------|
| GET | `/employees` | readRoles |
| POST | `/employees` | writeRoles |
| POST | `/employees/bind-from-jwt` | readRoles |
| PATCH | `/employees/:id/align-auth-code` | writeRoles |
| PUT | `/employees/:id/auth-user-link` | writeRoles |
| PATCH | `/employees/:id` | writeRoles |
| DELETE | `/employees/:id` | writeRoles |

#### Employee roles (JTS role assignments)

| Method | Path | RBAC |
|--------|------|------|
| GET | `/employee-roles` | readRoles |
| POST | `/employee-roles` | writeRoles |
| DELETE | `/employee-roles/:employeeId?role=` | writeRoles |

#### Task types

| Method | Path | RBAC |
|--------|------|------|
| GET | `/task-types` | readRoles |
| POST | `/task-types` | writeRoles |
| PATCH | `/task-types/:id` | writeRoles |
| DELETE | `/task-types/:id` | writeRoles |

#### SLA rules

| Method | Path | RBAC |
|--------|------|------|
| GET | `/sla-rules` | readRoles |
| PUT | `/sla-rules` | writeRoles |
| DELETE | `/sla-rules/:id` | writeRoles |

#### Escalation rules

| Method | Path | RBAC |
|--------|------|------|
| GET | `/escalation-rules` | readRoles |
| POST | `/escalation-rules` | writeRoles |
| PATCH | `/escalation-rules/:id` | writeRoles |
| DELETE | `/escalation-rules/:id` | writeRoles |

#### Self-task policies

| Method | Path | RBAC |
|--------|------|------|
| GET | `/self-task-policies` | readRoles |
| PUT | `/self-task-policies` | writeRoles |
| DELETE | `/self-task-policies/:id` | writeRoles |

#### Shift schedules

| Method | Path | RBAC |
|--------|------|------|
| GET | `/shift-schedules` | readRoles |
| POST | `/shift-schedules` | writeRoles |
| DELETE | `/shift-schedules/:id` | writeRoles |

#### Reporting relationships

| Method | Path | RBAC |
|--------|------|------|
| GET | `/reporting-relationships` | readRoles |
| PUT | `/reporting-relationships` | writeRoles |
| DELETE | `/reporting-relationships/:id` | writeRoles |

#### Attendance mirror (JTS copy)

| Method | Path | RBAC |
|--------|------|------|
| GET | `/attendance-records` | readRoles |
| PUT | `/attendance-records` | writeRoles |
| POST | `/attendance-records/open-session` | writeRoles |
| POST | `/attendance-records/close-session` | writeRoles |

#### Audit / data-access logs

| Method | Path | RBAC |
|--------|------|------|
| GET | `/audit-logs` | writeRoles |
| GET | `/data-access-logs` | writeRoles |
| POST | `/data-access-logs` | readRoles |

---

### 5.9 Recurrence rules

**Router:** `recurrence.routes.js` — **JWT** + **manager ladder** on the router (`router.use(requireRole(...))`).

| Method | Relative path | Purpose |
|--------|---------------|---------|
| GET | `/` | List (optional `active` query) |
| POST | `/` | Create rule |
| GET | `/:id` | Get by id |
| PATCH | `/:id` | Update |
| DELETE | `/:id` | Delete |

---

### 5.10 Performance management

**Router:** `performanceManagement.routes.js` — per-route `requireRole`.

| Method | Path | RBAC |
|--------|------|------|
| GET | `/metrics` | readRoles |
| GET | `/scores` | readRoles |
| POST | `/calculate-daily` | writeRoles |
| GET | `/reviews` | readRoles |
| POST | `/reviews` | writeRoles |
| PATCH | `/reviews/:id` | writeRoles |
| DELETE | `/reviews/:id` | writeRoles |
| POST | `/reviews/:reviewId/goals` | writeRoles |
| GET | `/reviews/:reviewId/goals` | readRoles |
| POST | `/reviews/:reviewId/acknowledge` | readRoles |
| GET | `/alerts` | readRoles |
| POST | `/alerts` | writeRoles |
| PATCH | `/alerts/:id/resolve` | writeRoles |

---

### 5.11 Notifications

**Router:** `notification.routes.js` on **`/api/v1/notifications` only**.

| Method | Path | RBAC |
|--------|------|------|
| GET | `/` | — |
| GET | `/health` | — |
| GET | `/me` | — |
| PATCH | `/:id/read` | — |
| PATCH | `/me/read-all` | — |
| GET | `/preferences/me` | — |
| PUT | `/preferences/me` | — |
| POST | `/dispatch` | Manager ladder |
| POST | `/process-queues` | TENANT_ADMIN, COUNTRY_OPS (+ bypass) |
| GET | `/providers/health` | TENANT_ADMIN, COUNTRY_OPS (+ bypass) |
| POST | `/test-email` | TENANT_ADMIN, COUNTRY_OPS (+ bypass) |

---

## 6. Service-level access rules (beyond Express RBAC)

These matter for **frontend UX** (“why 403 from collaboration?”) even when the route has no `requireRole`:

1. **Task collaboration** (`taskCollaboration.service.js`):  
   - If role is **not** in the privileged list (`TENANT_ADMIN`, `COUNTRY_OPS`, `SUPERADMIN`, `ADMIN`, `HOD`, `CLUSTER_MANAGER`, `MANAGER`, `STORE_MANAGER`), the user must be **assignee or creator** of the task.  
   - Otherwise → `JTS_TASK_ACCESS_DENIED`.

2. **Core task GET by id** (`task.service.js` `getTaskById`): returns any non-deleted task in the **tenant** if you know the id — **no assignee check** at service layer today. Treat task ids as sensitive; enforce UI visibility in the app if required.

3. **Actor resolution** (`resolveEmployeeId`): several flows require the JWT to map to a JTS `Employee` row → `JTS_ACTOR_EMPLOYEE_NOT_RESOLVED` if missing.

4. **Internal API**: do not expose on public ingress without network policy; uses shared secret.

---

## 7. Endpoint count (all mirrors)

Each **HTTP method + path** that Express registers is listed once per mount prefix. Totals:

| Segment | Routes (logical) | × mirrors | URL rows |
|---------|------------------|-----------|----------|
| Health | 2 | 1 | **2** |
| Internal | 1 | 2 | **2** |
| HRMS compat | 9 | 2 | **18** |
| Self-task (`…/tasks/self`) | 1 | 3 | **3** |
| Task collaboration | 14 | 3 | **42** |
| Core tasks + subtasks | 27 | 3 | **81** |
| Timers | 7 | 3 | **21** |
| Catalog (`jtsAdmin`) | 45 | 3 | **135** |
| Recurrence | 5 | 3 | **15** |
| Performance | 13 | 3 | **39** |
| Notifications | 11 | 1 | **11** |
| **Total** | — | — | **369** |

There are **369** distinct **method + path** registrations (after counting each mount prefix separately). **Logical** REST operations are fewer; mirrors exist so the same feature works behind `/api/v1/...`, `/api/jts/...`, and `/jts/...` where noted in §3.

**Appendix C** is the **full 369-row** table (`#`, `Method`, `` `path` ``). Use §5 for **RBAC + behaviour** per functional area; use §4 for **how APIs are segregated** by path, domain, and trust.

---

## 8. Quick role → “can use these screens” matrix

| Capability | EMPLOYEE (typical) | Manager ladder | Catalog write | SUPERADMIN / ADMIN |
|------------|-------------------|----------------|---------------|---------------------|
| View own inbox / notifs | ✓ | ✓ | ✓ | ✓ |
| Dispatch notifications | ✗ | ✓ | ✓ (bypass) | ✓ |
| Process notification queues / test email | ✗ | ✗ | TENANT_ADMIN, COUNTRY_OPS | ✓ |
| Create **manager** task | ✗ | ✓ | ✓ (bypass) | ✓ |
| Update / delete / reassign task | ✗ | ✓ | ✓ (bypass) | ✓ |
| Self-task create | ✓ | ✓ | ✓ | ✓ |
| Task comments / attachments (on own task) | ✓ (if assignee/creator) | ✓ | ✓ | ✓ |
| Collaboration on others’ tasks | ✗* | ✓* | ✓* | ✓ |
| Recurrence CRUD | ✗ | ✓ | ✓ (bypass) | ✓ |
| Read catalog (org, employees, types) | ✓ | ✓ | ✓ | ✓ |
| Write catalog | ✗ | ✗** | ✓ | ✓ |
| Create / patch **tenant** row | ✗ | ✗ | ✗ | ✓ (SUPERADMIN/ADMIN only) |
| Performance reviews / alerts (read) | ✓ | ✓ | ✓ | ✓ |
| Performance write (create review, resolve alert) | ✗ | ✗** | ✓ | ✓ |

\* Subject to collaboration **assignee/creator** rule unless privileged.  
\** `CLUSTER_MANAGER` is in `writeRoles` for catalog + performance write.

---

## Appendix A — File map (for engineers)

| Area | Route module |
|------|----------------|
| App assembly | `src/createApp.js` |
| Tasks | `src/routes/task.routes.js` |
| Subtasks | `src/routes/subtask.routes.js` |
| Collaboration | `src/routes/taskCollaboration.routes.js` |
| Self-task | `src/routes/selfTask.routes.js` |
| Timers | `src/routes/timer.routes.js` |
| Compat | `src/routes/hrmsJtsCompat.routes.js` |
| Catalog | `src/routes/jtsAdmin.routes.js` |
| Recurrence | `src/routes/recurrence.routes.js` |
| Performance | `src/routes/performanceManagement.routes.js` |
| Notifications | `src/routes/notification.routes.js` |
| Internal | `src/routes/internalJts.routes.js` |
| Auth | `src/middleware/auth.middleware.js` |
| RBAC | `src/middleware/rbac.middleware.js` |
| Employee ref Joi | `src/validation/employeeRefSchema.js` |
| Endpoint manifest (369) | `scripts/lib/jtsEndpointManifest.js` |
| Response contract notes | `scripts/lib/jtsResponseContracts.js` |
| Contract verifier CLI | `scripts/jts-contract-verify.js` |

---

## Appendix B — Explicit catalog path list (one mirror each)

The following paths are repeated under **`/api/v1/jts/catalog`**, **`/api/jts/catalog`**, and **`/jts/catalog`** (same method + RBAC). Listed once:

- `GET /tenants`  
- `GET /tenant/current`  
- `POST /tenants` (SUPERADMIN, ADMIN)  
- `PATCH /tenants/:id` (SUPERADMIN, ADMIN)  
- `GET /org-nodes`  
- `POST /org-nodes`  
- `PATCH /org-nodes/:id`  
- `DELETE /org-nodes/:id`  
- `GET /employees`  
- `POST /employees`  
- `POST /employees/bind-from-jwt`  
- `PATCH /employees/:id/align-auth-code`  
- `PUT /employees/:id/auth-user-link`  
- `PATCH /employees/:id`  
- `DELETE /employees/:id`  
- `GET /employee-roles`  
- `POST /employee-roles`  
- `DELETE /employee-roles/:employeeId`  
- `GET /task-types`  
- `POST /task-types`  
- `PATCH /task-types/:id`  
- `DELETE /task-types/:id`  
- `GET /sla-rules`  
- `PUT /sla-rules`  
- `DELETE /sla-rules/:id`  
- `GET /escalation-rules`  
- `POST /escalation-rules`  
- `PATCH /escalation-rules/:id`  
- `DELETE /escalation-rules/:id`  
- `GET /self-task-policies`  
- `PUT /self-task-policies`  
- `DELETE /self-task-policies/:id`  
- `GET /shift-schedules`  
- `POST /shift-schedules`  
- `DELETE /shift-schedules/:id`  
- `GET /reporting-relationships`  
- `PUT /reporting-relationships`  
- `DELETE /reporting-relationships/:id`  
- `GET /attendance-records`  
- `PUT /attendance-records`  
- `POST /attendance-records/open-session`  
- `POST /attendance-records/close-session`  
- `GET /audit-logs`  
- `GET /data-access-logs`  
- `POST /data-access-logs`  

**45** catalog route definitions × **3** mirrors = **135** catalog URLs (see Appendix C).

---
## Appendix C — Exhaustive URL list (369 rows)

Every **method + path** that Express registers for JTS (including all mirrors). Path parameters shown as `:name`.

| # | Method | Full path |
|---|--------|-----------|
| 1 | GET | `/health` |
| 2 | GET | `/api/v1/health` |
| 3 | GET | `/api/jts/internal/tenant-analytics` |
| 4 | GET | `/jts/internal/tenant-analytics` |
| 5 | POST | `/api/jts/self-tasks` |
| 6 | GET | `/api/jts/self-tasks/my` |
| 7 | GET | `/api/jts/tasks/my` |
| 8 | GET | `/api/jts/tenant/current` |
| 9 | GET | `/api/jts/approvals/pending` |
| 10 | POST | `/api/jts/approvals/:approvalId/approve` |
| 11 | POST | `/api/jts/approvals/:approvalId/reject` |
| 12 | GET | `/api/jts/analytics` |
| 13 | GET | `/api/jts/reviews` |
| 14 | POST | `/jts/self-tasks` |
| 15 | GET | `/jts/self-tasks/my` |
| 16 | GET | `/jts/tasks/my` |
| 17 | GET | `/jts/tenant/current` |
| 18 | GET | `/jts/approvals/pending` |
| 19 | POST | `/jts/approvals/:approvalId/approve` |
| 20 | POST | `/jts/approvals/:approvalId/reject` |
| 21 | GET | `/jts/analytics` |
| 22 | GET | `/jts/reviews` |
| 23 | POST | `/api/jts/tasks/self` |
| 24 | POST | `/api/v1/tasks/self` |
| 25 | POST | `/jts/tasks/self` |
| 26 | GET | `/api/jts/tasks/approvals/pending/me` |
| 27 | PATCH | `/api/jts/tasks/approvals/:approvalId` |
| 28 | GET | `/api/jts/tasks/:taskId/reviews` |
| 29 | POST | `/api/jts/tasks/:taskId/reviews` |
| 30 | GET | `/api/jts/tasks/:taskId/comments` |
| 31 | POST | `/api/jts/tasks/:taskId/comments` |
| 32 | GET | `/api/jts/tasks/:taskId/attachments` |
| 33 | POST | `/api/jts/tasks/:taskId/attachments/presign-upload` |
| 34 | GET | `/api/jts/tasks/:taskId/attachments/:attachmentId/presign-download` |
| 35 | POST | `/api/jts/tasks/:taskId/attachments` |
| 36 | GET | `/api/jts/tasks/:taskId/quality` |
| 37 | PUT | `/api/jts/tasks/:taskId/quality` |
| 38 | GET | `/api/jts/tasks/:taskId/approvals` |
| 39 | POST | `/api/jts/tasks/:taskId/approvals` |
| 40 | GET | `/api/v1/tasks/approvals/pending/me` |
| 41 | PATCH | `/api/v1/tasks/approvals/:approvalId` |
| 42 | GET | `/api/v1/tasks/:taskId/reviews` |
| 43 | POST | `/api/v1/tasks/:taskId/reviews` |
| 44 | GET | `/api/v1/tasks/:taskId/comments` |
| 45 | POST | `/api/v1/tasks/:taskId/comments` |
| 46 | GET | `/api/v1/tasks/:taskId/attachments` |
| 47 | POST | `/api/v1/tasks/:taskId/attachments/presign-upload` |
| 48 | GET | `/api/v1/tasks/:taskId/attachments/:attachmentId/presign-download` |
| 49 | POST | `/api/v1/tasks/:taskId/attachments` |
| 50 | GET | `/api/v1/tasks/:taskId/quality` |
| 51 | PUT | `/api/v1/tasks/:taskId/quality` |
| 52 | GET | `/api/v1/tasks/:taskId/approvals` |
| 53 | POST | `/api/v1/tasks/:taskId/approvals` |
| 54 | GET | `/jts/tasks/approvals/pending/me` |
| 55 | PATCH | `/jts/tasks/approvals/:approvalId` |
| 56 | GET | `/jts/tasks/:taskId/reviews` |
| 57 | POST | `/jts/tasks/:taskId/reviews` |
| 58 | GET | `/jts/tasks/:taskId/comments` |
| 59 | POST | `/jts/tasks/:taskId/comments` |
| 60 | GET | `/jts/tasks/:taskId/attachments` |
| 61 | POST | `/jts/tasks/:taskId/attachments/presign-upload` |
| 62 | GET | `/jts/tasks/:taskId/attachments/:attachmentId/presign-download` |
| 63 | POST | `/jts/tasks/:taskId/attachments` |
| 64 | GET | `/jts/tasks/:taskId/quality` |
| 65 | PUT | `/jts/tasks/:taskId/quality` |
| 66 | GET | `/jts/tasks/:taskId/approvals` |
| 67 | POST | `/jts/tasks/:taskId/approvals` |
| 68 | POST | `/api/jts/tasks/self-tasks` |
| 69 | POST | `/api/jts/tasks/` |
| 70 | GET | `/api/jts/tasks/` |
| 71 | GET | `/api/jts/tasks/sla/alerts` |
| 72 | GET | `/api/jts/tasks/workday/:workdayId` |
| 73 | GET | `/api/jts/tasks/summary/me` |
| 74 | GET | `/api/jts/tasks/summary/:employeeId` |
| 75 | GET | `/api/jts/tasks/:id/sla` |
| 76 | GET | `/api/jts/tasks/:id/subtasks` |
| 77 | POST | `/api/jts/tasks/:id/subtasks` |
| 78 | PATCH | `/api/jts/tasks/:id/subtasks/:subtaskId/status` |
| 79 | GET | `/api/jts/tasks/:id/activities` |
| 80 | POST | `/api/jts/tasks/:id/start` |
| 81 | POST | `/api/jts/tasks/:id/submit-review` |
| 82 | POST | `/api/jts/tasks/:id/reopen` |
| 83 | POST | `/api/jts/tasks/:id/cancel` |
| 84 | POST | `/api/jts/tasks/:id/block` |
| 85 | POST | `/api/jts/tasks/:id/unblock` |
| 86 | POST | `/api/jts/tasks/:id/reassign` |
| 87 | PUT | `/api/jts/tasks/:id` |
| 88 | DELETE | `/api/jts/tasks/:id` |
| 89 | POST | `/api/jts/tasks/:id/complete` |
| 90 | POST | `/api/jts/tasks/:id/accept` |
| 91 | POST | `/api/jts/tasks/:id/reject` |
| 92 | POST | `/api/jts/tasks/:id/rate` |
| 93 | PATCH | `/api/jts/tasks/:id/status` |
| 94 | GET | `/api/jts/tasks/:id` |
| 95 | POST | `/api/v1/tasks/self-tasks` |
| 96 | POST | `/api/v1/tasks/` |
| 97 | GET | `/api/v1/tasks/` |
| 98 | GET | `/api/v1/tasks/sla/alerts` |
| 99 | GET | `/api/v1/tasks/workday/:workdayId` |
| 100 | GET | `/api/v1/tasks/summary/me` |
| 101 | GET | `/api/v1/tasks/summary/:employeeId` |
| 102 | GET | `/api/v1/tasks/:id/sla` |
| 103 | GET | `/api/v1/tasks/:id/subtasks` |
| 104 | POST | `/api/v1/tasks/:id/subtasks` |
| 105 | PATCH | `/api/v1/tasks/:id/subtasks/:subtaskId/status` |
| 106 | GET | `/api/v1/tasks/:id/activities` |
| 107 | POST | `/api/v1/tasks/:id/start` |
| 108 | POST | `/api/v1/tasks/:id/submit-review` |
| 109 | POST | `/api/v1/tasks/:id/reopen` |
| 110 | POST | `/api/v1/tasks/:id/cancel` |
| 111 | POST | `/api/v1/tasks/:id/block` |
| 112 | POST | `/api/v1/tasks/:id/unblock` |
| 113 | POST | `/api/v1/tasks/:id/reassign` |
| 114 | PUT | `/api/v1/tasks/:id` |
| 115 | DELETE | `/api/v1/tasks/:id` |
| 116 | POST | `/api/v1/tasks/:id/complete` |
| 117 | POST | `/api/v1/tasks/:id/accept` |
| 118 | POST | `/api/v1/tasks/:id/reject` |
| 119 | POST | `/api/v1/tasks/:id/rate` |
| 120 | PATCH | `/api/v1/tasks/:id/status` |
| 121 | GET | `/api/v1/tasks/:id` |
| 122 | POST | `/jts/tasks/self-tasks` |
| 123 | POST | `/jts/tasks/` |
| 124 | GET | `/jts/tasks/` |
| 125 | GET | `/jts/tasks/sla/alerts` |
| 126 | GET | `/jts/tasks/workday/:workdayId` |
| 127 | GET | `/jts/tasks/summary/me` |
| 128 | GET | `/jts/tasks/summary/:employeeId` |
| 129 | GET | `/jts/tasks/:id/sla` |
| 130 | GET | `/jts/tasks/:id/subtasks` |
| 131 | POST | `/jts/tasks/:id/subtasks` |
| 132 | PATCH | `/jts/tasks/:id/subtasks/:subtaskId/status` |
| 133 | GET | `/jts/tasks/:id/activities` |
| 134 | POST | `/jts/tasks/:id/start` |
| 135 | POST | `/jts/tasks/:id/submit-review` |
| 136 | POST | `/jts/tasks/:id/reopen` |
| 137 | POST | `/jts/tasks/:id/cancel` |
| 138 | POST | `/jts/tasks/:id/block` |
| 139 | POST | `/jts/tasks/:id/unblock` |
| 140 | POST | `/jts/tasks/:id/reassign` |
| 141 | PUT | `/jts/tasks/:id` |
| 142 | DELETE | `/jts/tasks/:id` |
| 143 | POST | `/jts/tasks/:id/complete` |
| 144 | POST | `/jts/tasks/:id/accept` |
| 145 | POST | `/jts/tasks/:id/reject` |
| 146 | POST | `/jts/tasks/:id/rate` |
| 147 | PATCH | `/jts/tasks/:id/status` |
| 148 | GET | `/jts/tasks/:id` |
| 149 | POST | `/api/jts/tasks/:id/timer/start` |
| 150 | POST | `/api/jts/tasks/:id/timer/stop` |
| 151 | POST | `/api/jts/tasks/:id/timer/pause` |
| 152 | GET | `/api/jts/tasks/:id/timer` |
| 153 | GET | `/api/jts/tasks/:id/timer/sessions` |
| 154 | GET | `/api/jts/active` |
| 155 | GET | `/api/jts/timers/active` |
| 156 | POST | `/api/v1/tasks/:id/timer/start` |
| 157 | POST | `/api/v1/tasks/:id/timer/stop` |
| 158 | POST | `/api/v1/tasks/:id/timer/pause` |
| 159 | GET | `/api/v1/tasks/:id/timer` |
| 160 | GET | `/api/v1/tasks/:id/timer/sessions` |
| 161 | GET | `/api/v1/active` |
| 162 | GET | `/api/v1/timers/active` |
| 163 | POST | `/jts/tasks/:id/timer/start` |
| 164 | POST | `/jts/tasks/:id/timer/stop` |
| 165 | POST | `/jts/tasks/:id/timer/pause` |
| 166 | GET | `/jts/tasks/:id/timer` |
| 167 | GET | `/jts/tasks/:id/timer/sessions` |
| 168 | GET | `/jts/active` |
| 169 | GET | `/jts/timers/active` |
| 170 | GET | `/api/v1/jts/catalog/tenants` |
| 171 | GET | `/api/v1/jts/catalog/tenant/current` |
| 172 | POST | `/api/v1/jts/catalog/tenants` |
| 173 | PATCH | `/api/v1/jts/catalog/tenants/:id` |
| 174 | GET | `/api/v1/jts/catalog/org-nodes` |
| 175 | POST | `/api/v1/jts/catalog/org-nodes` |
| 176 | PATCH | `/api/v1/jts/catalog/org-nodes/:id` |
| 177 | DELETE | `/api/v1/jts/catalog/org-nodes/:id` |
| 178 | GET | `/api/v1/jts/catalog/employees` |
| 179 | POST | `/api/v1/jts/catalog/employees` |
| 180 | POST | `/api/v1/jts/catalog/employees/bind-from-jwt` |
| 181 | PATCH | `/api/v1/jts/catalog/employees/:id/align-auth-code` |
| 182 | PUT | `/api/v1/jts/catalog/employees/:id/auth-user-link` |
| 183 | PATCH | `/api/v1/jts/catalog/employees/:id` |
| 184 | DELETE | `/api/v1/jts/catalog/employees/:id` |
| 185 | GET | `/api/v1/jts/catalog/employee-roles` |
| 186 | POST | `/api/v1/jts/catalog/employee-roles` |
| 187 | DELETE | `/api/v1/jts/catalog/employee-roles/:employeeId` |
| 188 | GET | `/api/v1/jts/catalog/task-types` |
| 189 | POST | `/api/v1/jts/catalog/task-types` |
| 190 | PATCH | `/api/v1/jts/catalog/task-types/:id` |
| 191 | DELETE | `/api/v1/jts/catalog/task-types/:id` |
| 192 | GET | `/api/v1/jts/catalog/sla-rules` |
| 193 | PUT | `/api/v1/jts/catalog/sla-rules` |
| 194 | DELETE | `/api/v1/jts/catalog/sla-rules/:id` |
| 195 | GET | `/api/v1/jts/catalog/escalation-rules` |
| 196 | POST | `/api/v1/jts/catalog/escalation-rules` |
| 197 | PATCH | `/api/v1/jts/catalog/escalation-rules/:id` |
| 198 | DELETE | `/api/v1/jts/catalog/escalation-rules/:id` |
| 199 | GET | `/api/v1/jts/catalog/self-task-policies` |
| 200 | PUT | `/api/v1/jts/catalog/self-task-policies` |
| 201 | DELETE | `/api/v1/jts/catalog/self-task-policies/:id` |
| 202 | GET | `/api/v1/jts/catalog/shift-schedules` |
| 203 | POST | `/api/v1/jts/catalog/shift-schedules` |
| 204 | DELETE | `/api/v1/jts/catalog/shift-schedules/:id` |
| 205 | GET | `/api/v1/jts/catalog/reporting-relationships` |
| 206 | PUT | `/api/v1/jts/catalog/reporting-relationships` |
| 207 | DELETE | `/api/v1/jts/catalog/reporting-relationships/:id` |
| 208 | GET | `/api/v1/jts/catalog/attendance-records` |
| 209 | PUT | `/api/v1/jts/catalog/attendance-records` |
| 210 | POST | `/api/v1/jts/catalog/attendance-records/open-session` |
| 211 | POST | `/api/v1/jts/catalog/attendance-records/close-session` |
| 212 | GET | `/api/v1/jts/catalog/audit-logs` |
| 213 | GET | `/api/v1/jts/catalog/data-access-logs` |
| 214 | POST | `/api/v1/jts/catalog/data-access-logs` |
| 215 | GET | `/api/jts/catalog/tenants` |
| 216 | GET | `/api/jts/catalog/tenant/current` |
| 217 | POST | `/api/jts/catalog/tenants` |
| 218 | PATCH | `/api/jts/catalog/tenants/:id` |
| 219 | GET | `/api/jts/catalog/org-nodes` |
| 220 | POST | `/api/jts/catalog/org-nodes` |
| 221 | PATCH | `/api/jts/catalog/org-nodes/:id` |
| 222 | DELETE | `/api/jts/catalog/org-nodes/:id` |
| 223 | GET | `/api/jts/catalog/employees` |
| 224 | POST | `/api/jts/catalog/employees` |
| 225 | POST | `/api/jts/catalog/employees/bind-from-jwt` |
| 226 | PATCH | `/api/jts/catalog/employees/:id/align-auth-code` |
| 227 | PUT | `/api/jts/catalog/employees/:id/auth-user-link` |
| 228 | PATCH | `/api/jts/catalog/employees/:id` |
| 229 | DELETE | `/api/jts/catalog/employees/:id` |
| 230 | GET | `/api/jts/catalog/employee-roles` |
| 231 | POST | `/api/jts/catalog/employee-roles` |
| 232 | DELETE | `/api/jts/catalog/employee-roles/:employeeId` |
| 233 | GET | `/api/jts/catalog/task-types` |
| 234 | POST | `/api/jts/catalog/task-types` |
| 235 | PATCH | `/api/jts/catalog/task-types/:id` |
| 236 | DELETE | `/api/jts/catalog/task-types/:id` |
| 237 | GET | `/api/jts/catalog/sla-rules` |
| 238 | PUT | `/api/jts/catalog/sla-rules` |
| 239 | DELETE | `/api/jts/catalog/sla-rules/:id` |
| 240 | GET | `/api/jts/catalog/escalation-rules` |
| 241 | POST | `/api/jts/catalog/escalation-rules` |
| 242 | PATCH | `/api/jts/catalog/escalation-rules/:id` |
| 243 | DELETE | `/api/jts/catalog/escalation-rules/:id` |
| 244 | GET | `/api/jts/catalog/self-task-policies` |
| 245 | PUT | `/api/jts/catalog/self-task-policies` |
| 246 | DELETE | `/api/jts/catalog/self-task-policies/:id` |
| 247 | GET | `/api/jts/catalog/shift-schedules` |
| 248 | POST | `/api/jts/catalog/shift-schedules` |
| 249 | DELETE | `/api/jts/catalog/shift-schedules/:id` |
| 250 | GET | `/api/jts/catalog/reporting-relationships` |
| 251 | PUT | `/api/jts/catalog/reporting-relationships` |
| 252 | DELETE | `/api/jts/catalog/reporting-relationships/:id` |
| 253 | GET | `/api/jts/catalog/attendance-records` |
| 254 | PUT | `/api/jts/catalog/attendance-records` |
| 255 | POST | `/api/jts/catalog/attendance-records/open-session` |
| 256 | POST | `/api/jts/catalog/attendance-records/close-session` |
| 257 | GET | `/api/jts/catalog/audit-logs` |
| 258 | GET | `/api/jts/catalog/data-access-logs` |
| 259 | POST | `/api/jts/catalog/data-access-logs` |
| 260 | GET | `/jts/catalog/tenants` |
| 261 | GET | `/jts/catalog/tenant/current` |
| 262 | POST | `/jts/catalog/tenants` |
| 263 | PATCH | `/jts/catalog/tenants/:id` |
| 264 | GET | `/jts/catalog/org-nodes` |
| 265 | POST | `/jts/catalog/org-nodes` |
| 266 | PATCH | `/jts/catalog/org-nodes/:id` |
| 267 | DELETE | `/jts/catalog/org-nodes/:id` |
| 268 | GET | `/jts/catalog/employees` |
| 269 | POST | `/jts/catalog/employees` |
| 270 | POST | `/jts/catalog/employees/bind-from-jwt` |
| 271 | PATCH | `/jts/catalog/employees/:id/align-auth-code` |
| 272 | PUT | `/jts/catalog/employees/:id/auth-user-link` |
| 273 | PATCH | `/jts/catalog/employees/:id` |
| 274 | DELETE | `/jts/catalog/employees/:id` |
| 275 | GET | `/jts/catalog/employee-roles` |
| 276 | POST | `/jts/catalog/employee-roles` |
| 277 | DELETE | `/jts/catalog/employee-roles/:employeeId` |
| 278 | GET | `/jts/catalog/task-types` |
| 279 | POST | `/jts/catalog/task-types` |
| 280 | PATCH | `/jts/catalog/task-types/:id` |
| 281 | DELETE | `/jts/catalog/task-types/:id` |
| 282 | GET | `/jts/catalog/sla-rules` |
| 283 | PUT | `/jts/catalog/sla-rules` |
| 284 | DELETE | `/jts/catalog/sla-rules/:id` |
| 285 | GET | `/jts/catalog/escalation-rules` |
| 286 | POST | `/jts/catalog/escalation-rules` |
| 287 | PATCH | `/jts/catalog/escalation-rules/:id` |
| 288 | DELETE | `/jts/catalog/escalation-rules/:id` |
| 289 | GET | `/jts/catalog/self-task-policies` |
| 290 | PUT | `/jts/catalog/self-task-policies` |
| 291 | DELETE | `/jts/catalog/self-task-policies/:id` |
| 292 | GET | `/jts/catalog/shift-schedules` |
| 293 | POST | `/jts/catalog/shift-schedules` |
| 294 | DELETE | `/jts/catalog/shift-schedules/:id` |
| 295 | GET | `/jts/catalog/reporting-relationships` |
| 296 | PUT | `/jts/catalog/reporting-relationships` |
| 297 | DELETE | `/jts/catalog/reporting-relationships/:id` |
| 298 | GET | `/jts/catalog/attendance-records` |
| 299 | PUT | `/jts/catalog/attendance-records` |
| 300 | POST | `/jts/catalog/attendance-records/open-session` |
| 301 | POST | `/jts/catalog/attendance-records/close-session` |
| 302 | GET | `/jts/catalog/audit-logs` |
| 303 | GET | `/jts/catalog/data-access-logs` |
| 304 | POST | `/jts/catalog/data-access-logs` |
| 305 | GET | `/api/v1/jts/recurrence-rules/` |
| 306 | POST | `/api/v1/jts/recurrence-rules/` |
| 307 | GET | `/api/v1/jts/recurrence-rules/:id` |
| 308 | PATCH | `/api/v1/jts/recurrence-rules/:id` |
| 309 | DELETE | `/api/v1/jts/recurrence-rules/:id` |
| 310 | GET | `/api/jts/recurrence-rules/` |
| 311 | POST | `/api/jts/recurrence-rules/` |
| 312 | GET | `/api/jts/recurrence-rules/:id` |
| 313 | PATCH | `/api/jts/recurrence-rules/:id` |
| 314 | DELETE | `/api/jts/recurrence-rules/:id` |
| 315 | GET | `/jts/recurrence-rules/` |
| 316 | POST | `/jts/recurrence-rules/` |
| 317 | GET | `/jts/recurrence-rules/:id` |
| 318 | PATCH | `/jts/recurrence-rules/:id` |
| 319 | DELETE | `/jts/recurrence-rules/:id` |
| 320 | GET | `/api/v1/jts/performance/metrics` |
| 321 | GET | `/api/v1/jts/performance/scores` |
| 322 | POST | `/api/v1/jts/performance/calculate-daily` |
| 323 | GET | `/api/v1/jts/performance/reviews` |
| 324 | POST | `/api/v1/jts/performance/reviews` |
| 325 | PATCH | `/api/v1/jts/performance/reviews/:id` |
| 326 | DELETE | `/api/v1/jts/performance/reviews/:id` |
| 327 | POST | `/api/v1/jts/performance/reviews/:reviewId/goals` |
| 328 | GET | `/api/v1/jts/performance/reviews/:reviewId/goals` |
| 329 | POST | `/api/v1/jts/performance/reviews/:reviewId/acknowledge` |
| 330 | GET | `/api/v1/jts/performance/alerts` |
| 331 | POST | `/api/v1/jts/performance/alerts` |
| 332 | PATCH | `/api/v1/jts/performance/alerts/:id/resolve` |
| 333 | GET | `/api/jts/performance/metrics` |
| 334 | GET | `/api/jts/performance/scores` |
| 335 | POST | `/api/jts/performance/calculate-daily` |
| 336 | GET | `/api/jts/performance/reviews` |
| 337 | POST | `/api/jts/performance/reviews` |
| 338 | PATCH | `/api/jts/performance/reviews/:id` |
| 339 | DELETE | `/api/jts/performance/reviews/:id` |
| 340 | POST | `/api/jts/performance/reviews/:reviewId/goals` |
| 341 | GET | `/api/jts/performance/reviews/:reviewId/goals` |
| 342 | POST | `/api/jts/performance/reviews/:reviewId/acknowledge` |
| 343 | GET | `/api/jts/performance/alerts` |
| 344 | POST | `/api/jts/performance/alerts` |
| 345 | PATCH | `/api/jts/performance/alerts/:id/resolve` |
| 346 | GET | `/jts/performance/metrics` |
| 347 | GET | `/jts/performance/scores` |
| 348 | POST | `/jts/performance/calculate-daily` |
| 349 | GET | `/jts/performance/reviews` |
| 350 | POST | `/jts/performance/reviews` |
| 351 | PATCH | `/jts/performance/reviews/:id` |
| 352 | DELETE | `/jts/performance/reviews/:id` |
| 353 | POST | `/jts/performance/reviews/:reviewId/goals` |
| 354 | GET | `/jts/performance/reviews/:reviewId/goals` |
| 355 | POST | `/jts/performance/reviews/:reviewId/acknowledge` |
| 356 | GET | `/jts/performance/alerts` |
| 357 | POST | `/jts/performance/alerts` |
| 358 | PATCH | `/jts/performance/alerts/:id/resolve` |
| 359 | GET | `/api/v1/notifications/` |
| 360 | GET | `/api/v1/notifications/health` |
| 361 | GET | `/api/v1/notifications/me` |
| 362 | PATCH | `/api/v1/notifications/:id/read` |
| 363 | PATCH | `/api/v1/notifications/me/read-all` |
| 364 | GET | `/api/v1/notifications/preferences/me` |
| 365 | PUT | `/api/v1/notifications/preferences/me` |
| 366 | POST | `/api/v1/notifications/dispatch` |
| 367 | POST | `/api/v1/notifications/process-queues` |
| 368 | GET | `/api/v1/notifications/providers/health` |
| 369 | POST | `/api/v1/notifications/test-email` |

**Row count:** 369

---

*End of document. For JSON request/response bodies, see `docs/JTS_FRONTEND_API_FULL_REFERENCE.md` and `docs/JTS_API_CONTRACT_V1_FRONTEND.md`. This file is the RBAC + full route mirror inventory.*
