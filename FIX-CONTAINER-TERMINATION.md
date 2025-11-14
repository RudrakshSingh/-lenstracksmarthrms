# Fix Container Termination After 20 Seconds

## Problem
Container starts successfully but gets terminated after ~20 seconds with:
```
Container is terminating. Grace period: 5 seconds.
```

## Root Causes

1. **Image Name Mismatch**: Azure is pulling `etelios-app:28-main` but pipeline builds `eteliosbackend`
2. **Health Check Failure**: Azure health check is failing, causing container termination
3. **App Not Starting Fast Enough**: Application takes longer than health check timeout to start

## Solution

### Step 1: Fix Image Name in Azure Portal

The App Service is configured with wrong image name. Update it:

1. Go to **Azure Portal** → Your App Service
2. **Configuration** → **General settings**
3. Under **Container settings**:
   - **Image and tag**: Change to `eteliosacr-hvawabdbgge7e0fu.azurecr.io/eteliosbackend:latest`
   - **Registry**: Should be `eteliosacr-hvawabdbgge7e0fu.azurecr.io`
   - Click **Save**

### Step 2: Configure Health Check in Azure Portal

1. Go to **Settings** → **Health check**
2. Enable **Health check**
3. Set **Path**: `/health`
4. Set **Interval**: `30` seconds
5. Set **Unhealthy threshold**: `3`
6. Click **Save**

### Step 3: Verify Application Settings

Go to **Configuration** → **Application settings** and verify:
- `WEBSITES_PORT` = `3000`
- `PORT` = `3000`
- `NODE_ENV` = `production`

### Step 4: Restart App Service

1. Go to **Overview**
2. Click **Restart**
3. Wait 2-3 minutes
4. Check **Log stream**

## Expected Behavior After Fix

**In Log Stream, you should see:**
```
Container is running.
🚀 Etelios Main Server started on port 3000
Health check: http://localhost:3000/health
Site started.
```

**Container should NOT terminate** - it should stay running.

## If Still Terminating

### Option 1: Disable Health Check Temporarily

1. Go to **Settings** → **Health check**
2. **Disable** health check
3. Restart App Service
4. Check if container stays alive

If container stays alive, the issue is health check configuration.

### Option 2: Increase Startup Time

The app might need more time to start. Check:
1. Database connection time
2. Redis connection time
3. Any blocking operations during startup

### Option 3: Check Application Logs

1. Go to **Log stream**
2. Look for errors before termination
3. Check if app is actually starting:
   - Look for "Etelios Main Server started"
   - Look for "MongoDB connected"
   - Look for any error messages

### Option 4: Test Health Endpoint Manually

Once container starts, quickly test:
```bash
curl https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/health
```

If it returns 200 OK, health check should pass.

## Pipeline Update

The pipeline now uses `latest` tag instead of `$(tag)` to ensure consistency. After next deployment:
1. Pipeline will build and push `eteliosbackend:latest`
2. App Service will pull `eteliosbackend:latest`
3. Names will match

## Verification Checklist

- [ ] Image name in App Service matches pipeline (`eteliosbackend:latest`)
- [ ] Health check is enabled with path `/health`
- [ ] `WEBSITES_PORT=3000` is set
- [ ] `PORT=3000` is set
- [ ] App Service restarted
- [ ] Log stream shows "Container is running" without termination
- [ ] Health endpoint returns 200 OK

