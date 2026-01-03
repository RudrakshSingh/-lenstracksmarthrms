# Cursor Prompt: Fix Onboarding Authentication Issues

## 🎯 Task
Fix the authentication issues in the employee onboarding flow where multiple endpoints are failing with "Authentication required" errors.

---

## 🔍 Problem Statement

The frontend is experiencing authentication failures during employee onboarding with the following errors:

1. ❌ **Registration failed**: Backend service unavailable
2. ❌ **Employee creation failed**: Authentication required
3. ❌ **Statutory info update failed**: Authentication required
4. ❌ **Role assignment failed**: Authentication required
5. ❌ **Status update failed**: Authentication required

---

## 🔍 Root Cause Analysis

### Current Situation:
- **Frontend**: Expects authentication token to be in HttpOnly cookie and relies on backend to read it
- **Backend**: Only reads authentication token from `Authorization: Bearer <token>` header
- **Mismatch**: Frontend is not sending the `Authorization` header, causing all authenticated endpoints to fail

### Endpoint Requirements:

1. **`POST /api/auth/register`** 
   - ✅ **PUBLIC** - No authentication required
   - Status: Should work, but might be failing due to service unavailability

2. **`POST /api/hr/employees`** (Employee Creation)
   - ❌ **REQUIRES AUTH** - Needs `authenticate` middleware + `requireRole(['HR', 'Admin', 'SuperAdmin'])`
   - Route: `microservices/hr-service/src/routes/hr.routes.js` (line 168-173)

3. **`POST/PATCH /api/hr/employees/:id/statutory`** (Statutory Info)
   - ❌ **REQUIRES AUTH** - Needs `authenticate` middleware + `requireRole(['hr', 'admin', 'superadmin'])`
   - Route: `microservices/hr-service/src/routes/onboarding.routes.js` (line 230-234)

4. **`POST /api/hr/employees/:id/assign-role`** (Role Assignment)
   - ❌ **REQUIRES AUTH** - Needs `authenticate` middleware + `requireRole(['HR', 'Admin', 'SuperAdmin'])`
   - Route: `microservices/hr-service/src/routes/hr.routes.js` (line 194-199)

5. **`PATCH /api/hr/employees/:id/status`** (Status Update)
   - ❌ **REQUIRES AUTH** - Needs `authenticate` middleware + `requireRole(['HR', 'Admin', 'SuperAdmin'])`
   - Route: `microservices/hr-service/src/routes/hr.routes.js` (line 201-206)

### Backend Auth Middleware Behavior:

The authentication middleware in `microservices/hr-service/src/middleware/auth.middleware.js` (line 69-78) only checks for:
```javascript
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

**It does NOT read from cookies** - only from the `Authorization` header.

---

## ✅ Solution Options

### Option 1: Fix Frontend (Recommended)
Update the frontend to send `Authorization: Bearer <token>` header in all authenticated requests.

**Steps:**
1. After login, store the token in `localStorage` (not just HttpOnly cookie)
2. Read token from `localStorage` before each API call
3. Add `Authorization: Bearer <token>` header to all authenticated requests
4. Ensure token is sent for all onboarding endpoints

**Implementation:**
```typescript
// After login
const loginResponse = await fetch('https://98.70.245.87/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Host': 'api.etelios.com'
  },
  body: JSON.stringify({
    email: 'admin@etelios.com',
    password: 'Admin@123456'
  })
});

const { data } = await loginResponse.json();
// Store token in localStorage
localStorage.setItem('accessToken', data.accessToken);

// In all API calls
const getAuthToken = () => {
  return localStorage.getItem('accessToken') || 
         sessionStorage.getItem('accessToken');
};

