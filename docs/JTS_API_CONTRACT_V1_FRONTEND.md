# JTS API contract — frontend handoff (v1.1.0)

**Service:** `jts-service`  
**Document version:** 1.1.0 (2026-03-25)  
**Purpose:** Freeze paths, payloads, and response shapes for HRMS MFE mappers. OpenAPI is not generated yet; this doc is the interim source of truth.

**Browser base (typical):** same-origin `/api` → proxy to JTS, so paths below are written as **`/api/jts/...`**. Ingress may also expose **`/jts/...`** without the `/api` prefix (same routers mounted in `createApp.js`).

---

## 1) Task review semantics (`POST .../tasks/:taskId/reviews`)

**Stored review outcome (task quality review, not “reject assignment”):** only two values exist in the API and persistence:

| Request body `status` | Stored `TaskReview.status` | Task transition when task is `PENDING_REVIEW` |
|------------------------|---------------------------|-----------------------------------------------|
| `APPROVED` | `APPROVED` | Task → `COMPLETED` |
| `REWORK_REQUIRED` | `REWORK_REQUIRED` | Task → `IN_PROGRESS` |

**Answer to “REJECT vs REQUEST_CHANGES”:** the backend does **not** distinguish them. Both UI intents must map to **`status: "REWORK_REQUIRED"`** (same stored status and same transition). Use **`remarks`** / **`notes`** in the UI to explain reject vs request-changes.

**Different feature — assignment rejection:** `POST .../tasks/:id/reject` moves the **task** to status `REJECTED` (lifecycle), unrelated to the review endpoint above.

---

## 2) Previously “unsupported” — now implemented (April 2026)

**Authoritative status:** see **`docs/JTS_BACKEND_GAP_CLOSURE_STATUS_APRIL_2026.md`**.

| Capability | Status | Notes |
|------------|--------|--------|
| **`POST .../tasks/:id/force-complete`** | **Implemented** | Manager+ roles; bypasses checklist/timer blocks where service allows. Standard error body (`code`, `message`). |
| **`POST .../tasks/:id/extension-requests`** | **Implemented** | Route exists on task stack (`task.routes.js`). |
| **`POST .../tasks/bulk`** | **Implemented** | Body: `{ action, taskIds[], payload? }` — max 50 ids; see `task.controller.bulkTasks`. |

Older rows below kept only as **history**; prefer the closure doc + OpenAPI when added.

---

## 2.1 v2 decision notes (explicit)

These are product/backend decisions recorded so frontend SDK methods can be re-enabled cleanly later.

- **`POST .../tasks/:id/force-complete` (v2)**: **Candidate**, not scheduled.
  - **Decision**: May return only if product requires role-gated bypass of normal completion rules.
  - **Contract requirements if added**:
    - mandatory `{ reason: string }` for audit
    - strict role allow-list (e.g. `TENANT_ADMIN`, `HR`, `HOD`)
    - activity log event emitted with actor + reason

- **`POST .../tasks/bulk` (v2)**: **Not planned** by default (out of scope).
  - **Decision**: Only implement if UI performance/ops requires it.
  - **Contract requirements if added**:
    - explicit `action` enum
    - per-task result array: `[{ taskId, success, code?, message? }]`
    - hard request limits (max ids) and idempotency guidance

---

## 3) Analytics — `GET /api/jts/analytics` response schema (freeze for mappers)

**Query (validated on route):** `timeRange` ∈ `3months` | `6months` | `1year` (optional), `department` (optional string), `teamId` (optional ObjectId string).  
**Note:** `range` / `from` / `to` are **not** read by this handler today; send only the supported params until v2.

**Success envelope** (after JSON `meta` middleware — see §7):

```json
{
  "success": true,
  "data": {
    "overall": {
      "avgRating": null,
      "totalReviews": 0,
      "completedTasks": 0,
      "pendingTasks": 0,
      "onTimeCompletion": null
    },
    "byDepartment": [
      {
        "name": "string",
        "avgRating": null,
        "tasksCompleted": 0,
        "tasksPending": 0,
        "onTime": null
      }
    ],
    "trends": {
      "ratings": [],
      "tasksCompleted": [],
      "onTimeCompletion": [],
      "monthlyPerformance": [
        {
          "date": "ISODate",
          "score": 0
        }
      ]
    },
    "byStatus": {},
    "openAlerts": 0
  },
  "message": "Analytics summary retrieved successfully",
  "meta": {}
}
```

