# JTS (Jobs Tracking System) — Complete Documentation

**Service:** `microservices/jts-service`  
**Version:** `3.0.0` (`package.json`)  
**Default port:** `3018`

This document is the **primary** reference for architecture, routes, auth, integrations, deployment, and operations. Specialized topics link out to smaller docs where noted.

---

## 1. What JTS does

Multi-tenant task execution for HRMS:

| Area | Capabilities |
|------|----------------|
| **Tasks** | Create, assign, accept/reject, lifecycle routes, complete/review, workday/subtask views |
| **Timers** | Session-based start/stop/pause; **attendance-aware** start (`ATTENDANCE_SERVICE_URL`) |
| **Self-tasks** | Employee-created tasks, approval paths |
| **HRMS compat** | `self-tasks`, approvals, **analytics**, reviews (`hrmsJtsCompat.routes.js`) |
| **Collaboration** | Comments, attachments (S3 presign), quality, approvals |
| **Performance** | Scores, reviews, goals, alerts |
| **Catalog / admin** | Org nodes, JTS employees, task types, SLA rules, policies, audit |
| **Notifications** | In-app + SES/SNS; event-driven dispatch from task activity + queues + cron dispatcher |
| **Workflow engines** | SLA persistence, escalation ladder (L0-L3), recurrence auto-generation jobs |

---

## 2. Production topology (Ingress-only)

**Etelios / typical prod:** traffic is **ALB or NGINX Ingress → Kubernetes Services**. No repo **API Gateway** (`src/server.js`) is required.

- **Ingress source of truth (AWS ALB):** `k8s/ingress-alb-fixed.yaml`  
- JTS must receive **`/jts/*`** and **`/api/jts/*`** on **`jts-service:3018`**.  
- Catch-all **`path: /`** → another service (e.g. auth) must be **last**, or **`/jts`** requests can be routed incorrectly.

If you see `"hint":"Check /api endpoint for available services"`, that JSON is from the **optional gateway app**, not JTS — fix routing, not JTS code.

**Deep dive:** `docs/JTS_INGRESS_ONLY_NO_GATEWAY.md`, `docs/JTS_PROD_DEPLOY.md`.

---

## 3. Runtime architecture

### 3.1 Boot sequence

- Entry: `src/server.js`  
- App factory: `src/createApp.js`  
- Order: `dotenv` → Mongo (`connectDB`) → Redis (`connectRedis`) → background jobs (unless `ENABLE_BACKGROUND_JOBS=false`) → listen `PORT` (default **3018**).
- Jobs include: `escalationChecker.job.js`, `performanceCalculator.job.js`, `notificationDispatcher.job.js`, `slaAndRecurrence.job.js`.

### 3.2 Redis

Redis is **connected at boot**. Notification **email/SMS queues are Mongo models** + **cron** (`notificationDispatcher.job.js`), not Bull on Redis. See comment in `src/config/redis.js`.

### 3.3 Middleware (createApp)

- `helmet`, `cors` (allows `X-Tenant-Id`), rate limit (1000 / 15 min / IP), `json`/`urlencoded`, `compression`, `morgan` (off in test).

### 3.4 Health

- `GET /health`
- `GET /api/v1/health`

### 3.5 Response envelope standard

- JSON responses are normalized to include:
  - `success`
  - `data`
  - `meta` (always present; pagination copied into `meta` when available)
  - `message` (endpoint-dependent)

---

## 4. URL prefixes (dual mount)

Same routers are mounted for MFE + ALB path-prefix:

| Prefix | Use case |
|--------|-----------|
| **`/api/jts/*`** | Primary HRMS / API contract |
| **`/api/v1/tasks/*`**, **`/api/v1/...`** | Legacy |
| **`/jts/*`** | Ingress host `https://api.example.com/jts/...` |

**Public attachment links** must match ingress: set **`JTS_PUBLIC_PATH_PREFIX=/jts`** when clients use `/jts/...` (`taskFrontend.mapper.js`).

---

## 5. Route map (files)

| Router | Mount area | Notes |
|--------|------------|--------|
| **`internalJts.routes.js`** | **`/api/jts/internal`**, **`/jts/internal`** | **Before** `/api/jts` and `/jts` so compat `authenticate` does not swallow paths |
| **`hrmsJtsCompat.routes.js`** | `/api/jts`, `/jts` | Global **`authenticate`** on router |
| **`task.routes.js`** | `.../tasks` | Tasks + **`GET /summary/me`**, **`GET /summary/:employeeId`** |
| **`taskCollaboration.routes.js`** | `.../tasks` | Comments, attachments, quality, approvals |
| **`timer.routes.js`** | `/api/jts`, `/jts`, `/api/v1` | Timer base path |
| **`selfTask.routes.js`** | `.../tasks/self` | Self-task create |
| **`jtsAdmin.routes.js`** | `/api/jts/catalog`, `/jts/catalog`, `/api/v1/jts/catalog` | Admin/catalog |
| **`performanceManagement.routes.js`** | `/api/jts/performance`, `/jts/performance` | Performance |
| **`notification.routes.js`** | `/api/v1/notifications` | Inbox, dispatch, queues |
| **`recurrence.routes.js`** | `/api/jts/recurrence-rules`, `/jts/recurrence-rules`, `/api/v1/jts/recurrence-rules` | Recurrence CRUD |
| **`subtask.routes.js`** | `.../tasks/:id/subtasks` | First-class subtasks under parent task |

