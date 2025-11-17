# Create Azure Resource Manager Service Connection

## Problem
The pipeline needs an **Azure Resource Manager** service connection for `azureSubscription`, but `eteliosacr-connection` is a **Docker Registry** connection (different types).

## Solution: Create New Azure Resource Manager Connection

### Step 1: Go to Azure DevOps
1. Navigate to your project: `https://dev.azure.com/Hindempire-devops1/etelios`
2. Click **Project Settings** (bottom left)
3. Click **Service connections** (under Pipelines)

### Step 2: Create New Service Connection
1. Click **New service connection** (top right)
2. Select **Azure Resource Manager**
3. Click **Next**

### Step 3: Configure Connection
1. **Authentication method**: Select **Service principal (automatic)**
2. **Scope level**: Select **Subscription**
3. **Subscription**: Select your Azure subscription
4. **Resource group**: Select `Etelios-rg` (or leave empty for all)
5. **Service connection name**: Enter **`Azure-Service-Connection`** (or any name you prefer)
6. **Grant access permission to all pipelines**: ✅ Check this box
7. Click **Save**

### Step 4: Update Pipeline
Once created, the pipeline will use this connection name.

## Alternative: Use Existing Connection
If you already have an Azure Resource Manager connection:
1. Go to **Service connections**
2. Find the connection of type **Azure Resource Manager**
3. Note the exact name
4. Update the pipeline to use that name

## Recommended Connection Names
- `Azure-Service-Connection` (standard name)
- `Etelios-Azure-Connection`
- `AzureRM-Connection`

**Important**: The name must be different from `eteliosacr-connection` (which is Docker Registry).


