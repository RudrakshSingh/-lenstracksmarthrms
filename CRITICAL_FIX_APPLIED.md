# Critical Fix Applied - AuthService Constructor Error

**Date**: 2026-01-02  
**Status**: ✅ Fixed

---

## 🔍 Problem Identified

**Error**: `AuthService is not a constructor`

**Root Cause**:
- `auth.service.js` exports an **instance**: `module.exports = new AuthService();`
- `authController.js` was trying to use it as a **class**: `new AuthService()`
- This caused routes to fail loading, resulting in 404 errors on POST endpoints

**Pod Logs Showed**:
```
❌ auth.routes.js FAILED to load {
  "error": "TypeError: AuthService is not a constructor"
}
```

---

## ✅ Fix Applied

### Changes Made

**File**: `microservices/auth-service/src/controllers/authController.js`

1. **Fixed Import**:
   ```javascript
   // Before:
   const AuthService = require('../services/auth.service');
   const authService = new AuthService();
   
   // After:
   const authService = require('../services/auth.service');
   ```

2. **Fixed Method Calls**:
   ```javascript
   // Before:
   await AuthService.login(...)
   await AuthService.refreshAccessToken(...)
   await AuthService.logout(...)
   await AuthService.updateUserProfile(...)
   await AuthService.changePassword(...)
   
   // After:
   await authService.login(...)
   await authService.refreshAccessToken(...)
   await authService.logout(...)
   await authService.updateUserProfile(...)
   await authService.changePassword(...)
   ```

---

## 🚀 Next Steps

### 1. Build and Push Fixed Image

```bash
# Login to ACR
az acr login --name eteliosacr-hvawabdbgge7e0fu

# Build auth service with fix
docker build -t eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest \
  -f microservices/auth-service/Dockerfile .

# Push to ACR
docker push eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest
```

### 2. Update Deployment

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

### 3. Verify Fix

```bash
# Check pod logs
kubectl logs -n etelios-backend-prod -l app=auth-service --tail=50 | grep "auth.routes.js loaded"

# Should show:
# ✅ auth.routes.js loaded successfully

# Test POST endpoint
curl -k -X POST "https://98.70.245.87/api/auth/mock-login-fast" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'

# Should return 200 OK (not 404)
```

### 4. Run Tests

```bash
node scripts/comprehensive-api-test.js
```

---

## 📊 Expected Results

### Before Fix
- ❌ `POST /api/auth/mock-login-fast` → 404
- ❌ `POST /api/auth/login` → 404
- ❌ Routes not loading
- ❌ Pods in CrashLoopBackOff

### After Fix
- ✅ `POST /api/auth/mock-login-fast` → 200 OK
- ✅ `POST /api/auth/login` → 200/401 (not 404)
- ✅ Routes loading successfully
- ✅ Pods running normally

---

## 🔍 Verification Checklist

- [ ] Code fix applied locally
- [ ] Image built successfully
- [ ] Image pushed to ACR
- [ ] Deployment updated
- [ ] Pods restarted
- [ ] Pod logs show "auth.routes.js loaded successfully"
- [ ] POST endpoints return 200/400/401 (not 404)
- [ ] Comprehensive test passes

---

## 📝 Notes

- This was a **critical bug** preventing all auth POST endpoints from working
- The fix is simple but essential - using the exported instance instead of trying to instantiate
- All other services using similar patterns should be checked

---

**Status**: ✅ Code Fixed  
**Action Required**: Build, push, and deploy  
**Priority**: 🔴 CRITICAL

