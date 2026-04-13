# JTS Frontend-Backend Gap Alignment Doc

Date: 2026-03-26  
Repo: `hrms-frontend`  
Scope audited from code only: `packages/hrms-mfe`, `packages/shared`, `packages/shell` (JTS-related API integrations)

---

## 1) Purpose

This document is for backend alignment on JTS APIs:

- Confirm whether missing routes are public, internal-only, deprecated, or intentionally out of scope.
- Decide canonical endpoint families (avoid multiple aliases for the same capability).
- Provide a concrete frontend implementation structure for gaps that should be implemented.

Evidence in this doc is taken from frontend source code integrations (route handlers, API client calls, and proxy behavior), not from documentation files.

---

## 2) Current Frontend Integration Pattern (As Implemented)

## 2.1 Transport architecture

- Primary client: `packages/hrms-mfe/lib/api/jts-client.ts`
  - Directly calls JTS-style paths such as `/jts/tasks/...`.
  - Adds `Authorization` and `X-Tenant-Id`.
  - Normalizes variable response envelopes.
- Same-origin proxy route: `packages/hrms-mfe/app/api/jts/[[...path]]/route.ts`
  - Forwards `GET/POST/PUT/PATCH/DELETE` to upstream candidates.
  - Tries backend variants (for example `/jts/*` and `/api/jts/*`).
- Explicit Next routes exist for selected paths:
  - `app/api/jts/tasks/route.ts`
  - `app/api/jts/tasks/[id]/route.ts`
  - `app/api/jts/tasks/[id]/status/route.ts`
  - `app/api/jts/tasks/[id]/timer/*`
  - `app/api/jts/self-tasks/route.ts`

## 2.2 Practical implication

Even when frontend has no dedicated typed client method for a route, the catch-all proxy can still technically forward it.  
For product readiness, we still need explicit client contracts + typed hooks + UI flow ownership.

---

## 3) Implemented Surface (Code-Verified)

Implemented in frontend code with active API calls:

- Task CRUD/list/detail
- Task lifecycle actions: start, complete, accept, reject, reopen, cancel, block, unblock, submit-review, status patch
- Timer: start, stop, pause, get timer, get sessions, get active timer (with fallback path variants)
- SLA: task SLA + SLA alerts
- Workday + summary endpoints
- Collaboration partials: comments, attachments list, presign upload, review decision post, extension approval create
- Compat/dashboard partials: analytics, reviews, approvals approve/reject/pending, self-task create

---

## 4) Gap Matrix for Backend Verification

Status legend:

- `Implemented` = explicit frontend client and/or route integration found
- `Partial` = some operations in group implemented, others missing
- `Not Found` = no code reference found in frontend for this endpoint family

## 4.1 Compat + Dashboard (`/api/jts` / `/jts`)

| Endpoint | Frontend status | Notes for backend verification |
|---|---|---|
| `POST /self-tasks` | Implemented | Also tries `/tasks/self` variants in route handler |
| `GET /self-tasks/my` | Not Found | Confirm if replaced by generic `/tasks` filters |
| `GET /tasks/my` | Not Found | Confirm canonical "my tasks" contract |
| `GET /tenant/current` | Not Found | Confirm if tenant data should come from catalog service instead |
| `GET /approvals/pending` | Partial | Frontend uses query variant (`/approvals/pending?approverId=`) |
| `POST /approvals/:approvalId/approve` | Implemented | Used in `jtsClient` |
| `POST /approvals/:approvalId/reject` | Implemented | Used in `jtsClient` |
| `GET /analytics` | Implemented | Additional optional split analytics calls also used |
| `GET /reviews` | Implemented | Used in `jtsClient` |

## 4.2 Core Tasks (`/api/jts/tasks`, `/api/v1/tasks`, `/jts/tasks`)

