# 🚨 URGENT: Frontend localhost Fix - Onboarding Errors

## Problem

Your frontend is still calling `localhost:3002` instead of the Azure backend, causing:
- ❌ `PUT http://localhost:3002/api/hr/employees/EMP-2025-723718` - Fetch failed
- ❌ `POST http://localhost:3002/api/hr/employees/EMP-2025-723718/assign-role` - 500 Error
- ❌ `PATCH http://localhost:3002/api/hr/employees/EMP-2025-723718/status` - 500 Error

## Root Cause

1. **Frontend API base URL is still `localhost:3002`**
2. **Backend expects `employee_id` (e.g., `EMP-2025-723718`) but some endpoints were only accepting MongoDB ObjectId**

## ✅ Fix Applied (Backend)

The backend has been updated to accept both:
- MongoDB ObjectId (e.g., `507f1f77bcf86cd799439011`)
- Employee ID string (e.g., `EMP-2025-723718`)

## 🔧 Frontend Fix Required

### Step 1: Update API Base URL

**Find your API configuration file** (likely `api-utils.ts`, `config.ts`, or `constants.ts`):

```typescript
// ❌ WRONG (Current)
const API_BASE_URL = 'http://localhost:3002';

// ✅ CORRECT (Fix)
const API_BASE_URL = 'https://98.70.245.87';
const API_HOST = 'api.etelios.com';
```

### Step 2: Update All API Calls

**Make sure ALL requests include the Host header:**

```typescript
// api-utils.ts or your API client
export async function safeFetch(url: string, options: RequestInit = {}) {
  const fullUrl = url.startsWith('http') 
    ? url 
    : `${API_BASE_URL}${url}`;
  
  const headers = {
    'Host': API_HOST,  // ✅ CRITICAL: Add this header
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  // Add Authorization header if token exists
  const token = localStorage.getItem('accessToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(fullUrl, {
    ...options,
    headers
  });
}
```

### Step 3: Update Onboarding API Calls

**File: `onboarding-api.ts`**

```typescript
// ❌ WRONG
const response = await fetch(`http://localhost:3002/api/hr/employees/${employeeId}`, {
  method: 'PUT',
  // ...
});

// ✅ CORRECT
const response = await safeFetch(`/api/hr/employees/${employeeId}`, {
  method: 'PUT',
  headers: {
    'Host': API_HOST,
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  },
  body: JSON.stringify(data)
});
```

### Step 4: Check These Specific Functions

**In `onboarding-api.ts`, update these functions:**

#### 1. `updateStatutoryInfo`
```typescript
// ❌ WRONG
PUT http://localhost:3002/api/hr/employees/EMP-2025-723718

// ✅ CORRECT
PUT https://98.70.245.87/api/hr/employees/EMP-2025-723718
Headers: {
  'Host': 'api.etelios.com',
  'Authorization': 'Bearer <token>',
  'Content-Type': 'application/json'
}
```

#### 2. `assignRole`
```typescript
// ❌ WRONG
POST http://localhost:3002/api/hr/employees/EMP-2025-723718/assign-role

// ✅ CORRECT
POST https://98.70.245.87/api/hr/employees/EMP-2025-723718/assign-role
Headers: {
  'Host': 'api.etelios.com',
  'Authorization': 'Bearer <token>',
  'Content-Type': 'application/json'
}
Body: {
  roleName: 'Employee'  // or 'SuperAdmin', 'Admin', 'HR', 'Manager'
}
```

#### 3. `updateEmployeeStatus`
```typescript
// ❌ WRONG
PATCH http://localhost:3002/api/hr/employees/EMP-2025-723718/status

// ✅ CORRECT
PATCH https://98.70.245.87/api/hr/employees/EMP-2025-723718/status
Headers: {
  'Host': 'api.etelios.com',
  'Authorization': 'Bearer <token>',
  'Content-Type': 'application/json'
}
Body: {
  status: 'active'  // or 'on_leave', 'terminated', 'pending'
}
```

## 📋 Complete Fix Example

**File: `onboarding-api.ts`**

```typescript
// Add at top of file
const API_BASE_URL = 'https://98.70.245.87';
const API_HOST = 'api.etelios.com';

// Helper function
function getAuthHeaders() {
  const token = localStorage.getItem('accessToken');
  return {
    'Host': API_HOST,
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// Update updateStatutoryInfo
export async function updateStatutoryInfo(employeeId: string, data: any) {
  const response = await fetch(
    `${API_BASE_URL}/api/hr/employees/${employeeId}`,
    {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update statutory info');
  }
  
  return response.json();
}

// Update assignRole
export async function assignRole(employeeId: string, roleName: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/hr/employees/${employeeId}/assign-role`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ roleName })
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to assign role');
  }
  
  return response.json();
}

// Update updateEmployeeStatus
export async function updateEmployeeStatus(employeeId: string, status: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/hr/employees/${employeeId}/status`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: status.toLowerCase() })  // Ensure lowercase
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update status');
  }
  
  return response.json();
}
```

## 🔍 How to Find All localhost References

**Search your codebase for:**
```bash
# In your frontend project
grep -r "localhost:3002" src/
grep -r "http://localhost" src/
```

**Common files to check:**
- `src/config/api.ts`
- `src/utils/api-utils.ts`
- `src/api/onboarding-api.ts`
- `src/lib/api-client.ts`
- `.env` or `.env.local`
- `next.config.js` (if using Next.js)

## ✅ Validation

After fixing, test these endpoints:

```bash
# 1. Update Employee
curl -X PUT https://98.70.245.87/api/hr/employees/EMP-2025-723718 \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"firstName": "John", "lastName": "Doe"}'

# 2. Assign Role
curl -X POST https://98.70.245.87/api/hr/employees/EMP-2025-723718/assign-role \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"roleName": "Employee"}'

# 3. Update Status
curl -X PATCH https://98.70.245.87/api/hr/employees/EMP-2025-723718/status \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```

## 📝 Important Notes

1. **Always use HTTPS:** `https://98.70.245.87` (not `http://`)
2. **Always include Host header:** `Host: api.etelios.com`
3. **Employee ID format:** Backend now accepts both:
   - MongoDB ObjectId: `507f1f77bcf86cd799439011`
   - Employee ID: `EMP-2025-723718`
4. **Status values:** Must be lowercase: `active`, `on_leave`, `terminated`, `pending`
5. **Role names:** Can be: `SuperAdmin`, `Admin`, `HR`, `Manager`, `Employee` (case-insensitive)

## 🆘 Still Getting Errors?

1. **Check browser console** for exact error messages
2. **Check Network tab** to see the actual request URL
3. **Verify token** is valid: `GET /api/auth/profile`
4. **Check CORS** - backend allows all origins
5. **Verify Host header** is included in all requests

## 📞 Support

If issues persist:
1. Check `FRONTEND_COMPLETE_TESTING_GUIDE.md` for complete API reference
2. Check `FRONTEND_QUICK_REFERENCE.md` for quick setup
3. Contact DevOps team with:
   - Exact error message
   - Request URL from Network tab
   - Response status code

---

**Last Updated:** December 30, 2025  
**Status:** Backend Fixed ✅ | Frontend Fix Required ⚠️

