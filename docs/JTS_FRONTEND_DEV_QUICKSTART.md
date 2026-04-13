# JTS — Frontend developer quickstart

**Audience:** engineers building HRMS / shell UIs against JTS  
**Service:** `jts-service`  
**Last updated:** 2026-04-02  

Use this doc for **auth headers**, **canonical URL shapes**, **SLA / ops dashboards**, and **self-tasks**. Deeper behaviour (reviews, analytics freeze, `JtsClient`) lives in the linked guides at the end.

---

## 1. How the browser should call JTS

### 1.1 Base paths

Same-origin apps usually proxy under **`/api`**, so JTS task APIs are:

| Area | Typical browser path |
|------|----------------------|
| Task CRUD & lifecycle | `/api/jts/tasks/...` |
| HRMS compat (self-tasks, analytics, reviews) | `/api/jts/...` |
| Catalog (org, employees, task types) | `/api/jts/catalog/...` |

Ingress / mobile apps may use **`/jts/...`** without the `/api` prefix — **same routes** are mounted on both prefixes in `createApp.js`.

### 1.2 Required headers (every authenticated call)

| Header | Rule |
|--------|------|
| `Authorization` | `Bearer <accessToken>` from your auth layer |
| `X-Tenant-Id` | **Must match** the tenant claim in the JWT (`tid` / `tenant id`). JTS returns **403** if the header disagrees with the token |

Optional: product-specific keys (e.g. `X-Tenant-Key`) are normalized server-side; **source of truth for isolation is the JWT + matching `X-Tenant-Id`.**

### 1.3 Response envelope

Most routes return:

```json
{
  "success": true,
  "data": { ... },
  "message": "...",
  "meta": { }
}
```

Errors:

```json
{
  "success": false,
  "code": "SOME_CODE",
  "message": "Human-readable text",
  "details": { }
}
```

Branch on **`success`**; use **`code`** for i18n / handling timers, SLA, RBAC.

---

## 2. Tasks — minimal set

| Method | Path (under `/api/jts` or `/jts`) | Notes |
|--------|-------------------------------------|--------|
| `GET` | `/tasks` | List; supports filters (`page`, `limit`, `status`, `employeeId`, …) |
| `GET` | `/tasks/:id` | Detail |
| `GET` | `/tasks/:id/sla` | SLA snapshot for one task |
| `GET` | `/tasks/:id/activities` | Activity timeline |
| `POST` | `/tasks` | Create (manager+ per RBAC); body uses camelCase aliases where supported |
| `POST` | `/tasks/:id/accept` | Assignee accepts |
| `POST` | `/tasks/:id/start` | Start work |
| `POST` | `/tasks/:id/complete` | Complete (`notes` optional) |
| `PATCH` | `/tasks/:id/status` | Status change (`status`, optional `reason`) |
| `POST` | `/tasks/:id/timer/start` | May return `400` + `TIMER_004_ATTENDANCE_NOT_ACTIVE` if attendance strict mode |

**Timer base** (mounted alongside tasks): e.g. `POST /api/jts/tasks/:id/timer/start` — see `timer.routes.js`.

---

## 3. Self-tasks

Employees create tasks for themselves (approval flow may apply per tenant policy).

| Method | Path | Body (JSON) |
|--------|------|-------------|
| `POST` | `/self-tasks` | `{ "title": "...", "description"?, "priority"?: "LOW"\|"MEDIUM"\|"HIGH"\|"CRITICAL", "type_id"?, "scope_org_node_id"?, "sla_minutes_override"? }` |
| `POST` | `/tasks/self-tasks` | Same (alias mount) |

List “my” self-tasks:

| Method | Path |
|--------|------|
| `GET` | `/self-tasks/my?page=&limit=&status=` |
| `GET` | `/tasks/my` | Same intent (compat) |

Resolve the actor via JWT → JTS **employee** row; if unresolved, APIs return **`JTS_ACTOR_EMPLOYEE_NOT_RESOLVED`**.

---

## 4. SLA alerts & executive ops (dashboard)

### 4.1 Who sees what

| Endpoint | Typical roles |
|----------|----------------|
| `GET /tasks/sla/alerts` | **Everyone authenticated** — but non-privileged users only see **their own** alerts (server enforces). Leaders: `TENANT_ADMIN`, `ADMIN`, `SUPERADMIN`, `HOD`, `COUNTRY_OPS` may omit `employeeId` and see **tenant-wide** data |
| `GET /tasks/sla/executive-summary` | **Manager+ / ops** (e.g. `MANAGER`, `STORE_MANAGER`, `CLUSTER_MANAGER`, `COUNTRY_OPS`, `TENANT_ADMIN`, `HOD`, `SUPERADMIN`, `ADMIN`) — **403** for insufficient role |
| `PATCH /tasks/sla/breach-events/:logId/acknowledge` | **Admin / ops** (`TENANT_ADMIN`, `COUNTRY_OPS`, `HOD`, `SUPERADMIN`, `ADMIN`) |

### 4.2 `GET /tasks/sla/alerts`

**Query**

- `employeeId` / `employee_id` — optional; short code, ObjectId, or resolved list filter
- `teamId` — **only honored for tenant-wide roles** (24-char hex org node)
- `limit` — default 50, max 200

**Response `data[]` items (shape)**