| Endpoint group | Frontend status | Notes for backend verification |
|---|---|---|
| CRUD/list/detail (`POST/GET/PUT/DELETE /tasks...`) | Implemented | Canonical in code is `/jts/tasks/*` |
| Lifecycle actions (`start`, `complete`, `accept`, `reject`, `reopen`, `cancel`, `block`, `unblock`, `submit-review`, `status`) | Implemented | Good coverage |
| `POST /:id/reassign` | Not Found | Confirm if required in v1/v2 contract |
| `GET /:id/activities`, `GET /:id/sla`, `GET /sla/alerts` | Implemented | Used in `jtsClient` |
| `GET /workday/:workdayId`, summaries | Implemented | Used in `jtsClient` |

## 4.3 Collaboration

| Endpoint | Frontend status | Notes for backend verification |
|---|---|---|
| `GET /approvals/pending/me` | Not Found | Frontend uses pending by query param instead |
| `PATCH /approvals/:approvalId` | Not Found | Confirm if generic approval update is required |
| `GET /:taskId/reviews` | Not Found | Only POST review decision found |
| `POST /:taskId/reviews` | Implemented | Mapped as decision submit |
| `GET /:taskId/comments` | Implemented | Present |
| `POST /:taskId/comments` | Implemented | Present |
| `GET /:taskId/attachments` | Implemented | Present |
| `POST /:taskId/attachments/presign-upload` | Implemented | Present |
| `GET /:taskId/attachments/:attachmentId/presign-download` | Not Found | Confirm required for download flow |
| `POST /:taskId/attachments` | Not Found | Finalize-upload endpoint not integrated in FE |
| `GET /:taskId/quality` | Not Found | Only rating post exists via `/rate` |
| `PUT /:taskId/quality` | Not Found | Confirm canonical quality contract |
| `GET /:taskId/approvals` | Not Found | Only create approval exists |
| `POST /:taskId/approvals` | Implemented | Used for extension request |

## 4.4 Subtasks

| Endpoint | Frontend status | Notes for backend verification |
|---|---|---|
| `GET /:id/subtasks` | Implemented | Used by task detail/review pages |
| `POST /:id/subtasks` | Not Found | Confirm checklist creation ownership (frontend vs admin tooling) |
| `PATCH /:id/subtasks/:subtaskId/status` | Not Found | Needed for full checklist execution UX |

## 4.5 Timer

| Endpoint group | Frontend status | Notes for backend verification |
|---|---|---|
| Start/stop/pause/get/sessions/active | Implemented | Good coverage, includes active fallback variants |

## 4.6 Catalog/Admin (`/api/v1/jts/catalog`, `/api/jts/catalog`, `/jts/catalog`)

All catalog/admin families currently `Not Found` in frontend code:

- tenants
- org nodes
- employees
- employee roles
- task types
- SLA rules
- escalation rules
- self-task policies
- shift schedules
- reporting relationships
- attendance mirror
- audit/data access logs

Backend verification needed: confirm whether these are intentionally backend-admin/internal and should remain absent from HRMS frontend.

## 4.7 Recurrence Rules

All listed recurrence-rules endpoints: `Not Found`.

## 4.8 Performance

All listed performance endpoints: `Not Found`.

## 4.9 Notifications (`/api/v1/notifications`)

All listed notification endpoints: `Not Found` in JTS frontend integration layer.

## 4.10 Internal Analytics (`/api/jts/internal` / `/jts/internal`)

`GET /tenant-analytics`: `Not Found` in frontend code.  
Likely internal-only, but backend confirmation required.

---

## 5) Backend Clarification Checklist (To Review in API Sync)

For each `Not Found` or `Partial` endpoint, confirm:

1. Is it public for frontend consumption, or internal-service only?
2. What is the canonical path family to use moving forward?
   - Preferred: one family (for example `/api/jts/*` or `/api/v1/jts/*`) with aliases only during migration.
3. Is JWT + `X-Tenant-Id` mandatory for this route?
4. Is response envelope standard (`success/data/message/meta`) or route-specific?
5. Which status codes are expected business outcomes (`400`, `404`, `409`, `429`) vs actual failures?
6. Any role-based restrictions that frontend should pre-check?
7. Is this endpoint replaced by another route already used by frontend?

