# Permission Backend Fixes - Frontend Implementation Guide

Last updated: 2026-04-15  
Applies to: `lenstrack` tenant on `api.etelios.com` (auth-service / permission routes)

---

## Why this document exists

Permission matrix and shell flows were failing due to a combination of:
- oversized JWT permission payloads (cookie storage failures),
- permission route hangs / unstable responses,
- tenant mismatch ambiguity,
- inconsistent gateway errors,
- and optimistic locking (`If-Match`) retry confusion.

Backend fixes are now live. This document tells frontend developers exactly what changed and what they must implement.

---

## Backend fixes now live

### 1) Access JWT payload size fix

Backend now omits `permissions[]` from access JWT by default to avoid browser cookie size limits.

- Default behavior: JWT stays small
- Env used in prod: `JWT_SKIP_PERMISSIONS_CLAIM=1`
- Opt-in legacy mode exists (`JWT_INCLUDE_PERMISSIONS_CLAIM=1`) but should not be used unless required.

Implication for frontend:
- Do **not** depend on decoding `permissions` from JWT.
- Use login response + permission APIs as source of truth.

---

### 2) Permission users route stabilization

`GET /api/permission/users` and `GET /api/permission/users?includePermissions=true` were stabilized and optimized.

Backend now includes:
- bounded query timeout handling,
- better query filtering and pagination behavior,
- tenant guard checks,
- safer error handling,
- list performance instrumentation.

Current live behavior:
- both routes return fast and consistently in normal conditions,
- both return JSON (not hanging).

---

### 3) Tenant enforcement is strict

Backend now validates tenant identity consistently:
- token `tenantId` must match header `X-Tenant-Id` (except allowed superadmin paths),
- mismatch returns:

```json
{
  "success": false,
  "message": "X-Tenant-Id does not match token tenant",
  "code": "TENANT_MISMATCH"
}
```

Implication for frontend:
- Always send lowercase tenant slug in `X-Tenant-Id`.
- Never mix token from one tenant with header from another.

---

### 4) Optimistic locking contract confirmed

For user permission mutations (`PATCH/PUT/reset`):
- backend uses revision-based conflict checks,
- user state endpoint returns `ETag: W/"permrev-<n>"`,
- stale `If-Match` returns:

```json
{
  "success": false,
  "message": "Permission revision mismatch — refresh and retry",
  "code": "PERMISSION_REVISION_CONFLICT",
  "currentRevision": 3
}
```

Implication for frontend:
- always fetch latest user permission state before write,
- use returned ETag as `If-Match`,
- on `412`, re-fetch + re-apply user intent + retry once.

---

### 5) Infra misconfiguration fixed (important)

High latency variability root cause was partially infra:
- Redis service existed, but auth-service was connecting to localhost due env mismatch.
- Live env now correctly sets:
  - `REDIS_HOST=redis`
  - `REDIS_PORT=6379`
  - `REDIS_DB=0`
  - `REDIS_DISABLED=0`

Result:
- Redis connection stable,
- permission route performance normalized,
- no crash loops on permission listing path.

---

## Frontend implementation requirements (must-do)

## A) Identity and tenant headers

For all `/api/permission/*` calls:
- send `Authorization: Bearer <accessToken>`
- send `X-Tenant-Id: <tenantSlugLowercase>`
- do not send stale cookie identity that conflicts with bearer identity

Recommendation:
- For admin shell routes, prefer bearer-token-only calls and avoid cookie-dependent auth mixing.

---

## B) Source of permissions in UI

Use this order:
1. Login response (`data.user.permissions`) for immediate UI bootstrap
2. `GET /api/permission/user/:userId` for authoritative state
3. `GET /api/permission/users?includePermissions=true` only where full matrix list requires it

Do not rely on JWT claim permissions.

---

## C) Users list API usage

Default user picker / list:
- call `GET /api/permission/users?limit=20` (without `includePermissions`)
- use pagination and search filters instead of over-fetching

Only when required:
- call with `includePermissions=true`

Rationale:
- lighter list is faster and enough for selectors.

---

## D) Write flow (`PATCH /overrides`, reset, etc.)

Implement this exact sequence:
1. `GET /api/permission/user/:id`
2. store `ETag`
3. send mutation with `If-Match: <etag>`
4. on success: refresh state
5. on `412`: fetch latest, show non-destructive conflict message, retry once if user confirms

---

## E) Error handling map for frontend

Handle by code/status, not message string:

- `401` -> login/session expired flow
- `403` + `TENANT_MISMATCH` -> hard tenant mismatch UI state
- `412` + `PERMISSION_REVISION_CONFLICT` -> stale data flow
- `500/503` -> retryable backend issue toast + fallback retry button

Always parse JSON if content-type is JSON; show generic fallback only if upstream returns non-JSON.

---

## Recommended request contract examples

### List users (fast path)

```http
GET /api/permission/users?limit=20&page=1
Authorization: Bearer <token>
X-Tenant-Id: lenstrack
```

### Get user state (for ETag)

```http
GET /api/permission/user/<userId>
Authorization: Bearer <token>
X-Tenant-Id: lenstrack
```

Read `ETag` from response headers.

### Patch overrides

```http
PATCH /api/permission/user/<userId>/overrides
Authorization: Bearer <token>
X-Tenant-Id: lenstrack
If-Match: W/"permrev-3"
Content-Type: application/json

{
  "custom_permissions": ["read_users"],
  "permission_denials": []
}
```

---

## Production validation summary (post-fix)

Live checks confirmed:
- login and permission APIs return valid JSON,
- tenant mismatch guard works,
- revision conflict (`412`) works,
- permission list routes are stable and fast in repeated tests.

Observed now:
- responses are generally sub-second to low-second under normal checks.

---

## Frontend rollout checklist

- [ ] Replace any JWT-decoded permission dependency with API-driven state.
- [ ] Ensure all permission API calls include `X-Tenant-Id` from active tenant context.
- [ ] Add ETag-based optimistic locking in all permission write flows.
- [ ] Add explicit handling for `TENANT_MISMATCH` and `PERMISSION_REVISION_CONFLICT`.
- [ ] Keep user list on fast path (`includePermissions=false`) unless matrix view explicitly needs effective permission arrays.
- [ ] Add debug logs (client-side, non-sensitive) for request id, tenant, endpoint, status, and error code.

---

## Notes for maintainers

If future regressions appear:
1. check auth-service Redis connectivity first,
2. check `permission.users.performance` logs,
3. validate tenant header/token pairing from client,
4. verify `If-Match` contract in write flow.

