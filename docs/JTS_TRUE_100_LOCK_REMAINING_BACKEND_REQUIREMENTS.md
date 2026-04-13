# JTS true "100% lock" — remaining backend requirements for frontend

**Audience:** frontend developers, backend owners, QA, product leads  
**Date:** 2026-03-25  
**Scope:** what is still needed from backend to move from "usable" to "fully locked and predictable" contract for HRMS MFE.

This doc is intentionally practical: each section states (1) current state, (2) required backend action, (3) what frontend should do until closed.

---

## 1) Remaining items summary (must close for true lock)

1. **Single stable error schema** across 400/401/403/404/500.
2. **Versioned contract upkeep process** for `docs/JTS_API_CONTRACT_V1_FRONTEND.md`.
3. **Sample payload pack maintenance** with current examples for 6 critical flows.
4. **Explicit v2 decisions** for potential endpoint comeback (`force-complete`, `tasks/bulk`).

Without these 4, frontend still needs defensive parsing and fallback logic.

---

## 2) Error contract freeze (highest priority)

## Target schema (backend must enforce everywhere)

For **all non-2xx** responses:

```json
{
  "success": false,
  "code": "STRING_CODE",
  "message": "Human readable summary",
  "details": []
}
```

Rules:

- `code` is mandatory and stable (machine-parseable).
- `message` is mandatory and user-safe.
- `details` is optional; when present, always array (validation issues, field-level reasons).
- Never alternate between `error` and `message` keys for primary text; use `message` only.
- Keep HTTP semantics standard:
  - 400 validation/business input
  - 401 auth
  - 403 authorization/tenant boundaries
  - 404 not found/route missing
  - 409 conflict/state
  - 500 internal

## Current gap (why this is still open)

Current backend returns mixed shapes (`message` in some handlers, `error` in others, route 404 has no code, etc.). Frontend has to normalize multiple schemas.

## Backend action required

- Add one shared error response helper and use it in:
  - auth middleware
  - validation middleware
  - domain error mapper
  - not-found handler
  - global exception handler
- Ensure all controllers stop returning ad-hoc error bodies.
- Publish final code list in contract doc appendix.

## Frontend action until closed

- Keep central normalizer:
  - primary: `code`
  - fallback: `message`
  - fallback: `error`
- Do not remove fallback parser until backend lock PR is merged and validated.

---

## 3) Versioned contract artifact upkeep

Primary artifact: `docs/JTS_API_CONTRACT_V1_FRONTEND.md`

## Required governance

- Contract doc must behave like an API version file, not informal notes.
- Every backend PR that changes path/payload/enum/error must include doc update in same PR.
- Add mandatory sections:
  - `Version`
  - `Release date`
  - `Backward compatibility`
  - `Deprecations`
  - `Removal date` (for aliases or old fields)

## Changelog policy (enforce)

- **PATCH** (`1.0.x`): typo/example-only/non-breaking clarifications.
- **MINOR** (`1.x.0`): additive fields/endpoints, old behavior still valid.
- **MAJOR** (`x.0.0`): breaking changes (path, required field, enum rename, payload shape changes).

## Deprecation policy template

Use this exact record format in the contract doc:

```md
- Deprecated: <path/field>
- Replacement: <new path/field>
- First deprecated in: vX.Y.Z
- Removal target: vA.B.C (or date)
- Frontend migration owner: <name/team>
```

## Backend action required

- Add a contract-update checklist item to PR template.
- Treat missing contract update as PR-blocking for API-changing work.

## Frontend action required

- On every backend release, compare previous version tag vs new changelog section.
- Update mapper only against versioned changes, not Slack/chat assumptions.

---

## 4) Sample payload pack upkeep (must stay current)

The following examples must be present and validated in every contract version.

## 4.1 Create task

Endpoint: `POST /api/jts/tasks`  
Must include example covering:

- core fields (`title`, `priority`)
- assignment (`assignedToEmployeeId`)
- type/scope (`typeId`, `scopeOrgNodeId`)
- dependency list (`dependencyTaskIds`)
- review/timer/evidence flags

## 4.2 Review submit

Endpoint: `POST /api/jts/tasks/:taskId/reviews`  
Must include:

- `status` (`APPROVED` or `REWORK_REQUIRED`)
- optional `rating`
- optional `remarks`
- clear note that UI `REJECT` + `REQUEST_CHANGES` map to `REWORK_REQUIRED`

## 4.3 Extension approval (replacement of extension-requests route)

Endpoint: `POST /api/jts/tasks/:taskId/approvals`  
Must include:

- `approval_type: "EXTENSION_APPROVAL"`
- `approver_employee_id`
- payload sample (`requestedDueAt`, `reason`)

## 4.4 Presign upload

Endpoint: `POST /api/jts/tasks/:taskId/attachments/presign-upload`  
Must include:

