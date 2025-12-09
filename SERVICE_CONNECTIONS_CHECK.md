# Service Connections Verification Guide

## 🔍 Required Service Connections

Your pipeline requires **2 service connections** to be created in Azure DevOps:

### 1. **eteliosacr-connection** (ACR Connection)
- **Type**: Docker Registry
- **Purpose**: Push Docker images to Azure Container Registry
- **Used in**: Build stage
- **Registry**: `eteliosacr.azurecr.io`

### 2. **Azure-Service-Connection** (Azure/AKS Connection)
- **Type**: Azure Resource Manager
- **Purpose**: Access AKS cluster and deploy resources
- **Used in**: Deploy stage
- **Resources**:
  - AKS Cluster: `Etelios-AKS`
  - Resource Group: `Etelios-AKS-RG`
  - ACR: `eteliosacr` (for image pull permissions)

---

## ✅ How to Verify Service Connections

### Step 1: Navigate to Service Connections
1. Go to: `https://dev.azure.com/Hindempire-devops1/etelios`
2. Click: **Project Settings** (bottom left)
3. Click: **Service connections** (under Pipelines)

### Step 2: Check if Connections Exist

Look for:
- ✅ `eteliosacr-connection`
- ✅ `Azure-Service-Connection`

---

## 🔧 How to Create Missing Service Connections

### Create ACR Connection (`eteliosacr-connection`)

1. In Service connections page, click **New service connection**
2. Select **Docker Registry**
3. Select **Azure Container Registry**
4. Configure:
   - **Azure subscription**: Select your subscription
   - **Azure container registry**: Select `eteliosacr`
   - **Service connection name**: `eteliosacr-connection`
   - **Grant access permission to all pipelines**: ✅ Check this
5. Click **Save**

### Create Azure Connection (`Azure-Service-Connection`)

1. In Service connections page, click **New service connection**
2. Select **Azure Resource Manager**
3. Select **Service principal (automatic)**
4. Configure:
   - **Scope level**: Resource Group (recommended) or Subscription
   - **Azure subscription**: Select your subscription
   - **Resource group**: `Etelios-AKS-RG` (if scoping to resource group)
   - **Service connection name**: `Azure-Service-Connection`
   - **Grant access permission to all pipelines**: ✅ Check this
5. Click **Save**

**Important**: After creating, verify the service principal has these permissions:
- **Contributor** role on Resource Group `Etelios-AKS-RG`
- **AcrPull** role on ACR `eteliosacr` (for pulling images)

---

## 🧪 Test Service Connections

### Test ACR Connection
```bash
# In Azure DevOps Pipeline, this should work:
docker login eteliosacr.azurecr.io
```

### Test Azure Connection
```bash
# In Azure DevOps Pipeline, this should work:
az aks get-credentials --resource-group Etelios-AKS-RG --name Etelios-AKS
kubectl get nodes
```

---

## 🚨 Common Issues

### Issue 1: "Service connection not found"
**Solution**: Create the service connection with the exact name:
- `eteliosacr-connection`
- `Azure-Service-Connection`

### Issue 2: "Authentication failed"
**Solution**: 
- Verify service principal has correct permissions
- Re-authenticate the service connection
- Check if subscription/resource group names are correct

### Issue 3: "Cannot pull images from ACR"
**Solution**:
- Ensure AKS cluster has **AcrPull** permission on ACR
- Or attach ACR to AKS: `az aks update -n Etelios-AKS -g Etelios-AKS-RG --attach-acr eteliosacr`

### Issue 4: "Cannot access AKS cluster"
**Solution**:
- Verify service principal has **Contributor** role on resource group
- Check AKS cluster name: `Etelios-AKS`
- Check resource group name: `Etelios-AKS-RG`

---

## 📋 Verification Checklist

Before running the pipeline, ensure:

- [ ] `eteliosacr-connection` exists in Azure DevOps
- [ ] `Azure-Service-Connection` exists in Azure DevOps
- [ ] Both connections are authorized for all pipelines
- [ ] ACR `eteliosacr` exists in Azure
- [ ] AKS cluster `Etelios-AKS` exists in resource group `Etelios-AKS-RG`
- [ ] Service principal has Contributor role on resource group
- [ ] Service principal has AcrPull role on ACR (or ACR is attached to AKS)

---

## 🔗 Quick Links

- **Service Connections**: `https://dev.azure.com/Hindempire-devops1/etelios/_settings/adminservices`
- **Azure Portal - ACR**: `https://portal.azure.com/#@/resource/subscriptions/{subscription-id}/resourceGroups/{rg}/providers/Microsoft.ContainerRegistry/registries/eteliosacr`
- **Azure Portal - AKS**: `https://portal.azure.com/#@/resource/subscriptions/{subscription-id}/resourceGroups/Etelios-AKS-RG/providers/Microsoft.ContainerService/managedClusters/Etelios-AKS`

---

## 📝 Notes

- Service connection names in the pipeline are **case-sensitive**
- Service connections must be created in the **same Azure DevOps organization**
- If you rename a service connection, update the pipeline YAML file
- Service connections can be scoped to specific pipelines for security

