# Frontend Payroll Process Flow: Screen-to-API Mapping

## Why this doc
This is a practical frontend integration guide for the current payroll process screens (like your screenshots), with exact button-to-API mapping and backend state alignment.

Use this doc while implementing:
- `/payroll/salaries` screen
- `/payroll/process` wizard/stepper
- final finance integration + reconciliation UI

---

## Core rule (most important)

- Employee-level salary calculation APIs are **not** the final payroll posting flow.
- Final finance push must go through payroll cycle workflow states.

Correct month-end sequence:
1. Generate monthly records
2. Initiate cycle
3. HR submit
4. Finance review
5. Finance decision
6. Freeze slips
7. Post to finance
8. Reconcile

---

## Backend Status Model (authoritative)

Always render UI status from backend cycle status, not from local step progress.

- `DRAFT_HR`
- `HR_APPROVED`
- `FINANCE_REVIEW`
- `FINANCE_APPROVED`
- `SLIP_FROZEN`
- `POSTED_TO_FINANCE`
- `SENT_BACK_TO_HR`

---

## Header Contract (all protected calls)

Send on every request:

- `Authorization: Bearer <accessToken>`
- `X-Tenant-Id: <tenant_slug>` (example: `lenstrack`)
- `X-Company-Id: <company_id>` (recommended)
- `Content-Type: application/json`

---

## Screen 1: Salary Management (`/payroll/salaries`)

## 1) List/Search/Filter salaries

- **Use for grid load**:
  - `GET /api/salary/payroll-summary?month=<m>&year=<y>`

UI mapping:
- Gross/Net columns from employee summary rows
- Status badge: derived from active salary + payroll cycle context (if available)

## 2) Add Salary button

- `POST /api/salary/calculate`

Request:
```json
{
  "employee_id": "EMP001",
  "gross_monthly": 50000,
  "variable_incentive": 2000,
  "professional_tax": 200,
  "tds": 1000
}
```

## 3) Edit Salary button

- `PUT /api/salary/employee/:employeeId`

## 4) View salary history / detail

- `GET /api/salary/employee/:employeeId`
- `GET /api/salary/employee/:employeeId/history?limit=12`

---

## Screen 2: Process Payroll (`/payroll/process`)

This section maps your stepper buttons exactly.

### A. Process Payroll button (top form submit)

Do these in sequence:

1) `POST /api/salary/monthly-records/generate`
```json
{ "month": 4, "year": 2026 }
```

2) `POST /api/payroll-workflow/cycle/initiate`
```json
{
  "month": 4,
  "year": 2026,
  "company_id": "<optional>",
  "brand_id": "<optional>",
  "branch_id": "<optional>",
  "department_id": "<optional>"
}
```

Expected cycle ref format:
- `PAYROLL-YYYY-MM` (example: `PAYROLL-2026-04`)

### B. Preview Calculation button

Read-only calls:
- `GET /api/salary/payroll-summary?month=<m>&year=<y>`
- optional cycle report:
  - `GET /api/payroll-workflow/reconciliation/report?month=<m>&year=<y>`

### C. Save Draft button

Frontend draft only unless backend draft endpoint is introduced.
Do not alter workflow status on backend.

---

## Stepper Mapping (your current UI steps)

Your UI shows:
1. Attendance Data Import  
2. Salary Components Calculation  
3. Performance Adjustments  
4. Statutory Deductions  
5. Net Salary Calculation  
6. Payslip Generation  
7. Financial Integration

Backend phase mapping should be:

- Steps 1-5 => preparation/compute stage before HR submit
- Step 6 (Payslip Generation) => **must map to freeze**
- Step 7 (Financial Integration) => **must map to post + reconcile**

### Step 6 action

- **Primary CTA**: Freeze Payslips
- API:
  - `POST /api/payroll-workflow/cycle/:cycleRef/freeze`

### Step 7 action

- **Primary CTA**: Push to Finance
- APIs:
  1. `POST /api/payroll-workflow/cycle/:cycleRef/post`
  2. `GET /api/payroll-workflow/cycle/:cycleRef/reconcile`

Post request body:
```json
{
  "store_id": "69a2eac35afbd9ae9fed8585",
  "payment_method": "BANK_TRANSFER"
}
```

---

## Approval Buttons Mapping

## Submit for Approval (HR)

- `POST /api/payroll-workflow/cycle/:cycleRef/hr-submit`
- Allowed from `DRAFT_HR` or `SENT_BACK_TO_HR`

## Finance Review Start

- `POST /api/payroll-workflow/cycle/:cycleRef/finance-review`
- Allowed only from `HR_APPROVED`

## Finance Final Decision

- `POST /api/payroll-workflow/cycle/:cycleRef/finance-decision`
```json
{
  "decision": "approve",
  "comment": "optional"
}
```

- `approve` => `FINANCE_APPROVED`
- reject/send-back => `SENT_BACK_TO_HR`

---

## Adjustments Flow (fines/increments)

## Create adjustment (HR/Admin)

- `POST /api/payroll-workflow/adjustments`
```json
{
  "cycle_ref": "PAYROLL-2026-04",
  "employee_code": "EMP001",
  "adjustment_type": "FINE_DEBIT",
  "amount": 500,
  "reason": "Late coming",
  "is_post_freeze_request": false
}
```

## Authority decision

- `POST /api/payroll-workflow/adjustments/:id/authority-decision`

## Finance decision on adjustment

