# JTS Service — API surface (implemented)

Base path (typical): `/api/v1` on `jts-service` (or `/jts/api/v1` via ingress — match your gateway).

## Tasks & timers

| Method | Path | Notes |
|--------|------|--------|
| POST | `/tasks` | Manager create |
| GET | `/tasks` | List / filter |
| GET | `/tasks/:id` | Detail |
| PATCH | `/tasks/:id/status` | Status transitions |
| POST | `/tasks/self` | Self-task |
| POST | `/tasks/:taskId/timer/start` | Requires clock-in (attendance-service or local mirror) |
| POST | `/tasks/:taskId/timer/stop` | |
| GET | `/active` or `/timers/active` | Active timers |

## Task collaboration (same `/tasks` prefix; register before generic `/:id`)

| Method | Path | Notes |
|--------|------|--------|
| GET/POST | `/tasks/:taskId/comments` | |
| POST | `/tasks/:taskId/attachments/presign-upload` | Returns S3 presigned **PUT** `upload_url` + `file_key` (requires `JTS_ATTACHMENTS_S3_BUCKET` or `AWS_S3_BUCKET`) |
| GET | `/tasks/:taskId/attachments/:attachmentId/presign-download` | Presigned **GET** for the stored `file_key` |
| GET/POST | `/tasks/:taskId/attachments` | After S3 PUT, **POST** metadata: `file_key`, `file_name`, `mime_type`, `size_bytes` |

### Employee ↔ Auth alignment

| Method | Path | Notes |
|--------|------|--------|
| POST | `/jts/catalog/employees/bind-from-jwt` | Sets `auth_user_id` on the row where `Employee.code` equals normalized JWT `employee_id` |
| PATCH | `/jts/catalog/employees/:id/align-auth-code` | Admin: set `code` to match HR/auth `auth_employee_id` (uppercase) |
| PUT | `/jts/catalog/employees/:id/auth-user-link` | Admin: set `auth_user_id` to Auth `User._id` |

Create/update employee: `code` is **stored uppercase**. Optional `auth_employee_id` on create must match `code` when provided.

### Attendance mirror (no attendance-service)

| Method | Path | Notes |
|--------|------|--------|
| PUT | `/jts/catalog/attendance-records` | Full field upsert (`work_date`, `check_in_at`, `check_out_at`) |
| POST | `/jts/catalog/attendance-records/open-session` | Today (or `work_date`): clock **in**, clear clock-out |
| POST | `/jts/catalog/attendance-records/close-session` | Clock **out** for that day’s row |
| GET/PUT | `/tasks/:taskId/quality` | Quality ratings |
| GET/POST | `/tasks/:taskId/approvals` | |
| GET | `/tasks/approvals/pending/me` | |
| PATCH | `/tasks/approvals/:approvalId` | Approve / reject |

## Notifications

Existing `/notifications/*` (inbox, preferences, dispatch, `providers/health`, `test-email`).

## Catalog & admin (`/jts/catalog`)

Tenants (scoped), org nodes, employees, employee roles, task types, SLA rules, escalation rules, self-task policies, shift schedules, reporting relationships, attendance mirror, audit / data-access logs.

## Performance (`/jts/performance`)

Metrics, scores, `calculate-daily`, reviews + goals + acknowledge, alerts + resolve.

## Environment (high level)

- `ATTENDANCE_SERVICE_URL` — optional; if set, timer start checks `GET /api/attendance/today` with user JWT.
- `JTS_ATTENDANCE_CHECK=false` — skip remote attendance check.
- JWT must include `tenantId` / `tenant_id` / `tid` and preferably `employee_id` aligned with JTS `Employee.code` when auth `userId` ≠ JTS `Employee._id`.

See `microservices/jts-service/ENVIRONMENT_VARIABLES.md` and `docs/JTS_NOTIFICATIONS_GO_LIVE.md`.
