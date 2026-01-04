# 🚨 Frontend Developer: Fix localhost API Calls

## Problem

Your frontend is calling `localhost:3002` but the employee data is in **production**:
- ❌ `POST http://localhost:3002/api/hr/employees/EMP-2026-287810/assign-role` → 404
- ❌ `PATCH http://localhost:3002/api/hr/employees/EMP-2026-287810/status` → 404

**Error**: "Employee not found in backend"

## Root Cause

1. **Frontend API URL**: `localhost:3002` (local development)
2. **Employee Created In**: Production (`98.70.245.87`)
3. **Result**: Employee doesn't exist in local database → 404 error

---

## ✅ Solution: Point Frontend to Production API

### Option 1: Update API Base URL (Recommended)

**Find your API configuration file** (likely `api-utils.ts`, `config/api.ts`, or `.env`):

```typescript
// ❌ WRONG (Current)
const API_BASE_URL = 'http://localhost:3002';
// OR
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002';

// ✅ CORRECT (Fix)
const API_BASE_URL = 'https://98.70.245.87';
// OR use environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://98.70.245.87';
```

### Option 2: Update .env File

**Create or update `.env.local`** in your frontend project:

```env
# Production API (for testing with real data)
NEXT_PUBLIC_API_BASE_URL=https://98.70.245.87

# Optional: Host header for routing
NEXT_PUBLIC_API_HOST=api.etelios.com
```

**For React/Vue/Angular**:
```env
REACT_APP_API_BASE_URL=https://98.70.245.87
# OR
VITE_API_BASE_URL=https://98.70.245.87
```

### Option 3: Update api-utils.ts

**File**: `api-utils.ts` (or similar)

```typescript
// Find this line (around line 190):
const baseURL = 'http://localhost:3002';

// Replace with:
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://98.70.245.87';
```

---

## 🔍 How to Find the File

### Step 1: Search for "localhost:3002"

```bash
# In your frontend project root
grep -r "localhost:3002" src/
# OR
grep -r "localhost:3002" lib/
# OR
grep -r "localhost:3002" utils/
```

### Step 2: Check Common Files

Look for these files:
- `src/utils/api-utils.ts` ← **Most likely**
- `src/lib/api.ts`
- `src/config/api.ts`
- `src/services/api.ts`
- `.env` or `.env.local`

---

## 📝 Complete Fix Example

### Before (Wrong)

```typescript
// api-utils.ts
const baseURL = 'http://localhost:3002';

export async function safeFetch(url: string, options: RequestInit = {}) {
  const fullUrl = `${baseURL}${url}`;
  return fetch(fullUrl, options);
}
```

### After (Correct)

```typescript
// api-utils.ts
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://98.70.245.87';

export async function safeFetch(url: string, options: RequestInit = {}) {
  const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  // Add auth token if available
  const token = localStorage.getItem('accessToken') || 
                document.cookie.match(/token=([^;]+)/)?.[1];
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(fullUrl, {
    ...options,
    headers
  });
}
```

---

## 🔄 After Making Changes

### 1. Restart Development Server

```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
# OR
yarn dev
```

### 2. Hard Refresh Browser

```
Ctrl + Shift + R  (Windows/Linux)
Cmd + Shift + R   (Mac)
```

### 3. Accept SSL Certificate (First Time Only)

1. Open new tab
2. Go to: `https://98.70.245.87`
3. Click "Advanced" → "Proceed anyway"
4. Close tab

---

## ✅ Verify Fix

### Check Network Tab

**Before (Wrong)**:
```
❌ POST http://localhost:3002/api/hr/employees/EMP-2026-287810/assign-role
```

**After (Correct)**:
```
✅ POST https://98.70.245.87/api/hr/employees/EMP-2026-287810/assign-role
```

### Test in Console

```javascript
// This should now work:
fetch('https://98.70.245.87/api/hr/employees/EMP-2026-287810', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
})
.then(r => r.json())
.then(d => console.log('✅ Employee found:', d));
```

---

## 🎯 Endpoints That Will Work After Fix

Once you point to production, these endpoints will work:

1. ✅ `POST /api/hr/employees/:id/assign-role`
   - **Route**: `microservices/hr-service/src/routes/hr.routes.js:194`
   - **Controller**: `hrController.assignRole`
   - **Auth Required**: Yes (HR, Admin, SuperAdmin)

2. ✅ `PATCH /api/hr/employees/:id/status`
   - **Route**: `microservices/hr-service/src/routes/hr.routes.js:201`
   - **Controller**: `hrController.updateEmployeeStatus`
   - **Auth Required**: Yes

---

## 🔐 Authentication

These endpoints require authentication. Make sure:

1. **User is logged in** (has access token)
2. **Token is sent** in Authorization header:
   ```typescript
   headers: {
     'Authorization': `Bearer ${token}`
   }
   ```
3. **User has correct role** (HR, Admin, or SuperAdmin)

---

## 📋 Quick Checklist

- [ ] Find API configuration file (`api-utils.ts` or similar)
- [ ] Change `localhost:3002` to `https://98.70.245.87`
- [ ] Update `.env.local` with `NEXT_PUBLIC_API_BASE_URL`
- [ ] Restart development server
- [ ] Hard refresh browser
- [ ] Accept SSL certificate (first time)
- [ ] Test endpoints in Network tab
- [ ] Verify requests go to `98.70.245.87` not `localhost:3002`

---

## 🆘 Still Not Working?

### Check 1: Is API URL Updated?

```typescript
// Add this temporarily to see what URL is being used:
console.log('API Base URL:', baseURL);
```

### Check 2: Is Employee ID Correct?

The employee ID `EMP-2026-287810` must exist in production database.

### Check 3: Is Authentication Working?

```javascript
// Check if token exists:
console.log('Token:', localStorage.getItem('accessToken'));
```

### Check 4: Check Backend Logs

```bash
# If you have access to production logs:
kubectl logs -n etelios-backend-prod -l app=hr-service --tail=50 | grep "EMP-2026-287810"
```

---

## 📞 Support

If still having issues:
1. Check browser Network tab for actual request URL
2. Verify employee exists in production
3. Check authentication token is valid
4. Review backend logs for errors

---

**Status**: ⚠️ **Frontend needs to update API base URL from `localhost:3002` to `https://98.70.245.87`**