---

## 6. Authentication & tenant isolation

**File:** `src/middleware/auth.middleware.js`

- Protected routes: **`Authorization: Bearer <JWT>`**  
- JWT verified with **`JWT_SECRET`** — **must match auth-service** in prod.  
- Tenant: `tid` / `tenant_id` / `tenantId` → **`req.user.tenant_id`**.  
- If **`X-Tenant-Id`** is sent, it **must equal** token tenant (`JTS_TENANT_HEADER_MISMATCH` otherwise).  
- **`TEST_MODE=true`**: bypasses auth — **never in production**.

**Role checks:** `requireRole` on sensitive writes (`rbac.middleware.js`).

---

## 7. API summary (functional)

Prefix below is relative to **`/api/jts`** or **`/jts`** (and task stacks under **`/tasks`**).

### 7.1 Tasks

- CRUD, status, accept/reject/complete, lifecycle routes (`start`, `submit-review`, `reopen`, `cancel`, `block`, `unblock`, `reassign`), SLA, workday list  
- Task activity feed: `GET /tasks/:id/activities`
- Subtasks: `GET/POST /tasks/:id/subtasks`, `PATCH /tasks/:id/subtasks/:subtaskId/status`
- **`GET /tasks/summary/me`** — task counts for **JWT user** (resolves JTS `Employee` via `actor.util.js`). Returns zeros + `linked: false` if no JTS employee row.  
- **`GET /tasks/summary/:employeeId`** — counts for a JTS **Employee ObjectId** (admin-style use)

### 7.2 HRMS compat (under `/api/jts` or `/jts`, after `authenticate`)

- `POST /self-tasks`  
- Approvals: pending / approve / reject  
- **`GET /analytics`** — tenant aggregates  
- `GET /reviews`

**MFE field details:** `docs/JTS_HRMS_MFE_BACKEND_ALIGNMENT.md`  
**Full-style reference:** `docs/JTS_API_REFERENCE.md`

### 7.3 Timers

- `POST /tasks/:id/timer/start|stop|pause`, `GET /tasks/:id/timer`, `GET /tasks/:id/timer/sessions`, active timer routes  
- Start uses **attendance** when `ATTENDANCE_SERVICE_URL` is set; modes **`JTS_TIMER_ATTENDANCE_MODE`**: `strict` | `auto`
- `GET /tasks/:id/timer` returns bundle `{ activeTimer, sessions, totalDurationSeconds }`.

### 7.4 Workflow engines (SLA, escalation, recurrence)

- **SLA persistence**
  - Fields persisted on task: `warning_at`, `breached_at`, `sla_started_at`, `sla_paused_at`, `sla_paused_seconds_total`.
  - Business-hour and calendar-time basis supported from tenant settings.
  - SLA pauses when status is `ON_HOLD`.
- **Escalation ladder**
  - Automated ladder levels: `L0`, `L1`, `L2`, `L3`.
  - Trigger types: `SLA_BREACH`, `NO_ACCEPTANCE`, `NO_ACTIVITY`, `REPEATED_REJECTIONS`.
  - Escalation events stored and notifications dispatched.
- **Recurrence**
  - Rule CRUD under `/recurrence-rules`.
  - Background generator creates tasks from active due rules and advances `next_run_at`.

### 7.5 Catalog / admin

`docs/JTS_COMPLETE_DOCUMENTATION.md` § legacy list still applies: org nodes, employees, task types, SLA, policies, etc. **Employee linking:** `docs/JTS_EMPLOYEE_SYNC.md`.

### 7.6 Performance & notifications

- Performance: `/performance/...`  
- Notifications: **`/api/v1/notifications/...`** (not under `/jts` prefix)  
- Go-live / SES: `docs/JTS_NOTIFICATIONS_GO_LIVE.md`
- Task-event notifications are emitted for assignment/accept/reject/review/comment/upload/complete/reopen/block/cancel + approval requested/result + due soon/overdue/escalation.

### 7.7 Internal API (Pattern B — no user JWT)

**Only when `JTS_INTERNAL_SERVICE_TOKEN` is set** (≥ 8 characters, use a Secret in K8s).

