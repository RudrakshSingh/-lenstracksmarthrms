# Lenstrack backend fixes — API reference for frontend (April 2026)

**Audience:** Frontend developers (Shell / React / mobile clients hitting `api.etelios.com`)  
**Scope:** Behaviour and response shapes after recent auth-service, hr-service, and attendance-service hardening. Includes production smoke checks (Lenstrack tenant).

**Related:** [FRONTEND_AUTH_TOKEN_MISMATCH_GUARDRAILS.md](./FRONTEND_AUTH_TOKEN_MISMATCH_GUARDRAILS.md) (always send **`X-Tenant-Id`** = JWT `tenantId`).

---

## 1) Golden rule: tenant + token alignment

| Rule | Detail |
|------|--------|
| Header | Send **`X-Tenant-Id: <tenant_slug>`** on every authenticated request (e.g. `lenstrack`). Lowercase, trimmed. |
| Must match JWT | For non–`superadmin`, **`X-Tenant-Id` must equal** `user.tenantId` from the login response / decoded access token. Mismatch → **403** on several routes. |
| After login | Persist `tenantId` from **`POST /api/auth/login`** response and use it for the header — do not keep a stale tenant from localStorage. |

Typical error when header ≠ token tenant:

```json
{
  "success": false,
  "message": "X-Tenant-Id does not match token tenant",
  "code": "TENANT_MISMATCH"
}
```

HTTP status: **403**

---

## 2) Real users (`auth-service`) — `/api/real-users`

### 2.1 List — `GET /api/real-users`

**Roles:** `hr`, `admin`, `manager` (per route).

**Behaviour (fix):** Results are **scoped to the caller’s tenant**. You will not receive users from other tenants in the same response when using a normal tenant user token.

- **Non–`superadmin`:** Filter is always **`tenantId` = JWT `tenantId`**.
- **`superadmin`:** If **`X-Tenant-Id`** is sent, list is limited to that tenant; if omitted, behaviour follows server rules (broader listing — use only for ops tooling).

**Success (200)** — shape (illustrative):

