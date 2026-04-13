# JTS Frontend-Backend Go-Live Checklist

**Audience:** frontend developers, backend engineers, QA, tech leads  
**Purpose:** single source of truth before claiming "100% aligned / go-live ready"  
**Status:** fill this document collaboratively; do not mark go-live until all Must-Have blocks are complete.

---

## 1) Backend Required Confirmations (Must-Have)

### 1.1 Canonical route contract (with aliases)

Backend owner must finalize and sign off:

- [ ] `timeline` vs `activities` final endpoint
  - Canonical:
  - Alias (if supported):
  - Sunset plan for alias:
- [ ] `attachments/presign` vs `attachments/presign-upload`
  - Canonical:
  - Alias:
- [ ] Timer active endpoint (`/timer/active` vs `/active` vs `/timers/active`)
  - Canonical:
  - Alias:
- [ ] Reviews naming (`/reviews` vs `/review`)
  - Canonical:
  - Alias:
- [ ] Self-task path (`/tasks/self` vs `/self-tasks`)
  - Canonical:
  - Alias:

### 1.2 Approvals pending API

- [ ] `approvalType` query is officially:
  - [ ] supported and filtered server-side
  - [ ] accepted but ignored
  - [ ] rejected (frontend must avoid sending)
- [ ] Final route:
- [ ] Required query params:

### 1.3 Reviews API finalization

- [ ] List endpoint + response shape finalized
- [ ] Create endpoint + payload finalized
- [ ] Update endpoint + payload finalized
- [ ] Decision endpoint + payload finalized
- [ ] Review status enum finalized

### 1.4 Analytics contract

- [ ] Only `/analytics` is official
- [ ] Split endpoints also official:
  - [ ] `/analytics/overview`
  - [ ] `/analytics/by-employee`
  - [ ] `/analytics/by-team`
  - [ ] `/analytics/by-task-type`
- [ ] If split endpoints are optional, fallback behavior documented

### 1.5 Task status enum (final)

- [ ] Final list published (must include explicit answer for `BLOCKED`, `CANCELLED`, `ARCHIVED`)
- [ ] Deprecated statuses (if any) listed
- [ ] Transition rules published

### 1.6 Response and errors

- [ ] Response envelope is always `{ success, data, meta, message }`
- [ ] Or mixed shapes officially allowed and listed
- [ ] Stable error-code map published by module:
  - [ ] tasks
  - [ ] timers
  - [ ] approvals
  - [ ] reviews
  - [ ] analytics
  - [ ] auth/tenant

---

## 2) Backend Required Field Contract (Must-Have)

For each screen domain, backend must guarantee field availability and naming policy.

### 2.1 Task list/card/detail

- [ ] `id`
- [ ] `taskCode`
- [ ] `title`
- [ ] `description`
- [ ] `status`
- [ ] `priority`
- [ ] `source`
- [ ] `dueAt`
- [ ] `slaMinutes`
- [ ] `assignedToEmployee`
- [ ] `createdByEmployee`
- [ ] `isBlocked`
- [ ] `blockedReason`
- [ ] `escalationLevel`
- [ ] `requiresReview`
- [ ] `requiresTimer`
- [ ] `requiresEvidence`

### 2.2 Approvals

- [ ] `id`
- [ ] `taskId`
- [ ] `status`
- [ ] `approvalType`
- [ ] `requestedByEmployeeId`
- [ ] `approverEmployeeId`
- [ ] `createdAt`
- [ ] `reason`

### 2.3 Reviews

- [ ] Employee identity fields
- [ ] `rating`
- [ ] period/date fields
- [ ] `status`
- [ ] reviewer fields
- [ ] goals/tasks counters required by UI

### 2.4 Analytics

- [ ] `overall`
- [ ] `byDepartment`
- [ ] `trends`
- [ ] snake_case and camelCase compatibility policy documented

---

## 3) Infra/Auth Prerequisites (Must-Have)

- [ ] `JWT_SECRET` exactly matches auth-service
- [ ] `X-Tenant-Id` behavior documented and consistent
  - mismatch rule:
  - missing header rule:
- [ ] Ingress routes verified:
  - [ ] `/jts/*` -> jts-service
  - [ ] `/api/jts/*` -> jts-service
- [ ] `JTS_PUBLIC_PATH_PREFIX` set correctly for prod (`/jts` when ALB path-prefix used)
- [ ] `JTS_SERVICE_URL` configured in hr-service
- [ ] `JTS_SERVICE_URL` configured in attendance-service

---

## 4) Frontend Remaining Work (No-Mock / Real-Data)

### 4.1 Reviews page

- [ ] Create modal wired to real mutation API
- [ ] Update modal wired to real mutation API
- [ ] Decision actions wired to real API

### 4.2 Optional analytics widgets

- [ ] Decision taken:
  - [ ] enable with split endpoints
  - [ ] remove/de-scope from UI
- [ ] Fallback UX defined when split endpoints unavailable

### 4.3 Real-time strategy

- [ ] Decision taken:
  - [ ] polling
  - [ ] websocket
  - [ ] hybrid
- [ ] Covered surfaces:
  - [ ] task board
  - [ ] approvals
  - [ ] timer state

### 4.4 Global API failure behavior

- [ ] Consistent retry/backoff policy
- [ ] Consistent empty/error states per page
- [ ] Toast/error messaging standardized

---

## 5) QA/UAT Data Requirements (Must-Have)

### 5.1 Role users

- [ ] employee user
- [ ] manager user
- [ ] reviewer user
- [ ] admin user
- [ ] superadmin user

### 5.2 Tenant-scoped seed data

- [ ] tasks in each status
- [ ] approvals in pending/approved/rejected
- [ ] review records
- [ ] analytics records
- [ ] timer sessions

### 5.3 Mandatory scenarios

- [ ] blocked-task lifecycle
- [ ] approvalType-filtered approvals
- [ ] tenant mismatch rejection
- [ ] attendance strict-mode timer start failure and success

---

## 6) Final Acceptance Criteria (Go-Live Definition)

All must be true:

- [ ] No page depends on hardcoded/mock arrays
- [ ] All mutations persist and reflect after refresh
- [ ] All critical routes pass smoke tests against real backend
- [ ] Error codes mapped to user-friendly UX
- [ ] Role and tenant restrictions validated
- [ ] Integration tests green for top flows:
  - [ ] tasks lifecycle
  - [ ] timer
  - [ ] approvals
  - [ ] analytics
  - [ ] reviews

---

## Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| Backend lead |  |  |  |
| Frontend lead |  |  |  |
| QA lead |  |  |  |
| Product owner |  |  |  |