- **`GET /api/jts/internal/tenant-analytics`** (alias: **`/jts/internal/tenant-analytics`**)  
- Headers: **`X-JTS-Internal-Token`**, **`X-Tenant-Id`** (valid tenant ObjectId)  
- Response: same shape as **`GET /api/jts/analytics`**  
- **Do not** expose on public ingress without network restrictions.

**Details:** `docs/JTS_SERVER_TO_SERVER_INTEGRATION.md` § Pattern B.

---

## 8. Cross-service integrations

### 8.1 JTS → other services

| Target | Purpose | Env |
|--------|---------|-----|
| **attendance-service** | Timer start: `GET .../api/attendance/today` | `ATTENDANCE_SERVICE_URL`, optional `JTS_ATTENDANCE_CHECK=false` |
| **realtime-service** | In-app notification fan-out | `REALTIME_SERVICE_URL` |
| **AWS S3** | Attachment presign | `JTS_ATTACHMENTS_S3_*`, `AWS_REGION`, IAM |
| **AWS SES / SNS** | Email / SMS | `NOTIFICATION_PROVIDER_MODE`, etc. |

### 8.2 Other services → JTS (server-to-server)

| Caller | Calls | Env |
|--------|--------|-----|
| **hr-service** | `GET /api/jts/tasks/summary/me`, `GET /api/jts/analytics` (dashboard widgets) | `JTS_SERVICE_URL` |
| **attendance-service** | `GET /api/jts/tasks/summary/me` on **`GET /api/attendance/today`** (self) | `JTS_SERVICE_URL`, `ATTENDANCE_JTS_*` |

**Guide:** `docs/JTS_SERVER_TO_SERVER_INTEGRATION.md`  
**Frontend widget shapes:** `docs/HR_DASHBOARD_JTS_WIDGETS_FRONTEND.md`

### 8.3 Browser → JTS

HRMS MFE uses the **same JWT** as the rest of the stack; base URL is the **ingress host** + `/api/jts` or `/jts`.

---

## 9. Environment variables (essential)

| Variable | Role |
|----------|------|
| `NODE_ENV`, `PORT` (3018) | Runtime |
| `MONGO_URI` / `MONGODB_URI`, `MONGO_DB_NAME` / `DB_NAME` | DocumentDB |
| `JWT_SECRET` | **Must match auth-service** |
| `REDIS_URL` | Connection (queues not Redis-backed for notifications) |
| `JTS_PUBLIC_PATH_PREFIX` | `/jts` or `/api/jts` for links in JSON |
| `ATTENDANCE_SERVICE_URL` | Timer clock-in check |
| `JTS_TIMER_ATTENDANCE_MODE` | `strict` \| `auto` |
| `REALTIME_SERVICE_URL` | In-app push |
| `JTS_ATTACHMENTS_S3_*`, `AWS_REGION` | Attachments |
| `NOTIFICATION_*`, `SES_*`, `SNS_*` | Notifications |
| `JTS_INTERNAL_SERVICE_TOKEN` | Optional internal analytics route |
| `ENABLE_BACKGROUND_JOBS` | Disable all cron jobs when `false` |

**More:** `microservices/jts-service/ENVIRONMENT_VARIABLES.md` (if present), `microservices/env.example`.

---

## 10. Local dev & smoke

```bash
cd microservices/jts-service
npm install
npm run dev   # or npm start
npm run smoke # no Mongo required; health + 401 gates + internal 503 when token unset
```

**Docker (standalone):** `docker-compose.standalone.yml`, `.env.docker.example`, `docker-up.sh` — avoids host Mongo/Redis port clashes by default.

---

## 11. Production deploy (AWS EKS + Ingress)

### 11.1 One-shot (image + deployment + ALB ingress)

From **repo root** (Docker, AWS CLI, `kubectl` → prod):

```bash
chmod +x scripts/deploy-jts-aws.sh   # once
./scripts/deploy-jts-aws.sh
```

- Build/push **ECR** `etelios-jts-service`  
- `kubectl apply` **`k8s/etelios-prod/jts-service-deployment.yaml`**  
- `kubectl apply` **`k8s/ingress-alb-fixed.yaml`** (unless `APPLY_INGRESS=0`)  
- Rollout restart  

**YAML-only:** `./scripts/apply-jts-prod-yamls.sh`

**Full write-up:** `docs/JTS_PROD_DEPLOY.md`  
**GitHub Actions + secrets:** `docs/GITHUB_ACTIONS_JTS_SECRETS.md`

### 11.2 K8s files (Etelios prod)

- `k8s/etelios-prod/jts-service-deployment.yaml` — Deployment + Service **3018**  
- `k8s/ingress-alb-fixed.yaml` — **`/jts`**, **`/api/jts`** → `jts-service:3018`

### 11.3 Post-deploy checks

