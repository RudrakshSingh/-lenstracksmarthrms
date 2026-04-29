# Post-login routing (frontend) — backend contract & Lenstrack admin

**Audience:** Frontend developers (shell / HRMS MFE).  
**Last verified:** Auth login response shape from `auth-service`; live check for `admin@lenstrack.com` @ `lenstrack` tenant.

**Comprehensive guide:** [`FRONTEND_AUTH_AND_ROUTING_COMPLETE_GUIDE.md`](./FRONTEND_AUTH_AND_ROUTING_COMPLETE_GUIDE.md)

---

## 1. What the backend actually returns (canonical login)

Production login: **`POST /api/auth/login`** (auth-service).

Successful body shape:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "...": "public profile + permissions array" },
    "accessToken": "...",
    "refreshToken": "...",
    "defaultLandingPath": "/tenant-admin",
    "mustChangePassword": false,
    "passwordTemporary": false
  }
}
```

**Important:** The auth-service login response includes **`data.defaultLandingPath`** (path only, e.g. `/tenant-admin` for `admin`, `/admin/super-admin` for `superadmin`). Prefer this for first navigation after login; **`data.user.role`** remains the source of truth for guards.

The only other redirect hint is:

- `mustChangePassword` / `passwordTemporary` → frontend should send the user to **change-password** first; after success, navigate to **`data.defaultLandingPath`**.

Implementation: `getDefaultLandingPathForRole` in `microservices/auth-service/src/utils/defaultLandingPath.js` (aligned with hr-service `getRedirectUrlForRole` segments).

**Frontend handoff (short):** [`FRONTEND_AUTH_LOGIN_DEFAULT_LANDING.md`](./FRONTEND_AUTH_LOGIN_DEFAULT_LANDING.md).

---

## 2. Verified example: Lenstrack tenant admin

For **`admin@lenstrack.com`** with header **`x-tenant-id: lenstrack`** (live `api.etelios.com`):

| Field | Value |
|--------|--------|
| `data.user.role` | **`admin`** (not `superadmin`) |
| `data.user.tenantId` | `lenstrack` |

If the UI still “looks like superadmin” or navigates to a super-admin route, that is **not** because auth returned `role: "superadmin"` for this account — check routing logic and permission-based UI below.

---

## 3. Suggested post-login paths (align with HR service intent)

`microservices/hr-service/src/services/auth.service.js` defines **`getRedirectUrlForRole`** (full URL = `FRONTEND_URL` + path). The **path** part is the useful contract for the shell:

| `role` (lowercase) | Suggested first path |
|--------------------|----------------------|
| `superadmin` | `/admin/super-admin` |
| `admin` | `/tenant-admin` |
| `hr` | `/dashboard/hr-head` |
| `manager` | `/dashboard` |
| `employee` | `/employee-dashboard` |
| `accountant` | `/dashboard` |
| others / unknown | `/dashboard` |

**Prefer `data.defaultLandingPath` when present.** Otherwise navigate using **`data.user.role`** and this table (or your product’s updated IA), not by inferring role from “having many permissions”.

---

## 4. Why “admin” can feel like “superadmin” (UI, not wrong role)

Even when `role` is **`admin`**, the **shared shell permission compiler** gives **tenant `admin`** the **same full shell route bundle** as **`superadmin`** in `microservices/shared/utils/shellRoutePermissions.js` (`compileShellRouteAndViewPermissions`: both get full `SHELL_ROUTE_CODES`).

So the **sidebar / module list** can look similar. **URL choice after login** should still use **`role`** (e.g. `/tenant-admin` for `admin`, `/admin/super-admin` only for `superadmin`).

---

## 5. Frontend checklist (if user lands on wrong screen)

1. Use **`data.defaultLandingPath`** for first navigation when the API returns it.
2. After login, log **`data.user.role`** (string) — confirm it is `admin` vs `superadmin`.
3. If `defaultLandingPath` is missing (older backend), fall back to **explicit navigation** from `role` (table in §3), not from “first allowed route” or “wildcard permissions”.
4. Clear **stale tokens** (logout, storage, cookies) if an old `superadmin` session was cached.
5. For **super-admin-only** routes, guard with **`role === 'superadmin'`** (or platform tenant), not with “has `read_roles`” alone.

---

## 6. Backend field: `defaultLandingPath` (implemented)

Login **`data`** includes **`defaultLandingPath`** — same role→path table as §3. Frontend should **`router.push(data.defaultLandingPath)`** (or equivalent) after login when `mustChangePassword` is false.

---

## 7. Related code references

- Default path map: `microservices/auth-service/src/utils/defaultLandingPath.js`.
- Auth login return: `microservices/auth-service/src/services/auth.service.js` (`login` method — returns `user`, tokens, `defaultLandingPath`, `mustChangePassword`).
- HR redirect map (paths only): `microservices/hr-service/src/services/auth.service.js` — `getRedirectUrlForRole` (note: HR’s legacy login return object **does not currently include** `redirectUrl`; the variable is computed but not attached to the response — do not rely on HR login for redirect without verifying that route).
