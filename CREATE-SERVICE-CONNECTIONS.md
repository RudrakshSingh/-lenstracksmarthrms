# How to Create Azure DevOps Service Connections

## Quick Steps to Fix Pipeline Errors

You need to create **2 service connections** in Azure DevOps:

---

## Step 1: Create Azure Subscription Service Connection

1. **Go to Azure DevOps:**
   - Open: https://dev.azure.com/Hindempire-devops1/etelios

2. **Navigate to Service Connections:**
   - Click the **⚙️ Gear icon** at the bottom left (Project Settings)
   - Click **Service connections** (under Pipelines section)

3. **Create New Connection:**
   - Click **New service connection** button (top right)
   - Select **Azure Resource Manager**
   - Click **Next**

4. **Configure Connection:**
   - Select **Service principal (automatic)**
   - Click **Next**
   - Select your **Azure subscription**
   - Select your **Resource group** (e.g., `etelios-rg` or `etelios-hrms-rg`)
   - **Service connection name:** `Azure-Service-Connection` ⚠️ **EXACT NAME - case sensitive**
   - Check **Grant access permission to all pipelines**
   - Click **Save**

---

## Step 2: Create Docker Registry Service Connection

1. **Still in Service Connections page:**
   - Click **New service connection** again

2. **Select Docker Registry:**
   - Select **Docker Registry**
   - Click **Next**

3. **Choose Azure Container Registry:**
   - Select **Azure Container Registry**
   - Click **Next**

4. **Configure Connection:**
   - Select your **Azure subscription**
   - Select your **Azure Container Registry** (e.g., `eteliosregistry` or `etelios`)
   - **Service connection name:** `AzureContainerRegistry` ⚠️ **EXACT NAME - case sensitive**
   - Check **Grant access permission to all pipelines**
   - Click **Save**

---

## Step 3: Verify Service Connections

After creating both, you should see:
- ✅ `Azure-Service-Connection` (Azure Resource Manager)
- ✅ `AzureContainerRegistry` (Docker Registry)

---

## Step 4: Run Pipeline Again

1. Go to **Pipelines** → **etelios-repo**
2. Click **Run pipeline**
3. Select branch: `main`
4. Click **Run**

The pipeline should now work! 🎉

---

## Troubleshooting

### If you don't have an Azure Container Registry:

**Option A: Create ACR via Azure Portal**
1. Go to Azure Portal
2. Create Resource → Container Registry
3. Name: `eteliosregistry` (or any name)
4. Resource Group: `etelios-rg`
5. SKU: Basic
6. Click Create

**Option B: Create ACR via Azure CLI**
```bash
az acr create \
  --resource-group etelios-rg \
  --name eteliosregistry \
  --sku Basic \
  --admin-enabled true
```

### If service connection names don't match:

The pipeline expects **EXACT** names:
- `Azure-Service-Connection` (with hyphen, case-sensitive)
- `AzureContainerRegistry` (no spaces, case-sensitive)

If you used different names, either:
1. Recreate with correct names, OR
2. Update the pipeline variables to match your names

---

## Need Help?

If you still get errors:
1. Check the service connection names match exactly
2. Make sure "Grant access permission to all pipelines" is checked
3. Verify your Azure subscription has the required resources
4. Check you have proper permissions in Azure DevOps

