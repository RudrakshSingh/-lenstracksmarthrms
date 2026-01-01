# Image Pull Error - Root Cause & Fix

## Problem Identified

**Pod:** `hr-service-88cd5f489-blzbl`  
**Status:** `ImagePullBackOff`  
**Error:** `no such host` - DNS lookup failing for `eteliosacr.azurecr.io`

### Error Details
```
Failed to pull image "eteliosacr.azurecr.io/hr-service:latest": 
failed to resolve reference "eteliosacr.azurecr.io/hr-service:latest": 
failed to do request: Head "https://eteliosacr.azurecr.io/v2/hr-service/manifests/latest": 
dial tcp: lookup eteliosacr.azurecr.io on 168.63.129.16:53: no such host
```

## Why Old Code is Running

1. **Unhealthy pod** can't pull image → stuck in `ImagePullBackOff`
2. **Healthy pod** has old cached image → running old code
3. **New deployments** fail → can't pull latest image

## Solutions

### 1. Verify ACR Exists
```bash
# Check if ACR exists
az acr list --query "[?name=='eteliosacr'].{Name:name, LoginServer:loginServer}" -o table

# Or check in Azure Portal
# Go to: Container registries → eteliosacr
```

### 2. Check ACR Name
The ACR name might be different. Check:
```bash
# List all ACRs
az acr list -o table

# Get correct login server
az acr show --name <acr-name> --query loginServer -o tsv
```

### 3. Fix DNS/Network Issue
```bash
# Test DNS resolution from AKS node
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup eteliosacr.azurecr.io

# Test connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -- wget -O- https://eteliosacr.azurecr.io/v2/
```

### 4. Check ACR Authentication
```bash
# Verify AKS has access to ACR
az aks check-acr --name <aks-cluster-name> --resource-group <resource-group> --acr eteliosacr.azurecr.io
```

### 5. Update Deployment with Correct Image
If ACR name is wrong:
```bash
# Get correct image name
az acr repository list --name <acr-name> -o table

# Update deployment
kubectl set image deployment/hr-service hr-service=<correct-image> -n etelios-backend-prod
```

### 6. Rebuild and Push Image
If image doesn't exist:
```bash
# Build image
docker build -t eteliosacr.azurecr.io/hr-service:latest ./microservices/hr-service

# Login to ACR
az acr login --name eteliosacr

# Push image
docker push eteliosacr.azurecr.io/hr-service:latest
```

## Quick Fix Commands

### Check Current Image
```bash
kubectl get deployment hr-service -n etelios-backend-prod -o jsonpath='{.spec.template.spec.containers[0].image}'
```

### Check Pod Events
```bash
kubectl describe pod hr-service-88cd5f489-blzbl -n etelios-backend-prod | grep -A 5 Events
```

### Delete Unhealthy Pod (Auto-restart)
```bash
kubectl delete pod hr-service-88cd5f489-blzbl -n etelios-backend-prod
```

## Expected Result After Fix

- ✅ Pod can pull image successfully
- ✅ Pod status: `Running` (2/2 ready)
- ✅ Latest code deployed and running
- ✅ Employee creation working

## Verification

After fixing, verify:
```bash
# Check pod status
kubectl get pods -n etelios-backend-prod | grep hr-service

# Should show: 2/2 Ready ✅

# Test API
node scripts/test-aks-endpoints.js
```

