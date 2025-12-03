# Backend Authentication Error Documentation
## Complete Guide for Backend Engineers

**Document Version:** 1.0  
**Last Updated:** 2025-01-20  
**System:** Etelios HRMS & ERP - Microservices Architecture

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Authentication Endpoints](#authentication-endpoints)
4. [CORS Issues & Fixes](#cors-issues--fixes)
5. [Error Handling & Status Codes](#error-handling--status-codes)
6. [Known Issues & Root Causes](#known-issues--root-causes)
7. [Troubleshooting Guide](#troubleshooting-guide)
8. [API Reference](#api-reference)
9. [Deployment & Configuration](#deployment--configuration)

---

## Executive Summary

### Current Status: ⚠️ CRITICAL ISSUES PERSIST

**Primary Problem:** CORS (Cross-Origin Resource Sharing) errors are blocking frontend authentication requests, preventing users from logging in.

**Error Pattern:**
```
Access to fetch at 'https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login' 
from origin 'https://etelios-shell-appservice-ewgde3dpewhubzhs.centralindia-01.azurewebsites.net' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Impact:**
- ❌ Users cannot log in through frontend
- ❌ All authenticated API calls fail
- ❌ Frontend shows "Backend service is currently unavailable" error
- ❌ System is effectively non-functional for end users

**Fixes Applied:**
- ✅ CORS configuration updated
- ✅ OPTIONS handler added
- ✅ Proxy CORS headers enhanced
- ⏳ **Awaiting deployment verification**

---

## System Architecture

### Overview

The system uses a **microservices architecture** with an API Gateway pattern:

```
Frontend (Shell App Service)
    ↓
API Gateway (Main App Service) - Port 3000
    ↓
Auth Service (Microservice) - Port 3001
    ↓
MongoDB Database
```

### Component Details

#### 1. API Gateway (`src/server.js`)
- **Port:** 3000
- **URL:** `https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net`
- **Role:** Routes requests to microservices, handles CORS, service discovery
- **Technology:** Express.js with `http-proxy-middleware`

#### 2. Auth Service (`microservices/auth-service/`)
- **Port:** 3001
- **URL:** `https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net`
- **Role:** Authentication, user management, JWT token generation
- **Technology:** Express.js, MongoDB, JWT

#### 3. Frontend
- **URL:** `https://etelios-shell-appservice-ewgde3dpewhubzhs.centralindia-01.azurewebsites.net`
- **Technology:** Next.js/React (assumed)

### Request Flow

```
1. Frontend → POST /api/auth/login
2. API Gateway receives request
3. API Gateway checks CORS (OPTIONS preflight)
4. API Gateway proxies to Auth Service
5. Auth Service validates credentials
6. Auth Service returns JWT tokens
7. API Gateway forwards response with CORS headers
8. Frontend receives tokens
```

---

## Authentication Endpoints

### Base URLs

- **API Gateway:** `https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net`
- **Auth Service (Direct):** `https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net`

### Endpoint Reference

#### 1. User Login

**Endpoint:** `POST /api/auth/login`

**Through API Gateway:**
```
POST https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login
```

**Direct to Auth Service:**
```
POST https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net/api/auth/login
```

**Request Headers:**
```http
Content-Type: application/json
Origin: https://etelios-shell-appservice-ewgde3dpewhubzhs.centralindia-01.azurewebsites.net
```

**Request Body:**
```json
{
  "emailOrEmployeeId": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "user_id",
      "employee_id": "EMP001",
      "name": "User Name",
      "email": "user@example.com",
      "role": "hr",
      "department": "HR",
      "stores": [],
      "reporting_manager": null
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**

| Status | Error Type | Response Body |
|--------|-----------|---------------|
| 400 | Validation Error | `{"success": false, "message": "Email/Employee ID and password are required", "service": "auth-service"}` |
| 400 | Invalid Credentials | `{"success": false, "message": "Invalid email or password", "service": "auth-service"}` |
| 400 | Account Inactive | `{"success": false, "message": "Account is inactive", "service": "auth-service"}` |
| 401 | Token Required | `{"success": false, "message": "Access token required"}` |
| 500 | Server Error | `{"success": false, "message": "Internal server error", "service": "auth-service"}` |
| 503 | Service Unavailable | `{"success": false, "message": "Service temporarily unavailable. Please try again later.", "error": "Database connection error", "service": "auth-service"}` |

**Implementation Details:**
- **File:** `microservices/auth-service/src/controllers/authController.js`
- **Service:** `microservices/auth-service/src/services/auth.service.js`
- **Validation:** Joi schema in `microservices/auth-service/src/routes/auth.routes.js`
- **Database Query Timeout:** 5 seconds (`maxTimeMS: 5000`)
- **Password Field:** Must use `.select('+password')` to retrieve from database

---

#### 2. Mock Login (Fast - No Database)

**Endpoint:** `POST /api/auth/mock-login-fast`

**Purpose:** Returns tokens instantly without database operations. Use for testing when database is slow.

**Request:**
```http
POST /api/auth/mock-login-fast
Content-Type: application/json

{
  "role": "hr"  // Optional: "admin", "hr", "manager", "employee", "superadmin"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Mock login successful (fast mode - no database)",
  "data": {
    "user": {
      "_id": "mock_hr_MOCKHR001",
      "employee_id": "MOCKHR001",
      "name": "Mock HR User",
      "email": "mock.hr@etelios.com",
      "role": "hr",
      "department": "HR",
      "designation": "HR Manager"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "mock": true,
  "fastMode": true,
  "note": "This is a fast mode that skips database operations. For production, use pre-created users."
}
```

**Implementation:**
- **File:** `microservices/auth-service/src/controllers/authController.fast.js`
- **No Database Calls:** Returns hardcoded user data
- **Token Generation:** Uses same JWT service as regular login
- **Use Case:** Testing, development, fallback when database is slow

---

#### 3. Mock Login (Regular - With Database)

**Endpoint:** `POST /api/auth/mock-login`

**Purpose:** Creates/updates user in database and returns tokens. May timeout if database is slow.

**Request:**
```http
POST /api/auth/mock-login
Content-Type: application/json

{
  "role": "hr",  // Optional
  "email": "test@example.com",  // Optional
  "employeeId": "EMP001",  // Optional
  "name": "Test User"  // Optional
}
```

**Response:** Same as regular login

**Warning:** ⚠️ This endpoint may timeout (408) if database operations take >10 seconds.

---

#### 4. Refresh Token

**Endpoint:** `POST /api/auth/refresh-token`

**Request:**
```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

#### 5. Get User Profile

**Endpoint:** `GET /api/auth/profile`

**Authentication:** Required (Bearer token)

**Request:**
```http
GET /api/auth/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "_id": "user_id",
    "employee_id": "EMP001",
    "name": "User Name",
    "email": "user@example.com",
    "role": "hr",
    "department": "HR",
    "stores": [],
    "reporting_manager": null
  }
}
```

---

#### 6. Register User

**Endpoint:** `POST /api/auth/register`

**Authentication:** Required (Admin/HR only)

**Request:**
```http
POST /api/auth/register
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "employee_id": "EMP001",
  "name": "New User",
  "email": "newuser@example.com",
  "phone": "+1234567890",
  "password": "password123",
  "role": "employee",
  "department": "Sales",
  "designation": "Sales Executive",
  "joining_date": "2024-01-01"
}
```

---

#### 7. Logout

**Endpoint:** `POST /api/auth/logout`

**Authentication:** Required

**Request:**
```http
POST /api/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

#### 8. Change Password

**Endpoint:** `POST /api/auth/change-password`

**Authentication:** Required

**Request:**
```http
POST /api/auth/change-password
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

---

#### 9. Request Password Reset

**Endpoint:** `POST /api/auth/request-password-reset`

**Request:**
```http
POST /api/auth/request-password-reset
Content-Type: application/json

{
  "email": "user@example.com"
}
```

---

#### 10. Reset Password

**Endpoint:** `POST /api/auth/reset-password`

**Request:**
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "resetToken": "reset_token_here",
  "newPassword": "newpassword123"
}
```

---

## CORS Issues & Fixes

### Problem Statement

**Error Message:**
```
Access to fetch at 'https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login' 
from origin 'https://etelios-shell-appservice-ewgde3dpewhubzhs.centralindia-01.azurewebsites.net' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Error Code:** `net::ERR_FAILED`

**Browser Behavior:**
1. Browser sends OPTIONS preflight request
2. Server doesn't respond with proper CORS headers
3. Browser blocks the actual request
4. Frontend receives "Failed to fetch" error

### Root Causes Identified

#### 1. CORS Configuration Bug
**Location:** `src/server.js` (API Gateway)

**Problem:**
- `'*'` wildcard was included in an array: `['origin1', 'origin2', '*']`
- CORS middleware doesn't recognize `'*'` when it's in an array
- Should be either `'*'` (string) or array of specific origins

**Fix Applied:**
```javascript
// Before (WRONG):
allowedOrigins = ['origin1', 'origin2', '*'];  // ❌ Doesn't work

// After (CORRECT):
if (corsOriginEnv === '*') {
  allowedOrigins = '*';  // ✅ String value
} else {
  allowedOrigins = ['origin1', 'origin2'];  // ✅ Array of specific origins
}
```

#### 2. Missing Frontend Origin
**Problem:**
- Frontend URL `https://etelios-shell-appservice-ewgde3dpewhubzhs.centralindia-01.azurewebsites.net` wasn't in allowed origins list

**Fix Applied:**
```javascript
allowedOrigins = [
  'https://etelios-shell-appservice-ewgde3dpewhubzhs.centralindia-01.azurewebsites.net',  // ✅ Added
  'https://etelios-frontend-appservice-eedgc2bmb7h5fzfy.centralindia-01.azurewebsites.net',
  'http://localhost:3000',
  'http://localhost:3001',
  '*'  // Fallback
];
```

#### 3. OPTIONS Preflight Not Handled
**Problem:**
- OPTIONS requests were being proxied to services instead of being handled at gateway level
- Services might not handle OPTIONS correctly

**Fix Applied:**
```javascript
// Handle OPTIONS BEFORE security middleware
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Requested-With, Origin, Accept, Cache-Control, Pragma');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  return res.sendStatus(200);
});

// Also handle in proxy route
app.use(basePath, (req, res, next) => {
  if (req.method === 'OPTIONS') {
    // Handle OPTIONS directly, don't proxy
    const origin = req.headers.origin || '*';
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Requested-With, Origin, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    return res.sendStatus(200);
  }
  // ... proxy logic
});
```

#### 4. Proxy Not Forwarding CORS Headers
**Problem:**
- Proxy middleware wasn't ensuring CORS headers in responses
- If target service doesn't set CORS headers, response lacks them

**Fix Applied:**
```javascript
onProxyRes: (proxyRes, req, res) => {
  // Ensure CORS headers are present
  const origin = req.headers.origin;
  if (origin) {
    if (!proxyRes.headers['access-control-allow-origin']) {
      proxyRes.headers['Access-Control-Allow-Origin'] = origin;
    }
    if (!proxyRes.headers['access-control-allow-credentials']) {
      proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
    }
    if (!proxyRes.headers['access-control-allow-methods']) {
      proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD';
    }
    if (!proxyRes.headers['access-control-allow-headers']) {
      proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Request-ID, X-Requested-With, Origin, Accept';
    }
  }
  // ... rest of handler
}
```

### Current CORS Configuration

**File:** `src/server.js`

**Configuration:**
```javascript
// CORS configuration
const corsOriginEnv = process.env.CORS_ORIGIN;
let allowedOrigins;

if (corsOriginEnv === '*') {
  allowedOrigins = '*';
} else if (corsOriginEnv) {
  allowedOrigins = corsOriginEnv.split(',').map(o => o.trim());
} else {
  // Default: Allow specific frontend URLs and all origins
  allowedOrigins = [
    'https://etelios-shell-appservice-ewgde3dpewhubzhs.centralindia-01.azurewebsites.net',
    'https://etelios-frontend-appservice-eedgc2bmb7h5fzfy.centralindia-01.azurewebsites.net',
    'https://etelios-frontend-appservice-eedgc2bmb7h5fzfy.centralindia-01.azurewebsites.net/hrms',
    'http://localhost:3000',
    'http://localhost:3001',
    '*'  // Fallback to allow all
  ];
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins === '*') return callback(null, true);
    if (Array.isArray(allowedOrigins)) {
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (allowedOrigins.includes('*')) return callback(null, true);
    }
    // In production, always allow to prevent blocking
    if (isProduction) {
      logger.warn(`CORS: Origin not in allowed list: ${origin}, but allowing anyway`);
      return callback(null, true);
    }
    callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Request-ID', 
    'X-Requested-With',
    'Origin',
    'Accept',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  maxAge: 86400
}));
```

### CORS Headers Required

**Preflight (OPTIONS) Response Must Include:**
```http
Access-Control-Allow-Origin: https://etelios-shell-appservice-ewgde3dpewhubzhs.centralindia-01.azurewebsites.net
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD
Access-Control-Allow-Headers: Content-Type, Authorization, X-Request-ID, X-Requested-With, Origin, Accept
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

**Actual Request Response Must Include:**
```http
Access-Control-Allow-Origin: https://etelios-shell-appservice-ewgde3dpewhubzhs.centralindia-01.azurewebsites.net
Access-Control-Allow-Credentials: true
```

---

## Error Handling & Status Codes

### HTTP Status Code Reference

| Status Code | Meaning | When Used | Response Format |
|------------|---------|-----------|----------------|
| 200 | Success | Successful request | `{"success": true, "data": {...}}` |
| 201 | Created | Resource created | `{"success": true, "data": {...}}` |
| 400 | Bad Request | Validation error, invalid credentials | `{"success": false, "message": "...", "service": "auth-service"}` |
| 401 | Unauthorized | Missing/invalid token | `{"success": false, "message": "Access token required"}` |
| 403 | Forbidden | Insufficient permissions | `{"success": false, "message": "Access denied"}` |
| 404 | Not Found | Resource not found | `{"success": false, "message": "Not found"}` |
| 408 | Request Timeout | Request took too long | Browser timeout, no response |
| 500 | Internal Server Error | Unexpected server error | `{"success": false, "message": "Internal server error", "service": "auth-service"}` |
| 503 | Service Unavailable | Database/service unavailable | `{"success": false, "message": "Service temporarily unavailable", "error": "Database connection error"}` |

### Error Response Structure

**Standard Error Format:**
```json
{
  "success": false,
  "message": "Error message here",
  "service": "auth-service",
  "error": "Error details (development only)",
  "errors": {}  // Validation errors (if applicable)
}
```

### Authentication Error Types

#### 1. Missing Token (401)
```json
{
  "success": false,
  "message": "Access token required"
}
```
**Location:** `microservices/auth-service/src/middleware/auth.middleware.js:18-23`

#### 2. Invalid Token (401)
```json
{
  "success": false,
  "message": "Invalid token"
}
```
**Location:** `microservices/auth-service/src/middleware/auth.middleware.js:71-76`

#### 3. Expired Token (401)
```json
{
  "success": false,
  "message": "Token expired"
}
```
**Location:** `microservices/auth-service/src/middleware/auth.middleware.js:78-83`

#### 4. Invalid Credentials (400)
```json
{
  "success": false,
  "message": "Invalid email or password",
  "service": "auth-service"
}
```
**Location:** `microservices/auth-service/src/services/auth.service.js:141`

#### 5. Account Inactive (400)
```json
{
  "success": false,
  "message": "Account is inactive",
  "service": "auth-service"
}
```
**Location:** `microservices/auth-service/src/services/auth.service.js:145-148`

#### 6. Database Connection Error (503)
```json
{
  "success": false,
  "message": "Service temporarily unavailable. Please try again later.",
  "error": "Database connection error",
  "service": "auth-service"
}
```
**Location:** `microservices/auth-service/src/controllers/authController.js:73-79`

### Error Logging

**Log Format:**
```javascript
logger.error('Error in login controller', { 
  error: error.message,
  errorName: error.name,
  stack: error.stack,
  emailOrEmployeeId: req.body?.emailOrEmployeeId,
  body: req.body,
  statusCode: error.statusCode || error.status
});
```

**Log Locations:**
- `microservices/auth-service/src/controllers/authController.js:49-56`
- `microservices/auth-service/src/middleware/auth.middleware.js:65-69`
- `src/server.js` (API Gateway proxy errors)

---

## Known Issues & Root Causes

### Issue #1: CORS Preflight Failing ⚠️ CRITICAL

**Status:** ⏳ Fixes Applied, Awaiting Deployment Verification

**Symptoms:**
- Browser console shows: "No 'Access-Control-Allow-Origin' header is present"
- Network tab shows OPTIONS request fails or returns without CORS headers
- Frontend cannot make any authenticated requests

**Root Causes:**
1. OPTIONS requests not handled before proxy
2. CORS headers not set in proxy responses
3. Frontend origin not in allowed list

**Fixes Applied:**
- ✅ OPTIONS handler added before security middleware
- ✅ OPTIONS handling in proxy route
- ✅ CORS headers added to proxy responses
- ✅ Frontend URL added to allowed origins

**Verification Steps:**
```bash
# Test OPTIONS preflight
curl -X OPTIONS \
  -H "Origin: https://etelios-shell-appservice-ewgde3dpewhubzhs.centralindia-01.azurewebsites.net" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v \
  https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login

# Should return 200 with CORS headers
```

**Expected Response Headers:**
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://etelios-shell-appservice-ewgde3dpewhubzhs.centralindia-01.azurewebsites.net
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD
Access-Control-Allow-Headers: Content-Type, Authorization, X-Request-ID, X-Requested-With, Origin, Accept
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

---

### Issue #2: Login Timeout (408)

**Status:** ⚠️ Partially Resolved

**Symptoms:**
- Login requests timeout after 10-11 seconds
- Returns `net::ERR_FAILED` or 408 status
- Database operations taking too long

**Root Causes:**
1. Azure Load Balancer timeout (10-11 seconds)
2. Database connection latency
3. Slow database queries

**Solutions:**
1. **Use Fast Mock Login:** `POST /api/auth/mock-login-fast` (no database)
2. **Pre-create Users:** Run script to create users before testing
3. **Optimize Database:** Index email/employee_id fields
4. **Increase Timeout:** Set `WEBSITES_REQUEST_TIMEOUT=300` in Azure App Service

**Fast Mock Login Endpoint:**
```bash
POST /api/auth/mock-login-fast
Content-Type: application/json

{
  "role": "hr"
}
```

**Response Time:** <100ms (no database operations)

---

### Issue #3: Services Running Wrong Code

**Status:** ✅ Fixed in Code, ⏳ Awaiting Deployment

**Symptoms:**
- Direct auth service URL returns API Gateway response
- Health endpoint shows wrong service name
- Services not responding correctly

**Root Cause:**
- Docker build context not specified correctly in Azure Pipeline
- Services building from wrong directory

**Fix Applied:**
```yaml
# microservices/hr-service/azure-pipelines.yml
- task: Docker@2
  inputs:
    buildContext: '$(Build.SourcesDirectory)/microservices/hr-service'  # ✅ Added
```

**Verification:**
```bash
# Check auth service health
curl https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net/health

# Should return:
# {"service":"auth-service","status":"healthy",...}
# NOT: {"service":"Etelios API Gateway",...}
```

---

### Issue #4: Proxy Not Forwarding Requests

**Status:** ✅ Fixed in Code, ⏳ Awaiting Deployment

**Symptoms:**
- `/api/auth/login` returns API Gateway JSON instead of auth service response
- Requests not reaching target services

**Root Cause:**
- Proxy path forwarding issue
- `req.path` stripped of basePath when using `app.use(basePath, ...)`

**Fix Applied:**
```javascript
// Use pathRewrite to forward full path
pathRewrite: (path, req) => {
  const fullPath = req.originalUrl.split('?')[0];
  return fullPath;
}
```

---

### Issue #5: Authentication Middleware Errors

**Status:** ⚠️ Needs Investigation

**Symptoms:**
- 401 errors when token is valid
- "User not found" errors
- Token verification failures

**Possible Causes:**
1. JWT secret mismatch between services
2. Token format issues
3. Database connection issues during token verification
4. User deleted/disabled after token issued

**Debugging:**
```javascript
// Check token in middleware
const decoded = verifyAccessToken(token);
console.log('Decoded token:', decoded);

// Check user in database
const user = await User.findById(decoded.userId);
console.log('User found:', !!user);
```

---

## Troubleshooting Guide

### Step 1: Verify CORS Configuration

**Check API Gateway CORS:**
```bash
# Test OPTIONS preflight
curl -X OPTIONS \
  -H "Origin: https://etelios-shell-appservice-ewgde3dpewhubzhs.centralindia-01.azurewebsites.net" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -i \
  https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login
```

**Expected:** 200 status with CORS headers

**If Missing CORS Headers:**
1. Check `src/server.js` CORS configuration
2. Verify OPTIONS handler is registered
3. Check proxy `onProxyRes` handler
4. Verify deployment includes latest code

---

### Step 2: Test Direct Auth Service

**Bypass API Gateway:**
```bash
# Test direct to auth service
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Origin: https://etelios-shell-appservice-ewgde3dpewhubzhs.centralindia-01.azurewebsites.net" \
  -d '{"emailOrEmployeeId":"test@example.com","password":"test"}' \
  https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net/api/auth/login
```

**If This Works:**
- Issue is with API Gateway proxy/CORS
- Check proxy configuration
- Verify service URLs in `src/config/services.config.js`

**If This Fails:**
- Issue is with auth service
- Check auth service logs
- Verify database connection
- Check service health endpoint

---

### Step 3: Test Fast Mock Login

**Use Fast Endpoint:**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Origin: https://etelios-shell-appservice-ewgde3dpewhubzhs.centralindia-01.azurewebsites.net" \
  -d '{"role":"hr"}' \
  https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/mock-login-fast
```

**If This Works:**
- Authentication logic is fine
- Issue is with database/regular login
- Use fast endpoint for testing

---

### Step 4: Check Service Health

**API Gateway:**
```bash
curl https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/health
```

**Auth Service:**
```bash
curl https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net/health
```

**Expected Response:**
```json
{
  "service": "auth-service",
  "status": "healthy",
  "timestamp": "2025-01-20T...",
  "version": "1.0.0",
  "port": 3001
}
```

**If Wrong Service Name:**
- Service is running wrong code
- Check Docker build context
- Redeploy service

---

### Step 5: Check Logs

**API Gateway Logs:**
- Location: Azure App Service Logs
- Look for: CORS errors, proxy errors, OPTIONS requests

**Auth Service Logs:**
- Location: Azure App Service Logs
- Look for: Database errors, authentication errors, token errors

**Key Log Messages:**
```
[Proxy] POST /api/auth/login -> auth-service at https://...
[Gateway] Proxying POST /api/auth/login to auth-service
CORS: Origin not in allowed list: ...
Error in login controller: ...
Database connection unavailable
```

---

### Step 6: Verify Environment Variables

**Required in API Gateway:**
```bash
CORS_ORIGIN=*  # Or specific origins
NODE_ENV=production
PORT=3000
```

**Required in Auth Service:**
```bash
MONGO_URI=mongodb://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
NODE_ENV=production
PORT=3001
SERVICE_NAME=auth-service
```

**Check in Azure:**
1. App Service → Configuration → Application Settings
2. Verify all required variables are set
3. Check for typos in variable names

---

## API Reference

### Complete Endpoint List

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/auth/login` | No | User login |
| POST | `/api/auth/mock-login-fast` | No | Fast mock login (no DB) |
| POST | `/api/auth/mock-login` | No | Mock login (with DB) |
| POST | `/api/auth/register` | Yes (Admin/HR) | Register new user |
| POST | `/api/auth/refresh-token` | No | Refresh access token |
| POST | `/api/auth/logout` | Yes | Logout user |
| GET | `/api/auth/profile` | Yes | Get user profile |
| PUT | `/api/auth/profile` | Yes | Update user profile |
| POST | `/api/auth/change-password` | Yes | Change password |
| POST | `/api/auth/request-password-reset` | No | Request password reset |
| POST | `/api/auth/reset-password` | No | Reset password |

### Request/Response Examples

See [Authentication Endpoints](#authentication-endpoints) section for detailed examples.

---

## Deployment & Configuration

### Environment Variables

#### API Gateway (`src/server.js`)

```bash
# CORS Configuration
CORS_ORIGIN=*  # Or: https://frontend1.com,https://frontend2.com

# Service URLs
AUTH_SERVICE_URL=https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net
HR_SERVICE_URL=https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net

# General
NODE_ENV=production
PORT=3000
```

#### Auth Service (`microservices/auth-service/`)

```bash
# Database
MONGO_URI=mongodb://user:pass@host:27017/database

# JWT
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# Service
NODE_ENV=production
PORT=3001
SERVICE_NAME=auth-service

# CORS
CORS_ORIGIN=*

# Timeouts
WEBSITES_REQUEST_TIMEOUT=300
```

### Azure App Service Configuration

**Setting CORS in Azure:**
1. Go to App Service → Configuration → CORS
2. Add allowed origins (or leave empty to use code configuration)
3. **Note:** Code-based CORS takes precedence

**Setting Environment Variables:**
1. Go to App Service → Configuration → Application Settings
2. Add/Edit variables
3. Save and restart app

### Deployment Checklist

- [ ] Verify code is pushed to Azure DevOps
- [ ] Check pipeline runs successfully
- [ ] Verify Docker images built correctly
- [ ] Check build context in pipeline logs
- [ ] Verify environment variables set
- [ ] Test health endpoints
- [ ] Test OPTIONS preflight
- [ ] Test actual login request
- [ ] Check logs for errors
- [ ] Verify CORS headers in responses

---

## Testing Commands

### Test CORS Preflight
```bash
curl -X OPTIONS \
  -H "Origin: https://etelios-shell-appservice-ewgde3dpewhubzhs.centralindia-01.azurewebsites.net" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v \
  https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login
```

### Test Login (Through Gateway)
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Origin: https://etelios-shell-appservice-ewgde3dpewhubzhs.centralindia-01.azurewebsites.net" \
  -d '{"emailOrEmployeeId":"test@example.com","password":"test"}' \
  -v \
  https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login
```

### Test Fast Mock Login
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Origin: https://etelios-shell-appservice-ewgde3dpewhubzhs.centralindia-01.azurewebsites.net" \
  -d '{"role":"hr"}' \
  https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/mock-login-fast
```

### Test Direct Auth Service
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"emailOrEmployeeId":"test@example.com","password":"test"}' \
  https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net/api/auth/login
```

### Test Health Endpoints
```bash
# API Gateway
curl https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/health

# Auth Service
curl https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net/health
```

---

## Files Modified for CORS Fixes

1. **`src/server.js`**
   - CORS configuration (lines 64-117)
   - OPTIONS handler (lines 48-58)
   - Proxy CORS headers (lines 357-374)
   - OPTIONS handling in proxy route (lines 418-428)

2. **`microservices/hr-service/azure-pipelines.yml`**
   - Added `buildContext` to Docker build task

---

## Next Steps

### Immediate Actions Required

1. **Verify Deployment**
   - Check if latest code is deployed
   - Test OPTIONS preflight request
   - Verify CORS headers in responses

2. **Monitor Logs**
   - Watch for CORS-related errors
   - Check proxy forwarding logs
   - Monitor authentication errors

3. **Test End-to-End**
   - Test login from frontend
   - Verify tokens are received
   - Test authenticated endpoints

### Long-term Improvements

1. **CORS Configuration**
   - Move to environment-based configuration
   - Add CORS testing to CI/CD
   - Document all allowed origins

2. **Error Handling**
   - Standardize error responses
   - Add error tracking/monitoring
   - Improve error messages

3. **Performance**
   - Optimize database queries
   - Add connection pooling
   - Implement caching

---

## Support & Contact

**For Issues:**
- Check Azure App Service Logs
- Review this documentation
- Test with provided curl commands
- Verify environment variables

**Key Files:**
- API Gateway: `src/server.js`
- Auth Service: `microservices/auth-service/src/`
- CORS Config: `src/server.js` (lines 64-117)
- Proxy Config: `src/server.js` (lines 284-453)

---

**Document Status:** ✅ Complete  
**Last Verified:** 2025-01-20  
**Next Review:** After deployment verification

