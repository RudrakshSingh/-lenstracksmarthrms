# Permission admin SDK (copy into any frontend repo)

**Use when:** your React/Next/Vite app lives in **another repo / machine** and you need the **Petpooja-style matrix** wired to auth-service.

**Concepts + screen flow (simple):** [`docs/PERMISSION_FRONTEND_SAMJHA_HUA_GUIDE.md`](../../docs/PERMISSION_FRONTEND_SAMJHA_HUA_GUIDE.md)

## 1. Copy files

Copy this folder into your app, e.g. `src/lib/permission-admin/`:

| File | Purpose |
|------|---------|
| `permissionApi.ts` | Typed fetch helpers for all permission endpoints |
| `usePermissionAdmin.ts` | React hooks: catalog, user detail, preview, save |

Adjust `API_BASE` (or pass from `process.env.NEXT_PUBLIC_API_URL`).

## 2. Env (your frontend)

```bash
NEXT_PUBLIC_API_URL=https://api.etelios.com
# or VITE_API_URL=...
```

## 3. Usage sketch

```tsx
import { usePermissionCatalog, useUserPermissions, saveOverrides } from '@/lib/permission-admin/usePermissionAdmin';

function MatrixPage({ token, tenantId, userId }: { token: string; tenantId: string; userId: string }) {
  const { catalog, loading: cLoad } = usePermissionCatalog(token, tenantId);
  const { data, loading, etag, reload } = useUserPermissions(userId, token, tenantId);
  // ... render checkboxes from catalog + data.effectivePermissions / custom / deny
  // on save: await saveOverrides(userId, { custom_permissions, permission_denials }, etag, token, tenantId);
}
```

## 4. Roles

Only **`superadmin`**, **`admin`**, **`hr`** get 200 from these APIs. Gate your route in the UI.

## 5. Full spec

See repo docs: [`docs/PERMISSION_RBAC_MAJOR_UPDATE_E2E_FRONTEND_AND_PROD.md`](../../docs/PERMISSION_RBAC_MAJOR_UPDATE_E2E_FRONTEND_AND_PROD.md).