```json
{
  "success": true,
  "message": "Real users retrieved successfully",
  "data": {
    "users": [
      {
        "_id": "...",
        "email": "user@example.com",
        "employee_id": "EMP-...",
        "tenantId": "lenstrack",
        "role": "manager",
        "first_name": "...",
        "last_name": "...",
        "status": "active"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1,
      "itemsPerPage": 10,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

**Wrong tenant header (non–superadmin):** **403** with `TENANT_MISMATCH` / `TENANT_REQUIRED` as applicable.

---

### 2.2 Get one — `GET /api/real-users/:id`

**Behaviour (fix):** Cross-tenant access is denied: if the target user belongs to another tenant, response is **404** (`User not found`) — avoids leaking existence across tenants.

---

### 2.3 Register — `POST /api/real-users/register`

**Roles:** `hr`, `admin`.

**Behaviour (fix):**

- New users get **`tenantId`** from the **caller** (HR/Admin → JWT tenant; `superadmin` → `X-Tenant-Id` or `body.tenant_id` or `default`).
- Duplicate **email / employee_id** checks are **per tenant** (same email allowed on another tenant).
- **`reporting_manager_id`** must reference a user in the **same tenant**; else **400**:

```json
{
  "success": false,
  "message": "Reporting manager must belong to the same tenant"
}
```

---

### 2.4 Update — `PUT /api/real-users/:id`

**Behaviour (fix):** Cannot update a user outside your tenant (404). **`tenantId`** cannot be changed via body (stripped). Reporting manager must stay in the same tenant (**400** if not).

---

### 2.5 Deactivate — (route as per `realUsers.routes.js`)

**Behaviour (fix):** Same tenant guard as update; cross-tenant → **404**.

---

## 3) HR leave — policies and RBAC (`hr-service`)

### 3.1 Manager + `hr.leave.*` (fix)

Routes such as **`GET /api/hr/policies/leave`** use `requirePermission('hr.leave.read')`.

**Behaviour:** **`manager`** role is allowed for permissions that **start with `hr.leave.`** even if the JWT permission list uses catalog codes and does not literally include `hr.leave.read`. **`hr` / `admin` / `superadmin`** still bypass permission checks as before.

Typical **403** when a user truly has no access:

```json
{
  "success": false,
  "message": "Access denied. Required permission: hr.leave.read",
  "code": "INSUFFICIENT_PERMISSION"
}
```

---

### 3.2 Leave policy for an employee — `GET /api/hr/policies/leave`

**Query:**

- Optional **`employee_id`** — HR employee Mongo `_id` (same id as in **`GET /api/hr/employees`**).

**Behaviour (fix):** Employees with **virtual work locations** (e.g. `workLocation.storeId` = `"office"`, `"backoffice"`) no longer break policy lookup by incorrectly matching `LeavePolicy.store_ids` (which stores **ObjectIds** only). For non–ObjectId store keys, matching falls back to policies that apply to **all stores** (e.g. empty `store_ids`).

**Success (200)** — may include `leaveTypes`, policy fields, or empty policy message; shape depends on controller and whether a policy document exists:

```json
{
  "success": true,
  "message": "Leave policy retrieved successfully",
  "data": {
    "leaveTypes": [
      {
        "code": "CL",
        "name": "Casual Leave",
        "annualAllocation": 12
      }
    ]
  }
}
```

If no policy:

```json
{
  "success": true,
  "message": "No active leave policy found",
  "data": { "leaveTypes": [] }
}
```

**Note:** Older bug **`Invalid store_ids: office`** should **not** appear for virtual store employees after this fix.

---

## 4) Attendance — clock-in / clock-out (`attendance-service`)

### 4.1 Empty `latitude` / `longitude` strings

**Behaviour (fix):** Request body may send **`""`** for optional GPS fields (e.g. multipart or client defaults). Middleware **strips** empty strings before validation so **Joi** does not fail on `latitude: ""`.

### 4.2 When GPS is still required (business rules)

Even after stripping, **clock-in** may still require coordinates for **store-bound / strict geofence** employees. The controller uses HR employee profile (`attendancePolicy`, `workMode`, virtual store codes) to decide **`relaxLocationForClockIn`**:

- If **relaxed** (e.g. `NO_GEOFENCE`, `BACKOFFICE`, virtual `office` / `backoffice`, or optional-GPS role): missing GPS can be filled with defaults (e.g. `0` / env defaults) per server logic.
- If **not relaxed:** you may still see **400** with a message about missing **latitude/longitude** — this is **not** a Joi empty-string bug; it means the employee’s policy requires GPS.

Example (strict policy, no coords):

```json
{
  "success": false,
  "error": "Missing required fields: latitude, longitude",
  "message": "Validation failed"
}
```

**Frontend guidance:**

- Prefer **omitting** keys instead of sending `""` when GPS is unknown (both are handled better after the strip middleware).
- For **NO_GEOFENCE** test users, use their **employee** token — admin tokens may still resolve to strict policy if there is no HR profile.

---

## 5) HR transfer worker (informational)

Internal **transfer** processing now sets **`reportingManager`** (string) on the HR **`User`** model instead of a non-schema field. **List/detail UIs** that read reporting manager should use the HR API field names returned by your serializers (`reportingManager` / `reportingManagerName` as applicable).

---

## 6) Production smoke (Lenstrack) — what was verified

| Area | Check | Result |
|------|--------|--------|
| Tenant | `X-Tenant-Id` ≠ JWT tenant on `/api/real-users` | **403** |
| Real users | List with correct header | **200**, rows only **`lenstrack`** |
| Leave policy | `GET /api/hr/policies/leave?employee_id=` for users with virtual store | **200**, no `Invalid store_ids` |
| Shivansh / Sandeep | HR ids `69de0135dab8594f159877cc`, `69c136e020e79851a6c0008e` | Policy + tenant list OK (admin token) |

---

## 7) Frontend integration checklist

1. After **login**, store **`tenantId`** and send **`X-Tenant-Id`** on all APIs.
2. Never send **`X-Tenant-Id`** that disagrees with the current access token.
3. **Real users** screens: expect **only current-tenant** users; handle **404** on detail as “not found / no access”.
4. **Leave** screens for **managers**: rely on **`manager` + `hr.leave.*`** behaviour; still handle **403** for other modules.
5. **Attendance** clock: handle **400** for missing GPS when policy requires location; don’t treat as generic network error.
6. Do **not** commit real user passwords to `.env` in the repo; use **admin** or **CI secrets** for automated E2E.

---

## 8) Image / deploy tag (ops reference)

Production rollouts for these fixes used a shared ECR tag pattern such as **`loophole-fix-20260416`** on **auth-service**, **hr-service**, and **attendance-service** (see `k8s/etelios-prod/*-deployment.yaml`). Frontend normally does not depend on this; ops only.

---

*Document version: April 2026 — aligned with backend behaviour at time of writing.*
