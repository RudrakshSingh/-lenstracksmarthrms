# JTS Frontend Developer Implementation Guide

**Date:** 2026-03-25  
**Audience:** frontend engineers integrating JTS in HRMS/Shell  
**Primary backend:** `microservices/jts-service`  
**Frontend integration layer:** `packages/hrms-mfe/lib/api/jts-client.ts`  
**Contract baseline:** `docs/JTS_API_CONTRACT_V1_FRONTEND.md` (v1.1.0)

---

## TL;DR (5-minute onboarding)

If you are new to JTS integration, do these first:

- **Use one client**: call JTS only via `packages/hrms-mfe/lib/api/jts-client.ts` (don’t ad-hoc `fetch` from pages).
- **Canonical paths**:
  - tasks: `/api/jts/tasks/*`
  - timeline: `/api/jts/tasks/:id/activities` (not `/timeline`)
  - workday: `/api/jts/tasks/workday/:workdayId`
  - timer active: `/api/jts/active` (fallback `/api/jts/timers/active`)
- **Review decisions**:
  - UI `APPROVE` → API `APPROVED`
  - UI `REJECT` and `REQUEST_CHANGES` → API `REWORK_REQUIRED`
- **Extensions**: there is no `/extension-requests`; use approvals:
  - `POST /api/jts/tasks/:taskId/approvals` with `approval_type: "EXTENSION_APPROVAL"`
- **Bulk + force-complete**: not implemented in backend v1; do iterative calls and normal `complete`.
- **Errors**: backend returns `{ success:false, code, message, details? }` (legacy `error` may also exist). Always branch on `success`.

### Copy-paste: create and use `JtsClient`

```ts
import { JtsClient } from '@/lib/api/jts-client';

// Provide these from your auth/session layer.
const jts = new JtsClient({
  apiBase: '/api',
  getAccessToken: async () => {
    // return the raw token or `Bearer <token>`; client normalizes
    return session?.accessToken ?? null;
  },
  getTenantId: async () => session?.tenantId ?? null
});

// Example: list my tasks
const tasks = await jts.listTasks({ page: 1, limit: 25, status: 'IN_PROGRESS' });

// Example: submit review decision from UI
await jts.submitTaskReviewFromDecision(taskId, {
  decision: 'REQUEST_CHANGES',
  notes: 'Please attach evidence and re-submit.',
  rating: 4
});
```

## 1) Purpose of this guide

This document explains exactly how frontend should integrate with the **current live backend contract** and avoid known pitfalls.

Use this as the implementation playbook for:

- endpoint selection (canonical paths),
- payload shapes,
- error handling,
- parser expectations,
- migration and QA checks before release.

---

## 2) Canonical integration model

## 2.1 Base URL model

Frontend should call JTS through same-origin API proxy when possible:

- Browser base: `/api`
- JTS root: `/api/jts`
- Task stack: `/api/jts/tasks`

The client abstraction in this repo already follows this model:

- `packages/hrms-mfe/lib/api/jts-client.ts`

## 2.2 Auth headers

Send on authenticated calls:

- `Authorization: Bearer <token>`
- `X-Tenant-Id: <tenantId>` (when available; must match token tenant)

If token is missing or tenant header mismatches token tenant, backend returns standardized error payload (see section 8).

---

## 3) Canonical endpoint map (frontend should rely on these)

## 3.1 Tasks core

- `GET /api/jts/tasks`
- `POST /api/jts/tasks`
- `GET /api/jts/tasks/:id`
- `PUT /api/jts/tasks/:id`
- `DELETE /api/jts/tasks/:id`
- `PATCH /api/jts/tasks/:id/status`

## 3.2 Lifecycle actions

- `POST /api/jts/tasks/:id/accept`
- `POST /api/jts/tasks/:id/reject`
- `POST /api/jts/tasks/:id/start`
- `POST /api/jts/tasks/:id/complete`
- `POST /api/jts/tasks/:id/reopen`
- `POST /api/jts/tasks/:id/cancel`
- `POST /api/jts/tasks/:id/submit-review`
- `POST /api/jts/tasks/:id/block`
- `POST /api/jts/tasks/:id/unblock`

