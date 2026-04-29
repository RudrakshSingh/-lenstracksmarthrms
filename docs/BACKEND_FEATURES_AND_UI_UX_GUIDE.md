# Backend feature inventory + UI/UX guidance (Etelios / Lenstrack)

**Scope:** Part A lists **capabilities evidenced in the backend codebase** (microservices, routes, middleware patterns). It is not a guarantee that every endpoint is enabled in every environment. Part B records **UI/UX betterments** aligned to those APIs (frontend implementation is separate).

**Sources:** `microservices/*/src` routes and server mounts, `docs/JTS_API_REFERENCE.md`, `docker-compose.yml`, architecture notes.

---

## Part A — Backend features (by domain)

### A.1 Auth service (`auth-service`)

- User **registration**, **login**, **logout**, **refresh token**, **change password**, **profile** read/update, `**/me`** session identity.
- **Admin password reset** flow.
- **Permission catalog** and tenant-scoped **permission management** (list users with permissions, read/update user permissions, bulk operations where routed).
- **Real users** admin CRUD-style routes for user lifecycle management (create/list/update/delete patterns in `realUsers.routes.js`).
- **Emergency / Greywall** style operational routes (maintenance, diagnostics, audit access patterns — treat as privileged ops surfaces).
- **Emergency lock** (`SOS` trigger, lock status, unlock with recovery, verify keys, recovery instructions, support contact).

*Cross-cutting:* JWT authentication, role enums (e.g. superadmin, admin, hr, manager, employee, accountant, finance, etc.), integration hooks for downstream services.

---

### A.2 HR service (`hr-service`)

- **Employee master:** list/create/read/update/delete employees; **assign role**; **status** updates/patches.
- **Organizational data:** departments, stores/branches (and related HR routes in `hr.routes.js` — large surface).
- **Leave management:** extensive leave APIs (types, balances, applications, approvals, cancellations, accruals patterns — multiple endpoints in `leave.routes.js`).
- **Roster / scheduling:** roster CRUD, assignments, bulk operations (`roster.routes.js`).
- **Onboarding:** multi-step onboarding APIs (`onboarding.routes.js`).
- **Performance:** performance-related GET APIs (`performance.routes.js`).
- **Payroll workflow proxy:** forwards **payroll gates**, **validation**, **runs**, **reports** (bank advice, PF ECR-style, TDS Form 24Q-style), **payslip generate/send**, **payslip PDF** to **payroll-service** (single source of truth for Etelios payroll runs).

---

### A.3 Attendance service (`attendance-service`)

