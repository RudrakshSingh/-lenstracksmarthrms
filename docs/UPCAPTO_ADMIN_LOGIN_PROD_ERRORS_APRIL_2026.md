# Upcapto admin — production login & follow-up API errors (documented)

**Date:** 9 April 2026  
**Environment:** `https://api.etelios.com`  
**Account tested:** tenant `upcapto`, admin login (credentials per internal test docs — **do not commit passwords**).

---

## 1. Summary (TL;DR)

| Step | Result |
|------|--------|
| `POST /api/auth/login` with `tenantId: upcapto` | **HTTP 200** — login succeeds; JWT includes `role: admin`, `employee_id: UPCAPTO-ADMIN-001`, `tenantId: upcapto`. |
| HR list APIs (`/api/hr/employees`, `/api/hr/departments`) | **HTTP 200** — works for this token. |
| JTS `GET /api/jts/tasks` | **HTTP 200** — list works (may be empty). |
| JTS `POST /api/jts/catalog/employees/bind-from-jwt` | **HTTP 404** — **`EMPLOYEE_001_NOT_FOUND`**. |
| JTS catalog (`task-types`, `org-nodes`) | **HTTP 200** but **`data: []`** — no task types / org nodes seeded for this tenant in JTS. |

**Main finding:** The **auth user** `admin@upcapto.com` exists and logs in, but there is **no matching row in HR `employees`** for email **`admin@upcapto.com`** (verified by paging employees — **not found**). JTS bind and any flow that resolves the actor from **HR Employee** therefore fails with **`EMPLOYEE_001_NOT_FOUND`**. Separately, JTS **catalog is empty**, so task **create** cannot satisfy validation without bootstrapping (types + org nodes).

---

## 2. Reproduction (API-level)

### 2.1 Login — success

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "admin@upcapto.com", "password": "<redacted>", "tenantId": "upcapto" }
```

**Response:** `200`  
**JWT claims (decoded, non-secret):** `userId`, `email`, `role: admin`, `tenantId: upcapto`, `employee_id: UPCAPTO-ADMIN-001`, broad `permissions` array.

---

### 2.2 JTS bind — error (this is the clear backend error code)

```http
POST /api/jts/catalog/employees/bind-from-jwt
Authorization: Bearer <accessToken>
X-Tenant-Id: upcapto
Content-Type: application/json

{}
```

**Response:** `404`

```json
{
  "success": false,
  "code": "EMPLOYEE_001_NOT_FOUND",
  "message": "EMPLOYEE_001_NOT_FOUND",
  "error": "EMPLOYEE_001_NOT_FOUND",
  "meta": {}
}
```

**Meaning:** JTS `bindEmployeeFromJwt` looks up the user in **HR Employee** (by auth identity / email). **No employee document** exists for this admin email in the HR DB → bind cannot create/link JTS `Employee`.

**Not** an “invalid password” or “wrong tenant on login” — login already succeeded.

---

### 2.3 JTS catalog — empty (blocks task create UX)

```http
GET /api/jts/catalog/task-types?page=1&limit=5
GET /api/jts/catalog/org-nodes?page=1&limit=5
```

**Response:** `200` with `"data": []` for both.

**Effect:** Any UI that builds `POST /api/jts/tasks` with `typeId` + `scopeOrgNodeId` has **nothing to select**. Sending placeholder/empty values yields **`400 VALIDATION_ERROR`** (e.g. `typeId` / `scopeOrgNodeId` must be 24-char hex).

---

### 2.4 Task create — validation error (when IDs missing)

If the client posts invalid/empty `typeId` and `scopeOrgNodeId`:

**Response:** `400` — `VALIDATION_ERROR` with Joi details (length 24, hexadecimal).

---

## 3. Why the UI might show “Access denied” or generic errors

- **403 / `INSUFFICIENT_*`:** Some routes require **role + permission**; admin JWT here has many permissions — if a **different** user or **stale token** is used, you can still see 403. Not reproduced on the same admin token for basic HR GETs.
- **`JTS_ACTOR_EMPLOYEE_NOT_RESOLVED`:** Returned when JTS cannot map JWT → **JTS Employee**. Fixing **HR employee** + **bind** + catalog is required before task actions work end-to-end.
- **Confusion with login:** Login is **200**; failures are on **later** calls (`bind-from-jwt`, task create, etc.). The UI must show the **`code`** from JSON (`EMPLOYEE_001_NOT_FOUND`, `VALIDATION_ERROR`, …), not only “Access denied”.

---

## 4. Remediation (data / ops — not frontend-only)

1. **Create or import an HR Employee** for **`admin@upcapto.com`** (same tenant `upcapto`) so HR ↔ auth align, **or** use a login that already has an HR row (e.g. a user that exists in `GET /api/hr/employees`).
2. **Seed JTS catalog:** at least one **TaskType** and one **OrgNode** for tenant `upcapto` (or run tenant bootstrap scripts your team uses).
3. Retry **`POST /api/jts/catalog/employees/bind-from-jwt`** after (1).
4. Retry **task create** after (2) with valid ObjectIds.

---

## 5. Frontend alignment (once data exists)

- After login, if JTS returns **`EMPLOYEE_001_NOT_FOUND`** on bind, show a clear message: **“HR employee record missing for this account — contact admin.”**  
- If catalog lists are empty, **disable** task create and explain **JTS catalog not configured** instead of generic failure.
- Map **`VALIDATION_ERROR`** details to field-level hints (`typeId`, `scopeOrgNodeId`).

---

*Automated checks run against production API; responses captured April 2026.*
