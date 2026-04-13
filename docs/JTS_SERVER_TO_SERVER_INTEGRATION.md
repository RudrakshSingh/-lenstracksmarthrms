# Server-to-server: HR / attendance → JTS

**Etelios prod (ingress-only):** Browsers hit **`https://<api-host>/jts/...`** via **Ingress → jts-service**; no API Gateway is required. This doc is about **cluster-internal** calls (`http://jts-service:3018`).

JTS does not need to “pull” from HR for basic tasks; **HRMS already calls JTS from the browser**. For **aggregated HR APIs** (dashboard, employee profile) you add **outbound HTTP from hr-service or attendance-service to jts-service** inside the cluster.

## 1. Network & URL (Kubernetes)

- **Base URL (in-cluster):** `http://jts-service:3018` (Service port must match JTS `PORT`, default **3018**).
- **Set in Deployments:** `JTS_SERVICE_URL=http://jts-service:3018` on **hr-service** and/or **attendance-service**.
- **Paths:** use the same paths as the frontend, e.g.  
  - `GET /api/jts/tasks/summary/:employeeId?date=YYYY-MM-DD`  
  - `GET /api/jts/analytics` (tenant-level stats; requires auth as today)
  - `GET /api/jts/tasks/:id/activities` (audit timeline)
  - `GET /api/jts/tasks/:id/timer` (session bundle)

All JSON responses include a standard envelope with `meta`:

```json
{ "success": true, "data": {}, "meta": {}, "message": "" }
```

`jts-service` is mounted at **`/api/jts/tasks`** and **`/jts/tasks`**; internal callers can use **`/api/jts/...`** only.

## 2. Authentication patterns

### A) **Forward the user’s JWT** (recommended for “my dashboard” / per-employee HR screens)

- Incoming request to **hr-service** already has `Authorization: Bearer <access_token>` and usually `X-Tenant-Id`.
- **Forward those headers unchanged** to JTS. JTS validates JWT with the same **`JWT_SECRET`** as **auth-service** (already required in prod).
- **Tenant isolation:** JTS derives `tenant_id` from the token; optionally also send `X-Tenant-Id` and keep it consistent with the token (JTS middleware enforces match when header is present).

**Pros:** No new secrets; RBAC/roles behave like the UI.  
**Cons:** Only works when you have a **user context** (not for offline cron without a user).

### B) **Service / internal token** (implemented for tenant analytics)

- Set **`JTS_INTERNAL_SERVICE_TOKEN`** on **jts-service** (≥ 8 chars; store in a K8s Secret in prod).
- **Call:** `GET /api/jts/internal/tenant-analytics` (also mounted at **`/jts/internal/tenant-analytics`** for ingress parity).
- **Headers:**
  - `X-JTS-Internal-Token: <same as env>`
  - `X-Tenant-Id: <24-hex tenant ObjectId>`
- **Response:** same shape as **`GET /api/jts/analytics`** (user JWT path).
- **Security:** do **not** put this path on a public ALB rule; use **cluster-only** callers (CronJob, other pods) or **NetworkPolicy**.
- See **`k8s/etelios-prod/jts-service-deployment.yaml`** (commented example) and **`microservices/env.example`**.

### C) **Do not** use Mongo cross-read

Avoid HR reading JTS collections directly; it couples schemas and breaks service boundaries.

## 3. Existing JTS endpoints useful for HR

| Use case | Method | Path (prefix with `JTS_SERVICE_URL`) |
|----------|--------|----------------------------------------|
| **Current user** task counts (JWT → JTS Employee via `auth_user_id` / code) | GET | `/api/jts/tasks/summary/me` |
| Per-employee task summary (JTS Employee **ObjectId**) | GET | `/api/jts/tasks/summary/:employeeId` |
| Tenant analytics (aggregates) | GET | `/api/jts/analytics` |
| Task list (filter by employee, etc.) | GET | `/api/jts/tasks` |
| Task activities (status + activity stream) | GET | `/api/jts/tasks/:id/activities` |
| Task timer bundle (`activeTimer`, `sessions`, `totalDurationSeconds`) | GET | `/api/jts/tasks/:id/timer` |
| Task timer sessions only | GET | `/api/jts/tasks/:id/timer/sessions` |
| Lifecycle actions | POST | `/api/jts/tasks/:id/start|submit-review|reopen|cancel|block|unblock|reassign` |
| Subtask list/create/update | GET/POST/PATCH | `/api/jts/tasks/:id/subtasks`, `/api/jts/tasks/:id/subtasks/:subtaskId/status` |
| Recurrence rule CRUD (manager/admin) | GET/POST/PATCH/DELETE | `/api/jts/recurrence-rules` |

