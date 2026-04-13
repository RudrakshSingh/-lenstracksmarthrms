# JTS Frontend API Full Reference (Requests + Responses)

**Last updated:** 2026-03-26  
**Audience:** Frontend developers integrating JTS with HRMS  
**Service:** `microservices/jts-service`

---

## Top 10 Immediate Frontend Tasks

For detailed ownership/sprint planning, see:
- `docs/JTS_FRONTEND_PENDING_BACKEND_AND_FRONTEND_ACTION_PLAN_2026_03_26.md`

Immediate execution checklist:

1. Add `GET /:taskId/reviews` integration in `jts-client` + hooks.
2. Add `GET /:taskId/approvals` integration for task detail approval history.
3. Add attachment download flow via `GET /:taskId/attachments/:attachmentId/presign-download`.
4. Add finalize-upload call `POST /:taskId/attachments` after presign upload.
5. Add quality APIs integration: `GET /:taskId/quality` and `PUT /:taskId/quality`.
6. Add subtask mutations: `POST /:id/subtasks` and `PATCH /:id/subtasks/:subtaskId/status`.
7. Add compat fetches where UI requires them: `/self-tasks/my`, `/tasks/my`, `/tenant/current`.
8. Centralize business error mapping (`VALIDATION_ERROR`, `*_NOT_FOUND`, transition errors) to user-friendly messages.
9. Finalize query invalidation keys for new mutations (avoid broad cache invalidation).
10. Add throttled polling/retry policy for heavy pages to avoid `429` rate-limit spikes.

---

## 1) Base URL, Auth, and Headers

- Public API host: `https://api.etelios.com`
- Canonical frontend roots:
  - ` /api/jts/*`
  - ` /api/jts/tasks/*`
  - ` /api/v1/tasks/*`
  - ` /api/v1/jts/catalog/*`
  - ` /api/v1/jts/performance/*`
  - ` /api/v1/jts/recurrence-rules/*`
  - ` /api/v1/notifications/*`
- Ingress aliases (same backend): ` /jts/*`, ` /jts/tasks/*`, ` /jts/catalog/*`, ` /jts/performance/*`, ` /jts/recurrence-rules/*`

Required headers (for user-auth endpoints):

```json
{
  "Authorization": "Bearer <JWT>",
  "X-Tenant-Id": "<tenantObjectId>"
}
```

Internal endpoint (`/api/jts/internal/*` or `/jts/internal/*`) uses:

```json
{
  "X-JTS-Internal-Token": "<internal-token>",
  "X-Tenant-Id": "<tenantObjectId>"
}
```

---

## 2) Standard Response Envelopes

Success (common):

```json
{
  "success": true,
  "data": {},
  "message": "Operation successful",
  "meta": {}
}
```