- `POST /api/payroll-workflow/adjustments/:id/finance-decision`

---

## What frontend should disable (guardrails)

- Disable `finance-review` button until status is `HR_APPROVED`.
- Disable `freeze` until status is `FINANCE_APPROVED`.
- Disable `post` until status is `SLIP_FROZEN`.
- Disable `hr-submit` once moved to finance unless status returns `SENT_BACK_TO_HR`.
- Disable "Skip" on Step 6 and Step 7 by default.

---

## Error handling UX contract

Handle and surface backend message directly:

- `400`: invalid transition / validation
  - example: `Cannot freeze from HR_APPROVED`
- `401`: token invalid/expired
- `403`: role/permission denied
- `404`: cycle/expense not found
- `500`: integration/server failure

UI pattern:
- toast + inline step error badge
- keep step in previous valid state
- allow retry where safe (`post`, `reconcile`)

---

## Success criteria for final step

Step 7 should be marked complete only if both are true:

1) `POST /cycle/:cycleRef/post` returns `200` and cycle status becomes `POSTED_TO_FINANCE`
2) `GET /cycle/:cycleRef/reconcile` returns `200` and `matched === true`

Optionally cross-verify:

- `GET /api/financial/expenses/by-source/:cycleRef` returns `200` with expected `total_amount`.

---

## Suggested frontend state object

```ts
type PayrollFlowState = {
  cycleRef: string;
  cycleStatus:
    | 'DRAFT_HR'
    | 'HR_APPROVED'
    | 'FINANCE_REVIEW'
    | 'FINANCE_APPROVED'
    | 'SLIP_FROZEN'
    | 'POSTED_TO_FINANCE'
    | 'SENT_BACK_TO_HR';
  month: number;
  year: number;
  storeId?: string;
  reconcile?: {
    matched: boolean;
    cyclePayable: number;
    financeExpenseTotal: number;
    financeExpenseId?: string;
  };
};
```

---

## Minimal E2E test path for frontend QA

1. Login with tenant admin
2. Generate monthly records
3. Initiate cycle
4. HR submit
5. Finance review
6. Finance approve
7. Freeze
8. Post
9. Reconcile
10. Verify source expense exists in finance by cycle ref

If all 10 pass, frontend flow is correctly aligned with current backend phase.

---

## HR Draft Data Extraction Checklist (must implement)

This section is for your exact point: HR draft screen should be fully prepared from backend data before sending for approval.

## Goal

Build one consolidated HR Draft payload in frontend by combining salary, payroll record, and workflow/cycle data.

## Step A: Base month computation data

1) Call:
- `POST /api/salary/monthly-records/generate`
- body: `{ "month": <m>, "year": <y> }`

2) Read response:
- `data.total_employees`
- `data.total_gross`
- `data.total_net`

Use this as first-level draft summary.

## Step B: Initialize cycle and bind records

1) Call:
- `POST /api/payroll-workflow/cycle/initiate`
- body: `{ month, year, company_id?, brand_id?, branch_id?, department_id? }`

2) Read cycle:
- `data.cycle_ref` (or derive: `PAYROLL-YYYY-MM`)
- `data.status` (should be `DRAFT_HR`)
- `data.employee_count`
- `data.total_gross`
- `data.total_net`
- `data.total_adjustments`
- `data.total_final_payable`

This cycle object is the source of truth for HR draft header.

## Step C: Salary/employee detail block for table cards

Use:
- `GET /api/salary/payroll-summary?month=<m>&year=<y>`

Read:
- per-employee gross/net/ctc breakdown
- overall totals from `data.summary`

UI recommendation:
- show employee rows from payroll summary response
- show draft totals from cycle response
- if mismatch appears, trigger regenerate/initiate refresh

## Step D: Adjustments extraction (if UI supports fines/increments pre-approval)

When HR creates adjustment:
- `POST /api/payroll-workflow/adjustments`

After authority/finance decisions:
- totals are recomputed in backend cycle
- frontend should refresh cycle data before showing final draft payable

## Step E: Status gating before Submit for Approval

Enable `Submit for Approval` only if:
- cycle exists
- cycle status is `DRAFT_HR` or `SENT_BACK_TO_HR`
- employee_count > 0
- totals are present (gross/net/final payable)

Then call:
- `POST /api/payroll-workflow/cycle/:cycleRef/hr-submit`

---

## Suggested consolidated frontend draft object

```ts
type HrDraftViewModel = {
  month: number;
  year: number;
  cycleRef: string;
  cycleStatus: 'DRAFT_HR' | 'SENT_BACK_TO_HR' | 'HR_APPROVED' | string;
  totals: {
    totalEmployees: number;
    totalGross: number;
    totalNet: number;
    totalAdjustments: number;
    totalFinalPayable: number;
  };
  payrollRows: Array<{
    employeeId: string;
    employeeName: string;
    grossMonthly: number;
    netTakeHome: number;
    monthlyCtc: number;
    status?: string;
  }>;
  readyForApproval: boolean;
};
```

---

## Fallback and retry logic (important)

- If `monthly-records/generate` returns no active salaries:
  - block flow and show “Create/activate salary structures first.”
- If `cycle/initiate` fails:
  - keep UI in draft-uninitialized state, allow retry
- If summary and cycle totals differ:
  - show “Data refresh required” and provide “Recompute Draft” action
- Before HR submit:
  - perform one final cycle refresh to avoid stale totals


