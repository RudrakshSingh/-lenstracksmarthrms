# HR Service - Application Error Fix Guide

## Problem
Azure App Service showing "Application Error" page when accessing the service URL.

## Root Causes

1. **PM2 ecosystem.config.js not found** ✅ FIXED
2. **Service crashing on startup** - Need to verify
3. **Port binding issues** - Need to check
4. **Missing dependencies** - Need to verify
5. **Startup command misconfigured** - Need to check Azure settings

## Fixes Applied

### 1. Updated ecosystem.config.js
- ✅ Changed log files to use stdout/stderr instead of file paths
- ✅ Disabled `wait_ready` to avoid timeout issues
- ✅ Increased `listen_timeout` to 30 seconds
- ✅ Added proper environment variable handling

### 2. Created start.sh Script
- ✅ Smart startup script that checks for PM2
- ✅ Falls back to direct Node.js if PM2 not available
- ✅ Creates logs directory
- ✅ Sets proper environment variables

### 3. Updated Dockerfile
- ✅ Uses start.sh as CMD
- ✅ Makes start.sh executable
- ✅ PM2 installed globally

## Immediate Actions Required

### Step 1: Check Azure App Service Configuration

**Go to Azure Portal:**
1. Navigate to: **App Services** → **etelios-hr-service**
2. Go to: **Configuration** → **General settings**

**Check/Set:**
- **Startup Command:** Leave EMPTY (Docker CMD will be used) OR set to: `sh start.sh`
- **Always On:** Should be **ON**
- **HTTP Version:** Should be **2.0** (or 1.1)

### Step 2: Verify Environment Variables

**Go to:** **Configuration** → **Application settings**

**Required Variables:**
```bash
PORT=3002
WEBSITES_PORT=3002
NODE_ENV=production
SERVICE_NAME=hr-service
MONGO_URI=<your-cosmos-db-connection-string>
```

**Optional but Recommended:**
```bash
JWT_SECRET=<your-jwt-secret>
JWT_REFRESH_SECRET=<your-refresh-secret>
CORS_ORIGIN=*
```

### Step 3: Check Deployment Method

**Verify if using Docker or Oryx:**

1. Go to: **Deployment Center**
2. Check: **Source** and **Build Provider**

**If using Docker:**
- ✅ Dockerfile will be used
- ✅ start.sh will run automatically

**If using Oryx (non-Docker):**
- Need to set startup command manually
- Set to: `sh start.sh` or `pm2-runtime ecosystem.config.js`

### Step 4: Check Logs

**Method 1: Azure Portal**
1. Go to: **Log stream** (under Monitoring)
2. Watch for errors

**Method 2: Azure CLI**
```bash
az webapp log tail --name etelios-hr-service --resource-group Etelios-rg
```

**Method 3: SSH into App Service**
```bash
az webapp ssh --name etelios-hr-service --resource-group Etelios-rg
```

Then check:
```bash
cd /home/site/wwwroot
ls -la
cat logs/hr-error.log  # If exists
pm2 logs  # If PM2 is running
```

## Common Errors & Solutions

### Error 1: "Cannot find module"
**Solution:**
- Check if `node_modules` is deployed
- Verify `package.json` has all dependencies
- Rebuild Docker image

### Error 2: "Port already in use"
**Solution:**
- Azure sets PORT automatically
- Don't hardcode port in code
- Use: `process.env.PORT || process.env.WEBSITES_PORT || 3002`

### Error 3: "Database connection failed"
**Solution:**
- Service should still start (degraded mode)
- Check MONGO_URI is correct
- Verify Cosmos DB connection string format
- Check firewall rules

### Error 4: "PM2 not found"
**Solution:**
- PM2 is installed in Dockerfile
- If using Oryx, install via startup command: `npm install -g pm2 && pm2-runtime ecosystem.config.js`
- Or use: `node src/server.js` directly

### Error 5: "ecosystem.config.js not found"
**Solution:**
- ✅ Already fixed - file is copied in Dockerfile
- Verify file exists: `ls -la ecosystem.config.js`
- Check working directory

## Verification Steps

### Step 1: Check Service is Running

```bash
curl https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net/health
```

**Expected Response:**
```json
{
  "service": "hr-service",
  "status": "healthy",
  "timestamp": "...",
  "port": 3002,
  "environment": "production"
}
```

### Step 2: Check Logs for Errors

Look for:
- ✅ "hr-service running on port 3002"
- ❌ "Error:", "Failed:", "Cannot find"

### Step 3: Test API Endpoints

```bash
# Health check
curl https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net/health

# Status endpoint
curl https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net/api/hr/status
```

## Quick Fix Commands

### If Service Won't Start:

**Option 1: Use Direct Node.js (Bypass PM2)**
1. Azure Portal → Configuration → General settings
2. Set Startup Command: `node src/server.js`
3. Save and Restart

**Option 2: Use npm start**
1. Azure Portal → Configuration → General settings
2. Set Startup Command: `npm start`
3. Save and Restart

**Option 3: Use start.sh**
1. Azure Portal → Configuration → General settings
2. Set Startup Command: `sh start.sh`
3. Save and Restart

## Debugging Checklist

- [ ] Check Azure App Service logs
- [ ] Verify environment variables are set
- [ ] Check if Docker image built successfully
- [ ] Verify PORT is set correctly
- [ ] Check database connection string
- [ ] Verify all dependencies are installed
- [ ] Check if service is listening on correct port
- [ ] Verify health endpoint responds
- [ ] Check for any startup errors in logs

## Files Changed

1. ✅ `microservices/hr-service/ecosystem.config.js` - Fixed log paths, timeouts
2. ✅ `microservices/hr-service/start.sh` - New startup script
3. ✅ `microservices/hr-service/Dockerfile` - Updated CMD to use start.sh
4. ✅ `microservices/hr-service/package.json` - Added PM2 dependency

## Next Steps

1. **Deploy the fixes:**
   ```bash
   git add .
   git commit -m "Fix: HR Service Application Error - improve startup reliability"
   git push origin main
   ```

2. **Wait for Azure DevOps Pipeline** to build and deploy

3. **Check Logs** after deployment

4. **Test Health Endpoint**

5. **If still failing**, check Azure Portal logs and follow debugging checklist

---

**Status:** ✅ Fixes Applied, Ready for Deployment

**Important:** After deployment, check Azure Portal logs immediately to see if service starts successfully.

