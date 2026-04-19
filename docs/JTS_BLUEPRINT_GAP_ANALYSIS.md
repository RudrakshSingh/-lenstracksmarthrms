# JTS Implementation Blueprint ↔ Implemented Backend — Gap Analysis

> **April 2026:** Many HTTP routes listed historically as “missing” are **now implemented** (bulk, force-complete, lifecycle, analytics splits, timer sessions, recurrence). See **`docs/JTS_BACKEND_GAP_CLOSURE_STATUS_APRIL_2026.md`** before opening new backend tickets from this file alone.

This document compares the **JTS Implementation Blueprint** (target schema + Swagger-level API + screen map) to the **current `jts-service` codebase** (`microservices/jts-service`). Use it for backlog planning for backend, QA, and solution architecture.

**Conventions in code today:** MongoDB fields are mostly **snake_case** (`tenant_id`, `due_at`); HTTP JSON for HRMS is often **camelCase** via mappers (`taskFrontend.mapper.js`). The blueprint’s `tenantId` / `createdAt` naming matches the **API DTO** style more than raw Mongoose documents.

---

## 1. Backend DB schema — what exists vs blueprint

### 1.1 Implemented (approximate mapping)

| Blueprint entity | Implemented as | Notes |
|------------------|----------------|-------|
| **tasks** | `Task.model.js` | **Subset** of blueprint fields; see §1.2 gaps |
| **taskTimers** | `TaskTimer.model.js` | One **open segment** model (`started_at`, `stopped_at`, `duration_seconds`, `auto_stopped`) — not the blueprint’s rich timer state machine |
| **taskTimerSessions** | — | **Not implemented** as its own collection; no per-session history rows |
| **taskApprovals** | `TaskApproval.model.js` | **Simpler**: no `type` (CREATE / EXTENSION / REASSIGN…), no structured `payload` |
| **taskReviews** | `PerformanceReview` + `TaskQualityRating` + review flows | **Different** domain model than blueprint `TaskReview` |
| **taskAttachments** | `TaskAttachment.model.js` | **Simpler**: no `category`, `isEvidence`, `fileUrl` on schema (S3 `file_key` flow) |
| **taskComments** | `TaskComment.model.js` | `message` not `body`; **no** `mentions`, `isInternal` |
| **taskActivities** | `TaskStatusHistory` + `AuditLog` / `DataAccessLog` | **Partial**: status transitions + audit, not full activity enum (COMMENTED, FILE_UPLOADED, …) |
| **slaPolicies** | `TaskTypeSlaRule`, `EscalationRule`, `SlaBreachLog` | **Split** across several models; not a single `SlaPolicy` document as in blueprint |
| **taskTypes** | `TaskType.model.js` | **Simpler**: no `requiresReview`, `requiresEvidence`, `requiresTimer`, checklist template, role allowlists |
| **recurrenceRules** | — | **Not implemented** |
| **notifications** | `Notification.model.js` | **Different**: `recipient_id`, `read`, `payload`; not `employeeId` / `entityType` / `sentVia[]` as specified |

**Also present (blueprint does not list as core 12):** `Employee`, `OrgNode`, `Tenant`, `SelfTaskPolicy`, `ShiftSchedule`, `ReportingRelationship`, `PerformanceScore`, `PerformanceAlert`, `ReviewGoal`, email/SMS queue models, webhooks, etc.

### 1.2 `Task` document — major field gaps vs blueprint

Blueprint includes (among others) the following that are **missing or only partially represented** on `Task`:

