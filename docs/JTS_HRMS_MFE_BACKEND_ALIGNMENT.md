# JTS backend ↔ HRMS MFE integration alignment

This document matches the **HRMS JTS integration guide** (March 2026) to **jts-service** after the compatibility pass.

## Base URLs

| MFE expectation (example) | jts-service mount |
|---------------------------|-------------------|
| `<BASE>/api/jts/tasks/...` | ✅ `/api/jts/tasks/...` |
| `<BASE>/api/jts/self-tasks` | ✅ `/api/jts/self-tasks` |
| `<BASE>/api/jts/tasks/:id/timer/...` | ✅ `/api/jts/tasks/:id/timer/...` |
| `<BASE>/api/jts/catalog/...` | ✅ `/api/jts/catalog/...` (alias of `/api/v1/jts/catalog`) |
| `<BASE>/api/jts/performance/...` | ✅ `/api/jts/performance/...` |
| Legacy `/api/v1/tasks/...` | ✅ Still mounted (unchanged) |

Set `NEXT_PUBLIC_JTS_API_URL` to the gateway or service origin that exposes **`/api/jts`** (e.g. `https://api.example.com` if the gateway prefixes `api`; or `http://localhost:3018` only if the client builds paths as `/api/jts/...` relative to that host).

## Implemented / adjusted behaviour

- **Task list** `GET .../tasks`: accepts `employeeId`, `assignedTo`, `taskType`, `search`, `workdayId`, `assignerId`, `requiresApproval`, `date` (single day → `date_from`/`date_to`), plus existing snake_case params. Response includes **`total`, `page`, `limit`** at the top level as well as `pagination`.
- **Task payloads**: responses use **camelCase** (`id`, `tenantId`, `dueAt`, `assignedToEmployee`, `slaStatus`, etc.) aligned with `task.types.ts`.
- **Create task** `POST .../tasks`: accepts camelCase (`assignedToEmployeeId`, `typeId`, `scopeOrgNodeId`, …). **`type_id` and `scope_org_node_id` are optional**; defaults = first task type + first org node for the tenant (requires catalog data).
- **Update** `PUT .../tasks/:id`: partial update; **`status`** uses the same transition rules as `PATCH .../status`.
- **Delete** `DELETE .../tasks/:id`.
- **Complete** `POST .../tasks/:id/complete` with optional `{ notes }`.
- **Accept / reject task** `POST .../tasks/:id/accept`, `POST .../tasks/:id/reject` (reject body optional `reason`).
- **Status** `PATCH .../tasks/:id/status`: accepts **proxy lowercase** values (`assigned`, `in_progress`, `completed`, `cancelled`, …) and normalizes to `Task.status` enum.
- **Timer**: `POST .../timer/start|stop`, **`POST .../timer/pause`**, **`GET .../tasks/:id/timer`** (active row or `null`). `timer/start` now returns `attendance` metadata and supports strict vs auto attendance mode.
- **SLA** `GET .../tasks/:id/sla` → `SLAStatus` shape (computed; not business-calendar exact vs full SLA engine).
- **Self-tasks** `POST /api/jts/self-tasks` and `POST /api/v1/tasks/self/`: **`taskType` / optional type & scope**; defaults applied when omitted. Response is serialized `Task` + message when pending approval.
- **Approvals (MFE-style)**:
  - `GET /api/jts/approvals/pending?approverId=` (omit `approverId` = current user; other id only for privileged roles),
  - `POST /api/jts/approvals/:approvalId/approve` `{ notes? }`,
  - `POST /api/jts/approvals/:approvalId/reject` `{ reason }`.  
  Existing **`PATCH /api/jts/tasks/approvals/:approvalId`** with `{ status, reason }` remains.
- **Analytics** `GET /api/jts/analytics` now includes real aggregates: `overall`, `byDepartment`, `trends`, `openAlerts`, `byStatus`.
- **Reviews (compat)** `GET /api/jts/reviews` returns frontend-usable DTO shape with employee/reviewer names and department mapping.

## Remaining gaps / loopholes (frontend or backend follow-up)

1. **Attachment delivery mode**: choose one per screen:
   - endpoint-based: `attachments[]` values from Task DTO
   - direct signed URLs: `include_signed_urls=true` or `include_attachment_signed_urls=true`
2. **Timer attendance mode**: set `JTS_TIMER_ATTENDANCE_MODE` to `strict` (hard fail) or `auto` (auto local mirror clock-in) based on deployment policy.
3. **Approvals/reviews card parity**: fields are now enriched, but mock-screen exact labels may still need frontend mapping tweaks.
4. **Gateway**: ingress must route **`/api/jts/*`** (and optionally `/api/v1/tasks/*`) to jts-service.

## Files touched (reference)

- `src/server.js` — dual mounts: `/api/jts/...` + `/api/v1/...`
- `src/routes/task.routes.js`, `src/controllers/task.controller.js`, `src/services/task.service.js`
- `src/utils/taskFrontend.mapper.js`, `src/utils/taskRequest.normalize.js`
- `src/services/catalogDefaults.service.js`, `src/services/selfTask.service.js`
- `src/routes/timer.routes.js`, `src/controllers/timer.controller.js`, `src/services/timer.service.js`
- `src/routes/hrmsJtsCompat.routes.js`, `src/controllers/hrmsJtsCompat.controller.js`
- `src/routes/selfTask.routes.js`, `src/controllers/selfTask.controller.js`
