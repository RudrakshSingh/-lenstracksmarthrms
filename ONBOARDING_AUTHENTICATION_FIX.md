# Onboarding Authentication Issues - Root Cause & Fix

**Date**: 2026-01-02  
**Issue**: Frontend onboarding flow failing with authentication errors

---

## 🔍 Errors Reported

1. ❌ **Registration failed**: Backend service unavailable
2. ❌ **Employee creation failed**: Authentication required
3. ❌ **Statutory info update failed**: Authentication required
4. ❌ **Role assignment failed**: Authentication required
5. ❌ **Status update failed**: Authentication required

---

## 🔍 Root Cause Analysis

### Issue 1: `/api/auth/register` Endpoint

**Current Status**: 
- Endpoint exists at `/api/auth/register` in `server.js` (line 441)
- **NO authentication required** ✅ (Public endpoint)
- But frontend might be getting 503 if:
  - Service is down
  - Route not loading properly
  - Database connection issue

**Check**:
```javascript
// server.js line 441
app.post('/api/auth/register', validateRequest(registerSchema), asyncHandler(onboardingController.register));
// ✅ No authenticate middleware - this is correct
```

### Issue 2: All Other Endpoints Require Auth

**Endpoints Requiring Authentication**:

1. **POST `/api/hr/employees`** (Employee Creation)
   - Requires: `authenticate` + `requireRole(['HR', 'Admin', 'SuperAdmin'])`
   - Route: `hr.routes.js` line 168-173

2. **POST/PATCH `/api/hr/employees/:id/statutory`** (Statutory Info)
   - Requires: `authenticate` + `requireRole(['hr', 'admin', 'superadmin'])`
   - Route: `onboarding.routes.js` line 230-234

3. **POST `/api/hr/employees/:id/assign-role`** (Role Assignment)
   - Requires: `authenticate` + `requireRole(['HR', 'Admin', 'SuperAdmin'])`
   - Route: `hr.routes.js` line 194-199

4. **PATCH `/api/hr/employees/:id/status`** (Status Update)
   - Requires: `authenticate` + `requireRole(['HR', 'Admin', 'SuperAdmin'])`
   - Route: `hr.routes.js` line 201-206

---

## 🔧 Root Cause

**The frontend is NOT sending authentication tokens properly.**

### Evidence:
1. Frontend logs show: `hasAuth: false`, `authTokenPreview: 'none'`
2. Frontend note: "Token in HttpOnly cookie - server will read from cookies"
3. **But backend expects `Authorization: Bearer <token>` header**

### Backend Auth Middleware Expects:
```javascript
// auth.middleware.js line 69-78
const authHeader = req.headers.authorization;

if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return res.status(401).json({
    success: false,
    message: 'Access token required',
    hint: 'Include Authorization header: Bearer <token>',
    code: 'AUTH_REQUIRED'
  });
}
```

**Backend does NOT read from cookies** - it only reads from `Authorization` header!

---

## ✅ Solution

### Option 1: Frontend Fix (Recommended)

**Update frontend to send `Authorization` header:**

```typescript
// api-utils.ts or your API client
const getAuthToken = () => {
  // Try localStorage first
  const token = localStorage.getItem('accessToken') || 
                localStorage.getItem('access_token') ||
                sessionStorage.getItem('accessToken');
  
  // If not found, try reading from HttpOnly cookie (if you have a way to access it)
  // Note: HttpOnly cookies are NOT accessible via JavaScript
  // You need a backend endpoint to read them, or use a different approach
  
  return token;
};

const apiFetch = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    'Host': 'api.etelios.com', // Required for production
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}), // ✅ CRITICAL
    ...options.headers
  };
  
  return fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers
  });
};
```

### Option 2: Backend Fix (Add Cookie Support)

**Update auth middleware to read from cookies:**

```javascript
// microservices/hr-service/src/middleware/auth.middleware.js

const authenticate = async (req, res, next) => {
  try {
    // Try Authorization header first
    let token = null;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Fallback: Try reading from cookie
      const cookieParser = require('cookie-parser');
      token = req.cookies?.accessToken || req.cookies?.token;
    }
    
    if (!token || token.trim() === '') {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        hint: 'Include Authorization header: Bearer <token> or accessToken cookie',
        code: 'AUTH_REQUIRED'
      });
    }
    
    // Verify token...
    // ... rest of auth logic
  } catch (error) {
    // ... error handling
  }
};
```

**Also need to add cookie-parser middleware:**

```javascript
// server.js
const cookieParser = require('cookie-parser');
app.use(cookieParser());
```

---

## 🧪 Testing

### Test Registration (No Auth Required)
```bash
curl -k -X POST "https://98.70.245.87/api/auth/register" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "EMP-2025-TEST",
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+919999999999",
    "password": "Test@123456",
    "role": "employee",
    "address": {
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India"
    }
  }'
```

### Test Employee Creation (Auth Required)
```bash
# First, get token
TOKEN=$(curl -k -s -X POST "https://98.70.245.87/api/auth/login" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@etelios.com","password":"Admin@123456"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])")

# Then create employee
curl -k -X POST "https://98.70.245.87/api/hr/employees" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMP-2025-TEST2",
    "firstName": "Test",
    "lastName": "User",
    "email": "test2@example.com",
    "password": "Test@123456",
    "roleName": "employee",
    "department": "TECH",
    "jobTitle": "Developer"
  }'
```

---

## 📋 Quick Fix Checklist

### Frontend Developer:
- [ ] Ensure `Authorization: Bearer <token>` header is sent in ALL requests
- [ ] Store token in localStorage (not just HttpOnly cookie)
- [ ] Add token to every API call in onboarding flow
- [ ] Test with real admin token: `admin@etelios.com` / `Admin@123456`

### Backend Developer:
- [ ] Verify `/api/auth/register` is public (no auth required) ✅
- [ ] Check if cookie-parser is installed and configured
- [ ] Consider adding cookie support to auth middleware (optional)

---

## 💡 Recommended Approach

**Best Solution**: Fix frontend to send `Authorization` header

**Why?**
1. Standard HTTP authentication pattern
2. Works with all HTTP clients
3. No cookie parsing needed
4. More secure (cookies can be vulnerable to CSRF)

**Implementation**:
1. After login, store token in localStorage
2. Read token from localStorage before each API call
3. Add `Authorization: Bearer <token>` to all request headers
4. Handle token expiration and refresh

---

## 🚨 Critical Points

1. **`/api/auth/register` is PUBLIC** - No auth needed ✅
2. **All other onboarding endpoints require auth** - Must send token
3. **Backend expects `Authorization` header** - NOT cookies
4. **Frontend must send token in header** - Not just rely on cookies

---

**Status**: 🔍 **Root Cause Identified - Frontend Auth Token Not Being Sent**

**Next Steps**: 
1. Update frontend to send `Authorization: Bearer <token>` header
2. Store token in localStorage after login
3. Test full onboarding flow with proper authentication

