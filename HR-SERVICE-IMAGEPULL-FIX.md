# HR Service - ImagePullFailure Fix

## Problem
Azure App Service logs show:
```
Container pull image failed with reason: ImagePullFailure
Pulling image: eteliosacr-hvawabdbgge7e0fu.azurecr.io/eteliosrepo2:latest
```

**Root Cause:** App Service is configured to pull the wrong Docker image.

## Expected vs Actual

**Expected Image:**
```
eteliosacr.azurecr.io/hr-service:latest
```

**Actual Image (Wrong):**
```
eteliosacr-hvawabdbgge7e0fu.azurecr.io/eteliosrepo2:latest
```

## Solution

### Step 1: Verify Correct App Service

**Check which App Service you're using:**
- HR Service should be: `etelios-hr-service`
- Logs show: `etelios-app-service` (might be wrong App Service)

**Go to Azure Portal:**
1. Navigate to: **App Services**
2. Find: `etelios-hr-service` (NOT `etelios-app-service`)

### Step 2: Check Docker Image Configuration

**In Azure Portal:**
1. Go to: **App Services** → **etelios-hr-service**
2. Go to: **Deployment Center**
3. Check: **Settings** tab
4. Verify: **Registry** and **Image** settings

**Should be:**
- **Registry:** `eteliosacr.azurecr.io` (or your ACR name)
- **Image:** `hr-service:latest`
- **Full Image:** `eteliosacr.azurecr.io/hr-service:latest`

### Step 3: Fix Image Configuration

**Option A: Via Azure Portal (Recommended)**

1. Go to: **App Services** → **etelios-hr-service**
2. Go to: **Deployment Center**
3. Click: **Settings** tab
4. Update:
   - **Registry Source:** Azure Container Registry
   - **Registry:** Select your ACR (e.g., `eteliosacr`)
   - **Image:** `hr-service`
   - **Tag:** `latest`
5. Click: **Save**
6. Go to: **Overview** → Click **Restart**

**Option B: Via Azure CLI**

```bash
# Set the correct Docker image
az webapp config container set \
  --name etelios-hr-service \
  --resource-group Etelios-rg \
  --docker-custom-image-name eteliosacr.azurecr.io/hr-service:latest \
  --docker-registry-server-url https://eteliosacr.azurecr.io

# Restart the App Service
az webapp restart \
  --name etelios-hr-service \
  --resource-group Etelios-rg
```

**Option C: Re-run Azure DevOps Pipeline**

The pipeline should automatically set the correct image. If it didn't:

1. Go to: **Azure DevOps** → **Pipelines**
2. Find: HR Service pipeline
3. Click: **Run pipeline**
4. Wait for deployment to complete

### Step 4: Verify Image Exists in ACR

**Check if image exists in Azure Container Registry:**

```bash
# Login to ACR
az acr login --name eteliosacr

# List images
az acr repository list --name eteliosacr --output table

# Check hr-service image
az acr repository show-tags --name eteliosacr --repository hr-service --output table
```

**If image doesn't exist:**
1. The pipeline might have failed
2. Check Azure DevOps pipeline logs
3. Re-run the pipeline to build and push the image

### Step 5: Check ACR Authentication

**Verify App Service can access ACR:**

1. Go to: **App Services** → **etelios-hr-service**
2. Go to: **Configuration** → **General settings**
3. Check: **Managed identity** is enabled
4. Go to: **Identity** → **System assigned**
5. Enable: **Status = On**
6. Note the **Object (principal) ID**

**Grant ACR access to App Service:**

```bash
# Get ACR resource ID
ACR_ID=$(az acr show --name eteliosacr --query id --output tsv)

# Get App Service principal ID
APP_SERVICE_PRINCIPAL_ID=$(az webapp identity show \
  --name etelios-hr-service \
  --resource-group Etelios-rg \
  --query principalId \
  --output tsv)

# Grant AcrPull role
az role assignment create \
  --assignee $APP_SERVICE_PRINCIPAL_ID \
  --scope $ACR_ID \
  --role AcrPull
```

### Step 6: Verify Deployment

**After fixing, check logs:**

```bash
az webapp log tail --name etelios-hr-service --resource-group Etelios-rg
```

**Expected:**
- ✅ Image pull successful
- ✅ Container starting
- ✅ Service running

**Test health endpoint:**
```bash
curl https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net/health
```

## Troubleshooting

### Issue 1: Image Not Found in ACR

**Error:** `ImagePullFailure` or `repository does not exist`

**Solution:**
1. Check if pipeline built the image successfully
2. Verify image name in ACR: `hr-service:latest`
3. Re-run Azure DevOps pipeline to build and push

### Issue 2: ACR Authentication Failed

**Error:** `unauthorized: authentication required`

**Solution:**
1. Enable Managed Identity on App Service
2. Grant `AcrPull` role to App Service
3. Or use ACR admin credentials (less secure)

### Issue 3: Wrong ACR Name

**Error:** `registry does not exist`

**Solution:**
1. Verify ACR name: `eteliosacr` or `eteliosacr-hvawabdbgge7e0fu`
2. Update App Service configuration with correct ACR name
3. Check ACR URL format: `https://<acr-name>.azurecr.io`

### Issue 4: Wrong App Service

**If you're looking at `etelios-app-service` instead of `etelios-hr-service`:**

1. Make sure you're configuring the correct App Service
2. HR Service should be: `etelios-hr-service`
3. Check App Service name in Azure Portal

## Quick Fix Checklist

- [ ] Verify App Service name: `etelios-hr-service`
- [ ] Check Docker image in Deployment Center
- [ ] Update image to: `eteliosacr.azurecr.io/hr-service:latest`
- [ ] Verify image exists in ACR
- [ ] Enable Managed Identity on App Service
- [ ] Grant AcrPull role to App Service
- [ ] Restart App Service
- [ ] Check logs for successful startup
- [ ] Test health endpoint

## Files Reference

- **Pipeline:** `microservices/hr-service/azure-pipelines.yml`
- **Expected Image:** `eteliosacr.azurecr.io/hr-service:latest`
- **App Service:** `etelios-hr-service`
- **Resource Group:** `Etelios-rg` (or `etelios-hrms-rg`)

---

**Status:** ⚠️ Configuration Issue - Needs Manual Fix in Azure Portal

**Action Required:** Update App Service Docker image configuration to use `hr-service:latest` instead of `eteliosrepo2:latest`