- `taskId`, `taskCode`, `title`, `priority`
- `status`: `"WARNING"` \| `"BREACHED"`
- `dueAt`, `remainingMinutes`
- `team`: `{ id, name, code, type } | null`
- `assignee`: `{ id, name, employeeId } | null`

Near due = `due_at` within the next **60 minutes** or already past (aligned with job thresholds).

### 4.3 `GET /tasks/sla/executive-summary`

**Query**

- `hours` — lookback for breach log timeline (1–168, default **24**)
- `teamLimit` — max rows in heatmap (default 30)
- `recentLimit` — breach audit rows (default 25)
- `teamId` — optional scope to one org node

**Response `data`**

- `generatedAt`, `windowHours`
- `summary`: `{ atRiskCount, breachedActiveCount, pendingAcknowledgments }`
- `teamHeatmap[]`: `{ teamId, name, code, type, atRisk, breached }`
- `recentBreaches[]`: audit rows with `task`, `assignee`, `delayMinutes`, ack fields, etc.

Use this for **command-centre / leadership** widgets.

### 4.4 `PATCH /tasks/sla/breach-events/:logId/acknowledge`

**Body (optional)**

- `note` / `acknowledgmentNote`
- `reasonCode` / `breach_reason_code` (short string)

**Response:** `{ success, data: { id, acknowledgedAt, breachReasonCode } }`

---

## 5. Attachments & public path

Presigned URLs and task JSON may expose paths using **`JTS_PUBLIC_PATH_PREFIX`** (e.g. `/jts` behind ALB). Align frontend asset URLs with the same prefix your ingress uses (`/api/jts` vs `/jts`).

Details: `microservices/jts-service/ENVIRONMENT_VARIABLES.md`.

---

## 6. Notifications & realtime (optional)

In-app notifications may be pushed via `realtime-service` when configured (`NOTIFICATION_REALTIME_SOCKET`, `REALTIME_SERVICE_URL` on backend). Frontend inbox endpoints for JTS-owned notifications are under the **notifications** router (`/api/v1/notifications/...`) — confirm gateway routing for your deployment.

---

## 7. Troubleshooting: API login OK but UI shows “Access denied”

Login (`POST /api/auth/login`) may return **200** while the **next** call (dashboard, JTS, HR, …) returns **403**. Many UIs show a generic **“Access denied”** for any **403**.

**What to check**

1. **Browser → Network** — Open the **first failing** request after login. Read **Response** JSON: note `code` (e.g. `JTS_TENANT_HEADER_MISMATCH`, `JTS_TENANT_REQUIRED`, RBAC codes).
2. **Login body** — For Lenstrack, include **`"tenantId": "lenstrack"`** with `email` and `password` so auth resolves the correct tenant (especially if the same email exists on multiple tenants).
3. **Headers on every authenticated request** — `Authorization: Bearer <accessToken>` and **`X-Tenant-Id`** set to the same tenant as in the JWT / login response `user.tenantId` (for Lenstrack: `lenstrack`). JTS enforces that the header **matches** the tenant in the token; mismatch → **403** (see `microservices/jts-service/src/middleware/auth.middleware.js`).
4. **Stale client state** — Clear `localStorage` keys for an old tenant, hard refresh, log in again.
5. **Ingress / CORS** — The gateway must allow the `X-Tenant-Id` header on cross-origin requests (production ingress lists it for `api.etelios.com`).

If the response `code` is **`JTS_TENANT_HEADER_MISMATCH`**, fix `X-Tenant-Id` to match `user.tenantId` from login. If **`JTS_TENANT_REQUIRED`**, tenant context could not be resolved in JTS (slug ↔ DB `Tenant` row).

---

## 8. Local / staging checks

```bash
# Health (no auth)
curl -sS "https://<host>/jts/health"

# Authenticated list (replace token + tenant)
curl -sS -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT_ID" \
  "https://<host>/jts/tasks?page=1&limit=5"
```

E2E automation example (Node, **never commit passwords**):

```bash
cd microservices/jts-service
JTS_AUTH_EMAIL='user@example.com' JTS_AUTH_PASSWORD='...' \
  node scripts/jts-e2e-sandeep-flow.js
```

(Adjust script name / copy for your user; env vars documented in the script header.)

---

## 9. Related documents (deeper dives)

| Doc | Purpose |
|-----|---------|
| `docs/JTS_FRONTEND_DEVELOPER_IMPLEMENTATION_GUIDE.md` | Canonical paths, `JtsClient`, review semantics, pitfalls |
| `docs/JTS_API_CONTRACT_V1_FRONTEND.md` | Frozen v1 contract, analytics shape |
| `docs/JTS_SERVICE_COMPLETE_API_CATALOG_BY_FUNCTION_AND_RBAC.md` | Full route matrix + RBAC |
| `docs/HOW_TO_GET_JWT_AND_TENANT_ID.md` | Login + extracting `X-Tenant-Id` |
| `microservices/jts-service/ENVIRONMENT_VARIABLES.md` | AWS / SES / ingress / attachment env |

---

## 10. Changelog (frontend-relevant)

**2026-04-02**

- SLA tenant-wide alerts + **executive summary** + **breach acknowledgement** APIs (see §4).
- Stricter **SLA alerts** visibility: non-admin users restricted to **self** when `employeeId` omitted (avoid leaking tenant-wide due tasks).

If you add UI for SLA, prioritise **`executive-summary`** for dashboards and **`sla/alerts`** for assignee / manager drill-downs.
