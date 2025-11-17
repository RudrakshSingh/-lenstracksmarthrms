# Create Azure Resource Manager Service Connection with Service Principal

## Service Principal Details
- **Directory (Tenant) ID**: `270719f0-d82f-4895-b290-0a284e533490`
- **Application (Client) ID**: `8d3f59b7-5b79-4a3b-ae6c-7d5e8d6c79da`
- **Client Secret**: `1d-8Q~3KU1FdTe3.vztZgr1rftufNMBhv2.-pa_3`

## Method 1: Create via Azure DevOps UI

### Steps:
1. Go to **Azure DevOps** → Your Project
2. **Project Settings** → **Service connections**
3. Click **New service connection**
4. Select **Azure Resource Manager**
5. Click **Next**
6. Select **Service principal (manual)**
7. Fill in the details:
   - **Subscription ID**: Your Azure subscription ID
   - **Subscription Name**: Your subscription name
   - **Service Principal Id**: `8d3f59b7-5b79-4a3b-ae6c-7d5e8d6c79da`
   - **Service Principal key**: `1d-8Q~3KU1FdTe3.vztZgr1rftufNMBhv2.-pa_3`
   - **Tenant ID**: `270719f0-d82f-4895-b290-0a284e533490`
8. **Service connection name**: Enter `Azure-Service-Connection` (or your preferred name)
9. ✅ Check **Grant access permission to all pipelines**
10. Click **Verify and Save**

## Method 2: Create via Azure CLI (Alternative)

```bash
# Note: This requires Azure DevOps extension
az devops service-endpoint azurerm create \
  --organization https://dev.azure.com/Hindempire-devops1 \
  --project etelios \
  --name Azure-Service-Connection \
  --azure-rm-service-principal-id 8d3f59b7-5b79-4a3b-ae6c-7d5e8d6c79da \
  --azure-rm-tenant-id 270719f0-d82f-4895-b290-0a284e533490 \
  --azure-rm-subscription-id <your-subscription-id> \
  --azure-rm-subscription-name <your-subscription-name>
```

## After Creation

Once the service connection is created, tell me the exact name and I'll update the pipelines to use it.

## Security Recommendation

⚠️ **Important**: After creating the service connection, consider rotating the Client Secret for security since it was shared in plain text.