**Key meanings (frozen names):**

- **`overall.avgRating`**: number \| null — mean of `manager_rating` from performance reviews sample (up to 200).
- **`overall.totalReviews`**: number — count of reviews in that sample.
- **`overall.completedTasks`**: number — aggregate count of tasks in statuses treated as “completed” for this widget (`COMPLETED` + `PENDING_REVIEW`).
- **`overall.pendingTasks`**: number — sum of `ASSIGNED`, `ACCEPTED`, `IN_PROGRESS`, `ON_HOLD`, `PENDING_APPROVAL`.
- **`overall.onTimeCompletion`**: number \| null — % of `COMPLETED` tasks with `completed_at <= due_at` (null if no completed tasks).
- **`byDepartment[]`**: one row per org node id with aggregated task stats; **`name`** from org node or `"Unknown"`.
- **`trends.ratings`**: last up to 12 numeric ratings from the review sample.
- **`trends.tasksCompleted`**: parallel array — `byDepartment[i].tasksCompleted` in department order.
- **`trends.onTimeCompletion`**: parallel array — `byDepartment[i].onTime` or `0`.
- **`trends.monthlyPerformance`**: up to 12 monthly `PerformanceScore` rows (`period_type: MONTHLY`).
- **`byStatus`**: object map `{ [taskStatus: string]: count }` from aggregation.
- **`openAlerts`**: count of alerts where `resolved_at` is falsy (from performance alerts list, limit 50).

**Optional split endpoints** (`/analytics/overview`, `/by-employee`, …): **not implemented** in v1; do not rely on them.

---

## 4) Approvals pending — `approvalType` filter

**`GET /api/jts/approvals/pending`**

- **Validated query:** `approverId` only (`stripUnknown: true` on validation).
- **Controller:** loads all pending approvals for the resolved approver; **does not filter by `approvalType`**.

**Answer:** **`approvalType` is not officially supported** in v1. Passing it is ignored (and may be stripped). Frontend may filter **`data[]`** client-side using fields on each row (see `TaskApproval` / serializer output). If server-side filter is required, add a **v2** query param and implementation.

---

## 5) Timeline — canonical path

**Canonical:** **`GET /api/jts/tasks/:id/activities`** (optional `?limit=`).

**`/timeline`:** **not mounted** in current `task.routes.js`. Treat **`/activities` as the only stable contract** for v1. A `/timeline` alias would be optional compatibility only if backend adds it later.

---

## 6) Workday tasks — canonical path

**Canonical:** **`GET /api/jts/tasks/workday/:workdayId`** (list query schema same family as task list).

**Alternate shape** (e.g. `/api/jts/workday/:id/tasks`): **not mounted** on `hrmsJtsCompat` in the reverted tree. **v1 frontend should use only the canonical path.** Removing old aliases from frontend is correct; do not depend on `/workday/.../tasks` unless you re-introduce it on the server.

---

## 7) Error & success JSON contract (as implemented — v1 honesty)

### 7.1 Success JSON wrapper

For most **object** responses, `createApp.js` ensures:

- If the handler did not set **`meta`**, it sets **`meta`** to **`pagination`** if present, else **`{}`**.

So typical success:

```json
{
  "success": true,
  "data": {},
  "message": "…",
  "meta": {}
}
```

List endpoints may include **`page`**, **`limit`**, **`total`**, **`pagination`** at top level in addition to **`meta`**.

### 7.2 Error shapes (v1.1.0 stabilization pass)

Minimum guaranteed keys across **all** error responses:

- `success: false`
- `code: string`
- `message: string`
- `details?: string[]` (only when applicable)

Backwards compatibility:

- `error` is kept as an alias of `code` for older clients.

Typical shapes:

