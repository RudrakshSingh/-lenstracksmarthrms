# Data Persistence Test Status

**Date**: 2026-01-02  
**Status**: ⏸️ Blocked - Waiting for Auth Service Fix Deployment

---

## 🧪 Test Attempted

**Test Script**: `scripts/test-data-persistence.js`

**Purpose**: Verify that data is being saved to databases when:
1. Creating employees (HR Service)
2. Marking attendance (Attendance Service)
3. Database connections are working

---

## ❌ Test Results

### Current Status: **BLOCKED**

**Reason**: Auth POST endpoints still returning 404

```
❌ Failed to get auth token
   Status: 404
   Response: "Cannot POST /api/auth/mock-login-fast"
```

**Impact**: Cannot test data persistence because:
- Cannot get authentication token
- Cannot create employees (requires auth)
- Cannot mark attendance (requires auth)

---

## 🔍 Root Cause

### Code Fix Status

- ✅ **Code Fix Applied**: `AuthService` import issue fixed locally
- ❌ **Not Deployed**: Fix not yet in production Docker image
- ❌ **Pods Running Old Code**: Production pods still have the bug

### Current Pod Status

- Some pods in `CrashLoopBackOff` (old code with bug)
- Some pods `Running` but with old code (routes not loading)
- New fixed image not yet built/pushed

---

## 🚀 Required Actions

### Step 1: Build Fixed Image

```bash
# Login to ACR
az acr login --name eteliosacr-hvawabdbgge7e0fu

# Build auth service with fix
docker build -t eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest \
  -f microservices/auth-service/Dockerfile .

# Push to ACR
docker push eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest
```

### Step 2: Deploy Fixed Image

```bash
# Update deployment
kubectl set image deployment/auth-service \
  auth-service=eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest \
  -n etelios-backend-prod

# Restart deployment
kubectl rollout restart deployment/auth-service -n etelios-backend-prod

# Wait for rollout
kubectl rollout status deployment/auth-service -n etelios-backend-prod --timeout=5m
```

### Step 3: Verify Fix

```bash
# Check pod logs
kubectl logs -n etelios-backend-prod -l app=auth-service --tail=50 | grep "auth.routes.js loaded"

# Should show: ✅ auth.routes.js loaded successfully

# Test POST endpoint
curl -k -X POST "https://98.70.245.87/api/auth/mock-login-fast" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'

# Should return: 200 OK (not 404)
```

### Step 4: Test Data Persistence

```bash
# Run data persistence test
node scripts/test-data-persistence.js
```

---

## 📊 Expected Test Flow (After Fix)

1. **Get Auth Token** → `POST /api/auth/mock-login-fast` → 200 OK
2. **Create Employee** → `POST /api/hr/employees` → 201 Created
3. **Clock In** → `POST /api/attendance/clock-in` → 200 OK
4. **Clock Out** → `POST /api/attendance/clock-out` → 200 OK
5. **Get Records** → `GET /api/attendance/records` → 200 OK with data
6. **Verify Database** → Health checks show DB connected

---

## ✅ What Will Be Tested

### HR Service
- ✅ Employee creation
- ✅ Data saved to `etelios_hr_service` database
- ✅ Employee document in `users` collection
- ✅ Employee document in `employees` collection

### Attendance Service
- ✅ Clock in/out operations
- ✅ Data saved to `attendance-db` database
- ✅ Attendance records in `attendances` collection
- ✅ Records retrievable via API

### Database Connections
- ✅ HR Service → `etelios_hr_service` database
- ✅ Attendance Service → `attendance-db` database
- ✅ Connections healthy and working

---

## 📋 Test Checklist

After deployment, the test will verify:

- [ ] Auth token can be obtained
- [ ] Employee can be created
- [ ] Employee data saved to database
- [ ] Attendance can be marked
- [ ] Attendance data saved to database
- [ ] Data can be retrieved
- [ ] Database connections working
- [ ] No data going to test databases

---

## 🎯 Success Criteria

**Test will PASS when**:
- ✅ All 4 test steps complete successfully
- ✅ Employee created and saved
- ✅ Attendance marked and saved
- ✅ Data retrievable from database
- ✅ Database connections verified

**Test will FAIL if**:
- ❌ Cannot get auth token
- ❌ Cannot create employee
- ❌ Cannot mark attendance
- ❌ Data not saved to database
- ❌ Database connections failing

---

## 📝 Notes

1. **Current Block**: Auth service fix not deployed
2. **Next Step**: Deploy fixed image
3. **Then**: Run data persistence test
4. **Expected**: All tests should pass after deployment

---

**Status**: ⏸️ Waiting for Auth Service Fix Deployment  
**Action Required**: Build and deploy fixed auth-service image  
**Test Script Ready**: `scripts/test-data-persistence.js`

