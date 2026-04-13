# JTS Pending Backend Items and Frontend Action Plan

Date: 2026-03-26  
Audience: Frontend developers, backend owners, QA  
Source docs:
- `docs/JTS_FRONTEND_BACKEND_GAP_ALIGNMENT_DOC_2026_03_26.md`
- `docs/JTS_FRONTEND_API_FULL_REFERENCE.md`
- `docs/JTS_FRONTEND_BACKEND_GO_LIVE_CHECKLIST.md`

---

## 1) Objective

This document answers two questions:

1. What is still pending from backend for stable frontend integration?
2. What exactly frontend developers need to implement now vs after backend confirmation?

---

## 2) Backend Pending Items (Blocking or Clarification Required)

## 2.1 Contract and canonical path decisions (blocking)

- [ ] Final canonical family for JTS endpoints:
  - choose and freeze one: ` /api/jts/*` (recommended) or ` /jts/*`
  - keep alias only for migration with sunset date
- [ ] Canonical timers-active route:
  - ` /active` vs ` /timers/active` (both currently available)
- [ ] Canonical self-task route:
  - ` /self-tasks` vs ` /tasks/self`
- [ ] Canonical review naming:
  - ` /reviews` vs ` /review`
- [ ] Canonical attachments presign route:
  - ` /attachments/presign-upload` vs any legacy alias

## 2.2 Route exposure decisions (blocking for implementation scope)

Backend must mark each domain as one of:
- `Public Frontend`
- `Internal Only`
- `Deferred / Not in product scope`

Pending domains:
- [ ] Catalog/Admin routes (`/api/v1/jts/catalog/*`)
- [ ] Recurrence routes (`/api/v1/jts/recurrence-rules/*`)
- [ ] Performance routes (`/api/v1/jts/performance/*`)
- [ ] Notification routes (`/api/v1/notifications/*`) ownership confirmation (JTS FE vs other app)
- [ ] Internal analytics route (`/api/jts/internal/tenant-analytics`) should remain internal-only

## 2.3 Behavioral contract confirmations (blocking for correct FE UX)

- [ ] Approvals pending behavior:
  - confirm if `approvalType` server-side filtering is supported, ignored, or rejected
- [ ] Status transition matrix:
  - publish final allowed transitions and business error codes
- [ ] Standard response envelope policy:
  - confirm if all routes guarantee `success/data/message/meta`
- [ ] Stable error-code map by module:
  - tasks, timers, approvals, reviews, analytics, auth/tenant
- [ ] Role restrictions per endpoint:
  - explicit role matrix for UI pre-checking and guard rendering

## 2.4 Data contract guarantees (required for FE typing)

- [ ] Task list/detail required fields freeze (ids, status, priority, due dates, assignee, blocker flags, SLA markers)
- [ ] Approvals required fields freeze
- [ ] Reviews required fields freeze
- [ ] Analytics shape freeze (`overall`, `byDepartment`, `trends`, `byStatus`, `openAlerts`)
- [ ] snake_case / camelCase compatibility policy (or single naming rule)

---

## 3) Frontend Developer Required Work

## 3.1 Implement now (safe, low-risk, already supported by backend)

### Collaboration and task execution completeness
- [ ] Add `GET /:taskId/reviews` integration
- [ ] Add `GET /:taskId/approvals` integration
- [ ] Add `GET /:taskId/attachments/:attachmentId/presign-download` integration
- [ ] Add `POST /:taskId/attachments` integration (finalize uploaded attachment metadata)
- [ ] Add `GET /:taskId/quality` and `PUT /:taskId/quality` integration

### Subtasks
- [ ] Add `POST /:id/subtasks`
- [ ] Add `PATCH /:id/subtasks/:subtaskId/status`

### Compat convenience endpoints (if UX needs direct data)
- [ ] Add `GET /self-tasks/my`
- [ ] Add `GET /tasks/my`
- [ ] Add `GET /tenant/current`

## 3.2 Implement after backend confirmation (potentially scope-sensitive)

- [ ] `POST /:id/reassign` (confirm product workflow ownership)
- [ ] `GET /approvals/pending/me` vs existing pending query model (finalize one)
- [ ] `PATCH /approvals/:approvalId` generic update endpoint usage (if needed by UI)

## 3.3 Defer unless explicitly in product scope

- [ ] Catalog/Admin domain UI integrations
- [ ] Recurrence domain UI integrations
- [ ] Performance domain UI integrations
- [ ] Notification management UI under JTS app

---

## 4) Frontend Implementation Instructions (How to build)

## 4.1 API client layer

File: `packages/hrms-mfe/lib/api/jts-client.ts`

- [ ] Add typed methods grouped by domain:
  - `taskCollaboration.*`
  - `subtasks.*`
  - optional `compat.*`
- [ ] Use shared fetch helpers (`fetchJson` / `fetchJsonOptional`)
- [ ] Normalize envelope variants in one place (no page-level parsing)
- [ ] Stop returning broad `unknown` for stable routes

## 4.2 Types and validation

- [ ] Add DTO and response types in `packages/hrms-mfe/lib/types/*`
- [ ] Add runtime-safe guards for optional/mixed backend fields
- [ ] Add status and error-code enums as shared constants

## 4.3 Query hooks and caching

- [ ] Extend `packages/hrms-mfe/lib/jts-query-keys.ts`
- [ ] Add `use-jts-*` hooks for newly integrated routes
- [ ] Define mutation invalidation granularity (avoid full cache blast)

## 4.4 Route handlers (only where needed)

Use catch-all by default; add explicit Next routes only for:
- request shape adaptation
- special fallback logic
- endpoint-specific error translation

Likely explicit additions:
- [ ] `app/api/jts/tasks/[id]/subtasks/route.ts`
- [ ] `app/api/jts/tasks/[id]/subtasks/[subtaskId]/status/route.ts`
- [ ] `app/api/jts/tasks/[id]/attachments/[attachmentId]/presign-download/route.ts`

## 4.5 UI integration and UX behavior

- [ ] Add loading, empty, and error states for new surfaces
- [ ] Map known backend business codes to user-friendly toasts/messages
- [ ] Treat validation/not-found/status-transition errors as expected business outcomes
- [ ] Keep retry/backoff consistent and avoid aggressive rapid polling (prevent `429`)

---

## 5) Execution Plan for Frontend Team

## Sprint A (immediate)

- [ ] Collaboration gaps: reviews list, approvals list, attachment download/finalize, quality read/write
- [ ] Subtask create/status update
- [ ] Hook + query key integration
- [ ] Unit tests for response normalization

## Sprint B (post backend clarifications)

- [ ] finalize compat endpoint usage (`my tasks`, `tenant current`)
- [ ] reassign flow
- [ ] approvals pending/me vs pending query consolidation

## Sprint C (scope-based expansion)

- [ ] recurrence/performance/catalog/notifications only if product signs off

---

## 6) Blocker Tracker Template

Use this table in daily sync:

| Item | Owner | Status | Needed By | Notes |
|---|---|---|---|---|
| Canonical path family freeze | Backend | Pending |  |  |
| Approvals filter behavior | Backend | Pending |  |  |
| Error code map final | Backend | Pending |  |  |
| Collaboration gap integration | Frontend | Pending |  |  |
| Subtask mutation support | Frontend | Pending |  |  |

---

## 7) Done Criteria

Mark frontend as aligned only when:

- [ ] No screen relies on undocumented endpoint aliases
- [ ] All used routes have typed request/response contracts
- [ ] All critical mutations persist and reflect on reload
- [ ] Business-rule errors are handled intentionally in UI
- [ ] Backend and frontend signed off canonical route + error contracts

