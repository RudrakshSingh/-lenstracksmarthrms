# ✅ Working Modules Status (Production-Ready)
**Date:** 2026-01-16  
**Scope:** This document lists **only the modules/features that are confirmed working** at backend level and are safe to use by frontend/ops teams.

---

## HR Module (HR Service) ✅

### Departments ✅
- **Create department**: department records persist correctly in DB.
- **List departments**: departments are fetched from DB (not mock/hardcoded).

**Key APIs**
- **Create**: `POST /api/hr/departments`
- **List**: `GET /api/hr/departments`

---

### Roster ✅
- **Roster fetch works without Cosmos DB composite-index dependency** (query is compatible with Cosmos/Mongo default indexing).

**Key APIs**
- **Roster**: `GET /api/hr/roster`

---

### Documents (HR / Employee documents) ✅
- **Multipart upload works** (`multipart/form-data` with `file` field).
- Upload response includes:
  - `file_url` (Blob URL)
  - `storage_provider` (e.g., `azure`)
- Route matching is fixed (upload route is not shadowed by param routes).

**Key APIs**
- **Upload**: `POST /api/documents/upload` *(multipart)*  
  Fields:
  - `file` (required)
  - `employee_id` (required)
  - `document_type` (required)
  - `category` (optional)
  - `compliance_required` (optional)
- **Health**: `GET /api/documents/health`

---

### Employee Onboarding (Documents + Photo) ✅
- **Direct file upload endpoint added for onboarding**.
- Uploads go to **Azure Blob Storage** and returned URL is persisted to employee onboarding docs.
- If uploaded document type is **`PHOTO`**, employee `avatar` is automatically updated to that Blob URL.

**Key APIs**
- **Onboarding file upload**: `POST /api/hr/onboarding/upload` *(multipart)*  
  Fields:
  - `file` (required)
  - `employee_id` (required)
  - `document_type` (required; use `PHOTO` for profile photo)

---

## Tenant / Company Module (Tenant Registry Service) ✅

### Tenant creation (Azure-like flow) ✅
- Tenant creation works end-to-end.
- Auto-creates **Tenant Admin** and **Tenant Super Admin** users.
- Generates **temporary passwords** and enforces **mustChangePassword** for first login.
- After password change, login flow is normal (temporary flags cleared).

**Key APIs**
- **Create tenant**: `POST /api/tenants`

---

### Tenant listing + details (Admin Console compatible) ✅
- `GET /api/tenants` returns Admin MFE-friendly pagination fields.
- `GET /api/tenants/:id` returns Admin MFE-friendly company overview structure.
- Backward compatibility is preserved via a `legacy` block where needed.

**Key APIs**
- **List**: `GET /api/tenants?search=&status=&page=&limit=`
- **Get by ID**: `GET /api/tenants/:tenantId`

---

### Tenant suspend + stats ✅
- Suspend company works (status → `suspended`).
- Tenant stats endpoint works.

**Key APIs**
- **Suspend**: `POST /api/tenants/:tenantId/suspend`
- **Stats**: `GET /api/tenants/stats`

---

## Auth Module (Auth Service) ✅

### Registration / Login / Password change ✅
- Register accepts and stores:
  - `tenantId`
  - `mustChangePassword`
  - `passwordTemporary`
- JWT includes:
  - `tenantId`
  - `employee_id`
- Change password clears:
  - `mustChangePassword=false`
  - `passwordTemporary=false`
- Email validation supports `+` in emails.

**Key APIs**
- **Register**: `POST /api/auth/register`
- **Login**: `POST /api/auth/login`
- **Change password**: `POST /api/auth/change-password`

---

## Admin MFE (Platform Admin Console) — Backend Support ✅

### Platform / System endpoints ✅
- Platform metrics endpoint is available.
- System health endpoint is available.
- Activities endpoint is available (best-effort).
- System alerts endpoint is available (currently returns empty array but stable response contract).

**Key APIs**
- **Platform metrics**: `GET /api/platform/metrics`
- **System alerts**: `GET /api/system/alerts`
- **Activities**: `GET /api/activities?limit=10`
- **Admin system health**: `GET /api/admin/system/health`

---

### Admin READ-ONLY resources ✅
- Users list and users stats are available for platform views (tenant-scoped).
- Roles endpoint is available (safe minimal list).
- Branches/Organizations endpoints respond successfully (stable contract).

**Key APIs**
- **Users (READ-ONLY)**: `GET /api/users?tenantId=<tenantId>&search=&role=&status=&page=&limit=`
- **Users stats**: `GET /api/users/stats?tenantId=<tenantId>`
- **Roles**: `GET /api/roles?tenantId=<tenantId>`
- **Branches**: `GET /api/branches?tenantId=<tenantId>`
- **Organizations**: `GET /api/organizations?tenantId=<tenantId>`

---

## Storage (Azure Blob) ✅
- Azure Blob Storage configuration is supported via:
  - SAS token + account name + container
  - or full SAS URL
  - or connection string
  - or account key
- Upload endpoints return Blob URLs and persist them where required (documents + onboarding photo).

**Key runtime requirements**
- `STORAGE_PROVIDER=azure`
- `AZURE_STORAGE_SAS_TOKEN` + `AZURE_STORAGE_ACCOUNT_NAME`
- `AZURE_STORAGE_CONTAINER_NAME=hrms-images`

---

## Ingress Routing ✅
- Production traffic is routed through **Ingress** directly to services (no API gateway required).
- Paths are mapped to backend services (auth/hr/attendance/tenant-registry/etc.).

