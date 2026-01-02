# ACR URL Fix - Auth & Attendance Services

## Issue
Auth and Attendance services were using the wrong ACR URL, causing them to pull the first deployed image instead of the latest one.

## Problem
- **Wrong ACR URL**: `eteliosacr.azurecr.io`
- **Correct ACR URL**: `eteliosacr-hvawabdbgge7e0fu.azurecr.io`

## Fix Applied

### Auth Service
```bash
kubectl set image deployment/auth-service \
  auth-service=eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest \
  -n etelios-backend-prod
```

### Attendance Service
```bash
kubectl set image deployment/attendance-service \
  attendance-service=eteliosacr-hvawabdbgge7e0fu.azurecr.io/attendance-service:latest \
  -n etelios-backend-prod
```

## Verification

### Check Deployment Images
```bash
# Auth Service
kubectl get deployment auth-service -n etelios-backend-prod \
  -o jsonpath='{.spec.template.spec.containers[0].image}'

# Attendance Service
kubectl get deployment attendance-service -n etelios-backend-prod \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

### Check Pod Status
```bash
kubectl get pods -n etelios-backend-prod | grep -E "(auth-service|attendance-service)"
```

## Expected Result

After the fix:
- ✅ Auth service will pull from correct ACR
- ✅ Attendance service will pull from correct ACR
- ✅ Both services will use latest images
- ✅ ImagePullBackOff errors should resolve
- ✅ New pods will start with latest code

## Status

- ✅ Auth Service: Fixed
- ✅ Attendance Service: Fixed
- ✅ HR Service: Already fixed earlier

All three services now use the correct ACR URL.

---

**Date**: 2026-01-01  
**Namespace**: etelios-backend-prod  
**Correct ACR**: eteliosacr-hvawabdbgge7e0fu.azurecr.io

