# Frontend — Auth, login response & post-login routing (complete guide)

**Audience:** Shell, HRMS MFE, Next.js BFF, mobile — anyone implementing login and first navigation.  
**Stack:** Browser → (optional BFF `/api/*`) → API gateway → **`auth-service`** (`POST /api/auth/login`).  
**Last updated:** 2026-04-19 — includes **`data.defaultLandingPath`** (deployed with `auth-service` image `auth-default-landing-20260419` and later).

---

## Table of contents

1. [Why this doc exists](#1-why-this-doc-exists)  
2. [Request: login API](#2-request-login-api)  
3. [Response: success payload — field by field](#3-response-success-payload--field-by-field)  
4. [Role vs permissions vs sidebar](#4-role-vs-permissions-vs-sidebar)  
5. [`defaultLandingPath` — behaviour and mapping](#5-defaultlandingpath--behaviour-and-mapping)  
6. [Recommended frontend flow (order of checks)](#6-recommended-frontend-flow-order-of-checks)  
7. [Admin vs tenant admin vs superadmin (product + technical)](#7-admin-vs-tenant-admin-vs-superadmin-product--technical)  
8. [BFF / Next.js notes](#8-bff--nextjs-notes)  
9. [Errors and troubleshooting](#9-errors-and-troubleshooting)  
10. [Verification & tests](#10-verification--tests)  
11. [Related documents](#11-related-documents)

---

## 1. Why this doc exists

Problems we saw in the field:

- After login, **tenant `admin`** sometimes landed on or felt like **superadmin** because the **shell permission compiler** can give **both roles a very similar module list** — not because JWT `role` was wrong.  
- The backend **did not** send a single **canonical first URL**; routing was inferred from permissions or “first allowed route”, which is fragile.  
- **`defaultLandingPath`** fixes that: the server returns **one path** for “where to open first” for that user’s role, so **admin** and **superadmin** get **different default URLs** when the backend maps roles correctly.

This guide explains **every important login field** and **exactly what to do** on the client.

---

## 2. Request: login API

| Item | Value |
|------|--------|
| **Method / URL** | `POST /api/auth/login` |
| **Content-Type** | `application/json` |
| **Body (either shape)** | `{ "email": "...", "password": "..." }` **or** `{ "emailOrEmployeeId": "...", "password": "..." }` — employee ID login uses the second form. |
| **Tenant (optional)** | `tenantId` in body, or `x-tenant-id` / `x-tenant` header, or query. If the **same email exists in multiple tenants**, sending **tenant** disambiguates. |

**Do not** assume the backend returns `redirectUrl` — the **first navigation path** is either **`data.defaultLandingPath`** (preferred) or your fallback table from **`data.user.role`**.

---

## 3. Response: success payload — field by field

Top-level:

| Field | Type | Meaning |
|--------|------|--------|
| `success` | boolean | `true` on success |
| `message` | string | Human-readable |
| `data` | object | Payload below |

Inside **`data`**:

| Field | Type | Meaning |
|--------|------|--------|
| **`user`** | object | Public profile + **`permissions`** (effective list for JWT-style checks in UI). **Guards** should still use **`user.role`** for role-only pages. |
| **`accessToken`** | string | JWT — send as `Authorization: Bearer <token>` |
| **`refreshToken`** | string | Use your refresh flow when implemented |
| **`defaultLandingPath`** | string | **Path only** (starts with `/`). **First screen** after login if password change is not required. **Server-derived** from resolved role. |
| **`mustChangePassword`** | boolean | If `true`, user must complete **change-password** before normal app use |
| **`passwordTemporary`** | boolean | Often paired with forced password change |

Inside **`data.user`** (typical; exact shape may include more fields):

| Field | Notes |
|--------|--------|
| `role` | **String** — e.g. `admin`, `superadmin`, `hr`, `employee`. **Source of truth** for role-based routing and guards. |
| `tenantId` | Tenant scope for multi-tenant APIs (must match headers where required). |
| `permissions` | Array of permission codes — for feature toggles / menu, **not** for deciding “am I superadmin?” |

---

## 4. Role vs permissions vs sidebar

- **`role`** answers: *Is this user a tenant admin, superadmin, HR, employee?*  
- **`permissions`** answers: *Which actions or modules are allowed?*  
- **Shell route lists** (`shellRoutePermissions.js` on backend) can make **tenant `admin`** and **`superadmin`** look like they have the **same big sidebar** — that is **by design** in the shared compiler for those roles.  
- Therefore: **first URL after login must not** be “first item in sidebar” or “first permission.” Use **`defaultLandingPath`** or an explicit **role → path** table.

---

## 5. `defaultLandingPath` — behaviour and mapping

**Semantics:** One string, **path only** (no domain). Examples: `/tenant-admin`, `/admin/super-admin`.

**Server mapping** (same as `microservices/auth-service/src/utils/defaultLandingPath.js`):

| Role (normalized lowercase) | `defaultLandingPath` |
|-----------------------------|----------------------|
| `superadmin`, `super-admin` | `/admin/super-admin` |
| `admin`, `tenant-admin` | `/tenant-admin` |
| `hr`, `hr-head` | `/dashboard/hr-head` |
| `employee` | `/employee-dashboard` |
| `manager`, `accountant`, `finance`, `store_manager`, `sales`, `optometrist` | `/dashboard` |
| Unknown / missing | `/dashboard` |

**If the field is missing** (older auth-service): fall back to the same table on the client using **`data.user.role`**.

---

## 6. Recommended frontend flow (order of checks)

1. **Call** `POST /api/auth/login` with email/password (and tenant if needed).  
2. On **success**, read **`data`**.  
3. If **`data.mustChangePassword`** or **`data.passwordTemporary`** → navigate to **change-password** flow; **after success**, go to **`data.defaultLandingPath`** (or same fallback from role).  
4. Else navigate to **`data.defaultLandingPath`** using **`router.replace`** / **`redirect`** (avoid stacking duplicate history entries on login).  
5. **Base path:** If your app lives under a prefix (e.g. `/app`), prepend it only in the router config — the backend always returns **app-root-relative** paths as above.  
6. **Guards:** For routes that only **superadmin** may access, check **`user.role === 'superadmin'`** (and your tenant rules) — **not** “has some admin-like permission.”

**Pseudo-code:**

```text
onLoginSuccess(data):
  saveTokens(data.accessToken, data.refreshToken)
  setUser(data.user)
  if (data.mustChangePassword || data.passwordTemporary):
    goToChangePassword(returnTo: data.defaultLandingPath ?? fallbackPath(data.user.role))
  else:
    navigate(replace: true, to: data.defaultLandingPath ?? fallbackPath(data.user.role))
```

---

## 7. Admin vs tenant admin vs superadmin (product + technical)

**Technical:**

- **`admin`** → default landing **`/tenant-admin`**.  
- **`superadmin`** → default landing **`/admin/super-admin`**.  
- Same **login endpoint** for all; difference is **user record** and JWT **`role`**.

**Product (often discussed with stakeholders):**

- **Superadmin** flows (tenant creation, supervision) may use a **separate entry** in the app (e.g. long-press, separate “admin package” shell) so the **main** login screen stays for **tenant users** only.  
- That split is **frontend / product** — the backend does not see “long press”; it only validates credentials and returns **`role`** + **`defaultLandingPath`**.

---

## 8. BFF / Next.js notes

- If the browser talks to **`/api/auth/login`** on the Next server, **forward the full JSON** from upstream — do **not** strip unknown keys. **`defaultLandingPath`** must reach the client.  
- If you normalize responses, add **`defaultLandingPath`** to your typed response model.

---

## 9. Errors and troubleshooting

| Symptom | Likely cause | What to do |
|---------|----------------|-------------|
| Wrong landing page | Routing from permissions / first sidebar item | Use **`defaultLandingPath`** or role table |
| “Looks like superadmin” but user is tenant admin | Similar **shell permissions** for both | Check **`user.role`** in DevTools / logs |
| Denied routes still appear in `user.permissions` | Older auth-service image before denial filtering | Ensure auth-service image is `auth-deny-filter-20260420-1225` or later |
| Stale role after switch user | Old token in storage | Clear storage, full logout, login again |
| `defaultLandingPath` undefined | Old auth-service image | Deploy auth-service with `defaultLandingPath` support; use client fallback |

Common **login failure**: `400` / `401` with `success: false` and `message` — invalid credentials, inactive account, missing tenant for non-superadmin, etc. (exact text from server).

---

## 10. Verification & tests

### 10.1 Public health (no credentials)

**Verified 2026-04-19** against `https://api.etelios.com`:

```bash
curl -sS --max-time 25 "https://api.etelios.com/api/auth/health"
```

Example success: HTTP **200**, body includes `"service":"auth-service"` and `"status":"healthy"`.

### 10.2 Login — check `defaultLandingPath` (needs real credentials)

Do **not** commit passwords. Run locally with env:

```bash
export API_BASE=https://api.etelios.com
export LOGIN_EMAIL='your-user@tenant.com'
export LOGIN_PASSWORD='***'

curl -sS -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: your-tenant-id" \
  -d "$(jq -n --arg e "$LOGIN_EMAIL" --arg p "$LOGIN_PASSWORD" '{email:$e,password:$p}')" \
  | jq '{ success, defaultLandingPath: .data.defaultLandingPath, role: .data.user.role, hasToken: (.data.accessToken != null) }'
```

Expect: **`success: true`**, **`defaultLandingPath`** a non-empty string starting with `/`, **`role`** matches the account.

### 10.3 Kubernetes (ops)

Confirm cluster runs the image that includes this feature:

```bash
kubectl -n etelios-prod get deployment auth-service -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

---

## 11. Related documents

| Doc | Purpose |
|-----|---------|
| [`FRONTEND_AUTH_LOGIN_DEFAULT_LANDING.md`](./FRONTEND_AUTH_LOGIN_DEFAULT_LANDING.md) | Short handoff for `defaultLandingPath` + deploy command |
| [`FRONTEND_POST_LOGIN_ROUTING.md`](./FRONTEND_POST_LOGIN_ROUTING.md) | Lenstrack admin example + checklist |
| [`FRONTEND_LENSTRACK_BACKEND_FIXES_API_REFERENCE.md`](./FRONTEND_LENSTRACK_BACKEND_FIXES_API_REFERENCE.md) | Tenant headers, JWT, HRMS API behaviour |
| [`PAYROLL_FE_BE_ALIGNMENT_GAPS.md`](./PAYROLL_FE_BE_ALIGNMENT_GAPS.md) | Payroll workflow FE/BE gaps (separate topic) |
| [`FRONTEND_APP_ETELIOS_VS_API_ETELIOS.md`](./FRONTEND_APP_ETELIOS_VS_API_ETELIOS.md) | **`app` vs `api` host**, BFF 503, DNS/ALB, FE strategies |

---

**Document version:** 1.0
