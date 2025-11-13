# Fix Azure App Service Health Check Issue

## Problem
The server starts but Azure sends SIGTERM after ~20 seconds, killing the container. This is because Azure's health check is failing.

## Root Cause
1. Server is running on port 3002 (should be 3000 for main API gateway)
2. Azure App Service health check is not configured correctly
3. Health check path might be wrong or port mismatch

## Solution

### Step 1: Fix Port Configuration in Azure App Service

1. **Go to Azure Portal:**
   - Navigate to your App Service: `etelios-app-service-cxf6hvgjb7gah7dr`
   - Go to **Configuration** → **Application settings**

2. **Set Correct Port:**
   - Add/Update: `WEBSITES_PORT` = `3000` (NOT 3002)
   - Add/Update: `PORT` = `3000` (NOT 3002)
   - Click **Save**

3. **Configure Health Check Path:**
   - Go to **Settings** → **Health check** (or **Configuration** → **General settings**)
   - Enable **Health check**
   - Set **Path**: `/health`
   - Set **Interval**: `30` seconds
   - Click **Save**

### Step 2: Verify Health Check Endpoint

The health endpoint should return 200 OK:
```bash
curl https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "...",
  "service": "Etelios Main Server",
  "version": "1.0.0",
  "environment": "production"
}
```

### Step 3: Update Pipeline to Set Correct Port

The pipeline should set `WEBSITES_PORT=3000` in app settings. Check `azure-pipelines.yml`:

```yaml
appSettings: |
  [
    {
      "name": "WEBSITES_PORT",
      "value": "3000"
    },
    {
      "name": "PORT",
      "value": "3000"
    }
  ]
```

### Step 4: Restart App Service

After making changes:
1. Go to **Overview** → Click **Restart**
2. Wait for restart to complete
3. Check **Log stream** to verify it starts on port 3000

## Expected Logs After Fix

```
🚀 Etelios Main Server started on port 3000
Environment: production
Health check: http://localhost:3000/health
```

**NO SIGTERM should appear** - the container should stay running.

## Troubleshooting

### If still getting SIGTERM:

1. **Check Health Check Path:**
   - Make sure `/health` endpoint returns 200 OK
   - Test: `curl https://your-app.azurewebsites.net/health`

2. **Check Port Mismatch:**
   - Verify `WEBSITES_PORT=3000` in App Service settings
   - Check logs show "started on port 3000"

3. **Check Startup Time:**
   - Azure might be killing it if startup takes too long
   - Increase health check interval or startup timeout

4. **Check Container Logs:**
   - Go to **Log stream** in Azure Portal
   - Look for any errors before SIGTERM

5. **Disable Health Check Temporarily:**
   - Go to **Health check** settings
   - Disable it temporarily to test if that's the issue
   - If container stays alive, the issue is health check configuration

## Alternative: Use Azure App Service Health Check Feature

1. Go to **Settings** → **Health check**
2. Enable **Health check**
3. Set **Path**: `/health`
4. Set **Interval**: `30` seconds
5. Set **Unhealthy threshold**: `3`
6. Click **Save**

This will make Azure check `/health` endpoint and restart if it fails.

