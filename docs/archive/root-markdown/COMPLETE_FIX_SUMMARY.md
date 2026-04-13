# Complete Fix Summary

## 🔍 Diagnosis Results

✅ **Backend**: Healthy and accessible  
❌ **Employee `EMP-2026-207625`**: Does NOT exist in database  
❌ **Proxy**: Not configured (404/503 errors)

---

## 🚨 Two Issues to Fix

### Issue 1: Proxy Not Configured (404/503 Errors)

**Symptoms:**
- `POST /api/attendance/clock-in 404`
- `GET /api/attendance?employeeId=... 503`

**Root Cause:** Next.js API route handler missing or misconfigured

**Fix:** See `FINAL_PROXY_FIX.md` for complete solution

**Quick Fix:**
1. Create `packages/shell/pages/api/[...path].ts` (or `app/api/[...path]/route.ts`)
2. Copy code from `FINAL_PROXY_FIX.md`
3. Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local`
4. Restart dev server

---

### Issue 2: Employee Doesn't Exist

**Symptoms:**
- "Employee not found in backend"
- Employee ID `EMP-2026-207625` not in database

**Root Cause:** Employee was never created or was deleted

**Fix Options:**

#### Option A: Use Existing Employee

Check what employees exist:
```bash
# Login
TOKEN=$(curl -s -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@upcapto.com","password":"Upcapto@2026"}' \
  | jq -r '.data.accessToken')

# List employees
curl -s -X GET "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/hr/employees?limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto" \
  | jq '.data[] | {employeeId, fullName, email, hasStore: (.store != null)}'
```

Use an employee that:
- ✅ Has a store assigned (`hasStore: true`)
- ✅ Is active
- ✅ Has valid credentials

#### Option B: Create New Employee

**Via HR UI:**
1. Login as admin
2. Go to HR → Employees
3. Create new employee
4. Assign to a store
5. Note the employee ID

**Via API:**
```bash
# Use create-mock-employee.sh script
./create-mock-employee.sh
```

---

## ✅ Fix Order

1. **First**: Fix proxy (see `FINAL_PROXY_FIX.md`)
   - This will resolve 404/503 errors
   - Test with: `curl http://localhost:3000/api/attendance/health`

2. **Second**: Fix employee issue
   - Use existing employee OR create new one
   - Ensure employee has store assigned

3. **Third**: Test complete flow
   - Login with employee credentials
   - Test clock-in/out
   - Verify attendance records

---

## 🧪 Complete Test

After fixing both issues:

```bash
# 1. Test proxy
curl http://localhost:3000/api/attendance/health
# Should return: {"service":"attendance-service","status":"healthy"}

# 2. Login with employee account
TOKEN=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"EMPLOYEE_EMAIL","password":"EMPLOYEE_PASSWORD"}' \
  | jq -r '.data.accessToken')

# 3. Test clock-in via proxy
curl -X POST http://localhost:3000/api/attendance/clock-in \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto" \
  -H "Content-Type: application/json" \
  -d '{"latitude": 19.0760, "longitude": 72.8777, "notes": "Test"}'
# Should return: {"success": true, "data": {...}}
```

---

## 📋 Final Checklist

- [ ] Proxy fixed (404/503 resolved)
- [ ] `curl http://localhost:3000/api/attendance/health` works
- [ ] Employee exists in database
- [ ] Employee has store assigned
- [ ] Employee can login
- [ ] Clock-in works via proxy

---

**Priority: Fix proxy first, then employee issue!**
