# Admin MFE → Backend Alignment (Option A)
**Date**: 2026-01-14  
**Goal**: Make **Admin MFE** work with the **current backend** without changing backend APIs.

---

## What Admin MFE expects vs what backend returns

### 1) Tenants list: `GET /api/tenants`

**Admin MFE doc expects**:

```json
{
  "success": true,
  "data": [ { "id": "...", "name": "...", "domain": "...", "status": "active" } ],
  "total": 123,
  "page": 1,
  "limit": 10,
  "totalPages": 13,
  "message": "Companies retrieved successfully"
}
```

**Current tenant-registry-service returns**:

```json
{
  "success": true,
  "data": {
    "tenants": [ { "tenantId": "...", "tenantName": "...", "domain": "...", "status": "active" } ],
    "pagination": { "page": 1, "limit": 10, "total": 123, "pages": 13 }
  }
}
```

**Frontend change required (Option A)**:
- Read the array from `res.data.tenants` (NOT `res.data`)
- Read pagination from `res.data.pagination`

**Suggested adapter (frontend)**:

```ts
function normalizeTenantsList(res: any) {
  // new format
  if (res?.data?.tenants && res?.data?.pagination) {
    return {
      success: res.success,
      data: res.data.tenants,
      total: res.data.pagination.total,
      page: res.data.pagination.page,
      limit: res.data.pagination.limit,
      totalPages: res.data.pagination.pages,
      message: res.message
    };
  }

  // already in expected format
  return res;
}
```

---

### 2) Platform metrics: path mismatch

**Admin MFE doc expects**:
- `GET /api/platform/metrics`

**In this repo, platform metrics are implemented in** `tenant-management-service` as:
- `GET /api/admin/v1/platform/metrics`

**Frontend change required (Option A)**:
- Either deploy and call `tenant-management-service` and point Admin MFE to `/api/admin/v1/platform/metrics`, or keep this section mocked until backend is aligned.

---

### 3) System alerts / activities / admin system health: not implemented at doc paths

Doc expects:
- `GET /api/system/alerts`
- `GET /api/activities`
- `GET /api/admin/system/health`

If these are still mocked in the frontend, keep them mocked; otherwise Admin MFE needs to call whatever service actually provides them (if deployed).

---

## When to use Option A
- You want **zero backend changes** and can quickly update Admin MFE client code.
- You can tolerate endpoint/path differences (metrics/alerts/activities).

