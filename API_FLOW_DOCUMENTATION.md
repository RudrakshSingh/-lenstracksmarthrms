# Complete API Flow Documentation - Tested & Verified

**Generated:** 2026-01-21T13:55:29.962Z
**Base URL:** https://98.70.245.87
**API Host:** api.etelios.com

---

## Test Results Summary

- **Total Tests:** 2
- **Passed:** 1
- **Failed:** 1

---

## Complete API Flow

### 1. Super Admin Login

**Status:** ✅ PASSED

**Method:** `POST`

**Endpoint:** `/api/auth/login`

**Headers:**
```json
{
  "Host": "api.etelios.com"
}
```

**Request Body:**
```json
{
  "emailOrEmployeeId": "admin@etelios.com",
  "password": "***"
}
```

**Response Status:** `200`

**Response Body:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "6957c445d7b5d8cd373801b6",
      "tenantId": "default",
      "employee_id": "ADMIN-001",
      "name": "System Administrator",
      "email": "admin@etelios.com",
      "phone": "+919999999999",
      "role": "admin",
      "department": "TECH",
      "band_level": "A",
      "hierarchy_level": "NATIONAL",
      "custom_permissions": [],
      "geofencing_enabled": false,
      "allowed_stores": [],
      "geofencing_radius": 100,
      "permissions": [],
      "designation": "System Administrator",
      "joining_date": "2026-01-02T13:12:35.591Z",
      "stores": [],
      "status": "active",
      "is_active": true,
      "last_activity": "2026-01-21T13:55:27.224Z",
      "createdAt": "2026-01-02T13:12:37.100Z",
      "updatedAt": "2026-01-21T13:55:27.224Z",
      "last_login": "2026-01-21T13:55:27.223Z",
      "mustChangePassword": false,
      "passwordTemporary": false,
      "full_name": "System Administrator",
      "employment_duration": 20,
      "id": "6957c445d7b5d8cd373801b6"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTU3YzQ0NWQ3YjVkOGNkMzczODAxYjYiLCJyb2xlIjoiYWRtaW4iLCJlbXBsb3llZV9pZCI6IkFETUlOLTAwMSIsImlhdCI6MTc2OTAwMzcyNywiZXhwIjoxNzY5MDA0NjI3LCJhdWQiOiJocm1zLWZyb250ZW5kIiwiaXNzIjoiaHJtcy1iYWNrZW5kIn0.SLPIkwlhWeg69J2LLRsJGEYRjyY7qzk5WWOW7qpgils",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTU3YzQ0NWQ3YjVkOGNkMzczODAxYjYiLCJpYXQiOjE3NjkwMDM3MjcsImV4cCI6MTc2OTYwODUyNywiYXVkIjoiaHJtcy1mcm9udGVuZCIsImlzcyI6ImhybXMtYmFja2VuZCJ9.oi5jdVCuLIPYr8GgqOW9nO0wwOcDwyuGh6i-Z6jlRco",
    "mustChangePassword": false,
    "passwordTemporary": false
  }
}
```

---

### 2. Create Tenant

**Status:** ❌ FAILED

**Method:** `POST`

**Endpoint:** `/api/tenants`

**Headers:**
```json
{
  "Host": "api.etelios.com",
  "Authorization": "Bearer ***"
}
```

**Request Body:**
```json
{
  "name": "Test Company 1769003726269",
  "email": "admin@test-1769003726269.com",
  "domain": "test-tenant-1769003726269",
  "subdomain": "test-tenant-1769003726269",
  "plan": "enterprise",
  "modules": [
    "hr",
    "analytics",
    "reports"
  ]
}
```

**Response Status:** `400`

**Response Body:**
```json
{
  "success": false,
  "message": "Validation error",
  "error": "VALIDATION_ERROR",
  "errors": [
    "\"subdomain\" must only contain alpha-numeric characters"
  ]
}
```

---

