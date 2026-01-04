# Frontend Proxy 404 Diagnosis Guide

## Current Situation

✅ **Frontend Configuration**: Correct
- `NEXT_PUBLIC_API_BASE_URL=https://98.70.245.87` set in `.env.local`
- Using `getApiBaseUrl()` helper
- No hardcoded localhost in API routes
- Next.js API routes act as proxy

❌ **Issue**: Still getting 404 errors
- `POST /api/hr/employees/EMP-2026-287810/assign-role` → 404
- `PATCH /api/hr/employees/EMP-2026-287810/status` → 404

---

## 🔍 Diagnosis Steps

### Step 1: Verify Employee Exists in Production

Run the diagnostic script:

```bash
node scripts/check-employee-production.js EMP-2026-287810
```

This will:
- ✅ Check if employee exists
- ✅ Test all endpoints
- ✅ Show authentication status
- ✅ Verify endpoint paths

### Step 2: Check Next.js Server Logs

**In your Next.js dev server terminal**, look for:

```
# Should see proxy requests like:
[Next.js] Proxying to: https://98.70.245.87/api/hr/employees/EMP-2026-287810/assign-role
```

If you see errors, note them.

### Step 3: Verify Next.js API Route Exists

**Check if proxy route exists**:

**For App Router** (Next.js 13+):
- File: `app/api/[...proxy]/route.ts` or `app/api/hr/[...path]/route.ts`

**For Pages Router**:
- File: `pages/api/[...proxy].ts` or `pages/api/hr/[...path].ts`

### Step 4: Check Authentication

These endpoints require authentication:

```typescript
// Check if token is being sent
console.log('Token:', localStorage.getItem('accessToken'));

// Verify token is valid
fetch('https://98.70.245.87/api/auth/profile', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
})
.then(r => r.json())
.then(d => console.log('Auth status:', d));
```

---

## 🔧 Common Issues & Fixes

### Issue 1: Employee Doesn't Exist

**Symptom**: 404 with "Employee not found"

**Check**:
```bash
node scripts/check-employee-production.js EMP-2026-287810
```

**Fix**: 
- Employee was created in different environment
- Need to create employee in production first
- Or use employee that exists in production

### Issue 2: Next.js Proxy Route Missing

**Symptom**: 404 from Next.js (not backend)

**Check**: Does `app/api/[...proxy]/route.ts` exist?

**Fix**: Create proxy route (see `NEXTJS_API_ROUTE_FIX.md`)

### Issue 3: Path Mismatch

**Symptom**: 404 but employee exists

**Check**: 
- Frontend calls: `/api/hr/employees/:id/assign-role`
- Backend expects: `/api/hr/employees/:id/assign-role` ✅

**Verify**: Check Next.js proxy is forwarding full path

### Issue 4: Authentication Missing

**Symptom**: 401 or 404 (if auth middleware returns 404)

**Check**: 
- Token exists in localStorage/cookies
- Token is sent in Authorization header
- Token is valid and not expired

**Fix**: Ensure authentication token is included:

```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### Issue 5: Role Name Mismatch

**Symptom**: 404 or 400 when assigning role

**Check**: Backend expects `roleName` field:
- Valid values: `'Employee'`, `'HR'`, `'Manager'`, `'Admin'`, `'SuperAdmin'`
- Or lowercase: `'employee'`, `'hr'`, `'manager'`, `'admin'`, `'superadmin'`

**Frontend sends**: `{ roleName: 'Employee' }` ✅

---

## 🧪 Testing Checklist

### Test 1: Direct Backend Call (Bypass Next.js)

```bash
# Test with curl (replace TOKEN with actual token)
curl -X POST "https://98.70.245.87/api/hr/employees/EMP-2026-287810/assign-role" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"roleName": "Employee"}'
```

**If this works**: Issue is in Next.js proxy  
**If this fails**: Issue is in backend or employee doesn't exist

### Test 2: Check Employee Exists

```bash
# Get employee (requires auth)
curl -X GET "https://98.70.245.87/api/hr/employees/EMP-2026-287810" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 3: Check Next.js Proxy

**In browser console**:
```javascript
// This should proxy to production
fetch('/api/hr/employees/EMP-2026-287810', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
})
.then(r => r.json())
.then(d => console.log('Employee:', d));
```

---

## 📋 Backend Endpoint Details

### POST `/api/hr/employees/:id/assign-role`

**Route**: `microservices/hr-service/src/routes/hr.routes.js:194`

**Requirements**:
- ✅ Authentication required (`authenticate` middleware)
- ✅ Role required: HR, Admin, or SuperAdmin
- ✅ Body: `{ roleName: string }`
- ✅ Valid roleName: `'Employee'`, `'HR'`, `'Manager'`, `'Admin'`, `'SuperAdmin'` (case-insensitive)

**Employee Lookup**:
- Tries MongoDB ObjectId first
- Falls back to `employeeId` field (e.g., `EMP-2026-287810`)
- Searches with `.toUpperCase()`

### PATCH `/api/hr/employees/:id/status`

**Route**: `microservices/hr-service/src/routes/hr.routes.js:201`

**Requirements**:
- ✅ Authentication required
- ✅ Role required: HR, Admin, or SuperAdmin
- ✅ Body: `{ status: string }`
- ✅ Valid status: `'ACTIVE'`, `'INACTIVE'`, `'ON_LEAVE'`, `'TERMINATED'`, `'PENDING'`

---

## 🎯 Most Likely Causes

Based on the error, most likely:

1. **Employee doesn't exist in production** (60% chance)
   - Employee was created in local/dev environment
   - Need to create in production first

2. **Authentication token missing/invalid** (30% chance)
   - Token not sent in request
   - Token expired
   - Token invalid

3. **Next.js proxy route issue** (10% chance)
   - Proxy route not forwarding correctly
   - Path being modified incorrectly

---

## ✅ Quick Fix Steps

1. **Run diagnostic script**:
   ```bash
   node scripts/check-employee-production.js EMP-2026-287810
   ```

2. **Check Next.js server logs** for proxy errors

3. **Verify authentication**:
   ```javascript
   console.log('Token:', localStorage.getItem('accessToken'));
   ```

4. **Test direct backend call** (bypass Next.js) to isolate issue

5. **Check if employee exists** in production database

---

## 📞 Next Steps

Based on diagnostic results:

- **If employee doesn't exist**: Create employee in production first
- **If authentication fails**: Fix token handling
- **If proxy issue**: Fix Next.js API route
- **If backend issue**: Check backend logs

Run the diagnostic script first to identify the exact issue!

