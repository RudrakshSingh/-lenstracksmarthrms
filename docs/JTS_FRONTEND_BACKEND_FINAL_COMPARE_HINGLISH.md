# JTS — Frontend vs Backend: Final comparison doc (Hinglish, detailed)

**Purpose:** Ek hi jagah se samjho **backend `jts-service` kya expose karta hai**, **`packages/hrms-mfe/lib/api/jts-client.ts` kya wrap karta hai**, aur **UI/product layer par abhi kya commonly missing reh sakta hai**. Code compare / sprint planning / QA regression ke liye reference.

**Last aligned to repo:** `microservices/jts-service` + `packages/hrms-mfe/lib/api/jts-client.ts` (April 2026).

---

## 0) TL;DR — kaun “source of truth” hai?

| Layer | Role |
|--------|------|
| **`jts-service` (Express)** | Asli contract: routes, Joi validation, RBAC, errors. |
| **`JtsClient` (TypeScript)** | Browser-friendly wrapper: same paths, headers, typed helpers. **Option B:** frontend backend ke peeche chale. |
| **HRMS pages / hooks** | Is monorepo mein JTS ka **typed client** hai; poora task board UI yahan har jagah tracked nahi — aksar alag frontend repo ya shell mein hota hai. Integration verify karte waqt **`JtsClient` + Next proxy** dekhna. |

**Canonical browser base (same-origin):** `{apiBase}/jts/...` jahan default `apiBase = '/api'` → **`/api/jts/...`**.

**Ingress par alias:** `/jts/...` (bina `/api`) — `createApp.js` mein dono mount hote hain.

**Headers (almost har authenticated call):**

- `Authorization: Bearer <JWT>`
- `X-Tenant-Id: <tenant Mongo ObjectId>` — **JWT ke tenant claim se match hona chahiye**, warna 403.

---

## 1) URL map — dimag mein rakho ye do “roots”

| Root | Kya iske neeche aata hai |
|------|-------------------------|
| **`/api/jts/tasks`** (ya `/jts/tasks`) | Task CRUD, lifecycle, bulk, SLA per-task, subtasks mount, activities, extension-requests, etc. |
| **`/api/jts`** (ya `/jts`) | HRMS **compat**: self-tasks, `tasks/my`, analytics slices, approvals, reviews list, `reviews/queue`, `sla-policies`, `escalations/console`, **timers active** (`/active`, `/timers/active`). |
| **`/api/jts/catalog`** | Tenants, org nodes, employees, task-types, SLA rules, escalation rules, policies — **admin / setup** surface. |
| **`/api/jts/performance`** | Performance reviews CRUD, goals, alerts, scores — **HR analytics** style. |
| **`/api/jts/recurrence-rules`** | Recurring task rules. |
| **`/api/v1/notifications`** | Notification service (JTS se alag module; same ecosystem). |

