# ACR URL Mismatch - Fix Guide

## Problem Identified

**ACR exists but deployment is using wrong URL!**

### ACR Details
- **Name:** `eteliosacr`
- **Actual LoginServer:** `eteliosacr-hvawabdbgge7e0fu.azurecr.io`
- **Location:** `centralindia`
- **Status:** `Succeeded`

### Deployment Issue
- **Deployment is using:** `eteliosacr.azurecr.io/hr-service:latest` ❌
- **Should be using:** `eteliosacr-hvawabdbgge7e0fu.azurecr.io/hr-service:latest` ✅

### Why Pods Can't Pull Image
The deployment is trying to pull from `eteliosacr.azurecr.io` which doesn't exist. The actual ACR URL is `eteliosacr-hvawabdbgge7e0fu.azurecr.io`.

## Solution

### Step 1: Check if Image Exists in ACR
```bash
# List all repositories
az acr repository list --name eteliosacr -o table

# Check hr-service tags
az acr repository show-tags --name eteliosacr --repository hr-service -o table
```

### Step 2: Update Deployment with Correct ACR URL

#### Option A: Update Image Directly
```bash
kubectl set image deployment/hr-service \
  hr-service=eteliosacr-hvawabdbgge7e0fu.azurecr.io/hr-service:latest \
  -n etelios-backend-prod
```

#### Option B: Edit Deployment YAML
```bash
# Get current deployment
kubectl get deployment hr-service -n etelios-backend-prod -o yaml > hr-service-deployment.yaml

# Edit the image URL in the file
# Change: eteliosacr.azurecr.io/hr-service:latest
# To: eteliosacr-hvawabdbgge7e0fu.azurecr.io/hr-service:latest

# Apply updated deployment
kubectl apply -f hr-service-deployment.yaml -n etelios-backend-prod
```

### Step 3: Verify Deployment
```bash
# Check deployment status
kubectl get deployment hr-service -n etelios-backend-prod

# Check pods
kubectl get pods -n etelios-backend-prod | grep hr-service

# Should show: 2/2 Ready ✅
```

### Step 4: If Image Doesn't Exist - Build and Push

If the image doesn't exist in ACR, build and push it:

```bash
# Login to ACR
az acr login --name eteliosacr

# Build image
docker build -t eteliosacr-hvawabdbgge7e0fu.azurecr.io/hr-service:latest ./microservices/hr-service

# Push image
docker push eteliosacr-hvawabdbgge7e0fu.azurecr.io/hr-service:latest
```

## Verification

After fixing:

1. **Check pod status:**
   ```bash
   kubectl get pods -n etelios-backend-prod | grep hr-service
   # Should show: 2/2 Ready ✅
   ```

2. **Check pod logs:**
   ```bash
   kubectl logs -n etelios-backend-prod <pod-name>
   # Should show service starting successfully
   ```

3. **Test API:**
   ```bash
   node scripts/test-aks-endpoints.js
   ```

## Expected Result

- ✅ All pods healthy (2/2 Ready)
- ✅ Latest code running
- ✅ Employee creation working
- ✅ No more ImagePullBackOff errors

## Quick Reference

| Current (Wrong) | Correct |
|----------------|---------|
| `eteliosacr.azurecr.io` | `eteliosacr-hvawabdbgge7e0fu.azurecr.io` |

