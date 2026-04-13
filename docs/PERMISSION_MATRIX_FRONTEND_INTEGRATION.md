# Permission matrix (frontend) — auth-service APIs

**Full end-to-end guide (long):** [`PERMISSION_RBAC_MAJOR_UPDATE_E2E_FRONTEND_AND_PROD.md`](./PERMISSION_RBAC_MAJOR_UPDATE_E2E_FRONTEND_AND_PROD.md) — architecture, every endpoint, React example, prod rollout, FAQ.

**Copy-paste SDK (any React repo):** [`../integrations/permission-matrix-sdk/README.md`](../integrations/permission-matrix-sdk/README.md)

**Samjha hua guide (Hinglish, product + frontend):** [`PERMISSION_FRONTEND_SAMJHA_HUA_GUIDE.md`](./PERMISSION_FRONTEND_SAMJHA_HUA_GUIDE.md)

This page is a **short cheat sheet** for the same APIs.

## Base URL

- Auth-service mounts routes at **`/api/permission`** and **`/api/user`** (same router). Example: `GET https://<host>/api/permission/catalog`.
- Kong/ingress may strip or prefix paths — align your gateway route with the above.

## Headers (all calls)

| Header | Value |
|--------|--------|
| `Authorization` | `Bearer <access_token>` |
| `X-Tenant-Id` | Tenant id (when gateway requires it) |
| `If-Match` | Optional on writes: `W/"permrev-<n>"` from last `GET` `ETag` / body `permissionsRevision` |

## Endpoints

### 1. Matrix structure + validation list

`GET .../catalog`

Response `data`:

- `groups` — UI sections + `items[{ id, label }]`
- `flat` — all valid permission codes
- `catalogVersion` — bump when catalog changes

### 2. User list (admin grid)

`GET .../users?page=1&limit=20&department=HR`

Returns users with `effectivePermissions`, `custom_permissions`, `permission_denials`, `permissionsRevision`.

### 3. User detail (single matrix)

`GET .../user/:userId`

- Response includes `customPermissions`, `permissionDenials`, `rolePermissions`, `effectivePermissions`, `permissionsRevision`.
- Use `ETag` / `permissionsRevision` for `If-Match` on saves.

### 4. Save full allow/deny override sets (replace)

`PATCH .../user/:userId/overrides`

Body:

```json
{
  "custom_permissions": ["read_payroll", "export_reports"],
  "permission_denials": ["delete_users"]
}
```

Both arrays required (can be `[]`). Invalid codes are stripped; unknown originals listed in audit.

### 5. Incremental custom grants (add/remove/replace)

`PUT .../user/:userId`

Body:

```json
{
  "permissions": ["read_payroll"],
  "action": "add",
  "permission_denials": []
}
```

`action`: `add` | `remove` | `replace`. Optional `permission_denials` replaces deny list when provided.

### 6. Dry-run escalation (before PATCH)

`POST .../user/:userId/escalation-preview`

Body (optional — omit an array to keep current DB value for that side):

```json
{
  "custom_permissions": ["read_payroll"],
  "permission_denials": []
}
```

Response `data`:

- `allowed` — whether current actor may apply this change
- `effectiveBefore` / `effectiveAfter` — sorted lists
- `added` / `removed` — diff
- `blockingPermission` — when `allowed` is false

### 7. Reset overrides

`POST .../user/:userId/reset`

Clears `custom_permissions` and `permission_denials` (role + legacy only).

## React sketch

```tsx
// After login, store accessToken + tenant id.
const headers = {
  Authorization: `Bearer ${token}`,
  'X-Tenant-Id': tenantId,
  'Content-Type': 'application/json',
};

const catalog = await fetch(`${API}/catalog`, { headers }).then((r) => r.json());
const detail = await fetch(`${API}/user/${userId}`, { headers }).then((r) => r.json());
const rev = detail.data.permissionsRevision;
const preview = await fetch(`${API}/user/${userId}/escalation-preview`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ custom_permissions: nextAllow, permission_denials: nextDeny }),
}).then((r) => r.json());
if (!preview.data.allowed) {
  /* show preview.data.message, blockingPermission */
}
await fetch(`${API}/user/${userId}/overrides`, {
  method: 'PATCH',
  headers: { ...headers, If-Match: `W/"permrev-${rev}"` },
  body: JSON.stringify({ custom_permissions: nextAllow, permission_denials: nextDeny }),
});
```

## Roles allowed

Tenant managers: `superadmin`, `admin`, `hr` (see `permission.routes.js`).
