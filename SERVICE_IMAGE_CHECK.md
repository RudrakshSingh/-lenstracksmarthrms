# Service Image Status Check

**Date**: 2026-01-02  
**Purpose**: Verify all services are using latest images

---

## 🔍 How to Check

### Option 1: Using kubectl (Recommended)
```bash
kubectl get deployments -n etelios-backend-prod \
  -o custom-columns=NAME:.metadata.name,IMAGE:.spec.template.spec.containers[0].image
```

### Option 2: Using Script
```bash
./scripts/check-service-images.sh
```

### Option 3: Check Individual Service
```bash
kubectl get deployment <service-name> -n etelios-backend-prod \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

---

## 📋 Expected Images

All services should use:
- **ACR**: `eteliosacr-hvawabdbgge7e0fu.azurecr.io`
- **Tag**: `latest` (for automatic updates) OR specific version tag

### Service Images
- `auth-service`: `eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest`
- `hr-service`: `eteliosacr-hvawabdbgge7e0fu.azurecr.io/hr-service:latest`
- `attendance-service`: `eteliosacr-hvawabdbgge7e0fu.azurecr.io/attendance-service:latest`
- `tenant-registry-service`: `eteliosacr-hvawabdbgge7e0fu.azurecr.io/tenant-registry-service:latest`
- `tenant-management-service`: `eteliosacr-hvawabdbgge7e0fu.azurecr.io/tenant-management-service:latest`

---

## ✅ Status Indicators

### ✅ Using Latest
- Image tag is `latest`
- Will automatically pull new images when pipeline runs

### ⚠️ Using Specific Tag
- Image has specific version tag (e.g., `v1.0.0`, `20260102`)
- Needs manual update to pull new images

### ❌ Wrong ACR
- Image not from expected ACR
- Needs update to correct ACR URL

---

## 🔧 Update Image to Latest

### Update Single Service
```bash
kubectl set image deployment/<service-name> \
  <service-name>=eteliosacr-hvawabdbgge7e0fu.azurecr.io/<service-name>:latest \
  -n etelios-backend-prod
```

### Update All Services
```bash
# Auth Service
kubectl set image deployment/auth-service \
  auth-service=eteliosacr-hvawabdbgge7e0fu.azurecr.io/auth-service:latest \
  -n etelios-backend-prod

# HR Service
kubectl set image deployment/hr-service \
  hr-service=eteliosacr-hvawabdbgge7e0fu.azurecr.io/hr-service:latest \
  -n etelios-backend-prod

# Attendance Service
kubectl set image deployment/attendance-service \
  attendance-service=eteliosacr-hvawabdbgge7e0fu.azurecr.io/attendance-service:latest \
  -n etelios-backend-prod

# Tenant Registry Service
kubectl set image deployment/tenant-registry-service \
  tenant-registry-service=eteliosacr-hvawabdbgge7e0fu.azurecr.io/tenant-registry-service:latest \
  -n etelios-backend-prod

# Tenant Management Service
kubectl set image deployment/tenant-management-service \
  tenant-management-service=eteliosacr-hvawabdbgge7e0fu.azurecr.io/tenant-management-service:latest \
  -n etelios-backend-prod
```

### Restart Deployment (Force Pull)
```bash
kubectl rollout restart deployment/<service-name> -n etelios-backend-prod
```

---

## 📊 Check Pod Status

### Get Pod Status
```bash
kubectl get pods -n etelios-backend-prod
```

### Check Specific Service Pods
```bash
kubectl get pods -n etelios-backend-prod -l app=<service-name>
```

### Check Pod Image
```bash
kubectl get pod <pod-name> -n etelios-backend-prod \
  -o jsonpath='{.spec.containers[0].image}'
```

---

## ⚠️ Common Issues

### ImagePullBackOff
- **Cause**: Cannot pull image from ACR
- **Solution**: Check ACR URL, credentials, network access

### ErrImagePull
- **Cause**: Image not found or access denied
- **Solution**: Verify image exists in ACR, check permissions

### Using Old Image
- **Cause**: Deployment not updated after code changes
- **Solution**: Update deployment image or restart deployment

---

## 🔍 Verification Steps

1. **Check Current Images**: Use kubectl to see what images are deployed
2. **Compare with Latest**: Check ACR for latest image tags
3. **Update if Needed**: Update deployments to use latest images
4. **Verify Pods**: Ensure pods are running with new images
5. **Test APIs**: Verify services work with new images

---

## 📁 Files

- `scripts/check-service-images.sh` - Script to check all service images
- `SERVICE_IMAGE_CHECK.md` - This file

---

**Status**: 🔍 **Check Required**