## 3.3 Timeline/workday/summary

- Timeline (canonical): `GET /api/jts/tasks/:id/activities`
- Workday tasks (canonical): `GET /api/jts/tasks/workday/:workdayId`
- My summary: `GET /api/jts/tasks/summary/me?date=YYYY-MM-DD`
- Employee summary: `GET /api/jts/tasks/summary/:employeeId?date=...`

## 3.4 Reviews/comments/attachments/subtasks

- Reviews list/create: `GET|POST /api/jts/tasks/:taskId/reviews`
- Comments list/create: `GET|POST /api/jts/tasks/:taskId/comments`
- Attachments list/create: `GET|POST /api/jts/tasks/:taskId/attachments`
- Presign upload: `POST /api/jts/tasks/:taskId/attachments/presign-upload`
- Presign download: `GET /api/jts/tasks/:taskId/attachments/:attachmentId/presign-download`
- Subtasks: `GET|POST /api/jts/tasks/:id/subtasks`
- Subtask status update: `PATCH /api/jts/tasks/:id/subtasks/:subtaskId/status`

## 3.5 Timer

- Task timer bundle: `GET /api/jts/tasks/:id/timer`
- Timer start/pause/stop: `POST /api/jts/tasks/:id/timer/start|pause|stop`
- Timer sessions: `GET /api/jts/tasks/:id/timer/sessions`
- Active timers: `GET /api/jts/active` (fallback `GET /api/jts/timers/active`)

## 3.6 Approvals + analytics (compat root)

- Pending approvals: `GET /api/jts/approvals/pending?approverId=...`
- Approve: `POST /api/jts/approvals/:approvalId/approve`
- Reject: `POST /api/jts/approvals/:approvalId/reject`
- Analytics (full): `GET /api/jts/analytics` — response includes `meta.view: full`
- Slices (same query params; smaller payloads): `GET /api/jts/analytics/overview`, `/analytics/by-employee`, `/analytics/by-team`, `/analytics/by-task-type`
- Reviews list (performance): `GET /api/jts/reviews`

### Reopen → in progress (single call)

`POST /api/jts/tasks/:id/reopen` performs **COMPLETED → REOPENED → IN_PROGRESS** in one request (status history shows both steps). The UI does **not** need a separate `start` after reopen.

---

## 4) Optional / batch endpoints (v1+)

These are **implemented** on `jts-service` (also reachable via HR proxy `/api/jts/...`):

- `POST /api/jts/tasks/:id/force-complete` — manager+ only; bypasses checklist/timer gates and the review queue (always lands in `COMPLETED`).
- `POST /api/jts/tasks/:id/extension-requests` — creates an `EXTENSION_APPROVAL` (approver defaults from task when omitted); payload: `newDueAt` and/or `extensionMinutes`, etc.
- `POST /api/jts/tasks/bulk` — body `{ action, taskIds[], payload? }` with `action` in `complete | force_complete | accept | reject | start | cancel`; per-task errors collected in `data.failed`.

**Still supported alternative:** extension can also be created via `POST /api/jts/tasks/:taskId/approvals` with `approval_type: EXTENSION_APPROVAL`.

---

## 5) Review semantics (important)

For task review submit (`POST /tasks/:taskId/reviews`):

- backend accepted statuses: `APPROVED` or `REWORK_REQUIRED`
- UI mapping:
  - `APPROVE` -> `APPROVED`
  - `REJECT` -> `REWORK_REQUIRED`
  - `REQUEST_CHANGES` -> `REWORK_REQUIRED`

Use text field to preserve intent:

- send `remarks` (or map from UI notes)

Do not expect separate backend status for `REJECT` vs `REQUEST_CHANGES`.

---

