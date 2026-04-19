# Auth login — `defaultLandingPath` (frontend handoff)

**Audience:** Shell / HRMS MFE / Next.js BFF developers  
**Backend change:** `auth-service` — deploy this revision to production for the field to appear live.

---

## What changed

`POST /api/auth/login` success payload **`data`** now includes:

| Field | Type | Meaning |
|--------|------|--------|
| **`defaultLandingPath`** | `string` | Path only (starts with `/`). **First screen** to open after login when password change is not required. |

Same field is returned on **mock login** responses (`mock: true`) for local testing.

**Source of truth for guards** remains **`data.user.role`** and JWT. `defaultLandingPath` only tells you **where to navigate** so tenant **admin** and **superadmin** do not land on the wrong shell.

---

## Example (trimmed)

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "role": "admin",
      "tenantId": "lenstrack",
      "permissions": []
    },
    "accessToken": "...",
    "refreshToken": "...",
    "defaultLandingPath": "/tenant-admin",
    "mustChangePassword": false,
    "passwordTemporary": false
  }
}
```

**Superadmin** example: `"role": "superadmin"` → `"defaultLandingPath": "/admin/super-admin"`.

---

## Role → path (server-defined)

Aligned with `microservices/hr-service` `getRedirectUrlForRole` **path segment** (see `microservices/auth-service/src/utils/defaultLandingPath.js`):

| Role | Path |
|------|------|
| `superadmin`, `super-admin` | `/admin/super-admin` |
| `admin`, `tenant-admin` | `/tenant-admin` |
| `hr`, `hr-head` | `/dashboard/hr-head` |
| `employee` | `/employee-dashboard` |
| `manager`, `accountant`, `finance`, `store_manager`, `sales`, `optometrist` | `/dashboard` |
| unknown | `/dashboard` |

---

## What you should implement

1. After successful login, if **`data.mustChangePassword`** (or **`data.passwordTemporary`**) → run your **change-password** flow first.
2. Else **`router.replace(data.defaultLandingPath)`** / **`redirect(data.defaultLandingPath)`** (or prepend your app base path if the shell is not hosted at domain root).
3. **Do not** choose the first route from “allowed permissions” or “full shell list” for the initial navigation — that is why **admin** and **superadmin** sidebars looked the same.
4. Route guards for **super-admin-only** pages: still check **`user.role === 'superadmin'`** (or your platform rule).

**Backward compatible:** Older clients that ignore `defaultLandingPath` keep working; new clients should prefer it when present.

---

## Deploy / prod

- **Git:** Changes live in repo after merge/push to your default branch.
- **Production API:** Redeploy **`auth-service`** with the build that includes `defaultLandingPath` in the login handler. Until then, the field will be missing — **optional-chain** in FE: `data.defaultLandingPath ?? fallbackFromRole(data.user.role)`.

---

## Related docs

- [`FRONTEND_POST_LOGIN_ROUTING.md`](./FRONTEND_POST_LOGIN_ROUTING.md) — full context, Lenstrack admin example, shell permissions note.
