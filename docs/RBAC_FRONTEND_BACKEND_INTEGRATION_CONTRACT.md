# RBAC Frontend ↔ Backend — Integration contract (as implemented)

**Audience:** Frontend developers implementing the RBAC UI.  
**Service:** `auth-service` (exposed via API gateway under `/api/permission`).  
**Status:** Endpoints below are **implemented** in this repo; responses use a **`success` + `data`** envelope unless noted.

**Hinglish summary:** Backend pe permission ka **source of truth** yahi APIs + JWT hain — frontend sirf inhe call karke render / save kare, apni side par effective set mat banao.

---

## 1. Core principle (unchanged)

- Backend is the **single source of truth** for permissions.
- Frontend: render UI, call APIs, send updates — **do not recompute** `effectivePermissions` client-side for security-critical decisions (optional cache for UX only).

---

## 2. Required headers (all RBAC routes)

```http
Authorization: Bearer <accessToken>
X-Tenant-Id: <tenantId>
```

`X-Tenant-Id` must match the logged-in user’s tenant (same as JWT `tenantId`), lowercase, for consistency with other microservices.

---

## 3. Who can call these routes?

Caller role must be one of: **`superadmin`**, **`admin`**, **`hr`**.

- **`superadmin`:** can act across tenants (user list filter not forced by tenant).
- **`admin` / `hr`:** only users in **same `tenantId`** as the JWT (see `assertCanManageUserPermissions`).

---

## 4. APIs — paths and behaviour

Base path: **`/api/permission`** (duplicate mount also exists at **`/api/user`** — prefer **`/api/permission`** for new code).

### 4.1 Permission catalog

**`GET /api/permission/catalog`**

**Response (shape):**

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
    "count": 123
  }
}
```

- **`groups` / `flat` / `catalogVersion`** are the contract for the matrix UI.
- Extra field **`count`** = `flat.length` (safe to ignore in UI).

---

### 4.2 User list (for matrix / picker)

**`GET /api/permission/users`**

**Query:** `page`, `limit`, optional `department`, `band_level`.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "userId": "...",
      "name": "...",
      "email": "...",
      "role": "admin",
      "department": "HR",
      "permissionsRevision": 3,
      "tenantId": "upcapto",
      "effectivePermissions": ["read_users"],
      "departmentPermissions": [],
      "totalPermissions": 42
    }
  ],
  "pagination": {
    "current": 1,
    "pages": 5,
    "total": 48
  }
}
```

- Use **`userId`** (string) as the canonical id for **`GET /user/:userId`** (same as Mongo `_id` string).
- Rows include **more** fields than the minimal spec (`stores`, `reporting_manager` populate, etc.) — pick what you need.

---

### 4.3 User permission detail

**`GET /api/permission/user/:userId`**

**Response (`data`):**

| Field | Notes |
|--------|--------|
| `userId` | String |
| `tenantId`, `department`, `role` | |
| `permissionsRevision` | Integer; use for `If-Match` |
| `catalogVersion` | |
| `customPermissions`, `permissionDenials` | Current stored overrides (camelCase in JSON) |
| `rolePermissions` | From role resolution |
| `effectivePermissions` | **Authoritative** merged list for checks |
| `departmentPermissions` | Department template (separate from role) |
| `legacyUserPermissions` | Legacy `user.permissions` still merged in effective |
| `unknownCustomInDb`, `unknownDenyInDb` | Codes in DB not in catalog (stripped on write) |
| `meta` | Internal resolution hints |

**ETag:** Response includes **`ETag: W/"permrev-<n>"`** — same value as `If-Match` format.

---

### 4.4 Escalation preview (call before save)

**`POST /api/permission/user/:userId/escalation-preview`**

**Request body:**

```json
{
  "custom_permissions": ["read_users"],
  "permission_denials": []
}
```

- If either array is **omitted**, the preview keeps the target user’s **current** value for that side.

**Response (`data`) — includes spec fields plus extras:**

```json
{
  "allowed": true,
  "code": "OK",
  "blockingPermission": null,
  "added": [],
  "removed": [],
  "effectiveBefore": [],
  "effectiveAfter": [],
  "proposedCustomPermissions": [],
  "proposedPermissionDenials": [],
  "catalogVersion": 1,
  "unknownCustomStripped": [],
  "unknownDenyStripped": []
}
```

- When **`allowed: false`**: `code` may be `PERMISSION_ESCALATION` or `FORBIDDEN`, `message` explains, **`blockingPermission`** may be set.

---

### 4.5 Save overrides

**`PATCH /api/permission/user/:userId/overrides`**

**Headers (optional but recommended):**

```http
If-Match: W/"permrev-3"
```

**Body:**