## 6) Extension approval payload pattern (replacement flow)

For requesting deadline extension, use approvals endpoint:

- `POST /api/jts/tasks/:taskId/approvals`

Recommended payload:

```json
{
  "approver_employee_id": "507f1f77bcf86cd799439020",
  "approval_type": "EXTENSION_APPROVAL",
  "payload": {
    "requestedDueAt": "2026-04-10T18:30:00.000Z",
    "reason": "Dependency pending from external team"
  }
}
```

---

## 7) Analytics parser contract (frozen keys)

Frontend parser should consume:

- `data.overall`
  - `avgRating`, `totalReviews`, `completedTasks`, `pendingTasks`, `onTimeCompletion`
- `data.byDepartment[]`
  - `name`, `avgRating`, `tasksCompleted`, `tasksPending`, `onTime`
- `data.trends`
  - `ratings`, `tasksCompleted`, `onTimeCompletion`, `monthlyPerformance[]`
- `data.byStatus`
- `data.openAlerts`

Query params currently supported by backend analytics route:

- `timeRange` (`3months` | `6months` | `1year`)
- optional `department`
- optional `teamId`

Avoid `range/from/to` until backend explicitly supports them.

---

## 8) Unified error handling contract (frontend implementation)

Backend now standardizes to:

```json
{
  "success": false,
  "code": "STRING_CODE",
  "message": "Readable message",
  "details": []
}
```

Back-compat:

- `error` is still present as alias of `code` in many responses.

Frontend error parser priority:

1. `code`
2. `message`
3. fallback `error`

Safe UI strategy:

- show user-friendly mapped message for known codes,
- show generic fallback for unknown codes,
- keep `details[]` handling for validation to show field-level hints.

---

## 9) Frontend coding recommendations

## 9.1 API client layer

- Keep all JTS HTTP calls centralized in `jts-client.ts`.
- Do not create ad-hoc `fetch` calls in pages/components.
- Add endpoint wrappers before UI integration.

## 9.2 Normalization and parsing

- Keep response normalization tolerant to envelope differences (`data`, arrays, nested keys).
- Keep dedicated error normalization utility and unit tests.

## 9.3 Feature flags for not-ready server features

- Keep `force-complete` and `bulk` disabled or mapped to safe alternatives.
- Add explicit comments in code so future re-enable is intentional and traceable.

## 9.4 Local filtering vs server filtering

- `approvalType` filtering should remain client-side unless backend adds query support.

---

## 10) QA checklist for frontend release

Before shipping frontend changes touching JTS:

- [ ] Task list, detail, create, update, delete paths verified.
- [ ] Review submit works for approve and rework scenarios.
- [ ] Approvals pending + approve/reject verified.
- [ ] Analytics page renders all frozen sections.
- [ ] Timer start/pause/stop + active list verified.
- [ ] Error UI tested with 400/401/403/404/500 responses.
- [ ] No unsupported endpoint is called from UI path.

---

## 11) Migration checklist (if refactoring existing frontend)

- [ ] Replace any `/timeline` calls with `/activities`.
- [ ] Replace any `/workday/:id/tasks` calls with `/tasks/workday/:workdayId`.
- [ ] Replace any `/review` single endpoint assumptions with `/reviews`.
- [ ] Remove server-side expectation for `approvalType` query filtering.
- [ ] Ensure extension flow uses approvals endpoint with `EXTENSION_APPROVAL`.
- [ ] Keep bulk action UI using iterative API calls until backend v2 decision changes.

---

## 12) Reference documents

- `docs/JTS_API_CONTRACT_V1_FRONTEND.md`
- `docs/JTS_API_CONTRACT_MAINTENANCE_POLICY.md`
- `docs/JTS_TRUE_100_LOCK_REMAINING_BACKEND_REQUIREMENTS.md`
- `docs/JTS_FRONTEND_BACKEND_ALIGNMENT_LOOPOLES_CODEBASE_CHECK_2026_03_25.md`