Validation error:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": ["\"title\" is required"],
  "meta": {}
}
```

Business not found:

```json
{
  "success": false,
  "code": "TASK_001_NOT_FOUND",
  "message": "Task not found",
  "meta": {}
}
```

Rate limited:

```json
{
  "_raw": "Too many requests from this IP"
}
```

---

## 3) Endpoint Catalog (All Frontend-Used Routes)

## 3.1 Compat + Dashboard APIs (`/api/jts` and `/jts`)

- `POST /self-tasks`
- `GET /self-tasks/my`
- `GET /tasks/my`
- `GET /tenant/current`
- `GET /approvals/pending`
- `POST /approvals/:approvalId/approve`
- `POST /approvals/:approvalId/reject`
- `GET /analytics`
- `GET /reviews`

Request JSON (examples):

```json
{
  "title": "Store opening checklist",
  "description": "Complete opening tasks",
  "priority": "MEDIUM",
  "scope_org_node_id": "65f1234567890abcdef1234",
  "type_id": "65f1234567890abcdef5678"
}
```

```json
{
  "notes": "Approved after review"
}
```

```json
{
  "reason": "Insufficient evidence attached"
}
```

Response JSON (examples):

```json
{
  "success": true,
  "data": [],
  "pagination": { "page": 1, "limit": 20, "total": 0, "pages": 0 },
  "message": "My tasks retrieved successfully",
  "meta": { "page": 1, "limit": 20, "total": 0, "pages": 0 }
}
```

```json
{
  "success": true,
  "data": {
    "_id": "69c507c2050107dc9bb0a5c2",
    "code": "JTS-2026-000001",
    "status": "ASSIGNED",
    "title": "Store opening checklist"
  },
  "message": "Self task created successfully",
  "meta": {}
}
```

---

## 3.2 Core Task APIs (`/api/jts/tasks`, `/api/v1/tasks`, `/jts/tasks`)

- `POST /`
- `GET /`
- `GET /sla/alerts`
- `GET /workday/:workdayId`
- `GET /summary/me`
- `GET /summary/:employeeId`
- `GET /:id/sla`
- `GET /:id/activities`
- `POST /:id/start`
- `POST /:id/submit-review`
- `POST /:id/reopen`
- `POST /:id/cancel`
- `POST /:id/block`
- `POST /:id/unblock`
- `POST /:id/reassign`
- `PUT /:id`
- `DELETE /:id`
- `POST /:id/complete`
- `POST /:id/accept`
- `POST /:id/reject`
- `POST /:id/rate`
- `PATCH /:id/status`
- `GET /:id`

Create request JSON:

```json
{
  "title": "Prepare weekly performance report",
  "description": "Collect KPIs and submit report",
  "priority": "HIGH",
  "assigned_to_employee_id": "65f1234567890abcdef1111",
  "scope_org_node_id": "65f1234567890abcdef2222",
  "type_id": "65f1234567890abcdef3333",
  "requires_review": true,
  "reviewer_employee_id": "65f1234567890abcdef4444",
  "metadata": { "channel": "frontend" }
}
```

Update request JSON:

```json
{
  "description": "Updated report scope",
  "priority": "CRITICAL"
}
```

Status change request JSON:

```json
{
  "status": "IN_PROGRESS",
  "reason": "Starting execution"
}
```

Rate request JSON:

```json
{
  "rating": 4,
  "comments": "Good delivery"
}
```

Success response JSON:

```json
{
  "success": true,
  "data": {
    "_id": "69c50c2ac7ff8890d28ff869",
    "code": "JTS-2026-000002",
    "status": "IN_PROGRESS",
    "title": "Prepare weekly performance report"
  },
  "message": "Task updated successfully",
  "meta": {}
}
```

---

## 3.3 Collaboration APIs (`/api/jts/tasks`, `/api/v1/tasks`, `/jts/tasks`)

- `GET /approvals/pending/me`
- `PATCH /approvals/:approvalId`
- `GET /:taskId/reviews`
- `POST /:taskId/reviews`
- `GET /:taskId/comments`
- `POST /:taskId/comments`
- `GET /:taskId/attachments`
- `POST /:taskId/attachments/presign-upload`
- `GET /:taskId/attachments/:attachmentId/presign-download`
- `POST /:taskId/attachments`
- `GET /:taskId/quality`
- `PUT /:taskId/quality`
- `GET /:taskId/approvals`
- `POST /:taskId/approvals`

Review request JSON:

```json
{
  "status": "APPROVED",
  "rating": 5,
  "checklist_score": 95,
  "remarks": "Looks good"
}
```

Comment request JSON:

```json
{
  "message": "Please attach invoice proof",
  "mentions": ["65f1234567890abcdef7777"],
  "is_internal": false
}
```

Attachment add request JSON:

```json
{
  "file_key": "jts-attachments/tasks/69c50/file.png",
  "file_name": "file.png",
  "mime_type": "image/png",
  "size_bytes": 249812,
  "attachment_type": "EVIDENCE",
  "is_evidence": true
}
```

Approval create request JSON:

```json
{
  "approver_employee_id": "65f1234567890abcdef9999",
  "approval_type": "EXTENSION_APPROVAL",
  "payload": {
    "requestedDueAt": "2026-04-10T18:30:00.000Z",
    "reason": "Dependency pending"
  }
}
```

---

## 3.4 Subtask APIs (`/api/jts/tasks/:id/subtasks`, `/api/v1/tasks/:id/subtasks`, `/jts/tasks/:id/subtasks`)

- `GET /`
- `POST /`
- `PATCH /:subtaskId/status`

Create subtask request JSON:

```json
{
  "title": "Collect KPI data",
  "description": "From all stores",
  "assigned_to_employee_id": "65f1234567890abcdef1111",
  "due_at": "2026-03-30T10:00:00.000Z"
}
```

Update status request JSON:

```json
{
  "status": "DONE"
}
```

---

## 3.5 Timer APIs (`/api/jts`, `/api/v1`, `/jts`)

- `POST /tasks/:id/timer/start`
- `POST /tasks/:id/timer/stop`
- `POST /tasks/:id/timer/pause`
- `GET /tasks/:id/timer`
- `GET /tasks/:id/timer/sessions`
- `GET /active`
- `GET /timers/active`

Request JSON:

```json
{}
```

Success response JSON:

```json
{
  "success": true,
  "data": {
    "activeTimer": null,
    "sessions": [],
    "totalDurationSeconds": 0
  },
  "meta": {}
}
```

Business-rule response example:

```json
{
  "success": false,
  "code": "TIMER_001_NO_ACTIVE_TIMER",
  "message": "TIMER_001_NO_ACTIVE_TIMER",
  "meta": {}
}
```

---

## 3.6 Catalog/Admin APIs (`/api/v1/jts/catalog`, `/api/jts/catalog`, `/jts/catalog`)

Tenants:
- `GET /tenants`
- `GET /tenant/current`
- `POST /tenants`
- `PATCH /tenants/:id`

Org nodes:
- `GET /org-nodes`
- `POST /org-nodes`
- `PATCH /org-nodes/:id`
- `DELETE /org-nodes/:id`

Employees:
- `GET /employees`
- `POST /employees`
- `POST /employees/bind-from-jwt`
- `PATCH /employees/:id/align-auth-code`
- `PUT /employees/:id/auth-user-link`
- `PATCH /employees/:id`
- `DELETE /employees/:id`

Employee roles:
- `GET /employee-roles`
- `POST /employee-roles`
- `DELETE /employee-roles/:employeeId?role=EMPLOYEE`

Task types:
- `GET /task-types`
- `POST /task-types`
- `PATCH /task-types/:id`
- `DELETE /task-types/:id`

SLA rules:
- `GET /sla-rules`
- `PUT /sla-rules`
- `DELETE /sla-rules/:id`

Escalation rules:
- `GET /escalation-rules`
- `POST /escalation-rules`
- `PATCH /escalation-rules/:id`
- `DELETE /escalation-rules/:id`

Self-task policies:
- `GET /self-task-policies`
- `PUT /self-task-policies`
- `DELETE /self-task-policies/:id`

Shift schedules:
- `GET /shift-schedules`
- `POST /shift-schedules`
- `DELETE /shift-schedules/:id`

Reporting relationships:
- `GET /reporting-relationships`
- `PUT /reporting-relationships`
- `DELETE /reporting-relationships/:id`

Attendance mirror:
- `GET /attendance-records`
- `PUT /attendance-records`
- `POST /attendance-records/open-session`
- `POST /attendance-records/close-session`

Logs:
- `GET /audit-logs`
- `GET /data-access-logs`
- `POST /data-access-logs`

Key request JSON examples:

```json
{
  "code": "lenstrack",
  "name": "Lenstrack",
  "subdomain": "lenstrack",
  "is_active": true
}
```

```json
{
  "type": "STORE",
  "name": "Mumbai Store 1",
  "code": "MUM-001",
  "parent_id": null
}
```

```json
{
  "org_node_id": "65f1234567890abcdef2222",
  "code": "EMP-001",
  "name": "Ravi Kumar",
  "email": "ravi@lenstrack.com",
  "phone": "+91-9999999999",
  "role_key": "EMPLOYEE"
}
```

```json
{
  "task_type_id": "65f1234567890abcdef3333",
  "priority": "MEDIUM",
  "base_sla_minutes": 180,
  "basis": "BUSINESS_HOURS"
}
```

---

## 3.7 Recurrence Rule APIs (`/api/v1/jts/recurrence-rules`, `/api/jts/recurrence-rules`, `/jts/recurrence-rules`)

- `GET /`
- `POST /`
- `GET /:id`
- `PATCH /:id`
- `DELETE /:id`

Create request JSON:

```json
{
  "name": "Daily opening routine",
  "frequency": "DAILY",
  "interval": 1,
  "config": { "days": [1, 2, 3, 4, 5, 6] },
  "is_active": true,
  "task_template": {
    "title": "Open store checklist",
    "priority": "MEDIUM"
  }
}
```

---

## 3.8 Performance APIs (`/api/v1/jts/performance`, `/api/jts/performance`, `/jts/performance`)

- `GET /metrics`
- `GET /scores`
- `POST /calculate-daily`
- `GET /reviews`
- `POST /reviews`
- `PATCH /reviews/:id`
- `DELETE /reviews/:id`
- `POST /reviews/:reviewId/goals`
- `GET /reviews/:reviewId/goals`
- `POST /reviews/:reviewId/acknowledge`
- `GET /alerts`
- `POST /alerts`
- `PATCH /alerts/:id/resolve`

Request JSON examples:

```json
{
  "employee_id": "65f1234567890abcdef1111",
  "date": "2026-03-26T00:00:00.000Z"
}
```

```json
{
  "employee_id": "65f1234567890abcdef1111",
  "reviewer_employee_id": "65f1234567890abcdef9999",
  "review_period_start": "2026-01-01T00:00:00.000Z",
  "review_period_end": "2026-03-31T23:59:59.999Z",
  "review_type": "QUARTERLY",
  "manager_rating": 4,
  "manager_comments": "Strong execution",
  "status": "SUBMITTED"
}
```

---

## 3.9 Notification APIs (`/api/v1/notifications`)

- `GET /`
- `GET /health`
- `GET /me`
- `PATCH /:id/read`
- `PATCH /me/read-all`
- `GET /preferences/me`
- `PUT /preferences/me`
- `POST /dispatch`
- `POST /process-queues`
- `GET /providers/health`
- `POST /test-email`

Request JSON examples:

```json
{
  "channel_in_app": true,
  "channel_email": false,
  "channel_sms": false,
  "channel_push": false
}
```

```json
{
  "recipient_ids": ["65f1234567890abcdef1111"],
  "type": "GENERAL",
  "title": "Task Assigned",
  "message": "You have a new task",
  "channels": ["in_app"]
}
```

---

## 3.10 Internal Analytics API (`/api/jts/internal`, `/jts/internal`)

- `GET /tenant-analytics`

Request headers:

```json
{
  "X-JTS-Internal-Token": "etelios-jts-internal-token-2026",
  "X-Tenant-Id": "69a2e756783a738e6578cb4a"
}
```

Response JSON:

```json
{
  "success": true,
  "data": {
    "overall": {
      "avgRating": null,
      "totalReviews": 0,
      "completedTasks": 0,
      "pendingTasks": 2,
      "onTimeCompletion": null
    },
    "byDepartment": [],
    "trends": {
      "ratings": [],
      "tasksCompleted": [],
      "onTimeCompletion": [],
      "monthlyPerformance": []
    },
    "byStatus": {},
    "openAlerts": 0
  },
  "meta": {}
}
```

---

## 4) Frontend Notes

- Prefer canonical paths under ` /api/jts*` and ` /api/v1/*`.
- `400` and `404` are often expected contract behavior (validation/state/not-found), not server failures.
- For lifecycle calls, transition status in proper order before invoking next action.
- For timer pause/stop, ensure an active timer exists.
- If testing at scale, apply request pacing to avoid `429`.

