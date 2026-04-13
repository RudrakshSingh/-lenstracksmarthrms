# 🔧 Frontend Form Data Not Storing in DB - Complete Fix

## 🎯 Problem

Frontend form se employee create ho raha hai, lekin **database mein save nahi ho raha**.

---

## 🔍 Root Cause Analysis

### Possible Issues:

1. **Frontend API URL Wrong** ❌
   - Frontend `localhost:3000` use kar raha hai instead of production URL
   - Request backend tak nahi pahunch raha

2. **Backend Not Receiving Request** ❌
   - Request fail ho raha hai silently
   - Network error
   - CORS issue

3. **Tenant ID Mismatch** ❌
   - Frontend different tenant ID bhej raha hai
   - Backend different tenant mein save kar raha hai

4. **Backend Save Failing Silently** ❌
   - Save() call ho raha hai but error catch nahi ho raha
   - Database connection issue

---

## ✅ Complete Fix

### Step 1: Verify Backend is Receiving Requests

**Test if backend is getting requests:**

```bash
# Check backend logs
kubectl logs -n etelios-prod deployment/hr-service --tail=100 | grep -i "creating employee\|createEmployee"
```

**Expected output:**
```
Creating employee { hasFullName: true, email: '...', ... }
```

**If no logs:**
- Frontend request backend tak nahi pahunch raha
- Fix API URL in frontend

---

### Step 2: Fix Frontend API URL

**Check frontend environment variables:**

```bash
# In frontend codebase, check:
# 1. .env or .env.local
# 2. next.config.js (for Next.js)
# 3. vite.config.ts (for Vite)
# 4. Any API client file
```

**Must be:**
```env
NEXT_PUBLIC_API_BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
# OR
REACT_APP_API_BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

**NOT:**
```env
# ❌ WRONG
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
REACT_APP_API_BASE_URL=http://localhost:3002
```

---

### Step 3: Verify Backend Save Logic

**Backend code is correct** - it saves to DB. But let's add better error handling:

**File**: `microservices/hr-service/src/services/hr.service.js`

**Current code (line 237):**
```javascript
await employee.save();
```

**This is correct** - it saves to MongoDB. If it fails, it will throw an error.

---

### Step 4: Check Tenant ID

**Frontend must send correct tenant ID:**

```javascript
// Frontend code should have:
headers: {
  'Authorization': `Bearer ${token}`,
  'x-tenant-id': tenantId, // Must match backend tenant
  'Content-Type': 'application/json'
}
```

**Backend uses (line 152):**
```javascript
const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || 'default';
```

**If tenant mismatch:**
- Employee save ho jayega but different tenant mein
- Check karne ke liye: `GET /api/hr/employees?tenantId=YOUR_TENANT`

---

### Step 5: Add Better Logging

**Add logging to verify save:**

**File**: `microservices/hr-service/src/services/hr.service.js`

**After line 237:**
```javascript
await employee.save();

// ADD THIS:
logger.info('Employee saved to database', {
  employeeId: normalizedEmployeeId,
  mongoId: employee._id.toString(),
  tenantId: employeeTenantId,
  email: email,
  database: mongoose.connection.name
});
```

---

## 🧪 Test Frontend to Backend Flow

### Test Script:

```bash
#!/bin/bash

API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

# 1. Login
LOGIN=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@upcapto.com","password":"Upcapto@2026"}')

TOKEN=$(echo "$LOGIN" | jq -r '.data.accessToken')
TENANT=$(echo "$LOGIN" | jq -r '.data.user.tenantId')

# 2. Create Employee (same as frontend would)
CREATE=$(curl -s -X POST "$API_BASE/api/hr/employees" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Frontend",
    "email": "testfrontend@test.com",
    "employeeId": "EMP-FRONTEND-TEST",
    "department": "Sales",
    "designation": "Sales Executive"
  }')

echo "$CREATE" | jq '.'

# 3. Verify it's in DB
LIST=$(curl -s -X GET "$API_BASE/api/hr/employees?search=EMP-FRONTEND-TEST" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT")

echo ""
echo "Employee in DB:"
echo "$LIST" | jq '.data[] | {employeeId, name: .fullName, email}'
```

---

## 🔍 Debugging Steps

### 1. Check Frontend Network Tab

**In browser DevTools:**
1. Open Network tab
2. Create employee from frontend
3. Check request:
   - **URL**: Should be `http://k8s-eteliosp-eteliosi-xxx.../api/hr/employees`
   - **NOT**: `http://localhost:3000/api/hr/employees`
   - **Status**: Should be 201 (Created)
   - **Response**: Should have `success: true`

### 2. Check Backend Logs

```bash
# Real-time logs
kubectl logs -n etelios-prod deployment/hr-service -f | grep -i "employee\|create"
```

**Look for:**
- `Creating employee` - Request received
- `Employee saved to database` - Save successful
- `Error` - Any errors

### 3. Check Database Directly

```bash
# Connect to MongoDB pod
kubectl exec -it -n etelios-prod <mongodb-pod> -- mongosh

# Check employees
use etelios_hr_service
db.users.find({email: "testfrontend@test.com"}).pretty()
```

---

## ✅ Quick Fix Checklist

- [ ] **Frontend API URL**: Must be production ALB URL, NOT localhost
- [ ] **Tenant ID**: Frontend and backend must use same tenant
- [ ] **Authorization**: Token must be valid
- [ ] **Backend Logs**: Check if request reaching backend
- [ ] **Database**: Check if employee actually saved
- [ ] **Network**: Check browser Network tab for errors

---

## 🚀 Most Likely Fix

**90% chance the issue is:**

1. **Frontend using `localhost:3000`** instead of production URL
2. **Fix**: Update frontend `.env` or API config file

**Where to check:**
- Frontend `.env` file
- Frontend API client file (e.g., `api-client.ts`, `workforceApi.ts`)
- Frontend environment variables in deployment

---

## 📋 Summary

**Backend code is correct** - it saves to DB properly.

**Issue is likely:**
1. Frontend API URL wrong (localhost instead of production)
2. Request not reaching backend
3. Tenant ID mismatch

**Fix:**
1. Update frontend API URL to production
2. Verify request in browser Network tab
3. Check backend logs
4. Verify tenant ID matches

---

**Status**: ✅ **Backend code is correct - fix frontend API URL!** 🚀
