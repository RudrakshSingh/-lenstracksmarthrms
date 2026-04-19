# Frontend API Spec: Payroll-Salary-Expense Phase 1

## Purpose
This document is the frontend integration contract for the current Phase 1 backend flow:

- `Payroll` as salary engine and workflow owner
- `Salary` as payroll computation layer
- `Finance` as expense reflection + payroll posting layer

It includes authentication, headers, endpoint catalog, request/response formats, role constraints, status transitions, and integration sequence.

---

## Base URLs

- Production gateway: `https://api.etelios.com`
- Auth service routes: `/api/auth/*`
- HR store routes: `/api/hr/*`
- Payroll salary routes: `/api/salary/*`
- Payroll workflow routes: `/api/payroll-workflow/*`
- Financial routes: `/api/financial/*`

---

## Standard Headers

All protected APIs should send:

- `Authorization: Bearer <accessToken>`
- `X-Tenant-Id: <tenant_slug>` (example: `lenstrack`)
- `X-Company-Id: <company_id>` (recommended; required in strict tenant mode)
- `Content-Type: application/json`

Optional but recommended:

- `X-Request-Id: <uuid>`

---

## Common Response Envelope

Most endpoints follow this structure:

```json
{
  "success": true,
  "message": "Human readable message",
  "data": {}
}
```

Error shape usually:

```json
{
  "success": false,
  "message": "Error message"
}
```

Auth middleware errors may include a `code` field:

```json
{
  "success": false,
  "message": "Invalid token",
  "code": "INVALID_TOKEN"
}
```

---

## Role Access Matrix (Phase 1 APIs)

- `admin`: full access
- `hr`: salary + payroll cycle initiation/submit/freeze/reconcile + adjustments create
- `finance` / `accountant`: finance review/decision/post/replay + finance APIs
- `manager`: authority decision on adjustments + selected finance APIs
- `store_manager`: expense read/create APIs in finance module

If role check fails, expect `403`.

---

## 1) Authentication APIs

### 1.1 Login

- **Method**: `POST`
- **URL**: `/api/auth/login`
- **Auth required**: No

#### Request

```json
{
  "email": "admin@lenstrack.com",
  "password": "AdminPass123!",
  "tenantId": "lenstrack"
}
```

Also supported:

- `emailOrEmployeeId` instead of `email`
- `tenantId` can come from body/header/query

