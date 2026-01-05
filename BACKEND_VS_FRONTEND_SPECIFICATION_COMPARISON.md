# Backend vs Frontend Specification Comparison

**Date**: 2026-01-04  
**Frontend Spec Version**: 1.0  
**Purpose**: Verify backend implementation matches frontend requirements

---

## ✅ Authentication Endpoints

### 1. Login (`POST /api/auth/login`)

#### Frontend Expects:
```json
Request: { "emailOrEmployeeId": "admin@etelios.com", "password": "..." }
Response: {
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "role": "admin", "name": "..." },
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 3600
  }
}
```

#### Backend Implementation:
- **Location**: `microservices/auth-service/src/controllers/authController.js`
- **Status**: ✅ **MATCHES**
- **Supports**: Both `emailOrEmployeeId` and `email` fields
- **Response Format**: ✅ Returns `{ success: true, data: { user, accessToken, refreshToken } }`
- **Roles Supported**: ✅ `admin`, `hr`, `manager`, `employee`, `superadmin`

**Verdict**: ✅ **COMPLIANT**

---

### 2. Token Refresh (`POST /api/auth/refresh`)

#### Frontend Expects:
```json
Request: { "refreshToken": "..." }
Response: {
  "accessToken": "...",
  "refreshToken": "...",  // Optional if rotating
  "expiresIn": 3600
}
```

#### Backend Implementation:
- **Location**: `microservices/auth-service/src/controllers/authController.js` (line 158)
- **Route**: `POST /api/auth/refresh-token` (note: `refresh-token` not `refresh`)
- **Status**: ⚠️ **PATH MISMATCH**
- **Frontend calls**: `/api/auth/refresh`
- **Backend has**: `/api/auth/refresh-token`

**Verdict**: ⚠️ **NEEDS FIX** - Add route alias or update frontend

---

### 3. Get Current User (`GET /api/auth/me`)

#### Frontend Expects:
- Endpoints tried: `/api/auth/profile`, `/api/auth/me`
- Response: `{ "user": { "id": "...", "email": "...", "role": "...", "name": "..." } }`

#### Backend Implementation:
- **Location**: `microservices/auth-service/src/controllers/authController.js` (line 218)
- **Route**: `GET /api/auth/profile` ✅
- **Route**: `GET /api/auth/me` ❌ (not found)
- **Status**: ⚠️ **PARTIAL MATCH**

**Verdict**: ⚠️ **NEEDS FIX** - Add `/api/auth/me` route alias

---

## ✅ HRMS Endpoints

### 1. Employee Registration (`POST /api/auth/register`)

#### Frontend Expects:
```json
{
  "employee_id": "EMP001",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "Password123",
  "role": "employee",
  "department": "Engineering",
  "designation": "Software Engineer",
  "joining_date": "2025-01-27",
  "storeId": "store_id",  // Optional
  "reportingManager": "manager_id"  // Optional
}
```

#### Backend Implementation:
- **Location**: `microservices/hr-service/src/server.js` (line 430)
- **Status**: ⚠️ **PARTIAL MATCH**
- **Issues**:
  - ❌ Missing `department` in HR service schema (required by frontend)
  - ❌ Missing `designation` in HR service schema (required by frontend)
  - ❌ Missing `joining_date` in HR service schema (required by frontend)
  - ✅ Has `address` (required by HR service, optional in frontend)
  - ⚠️ Field name mismatch: `reportingManager` (frontend) vs `reporting_manager` (backend)

**Verdict**: ⚠️ **NEEDS FIX** - Add missing required fields

---

### 2. Get Employees List (`GET /api/hr/employees`)

#### Frontend Expects:
- Query params: `page`, `limit`, `search`, `department`, `status`, `storeId`
- Response: `{ "success": true, "data": [...], "pagination": { "page": 1, "limit": 10, "total": 100, "totalPages": 10 } }`

#### Backend Implementation:
- **Location**: `microservices/hr-service/src/controllers/hrController.js` (line 22)
- **Route**: `GET /api/hr/employees` ✅
- **Query Params**: ✅ Supports `page`, `limit`, `search`, `department`, `status`, `store`
- **Response Format**: ✅ Returns `{ success: true, data: [...], pagination: {...} }`
- **Status**: ✅ **MATCHES**

**Verdict**: ✅ **COMPLIANT**

---

### 3. Get Departments (`GET /api/hr/departments`)

#### Frontend Expects:
- Query params: `page`, `limit`, `search`, `status`
- Response: `{ "success": true, "data": [...], "pagination": {...} }`

#### Backend Implementation:
- **Location**: `microservices/hr-service/src/controllers/hrController.js` (line 565)
- **Route**: `GET /api/hr/departments` ✅
- **Status**: ✅ **MATCHES**

**Verdict**: ✅ **COMPLIANT**

---

### 4. Get Stores (`GET /api/hr/stores`)

#### Frontend Expects:
- Query params: `page`, `limit`, `search`, `status`
- Response: `{ "success": true, "data": [...], "pagination": {...} }`

#### Backend Implementation:
- **Location**: `microservices/hr-service/src/controllers/hrController.js` (line 406)
- **Route**: `GET /api/hr/stores` ✅
- **Query Params**: ✅ Supports pagination and filters
- **Response Format**: ✅ Returns `{ success: true, data: [...], pagination: {...} }`
- **Status**: ✅ **MATCHES**