| Blueprint | Today |
|-----------|--------|
| `code` (e.g. JTS-2026-000145) | **No** dedicated human-readable code field |
| `category` on task | Not top-level (task **type** has `category`) |
| `source`: ESCALATION, WORKDAY, INCIDENT | Only `SYSTEM`, `MANAGER`, `SELF` |
| `status`: REOPENED, BLOCKED, CANCELLED | **No**; has `ON_HOLD` instead; `REJECTED` used where blueprint might use CANCELLED |
| `reviewerEmployeeId`, `approverEmployeeId` | **No** first-class fields |
| `slaPolicyId`, `warningAt`, `breachedAt` | **No**; uses `sla_minutes` + `due_at` + separate breach logs |
| `estimatedMinutes`, `actualMinutes` | **No** (duration partly inferable from timers) |
| `requiresReview`, `requiresEvidence`, `requiresTimer` | **No**; only `requires_approval` |
| `workdayId` | Effectively via **list** filter / metadata patterns, not same as blueprint field |
| Recurrence, parent/child, `dependencyTaskIds` | **No** |
| Blocked / escalation counters, reopen/extension/rejection counts | **No** |
| `tags`, rich `metadata` usage | `metadata` exists as Mixed; **no** enforced tag schema |
| `isDeleted` / `deletedAt` soft delete | **No** on `Task` (delete is hard in routes) |
| Timestamps named `createdAt`/`updatedAt` | Mongoose uses `created_at` / `updated_at` |

---

## 2. API specification — what exists vs blueprint

Base path **`/api/jts`** (and **`/jts`** mirror) is correct. Envelope is typically **`{ success, data, message }`**; **`meta`** may appear as **`pagination`** / top-level **`total`** depending on endpoint — **not identical** to blueprint’s single `meta` shape everywhere.

### 2.1 Largely aligned (conceptually)

| Blueprint | Implemented (examples) |
|-----------|---------------------------|
| Task CRUD (create, list, get, put, delete) | `POST/GET/PUT/DELETE .../tasks`, `GET .../tasks/:id` |
| List filters (status, priority, assignee, dates, search…) | `GET .../tasks` query params (see `taskRequest.normalize`) |
| Accept / reject / complete / rate | `POST .../accept`, `reject`, `complete`, `rate` |
| Status patch | `PATCH .../tasks/:id/status` (blueprint splits some into dedicated lifecycle routes) |
| SLA on task | `GET .../tasks/:id/sla` |
| SLA alerts list | `GET .../tasks/sla/alerts` |
| Workday tasks | `GET .../tasks/workday/:workdayId` |
| Timer start/stop/pause + current timer | `POST .../tasks/:id/timer/start|stop|pause`, `GET .../tasks/:id/timer` |
| Comments / attachments / presign | Under `taskCollaboration.routes.js` |
| Approvals (pending + decide) | `GET .../approvals/pending/me`, `PATCH .../approvals/:approvalId` + **compat** routes under `/api/jts/approvals/*` |
| Analytics (aggregated) | `GET /api/jts/analytics` (and internal duplicate) — **not** split as `.../overview`, `.../by-employee`, etc. |
| Task summary for dashboards | `GET .../tasks/summary/me`, `GET .../tasks/summary/:employeeId` (**extension** beyond blueprint) |
| Task types / catalog admin | Under **`/api/jts/catalog`** (`jtsAdmin.routes.js`), not necessarily `GET /api/jts/task-types` at root |

### 2.2 Missing or different vs blueprint

| Blueprint | Status in codebase |
|-----------|-------------------|
| `POST .../tasks/{id}/start` (lifecycle ACCEPTED→IN_PROGRESS) | **Not** as dedicated route; use **`PATCH .../status`** or timer start flows |
| `POST .../submit-review` | **No** dedicated route; use **`PATCH .../status`** → `PENDING_REVIEW` with notes in body where supported |
| `POST .../reopen` | **No** |
| `POST .../cancel` | **No** (cancel mapped to **REJECTED** in normalize in places, not same semantics) |
| `POST .../block`, `.../unblock` | **No** |
| `POST .../reassign` | **No** dedicated endpoint |
| `GET .../tasks/{id}/timer/sessions` | **No** (no sessions collection) |
| `GET/POST .../tasks/{id}/reviews` as blueprint | **Different** — performance/review under **`/performance`** and collaboration |
| `GET .../approvals/pending` (query approverEmployeeId) | **Compat** has `GET /api/jts/approvals/pending`; **not** identical query contract to blueprint table |
| `POST .../approvals/{id}/approve` / `reject` | **Compat** uses approve/reject **posts**; core collaboration uses **PATCH** on approval |
| `GET .../tasks/{id}/activities` full audit timeline | **No** single “activity stream” API matching blueprint enum |
| `GET .../analytics/overview` + `by-employee` + `by-team` + `by-task-type` | **Single** `GET /analytics` with nested aggregates (see `hrmsJtsCompat.controller`) |
| `POST/GET/PUT .../recurrence-rules` | **Not implemented** |
| `GET/POST .../sla-policies` at `/api/jts/sla-policies` | **Admin** SLA tied to **catalog** / `TaskTypeSlaRule` — different paths |
| Response `meta` standardization | **Partial** — pagination shapes vary |

