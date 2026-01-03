# Service Image Status Report

**Date**: 2026-01-02  
**Status**: ⚠️ **ACR URL Issue Found**

---

## 📊 Current Status

### ✅ Good News
- **All services using `latest` tag** ✅
- **Will automatically pull new images** ✅
- **Tag format is correct** ✅

### ❌ Issue Found
- **All services using WRONG ACR URL** ❌
- **Current**: `eteliosacr.azurecr.io`
- **Should be**: `eteliosacr-hvawabdbgge7e0fu.azurecr.io`

---

## 🔍 Detailed Status

### Services Checked

| Service | Current Image | Tag | ACR Status | Pods Running |
|---------|--------------|-----|------------|--------------|
| auth-service | `eteliosacr.azurecr.io/auth-service:latest` | ✅ latest | ❌ Wrong ACR | 2/2 |
| hr-service | `eteliosacr.azurecr.io/hr-service:latest` | ✅ latest | ❌ Wrong ACR | 2/2 |
| attendance-service | `eteliosacr.azurecr.io/attendance-service:latest` | ✅ latest | ❌ Wrong ACR | 2/2 |
| tenant-registry-service | `eteliosacr.azurecr.io/tenant-registry-service:latest` | ✅ latest | ❌ Wrong ACR | 0/2 |
| tenant-management-service | `eteliosacr.azurecr.io/tenant-management-service:latest` | ✅ latest | ❌ Wrong ACR | ? |

---

## ⚠️ Impact

### Problem
Even though all services are using the `latest` tag, they're pointing to the **wrong ACR URL**. This means:

1. **Wrong Images**: Services may be pulling images from wrong registry
2. **Old Images**: Even with `latest` tag, wrong ACR = wrong images
3. **Update Issues**: New images won't be pulled from correct ACR

### Why This Matters
- Code changes won't be deployed if ACR URL is wrong
- Services may be running old code
- Pipeline builds to correct ACR, but deployments pull from wrong ACR

---

## 🔧 Solution

### Option 1: Fix All Services (Automated)
```bash
./scripts/fix-all-acr-urls-to-latest.sh
```

This script will:
1. Update all services to use correct ACR URL
2. Ensure all use `latest` tag
3. Restart deployments to pull new images

### Option 2: Fix Individual Service
```bash
kubectl set image deployment/<service-name> \
  <service-name>=eteliosacr-hvawabdbgge7e0fu.azurecr.io/<service-name>:latest \
  -n etelios-backend-prod

kubectl rollout restart deployment/<service-name> -n etelios-backend-prod
```

### Option 3: Fix via Pipeline
Update deployment YAMLs in repository to use correct ACR URL, then rerun pipeline.

---

## 📋 Services to Fix

All services need ACR URL update:

- ✅ auth-service
- ✅ hr-service
- ✅ attendance-service
- ✅ tenant-registry-service
- ✅ tenant-management-service
- ✅ analytics-service
- ✅ api-gateway
- ✅ cpp-service
- ✅ crm-service
- ✅ document-service
- ✅ financial-service
- ✅ inventory-service
- ✅ monitoring-service
- ✅ notification-service
- ✅ payroll-service
- ✅ prescription-service
- ✅ purchase-service
- ✅ realtime-service
- ✅ sales-service
- ✅ service-management

---

## ✅ After Fix

### Expected Status
- All services using: `eteliosacr-hvawabdbgge7e0fu.azurecr.io/<service>:latest`
- All pods running with correct images
- New code changes will be deployed automatically

### Verification
```bash
# Check all services
kubectl get deployments -n etelios-backend-prod \
  -o custom-columns=NAME:.metadata.name,IMAGE:.spec.template.spec.containers[0].image

# Check specific service
kubectl get deployment <service-name> -n etelios-backend-prod \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

---

## 🚀 Quick Fix Command

### Fix All Services at Once
```bash
# Get all deployments and fix ACR URL
for deployment in $(kubectl get deployments -n etelios-backend-prod -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}'); do
  current_image=$(kubectl get deployment $deployment -n etelios-backend-prod -o jsonpath='{.spec.template.spec.containers[0].image}')
  if [[ $current_image == *"eteliosacr.azurecr.io"* ]]; then
    service_name=$(echo $current_image | sed 's|eteliosacr.azurecr.io/||' | cut -d':' -f1)
    new_image="eteliosacr-hvawabdbgge7e0fu.azurecr.io/$service_name:latest"
    kubectl set image deployment/$deployment $deployment=$new_image -n etelios-backend-prod
    kubectl rollout restart deployment/$deployment -n etelios-backend-prod
  fi
done
```

---

## 📁 Files

- `scripts/check-service-images.sh` - Check service images
- `scripts/fix-all-acr-urls-to-latest.sh` - Fix all ACR URLs
- `SERVICE_IMAGE_STATUS_REPORT.md` - This file

---

## ⚠️ Important Notes

1. **ACR URL**: Must be `eteliosacr-hvawabdbgge7e0fu.azurecr.io`
2. **Tag**: Should be `latest` for automatic updates
3. **Restart**: Restart deployments after updating to pull new images
4. **Verification**: Always verify pods are running after update

---

**Status**: ⚠️ **ACR URL Needs Fix - All Services Affected**

**Priority**: 🔴 **High** (Affects all services)
