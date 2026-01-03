# Deployment Required - Before Testing Data Persistence

**Date**: 2026-01-02  
**Status**: 🔴 CRITICAL - Deployment Required

---

## 🚨 Current Situation

### Test Results
```
❌ Data Persistence Test: FAILED
   Reason: Cannot get auth token
   Status: 404 on POST /api/auth/mock-login-fast
```

### Root Cause
- ✅ **Code Fix**: Applied locally
- ❌ **Deployment**: NOT done yet
- ❌ **Production**: Still running old buggy code

---

## ✅ What's Fixed (Locally)

1. **AuthService Import Issue**:
   - Changed from `new AuthService()` to using exported instance
   - Fixed all method calls: `AuthService.method()` → `authService.method()`
   - Syntax check passed

2. **Files Modified**:
   - `microservices/auth-service/src/controllers/authController.js`

---

## ❌ What's NOT Deployed

1. **Docker Image**: Not built with fix
2. **ACR**: Not pushed
3. **Kubernetes**: Pods still running old code
4. **Routes**: Not loading (causing 404)

---

## 🚀 Deployment Steps

### Step 1: Build Image

```bash
# Navigate to project root
cd /Users/rudrakshsingh/Desktop/lenstracksmarthrms

# Login to ACR
az acr login --name eteliosacr-hvawabdbgge7e0fu

# Build auth service image
docker build -t eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest \
  -f microservices/auth-service/Dockerfile .
```

**Expected**: Build completes successfully

### Step 2: Push Image

```bash
# Push to ACR
docker push eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest
```

**Expected**: Image pushed successfully

### Step 3: Update Deployment

```bash
# Update deployment to use new image
kubectl set image deployment/auth-service \
  auth-service=eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest \
  -n etelios-backend-prod

# Restart deployment
kubectl rollout restart deployment/auth-service -n etelios-backend-prod
```

**Expected**: Deployment updated and pods restarting

### Step 4: Wait for Rollout

```bash
# Wait for rollout to complete
kubectl rollout status deployment/auth-service -n etelios-backend-prod --timeout=5m
```

**Expected**: Rollout completes successfully

### Step 5: Verify Fix

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

---

## 🧪 After Deployment: Test Data Persistence

Once deployment is complete and auth endpoints work:

```bash
# Run data persistence test
node scripts/test-data-persistence.js
```

**Expected Results**:
- ✅ Auth token obtained
- ✅ Employee created
- ✅ Attendance marked
- ✅ Data saved to database
- ✅ Data retrievable

---

## 📊 Verification Checklist

Before testing data persistence:

- [ ] Image built successfully
- [ ] Image pushed to ACR
- [ ] Deployment updated
- [ ] Pods restarted
- [ ] Pod logs show "auth.routes.js loaded successfully"
- [ ] POST /api/auth/mock-login-fast returns 200 (not 404)
- [ ] Can get auth token
- [ ] Ready to test data persistence

---

## ⚠️ Important Notes

1. **Don't Test Yet**: Data persistence test will fail until auth service is fixed
2. **Deploy First**: Must deploy fix before testing
3. **Verify Fix**: Check pod logs to confirm routes are loading
4. **Then Test**: Run data persistence test after deployment

---

## 🎯 Quick Reference

**Build & Deploy**:
```bash
docker build -t eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest -f microservices/auth-service/Dockerfile .
docker push eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest
kubectl set image deployment/auth-service auth-service=eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest -n etelios-backend-prod
kubectl rollout restart deployment/auth-service -n etelios-backend-prod
```

**Test After Deployment**:
```bash
node scripts/test-data-persistence.js
```

---

**Status**: ⏸️ Waiting for Deployment  
**Priority**: 🔴 CRITICAL  
**Action**: Deploy fixed auth-service image