**Important naming gotcha (frontend bugs ka #1 reason):**

- **Timeline:** backend **`GET .../tasks/:id/activities`** deta hai — **`/timeline` nahi**. `JtsClient.getTaskTimeline()` internally yahi call hai.
- **Summary:** **`GET /tasks/summary/me`** aur **`GET /tasks/summary/:employeeId`** — query mein sirf `?date=`; **`GET /summary?employeeId=`** jaisa single route mat assume karna.

---

## 2) Task lifecycle — backend behavior (short)

Statuses (list queries mein commonly use): `DRAFT`, `PENDING_APPROVAL`, `ASSIGNED`, `ACCEPTED`, `IN_PROGRESS`, `ON_HOLD`, `PENDING_REVIEW`, `COMPLETED`, `REJECTED`, `BLOCKED`, `CANCELLED`, `REOPENED`.

**User-facing flows:**

- **Normal complete:** `POST /tasks/:id/complete` — checklist / timer / review gates **lag sakte** hain (policy ke hisaab se).
- **Force complete (manager+):** `POST /tasks/:id/force-complete` — privileged roles; gates override; `requires_review` ho to bhi seedha **`COMPLETED`** (queue mein nahi bhejta). Error: `JTS_FORCE_COMPLETE_FORBIDDEN` (403) agar role kam hai.
- **Reopen:** `POST /tasks/:id/reopen` — **`COMPLETED` → chain → end state `IN_PROGRESS`** (ek call mein); galat state par `TASK_REOPEN_INVALID_STATE` (400).
- **Extension:** **recommended** `POST /tasks/:id/extension-requests` (approver task se default ho sakta hai); **legacy** `POST .../approvals` with `approval_type: EXTENSION_APPROVAL`.
- **Bulk:** `POST /tasks/bulk` — max **50** ids; har task alag pass/fail; pura batch fail nahi hota.

---

## 3) Big matrix — Backend vs `JtsClient` vs UI notes

Legend:

- **BE** = `jts-service` route exists.
- **Client** = `JtsClient` method (ya obvious `request()` use).
- **UI** = product screen — is repo mein guarantee nahi; implement karna padta hai.

### 3.1 Tasks — core

| BE | Client method | UI note |
|----|----------------|---------|
| `GET/POST /tasks` (POST manager+ RBAC) | `listTasks`, `createTask` | Employee ko assign task create na kare — `createSelfTask` use karo. |
| `GET/PUT/DELETE /tasks/:id` | `getTask`, `updateTask`, `deleteTask` | PUT/DELETE manager+ roles. |
| `POST /tasks/self-tasks` | `createSelfTask` (→ `/jts/self-tasks`) | Same body ka alias: `POST /jts/tasks/self-tasks` bhi service mein hai. |
| `POST /tasks/bulk` | `bulkTasks` | Multi-select board actions. |
| `GET /tasks/workday/:workdayId` | `listWorkdayTasks` | Roster / day view. |
| `GET /tasks/summary/me`, `/summary/:employeeId` | `getTaskSummaryMe`, `getTaskSummaryForEmployee`, `getTaskSummaryPreferred` | Dashboard widgets. |
| `GET /tasks/sla/alerts` | `listSlaAlerts` | Ops widget. |
| `GET /tasks/sla/executive-summary` | ❌ client mein nahi | Manager+ dashboard; direct `fetch` ya client extend karna hoga. |
| `PATCH /tasks/sla/breach-events/:logId/acknowledge` | ❌ client mein nahi | Ops / admin console. |

### 3.2 Lifecycle & quality

| BE | Client | UI note |
|----|--------|---------|
| `POST .../accept`, `/reject`, `/start`, `/complete` | ✅ | Standard assignee/manager flows. |
| `POST .../force-complete` | `forceCompleteTask` | Sirf manager+ button. |
| `POST .../reopen` | `reopenTask` | Ek call ke baad UI mein turant **IN_PROGRESS** dikhao. |
| `POST .../cancel`, `/block`, `/unblock` | ✅ | Reason optional body. |
| `POST .../submit-review` | `submitTaskForReview` | Completeness ke baad review queue. |
| `PATCH .../status` | `patchTaskStatus` | Careful: invalid transition → error `code`. |
| `POST .../rate` | ❌ client mein nahi | Star rating flow — add karna ho to `request()` se. |
| `POST .../reassign` | ❌ client mein nahi | Manager reassignment UI. |

### 3.3 Reviews (task quality) & collaboration routes

Task ke neeche collaboration router (paths **`/tasks/:taskId/...`** style — implementation `taskCollaboration.routes.js`):

| BE (typical) | Client | UI note |
|--------------|--------|---------|
| `POST /tasks/:id/reviews` (body: `status` APPROVED / REWORK_REQUIRED) | `submitTaskReview`, `submitTaskReviewFromDecision` | UI `REJECT` / `REQUEST_CHANGES` → API **`REWORK_REQUIRED`** (`mapReviewDecisionToApiBody`). |
| `GET .../:taskId/reviews` | ❌ | History / thread UI ke liye client extend karo. |
| `GET/POST .../comments` | `listComments`, `addComment` | `message` ya `body` — backend normalize karta hai. |
| `GET .../attachments`, `presign-upload`, `presign-download`, `POST` finalize | partial: list, presign, **no download / finalize POST** | Full upload flow doc: `JTS_FRONTEND_API_FULL_REFERENCE.md`. |
| `GET/PUT .../quality` | ❌ | Quality scores UI. |
| `GET/POST .../approvals` | `createExtensionApproval` (POST); **GET list missing** | Pending queue: compat `/jts/approvals/pending` use karo. |

### 3.4 Subtasks

| BE | Client | UI note |
|----|--------|---------|
| `GET .../:id/subtasks` | `listSubtasks` | |
| `POST .../:id/subtasks` | ❌ | Subtask create. |
| `PATCH .../:id/subtasks/:subtaskId/status` | ❌ | Checkbox complete. |

### 3.5 Timer

| BE | Client | UI note |
|----|--------|---------|
| `GET/POST .../timer`, `/start`, `/pause`, `/stop`, `/sessions` | ✅ | Per-task timer. |
| `GET /jts/active` or `/jts/timers/active` | `getActiveTimers` | Pehla try, 404 par doosra — **employeeId query service ignore** kar sakta hai (JWT user). |

### 3.6 SLA per task

| BE | Client |
|----|--------|
| `GET /tasks/:id/sla` | `getTaskSla` |

### 3.7 HRMS compat (`/api/jts` — bina `/tasks`)

| BE | Client | UI note |
|----|--------|---------|
| `POST /self-tasks` | `createSelfTask` | |
| `GET /self-tasks/my`, `/tasks/my` | ❌ | “My tasks” shortcut; abhi `listTasks` filters se substitute ho sakta hai. |
| `GET /tenant/current` | ❌ | Tenant switcher / debug. |
| `GET /approvals/pending`, `.../pending/me` | `listPendingApprovals` | `approverId` optional. |
| `POST /approvals/:id/approve`, `/reject` | `approveApproval`, `rejectApproval` | Reject par **`reason` required**. |
| `GET /analytics` (+ `meta.view: full`) | `getAnalytics` | Query: **`timeRange`** (`3months` \| `6months` \| `1year`), **`department`** (OrgNode name substring), **`teamId`** (task `scope_org_node_id`). |
| `GET /analytics/overview` | `getAnalyticsOverview` | Lightweight dashboard. |
| `GET /analytics/by-employee` | `getAnalyticsByEmployee` | |
| `GET /analytics/by-team` | `getAnalyticsByTeam` | |
| `GET /analytics/by-task-type` | `getAnalyticsByTaskType` | |
| `GET /reviews` | `listPerformanceReviews` | Performance reviews list (compat controller). |
| `GET /reviews/queue` | ❌ | **Unified queue:** performance reviews + pending task approvals — **dashboard ke liye useful**; client mein add karna baaki. |
| `GET /sla-policies`, `/sla-policies/:id` | ❌ | Read-only alias of catalog SLA rules; manager+ RBAC. |
| `GET /escalations/console` | ❌ | Escalation ops snapshot. |

### 3.8 Catalog (`/api/jts/catalog`)

Poora admin surface: tenants, org-nodes, employees (`bind-from-jwt`, etc.), task-types (**`checklist_template`, `allowed_role_keys`** optional fields), sla-rules, escalation-rules, self-task policies, shifts, reporting lines, attendance records, audit logs…

**`JtsClient` mein catalog methods nahi hain** — alag admin client ya direct `fetch` / generated SDK pattern use hota hai.

### 3.9 Performance module (`/api/jts/performance`)

| BE (high level) | Client |
|-----------------|--------|
| metrics, scores, reviews CRUD, goals, acknowledge, alerts | sirf **`listPerformanceReviews`** compat path se overlap; baaki ❌ |

### 3.10 Recurrence

| BE | Client |
|----|--------|
| `/api/jts/recurrence-rules` CRUD | ❌ |

### 3.11 Notifications

| BE | Client |
|----|--------|
| `/api/v1/notifications/*` | ❌ (alag service root) |

### 3.12 Internal / server-to-server

| BE | Client |
|----|--------|
| `/api/jts/internal/...` (token header) | browser UI se **nahi** — HR/attendance workers use karte hain |

---

## 4) Response shape — frontend ko kya parse karna hai

**Success (typical):**

```json
{
  "success": true,
  "data": { },
  "message": "...",
  "meta": { }
}
```

`createApp.js` middleware **har JSON response par `meta` ensure** karta hai (kabhi pagination fields `meta` mein merge).

**Errors:**

```json
{
  "success": false,
  "code": "SOME_CODE",
  "message": "Human readable",
  "details": { }
}
```

**List endpoints (tasks, workday):** `meta.pagination` + top-level `page` / `limit` / `total` consistency (`httpEnvelope` / `buildListResponse`) — purane UI sirf `data` array parse karein to pagination miss ho sakti hai.

**Analytics:** response mein **`meta.filters`** (echo) aur mismatch par **`filtersEmpty: true`** possible.

---

## 5) Naming conventions — snake_case vs camelCase

Backend Joi schemas **aksar dono** accept karti hain (`dueAt` / `due_at`, `assignedToEmployeeId` / `assigned_to_employee_id`).  

**Recommendation:** naye frontend code mein **camelCase** likho; `JtsClient` extension APIs mein bhi camel primary, legacy ke liye spread optional.

---

## 6) RBAC — rough groups (detail ke liye RBAC doc dekho)

- **Task create / update / delete / reassign:** manager-tier roles (`MANAGER`, `STORE_MANAGER`, … `TENANT_ADMIN`, `HOD`).
- **Force complete:** manager-tier **+** `SUPERADMIN`, `ADMIN`.
- **Self-task create:** authenticated employee (approval policy tenant-specific).
- **Kuch analytics / SLA policies / escalations / review queue:** `readRoles` set (manager+ / admin style) — exact list `hrmsJtsCompat.routes.js` mein.

UI mein **button hide** + **API error handle** dono rakho (tampering se 403 aata hai).

---

## 7) “Pehle docs mein galat / purana” — kya ab update maanna hai

- **`docs/JTS_FRONTEND_DEVELOPER_IMPLEMENTATION_GUIDE.md`** ke TL;DR mein likha tha: extension sirf approvals se, bulk/force-complete backend mein nahi — **ab ye stale hai** (service + client dono update ho chuke).
- **`docs/JTS_BLUEPRINT_GAP_ANALYSIS.md`** — historical; **current truth** ke liye is doc + `JTS_FRONTEND_BACKEND_JO_ABHI_KIYA_HINGLISH.md` use karo.

---

## 8) Sprint-style gap list — agar “100% UI parity” chahiye

**High value, client mein abhi nahi (common):**

1. `GET /reviews/queue` — unified manager dashboard.  
2. `GET /sla-policies` (+ by id) — read-only policy browser.  
3. `GET /escalations/console` — ops / HOD console.  
4. Task collaboration: `GET` reviews, `GET` approvals list, attachment **download presign** + **finalize POST**.  
5. `PUT/GET` quality scores.  
6. Subtask **create** + **status patch**.  
7. `POST .../reassign`, `POST .../rate`.  
8. SLA **executive summary** + breach **acknowledge**.  
9. Compat shortcuts: `GET /self-tasks/my`, `/tasks/my`, `/tenant/current` (optional sugar).  
10. Catalog + recurrence + full performance + notifications — **alag modules**; product decide kare scope.

---

## 9) Quick reference — important paths (copy)

```
# Tasks
GET    /api/jts/tasks
POST   /api/jts/tasks
POST   /api/jts/tasks/bulk
GET    /api/jts/tasks/:id
PUT    /api/jts/tasks/:id
DELETE /api/jts/tasks/:id
POST   /api/jts/tasks/:id/complete
POST   /api/jts/tasks/:id/force-complete
POST   /api/jts/tasks/:id/reopen
POST   /api/jts/tasks/:id/extension-requests
GET    /api/jts/tasks/:id/activities

# Compat
POST   /api/jts/self-tasks
GET    /api/jts/analytics
GET    /api/jts/analytics/overview
GET    /api/jts/analytics/by-employee
GET    /api/jts/analytics/by-team
GET    /api/jts/analytics/by-task-type
GET    /api/jts/reviews/queue
GET    /api/jts/sla-policies
GET    /api/jts/sla-policies/:id
GET    /api/jts/escalations/console
```

---

## 10) Files jahan detail aur tools milenge

| File | Use |
|------|-----|
| `packages/hrms-mfe/lib/api/jts-client.ts` | Frontend integration contract (typed). |
| `microservices/jts-service/src/routes/task.routes.js` | Task validation + route order (sub-routes before `GET /:id`). |
| `microservices/jts-service/src/routes/hrmsJtsCompat.routes.js` | HRMS compat paths. |
| `microservices/jts-service/scripts/lib/jtsEndpointManifest.js` | Automation / contract scripts ke liye route list. |
| `docs/JTS_FRONTEND_BACKEND_JO_ABHI_KIYA_HINGLISH.md` | Recent backend behaviour (bulk, force, reopen, analytics filters) Hinglish. |
| `docs/JTS_SERVICE_COMPLETE_API_CATALOG_BY_FUNCTION_AND_RBAC.md` | RBAC-by-endpoint deep dive. |

---

*Yeh doc “final compare” snapshot hai: backend surface zyada bada hai than `JtsClient`; UI completeness alag repo / team par depend karti hai. Naya endpoint add karte waqt pehle `task.routes.js` / compat routes verify karo, phir `JtsClient` + is table ko update karna best practice hai.*
