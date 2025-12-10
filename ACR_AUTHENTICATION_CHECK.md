# ACR Authentication Verification Guide

## 🔐 Authentication Requirements

For the pipeline to successfully build and push Docker images to ACR, the service principal used by `Azure-Service-Connection` must have the following permissions:

### Required Roles on ACR

1. **AcrPush** role (minimum required)
   - Allows: Push and pull images
   - Required for: Building and pushing Docker images

2. **Reader** role (optional but recommended)
   - Allows: Read ACR metadata
   - Required for: Verifying ACR access

---

## ✅ How to Verify Current Permissions

### Step 1: Get Service Principal ID

1. Go to Azure DevOps: `https://dev.azure.com/Hindempire-devops1/etelios`
2. Navigate to: **Project Settings** → **Service connections**
3. Click on: `Azure-Service-Connection`
4. Click: **Manage Service Principal** (opens Azure Portal)
5. Copy the **Object (principal) ID**

### Step 2: Check ACR Permissions

Run this Azure CLI command (replace placeholders):

```bash
# Get ACR resource ID
ACR_NAME="eteliosacr-hvawabdbgge7e0fu"
ACR_ID=$(az acr show --name $ACR_NAME --query id --output tsv)

# Get service principal ID (from Step 1)
SP_ID="<service-principal-object-id>"

# Check current role assignments
az role assignment list --assignee $SP_ID --scope $ACR_ID --output table
```

### Step 3: Verify Required Roles

Look for these roles in the output:
- ✅ **AcrPush** - Required for push operations
- ✅ **Reader** - Optional, for verification

---

## 🔧 How to Grant Required Permissions

If the service principal doesn't have `AcrPush` role, grant it:

### Option 1: Using Azure CLI

```bash
# Set variables
ACR_NAME="eteliosacr-hvawabdbgge7e0fu"
SP_ID="<service-principal-object-id>"

# Get ACR resource ID
ACR_ID=$(az acr show --name $ACR_NAME --query id --output tsv)

# Grant AcrPush role
az role assignment create \
  --assignee $SP_ID \
  --role AcrPush \
  --scope $ACR_ID

# Verify
az role assignment list --assignee $SP_ID --scope $ACR_ID --output table
```

### Option 2: Using Azure Portal

1. Go to Azure Portal: Navigate to your ACR (`eteliosacr-hvawabdbgge7e0fu`)
2. Click: **Access control (IAM)**
3. Click: **Add** → **Add role assignment**
4. Select role: **AcrPush**
5. Select: **User, group, or service principal**
6. Search for: Your service principal name (from `Azure-Service-Connection`)
7. Click: **Save**

---

## 🧪 Test Authentication

### Test 1: Verify Azure CLI Authentication

```bash
# In Azure DevOps Pipeline or locally
az account show
```

Should return your subscription information.

### Test 2: Verify ACR Access

```bash
ACR_NAME="eteliosacr-hvawabdbgge7e0fu"

# Check if ACR is accessible
az acr show --name $ACR_NAME --query name -o tsv

# Should return: eteliosacr-hvawabdbgge7e0fu
```

### Test 3: Test ACR Login

```bash
ACR_NAME="eteliosacr-hvawabdbgge7e0fu"

# Login to ACR
az acr login --name $ACR_NAME

# Should return: Login Succeeded
```

### Test 4: Test Docker Push (if Docker is available)

```bash
ACR_LOGIN_SERVER="eteliosacr-hvawabdbgge7e0fu.azurecr.io"

# Try to push a test image (this will fail if no image, but login should work)
docker push $ACR_LOGIN_SERVER/test:latest || echo "Push failed (expected if image doesn't exist)"
```

---

## 🚨 Common Authentication Errors

### Error 1: "authentication required"
**Message**: `unauthorized: {"errors":[{"code":"UNAUTHORIZED","message":"authentication required"}]}`

**Cause**: Service principal doesn't have `AcrPush` role

**Solution**: Grant `AcrPush` role using steps above

---

### Error 2: "Could not fetch access token for Managed Service Principal"
**Message**: `Could not fetch access token for Managed Service Principal`

**Cause**: Service connection is trying to use MSI (Managed Service Identity) which isn't available

**Solution**: 
- Ensure `Azure-Service-Connection` is type "Azure Resource Manager" (not Docker Registry)
- Use `az acr login` instead of Docker@2 task with MSI

---

### Error 3: "Cannot access ACR"
**Message**: `Cannot access ACR <name>`

**Cause**: Service principal doesn't have `Reader` role or ACR doesn't exist

**Solution**: 
- Verify ACR name: `eteliosacr-hvawabdbgge7e0fu`
- Grant `Reader` role to service principal
- Verify ACR exists in Azure Portal

---

### Error 4: "az acr login" fails silently
**Message**: Login appears to succeed but docker push fails

**Cause**: Authentication token expired or not properly configured

**Solution**:
- Ensure all docker commands run in the same Azure CLI task
- Don't split login and push across separate pipeline steps
- Verify `az acr login` output shows "Login Succeeded"

---

## 📋 Quick Checklist

Before running the pipeline, verify:

- [ ] `Azure-Service-Connection` exists in Azure DevOps
- [ ] Service connection type is "Azure Resource Manager"
- [ ] Service principal has `AcrPush` role on ACR
- [ ] ACR name is correct: `eteliosacr-hvawabdbgge7e0fu`
- [ ] ACR login server is correct: `eteliosacr-hvawabdbgge7e0fu.azurecr.io`
- [ ] Pipeline uses `Azure-Service-Connection` for ACR operations
- [ ] All docker commands are in the same Azure CLI task (authentication persistence)

---

## 🔗 Related Documentation

- [Service Connections Check](./SERVICE_CONNECTIONS_CHECK.md)
- [Azure Deployment Flow](./AZURE_DEPLOYMENT_FLOW.md)
- [Azure ACR Documentation](https://docs.microsoft.com/en-us/azure/container-registry/container-registry-authentication)

---

## 💡 Pro Tips

1. **Use Azure CLI for ACR authentication**: `az acr login` is more reliable than Docker@2 with MSI
2. **Keep operations in one task**: Authentication from `az acr login` persists only within the same task
3. **Verify permissions early**: Add verification steps in pipeline to catch auth issues early
4. **Use AcrPush role**: This single role provides both push and pull permissions