### 2.3 Internal / integration (not in blueprint table)

- `GET /api/jts/internal/tenant-analytics` (service token)
- HR / attendance server-to-server calls documented elsewhere

---

## 3. Frontend blueprint screens — backend readiness (high level)

| Screen (blueprint) | Backend readiness |
|--------------------|-------------------|
| My Tasks / filters | **Supported** via `GET /tasks` + summary endpoints |
| Task Detail (tabs) | **Partial**: no unified activities API; SLA/timer/comments/attachments **yes** |
| Create Task | **Supported** (`POST /tasks`); field set **smaller** than blueprint form |
| Team board / kanban | **Partial**: list + filters; **no** first-class `teamId` like blueprint — often **org node** / query params |
| Pending Approvals | **Supported** (compat + collaboration) |
| Review Queue | **Partial** — performance/review model differs |
| SLA Alerts | **Supported** (`/tasks/sla/alerts`) |
| Analytics Dashboard | **Partial** — one analytics payload; **no** separate by-employee/team/type endpoints |
| Escalation / Founder console | **Partial** — escalation **models/jobs** exist; **not** one “console” API as specified |
| Policy config | **Supported** under **catalog** admin routes; **not** full blueprint checklist/role matrix on `TaskType` |

---

## 4. Summary — what is “left” for backend to match the blueprint

**Schema / data model**

1. Enrich **`Task`** (code, sources, statuses, reviewer/approver, flags, blocked/reopen/cancel, dependencies, recurrence, soft delete, counters, SLA link fields as needed).  
2. Add **`TaskTimerSession`** (or equivalent) + **`GET .../timer/sessions`**.  
3. Add **`RecurrenceRule`** + generation job + APIs.  
4. Expand **`TaskApproval`** (`type`, `payload`) for extension/reassign/completion approvals.  
5. Align **`TaskComment`** / **`TaskAttachment`** with blueprint fields (`body`, mentions, category, evidence).  
6. Optional: unified **`TaskActivity`** feed (or expand `TaskStatusHistory` + emit from comments/attachments).  
7. Consolidate or document mapping of **SLA policy** blueprint vs `TaskTypeSlaRule` + `EscalationRule` + `SlaBreachLog`.  
8. Expand **`TaskType`** to blueprint feature flags + checklist + role allowlists.

**API**

9. Dedicated lifecycle routes: **start**, **submit-review**, **reopen**, **cancel**, **block/unblock**, **reassign** (or formally document **PATCH /status** as the only contract).  
10. Split **analytics** into blueprint endpoints **or** document single `GET /analytics` as the contract.  
11. **Recurrence** CRUD under `/api/jts/recurrence-rules`.  
12. **SLA policies** public admin paths vs current **catalog** paths — align with frontend expectations.  
13. Standardize **pagination `meta`** across list endpoints.

**Non-backend**

14. **Frontend** modules (`jts-transitions.ts`, etc.) must reflect **actual** transitions in `taskStatus.service.js`, not the blueprint graph, until backend catches up.  
15. **QA** test plans should use **`docs/JTS_REAL_DATA_VALIDATION_10_CALLS.md`** + this gap list for negative tests on “not implemented” routes.

---

## 5. Related docs

- Current truth for **what is shipped**: `docs/JTS_COMPLETE_DOCUMENTATION.md`  
- HRMS field alignment: `docs/JTS_HRMS_MFE_BACKEND_ALIGNMENT.md`  
- API-style reference: `docs/JTS_API_REFERENCE.md`

---

*Generated from repository scan of `microservices/jts-service` models and routes. Update this file when large backend milestones close gaps.*
