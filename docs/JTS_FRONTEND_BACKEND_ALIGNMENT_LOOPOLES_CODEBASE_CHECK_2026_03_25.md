# JTS frontend-backend alignment loopholes (codebase check)

**Date:** 2026-03-25  
**Method:** Repository code inspection only (no chat assumptions)  
**Workspace checked:** `lenstracksmarthrms`  
**Goal:** Validate the submitted "Frontend Truth" note against actual code and list remaining loopholes.

---

## 1) Critical finding: frontend repo scope mismatch

Your submitted note says the reviewed repo is **`hrms-frontend`** with scope:

- `packages/hrms-mfe`
- `packages/shell`
- `packages/shared`

In the current workspace, only this frontend artifact exists:

- `packages/hrms-mfe/lib/api/jts-client.ts`

The following claimed areas are **not present** in this workspace:

- `packages/hrms-mfe/app/tasks/**`
- `packages/hrms-mfe/app/api/jts/**/route.ts`
- `packages/shell/**`
- `packages/shared/**`

## Impact

- The page-level and nav-level claims in the submitted note cannot be verified from this repo.
- Any statement about "all pages implemented" or shell/shared nav parity is currently **unverifiable here**.

## Action

- If those files live in a different repo/workspace, run this same audit there.
- Do not mark those claims as code-verified for this repository.

---

## 2) Claim-vs-code verification matrix (what we can verify here)

## 2.1 Verified as aligned

- `jts-client.ts` exists and uses backend canonical paths:
  - `/jts/tasks`
  - `/jts/tasks/:id`
  - `/jts/tasks/:id/status`
  - `/jts/tasks/:id/activities`
  - `/jts/tasks/workday/:workdayId`
  - `/jts/tasks/:taskId/reviews`
  - `/jts/tasks/:taskId/attachments/presign-upload`
  - `/jts/approvals/pending`
  - `/jts/analytics`
- Review decision mapping is aligned with backend:
  - `APPROVE` -> `APPROVED`
  - `REJECT` / `REQUEST_CHANGES` -> `REWORK_REQUIRED`
- Timer active fallback is aligned:
  - first `/jts/active`
  - fallback `/jts/timers/active`
- Bulk endpoint is disabled (`bulkTasks()` rejects).

## 2.2 Not aligned with submitted frontend note

1. **`forceCompleteTask()` behavior mismatch**
   - Submitted note says it throws/hard-disabled.
   - Current `jts-client.ts` maps `forceCompleteTask()` to `completeTask()`.
   - Risk: UI may accidentally present force-complete semantics while backend has no separate policy.

2. **Extension request payload mismatch**
   - Submitted note says client sends both camel + snake keys:
     - `approvalType` and `approval_type`
     - `approverEmployeeId` and `approver_employee_id`
   - Current `jts-client.ts` sends only backend-safe keys:
     - `approval_type`
     - `approver_employee_id`
   - This is not wrong, but submitted documentation is inaccurate.

3. **Approvals pending query mismatch**
   - Submitted note says only `approverId` is sent.
   - Current `jts-client.ts` method type allows `approvalType` in query object and will serialize it if provided.
   - Backend route validates only `approverId`; unknown query keys are stripped.
   - Risk: confusion; frontend may think server-side filtering exists when it does not.

4. **Review text fields mismatch**
   - Submitted note says both `notes` and `remarks` are sent.
   - Current `submitTaskReview()` sends `remarks` (mapped from `remarks ?? notes`) and does not send `notes`.
   - This is fine for backend, but doc claim is inaccurate.

---

## 3) Backend contract loopholes still affecting frontend certainty

Even with the current `jts-client.ts`, these backend-side gaps remain:

1. **Error schema is still mixed**
   - Different handlers return `message` vs `error` inconsistently.
   - Route-404 body shape differs from controller/domain errors.
   - Frontend must keep normalization logic.

2. **Unsupported endpoints remain unavailable**
   - No dedicated `force-complete`
   - No dedicated `extension-requests`
   - No `tasks/bulk`

3. **Approvals pending server-side filter**
   - `approvalType` is not supported in backend query validation.
   - Filtering must be client-side until backend explicitly adds support.

4. **No OpenAPI artifact**
   - Contract relies on markdown docs and route inspection.
   - Increased risk of drift unless docs are updated in every API-changing PR.

---

## 4) Recommended fixes to close loopholes

## 4.1 Frontend-side quick fixes (this repo)

- Update `jts-client.ts` to avoid misleading API surface:
  - remove `approvalType` from `listPendingApprovals()` query type or document as "client-side only"
  - either:
    - rename `forceCompleteTask()` to `completeTaskCompat()`, or
    - make `forceCompleteTask()` reject with explicit "unsupported"
- Keep extension approval payload docs consistent with actual keys sent.
- Keep review payload docs consistent (`remarks` canonical).

## 4.2 Backend-side lock tasks

- Unify error schema globally to `{ code, message, details? }`.
- Publish versioned API contract updates for every route/payload change.
- Decide and document v2 status for `force-complete` and `tasks/bulk`.

---

## 5) "100% lock" readiness for this workspace

**Current status:** **Not 100% lock** (for frontend-backend alignment evidence), because:

- large parts of claimed frontend surface are absent in this repository,
- submitted frontend truth contains several mismatches vs actual `jts-client.ts`,
- backend still has mixed error schema and unsupported endpoint decisions not fully product-frozen.

---

## 6) Evidence files used

- `packages/hrms-mfe/lib/api/jts-client.ts`
- `microservices/jts-service/src/routes/task.routes.js`
- `microservices/jts-service/src/routes/taskCollaboration.routes.js`
- `microservices/jts-service/src/routes/timer.routes.js`
- `microservices/jts-service/src/routes/hrmsJtsCompat.routes.js`