All of these currently go through **`authenticate`** — so **Pattern A** (forward user JWT) works out of the box.

### Implemented in hr-service

- **`getUnifiedDashboard`** enriches **`widgets.tasks`** from **`GET /api/jts/tasks/summary/me`** (personal counts).
- For roles **`hr` / `admin` / `superadmin`**, it also sets **`widgets.jtsTenant`** from **`GET /api/jts/analytics`** (tenant-wide pending/completed, alerts).
- Set **`JTS_SERVICE_URL=http://jts-service:3018`** on the hr-service Deployment (see `k8s/etelios-prod/hr-service-deployment.yaml`).

## 4. Example: hr-service calls JTS

Use the shared helper (see `microservices/hr-service/src/utils/jtsServiceClient.js`) or inline:

```js
const axios = require('axios');

const JTS = process.env.JTS_SERVICE_URL || 'http://jts-service:3018';

async function fetchJtsTaskSummary(employeeId, { authorization, tenantId, date } = {}) {
  const headers = {
    Authorization: authorization,
    'Content-Type': 'application/json'
  };
  if (tenantId) {
    headers['X-Tenant-Id'] = tenantId;
  }
  const q = date ? `?date=${encodeURIComponent(date)}` : '';
  const { data } = await axios.get(
    `${JTS.replace(/\/$/, '')}/api/jts/tasks/summary/${employeeId}${q}`,
    { headers, timeout: 10000 }
  );
  return data;
}
```

Call this from `dashboardController` / `dashboard.service` when building an employee or manager dashboard, and **merge** `data` into your response (handle `401` / `503` gracefully if JTS is down).

## 5. attendance-service → JTS (implemented)

**`GET /api/attendance/today`** (self-scoped) may attach **`jtsTasks`** by calling **`GET /api/jts/tasks/summary/me`** with the same Bearer + tenant headers.

- Code: `microservices/attendance-service/src/utils/jtsServiceClient.js`, `jtsTodayEnrichment.js`, `attendanceController.getTodayAttendance`.
- Env: **`JTS_SERVICE_URL`**, **`ATTENDANCE_JTS_ENRICHMENT`** (default on; set `false` to disable), **`ATTENDANCE_JTS_ENRICH_WHEN_EMPTY`** (when not `false`, no attendance row returns `{ attendance: null, jtsTasks }` instead of `null`).
- K8s: `JTS_SERVICE_URL` added on attendance deployments (see `k8s/etelios-prod/attendance-service-deployment.yaml`, `k8s/deployments/`, `k8s/dev/`, `k8s/prod/`).

## 6. SLA / escalation / recurrence behavior (for consumers)

- SLA state is persisted by background job (`warning_at`, `breached_at`, paused SLA on `ON_HOLD`).
- Escalation ladder `L0-L3` is automated and may generate in-app/email notifications.
- Recurrence rules can auto-materialize tasks in background; dashboards should not assume task IDs are only user-created.
- For strict consistency screens, prefer polling list/summary endpoints over long-lived cached task cards.

## 7. Operational checklist

- [ ] `jts-service` Deployment running; Service port **3018**.
- [ ] `JTS_SERVICE_URL` on calling service.
- [ ] `ENABLE_BACKGROUND_JOBS` is not `false` in JTS if SLA/escalation/recurrence automation is required.
- [ ] **JWT_SECRET** matches **auth-service** / **jts-service** (already required).
- [ ] Timeouts and **try/catch**: HR/attendance APIs should not fail entirely if JTS is slow/down (degrade with `tasks: null` or empty summary).
- [ ] Optional: **circuit breaker** or short cache for hot dashboard paths.

## 8. Batch / admin without user JWT

Use **Pattern B** above (`/api/jts/internal/tenant-analytics`). For other internal operations, add routes on the same router with the same middleware.