```bash
kubectl -n etelios-prod get pods -l app=jts-service
kubectl -n etelios-prod logs -l app=jts-service --tail=100
kubectl -n etelios-prod port-forward svc/jts-service 3018:3018
curl -sS http://127.0.0.1:3018/health
```

Authenticated example (ingress):

```bash
curl -sS -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT_ID" \
  "https://<api-host>/jts/tasks?page=1&limit=5"
```

---

## 12. JTS `Employee` link (dashboard & `/summary/me`)

Task counts for a **user** need a **JTS `Employee`** row matched by:

1. `Employee._id === JWT sub` (rare)  
2. **`auth_user_id ===` Auth User `_id`**  
3. **`code` ===** normalized JWT **`employee_id`**

**Playbook:** `docs/JTS_EMPLOYEE_SYNC.md` (`bind-from-jwt`, admin APIs).

---

## 13. Troubleshooting

| Symptom | Likely cause | Action |
|---------|----------------|--------|
| `/jts/...` → **`auth-service`** or wrong body | Ingress order / backend | Fix Ingress: **`/jts`** before catch-all **`/`**; apply `ingress-alb-fixed.yaml` |
| Gateway **hint** JSON | Traffic hits **api-gateway** app | Remove gateway from path or fix ALB rules |
| `CreateContainerConfigError` | Wrong Secret **keys** for Mongo | Align with `docdb-credentials` like auth/hr |
| Rollout stuck | CPU / `Terminating` pod | `Recreate` strategy, 1 replica, `docs/JTS_PROD_DEPLOY.md` §6 |
| 401 on JTS | Token / `JWT_SECRET` | Align secret with auth-service |
| `JTS_TENANT_*` | Header vs token tenant | Send matching `X-Tenant-Id` or omit |
| `TIMER_004_ATTENDANCE_NOT_ACTIVE` | strict mode + not clocked in | Clock in or use `auto` policy |

---

## 14. Error codes

Source: `src/utils/errorResponse.js` — e.g. `TASK_001_NOT_FOUND`, `TIMER_004_ATTENDANCE_NOT_ACTIVE`, `JTS_TENANT_REQUIRED`, `JTS_ATTACHMENT_NOT_FOUND`, `JTS_INTERNAL_*`.

---

## 15. Security checklist

- [ ] Never **`TEST_MODE=true`** in prod  
- [ ] **`JWT_SECRET`** aligned with auth-service  
- [ ] **`JTS_INTERNAL_SERVICE_TOKEN`** only in-cluster; **no** public ingress to `/api/jts/internal`  
- [ ] Prefer IAM roles for AWS over long-lived keys  
- [ ] Tenant header matches token when header is used  

---

## 16. Related documentation index

| Document | Topic |
|----------|--------|
| **This file** | Master reference |
| `JTS_PROD_DEPLOY.md` | ECR, kubectl, ingress, rollout |
| `JTS_SERVER_TO_SERVER_INTEGRATION.md` | HR / attendance / internal token |
| `JTS_HRMS_MFE_BACKEND_ALIGNMENT.md` | MFE paths & payloads |
| `JTS_API_REFERENCE.md` | Endpoint-oriented reference |
| `JTS_BLUEPRINT_GAP_ANALYSIS.md` | Target blueprint vs **implemented** backend (schema + API gaps) |
| `JTS_EMPLOYEE_SYNC.md` | Linking users to JTS employees |
| `JTS_INGRESS_ONLY_NO_GATEWAY.md` | Ingress-only troubleshooting |
| `HR_DASHBOARD_JTS_WIDGETS_FRONTEND.md` | Dashboard + attendance `jtsTasks` |
| `JTS_NOTIFICATIONS_GO_LIVE.md` | SES / realtime notifications |
| `JTS_REAL_DATA_VALIDATION_10_CALLS.md` | Live API validation |
| `JTS_DOCKER_SEEDHA_DEPLOY.md` | Docker / seed flows |
| `GITHUB_ACTIONS_JTS_SECRETS.md` | CI secrets |

---

## 17. “JTS live in prod” checklist

- [ ] Pods **Ready**, Service **3018**  
- [ ] Ingress: **`/jts`** + **`/api/jts`** → **jts-service**  
- [ ] Mongo / Redis / S3 / SES (as needed) configured  
- [ ] **`JWT_SECRET`**, **`JTS_PUBLIC_PATH_PREFIX`** correct for public URLs  
- [ ] **`hr-service` / `attendance-service`** **`JTS_SERVICE_URL`** if using dashboard or today enrichment  
- [ ] JTS **Employee** records or **bind-from-jwt** for real users (non-zero task widgets)  

---

*Last consolidated update: includes session-based timers, SLA persistence/pause, L0-L3 escalation automation, recurrence generation job, task activities/subtasks, and standardized `meta` response envelope.*