- `file_name`
- `mime_type`
- sample success response fields needed by client upload flow

## 4.5 Approvals pending

Endpoint: `GET /api/jts/approvals/pending`  
Must include:

- supported query params (currently `approverId`)
- explicit note that `approvalType` is not server-filtered (until implemented)
- sample response row including approval type and payload object

## 4.6 Analytics response

Endpoint: `GET /api/jts/analytics`  
Must include full sample for:

- `overall`
- `trends`
- `byDepartment`
- `byStatus`
- `openAlerts`

## Backend action required

- Validate sample payloads against integration test/smoke data before each release.
- Contract doc sample section is release-gated (no stale examples allowed).

## Frontend action required

- Use sample pack as fixture source for parser/unit tests.
- Fail tests when unknown required keys disappear.

---

## 5) Explicit v2 decision notes (for clean client method re-enable)

These are not required for v1 runtime, but required for planning and clean SDK shape.

## 5.1 `force-complete` (candidate comeback)

Decision needed from backend/product:

- Will this return in v2? `yes/no`
- If yes:
  - path (`POST /tasks/:id/force-complete`?)
  - role matrix (who can force)
  - audit payload (must store actor + reason)
  - difference from normal `complete`

Frontend impact:

- Keep method scaffolded but disabled/feature-flagged until v2 contract exists.

## 5.2 `tasks/bulk` (candidate comeback)

Decision needed:

- Will bulk be implemented? `yes/no`
- If yes:
  - accepted actions enum
  - partial success schema
  - idempotency behavior
  - max taskIds per request

Frontend impact:

- Re-enable bulk client methods only when backend publishes stable result contract (success/fail arrays per id).

---

## 6) Backend-to-frontend closure checklist (sign-off block)

Mark all as complete before claiming "100% lock":

- [ ] Error schema unified to `{ code, message, details? }` across all error classes.
- [ ] `JTS_API_CONTRACT_V1_FRONTEND.md` updated with version + changelog + deprecation section.
- [ ] Sample payload pack refreshed for all 6 required flows.
- [ ] v2 decision notes for `force-complete` and `tasks/bulk` recorded as yes/no + conditions.
- [ ] Frontend parser tests green against latest sample pack.
- [ ] QA validates at least one real call per flow in non-local environment.

---

## 7) Recommended ownership

- **Backend owner:** maintain contract truth and examples.
- **Frontend owner:** maintain mapper compatibility and test fixtures.
- **QA owner:** validate examples against running environment.
- **Release manager:** block go-live if checklist has open items.

---

## 8) Frontend action summary (English, one-page)

Use this as the quick execution sheet for frontend developers.

## What frontend should treat as final **today** (v1)

- Use only canonical task/timeline/workday routes documented in `JTS_API_CONTRACT_V1_FRONTEND.md`.
- Map review decisions:
  - UI `APPROVE` -> API `APPROVED`
  - UI `REJECT` and `REQUEST_CHANGES` -> API `REWORK_REQUIRED`
- Do not call unsupported endpoints directly:
  - no `force-complete`
  - no `tasks/bulk`
  - no `extension-requests` (use approvals flow with `EXTENSION_APPROVAL`)
- For pending approvals, do not depend on server-side `approvalType` filtering.
- Keep analytics parser locked to the frozen keys in the contract doc (`overall`, `trends`, `byDepartment`, `byStatus`, `openAlerts`).

## What frontend must keep until backend lock is complete

- Keep a central error normalizer because backend error shapes are currently mixed.
- Continue fallback parsing for error text in this order:
  1. `code`
  2. `message`
  3. `error`
- Keep defensive guards in mappers (null checks, optional arrays, unknown enum handling).
- Keep compatibility tests for route and payload assumptions until checklist is fully closed.

## Minimum frontend test pack (must stay green every release)

- **Create task** request + response parsing.
- **Review submit** for both approved and rework-required outcomes.
- **Extension approval** creation flow (`EXTENSION_APPROVAL` payload structure).
- **Presign upload** handshake parsing.
- **Approvals pending** list parsing (including approval payload object).
- **Analytics** parser snapshot for `overall`, `trends`, `byDepartment`, `byStatus`, `openAlerts`.

## Release-time frontend checklist

- Pull latest `JTS_API_CONTRACT_V1_FRONTEND.md` version and changelog.
- Confirm no breaking contract change landed without version bump.
- Run parser tests against latest sample payload pack.
- Verify one live call per critical flow in QA/staging:
  - tasks list/detail
  - review submit
  - approvals pending
  - analytics
- If backend changed route/shape without doc update, raise blocker before release.

## When to simplify frontend code

Only remove fallbacks/normalizers after backend confirms all of the following:

- error schema unified to `{ code, message, details? }` everywhere
- contract doc updated with that freeze version
- QA validates new schema in real environment

Until then, keep robustness over strictness in frontend parsing.