const apiFetch = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    'Host': 'api.etelios.com',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}), // ✅ CRITICAL
    ...options.headers
  };
  
  return fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers
  });
};
```

### Option 2: Add Cookie Support to Backend (Alternative)
Update the backend authentication middleware to also read tokens from cookies.

**Steps:**
1. Install `cookie-parser` if not already installed
2. Add `cookie-parser` middleware to `server.js`
3. Update `auth.middleware.js` to check cookies as fallback
4. Ensure cookie is set during login

**Implementation:**
```javascript
// server.js - Add cookie parser
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// auth.middleware.js - Update authenticate function
const authenticate = async (req, res, next) => {
  try {
    // Try Authorization header first
    let token = null;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Fallback: Try reading from cookie
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
    
    // ... rest of token verification logic
  } catch (error) {
    // ... error handling
  }
};
```

---

## 📋 Implementation Checklist

### If Fixing Frontend:
- [ ] Locate the API client/utility file (likely `api-utils.ts`, `api-client.ts`, or similar)
- [ ] Find where login response is handled
- [ ] Ensure token is stored in `localStorage` after login
- [ ] Update all API fetch functions to include `Authorization: Bearer <token>` header
- [ ] Test with admin credentials: `admin@etelios.com` / `Admin@123456`
- [ ] Verify all onboarding endpoints work:
  - [ ] `POST /api/auth/register` (should work without auth)
  - [ ] `POST /api/hr/employees` (requires auth)
  - [ ] `PATCH /api/hr/employees/:id/statutory` (requires auth)
  - [ ] `POST /api/hr/employees/:id/assign-role` (requires auth)
  - [ ] `PATCH /api/hr/employees/:id/status` (requires auth)

### If Fixing Backend:
- [ ] Check if `cookie-parser` is installed: `npm list cookie-parser`
- [ ] If not installed, add it: `npm install cookie-parser`
- [ ] Add `cookie-parser` middleware to `microservices/hr-service/src/server.js`
- [ ] Update `microservices/hr-service/src/middleware/auth.middleware.js` to read from cookies
- [ ] Update login endpoint to set cookie (if needed)
- [ ] Test authentication with both header and cookie methods

---

## 🧪 Testing

### Test Registration (No Auth Required):
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

### Test Employee Creation (Auth Required):
```bash
# Step 1: Get token
TOKEN=$(curl -k -s -X POST "https://98.70.245.87/api/auth/login" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@etelios.com","password":"Admin@123456"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])")

# Step 2: Create employee with token
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

## 📁 Files to Modify

### Frontend Files (if fixing frontend):
- `api-utils.ts` or similar API client file
- Login component/page that handles login response
- Onboarding flow components that make API calls

### Backend Files (if fixing backend):
- `microservices/hr-service/src/server.js` - Add cookie-parser middleware
- `microservices/hr-service/src/middleware/auth.middleware.js` - Add cookie reading logic
- `microservices/hr-service/package.json` - Add cookie-parser dependency (if not present)

---

## 🎯 Expected Outcome

After fixing:
- ✅ Registration endpoint works (already public)
- ✅ Employee creation works with proper authentication
- ✅ Statutory info update works with proper authentication
- ✅ Role assignment works with proper authentication
- ✅ Status update works with proper authentication
- ✅ All onboarding steps complete successfully

---

## 💡 Recommendations

1. **Prefer Option 1 (Frontend Fix)** because:
   - Standard HTTP authentication pattern
   - Works with all HTTP clients
   - No cookie parsing needed
   - More secure (cookies can be vulnerable to CSRF)
   - Easier to debug

2. **If using Option 2 (Backend Cookie Support)**:
   - Ensure CSRF protection is in place
   - Test both header and cookie methods
   - Document which method takes precedence

3. **For Production**:
   - Use HTTPS for all API calls
   - Implement token refresh mechanism
   - Handle token expiration gracefully
   - Add proper error handling for auth failures

---

## 🔗 Related Files

- `ONBOARDING_AUTHENTICATION_FIX.md` - Detailed analysis document
- `microservices/hr-service/src/middleware/auth.middleware.js` - Auth middleware
- `microservices/hr-service/src/routes/hr.routes.js` - HR routes
- `microservices/hr-service/src/routes/onboarding.routes.js` - Onboarding routes
- `microservices/hr-service/src/server.js` - Server configuration

---

## ⚠️ Important Notes

1. **`/api/auth/register` is PUBLIC** - No authentication required ✅
2. **All other onboarding endpoints require auth** - Must send token
3. **Backend expects `Authorization` header** - NOT cookies (unless you add cookie support)
4. **Frontend must send token in header** - Not just rely on cookies
5. **Admin credentials for testing**: `admin@etelios.com` / `Admin@123456`

---

**Status**: 🔍 **Root Cause Identified - Ready for Implementation**

**Priority**: 🔴 **HIGH** - Blocking employee onboarding flow

