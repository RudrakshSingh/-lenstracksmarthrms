# Payroll: Frontend (HRMS MFE) ↔ Backend — gap analysis

**Audience:** Frontend (Next.js BFF / `packages/hrms-mfe`), gateway, payroll-service, hr-service  
**Purpose:** Single place to see **what already matches** the [Frontend ↔ Backend alignment handoff](#reference-handoff-summary) and **what differs** so payroll stays state-driven without guesswork.

**Hinglish one-liner:** Ye doc batata hai FE jo expect karta hai vs ye repo mein payroll-service **actually** kya return karta hai — jahan shape/path alag hai wahan **mapping ya backend change** decide karo.

---

## Reference: handoff summary

The product handoff (external doc / ticket) describes:

- Cycle ref `PAYROLL-{YYYY}-{MM}` as source of truth.
- `GET …/payroll-workflow/cycle/{cycleRef}` with `status`, `version`, **`allowedActions` as `string[]`**, optional `hrSubmittedBy`, `employeeCount`, `errors`.
- Workflow **POST**s under `/cycle/{cycleRef}/<action>` with **`version` in body** and **`If-Match`** on mutations.
- Gates: employee-master, attendance-leave, payroll validation — **pass** if `ok` / `passed` / `status === PASS|OK`.
- Run: `POST` with `dryRun`; server enforces gates on non-dry final run.
- Errors: JSON with `code` (e.g. `STALE_VERSION`, `MFA_REQUIRED`, `CYCLE_LOCKED`, `SAME_USER_FINANCE_APPROVAL`, `CONCURRENT_RUN_IN_PROGRESS`).

This file compares that contract to **this repository’s** implementation.

---

## What already aligns

| Topic | Backend behavior |
|--------|-------------------|
| **Cycle ref** | `PAYROLL-${year}-${paddedMonth}` — same convention as handoff (`payrollWorkflowController.buildCycleRef`, reports, payslips). |
| **Cycle GET** | `GET /api/payroll-workflow/cycle/:cycleRef` returns `success`, `data.cycle`, `data.allowedActions`, optional `data.gates` when `includeGates=true`. |
| **Workflow routes** | `hr-submit`, `finance-decision`, `freeze`, `post`, `unlock` exist; `audit-trail` exists. |
| **Runs + HR proxy** | `POST /api/hr/payroll/runs` (hr-service) → `POST /api/payroll-workflow/runs` with `dryRun`, `month`, `year`. |
| **Gates — `ok`** | Gate evaluators use `gateEnvelope(..., ok, ...)` with **`ok: boolean`** — compatible with handoff “pass” rules when FE reads `data.ok`. |
| **Dry run** | `dryRun: true` returns **200** with gate evaluation only (no final run). |
| **Final run + gates** | Non-dry run returns **400** + `code: 'GATES_FAILED'` when `evaluateAllGates` is not all OK. |
| **Concurrent run** | **409** + `CONCURRENT_RUN_IN_PROGRESS` when another run is `QUEUED`/`PROCESSING`. |
| **4-eyes finance** | **403** + `SAME_USER_FINANCE_APPROVAL` on finance approve when approver equals `hr_submitted_by`. |
| **MFA** | **403** + `MFA_REQUIRED` when `PAYROLL_APPROVAL_MFA_REQUIRED=true` and MFA not satisfied (selected routes). |
| **Stale version** | **409** + `STALE_VERSION` when `PAYROLL_STRICT_VERSION=true` and body version mismatches (where `assertVersionMatch` is applied). |
| **Immutable cycle** | **423** + `CYCLE_LOCKED` via `rejectIfCycleImmutable` (where used). |

---

## Gaps and required decisions

### 1. `allowedActions`: object vs `string[]` (frontend whitelist)

**Backend today:** `allowedActions` is an **object** from `payrollStateMachine.allowedActions(cycle)` — booleans such as `canStartDryRun`, `canHrSubmit`, `canFinanceDecision`, etc., plus `version`, `status`, `statusRaw`.

**Handoff expects:** `allowedActions: string[]` with tokens like `dry_run`, `hr_submit`, `finance_approve`, …

**Options (pick one):**

1. **Frontend maps booleans → tokens** (no backend change): use the table below.
2. **Backend adds** `allowedActionTokens: string[]` (or replaces `allowedActions` with tokens) so OpenAPI and MFE stay one shape.

**Suggested mapping (object → handoff-style tokens):**

| Backend field | Suggested token(s) |
|---------------|---------------------|
| `canStartDryRun` | `dry_run` |
| `canStartFinalRun` | `final_run` |
| `canHrSubmit` | `hr_submit` |
| `canFinanceDecision` | `finance_approve`, `finance_reject` (same gate; actual action is body `decision`) |
| `canFreeze` | `freeze` |
| `canPost` | `post` |
| `canReconcile` | `reconcile` |
| `canUnlockFrozen` | `unlock` |

**Note:** There is **no** boolean for a separate “finance review” step in the state machine — see §2.

---

### 2. `POST …/finance-review` is a no-op (deprecated)

**Backend:** `moveToFinanceReview` returns **200** with `deprecated: true` and message that the cycle stays in `HR_APPROVED` until `finance-decision`.

**Implication:** If the MFE shows a **“Finance review”** step that calls `finance-review`, it does **not** change state. Workflow intent: **`HR_APPROVED` → `POST finance-decision`** (approve/reject). UI should either **hide** `finance_review` or treat it as informational only unless product restores a real transition.

---

### 3. `If-Match` header vs body `version` / `expectedVersion`

**Handoff:** Client sends `If-Match: "{version}"`.

**Backend:** No `If-Match` parsing in payroll-service (grep shows no `If-Match`). Concurrency uses **`req.body.version` or `req.body.expectedVersion`** only when **`PAYROLL_STRICT_VERSION=true`** (`assertVersionMatch` in `payrollWorkflow.middleware.js`).

**Action:** Either:

- **BFF/FE** sends version **only in JSON body** (and documents that as canonical), or  
- **Backend** adds reading `If-Match` and aligning with `workflow_version` (optional; matches handoff literally).

If `PAYROLL_STRICT_VERSION` is **not** `true` in an environment, version mismatches **will not** return `STALE_VERSION` — FE should not assume optimistic locking is on until ops confirms env.

---

### 4. Which mutations enforce `assertVersionMatch` / `rejectIfCycleImmutable`

**Version check** (`assertVersionMatch`): used on **hr-submit**, **finance-decision**, **freeze** (and possibly others — see controller).

**Not verified in all paths:** e.g. **`postCycleToFinance`** does not call `assertVersionMatch` in the current controller snippet — product should confirm whether post must be version-gated like the handoff §4.

**Unlock:** `unlockFrozenCycle` bumps version after unlock but does not mirror the same `assertVersionMatch` pattern as other steps — confirm if unlock should require `expectedVersion`.

---

### 5. Reconcile: **GET** not POST

**Backend:** `GET /api/payroll-workflow/cycle/:cycleRef/reconcile` (`payrollWorkflow.routes.js`).

**Handoff table** sometimes lists workflow actions as POSTs. If the MFE uses `POST …/reconcile`, it will **404** — client must use **GET** (or gateway rewrites).

---

### 6. Gate and validation URLs (BFF vs services)

| Handoff path | This repo |
|--------------|-----------|
| `GET /api/hr/gates/employee-master` | HR proxy → payroll `GET /api/payroll-workflow/gates/employee-master` |
| `GET /api/hr/gates/attendance-leave?month=&year=` | Same pattern; **month/year required** for attendance-leave gate |
| `GET /api/payroll/validation?month=&year=` | Payroll `GET /api/payroll/validation` returns `{ success, data: { validation, allGates } }` — FE should read **`data.validation.ok`** or nested gate objects |

**Also available:** `GET /api/payroll-workflow/gates/payroll-validation` (single gate, same evaluator family).

---

### 7. Final run failure HTTP status

**Handoff:** suggests **403/422/412** when gates fail for final run.

**Backend:** **400** + `GATES_FAILED` when gates fail (non-dry). Still JSON with a clear `code` — **update FE error mapping** to treat `400` + `GATES_FAILED` like a blocked final run.

---

### 8. Cycle document shape vs normalized `status`

**GET cycle** returns Mongo **`cycle`** as stored (`status` may be legacy: `DRAFT_HR`, `FINANCE_REVIEW`, `SLIP_FROZEN`, …). **`data.allowedActions.status`** is **normalized** canonical status — FE can prefer `allowedActions.status` for UI state machine display.

---

### 9. `hrSubmittedBy` naming

Handoff uses camelCase **`hrSubmittedBy`**. Backend cycle model likely uses **`hr_submitted_by`** (snake). BFF normalization or FE accepts both.

---

## Error codes — quick matrix (this repo)

| Code | Typical HTTP | Where |
|------|----------------|-------|
| `MFA_REQUIRED` | 403 | `requirePayrollMfa` |
| `STALE_VERSION` | 409 | `assertVersionMatch` when strict mode on |
| `VERSION_REQUIRED` | 400 | strict mode, missing version |
| `CYCLE_LOCKED` | 423 | `rejectIfCycleImmutable` |
| `SAME_USER_FINANCE_APPROVAL` | 403 | `financeCycleDecision` |
| `CONCURRENT_RUN_IN_PROGRESS` | 409 | `startPayrollRun` |
| `GATES_FAILED` | 400 | non-dry run, gates not OK |
| `LOCK_NOT_ACQUIRED` | 409 | distributed lock |

Add **`GATES_FAILED`** and **`LOCK_NOT_ACQUIRED`** to MFE interpreters if not already.

---

## Definition of Done — cross-team checklist

**Backend / platform**

- [ ] Document whether **`PAYROLL_STRICT_VERSION`** is `true` in prod (or add `If-Match` support).
- [ ] Publish **`allowedActions` contract**: object vs new `allowedActionTokens[]` in OpenAPI.
- [ ] Confirm **`finance-review`**: remove route, or restore real transition (currently deprecated no-op).
- [ ] Align **reconcile** HTTP method in gateway docs (**GET**).
- [ ] Confirm **post** (and any other mutation) should enforce **version** like handoff §4; implement if missing.

**Frontend / BFF**

- [ ] Map **boolean `allowedActions`** → UI tokens **or** consume server `allowedActionTokens` once added.
- [ ] Stop relying on **`If-Match`** alone until gateway/service supports it; send **`version`/`expectedVersion` in body** when strict locking is enabled.
- [ ] Call **reconcile** with **GET**.
- [ ] Map **400 + `GATES_FAILED`** for blocked final run.
- [ ] Treat **`finance-review`** as no-op / hide unless backend changes.

---

## Code pointers (this repo)

| Area | Location |
|------|----------|
| State machine + `allowedActions` object | `microservices/payroll-service/src/utils/payrollStateMachine.js` |
| Cycle GET, gates, runs, workflow | `microservices/payroll-service/src/controllers/payrollWorkflowController.js` |
| Routes (methods, order) | `microservices/payroll-service/src/routes/payrollWorkflow.routes.js` |
| MFA / version / locked | `microservices/payroll-service/src/middleware/payrollWorkflow.middleware.js` |
| Standalone validation route | `microservices/payroll-service/src/routes/payrollValidation.routes.js` |
| HR → payroll proxy | `microservices/hr-service/src/routes/payrollWorkflowProxy.routes.js` |

---

**Document version:** 1.0 — aligned with `payroll-service` workflow + HR proxy in this repository. Update when `allowedActions` shape, `finance-review`, or version/`If-Match` behavior changes.