| Situation | HTTP | Body (typical) |
|-----------|------|----------------|
| Auth missing / bad JWT | 401 | `{ "success": false, "code": "AUTH_REQUIRED", "message": "Access token required", "error": "AUTH_REQUIRED" }` |
| Tenant missing / header mismatch | 403 | `{ "success": false, "code": "JTS_TENANT_REQUIRED", "message": "...", "error": "JTS_TENANT_REQUIRED" }` |
| Joi validation | 400 | `{ "success": false, "code": "VALIDATION_ERROR", "message": "Validation failed", "details": ["..."], "error": "VALIDATION_ERROR" }` |
| Domain / mapped errors | varies | `{ "success": false, "code": "<CODE>", "message": "<CODE>", "error": "<CODE>" }` |
| Unknown route | 404 | `{ "success": false, "code": "ROUTE_NOT_FOUND", "message": "Route not found", "path": "...", "method": "...", "service": "jts-service", "error": "ROUTE_NOT_FOUND" }` |
| Unhandled exception handler | 500 | `{ "success": false, "code": "INTERNAL_ERROR", "message": "Internal server error", "error": "INTERNAL_ERROR" }` |

**Frontend guidance:** branch on **`success === false`**, then prefer **`code`**, then **`message`**, then **`error`** string. **`meta`** on errors is usually absent; success may always have **`meta`** (possibly `{}`).

**v2 recommendation:** drop legacy `error` alias and standardize richer `details` objects (field-level), once all clients have migrated.

---

## 8) Sample payloads (pack)

### 8.1 Create task — `POST /api/jts/tasks` (manager roles)

```json
{
  "title": "Stock audit — Zone A",
  "description": "Count and reconcile",
  "priority": "HIGH",
  "assignedToEmployeeId": "507f1f77bcf86cd799439011",
  "typeId": "507f1f77bcf86cd799439012",
  "scopeOrgNodeId": "507f1f77bcf86cd799439013",
  "dueAt": "2026-04-01T18:30:00.000Z",
  "requiresReview": true,
  "requiresEvidence": false,
  "requiresTimer": false,
  "reviewerEmployeeId": "507f1f77bcf86cd799439014",
  "dependencyTaskIds": ["507f1f77bcf86cd799439015"]
}
```

### 8.2 Task review — `POST /api/jts/tasks/:taskId/reviews`

```json
{
  "status": "REWORK_REQUIRED",
  "rating": 4,
  "remarks": "Please fix section 2 and re-submit.",
  "checklist_score": 72
}
```

### 8.3 Extension via approval — `POST /api/jts/tasks/:taskId/approvals`

```json
{
  "approver_employee_id": "507f1f77bcf86cd799439020",
  "approval_type": "EXTENSION_APPROVAL",
  "payload": {
    "requestedDueAt": "2026-04-10T18:30:00.000Z",
    "reason": "Waiting on supplier invoice"
  }
}
```

### 8.4 Attachment presign — `POST /api/jts/tasks/:taskId/attachments/presign-upload`

```json
{
  "file_name": "proof.jpg",
  "mime_type": "image/jpeg"
}
```

### 8.5 Approve / reject (compat) — `POST /api/jts/approvals/:approvalId/approve` | `/reject`

Approve:

```json
{ "notes": "Approved for extension" }
```

Reject:

```json
{ "reason": "Not justified for this cycle" }
```

---

## 9) OpenAPI

**Swagger/OpenAPI:** not published from `jts-service` today.

**Interim artifacts:**

1. This file (**versioned** — bump **`Document version`** on any breaking JSON or path change).
2. Optional: generate OpenAPI from this doc later, or add `swagger-jsdoc` in a follow-up.

---

## 10) Changelog

| Version | Date | Notes |
|---------|------|--------|
| 1.0.0 | 2026-03-25 | Initial frontend freeze doc from code inspection (`taskCollaboration.service`, `hrmsJtsCompat.controller`, `validate.middleware`, `createApp`, `auth.middleware`, `errorResponse`). |
| 1.1.0 | 2026-03-25 | Backend error schema stabilized: all errors now include `{ code, message, details? }` (legacy `error` kept as alias). Route-404 now includes `code: ROUTE_NOT_FOUND`. |