```json
{
  "custom_permissions": ["read_users"],
  "permission_denials": []
}
```

Both must be **arrays** (can be empty).

**Success:** `200`, `data` includes updated `customPermissions`, `permissionDenials`, `effectivePermissions`, `permissionsRevision`, plus `unknownCustomStripped` / `unknownDenyStripped`.

**Conflict:** `412` — `code: PERMISSION_REVISION_CONFLICT`, `currentRevision` in body.

**Escalation blocked:** `403` — e.g. cannot grant a permission the actor does not hold (non–superadmin).

---

### 4.6 Reset overrides

**`POST /api/permission/user/:userId/reset`**

Optional **`If-Match`** same as PATCH.

Clears `custom_permissions` and `permission_denials`, bumps revision, returns new `effectivePermissions`.

---

### 4.7 Legacy bulk update (optional)

**`PUT /api/permission/user/:userId`** — `action`: `add` | `remove` | `replace` on legacy `permissions` body; prefer **PATCH overrides** for new UI.

---

## 5. JWT payload (access token)

Issued by auth-service on login/register/refresh paths. Relevant claims:

```json
{
  "userId": "...",
  "email": "...",
  "role": "admin",
  "tenantId": "upcapto",
  "employee_id": "...",
  "permRev": 5,
  "permissions": ["read_users", "..."]
}
```

- **`permRev`** mirrors DB **`permissionsRevision`**.
- **`permissions`** = effective list at token issue time **when enabled**.

### 5.1 When `permissions` may be missing

If environment has **`JWT_SKIP_PERMISSIONS_CLAIM=1`** or **`true`**, the **`permissions`** array may be **omitted** (smaller token). Then:

- Use **`permRev`** + server-side cache / **`GET /api/permission/user/:me`** pattern if you add a self route, or **`GET /api/auth/profile`** (if your gateway exposes it) to refresh effective list when needed.

---

## 6. Effective permission formula (actual backend)

Documented simplification in product specs:

```text
effective ≈ role_permissions ∪ custom_permissions ∪ legacy user.permissions \ permission_denials
```

Department-based templates are exposed separately as **`departmentPermissions`**; effective resolution is implemented in **`resolveEffectivePermissionsForUser`** + **`@etelios/shared/utils/permissionCore`**. **Trust `effectivePermissions` from API**, not hand-rolled client math.

---

## 7. Answers to “Questions for Backend Team”

1. **Will JWT always include `permissions`?**  
   **Default yes.** Can be turned off with **`JWT_SKIP_PERMISSIONS_CLAIM`**.

2. **When does `permRev` increment?**  
   On successful **PATCH overrides**, **PUT user permissions**, and **POST reset** — each bumps **`permissionsRevision`** by 1.

3. **Is escalation-preview mandatory?**  
   **Not enforced server-side** for PATCH; **strongly recommended** in UI before save. Server still enforces **`assertNoPrivilegeEscalation`** on write.

4. **Unknown permissions?**  
   **Stripped** via **`filterValidCodes`**; unknown codes reported in responses (`unknown*Stripped` / `unknown*InDb`).

5. **Role names standardized?**  
   **Lowercase strings** in code paths: `superadmin`, `admin`, `hr`, `employee`, etc.

---

## 8. Acceptance checklist (for frontend QA)

| Check | Notes |
|--------|--------|
| Catalog | `GET /catalog` → `groups` + `flat` |
| User list | `GET /users` → pagination + `userId` |
| User detail | `GET /user/:id` → `effectivePermissions` + `permissionsRevision` |
| Preview | `POST .../escalation-preview` → `allowed` / `blockingPermission` |
| Save | `PATCH .../overrides` + optional `If-Match` → 200 or 412 |
| JWT | Decode token → `permRev`, `permissions` (if present) |
| Headers | Bearer + `X-Tenant-Id` on every call |

---

## 9. Example (curl)

Replace `BASE`, `TOKEN`, `TENANT`, `USER_ID`.

```bash
BASE="https://api.example.com"
TOKEN="eyJ..."
TENANT="upcapto"

curl -sS "$BASE/api/permission/catalog" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT"

curl -sS "$BASE/api/permission/users?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT"

curl -sS "$BASE/api/permission/user/USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT"
```

---

## 10. Related docs

- `docs/RBAC_FRONTEND_SPEC_KYA_MAANG_RAHA_HAI_HINGLISH.md` — what the spec is asking for, in Hinglish.
- `microservices/auth-service/src/routes/permission.routes.js` — route map.
- `microservices/auth-service/src/controllers/permissionController.js` — implementation.

---

*Contract matches codebase as of April 2026; after deploy, verify gateway routes `/api/permission` → auth-service.*
