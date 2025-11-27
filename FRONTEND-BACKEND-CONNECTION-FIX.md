# Frontend-Backend Connection Fix Guide

## Problem
Frontend is stuck on "Redirecting to HRMS..." because:
1. Backend services may be blocking CORS requests from frontend
2. Frontend doesn't know the backend API Gateway URL
3. CORS_ORIGIN environment variable not set on backend services

## Solution

### Step 1: Set CORS_ORIGIN on All Backend Services

For each Azure App Service (Auth, HR, Attendance, etc.), add this environment variable:

**Option A: Allow All Origins (Quick Fix)**
```
CORS_ORIGIN=*
```

**Option B: Specific Frontend URL (Recommended)**
```
CORS_ORIGIN=https://etelios-frontend-appservice-eedgc2bmb7h5fzfy.centralindia-01.azurewebsites.net
```

**Option C: Multiple Origins (If you have multiple frontends)**
```
CORS_ORIGIN=https://etelios-frontend-appservice-eedgc2bmb7h5fzfy.centralindia-01.azurewebsites.net,https://etelios-frontend-appservice-eedgc2bmb7h5fzfy.centralindia-01.azurewebsites.net/hrms
```

### Step 2: Configure Frontend with Backend API Gateway URL

The frontend needs to know where the backend API Gateway is. Based on your setup, it should be:

**API Gateway URL:**
```
https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net
```

**Frontend Environment Variables:**
Add to your frontend `.env` or Azure App Service Configuration:

```env
# Backend API Gateway URL
API_BASE_URL=https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api
# OR
BACKEND_API_URL=https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api
```

### Step 3: Services That Need CORS_ORIGIN Configuration

Set `CORS_ORIGIN` on these Azure App Services:

1. ✅ **API Gateway** (Main Entry Point)
   - App Service: `etelios-app-service-cxf6hvgjb7gah7dr`
   - Already allows all origins (`*`), but can be more specific

2. ⚠️ **Auth Service**
   - App Service: `etelios-auth-service-h8btakd4byhncmgc`
   - **Action Required:** Set `CORS_ORIGIN`

3. ⚠️ **HR Service**
   - App Service: `etelios-hr-service-backend-a4ayeqefdsbsc2g3`
   - **Action Required:** Set `CORS_ORIGIN`

4. ⚠️ **Attendance Service**
   - **Action Required:** Set `CORS_ORIGIN`

5. ⚠️ **All Other Microservices**
   - **Action Required:** Set `CORS_ORIGIN` on each service

### Step 4: How to Set Environment Variables in Azure

#### Via Azure Portal:
1. Go to Azure Portal → App Services
2. Select your service (e.g., `etelios-auth-service-h8btakd4byhncmgc`)
3. Go to **Configuration** → **Application settings**
4. Click **+ New application setting**
5. Name: `CORS_ORIGIN`
6. Value: `*` or your frontend URL
7. Click **OK** → **Save**
8. **Restart** the App Service

#### Via Azure CLI:
```bash
# Set CORS_ORIGIN for Auth Service
az webapp config appsettings set \
  --resource-group <your-resource-group> \
  --name etelios-auth-service-h8btakd4byhncmgc \
  --settings CORS_ORIGIN="*"

# Set CORS_ORIGIN for HR Service
az webapp config appsettings set \
  --resource-group <your-resource-group> \
  --name etelios-hr-service-backend-a4ayeqefdsbsc2g3 \
  --settings CORS_ORIGIN="*"

# Repeat for all other services
```

#### Via Azure DevOps Pipeline:
Add to your `azure-pipelines.yml`:
```yaml
- task: AzureWebApp@1
  inputs:
    azureSubscription: 'your-subscription'
    appName: 'etelios-auth-service-h8btakd4byhncmgc'
    appSettings: |
      [
        {
          "name": "CORS_ORIGIN",
          "value": "*",
          "slotSetting": false
        }
      ]
```

### Step 5: Verify the Fix

#### Test 1: Check API Gateway Health
```bash
curl https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/health
```

Expected: `{"status":"OK",...}`

#### Test 2: Check CORS Headers
```bash
curl -H "Origin: https://etelios-frontend-appservice-eedgc2bmb7h5fzfy.centralindia-01.azurewebsites.net" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login \
     -v
```

Look for: `Access-Control-Allow-Origin: *` or your frontend URL

#### Test 3: Test from Frontend Console
Open browser console on frontend and run:
```javascript
fetch('https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => console.log('✅ Backend connected:', data))
.catch(err => console.error('❌ Backend connection failed:', err));
```

### Step 6: Frontend Code Configuration

Make sure your frontend is using the correct API URL:

```javascript
// config/api.js or similar
const API_BASE_URL = process.env.API_BASE_URL || 
  process.env.REACT_APP_API_BASE_URL || 
  'https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api';

export default API_BASE_URL;
```

### Quick Fix Script (For DevOps)

If you have access to Azure CLI, run this script to set CORS_ORIGIN on all services:

```bash
#!/bin/bash

RESOURCE_GROUP="your-resource-group"
CORS_ORIGIN="*"  # Or your specific frontend URL

SERVICES=(
  "etelios-auth-service-h8btakd4byhncmgc"
  "etelios-hr-service-backend-a4ayeqefdsbsc2g3"
  "etelios-attendance-service"
  "etelios-crm-service"
  "etelios-inventory-service"
  "etelios-financial-service"
  # Add all other services
)

for service in "${SERVICES[@]}"; do
  echo "Setting CORS_ORIGIN for $service..."
  az webapp config appsettings set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$service" \
    --settings CORS_ORIGIN="$CORS_ORIGIN" \
    --output none
  
  echo "Restarting $service..."
  az webapp restart \
    --resource-group "$RESOURCE_GROUP" \
    --name "$service" \
    --output none
  
  echo "✅ $service configured"
done

echo "🎉 All services configured!"
```

## Summary

**What to do:**
1. ✅ Set `CORS_ORIGIN=*` on all backend Azure App Services
2. ✅ Configure frontend with `API_BASE_URL` pointing to API Gateway
3. ✅ Restart all services after configuration
4. ✅ Test the connection

**Expected Result:**
- Frontend can successfully redirect to HRMS
- API calls from frontend work without CORS errors
- Backend services accept requests from frontend domain

## Troubleshooting

### Still getting CORS errors?
1. Check browser console for exact error message
2. Verify `CORS_ORIGIN` is set correctly (no typos)
3. Ensure services were restarted after configuration
4. Check if there are multiple CORS configurations conflicting

### Frontend still stuck on redirect?
1. Check Network tab - is the HRMS microfrontend loading?
2. Verify the HRMS MFE is deployed and accessible
3. Check if there are JavaScript errors in console
4. Verify the frontend knows the correct backend URL

### Backend not responding?
1. Check Azure App Service logs
2. Verify services are running (check `/health` endpoint)
3. Check if there are any IP whitelist restrictions
4. Verify the API Gateway is accessible

