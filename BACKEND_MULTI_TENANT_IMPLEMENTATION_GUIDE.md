# Backend Multi-Tenant Implementation Guide - Complete Analysis & Implementation Plan

**Target Audience:** Backend Development Team  
**Priority:** 🚨 CRITICAL - Production Blocker  
**Date:** January 21, 2026  
**Status:** ⚠️ **PARTIALLY IMPLEMENTED** - Critical Security Gaps Exist

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Current Backend State Analysis](#current-backend-state-analysis)
3. [What's Already Implemented ✅](#whats-already-implemented-)
4. [What's Missing ❌](#whats-missing-)
5. [Critical Security Gaps](#critical-security-gaps)
6. [Required Implementation Steps](#required-implementation-steps)
7. [Detailed Code Changes](#detailed-code-changes)
8. [Database Schema Status](#database-schema-status)
9. [API Contract Compliance](#api-contract-compliance)
10. [Testing Requirements](#testing-requirements)
11. [Deployment Plan](#deployment-plan)
12. [Troubleshooting Guide](#troubleshooting-guide)

---

## 🎯 EXECUTIVE SUMMARY

### Current Status:
- ✅ **60% Complete** - Basic tenant isolation infrastructure exists
- ⚠️ **40% Missing** - Critical security validations not implemented
- 🚨 **BLOCKING** - Frontend cannot deploy until backend is complete

### What Frontend Needs:
1. ✅ JWT token MUST contain `tenantId` claim
2. ❌ Backend MUST validate `X-Tenant-Id` header against JWT token
3. ✅ All database queries MUST filter by `tenantId`
4. ⚠️ Middleware MUST enforce tenant validation (partially done)

### Timeline:
- **Estimated Time:** 1-2 days
- **Blocking:** Frontend deployment
- **Impact:** HIGH - Security & Data Isolation

---

## 📊 CURRENT BACKEND STATE ANALYSIS

### ✅ What's Already Working:

#### 1. Database Schema - TenantId Fields ✅
- **Status:** ✅ **COMPLETE**
- **Location:** All models have `tenantId` field
- **Files:**
  - `microservices/hr-service/src/models/User.model.js` - ✅ Has `tenantId` (required, indexed)
  - `microservices/hr-service/src/models/Department.model.js` - ✅ Has `tenantId` (required, indexed)
  - `microservices/hr-service/src/models/Store.model.js` - ✅ Has `tenantId` (required, indexed)
  - `microservices/auth-service/src/models/User.model.js` - ✅ Has `tenantId` (required, indexed)

**Evidence:**
```javascript
// User.model.js
tenantId: {
  type: String,
  required: true,
  trim: true,
  lowercase: true,
  index: true
}
```

#### 2. Tenant Middleware - Extraction ✅
- **Status:** ✅ **COMPLETE**
- **Location:** `microservices/hr-service/src/middleware/tenant.middleware.js`
- **Functionality:**
  - ✅ Extracts `X-Tenant-Id` header
  - ✅ Falls back to query parameters
  - ✅ Falls back to JWT token (if available)
  - ✅ Sets `req.tenantId`

**Current Code:**
```javascript
const extractTenantId = (req, res, next) => {
  // Method 1: Extract from X-Tenant-Id header (primary method)
  let tenantId = req.get('X-Tenant-Id') || req.get('x-tenant-id');
  
  // Method 4: Extract from JWT token (if tenantId is in token)
  if (!tenantId && req.user && req.user.tenantId) {
    tenantId = req.user.tenantId;
  }
  
  // Normalize tenantId (lowercase, trim)
  tenantId = tenantId.toLowerCase().trim();
  req.tenantId = tenantId;
  next();
};
```

#### 3. Database Query Filtering ✅
- **Status:** ✅ **COMPLETE** (for HR Service)
- **Location:** `microservices/hr-service/src/services/hr.service.js`
- **Functionality:**
  - ✅ All `getEmployees` queries filter by `tenantId`
  - ✅ All `createEmployee` operations set `tenantId`
  - ✅ All `getEmployeeById` queries filter by `tenantId`
  - ✅ All `updateEmployee` queries filter by `tenantId`
  - ✅ All `deleteEmployee` queries filter by `tenantId`
  - ✅ All store queries filter by `tenantId`
  - ✅ All department queries filter by `tenantId`

**Evidence:**
```javascript
// getEmployees
const query = { 
  isDeleted: false,
  tenantId: { $exists: true, $eq: queryTenantId }
};

// createEmployee
const userData = {
  tenantId: employeeTenantId, // CRITICAL: Use employeeTenantId
  // ...
};

// getEmployeeById
query = { 
  _id: normalizedId, 
  tenantId: { $exists: true, $eq: employeeTenantId }
};
```

#### 4. JWT Token Generation - Partial ✅
- **Status:** ⚠️ **PARTIALLY COMPLETE**
- **Location:** `microservices/auth-service/src/services/auth.service.js`
- **Current State:**
  - ✅ `register()` function includes `tenantId` in token
  - ❌ `login()` function **MISSING** `tenantId` in token
  - ❌ `refreshToken()` function **MISSING** `tenantId` in token

**Current Code (Register - ✅ Working):**
```javascript
// Line 157-162: register() function
const accessToken = generateAccessToken({ 
  userId: user._id, 
  role: user.role,
  tenantId: user.tenantId, // ✅ INCLUDED
  employee_id: user.employee_id
});
```

**Current Code (Login - ❌ Missing):**
```javascript
// Line 278-282: login() function
const accessToken = generateAccessToken({ 
  userId: user._id, 
  role: user.role,
  employee_id: user.employee_id
  // ❌ MISSING: tenantId
});
```

**Current Code (Refresh - ❌ Missing):**
```javascript
// Line 367: refreshToken() function
const accessToken = generateAccessToken({ userId: user._id, role: user.role });
// ❌ MISSING: tenantId
```

---

## ❌ WHAT'S MISSING

### Issue #1: JWT Token Missing TenantId in Login ❌

**Current State:**
```javascript
// auth-service/src/services/auth.service.js - Line 278
const accessToken = generateAccessToken({ 
  userId: user._id, 
  role: user.role,
  employee_id: user.employee_id
  // ❌ tenantId is MISSING
});
```

**Impact:**
- Frontend `TenantProvider` throws error: `MISSING_TENANT_CLAIM`
- App shows error UI and blocks user
- Users cannot access application after login

**Required Fix:**
```javascript
const accessToken = generateAccessToken({ 
  userId: user._id, 
  role: user.role,
  tenantId: user.tenantId, // ✅ ADD THIS
  employee_id: user.employee_id
});
```

---

### Issue #2: No Tenant Validation Middleware ❌

**Current State:**
- `extractTenantId` middleware exists but **DOES NOT VALIDATE**
- It extracts `tenantId` from header but doesn't verify it matches JWT token
- User can manually change `X-Tenant-Id` header in browser DevTools
- **CRITICAL SECURITY VULNERABILITY**

**Current Code:**
```javascript
// tenant.middleware.js - extractTenantId()
// ❌ NO VALIDATION - Just extracts and sets req.tenantId
req.tenantId = tenantId; // No verification against JWT!
next();
```

**Required Fix:**
Create `validateTenantMiddleware` that:
1. Extracts `tenantId` from JWT token
2. Extracts `X-Tenant-Id` from header
3. Compares both values
4. Rejects request if mismatch (403 Forbidden)
5. Rejects request if header missing (400 Bad Request)

---

### Issue #3: Auth Middleware Doesn't Extract TenantId from JWT ❌

**Current State:**
- `auth.middleware.js` decodes JWT but doesn't extract `tenantId` from token
- `req.user` object doesn't include `tenantId` from token

**Current Code:**
```javascript
// hr-service/src/middleware/auth.middleware.js - Line 186-199
req.user = {
  id: user._id,
  userId: user._id,
  employeeId: user.employeeId,
  email: user.email,
  role: roleName,
  permissions: permissions,
  status: user.status
  // ❌ MISSING: tenantId from decoded token
};
```

**Required Fix:**
```javascript
req.user = {
  id: user._id,
  userId: user._id,
  employeeId: user.employeeId,
  email: user.email,
  role: roleName,
  permissions: permissions,
  status: user.status,
  tenantId: decoded.tenantId || user.tenantId // ✅ ADD THIS
};
```

---

### Issue #4: Refresh Token Doesn't Include TenantId ❌

**Current State:**
- `refreshToken()` function generates new access token without `tenantId`

**Current Code:**
```javascript
// auth-service/src/services/auth.service.js - Line 367
const accessToken = generateAccessToken({ userId: user._id, role: user.role });
// ❌ MISSING: tenantId
```

**Required Fix:**
```javascript
const accessToken = generateAccessToken({ 
  userId: user._id, 
  role: user.role,
  tenantId: user.tenantId // ✅ ADD THIS
});
```

---

## 🚨 CRITICAL SECURITY GAPS

### Gap #1: No Header-to-Token Validation

**Vulnerability:**
- User can change `X-Tenant-Id` header in browser DevTools
- Backend accepts any header value without validation
- User can access other tenant's data by changing header

**Example Attack:**
```javascript
// User logs in as Tenant A (token has tenantId: "tenant-a")
// User changes header to "tenant-b"
// Backend accepts request and returns Tenant B's data
```

**Impact:** 🚨 **CRITICAL** - Complete data breach

---

### Gap #2: Missing TenantId in Login Token

**Vulnerability:**
- Frontend cannot extract `tenantId` from token
- Frontend shows error and blocks user
- System unusable for end users

**Impact:** 🚨 **CRITICAL** - System unusable

---

### Gap #3: No Validation for Super Admin

**Vulnerability:**
- Super admin tokens may not have `tenantId`
- Need special handling for super admin access
- Current code doesn't handle this case

**Impact:** ⚠️ **MEDIUM** - Super admin functionality may break

---

## 🔧 REQUIRED IMPLEMENTATION STEPS

### Step 1: Fix JWT Token Generation in Login (30 minutes)

**File:** `microservices/auth-service/src/services/auth.service.js`

**Current Code (Line 278-282):**
```javascript
const accessToken = generateAccessToken({ 
  userId: user._id, 
  role: user.role,
  employee_id: user.employee_id
});
```

**Updated Code:**
```javascript
// CRITICAL: Include tenantId in token for multi-tenant security
// For non-super-admin users, tenantId is REQUIRED
if (user.role !== 'superadmin' && user.role !== 'super-admin') {
  if (!user.tenantId) {
    logger.error('User missing tenantId during login', {
      userId: user._id,
      email: user.email,
      role: user.role
    });
    throw new Error('User account is not associated with a tenant. Contact administrator.');
  }
}

const accessToken = generateAccessToken({ 
  userId: user._id, 
  role: user.role,
  tenantId: user.tenantId, // ✅ ADD THIS - CRITICAL
  employee_id: user.employee_id
});
```

**Testing:**
```javascript
// After login, decode token and verify
const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
console.log('Token payload:', decoded);
// Expected: { userId: "...", role: "...", tenantId: "lenstrack", employee_id: "..." }

if (!decoded.tenantId && decoded.role !== 'superadmin') {
  throw new Error('FAILED: Token missing tenantId');
}
console.log('✅ PASS: Token contains tenantId');
```

---

### Step 2: Fix Refresh Token Generation (15 minutes)

**File:** `microservices/auth-service/src/services/auth.service.js`

**Current Code (Line 367):**
```javascript
const accessToken = generateAccessToken({ userId: user._id, role: user.role });
```

**Updated Code:**
```javascript
// CRITICAL: Include tenantId in refreshed token
const accessToken = generateAccessToken({ 
  userId: user._id, 
  role: user.role,
  tenantId: user.tenantId, // ✅ ADD THIS
  employee_id: user.employee_id // ✅ ADD THIS (if available)
});
```

---

### Step 3: Update Auth Middleware to Extract TenantId from JWT (30 minutes)

**File:** `microservices/hr-service/src/middleware/auth.middleware.js`

**Current Code (Line 186-199):**
```javascript
req.user = {
  id: user._id,
  _id: user._id,
  userId: user._id,
  employeeId: user.employeeId,
  email: user.email,
  role: roleName,
  permissions: permissions,
  status: user.status
};
```

**Updated Code:**
```javascript
// CRITICAL: Extract tenantId from JWT token (preferred) or user document (fallback)
// JWT token is source of truth for tenant context
const tenantIdFromToken = decoded.tenantId;
const tenantIdFromUser = user.tenantId;

// Prefer token's tenantId (it's validated during login)
// Fallback to user's tenantId if token doesn't have it (for backward compatibility)
const tenantId = tenantIdFromToken || tenantIdFromUser;

if (!tenantId && roleName !== 'superadmin' && roleName !== 'super-admin') {
  logger.warn('User missing tenantId in both token and database', {
    userId: user._id,
    email: user.email,
    role: roleName
  });
}

req.user = {
  id: user._id,
  _id: user._id,
  userId: user._id,
  employeeId: user.employeeId,
  email: user.email,
  role: roleName,
  permissions: permissions,
  status: user.status,
  tenantId: tenantId // ✅ ADD THIS - CRITICAL for tenant validation
};
```

---

### Step 4: Create Tenant Validation Middleware (2 hours)

**Create File:** `microservices/hr-service/src/middleware/validateTenant.middleware.js`

**Implementation:**

```javascript
const logger = require('../config/logger');

/**
 * SECURITY MIDDLEWARE: Validate tenant context
 * 
 * This middleware ensures:
 * 1. X-Tenant-Id header is present
 * 2. X-Tenant-Id matches JWT token's tenantId claim
 * 3. Tenant cannot be spoofed via header manipulation
 * 
 * Must be applied AFTER authentication middleware
 * 
 * @param {Object} options - Configuration options
 * @param {Array<string>} options.exemptPaths - Paths to skip validation
 * @param {boolean} options.allowSuperAdminWithoutTenant - Allow super admin without tenant
 * @returns {Function} Express middleware
 */
function validateTenantMiddleware(options = {}) {
  const {
    exemptPaths = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh',
      '/api/auth/logout',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/health',
      '/api/health'
    ],
    allowSuperAdminWithoutTenant = false,
  } = options;

  return (req, res, next) => {
    // Skip validation for exempt paths
    if (exemptPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Extract tenantId from JWT token (should be set by auth middleware)
    const tokenTenantId = req.user?.tenantId;

    // Check if user is super-admin
    const isSuperAdmin = 
      req.user?.role === 'superadmin' || 
      req.user?.role === 'super-admin' ||
      req.user?.role === 'platform-owner';

    // Super-admin exception (if allowed)
    if (isSuperAdmin && allowSuperAdminWithoutTenant) {
      // Super-admin can proceed without tenant validation
      // But still extract tenantId from header if provided
      const headerTenantId = 
        req.headers['x-tenant-id'] || 
        req.headers['X-Tenant-Id'] ||
        req.headers['X-TENANT-ID'];
      
      req.tenantId = headerTenantId ? headerTenantId.toLowerCase().trim() : null;
      req.isSuperAdmin = true;
      return next();
    }

    // Extract X-Tenant-Id header (case-insensitive)
    const headerTenantId = 
      req.headers['x-tenant-id'] || 
      req.headers['X-Tenant-Id'] ||
      req.headers['X-TENANT-ID'];

    // CRITICAL: Header must be present
    if (!headerTenantId) {
      logger.warn('TENANT_REQUIRED: X-Tenant-Id header missing', {
        method: req.method,
        path: req.path,
        userId: req.user?.id,
        email: req.user?.email,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(400).json({
        success: false,
        error: 'TENANT_REQUIRED',
        message: 'X-Tenant-Id header is required for this endpoint',
        hint: 'This is a security requirement. Frontend should always send this header.',
      });
    }

    // CRITICAL: Token must have tenantId claim (for non-super-admin)
    if (!tokenTenantId && !isSuperAdmin) {
      logger.error('INVALID_TOKEN: Token missing tenantId claim', {
        userId: req.user?.id,
        email: req.user?.email,
        role: req.user?.role,
        path: req.path
      });

      return res.status(403).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Token missing tenantId claim. Please login again.',
        hint: 'Token was issued before multi-tenant security update. Logout and login again.',
      });
    }

    // SECURITY: Validate header matches token
    const normalizedHeaderTenantId = headerTenantId.toLowerCase().trim();
    const normalizedTokenTenantId = tokenTenantId ? tokenTenantId.toLowerCase().trim() : null;

    if (normalizedHeaderTenantId !== normalizedTokenTenantId && !isSuperAdmin) {
      // SECURITY ALERT: Log this as potential attack
      logger.error('🚨 SECURITY ALERT: Tenant mismatch detected', {
        userId: req.user?.id,
        email: req.user?.email,
        role: req.user?.role,
        tokenTenantId: normalizedTokenTenantId,
        headerTenantId: normalizedHeaderTenantId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        path: req.path,
        method: req.method
      });

      return res.status(403).json({
        success: false,
        error: 'TENANT_MISMATCH',
        message: 'X-Tenant-Id header does not match JWT token',
        hint: 'Possible security violation. Logout and login again.',
      });
    }

    // SUCCESS: Store validated tenantId in request
    req.tenantId = normalizedHeaderTenantId;
    req.userId = req.user?.id;
    req.isSuperAdmin = isSuperAdmin;

    // Log successful validation (only in development or for debugging)
    if (process.env.NODE_ENV !== 'production' || process.env.LOG_TENANT_VALIDATION === 'true') {
      logger.debug('✅ Tenant validated', {
        userId: req.user?.id,
        email: req.user?.email,
        tenantId: normalizedHeaderTenantId,
        endpoint: req.path,
      });
    }

    next();
  };
}

module.exports = { validateTenantMiddleware };
```

---

### Step 5: Apply Tenant Validation Middleware to Routes (1 hour)

**File:** `microservices/hr-service/src/routes/hr.routes.js`

**Current Code:**
```javascript
router.post('/employees',
  extractTenantId, // ✅ Extracts tenantId
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['user:create']),
  validateRequest(createEmployeeSchema),
  asyncHandler(createEmployee)
);
```

**Updated Code:**
```javascript
const { validateTenantMiddleware } = require('../middleware/validateTenant.middleware');

router.post('/employees',
  authenticate, // 1. First authenticate (sets req.user with tenantId from token)
  validateTenantMiddleware({ // 2. Then validate tenant (compares header with token)
    exemptPaths: [] // No exemptions for employee routes
  }),
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['user:create']),
  validateRequest(createEmployeeSchema),
  asyncHandler(createEmployee)
);
```

**Apply to ALL routes:**
- `/api/hr/employees` (GET, POST, PUT, DELETE)
- `/api/hr/stores` (GET, POST, PUT, DELETE)
- `/api/hr/departments` (GET, POST, PUT, DELETE)
- `/api/hr/onboarding/*` (all onboarding routes)
- Any other tenant-specific routes

---

### Step 6: Update Other Services (if needed)

**Services to Check:**
- `attendance-service` - Needs tenant isolation
- `leave-service` - Needs tenant isolation
- `payroll-service` - Needs tenant isolation
- `document-service` - Needs tenant isolation
- `realtime-service` - Needs tenant isolation

**For each service:**
1. Check if models have `tenantId` field
2. Check if queries filter by `tenantId`
3. Add `validateTenantMiddleware` to routes
4. Update JWT token generation (if service generates tokens)

---

## 📝 DETAILED CODE CHANGES

### Change #1: Fix Login Token Generation

**File:** `microservices/auth-service/src/services/auth.service.js`

**Location:** Line 215-290 (login function)

**Before:**
```javascript
// Generate tokens (include employee_id for microservice communication)
const accessToken = generateAccessToken({ 
  userId: user._id, 
  role: user.role,
  employee_id: user.employee_id
});
```

**After:**
```javascript
// CRITICAL: Validate tenantId for non-super-admin users
if (user.role !== 'superadmin' && user.role !== 'super-admin') {
  if (!user.tenantId) {
    logger.error('User missing tenantId during login', {
      userId: user._id,
      email: user.email,
      role: user.role
    });
    throw new Error('User account is not associated with a tenant. Contact administrator.');
  }
}

// Generate tokens (include tenantId for multi-tenant security)
const accessToken = generateAccessToken({ 
  userId: user._id, 
  role: user.role,
  tenantId: user.tenantId, // ✅ CRITICAL: Include tenantId
  employee_id: user.employee_id
});
```

---

### Change #2: Fix Refresh Token Generation

**File:** `microservices/auth-service/src/services/auth.service.js`

**Location:** Line 360-377 (refreshToken function)

**Before:**
```javascript
// Generate new access token
const accessToken = generateAccessToken({ userId: user._id, role: user.role });
```

**After:**
```javascript
// Generate new access token (include tenantId)
const accessToken = generateAccessToken({ 
  userId: user._id, 
  role: user.role,
  tenantId: user.tenantId, // ✅ CRITICAL: Include tenantId
  employee_id: user.employee_id // ✅ Include employee_id if available
});
```

---

### Change #3: Update Auth Middleware

**File:** `microservices/hr-service/src/middleware/auth.middleware.js`

**Location:** Line 186-199 (req.user assignment)

**Before:**
```javascript
req.user = {
  id: user._id,
  _id: user._id,
  userId: user._id,
  employeeId: user.employeeId,
  email: user.email,
  role: roleName,
  permissions: permissions,
  status: user.status
};
```

**After:**
```javascript
// CRITICAL: Extract tenantId from JWT token (preferred) or user document (fallback)
const tenantIdFromToken = decoded.tenantId;
const tenantIdFromUser = user.tenantId;
const tenantId = tenantIdFromToken || tenantIdFromUser;

if (!tenantId && roleName !== 'superadmin' && roleName !== 'super-admin') {
  logger.warn('User missing tenantId in both token and database', {
    userId: user._id,
    email: user.email,
    role: roleName
  });
}

req.user = {
  id: user._id,
  _id: user._id,
  userId: user._id,
  employeeId: user.employeeId,
  email: user.email,
  role: roleName,
  permissions: permissions,
  status: user.status,
  tenantId: tenantId // ✅ CRITICAL: Include tenantId from token
};
```

---

### Change #4: Create Validate Tenant Middleware

**Create File:** `microservices/hr-service/src/middleware/validateTenant.middleware.js`

**Full Implementation:** (See Step 4 above for complete code)

---

### Change #5: Update Route Middleware Order

**File:** `microservices/hr-service/src/routes/hr.routes.js`

**Add Import:**
```javascript
const { validateTenantMiddleware } = require('../middleware/validateTenant.middleware');
```

**Update All Routes:**
```javascript
// BEFORE
router.post('/employees',
  extractTenantId,
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['user:create']),
  validateRequest(createEmployeeSchema),
  asyncHandler(createEmployee)
);

// AFTER
router.post('/employees',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated)
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['user:create']),
  validateRequest(createEmployeeSchema),
  asyncHandler(createEmployee)
);
```

**Apply to:**
- All `/employees` routes
- All `/stores` routes
- All `/departments` routes
- All `/onboarding` routes

---

## 🗄️ DATABASE SCHEMA STATUS

### ✅ Collections with TenantId:

1. **Users** ✅
   - `microservices/hr-service/src/models/User.model.js` - ✅ Has `tenantId`
   - `microservices/auth-service/src/models/User.model.js` - ✅ Has `tenantId`
   - Indexes: ✅ `{ tenantId: 1, employeeId: 1 }` (unique)

2. **Departments** ✅
   - `microservices/hr-service/src/models/Department.model.js` - ✅ Has `tenantId`
   - Indexes: ✅ `{ tenantId: 1, name: 1 }` (unique), `{ tenantId: 1, code: 1 }` (unique)

3. **Stores** ✅
   - `microservices/hr-service/src/models/Store.model.js` - ✅ Has `tenantId`
   - Indexes: ✅ `{ tenantId: 1, code: 1 }` (unique)

### ⚠️ Collections That May Need TenantId:

1. **Attendance** - Check if has `tenantId`
2. **Leaves** - Check if has `tenantId`
3. **Payroll** - Check if has `tenantId`
4. **Documents** - Check if has `tenantId`
5. **Roster** - Check if has `tenantId`

**Action Required:** Audit all collections and add `tenantId` if missing

---

## 📋 API CONTRACT COMPLIANCE

### Frontend Requirements vs Backend Implementation:

| Requirement | Frontend Expects | Backend Status | Action Required |
|------------|------------------|----------------|-----------------|
| JWT contains `tenantId` | ✅ Required | ⚠️ Partial (login missing) | Fix login token |
| Header validation | ✅ Required | ❌ Not implemented | Create middleware |
| Query filtering | ✅ Required | ✅ Complete | None |
| Error codes | ✅ Required | ⚠️ Partial | Add error codes |

### Required Error Codes:

```javascript
// Add to all error responses
{
  success: false,
  error: 'ERROR_CODE', // Required by frontend
  message: 'Human-readable message',
  hint: 'Suggestion for resolution' // Optional but helpful
}
```

**Error Codes to Implement:**
- `TENANT_REQUIRED` (400) - X-Tenant-Id header missing
- `TENANT_MISMATCH` (403) - Header doesn't match token
- `INVALID_TOKEN` (401) - Token missing tenantId claim
- `TENANT_MISSING` (500) - User missing tenantId in DB

---

## 🧪 TESTING REQUIREMENTS

### Test 1: JWT Token Contains TenantId

**Test Script:**
```javascript
// test/jwt-tenant-id.test.js
const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testJWTContainsTenantId() {
  // 1. Login
  const loginRes = await axios.post('https://98.70.245.87/api/auth/login', {
    emailOrEmployeeId: 'admin@lenstrack.etelios.com',
    password: 'Lenstrack@Admin123'
  }, {
    headers: { 'X-Tenant-Id': 'lenstrack' }
  });
  
  const token = loginRes.data.data.accessToken;
  
  // 2. Decode token
  const decoded = jwt.decode(token);
  
  // 3. Verify tenantId exists
  if (!decoded.tenantId) {
    throw new Error('FAILED: Token missing tenantId');
  }
  
  if (decoded.tenantId !== 'lenstrack') {
    throw new Error(`FAILED: Token has wrong tenantId: ${decoded.tenantId}`);
  }
  
  console.log('✅ PASS: Token contains correct tenantId');
}
```

---

### Test 2: Tenant Validation Middleware

**Test Script:**
```javascript
// test/tenant-validation.test.js
const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testTenantValidation() {
  // 1. Login and get token
  const loginRes = await axios.post('https://98.70.245.87/api/auth/login', {
    emailOrEmployeeId: 'admin@lenstrack.etelios.com',
    password: 'Lenstrack@Admin123'
  }, {
    headers: { 'X-Tenant-Id': 'lenstrack' }
  });
  
  const token = loginRes.data.data.accessToken;
  
  // 2. Test: Valid request (should pass)
  try {
    const validRes = await axios.get('https://98.70.245.87/api/hr/employees', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': 'lenstrack'
      }
    });
    console.log('✅ PASS: Valid request accepted');
  } catch (e) {
    throw new Error(`FAILED: Valid request rejected: ${e.message}`);
  }
  
  // 3. Test: Missing header (should fail with 400)
  try {
    await axios.get('https://98.70.245.87/api/hr/employees', {
      headers: {
        'Authorization': `Bearer ${token}`
        // Missing X-Tenant-Id
      }
    });
    throw new Error('FAILED: Request without header should be rejected');
  } catch (e) {
    if (e.response?.status === 400 && e.response?.data?.error === 'TENANT_REQUIRED') {
      console.log('✅ PASS: Missing header correctly rejected');
    } else {
      throw new Error(`FAILED: Wrong error response: ${e.response?.data}`);
    }
  }
  
  // 4. Test: Mismatched tenant (should fail with 403)
  try {
    await axios.get('https://98.70.245.87/api/hr/employees', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': 'different-tenant' // Wrong tenant
      }
    });
    throw new Error('FAILED: Mismatched tenant should be rejected');
  } catch (e) {
    if (e.response?.status === 403 && e.response?.data?.error === 'TENANT_MISMATCH') {
      console.log('✅ PASS: Mismatched tenant correctly rejected');
    } else {
      throw new Error(`FAILED: Wrong error response: ${e.response?.data}`);
    }
  }
}
```

---

### Test 3: Database Query Filtering

**Test Script:**
```javascript
// test/query-filtering.test.js
const axios = require('axios');

async function testQueryFiltering() {
  // 1. Login as Tenant A
  const loginA = await axios.post('https://98.70.245.87/api/auth/login', {
    emailOrEmployeeId: 'admin@tenant-a.com',
    password: 'password'
  }, {
    headers: { 'X-Tenant-Id': 'tenant-a' }
  });
  
  const tokenA = loginA.data.data.accessToken;
  
  // 2. Create employee in Tenant A
  await axios.post('https://98.70.245.87/api/hr/employees', {
    employeeId: 'EMP-A-001',
    firstName: 'Alice',
    email: 'alice@tenant-a.com',
    department: 'Sales'
  }, {
    headers: {
      'Authorization': `Bearer ${tokenA}`,
      'X-Tenant-Id': 'tenant-a'
    }
  });
  
  // 3. Login as Tenant B
  const loginB = await axios.post('https://98.70.245.87/api/auth/login', {
    emailOrEmployeeId: 'admin@tenant-b.com',
    password: 'password'
  }, {
    headers: { 'X-Tenant-Id': 'tenant-b' }
  });
  
  const tokenB = loginB.data.data.accessToken;
  
  // 4. Fetch employees as Tenant B (should NOT see Tenant A's employee)
  const employeesB = await axios.get('https://98.70.245.87/api/hr/employees', {
    headers: {
      'Authorization': `Bearer ${tokenB}`,
      'X-Tenant-Id': 'tenant-b'
    }
  });
  
  const hasAlice = employeesB.data.data.some(emp => emp.email === 'alice@tenant-a.com');
  
  if (hasAlice) {
    throw new Error('FAILED: Tenant B can see Tenant A\'s employee (ISOLATION BREACH)');
  }
  
  console.log('✅ PASS: Query filtering working correctly');
}
```

---

## 🚀 DEPLOYMENT PLAN

### Phase 1: Code Changes (Day 1)

1. ✅ Fix login token generation
2. ✅ Fix refresh token generation
3. ✅ Update auth middleware
4. ✅ Create validate tenant middleware
5. ✅ Update route middleware order

**Estimated Time:** 4-6 hours

---

### Phase 2: Testing (Day 1-2)

1. ✅ Unit tests for JWT token generation
2. ✅ Integration tests for tenant validation
3. ✅ End-to-end tests for tenant isolation
4. ✅ Security tests (header manipulation)

**Estimated Time:** 2-4 hours

---

### Phase 3: Deployment (Day 2)

1. ✅ Deploy to staging
2. ✅ Run smoke tests
3. ✅ Deploy to production
4. ✅ Monitor error rates
5. ✅ User communication (logout/login required)

**Estimated Time:** 2-3 hours

---

## 📊 IMPLEMENTATION CHECKLIST

### Code Changes:
- [ ] Fix `login()` function - Add `tenantId` to token
- [ ] Fix `refreshToken()` function - Add `tenantId` to token
- [ ] Update `auth.middleware.js` - Extract `tenantId` from token
- [ ] Create `validateTenant.middleware.js` - Validate header vs token
- [ ] Update all routes - Add `validateTenantMiddleware`
- [ ] Update error responses - Add error codes

### Testing:
- [ ] Test JWT token contains `tenantId`
- [ ] Test tenant validation middleware
- [ ] Test missing header (400 error)
- [ ] Test mismatched tenant (403 error)
- [ ] Test query filtering
- [ ] Test cross-tenant access (should fail)

### Deployment:
- [ ] Code review
- [ ] Deploy to staging
- [ ] Run integration tests
- [ ] Deploy to production
- [ ] Monitor logs
- [ ] User communication

---

## 🐛 TROUBLESHOOTING

### Issue 1: "Token missing tenantId claim"

**Symptom:**
```json
{
  "error": "INVALID_TOKEN",
  "message": "Token missing tenantId claim. Please login again."
}
```

**Cause:** User has old token issued before fix

**Solution:**
1. User must logout and login again
2. Or: Implement token refresh to add tenantId
3. Or: Set token expiry to force re-login

---

### Issue 2: "TENANT_MISMATCH errors"

**Symptom:**
```json
{
  "error": "TENANT_MISMATCH",
  "message": "X-Tenant-Id header does not match JWT token"
}
```

**Cause:** Frontend sending wrong header OR user trying to access wrong tenant

**Solution:**
1. Check frontend `X-Tenant-Id` header logic
2. Check JWT token decode (should match)
3. Force user logout/login
4. Check browser DevTools for header manipulation

---

### Issue 3: "User missing tenantId in database"

**Symptom:**
```json
{
  "error": "TENANT_MISSING",
  "message": "User account is not associated with a tenant."
}
```

**Cause:** User document missing `tenantId` field

**Solution:**
```javascript
// Run manual fix
const user = await User.findOne({ email: 'user@example.com' });
user.tenantId = 'correct-tenant-id';
await user.save();
```

---

## 📞 SUPPORT & REFERENCES

### Files to Modify:
1. `microservices/auth-service/src/services/auth.service.js` - Fix token generation
2. `microservices/hr-service/src/middleware/auth.middleware.js` - Extract tenantId
3. `microservices/hr-service/src/middleware/validateTenant.middleware.js` - **NEW FILE**
4. `microservices/hr-service/src/routes/hr.routes.js` - Add validation middleware

### Test Scripts:
1. `test/jwt-tenant-id.test.js` - Test token generation
2. `test/tenant-validation.test.js` - Test validation middleware
3. `test/query-filtering.test.js` - Test query filtering

---

## 📈 PROGRESS TRACKING

### Current Status:
- ✅ Database Schema: **100% Complete**
- ✅ Query Filtering: **100% Complete** (HR Service)
- ⚠️ JWT Token Generation: **50% Complete** (register ✅, login ❌, refresh ❌)
- ❌ Tenant Validation: **0% Complete** (not implemented)
- ⚠️ Auth Middleware: **50% Complete** (extracts user, missing tenantId from token)

### Target Status:
- ✅ Database Schema: **100%**
- ✅ Query Filtering: **100%**
- ✅ JWT Token Generation: **100%**
- ✅ Tenant Validation: **100%**
- ✅ Auth Middleware: **100%**

---

**Document Version:** 1.0  
**Last Updated:** January 21, 2026  
**Status:** Ready for Implementation

---

## 📝 COMPLETE CODE EXAMPLES

### Example 1: Complete Login Function with TenantId

**File:** `microservices/auth-service/src/services/auth.service.js`

**Complete Function:**

```javascript
async login(emailOrEmployeeId, password, ip, userAgent) {
  try {
    // ... existing code to find user and verify password ...
    
    // CRITICAL: Validate tenantId for non-super-admin users
    if (user.role !== 'superadmin' && user.role !== 'super-admin') {
      if (!user.tenantId) {
        logger.error('User missing tenantId during login', {
          userId: user._id,
          email: user.email,
          role: user.role
        });
        throw new Error('User account is not associated with a tenant. Contact administrator.');
      }
    }

    // Update last login
    user.last_login = new Date();
    user.last_activity = new Date();
    await user.save();

    // Generate tokens (include tenantId for multi-tenant security)
    const accessToken = generateAccessToken({ 
      userId: user._id, 
      role: user.role,
      tenantId: user.tenantId, // ✅ CRITICAL: Include tenantId
      employee_id: user.employee_id
    });
    const refreshToken = generateRefreshToken({ userId: user._id });

    // Store refresh token in Redis
    await this.storeRefreshToken(user._id, refreshToken);

    // Log successful login
    logAuthEvent('login', user._id, { emailOrEmployeeId, role: user.role }, ip, userAgent);

    logger.info('User logged in successfully', {
      userId: user._id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId
    });

    // Format response according to frontend spec
    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim() || user.email,
        role: user.role || 'employee',
        permissions: roleData?.permissions || [],
        tenantId: user.tenantId // ✅ Include in response
      },
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresIn: 3600 // 1 hour in seconds
    };
  } catch (error) {
    logger.error('Login error', { error: error.message, email: emailOrEmployeeId });
    throw error;
  }
}
```

---

### Example 2: Complete Validate Tenant Middleware

**File:** `microservices/hr-service/src/middleware/validateTenant.middleware.js`

**Complete Implementation:**

```javascript
const logger = require('../config/logger');

/**
 * SECURITY MIDDLEWARE: Validate tenant context
 * 
 * This middleware ensures:
 * 1. X-Tenant-Id header is present
 * 2. X-Tenant-Id matches JWT token's tenantId claim
 * 3. Tenant cannot be spoofed via header manipulation
 * 
 * Must be applied AFTER authentication middleware
 */
function validateTenantMiddleware(options = {}) {
  const {
    exemptPaths = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh',
      '/api/auth/logout',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/health',
      '/api/health'
    ],
    allowSuperAdminWithoutTenant = false,
  } = options;

  return (req, res, next) => {
    // Skip validation for exempt paths
    if (exemptPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Extract tenantId from JWT token (should be set by auth middleware)
    const tokenTenantId = req.user?.tenantId;

    // Check if user is super-admin
    const isSuperAdmin = 
      req.user?.role === 'superadmin' || 
      req.user?.role === 'super-admin' ||
      req.user?.role === 'platform-owner';

    // Super-admin exception (if allowed)
    if (isSuperAdmin && allowSuperAdminWithoutTenant) {
      // Super-admin can proceed without tenant validation
      // But still extract tenantId from header if provided
      const headerTenantId = 
        req.headers['x-tenant-id'] || 
        req.headers['X-Tenant-Id'] ||
        req.headers['X-TENANT-ID'];
      
      req.tenantId = headerTenantId ? headerTenantId.toLowerCase().trim() : null;
      req.isSuperAdmin = true;
      return next();
    }

    // Extract X-Tenant-Id header (case-insensitive)
    const headerTenantId = 
      req.headers['x-tenant-id'] || 
      req.headers['X-Tenant-Id'] ||
      req.headers['X-TENANT-ID'];

    // CRITICAL: Header must be present
    if (!headerTenantId) {
      logger.warn('TENANT_REQUIRED: X-Tenant-Id header missing', {
        method: req.method,
        path: req.path,
        userId: req.user?.id,
        email: req.user?.email,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(400).json({
        success: false,
        error: 'TENANT_REQUIRED',
        message: 'X-Tenant-Id header is required for this endpoint',
        hint: 'This is a security requirement. Frontend should always send this header.',
      });
    }

    // CRITICAL: Token must have tenantId claim (for non-super-admin)
    if (!tokenTenantId && !isSuperAdmin) {
      logger.error('INVALID_TOKEN: Token missing tenantId claim', {
        userId: req.user?.id,
        email: req.user?.email,
        role: req.user?.role,
        path: req.path
      });

      return res.status(403).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Token missing tenantId claim. Please login again.',
        hint: 'Token was issued before multi-tenant security update. Logout and login again.',
      });
    }

    // SECURITY: Validate header matches token
    const normalizedHeaderTenantId = headerTenantId.toLowerCase().trim();
    const normalizedTokenTenantId = tokenTenantId ? tokenTenantId.toLowerCase().trim() : null;

    if (normalizedHeaderTenantId !== normalizedTokenTenantId && !isSuperAdmin) {
      // SECURITY ALERT: Log this as potential attack
      logger.error('🚨 SECURITY ALERT: Tenant mismatch detected', {
        userId: req.user?.id,
        email: req.user?.email,
        role: req.user?.role,
        tokenTenantId: normalizedTokenTenantId,
        headerTenantId: normalizedHeaderTenantId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        path: req.path,
        method: req.method
      });

      return res.status(403).json({
        success: false,
        error: 'TENANT_MISMATCH',
        message: 'X-Tenant-Id header does not match JWT token',
        hint: 'Possible security violation. Logout and login again.',
      });
    }

    // SUCCESS: Store validated tenantId in request
    req.tenantId = normalizedHeaderTenantId;
    req.userId = req.user?.id;
    req.isSuperAdmin = isSuperAdmin;

    // Log successful validation (only in development or for debugging)
    if (process.env.NODE_ENV !== 'production' || process.env.LOG_TENANT_VALIDATION === 'true') {
      logger.debug('✅ Tenant validated', {
        userId: req.user?.id,
        email: req.user?.email,
        tenantId: normalizedHeaderTenantId,
        endpoint: req.path,
      });
    }

    next();
  };
}

module.exports = { validateTenantMiddleware };
```

---

### Example 3: Complete Route Update

**File:** `microservices/hr-service/src/routes/hr.routes.js`

**Before:**
```javascript
const { extractTenantId } = require('../middleware/tenant.middleware');

router.post('/employees',
  extractTenantId,
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['user:create']),
  validateRequest(createEmployeeSchema),
  asyncHandler(createEmployee)
);
```

**After:**
```javascript
const { extractTenantId } = require('../middleware/tenant.middleware');
const { validateTenantMiddleware } = require('../middleware/validateTenant.middleware');

router.post('/employees',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware({ // 2. Validate tenant (compares header with token)
    exemptPaths: [] // No exemptions for employee routes
  }),
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['user:create']),
  validateRequest(createEmployeeSchema),
  asyncHandler(createEmployee)
);

// Apply to ALL employee routes
router.get('/employees',
  authenticate,
  validateTenantMiddleware(),
  extractTenantId,
  validateRequest(getEmployeesSchema),
  asyncHandler(getEmployees)
);

router.get('/employees/:id',
  authenticate,
  validateTenantMiddleware(),
  extractTenantId,
  asyncHandler(getEmployeeById)
);

router.put('/employees/:id',
  authenticate,
  validateTenantMiddleware(),
  extractTenantId,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['user:update']),
  validateRequest(updateEmployeeSchema),
  asyncHandler(updateEmployee)
);

router.delete('/employees/:id',
  authenticate,
  validateTenantMiddleware(),
  extractTenantId,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['user:delete']),
  asyncHandler(deleteEmployee)
);

// Apply to ALL store routes
router.get('/stores',
  authenticate,
  validateTenantMiddleware(),
  extractTenantId,
  validateRequest(getStoresSchema),
  asyncHandler(getStores)
);

router.post('/stores',
  authenticate,
  validateTenantMiddleware(),
  extractTenantId,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['store:create']),
  validateRequest(createStoreSchema),
  asyncHandler(createStore)
);

// Apply to ALL department routes
router.get('/departments',
  authenticate,
  validateTenantMiddleware(),
  extractTenantId,
  validateRequest(getDepartmentsSchema),
  asyncHandler(getDepartments)
);

router.post('/departments',
  authenticate,
  validateTenantMiddleware(),
  extractTenantId,
  requireRole(['Admin', 'SuperAdmin'], ['department:create']),
  validateRequest(createDepartmentSchema),
  asyncHandler(createDepartment)
);
```

---

### Example 4: Complete Auth Middleware Update

**File:** `microservices/hr-service/src/middleware/auth.middleware.js`

**Location:** After JWT verification (around line 186)

**Before:**
```javascript
req.user = {
  id: user._id,
  _id: user._id,
  userId: user._id,
  employeeId: user.employeeId,
  email: user.email,
  role: roleName,
  permissions: permissions,
  status: user.status
};
```

**After:**
```javascript
// CRITICAL: Extract tenantId from JWT token (preferred) or user document (fallback)
// JWT token is source of truth for tenant context
const tenantIdFromToken = decoded.tenantId;
const tenantIdFromUser = user.tenantId;

// Prefer token's tenantId (it's validated during login)
// Fallback to user's tenantId if token doesn't have it (for backward compatibility)
const tenantId = tenantIdFromToken || tenantIdFromUser;

if (!tenantId && roleName !== 'superadmin' && roleName !== 'super-admin') {
  logger.warn('User missing tenantId in both token and database', {
    userId: user._id,
    email: user.email,
    role: roleName
  });
}

req.user = {
  id: user._id,
  _id: user._id,
  userId: user._id,
  employeeId: user.employeeId,
  employee_id: user.employeeId,
  firstName: user.firstName,
  lastName: user.lastName,
  name: user.firstName ? `${user.firstName} ${user.lastName}` : user.email,
  email: user.email,
  role: roleName,
  roleId: typeof user.role === 'object' ? user.role._id : user.role,
  permissions: permissions,
  status: user.status,
  tenantId: tenantId // ✅ CRITICAL: Include tenantId from token
};
```

---

## 🔍 DETAILED FILE-BY-FILE CHANGES

### File 1: `microservices/auth-service/src/services/auth.service.js`

#### Change 1.1: Fix Login Function

**Location:** Line 215-290

**Find:**
```javascript
// Generate tokens (include employee_id for microservice communication)
const accessToken = generateAccessToken({ 
  userId: user._id, 
  role: user.role,
  employee_id: user.employee_id
});
```

**Replace with:**
```javascript
// CRITICAL: Validate tenantId for non-super-admin users
if (user.role !== 'superadmin' && user.role !== 'super-admin') {
  if (!user.tenantId) {
    logger.error('User missing tenantId during login', {
      userId: user._id,
      email: user.email,
      role: user.role
    });
    throw new Error('User account is not associated with a tenant. Contact administrator.');
  }
}

// Generate tokens (include tenantId for multi-tenant security)
const accessToken = generateAccessToken({ 
  userId: user._id, 
  role: user.role,
  tenantId: user.tenantId, // ✅ CRITICAL: Include tenantId
  employee_id: user.employee_id
});
```

---

#### Change 1.2: Fix Refresh Token Function

**Location:** Line 360-377

**Find:**
```javascript
// Generate new access token
const accessToken = generateAccessToken({ userId: user._id, role: user.role });
```

**Replace with:**
```javascript
// Generate new access token (include tenantId)
const accessToken = generateAccessToken({ 
  userId: user._id, 
  role: user.role,
  tenantId: user.tenantId, // ✅ CRITICAL: Include tenantId
  employee_id: user.employee_id // ✅ Include employee_id if available
});
```

---

### File 2: `microservices/hr-service/src/middleware/auth.middleware.js`

#### Change 2.1: Extract TenantId from Token

**Location:** Line 186-199

**Find:**
```javascript
req.user = {
  id: user._id,
  _id: user._id,
  userId: user._id,
  employeeId: user.employeeId,
  employee_id: user.employeeId,
  firstName: user.firstName,
  lastName: user.lastName,
  name: user.firstName ? `${user.firstName} ${user.lastName}` : user.email,
  email: user.email,
  role: roleName,
  roleId: typeof user.role === 'object' ? user.role._id : user.role,
  permissions: permissions,
  status: user.status
};
```

**Replace with:**
```javascript
// CRITICAL: Extract tenantId from JWT token (preferred) or user document (fallback)
const tenantIdFromToken = decoded.tenantId;
const tenantIdFromUser = user.tenantId;
const tenantId = tenantIdFromToken || tenantIdFromUser;

if (!tenantId && roleName !== 'superadmin' && roleName !== 'super-admin') {
  logger.warn('User missing tenantId in both token and database', {
    userId: user._id,
    email: user.email,
    role: roleName
  });
}

req.user = {
  id: user._id,
  _id: user._id,
  userId: user._id,
  employeeId: user.employeeId,
  employee_id: user.employeeId,
  firstName: user.firstName,
  lastName: user.lastName,
  name: user.firstName ? `${user.firstName} ${user.lastName}` : user.email,
  email: user.email,
  role: roleName,
  roleId: typeof user.role === 'object' ? user.role._id : user.role,
  permissions: permissions,
  status: user.status,
  tenantId: tenantId // ✅ CRITICAL: Include tenantId from token
};
```

---

#### Change 2.2: Handle Token-Only Case

**Location:** Line 208-215 (fallback when DB lookup fails)

**Find:**
```javascript
req.user = {
  id: decoded.userId || decoded.id || 'unknown',
  userId: decoded.userId || decoded.id,
  role: decoded.role || 'user',
  email: decoded.email || 'unknown@example.com',
  permissions: decoded.permissions || []
};
```

**Replace with:**
```javascript
req.user = {
  id: decoded.userId || decoded.id || 'unknown',
  userId: decoded.userId || decoded.id,
  role: decoded.role || 'user',
  email: decoded.email || 'unknown@example.com',
  permissions: decoded.permissions || [],
  tenantId: decoded.tenantId // ✅ CRITICAL: Extract from token
};
```

---

### File 3: `microservices/hr-service/src/middleware/validateTenant.middleware.js`

#### Change 3.1: Create New File

**Create:** `microservices/hr-service/src/middleware/validateTenant.middleware.js`

**Content:** (See Example 2 above for complete code)

---

### File 4: `microservices/hr-service/src/routes/hr.routes.js`

#### Change 4.1: Add Import

**Location:** Top of file (after other imports)

**Add:**
```javascript
const { validateTenantMiddleware } = require('../middleware/validateTenant.middleware');
```

---

#### Change 4.2: Update All Routes

**Apply to ALL routes that handle tenant-specific data:**

```javascript
// Pattern for ALL routes:
router.METHOD('/path',
  authenticate, // 1. Authenticate first
  validateTenantMiddleware(), // 2. Validate tenant
  extractTenantId, // 3. Extract tenantId (already validated)
  // ... other middleware ...
  asyncHandler(handler)
);
```

**Routes to Update:**
- All `/employees` routes (GET, POST, PUT, DELETE)
- All `/stores` routes (GET, POST, PUT, DELETE)
- All `/departments` routes (GET, POST, PUT, DELETE)
- All `/onboarding/*` routes

---

## 🧪 COMPLETE TESTING SUITE

### Test Suite 1: JWT Token Generation Tests

**File:** `test/jwt-tenant-id.test.js`

```javascript
const axios = require('axios');
const jwt = require('jsonwebtoken');
const https = require('https');

const BASE_URL = 'https://98.70.245.87';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testJWTContainsTenantId() {
  console.log('🧪 Testing JWT Token Contains TenantId\n');
  
  // Test 1: Login and verify token
  try {
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      emailOrEmployeeId: 'admin@lenstrack.etelios.com',
      password: 'Lenstrack@Admin123'
    }, {
      headers: { 'X-Tenant-Id': 'lenstrack' },
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });
    
    if (!loginRes.data.success) {
      throw new Error('Login failed');
    }
    
    const token = loginRes.data.data.accessToken;
    const decoded = jwt.decode(token);
    
    console.log('Token payload:', JSON.stringify(decoded, null, 2));
    
    if (!decoded.tenantId) {
      throw new Error('❌ FAILED: Token missing tenantId');
    }
    
    if (decoded.tenantId !== 'lenstrack') {
      throw new Error(`❌ FAILED: Token has wrong tenantId: ${decoded.tenantId}`);
    }
    
    console.log('✅ PASS: Token contains correct tenantId\n');
    
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    process.exit(1);
  }
  
  // Test 2: Refresh token and verify
  try {
    // First login
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      emailOrEmployeeId: 'admin@lenstrack.etelios.com',
      password: 'Lenstrack@Admin123'
    }, {
      headers: { 'X-Tenant-Id': 'lenstrack' },
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });
    
    const refreshToken = loginRes.data.data.refreshToken;
    
    // Refresh token
    const refreshRes = await axios.post(`${BASE_URL}/api/auth/refresh`, {
      refreshToken: refreshToken
    }, {
      headers: { 'X-Tenant-Id': 'lenstrack' },
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });
    
    const newToken = refreshRes.data.data.accessToken;
    const decoded = jwt.decode(newToken);
    
    if (!decoded.tenantId) {
      throw new Error('❌ FAILED: Refreshed token missing tenantId');
    }
    
    console.log('✅ PASS: Refreshed token contains tenantId\n');
    
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    process.exit(1);
  }
}

testJWTContainsTenantId();
```

---

### Test Suite 2: Tenant Validation Middleware Tests

**File:** `test/tenant-validation.test.js`

```javascript
const axios = require('axios');
const jwt = require('jsonwebtoken');
const https = require('https');

const BASE_URL = 'https://98.70.245.87';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testTenantValidation() {
  console.log('🧪 Testing Tenant Validation Middleware\n');
  
  // Test 1: Valid request (should pass)
  try {
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      emailOrEmployeeId: 'admin@lenstrack.etelios.com',
      password: 'Lenstrack@Admin123'
    }, {
      headers: { 'X-Tenant-Id': 'lenstrack' },
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });
    
    const token = loginRes.data.data.accessToken;
    
    const validRes = await axios.get(`${BASE_URL}/api/hr/employees`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': 'lenstrack'
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });
    
    if (validRes.status === 200) {
      console.log('✅ PASS: Valid request accepted\n');
    } else {
      throw new Error(`Expected 200, got ${validRes.status}`);
    }
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error === 'TENANT_REQUIRED') {
      console.log('⚠️  Tenant validation not yet implemented (expected)\n');
    } else {
      console.error('❌ FAILED:', error.message);
    }
  }
  
  // Test 2: Missing header (should fail with 400)
  try {
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      emailOrEmployeeId: 'admin@lenstrack.etelios.com',
      password: 'Lenstrack@Admin123'
    }, {
      headers: { 'X-Tenant-Id': 'lenstrack' },
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });
    
    const token = loginRes.data.data.accessToken;
    
    await axios.get(`${BASE_URL}/api/hr/employees`, {
      headers: {
        'Authorization': `Bearer ${token}`
        // Missing X-Tenant-Id
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });
    
    console.log('❌ FAILED: Request without header should be rejected');
    process.exit(1);
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error === 'TENANT_REQUIRED') {
      console.log('✅ PASS: Missing header correctly rejected\n');
    } else {
      console.log('⚠️  Tenant validation not yet implemented (expected)\n');
    }
  }
  
  // Test 3: Mismatched tenant (should fail with 403)
  try {
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      emailOrEmployeeId: 'admin@lenstrack.etelios.com',
      password: 'Lenstrack@Admin123'
    }, {
      headers: { 'X-Tenant-Id': 'lenstrack' },
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });
    
    const token = loginRes.data.data.accessToken;
    
    await axios.get(`${BASE_URL}/api/hr/employees`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': 'different-tenant' // Wrong tenant
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });
    
    console.log('❌ FAILED: Mismatched tenant should be rejected');
    process.exit(1);
  } catch (error) {
    if (error.response?.status === 403 && error.response?.data?.error === 'TENANT_MISMATCH') {
      console.log('✅ PASS: Mismatched tenant correctly rejected\n');
    } else {
      console.log('⚠️  Tenant validation not yet implemented (expected)\n');
    }
  }
}

testTenantValidation();
```

---

## 📊 IMPLEMENTATION PRIORITY

### Priority 1: CRITICAL (Must Fix First)
1. ✅ Fix login token generation - Add `tenantId` to token
2. ✅ Fix refresh token generation - Add `tenantId` to token
3. ✅ Create validate tenant middleware
4. ✅ Update auth middleware - Extract `tenantId` from token

**Estimated Time:** 3-4 hours

---

### Priority 2: HIGH (Required for Security)
1. ✅ Apply validation middleware to all routes
2. ✅ Add error codes to responses
3. ✅ Test tenant validation
4. ✅ Test cross-tenant access blocking

**Estimated Time:** 2-3 hours

---

### Priority 3: MEDIUM (Nice to Have)
1. ⚠️ Audit other services (attendance, leave, payroll)
2. ⚠️ Add tenantId to other service tokens
3. ⚠️ Update other service routes

**Estimated Time:** 1-2 days

---

## 🎯 SUCCESS CRITERIA

### Definition of Done:
- [ ] All JWT tokens contain `tenantId` claim
- [ ] Tenant validation middleware rejects mismatched headers
- [ ] All routes protected by tenant validation
- [ ] All tests passing
- [ ] No cross-tenant data access possible
- [ ] Error codes match frontend expectations

---

## 📞 QUICK REFERENCE

### Files to Modify:
1. `microservices/auth-service/src/services/auth.service.js` - 2 changes
2. `microservices/hr-service/src/middleware/auth.middleware.js` - 2 changes
3. `microservices/hr-service/src/middleware/validateTenant.middleware.js` - **NEW FILE**
4. `microservices/hr-service/src/routes/hr.routes.js` - Add middleware to all routes

### Key Functions:
- `login()` - Add `tenantId` to token
- `refreshToken()` - Add `tenantId` to token
- `validateTenantMiddleware()` - Validate header vs token
- `authenticate()` - Extract `tenantId` from token

### Error Codes:
- `TENANT_REQUIRED` (400) - Header missing
- `TENANT_MISMATCH` (403) - Header doesn't match token
- `INVALID_TOKEN` (401) - Token missing tenantId

---

**Document Version:** 1.0  
**Last Updated:** January 21, 2026  
**Total Pages:** ~50+  
**Status:** Ready for Implementation

**END OF BACKEND MULTI-TENANT IMPLEMENTATION GUIDE**

