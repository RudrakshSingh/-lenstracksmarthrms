# Upcapto: login OK but “Access denied” — reasons & checks

**Audience:** Support / frontend / anyone debugging `403` / “Access denied” **after** a successful login for tenant `upcapto`.

**Important:** Login (`POST /api/auth/login`) only proves **auth credentials + tenant on that request** are valid. Almost every other screen calls **different APIs** (HR, attendance, JTS, payroll, …). Those calls can still return **403** for reasons that have **nothing to do with the password** being wrong.

---

## 1. Login succeeds ≠ all APIs allowed

Typical flow:

1. User logs in → receives `accessToken` + user object (`tenantId`, `role`, `permissions`).
2. App navigates to a page → calls e.g. `GET /api/hr/employees`, `POST /api/jts/tasks`, dashboard widgets, etc.
3. That route checks **RBAC** (role / permission list) and sometimes **resource rules** (own data vs org-wide).

So “access denied” usually means: **token is valid, but this specific action is not allowed** for this user on this route.

---

## 2. Common backend responses (what to look for in Network tab)

| Approx. symptom | HTTP | `error` / message | Likely cause |
|-----------------|------|-------------------|--------------|
| Wrong role for route | 403 | `INSUFFICIENT_ROLE` | User role (e.g. employee) cannot call admin/manager-only API. |
| Missing permission | 403 | `INSUFFICIENT_PERMISSION` | JWT `permissions` array does not include required key for that route. |
| Tenant header strict mode | 403 | `TENANT_MISMATCH` | `X-Tenant-Id` **does not match** JWT `tenantId` **and** server has `STRICT_TENANT_HEADER=true`. |
| Old / bad token shape | 403 | `INVALID_TOKEN` | Access token missing `tenantId` claim (old session); user must **logout + login** again. |
| HR: wrong employee scope | 403 | `ACCESS_DENIED` (various messages) | e.g. viewing another employee’s record when policy says “own only”. |
| JTS: actor not linked | 403 | `JTS_ACTOR_EMPLOYEE_NOT_RESOLVED` | Auth user has no linked **JTS catalog employee** row for this tenant. |
| JTS: task / collaboration | 403 | `JTS_TASK_ACCESS_DENIED` | User is not assignee/creator/privileged for that task. |

Always copy **full JSON body** of the failing response (status + `error` + `message`), not only the word “Access denied” from the UI.

---

## 3. Frontend / client mistakes that *look* like “Upcapto blocked”

These are **integration** issues (browser app, mobile, or Postman), not the password:

1. **`Authorization` vs cookie mismatch**  
   Request sends `Authorization: Bearer <admin>` but browser also sends `Cookie: access_token=<older user>`. Some code paths or proxies behave inconsistently. **Fix:** one source of truth — either clear cookies for the site or ensure API calls use only the **same** token you got from the latest login.

2. **`X-Tenant-Id` wrong or stale**  
   UI still sends `lenstrack` (or empty) while JWT is for `upcapto`. With strict tenant validation, that yields **403**. **Fix:** after login, set tenant from **`user.tenantId`** in the token payload (lowercased) and send it on every API call, or omit header if your gateway is configured to trust JWT-only (see HR `validateTenant` behavior).

3. **Cached localStorage from another tenant**  
   User switched tenant in UI but old `tenantId` / token left in storage. **Fix:** full logout, clear site data for the domain, login again with `tenantId: upcapto`.

4. **Calling admin APIs with an employee token**  
   Login works; role is `employee` — admin dashboard APIs will correctly return **403**.

---

## 4. Upcapto-specific quick verification (production)

Replace with your real password; do **not** commit secrets.

```bash
BASE="https://api.etelios.com"

# Login
curl -sS -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@upcapto.com","password":"<PASSWORD>","tenantId":"upcapto"}'
```

From the response, take `accessToken` and run:

```bash
TOKEN="<paste_accessToken>"

curl -sS -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: upcapto" \
  "$BASE/api/hr/employees?page=1&limit=1"
```

- **200** → HR list is allowed for that token; if UI still shows “access denied”, the failing URL is **another** service/route — inspect Network for that call.
- **403** → Read JSON body: `TENANT_MISMATCH`, `INSUFFICIENT_*`, `INVALID_TOKEN`, etc., and map to sections above.

---

## 5. What we already verified on API side

Using documented test admin for `upcapto`, **production** checks have passed:

- `POST /api/auth/login` with `tenantId: upcapto` → **200**, token issued, `tenantId: upcapto` in user payload.
- `GET /api/hr/employees` with `Authorization` + `X-Tenant-Id: upcapto` → **200**.

If your browser still shows access denied, the breakdown is almost certainly **which URL returns 403** and **which `error` code** — capture that single request/response pair and align tenant header + role + permissions.

---

## 6. Escalation checklist

1. Screenshot or HAR: **Request URL**, **status**, **response JSON**.  
2. Confirm **same** `accessToken` as last login (no mixed cookies).  
3. Confirm **`X-Tenant-Id`** equals JWT `tenantId` (`upcapto`).  
4. Confirm user **role** and **route** (employee vs admin API).  
5. For JTS screens, check **`JTS_ACTOR_EMPLOYEE_NOT_RESOLVED`** — employee may need catalog bind / HR link.

---

*Last updated: April 2026*
