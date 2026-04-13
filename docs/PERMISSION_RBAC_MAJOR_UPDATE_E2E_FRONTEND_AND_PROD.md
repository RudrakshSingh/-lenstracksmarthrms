# Permission & RBAC — major update (end-to-end guide)

**Audience:** frontend developers, full-stack engineers, DevOps  
**Scope:** tenant-level permission matrix (Petpooja-style checkboxes), admin APIs, JWT/cache behaviour, production rollout  
**Last updated:** 2026-04-03  

---

## Table of contents

1. [What shipped (plain language)](#1-what-shipped-plain-language)  
2. [Concepts you must understand](#2-concepts-you-must-understand)  
3. [Who can use the admin UI / APIs](#3-who-can-use-the-admin-ui--apis)  
4. [How effective permissions are computed](#4-how-effective-permissions-are-computed)  
5. [JWT: what the frontend receives](#5-jwt-what-the-frontend-receives)  
6. [Base URLs and routing](#6-base-urls-and-routing)  
7. [Headers for every call](#7-headers-for-every-call)  
8. [API reference (full)](#8-api-reference-full)  
9. [Recommended UI flows (step by step)](#9-recommended-ui-flows-step-by-step)  
10. [Errors and how to show them](#10-errors-and-how-to-show-them)  
11. [Optimistic concurrency (If-Match)](#11-optimistic-concurrency-if-match)  
12. [TypeScript-friendly types (copy-paste)](#12-typescript-friendly-types-copy-paste)  
13. [Example: minimal React module](#13-example-minimal-react-module)  
14. [Testing with curl](#14-testing-with-curl)  
15. [Production deployment checklist](#15-production-deployment-checklist)  
16. [FAQ](#16-faq)  
17. [Related docs](#17-related-docs)  

---

## 1. What shipped (plain language)

- **Single permission catalog** — one list of valid permission codes + grouped sections for the UI matrix. Nothing is “hard-coded only in the frontend”; invalid codes are stripped server-side.  
- **Per-user overrides** — extra grants (`custom_permissions`) and explicit denies (`permission_denials`), like ticking/unticking boxes per user.  
- **Role defaults** — each role (including **accountant**) starts from a template; real access is still **role ∪ overrides ∪ legacy − denies**.  
- **Admin HTTP APIs** on **auth-service** — catalog, list users, user detail, replace overrides, incremental grant API, reset, and a **dry-run escalation preview** before save.  
- **Revision / ETag** — each user has `permissionsRevision`; writes can send `If-Match` to avoid overwriting someone else’s changes.  
- **JWT** carries **`permRev`** and (by default) **`permissions`** (effective snapshot at login/refresh). Downstream services can use **Redis + `permRev`** first for speed.  
- **Ingress / Kong** updated so **`/api/permission`** and **`/api/user`** reach **auth-service** in production paths used by this repo.  

---

## 2. Concepts you must understand

### 2.1 Catalog vs effective set

| Term | Meaning |
|------|--------|
| **Catalog** | All valid codes + UI grouping (`groups` + `flat`). Used to render the matrix and validate input. |
| **Role permissions** | Permissions stored on the **Role** document (or defaults in code if role has none). |
| **Custom permissions** | Extra allows on the **User** — “checkbox on”. |
| **Permission denials** | Explicit removes — “checkbox off” even if role/custom would allow. |
| **Legacy `user.permissions`** | Older flat list on user; still merged in for backward compatibility. |
| **Effective permissions** | Final list used for RBAC: see [section 4](#4-how-effective-permissions-are-computed). |

### 2.2 “Petpooja-style”

Operations think in terms of **modules / checkboxes**. Technically that maps to:

- Ticking **on** → usually a code in **`custom_permissions`** (or inherited from role only).  
- Ticking **off** → often a code in **`permission_denials`** (to remove something the role would give).  

The UI can model either:

- **Two lists** (allow extras + deny list) — matches APIs exactly.  
- **Derived state** — compute `custom_permissions` / `permission_denials` diffs when saving (harder; use **escalation-preview** to validate before PATCH).

### 2.3 Why both `PATCH .../overrides` and `PUT .../user/:id`?

- **`PATCH .../overrides`** — send **full** `custom_permissions` and `permission_denials` arrays (replace both). Best for “save matrix”.  
- **`PUT .../user/:id`** — **`add` / `remove` / `replace`** on the **custom** list only; optional `permission_denials` to replace denies. Best for quick toggles or bulk add/remove.

---

## 3. Who can use the admin UI / APIs

Only these roles may call the permission admin routes:

- `superadmin`  
- `admin`  
- `hr`  

**`superadmin`** may manage users in any tenant. **`admin`** and **`hr`** may only manage users whose **`tenantId`** matches their own (enforced server-side).

---

## 4. How effective permissions are computed

Formula (simplified):

```text
effective = ( role_permissions ∪ custom_permissions ∪ legacy_user_permissions ) \ permission_denials
```

Implementation is shared:

- `microservices/shared/utils/permissionCore.js` — pure set logic  
- `microservices/auth-service/src/utils/effectivePermissions.js` — loads role from DB / cache, then calls core  

**Accountant** (and other roles) are **starting templates**; the “real” access for a user is always this effective set, not “accountant = fixed 48 codes forever” unless you never add overrides.

---

## 5. JWT: what the frontend receives

After **login** or **refresh**, the access token payload (relevant fields) typically includes:

| Claim | Purpose |
|-------|--------|
| `userId` | Mongo ObjectId string |
| `email`, `role`, `tenantId`, `employee_id` | Context |
| `permRev` | Integer; matches `User.permissionsRevision` when token was issued |
| `permissions` | **Optional** array of effective permission strings (snapshot). Omitted if `JWT_SKIP_PERMISSIONS_CLAIM=1` on auth-service |

**Stale tokens:** If an admin changes someone else’s permissions, that user’s **`permRev`** bumps; old JWTs are still valid until expiry but may be **stale**. Mitigation: refresh token, or rely on server-side resolve on auth/HR. For **your** admin UI, after you PATCH another user, they need a new token to see new effective rights in JWT — HR/attendance may use Redis cache keyed by `(userId, permRev)`.

---

## 6. Base URLs and routing

Auth-service mounts the **same router** on two prefixes:

- **`/api/permission/...`**  
- **`/api/user/...`**  

So these are equivalent:

- `GET /api/permission/catalog`  
- `GET /api/user/catalog`  

Pick **one** prefix in the frontend and stay consistent (we recommend **`/api/permission`** for clarity).

**Public API host example:** `https://api.etelios.com` (your cluster may differ).

**Kubernetes ingress** in this repo now routes **`/api/permission`** and **`/api/user`** to **auth-service** (see `k8s/ingress.yaml`, `k8s/ingress-alb-fixed.yaml`, `k8s/ingress-frontend-backend.yaml`).

**Kong** (`microservices/api-gateway/kong.yml`) already exposes `/api/permission` and `/api/user` to **auth-service** with **PATCH**, **If-Match**, and **X-Tenant-Id** allowed for CORS.

**Note:** **`/api/users`** (plural) in ingress is routed to **tenant-registry** for a different product surface — do not confuse with **`/api/user/:userId`** (singular) for permission detail.

---

## 7. Headers for every call

| Header | Required | Notes |
|--------|----------|--------|
| `Authorization` | Yes | `Bearer <access_token>` |
| `Content-Type` | For POST/PATCH/PUT | `application/json` |
| `X-Tenant-Id` | If your gateway / app enforces it | Must match token tenant for strict routes |
| `If-Match` | Recommended on writes | `W/"permrev-<n>"` from `ETag` or body `permissionsRevision` |

---

## 8. API reference (full)

Below, `{BASE}` = e.g. `https://api.etelios.com` (no trailing slash).

### 8.1 `GET {BASE}/api/permission/catalog`

**Who:** `superadmin` | `admin` | `hr`  

**Response (200)** — shape:

```json
{
  "success": true,
  "data": {
    "catalogVersion": 1,
    "groups": [
      {
        "id": "users",
        "label": "User management",
        "items": [
          { "id": "read_users", "label": "Read users" }
        ]
      }
    ],
    "flat": ["read_users", "write_users"],
    "count": 2
  }
}
```

**Use in UI:** `groups` → sections; each `items[].id` is a checkbox id. `flat` → validation / search.

---

### 8.2 `GET {BASE}/api/permission/permissions`

Flat list only (no groups).

**Response (200):**

```json
{
  "success": true,
  "catalogVersion": 1,
  "data": ["read_users", "..."],
  "count": 217
}
```

---

### 8.3 `GET {BASE}/api/permission/permissions/department/:department`

Department-specific defaults helper (legacy + UI hints). Still requires tenant manager role.

---

### 8.4 `GET {BASE}/api/permission/users`

**Query:** `page`, `limit`, optional `department`, `band_level`.

**Response (200):** paginated list; each user includes effective permission resolution fields from server (e.g. `effectivePermissions`, `custom_permissions`, `permission_denials`, `permissionsRevision`).

Use for **admin user picker** or **table** before opening the matrix.

---

### 8.5 `GET {BASE}/api/permission/user/:userId`

**Who:** tenant managers; non–super-admin only same tenant.

**Headers out:** `ETag: W/"permrev-<n>"`

**Response (200)** — important fields:

```json
{
  "success": true,
  "data": {
    "userId": "...",
    "tenantId": "...",
    "department": "HR",
    "role": "accountant",
    "permissionsRevision": 3,
    "catalogVersion": 1,
    "customPermissions": ["read_payroll"],
    "permissionDenials": [],
    "legacyUserPermissions": [],
    "rolePermissions": ["..."],
    "effectivePermissions": ["..."],
    "count": 42,
    "meta": {}
  }
}
```

**UI mapping:**

- Show **checkbox state** from effective vs catalog, but **persist** using `customPermissions` + `permissionDenials` (or compute diffs carefully).  
- Simplest approach: render from **effective** for read-only clarity; on edit, maintain local state as two arrays matching PATCH body.

---

### 8.6 `PATCH {BASE}/api/permission/user/:userId/overrides`

**Who:** tenant managers. **Rate limited** server-side.

**Body (both arrays required):**

```json
{
  "custom_permissions": ["read_payroll", "export_reports"],
  "permission_denials": ["delete_users"]
}
```

**Headers:** optional `If-Match: W/"permrev-3"`

**Success (200):** message + updated revision + ETag header.

**412** — revision mismatch (`PERMISSION_REVISION_CONFLICT`).

**403** — escalation / cannot manage target / cross-tenant.

---

### 8.7 `PUT {BASE}/api/permission/user/:userId`

**Body:**

```json
{
  "permissions": ["read_payroll"],
  "action": "add",
  "permission_denials": []
}
```

- `action`: **`add`** | **`remove`** | **`replace`**  
- `permission_denials`: optional; if provided, **replaces** entire deny list.

---

### 8.8 `POST {BASE}/api/permission/user/:userId/reset`

Clears **both** `custom_permissions` and `permission_denials` for that user (back to role + legacy only).

---

### 8.9 `POST {BASE}/api/permission/user/:userId/escalation-preview`

**Dry-run** — does **not** change data.

**Body:** optional arrays. If you **omit** `custom_permissions` or `permission_denials`, server uses **current DB values** for that side.

```json
{
  "custom_permissions": ["read_payroll"],
  "permission_denials": []
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "allowed": true,
    "code": "OK",
    "effectiveBefore": ["read_attendance"],
    "effectiveAfter": ["read_attendance", "read_payroll"],
    "added": ["read_payroll"],
    "removed": [],
    "proposedCustomPermissions": ["read_payroll"],
    "proposedPermissionDenials": [],
    "catalogVersion": 1,
    "unknownCustomStripped": [],
    "unknownDenyStripped": []
  }
}
```

If **`allowed: false`**:

```json
{
  "allowed": false,
  "code": "PERMISSION_ESCALATION",
  "message": "Cannot grant permission \"system_admin\" — not in your effective access. Ask superadmin.",
  "blockingPermission": "system_admin"
}
```

**UI:** Call this on **Save** (before PATCH) or on **blur** of matrix for power users; show `message` + highlight `blockingPermission` in the grid.

---

### 8.10 `GET {BASE}/api/permission/internal/metrics`

**Who:** `superadmin` only. For observability, not the matrix UI.

---

## 9. Recommended UI flows (step by step)

### 9.1 First-time admin opens “Permissions”

1. Call **`GET /catalog`** → build section list + checkbox ids.  
2. Optionally cache `catalogVersion` in memory; if backend bumps version, refresh catalog.  
3. Call **`GET /users?page=1&limit=20`** → show table.  
4. On row click → **`GET /user/:userId`** → bind matrix.

### 9.2 Editing the matrix (safe path)

1. Load **`GET /user/:userId`** → store `permissionsRevision` and `ETag`.  
2. User toggles checkboxes → update **local** `draftCustom` and `draftDeny` (or your own state machine).  
3. On Save:  
   - **`POST .../escalation-preview`** with draft.  
   - If `allowed === false` → toast + scroll to `blockingPermission`.  
   - If allowed → **`PATCH .../overrides`** with `If-Match`.  
4. If **412** → show “Someone else updated permissions” → reload **`GET /user/:userId`** and offer merge.

### 9.3 Superadmin vs tenant admin copy

- **Superadmin:** can open any tenant’s user if your routing provides `userId` (still enforce `X-Tenant-Id` if gateway requires it).  
- **Admin / HR:** only same-tenant users; backend returns **403** otherwise — show “No access”.

---

## 10. Errors and how to show them

| HTTP | Code / hint | User-facing copy (example) |
|------|-------------|----------------------------|
| 401 | `AUTH_REQUIRED` / invalid token | Session expired — log in again |
| 403 | `FORBIDDEN` / tenant | You can’t manage this user |
| 403 | `PERMISSION_ESCALATION` | You can’t grant this — ask superadmin |
| 412 | `PERMISSION_REVISION_CONFLICT` | Permissions were updated — refresh |
| 429 | rate limit | Too many saves — wait a moment |
| 400 | validation | Show `message` from JSON |

Always read **`success: false`** and **`message`** from JSON when present.

---

## 11. Optimistic concurrency (If-Match)

1. Read **`ETag`** from `GET /user/:userId` (or `permissionsRevision` from body).  
2. Send **`If-Match: W/"permrev-<n>"`** on **PATCH / PUT / reset**.  
3. On **412**, refresh and reapply (or show diff UI for advanced cases).

---

## 12. TypeScript-friendly types (copy-paste)

```ts
export type PermissionCatalogGroup = {
  id: string;
  label: string;
  items: { id: string; label: string }[];
};

export type CatalogResponse = {
  success: true;
  data: {
    catalogVersion: number;
    groups: PermissionCatalogGroup[];
    flat: string[];
    count: number;
  };
};

export type UserPermissionDetail = {
  userId: string;
  tenantId: string;
  department: string;
  role: string;
  permissionsRevision: number;
  catalogVersion: number;
  customPermissions: string[];
  permissionDenials: string[];
  legacyUserPermissions: string[];
  rolePermissions: string[];
  effectivePermissions: string[];
  count: number;
};

export type EscalationPreviewData = {
  allowed: boolean;
  code: string;
  message?: string;
  blockingPermission?: string;
  effectiveBefore: string[];
  effectiveAfter: string[];
  added: string[];
  removed: string[];
  proposedCustomPermissions: string[];
  proposedPermissionDenials: string[];
  catalogVersion: number;
  unknownCustomStripped: string[];
  unknownDenyStripped: string[];
};
```

---

## 13. Example: minimal React module

```tsx
const BASE = process.env.NEXT_PUBLIC_API_URL!;

async function api(path: string, token: string, tenantId: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(init.headers as Record<string, string>),
  };
  if (tenantId) headers['X-Tenant-Id'] = tenantId;
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || res.statusText);
  return json;
}

export async function loadCatalog(token: string, tenantId: string) {
  return api('/api/permission/catalog', token, tenantId);
}

export async function loadUserPerms(userId: string, token: string, tenantId: string) {
  return api(`/api/permission/user/${userId}`, token, tenantId);
}

export async function previewSave(
  userId: string,
  body: { custom_permissions: string[]; permission_denials: string[] },
  token: string,
  tenantId: string
) {
  return api(`/api/permission/user/${userId}/escalation-preview`, token, tenantId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function saveOverrides(
  userId: string,
  body: { custom_permissions: string[]; permission_denials: string[] },
  ifMatch: string,
  token: string,
  tenantId: string
) {
  return api(`/api/permission/user/${userId}/overrides`, token, tenantId, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'If-Match': ifMatch },
    body: JSON.stringify(body),
  });
}
```

---

## 14. Testing with curl

Replace `TOKEN`, `TENANT`, `USER_ID`, `HOST`.

```bash
HOST=https://api.etelios.com
TOKEN=...
TENANT=...

curl -sS "$HOST/api/permission/catalog" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT" | jq .

curl -sS "$HOST/api/permission/user/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT" -D - | head

curl -sS -X POST "$HOST/api/permission/user/$USER_ID/escalation-preview" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT" \
  -H "Content-Type: application/json" \
  -d '{"custom_permissions":["read_reports"],"permission_denials":[]}' | jq .
```

---

## 15. Production deployment checklist

You (or CI) must **build, push, and rollout** services that changed. This repo cannot run `kubectl` against your cluster from here; follow the checklist below.

### 15.1 Images to rebuild (typical)

Build **linux/amd64** for EKS:

- **auth-service** (permission APIs, JWT claims, cache writes)  
- **hr-service**, **attendance-service**, **jts-service**, **sales-service** (permission read layering + JWT)  
- Any other service where you rely on **`req.user.permissions`** from JWT  

Example:

```bash
docker build --platform linux/amd64 -t <ecr>/etelios-auth-service:<tag> microservices/auth-service
docker push <ecr>/etelios-auth-service:<tag>
```

### 15.2 Kubernetes manifest updates (already in repo)

- **`k8s/etelios-prod/auth-service-deployment.yaml`** — **`REDIS_URL`** set to `redis://redis:6379` (same pattern as JTS) so **effective permission cache** keys work cluster-wide. If your Redis Service name differs, change the URL.  
- **Ingress** — **`/api/permission`** and **`/api/user`** → **auth-service** (`k8s/ingress.yaml`, `ingress-alb-fixed.yaml`, `ingress-frontend-backend.yaml`).  
- **JWT** — all verifiers must use **`etelios-jwt-sync`** (`JWT_SECRET` / `JWT_REFRESH_SECRET`) — see `docs/OPERATIONS_JWT_AND_PERMISSIONS_CACHE.md`.

### 15.3 Apply and rollout (example)

```bash
kubectl -n etelios-prod apply -f k8s/ingress.yaml
# or your ALB / frontend-backend ingress file

kubectl -n etelios-prod apply -f k8s/etelios-prod/auth-service-deployment.yaml
kubectl -n etelios-prod rollout status deploy/auth-service

kubectl -n etelios-prod rollout restart deploy/hr-service deploy/attendance-service deploy/jts-service deploy/sales-service
kubectl -n etelios-prod rollout status deploy/hr-service
```

Adjust namespace, deployment names, and which services you actually run.

### 15.4 Post-deploy smoke tests

1. Login as **hr** or **admin** → receive token with **`permRev`** (and usually **`permissions`**).  
2. `GET /api/permission/catalog` → **200**.  
3. `GET /api/permission/user/<id>` → **200** + **ETag**.  
4. `POST .../escalation-preview` → **200** with `allowed` boolean.  
5. Optional: PATCH in staging with **`If-Match`** → expect **412** when revision wrong.

### 15.5 Kong (if you use the repo’s `kong.yml`)

Reload / decK apply so **`X-Tenant-Id`** is allowed on permission routes (updated in `microservices/api-gateway/kong.yml`).

---

## 16. FAQ

**Q: Can we use only `/api/user/...` and not `/api/permission/...`?**  
A: Yes — same router. Pick one convention for the frontend.

**Q: Why does my attendee still see old permissions in another service?**  
A: Token snapshot + cache TTL. User should **refresh token** or wait for cache; server-side HR still resolves from DB when cache layer returns `none`.

**Q: Are unknown checkbox ids saved?**  
A: They are **stripped**; audit tracks unknowns where applicable. Always use **`catalog.flat`** as source of truth.

**Q: Can `manager` role use this admin UI?**  
A: **No** — only `superadmin`, `admin`, `hr` on these routes.

---

## 17. Related docs & portable assets

| Path | Purpose |
|------|---------|
| `integrations/permission-matrix-sdk/` | **Copy into any frontend repo:** `permissionApi.ts`, `usePermissionAdmin.ts`, README |
| `scripts/etelios-prod-set-images.sh` | Bump **running** ECR tags on auth/hr/attendance/jts/sales/api-gateway |
| `k8s/etelios-prod/README.md` | After script, sync YAML/JSON image fields |
| `docs/PERMISSION_MATRIX_FRONTEND_INTEGRATION.md` | Shorter API cheat sheet |
| `docs/PERMISSION_FRONTEND_SAMJHA_HUA_GUIDE.md` | Simple Hinglish explainer for product + frontend (flow, SDK, errors) |
| `docs/OPERATIONS_JWT_AND_PERMISSIONS_CACHE.md` | JWT secret sync, Redis keys, Kafka note, rotation |
| `microservices/shared/utils/permissionCatalog.js` | Catalog source code |
| `microservices/auth-service/src/routes/permission.routes.js` | Route list |

---

*End of document.*
