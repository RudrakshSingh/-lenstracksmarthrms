# Quick Deployment Steps - Auth Service Fix

**Status**: Code Fixed ✅ | Deployment Pending ❌

---

## 🚨 Current Situation

**Test Result**: POST endpoint still returning 404
```
Cannot POST /api/auth/mock-login-fast
```

**Reason**: Code fix applied locally but NOT deployed to production

---

## ✅ What's Fixed (Locally)

- ✅ AuthService import issue fixed
- ✅ All method calls updated
- ✅ Syntax check passed
- ✅ Code ready for deployment

---

## 🚀 Quick Deployment (3 Steps)

### Step 1: Build Image

```bash
cd /Users/rudrakshsingh/Desktop/lenstracksmarthrms

# Login to ACR
az acr login --name eteliosacr-hvawabdbgge7e0fu

# Build image
docker build -t eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest \
  -f microservices/auth-service/Dockerfile .
```

**Time**: 5-10 minutes

### Step 2: Push Image

```bash
# Push to ACR
docker push eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest
```

**Time**: 2-5 minutes

### Step 3: Deploy

```bash
# Update deployment
kubectl set image deployment/auth-service \
  auth-service=eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest \
  -n etelios-backend-prod

# Restart deployment
kubectl rollout restart deployment/auth-service -n etelios-backend-prod

# Wait for rollout (optional but recommended)
kubectl rollout status deployment/auth-service -n etelios-backend-prod --timeout=5m
```

**Time**: 2-5 minutes

---

## ✅ Verify Deployment

### Check Pod Status

```bash
kubectl get pods -n etelios-backend-prod -l app=auth-service
```

**Expected**: Pods should be `Running` (not `CrashLoopBackOff`)

### Check Pod Logs

```bash
kubectl logs -n etelios-backend-prod -l app=auth-service --tail=50 | grep "auth.routes.js loaded"
```

**Expected**: Should show `✅ auth.routes.js loaded successfully`

### Test POST Endpoint

```bash
curl -k -X POST "https://98.70.245.87/api/auth/mock-login-fast" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'
```

**Expected**: Should return JSON with token (not HTML 404 error)

---

## 🧪 After Deployment: Test Data Persistence

Once POST endpoint works:

```bash
node scripts/test-data-persistence.js
```

---

## ⚠️ Common Issues

### Issue: Docker build fails
**Solution**: Check Dockerfile and ensure all files exist
```bash
ls -la microservices/auth-service/
ls -la microservices/shared/
```

### Issue: Image push fails
**Solution**: Verify ACR login
```bash
az acr login --name eteliosacr-hvawabdbgge7e0fu
az acr repository list --name eteliosacr-hvawabdbgge7e0fu
```

### Issue: Pods still crashing
**Solution**: Check pod logs for errors
```bash
kubectl logs -n etelios-backend-prod -l app=auth-service --tail=100
```

### Issue: Still getting 404 after deployment
**Solution**: 
1. Verify new image is being used
2. Check pod logs for route loading
3. Force delete pod to get fresh one
```bash
kubectl delete pod -n etelios-backend-prod -l app=auth-service
```

---

## 📋 One-Line Commands (Copy-Paste Ready)

```bash
# Complete deployment in one go
az acr login --name eteliosacr-hvawabdbgge7e0fu && \
docker build -t eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest -f microservices/auth-service/Dockerfile . && \
docker push eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest && \
kubectl set image deployment/auth-service auth-service=eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest -n etelios-backend-prod && \
kubectl rollout restart deployment/auth-service -n etelios-backend-prod
```

---

## ⏱️ Estimated Time

- **Build**: 5-10 minutes
- **Push**: 2-5 minutes  
- **Deploy**: 2-5 minutes
- **Total**: ~15-20 minutes

---

## 🎯 Success Indicators

After deployment, you should see:

1. ✅ Pods in `Running` state
2. ✅ Pod logs show "auth.routes.js loaded successfully"
3. ✅ POST /api/auth/mock-login-fast returns 200 OK
4. ✅ Can get auth token
5. ✅ Data persistence test can run

---

**Status**: Ready to Deploy  
**Priority**: 🔴 CRITICAL  
**Action**: Run deployment steps above