**Verdict**: ✅ **COMPLIANT**

---

### 5. HRMS Dashboard Stats (`GET /api/hrms/dashboard/stats`)

#### Frontend Expects:
```json
{
  "success": true,
  "data": {
    "totalEmployees": 100,
    "activeEmployees": 95,
    "newHires": 5,
    "attendanceRate": 92.5,
    "totalStores": 10,
    "avgSalary": 50000,
    "pendingLeaves": 3,
    "performanceScore": 85,
    "totalPrograms": 20,
    "activePrograms": 15,
    "totalEnrolled": 50,
    "avgCoverage": 80,
    "totalCost": 1000000,
    "satisfaction": 4.5
  }
}
```

#### Backend Implementation:
- **Location**: `microservices/hr-service/src/controllers/dashboardController.js` (line 13)
- **Route**: `GET /api/hr/dashboard/stats` ⚠️ (not `/api/hrms/dashboard/stats`)
- **Status**: ⚠️ **PATH MISMATCH**

**Verdict**: ⚠️ **NEEDS FIX** - Add route alias `/api/hrms/dashboard/stats` or update frontend

---

## ✅ Admin Endpoints

### 1. Get Users (`GET /api/admin/users`)

#### Frontend Expects:
- Query params: `page`, `limit`, `search`, `role`, `status`, `tenantId`
- Response: `{ "success": true, "data": [...], "pagination": {...} }`

#### Backend Implementation:
- **Location**: `microservices/hr-service/src/controllers/adminUserController.js` (line 16)
- **Route**: `GET /api/admin/users` ✅
- **Query Params**: ✅ Supports `page`, `limit`, `search`, `role`, `status`
- **Response Format**: ✅ Returns `{ success: true, data: [...], pagination: {...} }`
- **Status**: ✅ **MATCHES** (tenantId filter may need verification)

**Verdict**: ✅ **COMPLIANT**

---

### 2. Get Roles (`GET /api/admin/roles`)

#### Frontend Expects:
- Response: `{ "success": true, "data": [...], "message": "..." }`

#### Backend Implementation:
- **Location**: `microservices/hr-service/src/controllers/adminRoleController.js`
- **Route**: `GET /api/admin/roles` ✅
- **Status**: ✅ **MATCHES**

**Verdict**: ✅ **COMPLIANT**

---

### 3. Get Tenants (`GET /api/admin/tenants`)

#### Frontend Expects:
- Query params: `page`, `limit`, `search`, `status`, `plan`
- Response: `{ "success": true, "data": [...], "pagination": {...} }`

#### Backend Implementation:
- **Location**: `microservices/hr-service/src/controllers/tenantController.js` (line 16)
- **Route**: `GET /api/admin/tenants` ✅
- **Query Params**: ✅ Supports `page`, `limit`, `search`, `status`, `subscriptionPlan`
- **Response Format**: ✅ Returns `{ success: true, data: [...], pagination: {...} }`
- **Status**: ✅ **MATCHES** (plan filter uses `subscriptionPlan` instead of `plan`)

**Verdict**: ⚠️ **MINOR MISMATCH** - Field name: `plan` (frontend) vs `subscriptionPlan` (backend)

---

## ⚠️ Issues Found

### Critical Issues:
1. ❌ **Employee Registration**: Missing `department`, `designation`, `joining_date` in HR service schema
2. ⚠️ **Token Refresh**: Route mismatch (`/api/auth/refresh` vs `/api/auth/refresh-token`)
3. ⚠️ **Get Current User**: Missing `/api/auth/me` route (only `/api/auth/profile` exists)

### Minor Issues:
4. ⚠️ **Field Name Mismatches**:
   - `reportingManager` (frontend) vs `reporting_manager` (backend)
   - `plan` (frontend) vs `subscriptionPlan` (backend)
   - `storeId` (frontend) vs `store` (backend)

### Needs Verification:
5. ⚠️ **Missing Endpoints**:
   - `GET /api/hrms/dashboard/stats` - Backend has `/api/hr/dashboard/stats` (path mismatch)
   - `GET /api/dashboard/stats` - Need to verify (analytics-service has it)
   - `GET /api/admin/modules` - ❌ **NOT FOUND** (needs implementation)
   - `GET /api/user/permissions` - ❌ **NOT FOUND** (needs implementation)

---

## 📋 Action Items

### High Priority:
1. ✅ Fix employee registration schema (add `department`, `designation`, `joining_date`)
2. ✅ Add `/api/auth/me` route alias
3. ✅ Add `/api/auth/refresh` route alias (or update frontend)

### Medium Priority:
4. ⚠️ Verify and implement missing endpoints:
   - `/api/hr/stores`
   - `/api/hrms/dashboard/stats`
   - `/api/dashboard/stats`
   - `/api/admin/modules`
   - `/api/user/permissions`

### Low Priority:
5. ⚠️ Standardize field names:
   - Support both `reportingManager` and `reporting_manager`
   - Support both `plan` and `subscriptionPlan`
   - Support both `storeId` and `store`

---

**Status**: Backend is mostly compliant, but needs fixes for employee registration and some route aliases.