Recommended outcome per endpoint:

- `Implement now`
- `Defer (future milestone)`
- `Internal-only (do not expose to frontend)`
- `Deprecated (remove from contract)`

---

## 6) Proposed Frontend Implementation Structure for Gaps

Use current architecture and extend in this order.

## 6.1 Layer A: Typed API client methods

File: `packages/hrms-mfe/lib/api/jts-client.ts`

Add new methods by domain blocks:

- `catalog.*` methods
- `performance.*` methods
- `recurrenceRules.*` methods
- `notifications.*` methods (if JTS app owns them)
- missing collaboration/subtask methods

Method conventions:

- input DTO types in `packages/hrms-mfe/lib/types/*`
- use `fetchJson` / `fetchJsonOptional`
- normalize responses in `jts-response.ts` (or domain-specific normalizer files)
- avoid raw `unknown` return types for stable endpoints

## 6.2 Layer B: Next API proxy routes

Current generic route already forwards `/api/jts/:path*`.  
Add explicit route files only when needed for:

- stricter request validation
- compatibility mapping between old/new backend payload shapes
- endpoint-specific retry/fallback logic
- stronger error translation for UI

Suggested explicit additions (if backend confirms public):

- `app/api/jts/tasks/[id]/subtasks/route.ts` (`GET`, `POST`)
- `app/api/jts/tasks/[id]/subtasks/[subtaskId]/status/route.ts` (`PATCH`)
- `app/api/jts/tasks/[id]/attachments/[attachmentId]/presign-download/route.ts` (`GET`)
- domain routers for `catalog`, `performance`, `recurrence-rules`, `notifications` only if UI needs custom handling

## 6.3 Layer C: React Query hooks and keys

Add/extend:

- `packages/hrms-mfe/lib/jts-query-keys.ts`
- `packages/hrms-mfe/lib/hooks/use-jts-*.ts`

Pattern:

- one query key namespace per domain
- mutations invalidate minimal relevant keys
- keep endpoint details inside `jtsClient`, not inside UI components

## 6.4 Layer D: UI integration

For each newly exposed endpoint:

1. create service method
2. create query/mutation hook
3. attach to page/component flow
4. align toast/error messages to backend business codes
5. add loading/empty/error states

---

## 7) Phased Delivery Plan

## Phase 1 (Low risk, high value)

- Fill collaboration/subtask gaps:
  - reviews `GET`
  - approvals `GET/PATCH` if public
  - attachment presign download + finalize add
  - subtask `POST` + subtask status `PATCH`

## Phase 2 (Workflow completeness)

- Add missing compat endpoints if backend confirms:
  - `self-tasks/my`
  - `tasks/my`
  - `tenant/current`
  - `reassign`

## Phase 3 (New feature domains)

- Add recurrence/performance/catalog integrations only if frontend product scope includes corresponding screens.

## Phase 4 (Internal boundary hardening)

- Mark internal-only endpoints in shared API contract.
- Remove dead/legacy alias probing where backend canonical routes are finalized.

---

## 8) Risks and Decisions Needed

- Multiple route aliases can hide contract drift; backend should publish one canonical family.
- Catch-all proxy is powerful but can mask missing typed integration and payload validation.
- Some missing groups may be intentionally internal/admin; implementing without confirmation can create security/scope issues.
- Before expanding integrations, backend should confirm envelope consistency and error code semantics for each group.

---

## 9) Suggested Backend Sync Template (Copy/Paste)

For each endpoint group, please mark:

- Exposure: `Public Frontend` / `Internal Only` / `Deprecated`
- Canonical Route: `___________________`
- Auth Headers: `Bearer + Tenant` / `Internal Token` / `Other`
- Response Contract Version: `___________________`
- Frontend Action: `Implement` / `Defer` / `Do Not Implement`
- Notes: `___________________`

