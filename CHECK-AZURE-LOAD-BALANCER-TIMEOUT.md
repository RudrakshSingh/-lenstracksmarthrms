# How to Check Azure Load Balancer Timeout

## Method 1: Azure Portal - App Service Networking

### Step 1: Access App Service
1. Go to **Azure Portal**: https://portal.azure.com
2. Navigate to your App Service:
   - Search for: `etelios-auth-service-h8btakd4byhncmgc`
   - Or go to: **Resource Groups** → Your RG → **App Service**

### Step 2: Check Networking Settings
1. In App Service, go to **Networking** (left sidebar)
2. Look for:
   - **Inbound traffic** section
   - **Outbound traffic** section
   - **Load balancing** settings

### Step 3: Check Load Balancer Settings
1. Click on **Load balancing** or **Backend pools**
2. Look for **Request timeout** or **Idle timeout** setting
3. Default is usually **4 minutes (240 seconds)**, but can be configured

## Method 2: Azure Portal - Application Gateway (if using)

### Step 1: Find Application Gateway
1. Search for **Application Gateway** in Azure Portal
2. Select your Application Gateway resource

### Step 2: Check Backend Settings
1. Go to **Backend settings** (left sidebar)
2. Click on your backend pool
3. Look for **Request timeout** setting
4. Default is **20 seconds**, can be 1-2400 seconds

### Step 3: Check HTTP Settings
1. Go to **HTTP settings**
2. Click on your HTTP setting
3. Look for **Request timeout** or **Connection timeout**
4. This is the timeout for backend requests

## Method 3: Azure CLI

### Check App Service Configuration
```bash
# Login to Azure
az login

# Get App Service configuration
az webapp config show \
  --name etelios-auth-service-h8btakd4byhncmgc \
  --resource-group <your-resource-group> \
  --query "{alwaysOn: alwaysOn, requestTimeout: requestTimeout}"

# Check app settings
az webapp config appsettings list \
  --name etelios-auth-service-h8btakd4byhncmgc \
  --resource-group <your-resource-group> \
  --query "[?name=='WEBSITES_REQUEST_TIMEOUT']"
```

### Check Application Gateway (if using)
```bash
# List Application Gateways
az network application-gateway list \
  --resource-group <your-resource-group>

# Get backend HTTP settings
az network application-gateway http-settings show \
  --resource-group <your-resource-group> \
  --gateway-name <gateway-name> \
  --name <http-settings-name> \
  --query "requestTimeout"
```

## Method 4: Check via Azure REST API

### Get App Service Configuration
```bash
# Get access token
TOKEN=$(az account get-access-token --query accessToken -o tsv)

# Get App Service config
curl -X GET \
  "https://management.azure.com/subscriptions/<subscription-id>/resourceGroups/<rg>/providers/Microsoft.Web/sites/etelios-auth-service-h8btakd4byhncmgc/config/web?api-version=2021-02-01" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.properties.requestTimeout'
```

## Method 5: Check in App Service Logs

### View Application Insights
1. Go to App Service → **Application Insights**
2. Go to **Logs** or **Live Metrics**
3. Search for timeout-related errors
4. Check **Request duration** metrics

### View Log Stream
1. Go to App Service → **Log stream**
2. Look for timeout errors
3. Check request processing times

## Current Timeout Settings

### App Service Defaults
- **Request timeout**: 230 seconds (if not configured)
- **Always On**: Disabled by default (causes cold starts)
- **ARR Affinity**: Enabled by default

### Application Gateway Defaults
- **Request timeout**: 20 seconds
- **Connection timeout**: 20 seconds
- **Idle timeout**: 4 minutes

## How to Increase Timeout

### Option 1: App Service - Via Portal
1. App Service → **Configuration** → **General settings**
2. Set **Always On**: **On**
3. Add Application Setting:
   - **Name**: `WEBSITES_REQUEST_TIMEOUT`
   - **Value**: `300` (5 minutes)
4. Click **Save**

### Option 2: App Service - Via Pipeline
Already added in `azure-pipelines.yml`:
```yaml
appSettings: '-WEBSITES_REQUEST_TIMEOUT "300" ...'
```

### Option 3: Application Gateway - Via Portal
1. Application Gateway → **HTTP settings**
2. Click on your HTTP setting
3. Set **Request timeout**: `60` (or higher)
4. Click **Save**

### Option 4: Application Gateway - Via CLI
```bash
az network application-gateway http-settings update \
  --resource-group <rg> \
  --gateway-name <gateway-name> \
  --name <http-settings-name> \
  --request-timeout 60
```

## Quick Check Script

Run this to check current settings:

```bash
#!/bin/bash

# Set your values
APP_SERVICE_NAME="etelios-auth-service-h8btakd4byhncmgc"
RESOURCE_GROUP="<your-resource-group>"

echo "=== Checking App Service Timeout Settings ==="

# Check app settings
echo "App Settings:"
az webapp config appsettings list \
  --name $APP_SERVICE_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "[?name=='WEBSITES_REQUEST_TIMEOUT']" \
  -o table

# Check general settings
echo ""
echo "General Settings:"
az webapp config show \
  --name $APP_SERVICE_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "{alwaysOn: alwaysOn}" \
  -o table

echo ""
echo "=== Done ==="
```

## What to Look For

### If timeout is 10-11 seconds:
- **Likely**: Application Gateway timeout (default 20s, but might be configured to 10s)
- **Or**: Load balancer timeout configured to 10s
- **Or**: Some other network component

### If timeout is 20 seconds:
- **Likely**: Application Gateway default timeout

### If timeout is 230 seconds:
- **Likely**: App Service default timeout

## Next Steps

1. **Check current timeout settings** using methods above
2. **Increase timeout** if it's < 30 seconds
3. **Pre-create mock users** (fastest solution regardless of timeout)
4. **Test again** after changes

## Important Notes

- **Load balancer timeout** is separate from **App Service timeout**
- **Application Gateway timeout** is separate from both
- The **shortest timeout** in the chain will be the limiting factor
- You need to check **all** timeout settings in the request path