#### Success (`200`)

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "user_id",
      "email": "admin@lenstrack.com",
      "employee_id": "EMP001",
      "role": "admin",
      "tenantId": "lenstrack",
      "permissions": ["..."]
    },
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token",
    "mustChangePassword": false,
    "passwordTemporary": false
  }
}
```

#### Common Errors

- `400`: missing credentials, invalid login, inactive account
- `503`: transient DB/service issue

---

## 2) Store Lookup API (Used before payroll posting)

### 2.1 Get Stores

- **Method**: `GET`
- **URL**: `/api/hr/stores`
- **Auth required**: Yes

#### Query (optional)

- `page`, `limit`
- filters like `status`, `nature`

#### Success (`200`)

```json
{
  "success": true,
  "message": "Stores retrieved successfully",
  "data": [
    {
      "_id": "69a2eac35afbd9ae9fed8585",
      "name": "Store Name",
      "code": "STR001"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 20
  }
}
```

Frontend note: use `data[0]._id` as `store_id` when posting payroll cycle.

---

## 3) Salary Engine APIs (`/api/salary`)

Important integration clarification:

- `POST /api/salary/calculate` and `PUT /api/salary/employee/:employeeId` are salary-structure compute APIs.
- They are not the final "push to finance" trigger.
- Final salary posting to finance happens through payroll cycle flow:
  1. `POST /api/salary/monthly-records/generate`
  2. payroll workflow state transitions
  3. `POST /api/payroll-workflow/cycle/:cycleRef/post`

## 3.1 Calculate Salary

- **Method**: `POST`
- **URL**: `/api/salary/calculate`
- **Roles**: `admin`, `superadmin`, `hr`

#### Request

```json
{
  "employee_id": "EMP001",
  "gross_monthly": 50000,
  "variable_incentive": 2000,
  "professional_tax": 200,
  "tds": 1000
}
```

#### Success (`201`)

Returns computed salary breakup in `data` including:
- `gross_monthly`, `basic_salary`, `hra`, `special_allowance`
- `total_deductions`, `net_take_home`
- employer contributions and CTC numbers

#### Errors

- `400`: missing/invalid salary inputs
- `500`: compute/save error

---

### 3.2 Get Current Salary

- **Method**: `GET`
- **URL**: `/api/salary/employee/:employeeId`
- **Roles**: self or privileged (`admin/superadmin/hr`)

#### Success (`200`)

Current active salary structure with full breakup.

#### Errors

- `403`: access denied
- `404`: no salary record

---

### 3.3 Get Salary History

- **Method**: `GET`
- **URL**: `/api/salary/employee/:employeeId/history?limit=12`
- **Roles**: self or privileged

#### Success (`200`)

Array of historical salary structures.

---

### 3.4 Update Salary

- **Method**: `PUT`
- **URL**: `/api/salary/employee/:employeeId`
- **Roles**: `admin`, `superadmin`, `hr`

Creates new active salary record and deactivates older active one(s).

#### Success (`200`)

Updated salary structure with computed fields.

---

### 3.5 Payroll Summary

- **Method**: `GET`
- **URL**: `/api/salary/payroll-summary?month=4&year=2026`
- **Roles**: `admin`, `superadmin`, `hr`

#### Success (`200`)

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_employees": 120,
      "total_gross": 0,
      "total_net_take_home": 0
    },
    "employees": []
  }
}
```

---

### 3.6 Bulk Calculate

- **Method**: `POST`
- **URL**: `/api/salary/bulk-calculate`
- **Roles**: `admin`, `superadmin`, `hr`

#### Request

```json
{
  "employees": [
    {
      "employee_id": "EMP001",
      "gross_monthly": 55000,
      "variable_incentive": 1500,
      "professional_tax": 200,
      "tds": 1200
    }
  ]
}
```

#### Success (`200`)

Contains `results` and `errors` arrays.

---

### 3.7 Generate Month-wise Payroll Records

- **Method**: `POST`
- **URL**: `/api/salary/monthly-records/generate`
- **Roles**: `admin`, `superadmin`, `hr`

#### Request

```json
{
  "month": 4,
  "year": 2026
}
```

#### Success (`200`)

```json
{
  "success": true,
  "message": "Month-wise salary records generated successfully",
  "data": {
    "month": 4,
    "year": 2026,
    "total_employees": 120,
    "total_gross": 1000000,
    "total_net": 860000
  }
}
```

---

### 3.8 Reflect Monthly Salary Expense to Finance

- **Method**: `POST`
- **URL**: `/api/salary/monthly-records/reflect-expense`
- **Roles**: `admin`, `superadmin`, `hr`

#### Request

```json
{
  "month": 4,
  "year": 2026,
  "store_id": "69a2eac35afbd9ae9fed8585",
  "payment_method": "BANK_TRANSFER"
}
```

#### Success (`200`)

```json
{
  "success": true,
  "message": "Salary expense reflected to finance successfully",
  "data": {
    "_id": "expense_id",
    "source_module": "PAYROLL",
    "source_ref_id": "PAYROLL-2026-04",
    "total_amount": 66500
  }
}
```

---

## 4) Payroll Workflow APIs (`/api/payroll-workflow`)

## Workflow State Machine

- `DRAFT_HR`
- `HR_APPROVED`
- `FINANCE_REVIEW`
- `FINANCE_APPROVED`
- `SLIP_FROZEN`
- `POSTED_TO_FINANCE`
- `SENT_BACK_TO_HR`

### Canonical sequence (frontend orchestration)

Note: do not call `POST /api/salary/calculate` as a substitute for finance posting.  
For month-end payout posting, follow the exact sequence below.

1. `POST /cycle/initiate`
2. `POST /cycle/:cycleRef/hr-submit`
3. `POST /cycle/:cycleRef/finance-review`
4. `POST /cycle/:cycleRef/finance-decision` (`decision=approve`)
5. `POST /cycle/:cycleRef/freeze`
6. `POST /cycle/:cycleRef/post`
7. `GET /cycle/:cycleRef/reconcile`

---

### 4.1 Initiate Cycle

- **Method**: `POST`
- **URL**: `/api/payroll-workflow/cycle/initiate`
- **Roles**: `admin`, `hr`

#### Request

```json
{
  "month": 4,
  "year": 2026,
  "company_id": "optional",
  "brand_id": "optional",
  "branch_id": "optional",
  "department_id": "optional"
}
```

#### Success (`200`)

`data.status = DRAFT_HR`, and records for that month/year are linked to `external_ref_id = PAYROLL-YYYY-MM`.

---

### 4.2 HR Submit

- **Method**: `POST`
- **URL**: `/api/payroll-workflow/cycle/:cycleRef/hr-submit`
- **Roles**: `admin`, `hr`

#### Success (`200`)

`data.status = HR_APPROVED`

---

### 4.3 Move to Finance Review

- **Method**: `POST`
- **URL**: `/api/payroll-workflow/cycle/:cycleRef/finance-review`
- **Roles**: `admin`, `accountant`, `finance`

#### Success (`200`)

`data.status = FINANCE_REVIEW`

---

### 4.4 Finance Cycle Decision

- **Method**: `POST`
- **URL**: `/api/payroll-workflow/cycle/:cycleRef/finance-decision`
- **Roles**: `admin`, `accountant`, `finance`

#### Request

```json
{
  "decision": "approve",
  "comment": "optional remark"
}
```

`decision` values:
- `approve` => cycle goes to `FINANCE_APPROVED`
- any non-approve path => cycle goes to `SENT_BACK_TO_HR`

---

### 4.5 Freeze Cycle

- **Method**: `POST`
- **URL**: `/api/payroll-workflow/cycle/:cycleRef/freeze`
- **Roles**: `admin`, `hr`, `accountant`, `finance`

#### Success (`200`)

`data.status = SLIP_FROZEN` and salary slip snapshots are created/updated.

---

### 4.6 Post Cycle to Finance

- **Method**: `POST`
- **URL**: `/api/payroll-workflow/cycle/:cycleRef/post`
- **Roles**: `admin`, `accountant`, `finance`

#### Request

```json
{
  "store_id": "69a2eac35afbd9ae9fed8585",
  "payment_method": "BANK_TRANSFER"
}
```

#### Success (`200`)

```json
{
  "success": true,
  "message": "Cycle posted to finance",
  "data": {
    "cycle": {
      "status": "POSTED_TO_FINANCE",
      "finance_record_id": "finance_expense_id",
      "external_ref_id": "PAYROLL-2026-04"
    },
    "reflectResponse": {},
    "ledgerResponse": {}
  }
}
```

---

### 4.7 Reconcile Cycle

- **Method**: `GET`
- **URL**: `/api/payroll-workflow/cycle/:cycleRef/reconcile`
- **Roles**: `admin`, `hr`, `accountant`, `finance`

#### Success (`200`)

```json
{
  "success": true,
  "data": {
    "matched": true,
    "details": {
      "cycle_payable": 66500,
      "finance_expense_total": 66500,
      "finance_expense_id": "69df7c36dee1c52e9e3f87ac"
    },
    "at": "2026-04-15T..."
  }
}
```

---

### 4.8 Replay Posting

- **Method**: `POST`
- **URL**: `/api/payroll-workflow/cycle/:cycleRef/replay`
- **Roles**: `admin`, `accountant`, `finance`

Use for controlled re-post retries on previously frozen/recoverable cycles.

---

### 4.9 Reconciliation Report

- **Method**: `GET`
- **URL**: `/api/payroll-workflow/reconciliation/report?month=4&year=2026&status=POSTED_TO_FINANCE`
- **Roles**: `admin`, `hr`, `accountant`, `finance`

#### Success (`200`)

Array rows with:
- `cycle_ref`, `month`, `year`, `status`
- `total_final_payable`
- `reconciliation`
- `finance_record_id`

---

## 5) Payroll Adjustment APIs (Workflow side)

### 5.1 Create Adjustment

- **Method**: `POST`
- **URL**: `/api/payroll-workflow/adjustments`
- **Roles**: `admin`, `hr`

#### Request

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

`adjustment_type`:
- `FINE_DEBIT`
- `INCREMENT_CREDIT`

#### Success (`201`)

Adjustment with status initialized as authority-pending flow.

---

### 5.2 Authority Decision

- **Method**: `POST`
- **URL**: `/api/payroll-workflow/adjustments/:id/authority-decision`
- **Roles**: `admin`, `manager`, `hr`

#### Request

```json
{
  "decision": "approve",
  "comment": "optional"
}
```

---

### 5.3 Finance Adjustment Decision

- **Method**: `POST`
- **URL**: `/api/payroll-workflow/adjustments/:id/finance-decision`
- **Roles**: `admin`, `accountant`, `finance`

#### Request

```json
{
  "decision": "approve",
  "comment": "optional"
}
```

If approved, adjustment is included in cycle totals via recomputation.

---

## 6) Finance APIs (Frontend-facing in current phase)

Base: `/api/financial`

### 6.1 Create Manual Expense

- `POST /expenses`
- Roles: `admin`, `manager`, `store_manager`, `accountant`
- Permission required: `manage_expenses`

### 6.2 Reflect Salary Expense (Payroll source)

- `POST /expenses/salary-reflection`
- Roles: `admin`, `manager`, `accountant`, `hr`

#### Request

```json
{
  "month": 4,
  "year": 2026,
  "store_id": "69a2eac35afbd9ae9fed8585",
  "payment_method": "BANK_TRANSFER",
  "employee_count": 120,
  "total_gross_salary": 800000,
  "total_net_salary": 66500
}
```

#### Success (`200`)

Returns reflected `Expense` object (`source_module=PAYROLL`, `source_ref_id=PAYROLL-YYYY-MM`).

### 6.3 Get Expenses

- `GET /expenses`
- Roles: `admin`, `manager`, `store_manager`, `accountant`
- Permission required: `view_expenses`

Common filters (query):
- `store_id`, `category`, `status`, `source_module`, `source_ref_id`, `date_from`, `date_to`

### 6.4 Get Expense by Source Ref

- `GET /expenses/by-source/:sourceRefId`
- Roles: `admin`, `manager`, `store_manager`, `accountant`, `hr`

Used for payroll reconciliation and "salary reflected?" UI check.

### 6.5 Approve/Reject Expense

- `POST /expenses/:id/approve`
- `POST /expenses/:id/reject`

Roles: `admin`, `manager`, `accountant`
Permission: `approve_expenses`

---

### 6.6 Payroll Posting API (finance side)

- **Method**: `POST`
- **URL**: `/api/financial/payroll/posting`
- **Roles**: `admin`, `manager`, `accountant`, `hr`

#### Request

```json
{
  "payrollRunId": "PAYROLL-2026-04",
  "period": "2026-04",
  "month": 4,
  "year": 2026,
  "amountBreakdown": {
    "grossSalary": 70000,
    "netSalary": 66500,
    "employerCost": 0
  },
  "metadata": {
    "sourceModule": "payroll-service",
    "idempotencyKey": "payroll-cycle-PAYROLL-2026-04"
  }
}
```

#### Success (`200`)

```json
{
  "success": true,
  "message": "Payroll run posted to finance successfully",
  "data": {
    "already_posted": false,
    "external_ref_id": "PAYROLL-2026-04",
    "finance_record_id": "..."
  }
}
```

If already posted, message changes to:
- `Payroll run already posted to finance`

---

## 7) Error Handling Contract (Frontend)

- `400`: validation or invalid state transition (`Cannot freeze from HR_APPROVED`, etc.)
- `401`: token missing/invalid/expired
- `403`: role/permission denied
- `404`: resource not found (`Cycle not found`, `Expense not found for source reference`)
- `500`: server/internal integration failure

Frontend should always surface:

- `message`
- optional `code`
- optional details from `error` field if present

---

## 8) Frontend Orchestration Blueprint

## Recommended button/state flow

1. **Generate Month Records**
   - call `/api/salary/monthly-records/generate`
2. **Initiate Cycle**
   - call `/api/payroll-workflow/cycle/initiate`
3. **HR Submit**
   - call `/api/payroll-workflow/cycle/:cycleRef/hr-submit`
4. **Finance Review Start**
   - call `/api/payroll-workflow/cycle/:cycleRef/finance-review`
5. **Finance Decision**
   - call `/api/payroll-workflow/cycle/:cycleRef/finance-decision`
6. **Freeze**
   - call `/api/payroll-workflow/cycle/:cycleRef/freeze`
7. **Post**
   - fetch store from `/api/hr/stores`
   - call `/api/payroll-workflow/cycle/:cycleRef/post`
8. **Reconcile**
   - call `/api/payroll-workflow/cycle/:cycleRef/reconcile`
   - optionally cross-check `/api/financial/expenses/by-source/:cycleRef`

---

## 9) UI Validation Rules

- Disable actions that violate workflow status.
- Show current cycle status badge from backend, never infer only on client.
- Require `store_id` before allowing post action.
- Reconcile action should be retryable.
- For finance errors, show backend `message` directly.

---

## 10) Working Production Example (verified)

For `cycleRef = PAYROLL-2026-04`:

- Post result:
  - `200`
  - `Cycle posted to finance`
  - cycle status `POSTED_TO_FINANCE`
- Reconcile result:
  - `200`
  - `matched = true`
  - `cycle_payable = finance_expense_total = 66500`
- Source lookup result:
  - `GET /api/financial/expenses/by-source/PAYROLL-2026-04`
  - returns reflected expense with `total_amount = 66500`

---

## 11) Quick cURL Reference

```bash
# 1) Login
curl -X POST "https://api.etelios.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lenstrack.com","password":"AdminPass123!","tenantId":"lenstrack"}'

# 2) Generate monthly records
curl -X POST "https://api.etelios.com/api/salary/monthly-records/generate" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "X-Tenant-Id: lenstrack" \
  -H "Content-Type: application/json" \
  -d '{"month":4,"year":2026}'

# 3) Initiate cycle
curl -X POST "https://api.etelios.com/api/payroll-workflow/cycle/initiate" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "X-Tenant-Id: lenstrack" \
  -H "Content-Type: application/json" \
  -d '{"month":4,"year":2026}'
```

---

## Notes

- This spec is scoped to current Phase 1 payroll-salary-expense flow and related auth/store dependencies.
- Additional finance ERP modules (full P&L, invoice, TDS dashboards, etc.) are available but outside the minimum frontend path to run payroll-finance bridge.
