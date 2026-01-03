# Image Issue Fix Guide

**Date**: 2026-01-02  
**Purpose**: Fix HR Service image issues in production

---

## 🔍 Common Image Issues

### Issue 1: ImagePullBackOff / ErrImagePull
**Symptom**: Pods stuck in `ImagePullBackOff` or `ErrImagePull` state
**Cause**: 
- Wrong ACR URL
- Image doesn't exist
- ACR authentication failed
- Network issues

### Issue 2: Wrong Image Version
**Symptom**: Old code running despite new deployment
**Cause**:
- Deployment not updated
- Using cached image
- Wrong image tag

### Issue 3: Image Not Found
**Symptom**: `Image not found` error
**Cause**:
- Image not built/pushed
- Wrong image name
- Wrong ACR registry

---

## 🔧 Quick Fix Commands

### Fix 1: Update Image in Deployment

```bash
# Set correct image
kubectl set image deployment/hr-service \
  hr-service=eteliosacr-hvawabdbgge7e0fu.azurecr.io/hr-service:latest \
  -n etelios-backend-prod

# Restart deployment
kubectl rollout restart deployment/hr-service -n etelios-backend-prod

# Check status
kubectl rollout status deployment/hr-service -n etelios-backend-prod
```

### Fix 2: Force Pod Restart

```bash
# Delete pods to force restart
kubectl delete pods -n etelios-backend-prod -l app=hr-service

# Wait for new pods
kubectl get pods -n etelios-backend-prod -l app=hr-service -w
```

### Fix 3: Check and Fix ACR URL

```bash
# Check current image
kubectl get deployment hr-service -n etelios-backend-prod \
  -o jsonpath='{.spec.template.spec.containers[0].image}'

# Update if wrong
kubectl set image deployment/hr-service \
  hr-service=eteliosacr-hvawabdbgge7e0fu.azurecr.io/hr-service:latest \
  -n etelios-backend-prod
```

### Fix 4: Verify Image Exists in ACR

```bash
# Login to ACR
az acr login --name eteliosacr-hvawabdbgge7e0fu

# List images
az acr repository list --name eteliosacr-hvawabdbgge7e0fu

# Check hr-service tags
az acr repository show-tags --name eteliosacr-hvawabdbgge7e0fu \
  --repository hr-service
```

---

## 🚀 Automated Fix Script

### Run the fix script:

```bash
chmod +x scripts/fix-hr-service-image.sh
./scripts/fix-hr-service-image.sh
```

**What it does:**
1. Checks current deployment image
2. Checks for image pull errors
3. Updates image if wrong
4. Restarts deployment
5. Waits for rollout
6. Shows final status

---

## 📋 Step-by-Step Manual Fix

### Step 1: Check Current Status

```bash
# Check deployment
kubectl get deployment hr-service -n etelios-backend-prod

# Check pods
kubectl get pods -n etelios-backend-prod | grep hr-service

# Check image
kubectl get deployment hr-service -n etelios-backend-prod \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

### Step 2: Check for Errors

```bash
# Check pod events
kubectl describe pod <pod-name> -n etelios-backend-prod | grep -A 10 Events

# Check pod logs
kubectl logs <pod-name> -n etelios-backend-prod
```

### Step 3: Fix Image

```bash
# Update image
kubectl set image deployment/hr-service \
  hr-service=eteliosacr-hvawabdbgge7e0fu.azurecr.io/hr-service:latest \
  -n etelios-backend-prod

# Restart
kubectl rollout restart deployment/hr-service -n etelios-backend-prod
```

### Step 4: Verify

```bash
# Check rollout status
kubectl rollout status deployment/hr-service -n etelios-backend-prod

# Check pods
kubectl get pods -n etelios-backend-prod | grep hr-service

# Test endpoint
curl -k https://98.70.245.87/api/hr/health -H "Host: api.etelios.com"
```

---

## 🔍 Troubleshooting

### Problem: ImagePullBackOff

**Solution:**
```bash
# 1. Check ACR authentication
az acr login --name eteliosacr-hvawabdbgge7e0fu

# 2. Verify image exists
az acr repository show-tags --name eteliosacr-hvawabdbgge7e0fu \
  --repository hr-service

# 3. Update deployment
kubectl set image deployment/hr-service \
  hr-service=eteliosacr-hvawabdbgge7e0fu.azurecr.io/hr-service:latest \
  -n etelios-backend-prod

# 4. Delete problematic pods
kubectl delete pods -n etelios-backend-prod -l app=hr-service
```

### Problem: Wrong ACR URL

**Solution:**
```bash
# Check current URL
kubectl get deployment hr-service -n etelios-backend-prod \
  -o jsonpath='{.spec.template.spec.containers[0].image}'

# Update to correct URL
kubectl set image deployment/hr-service \
  hr-service=eteliosacr-hvawabdbgge7e0fu.azurecr.io/hr-service:latest \
  -n etelios-backend-prod
```

### Problem: Old Image Running

**Solution:**
```bash
# Force restart
kubectl rollout restart deployment/hr-service -n etelios-backend-prod

# Or delete pods
kubectl delete pods -n etelios-backend-prod -l app=hr-service
```

---

## ✅ Verification

### 1. Check Pod Status
```bash
kubectl get pods -n etelios-backend-prod | grep hr-service
```
**Expected**: All pods in `Running` state

### 2. Check Image
```bash
kubectl get deployment hr-service -n etelios-backend-prod \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```
**Expected**: `eteliosacr-hvawabdbgge7e0fu.azurecr.io/hr-service:latest`

### 3. Test Endpoint
```bash
curl -k https://98.70.245.87/api/hr/health -H "Host: api.etelios.com"
```
**Expected**: `{"success":true,...}`

### 4. Check Logs
```bash
kubectl logs -n etelios-backend-prod -l app=hr-service --tail=50
```
**Expected**: No errors, service started successfully

---

## 📝 Notes

- **Image Tag**: Using `latest` tag ensures latest image is pulled
- **Rollout Time**: Usually takes 1-2 minutes
- **Pod Restart**: May cause brief downtime
- **ACR Access**: Ensure AKS has access to ACR

---

**Status**: ✅ **Fix Script Ready**

