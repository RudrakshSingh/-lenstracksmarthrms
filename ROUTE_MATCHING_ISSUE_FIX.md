# 🔍 Route Matching Issue - Cannot GET /api/hr/*

## ❌ Problem

All `/api/hr/*` routes returning:
```
Cannot GET /api/hr/stores
Cannot GET /api/hr/employees  
Cannot GET /api/hr/departments
```

This is Express.js 404 error, meaning routes aren't matching.

---

## ✅ What's Working

- `/api/hr` → 200 ✅ (Base route works)
- Service is running ✅
- Authentication token works ✅
- Routes are defined in code ✅

---

## 🔍 Root Cause Analysis

### Routes Are Defined:
- `router.get('/stores', ...)` → Should be `/api/hr/stores`
- `router.get('/employees', ...)` → Should be `/api/hr/employees`
- `router.get('/departments', ...)` → Should be `/api/hr/departments`

### Router Is Mounted:
- `app.use('/api/hr', apiRateLimit, hrRoutes);` ✅

### But Routes Don't Match:
- Express 404 suggests route isn't registered OR path mismatch

---

## 🛠️ Possible Causes

### 1. Route Registration Issue
Routes file might not be loading properly, or there's an error during registration.

### 2. Path Forwarding Issue
ALB might be modifying the path before forwarding to service.

### 3. Middleware Blocking
Middleware might be blocking requests before they reach routes.

### 4. Service Version Mismatch
Running service might be an older version without these routes.

---

## 🔧 Solutions

### Solution 1: Check Service Logs
```bash
# Check hr-service logs
kubectl logs -n etelios-prod -l app=hr-service --tail=100

# Look for:
# - Route registration errors
# - "hr.routes.js loaded successfully"
# - Any path-related errors
```

### Solution 2: Verify Route Registration
Check if routes are actually being registered by checking service startup logs.

### Solution 3: Test Direct Service Access
```bash
# Port-forward to service
kubectl port-forward -n etelios-prod svc/hr-service 3002:3002

# Test locally
curl http://localhost:3002/api/hr/stores \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: lenstrack"
```

### Solution 4: Check Service Version
```bash
# Get service image version
kubectl get deployment hr-service -n etelios-prod -o jsonpath='{.spec.template.spec.containers[0].image}'

# Verify it's the latest version with routes
```

### Solution 5: Restart Service
```bash
# Restart hr-service to reload routes
kubectl rollout restart deployment/hr-service -n etelios-prod

# Wait for rollout
kubectl rollout status deployment/hr-service -n etelios-prod
```

---

## 🚀 Immediate Action

**Most likely:** Service needs restart to load routes, OR service version is outdated.

**Try this first:**
```bash
# Restart hr-service
kubectl rollout restart deployment/hr-service -n etelios-prod

# Wait 2-3 minutes, then test again
curl -sk https://api.etelios.com/api/hr/stores \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: lenstrack"
```

---

## 📊 Next Steps

1. **Check service logs** for route registration
2. **Restart service** to reload routes
3. **Verify service version** is latest
4. **Test direct service access** via port-forward

---

**Most likely fix: Restart hr-service deployment to reload routes.**