- **Clock-in / clock-out** (and **check-in / check-out** aliases).
- **Today / current** session status, **check-status**, **history**, **summary**, **stats**.
- **Leave** read paths from attendance context (`/leave`, `/leave/balances`).
- **Bulk** attendance operations.
- **Reports**, **daily timeline**, listings by **store** and **department**, general CRUD on attendance records (`GET/POST/PATCH/PUT/DELETE`).
- **Location tracking** endpoint (`track-location`).
- **Security:** location validation, IP geolocation, face validation hooks, **violations** list/detail/**resolve**.
- **Geofencing:** check status, get/update **settings**, list geofencing users (permission/role gated).

*Cross-cutting:* HR employee lookup with **timeout and tenant isolation** controls (documented in README / K8s env patterns).

---

### A.4 Payroll service (`payroll-service`)

**Mounts:** `/api/salary`, `/api/unified-payroll` (optional), `/api/payroll` (deductions, validation, portal, compliance), `/api/payroll-workflow`.

- **Salary** APIs (salary routes).
- **Deductions** and payroll configuration (deduction routes).
- **Unified payroll** (optional module).
- **Payroll validation** routes.
- **Employee / manager portal** surfaces (payroll portal routes).
- **Compliance reports:** e.g. **bank advice**, **PF ECR-style**, **TDS Form 24Q-style** extracts (`payrollCompliance.routes.js`).
- **Payroll workflow (core):**
  - **Attendance preview** and **month salary preview** (gates before run).
  - **Payroll summary** by month/year.
  - **Payroll runs** (start run, get run by id) with **rate limiting**.
  - **Gates:** employee master, attendance-leave, payroll-validation.
  - **Cycle:** initiate, **HR submit** (with optional **MFA** when configured), **finance decision**, **freeze** (MFA when configured), **post to finance**, **reconcile**, **replay** posting, **unlock** frozen cycle (superadmin-gated).
  - **Audit trail** and **reconciliation report** endpoints.
  - **Adjustments:** create, **authority** decision, **finance** decision.
- **Supporting services in code:** payroll run engine, gates, anomaly checks, month salary preview, attendance preview, audit service, distributed lock hooks, HR/attendance/financial **service clients**.

---

### A.5 Financial service (`financial-service`)

- **P&L** create/update, get by period, **summary**.
- **Expenses:** create, list/filter, **approve/reject**, **salary reflection** from payroll payload, **get by source reference** (payroll idempotency helper).
- **Ledger:** create entry, list entries, **trial balance**, **account balance**.
- **TDS:** create entry, list, **summary**.
- **Financial dashboard.**
- **Payroll posting bridge:** `POST /payroll/posting` (ledger posting with idempotency concepts).
- **Invoices:** list, create (validated), get by id, **send** invoice.

---

### A.6 JTS — Job / Task System (`jts-service`)

**Dual URL prefixes:** `/api/jts`, `/api/v1`, and ingress mirrors under `/jts/...` (see `createApp.js`).

- **Tasks:** manager create, list/filter, detail, **status** transitions; **self-task** create.
- **Timers:** start/stop tied to task (optional **attendance-service** check via `ATTENDANCE_SERVICE_URL`); active timer queries.
- **Collaboration:** **comments**, **attachments** (S3 **presign upload/download** + metadata registration), **quality** ratings on tasks.
- **Approvals:** task approvals, **pending for me**, approve/reject patch.
- **Recurrence rules** API surface.
- **Performance management** metrics, scores, daily calculation, reviews/goals/acknowledge, alerts/resolve.
- **Catalog / admin:** tenants, org nodes, **employees** (create/update, **bind-from-jwt**, align auth code, link auth user), roles, task types, SLA rules, escalation rules, self-task policies, shift schedules, reporting relationships, **attendance mirror** (open/close session, upsert record), audit/data-access logs (per `JTS_API_REFERENCE.md` and admin routes).
- **Notifications** under JTS (`/api/v1/notifications` mount in app).
- **Internal** analytics / tenant analytics (internal token patterns — see `internalJts.routes.js` and env docs).
- **Cross-cutting:** standardized JSON **envelope meta**, rate limiting, helmet/CORS, HRMS compatibility routes.

---

### A.7 Other domain services (present in repo / compose)

Each has typical **Express + Mongo + auth** patterns; exact menus differ by service:


| Service                       | Role in platform                                                      |
| ----------------------------- | --------------------------------------------------------------------- |
| **crm-service**               | Customer / engagement domain                                          |
| **inventory-service**         | Inventory / stock domain                                              |
| **sales-service**             | Sales orders / commercial                                             |
| **purchase-service**          | Procurement / vendors                                                 |
| **document-service**          | Documents / e-sign–oriented flows                                     |
| **service-management**        | Service desk / SLA-oriented domain                                    |
| **cpp-service**               | Customer protection plan (vertical)                                   |
| **prescription-service**      | Prescription / healthcare-oriented domain                             |
| **analytics-service**         | Analytics and reporting aggregation                                   |
| **notification-service**      | Cross-cutting notifications                                           |
| **monitoring-service**        | Monitoring / health aggregation                                       |
| **tenant-management-service** | Tenant admin APIs (ingress prefix `/tenant-management` strip), health |
| **tenant-registry-service**   | Tenant registry domain                                                |
| **realtime-service**          | WebSocket / real-time initialization over HTTP server                 |
| **api-gateway**               | Kong declarative routing, rate limits, CORS                           |


**Shared:** `microservices/shared` utilities (e.g. permission catalog, role defaults), `integrations/permission-matrix-sdk`.

---

### A.8 Platform & non-functional (backend)

- **Multi-tenant context:** JWT + headers (`X-Tenant-Id`, company headers) enforced in sensitive routes; strict modes configurable per service.
- **RBAC:** Role + permission checks on financial, attendance geofencing, payroll workflow, JTS operations.
- **Security middleware:** helmet, CORS, rate limits, encryption/audit patterns (repeated across services).
- **Health endpoints** per service for orchestration probes.
- **Production Kubernetes** artifacts for Etelios prod (ingress, Redis alignment, image tags — see `k8s/etelios-prod/README.md`).

---

## Part B — UI/UX betterments (mapped to backend capabilities)

These items **do not require backend code** to *conceptualize*, but the **frontend** should implement them against the APIs above.

### B.1 Two experiences, one design system

- **Employee app:** mobile-first — **today status** (attendance `today`/`current`, leave balances), **one primary action** (clock-in/out), payslip access where portal APIs exist, **My tasks** (JTS self + assigned + approvals pending).
- **Admin / HR / Manager web:** dense tables, saved filters, **bulk** actions where backend supports bulk (`attendance` bulk, permission bulk, etc.).

### B.2 Clarity on “jobs to be done”

- **Clock screen:** first line = compliance state (“Not clocked in” / “In progress”); primary button = next legal action; link to **why** if exception (geofence `check`, security `violations`).
- **Payroll operator:** single **run pipeline** UI: gates (`gates/`*) → run → cycle status → freeze/post/reconcile with **explicit error body** from payroll-workflow APIs.
- **Finance:** P&L, expenses, trial balance, **payroll posting** status — surface **idempotent** “already posted” responses clearly.

### B.3 States and trust

- **Loading:** skeletons to avoid layout shift on large HR lists and attendance history.
- **Empty:** guided first steps (no employees → link to HR create; no JTS link → **bind-from-jwt** CTA).
- **Errors:** map HTTP codes to human text; show **correlation / request id** on admin surfaces only.
- **Sensitive flows:** MFA steps for payroll freeze/post — show **progress** and **timeout** if auth challenges expire.

### B.4 Navigation language

- Use **outcome labels** in UI: “My pay,” “Time & attendance,” “Approvals,” “Tasks,” not raw service names (`jts-service`, `payroll-workflow`) for end users.

### B.5 JTS-specific UX

- **Timer start** disabled or explained when attendance check fails (backend may block) — show reason from API message.
- **Attachments:** presign flow = **choose file → upload to S3 → POST metadata**; show upload progress and retry.
- **Approvals inbox** unified: JTS `pending/me` + HR leave approvals + payroll authority decisions where roles overlap.

### B.6 Accessibility and locale

- Large touch targets for clock; **contrast** for outdoor use.
- **Time zone** and **locale** on all timestamps from backend UTC storage.
- Screen reader labels on **status** chips and **approval** buttons.

### B.7 Admin power features

- **Saved views** for attendance `reports` / `violations` queues.
- **Keyboard shortcuts** on large approval queues (managers).
- **Drill-down:** trial balance → ledger list → voucher/expense detail (financial `ledger` + `expenses`).

### B.8 Onboarding

- Role-based **first-run**: employee vs manager vs HR vs accountant — each sees only relevant modules (matches RBAC surface in backend).

---

## Part C — Traceability


| Backend area                  | Primary UI surfaces                              |
| ----------------------------- | ------------------------------------------------ |
| Auth `/me`, permissions       | Login, session switcher, admin permission matrix |
| HR employees, leave, roster   | HR master, leave app, shift calendar             |
| Attendance clock + security   | Mobile clock, manager exception inbox            |
| Payroll workflow + compliance | Payroll run wizard, statutory export download    |
| Financial + payroll posting   | Finance dashboard, month-end posting             |
| JTS tasks, timers, approvals  | My work, manager workload, SLA dashboards        |


---

*Document version: 1.0 — backend inventory from codebase scan; UI/UX section aligned to prior product discussion.*