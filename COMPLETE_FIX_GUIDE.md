# Complete Fix Guide - All Issues

**Date**: 2026-01-02  
**Status**: Step-by-step fix instructions

---

## 📋 Issues to Fix

1. ❌ Auth Service POST endpoints returning 404
2. ❌ Tenant Registry Service not accessible
3. ❌ All services using wrong ACR URL
4. ❌ Code fixes not deployed to production

---

## 🔧 Fix Steps

### STEP 1: Fix ACR URLs for All Services

**Problem**: All deployments using wrong ACR URL (`eteliosacr.azurecr.io` instead of `eteliosacr-hvawabdbgge7e0fu.azurecr.io`)

**Solution**: Run the fix script

```bash
# Run the automated fix script
bash scripts/fix-all-acr-urls.sh
```

**OR Manual Fix** (if script doesn't work):

```bash
# For each service, update the image URL
kubectl set image deployment/auth-service auth-service=eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest -n etelios-backend-prod
kubectl set image deployment/hr-service hr-service=eteliosacr-hvawabdbgge7e0fu.azurecr.io/hr-service:latest -n etelios-backend-prod
kubectl set image deployment/attendance-service attendance-service=eteliosacr-hvawabdbgge7e0fu.azurecr.io/attendance-service:latest -n etelios-backend-prod
kubectl set image deployment/tenant-registry-service tenant-registry-service=eteliosacr-hvawabdbgge7e0fu.azurecr.io/tenant-registry-service:latest -n etelios-backend-prod

# Restart deployments
kubectl rollout restart deployment/auth-service -n etelios-backend-prod
kubectl rollout restart deployment/hr-service -n etelios-backend-prod
kubectl rollout restart deployment/attendance-service -n etelios-backend-prod
kubectl rollout restart deployment/tenant-registry-service -n etelios-backend-prod
```

**Verify**:
```bash
kubectl get pods -n etelios-backend-prod | grep -E "ImagePullBackOff|ErrImagePull"
# Should return no results
```

---

### STEP 2: Build and Push Updated Images

**Problem**: Code fixes are in local code but not in Docker images

#### 2.1: Build Auth Service Image

```bash
# Navigate to project root
cd /Users/rudrakshsingh/Desktop/lenstracksmarthrms

# Login to ACR
az acr login --name eteliosacr-hvawabdbgge7e0fu

# Build auth service image
docker build -t eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest \
  -f microservices/auth-service/Dockerfile .

# Push to ACR
docker push eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest
```

#### 2.2: Build Tenant Registry Service Image

```bash
# Build tenant registry service image
docker build -t eteliosacr-hvawabdbgge7e0fu.azurecr.io/tenant-registry-service:latest \
  -f microservices/tenant-registry-service/Dockerfile .

# Push to ACR
docker push eteliosacr-hvawabdbgge7e0fu.azurecr.io/tenant-registry-service:latest
```

#### 2.3: Build HR Service Image (if needed)

```bash
# Build HR service image
docker build -t eteliosacr-hvawabdbgge7e0fu.azurecr.io/hr-service:latest \
  -f microservices/hr-service/Dockerfile .

# Push to ACR
docker push eteliosacr-hvawabdbgge7e0fu.azurecr.io/hr-service:latest
```

#### 2.4: Build Attendance Service Image (if needed)

```bash
# Build attendance service image
docker build -t eteliosacr-hvawabdbgge7e0fu.azurecr.io/attendance-service:latest \
  -f microservices/attendance-service/Dockerfile .

# Push to ACR
docker push eteliosacr-hvawabdbgge7e0fu.azurecr.io/attendance-service:latest
```

**Verify Images**:
```bash
az acr repository list --name eteliosacr-hvawabdbgge7e0fu --output table
az acr repository show-tags --name eteliosacr-hvawabdbgge7e0fu --repository auth-service --output table
```

---

### STEP 3: Update Deployments to Use New Images

**After building and pushing images, update deployments**:

```bash
# Update auth service
kubectl set image deployment/auth-service \
  auth-service=eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest \
  -n etelios-backend-prod

# Update tenant registry service
kubectl set image deployment/tenant-registry-service \
  tenant-registry-service=eteliosacr-hvawabdbgge7e0fu.azurecr.io/tenant-registry-service:latest \
  -n etelios-backend-prod

# Force pull new images
kubectl rollout restart deployment/auth-service -n etelios-backend-prod
kubectl rollout restart deployment/tenant-registry-service -n etelios-backend-prod
```

**Verify Deployment**:
```bash
# Check rollout status
kubectl rollout status deployment/auth-service -n etelios-backend-prod
kubectl rollout status deployment/tenant-registry-service -n etelios-backend-prod

# Check pods
kubectl get pods -n etelios-backend-prod -l app=auth-service
kubectl get pods -n etelios-backend-prod -l app=tenant-registry-service
```

---

### STEP 4: Verify Pods Are Running

```bash
# Check all pods status
kubectl get pods -n etelios-backend-prod

# Check for errors
kubectl get pods -n etelios-backend-prod | grep -E "Error|CrashLoopBackOff|ImagePullBackOff"

# Check pod logs
kubectl logs -n etelios-backend-prod -l app=auth-service --tail=50
kubectl logs -n etelios-backend-prod -l app=tenant-registry-service --tail=50
```

**Expected**: All pods should be in `Running` state with `Ready: 1/1` or `2/2`

---

### STEP 5: Test APIs

#### 5.1: Quick Health Checks

```bash
# Auth service
curl -k -H "Host: api.etelios.com" https://98.70.245.87/api/auth/health

# HR service
curl -k -H "Host: api.etelios.com" https://98.70.245.87/api/hr/health

# Attendance service
curl -k -H "Host: api.etelios.com" https://98.70.245.87/api/attendance/health

# Tenant registry service
curl -k -H "Host: api.etelios.com" https://98.70.245.87/health
```

#### 5.2: Test Auth POST Endpoints

```bash
# Test mock login
curl -k -X POST "https://98.70.245.87/api/auth/mock-login-fast" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'

# Test login
curl -k -X POST "https://98.70.245.87/api/auth/login" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{"emailOrEmployeeId":"test","password":"test"}'
```

**Expected**: Should return 200 or 401 (not 404)

#### 5.3: Run Comprehensive Tests

```bash
# Run full API test
node scripts/comprehensive-api-test.js

# Run full flow test
node scripts/test-full-flow-tenant-to-attendance.js
```

---

### STEP 6: Verify Ingress Configuration

**Check if tenant-registry-service ingress is configured**:

```bash
# Check ingress
kubectl get ingress -n etelios-backend-prod

# Check ingress details
kubectl describe ingress -n etelios-backend-prod | grep -A 10 "tenant"
```

**If tenant-registry-service ingress is missing, add it**:

```bash
# Check current ingress config
kubectl get ingress -n etelios-backend-prod -o yaml > ingress-backup.yaml

# Edit ingress to add tenant-registry-service routes
# (This may require manual editing of the ingress YAML)
```

---

## 🚀 Quick Fix Script (All-in-One)

Create and run this script to fix everything at once:

```bash
#!/bin/bash

# Complete Fix Script
NAMESPACE="etelios-backend-prod"
ACR="eteliosacr-hvawabdbgge7e0fu.azurecr.io"

echo "🔧 Starting Complete Fix Process..."

# Step 1: Login to ACR
echo "📝 Step 1: Logging into ACR..."
az acr login --name eteliosacr-hvawabdbgge7e0fu

# Step 2: Build and push images
echo "📦 Step 2: Building and pushing images..."

# Auth service
echo "  Building auth-service..."
docker build -t $ACR/auth-service:latest -f microservices/auth-service/Dockerfile . || exit 1
docker push $ACR/auth-service:latest || exit 1

# Tenant registry service
echo "  Building tenant-registry-service..."
docker build -t $ACR/tenant-registry-service:latest -f microservices/tenant-registry-service/Dockerfile . || exit 1
docker push $ACR/tenant-registry-service:latest || exit 1

# Step 3: Update deployments
echo "🔄 Step 3: Updating deployments..."

kubectl set image deployment/auth-service auth-service=$ACR/auth-service:latest -n $NAMESPACE
kubectl set image deployment/tenant-registry-service tenant-registry-service=$ACR/tenant-registry-service:latest -n $NAMESPACE

# Step 4: Restart deployments
echo "🔄 Step 4: Restarting deployments..."
kubectl rollout restart deployment/auth-service -n $NAMESPACE
kubectl rollout restart deployment/tenant-registry-service -n $NAMESPACE

# Step 5: Wait for rollout
echo "⏳ Step 5: Waiting for rollouts..."
kubectl rollout status deployment/auth-service -n $NAMESPACE --timeout=5m
kubectl rollout status deployment/tenant-registry-service -n $NAMESPACE --timeout=5m

echo "✅ Fix process completed!"
echo ""
echo "🧪 Run tests:"
echo "   node scripts/comprehensive-api-test.js"
```

---

## 📋 Checklist

Use this checklist to track progress:

- [ ] Step 1: Fix ACR URLs for all services
- [ ] Step 2: Build auth-service image
- [ ] Step 2: Build tenant-registry-service image
- [ ] Step 2: Push all images to ACR
- [ ] Step 3: Update deployments
- [ ] Step 3: Restart deployments
- [ ] Step 4: Verify pods are running
- [ ] Step 5: Test health endpoints
- [ ] Step 5: Test auth POST endpoints
- [ ] Step 5: Run comprehensive tests
- [ ] Step 6: Verify ingress configuration

---

## 🔍 Troubleshooting

### Issue: Image build fails

**Solution**:
```bash
# Check Dockerfile syntax
docker build --no-cache -t test-image -f microservices/auth-service/Dockerfile .

# Check for missing files
ls -la microservices/auth-service/
ls -la microservices/shared/
```

### Issue: Image push fails

**Solution**:
```bash
# Verify ACR login
az acr login --name eteliosacr-hvawabdbgge7e0fu

# Check ACR permissions
az acr repository list --name eteliosacr-hvawabdbgge7e0fu
```

### Issue: Pods not starting

**Solution**:
```bash
# Check pod events
kubectl describe pod <pod-name> -n etelios-backend-prod

# Check pod logs
kubectl logs <pod-name> -n etelios-backend-prod

# Check deployment
kubectl describe deployment <service-name> -n etelios-backend-prod
```

### Issue: Still getting 404 on POST endpoints

**Solution**:
```bash
# Check if new image is being used
kubectl get pod <pod-name> -n etelios-backend-prod -o jsonpath='{.spec.containers[0].image}'

# Check pod logs for route loading
kubectl logs <pod-name> -n etelios-backend-prod | grep "auth.routes.js"

# Force delete pod to get new one
kubectl delete pod <pod-name> -n etelios-backend-prod
```

---

## 📊 Expected Results After Fix

### Auth Service
- ✅ `POST /api/auth/mock-login-fast` → 200 OK
- ✅ `POST /api/auth/login` → 200/401 (not 404)
- ✅ `POST /api/auth/register` → 201/400 (not 404)

### Tenant Registry Service
- ✅ `GET /health` → 200 OK
- ✅ `GET /api/tenants` → 200 OK (with auth)

### All Services
- ✅ No ImagePullBackOff errors
- ✅ All pods running
- ✅ All health checks passing

---

## 🎯 Quick Reference Commands

```bash
# Check all service images
bash scripts/check-all-service-images.sh

# Fix all ACR URLs
bash scripts/fix-all-acr-urls.sh

# Test all APIs
node scripts/comprehensive-api-test.js

# Test full flow
node scripts/test-full-flow-tenant-to-attendance.js
```

---

**Status**: Ready to execute  
**Estimated Time**: 30-60 minutes  
**Priority**: HIGH - Blocks all authenticated operations

