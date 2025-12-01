# HR Service - PM2 Ecosystem Config Fix

## Problem
Azure App Service logs show:
```
PM2 error: ENOENT: no such file or directory, open '/home/site/wwwroot/ecosystem.config.js'
```

Azure App Service is trying to use PM2 to start the service, but the `ecosystem.config.js` file is missing.

## Root Cause
Azure App Service on Linux automatically uses PM2 if it detects Node.js, but:
1. The `ecosystem.config.js` file might not be included in the Docker image
2. PM2 might not be installed
3. The startup command might be misconfigured

## Solution Applied

### 1. Updated Dockerfile

**File:** `microservices/hr-service/Dockerfile`

**Changes:**
- ✅ Added `RUN npm install -g pm2` to install PM2 globally
- ✅ Changed CMD to use PM2: `CMD ["pm2-runtime", "ecosystem.config.js"]`
- ✅ Ensured `ecosystem.config.js` is copied with `COPY . .`

### 2. Updated package.json

**File:** `microservices/hr-service/package.json`

**Changes:**
- ✅ Added `pm2` as a dependency
- ✅ Added `start:pm2` script for PM2 startup

### 3. Verify ecosystem.config.js Exists

**File:** `microservices/hr-service/ecosystem.config.js` ✅ Already exists

## Azure App Service Configuration

### Option 1: Use PM2 (Recommended)

**If using Docker:**
- The Dockerfile CMD will use PM2 automatically
- No additional configuration needed

**If using Oryx build (non-Docker):**
1. Go to Azure Portal → App Service → `etelios-hr-service`
2. Go to **Configuration** → **General settings**
3. Set **Startup Command** to:
   ```bash
   pm2-runtime ecosystem.config.js
   ```

### Option 2: Use Node Directly (Alternative)

If you prefer not to use PM2:

1. Go to Azure Portal → App Service → `etelios-hr-service`
2. Go to **Configuration** → **General settings**
3. Set **Startup Command** to:
   ```bash
   npm start
   ```
   OR
   ```bash
   node src/server.js
   ```

## Verification Steps

### Step 1: Check if File is Deployed

After deployment, SSH into Azure App Service:
```bash
az webapp ssh --name etelios-hr-service --resource-group Etelios-rg
```

Then check:
```bash
cd /home/site/wwwroot
ls -la ecosystem.config.js
```

**Expected:** File should exist

### Step 2: Check if PM2 is Installed

```bash
which pm2
pm2 --version
```

**Expected:** PM2 should be installed and show version

### Step 3: Check Logs

After deployment, check logs:
```bash
az webapp log tail --name etelios-hr-service --resource-group Etelios-rg
```

**Expected Output:**
- ✅ Should NOT see: `PM2 error: ENOENT: no such file or directory`
- ✅ Should see: `hr-service running on port 3002` or similar
- ✅ Should see PM2 starting the service

### Step 4: Test Health Endpoint

```bash
curl https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net/health
```

**Expected:** `{"status":"ok","service":"hr-service"}`

## Troubleshooting

### Issue 1: Still Getting "File Not Found" Error

**Possible Causes:**
1. File not included in Docker build
2. File in wrong location
3. Azure using Oryx build instead of Docker

**Solution:**
1. Check Dockerfile includes: `COPY . .`
2. Verify `ecosystem.config.js` is in `microservices/hr-service/` directory
3. Check Azure App Service is using Docker (not Oryx)

### Issue 2: PM2 Not Found

**Solution:**
1. PM2 is installed globally in Dockerfile
2. If using Oryx, add to package.json dependencies (already done)
3. Or install via startup command: `npm install -g pm2 && pm2-runtime ecosystem.config.js`

### Issue 3: Service Not Starting

**Check:**
1. Environment variables are set correctly
2. Database connection string is valid
3. Port is set correctly (should use PORT env var)

**Debug:**
```bash
# SSH into App Service
az webapp ssh --name etelios-hr-service --resource-group Etelios-rg

# Check environment variables
env | grep -E "PORT|MONGO|NODE"

# Try starting manually
cd /home/site/wwwroot
pm2-runtime ecosystem.config.js
```

## Files Changed

1. ✅ `microservices/hr-service/Dockerfile` - Added PM2, updated CMD
2. ✅ `microservices/hr-service/package.json` - Added PM2 dependency
3. ✅ `microservices/hr-service/ecosystem.config.js` - Already exists

## Next Steps

1. **Commit and Push Changes:**
   ```bash
   git add microservices/hr-service/Dockerfile microservices/hr-service/package.json
   git commit -m "Fix: Add PM2 support for Azure App Service"
   git push origin main
   ```

2. **Trigger Azure DevOps Pipeline:**
   - Pipeline should automatically build and deploy
   - Or manually trigger if needed

3. **Monitor Deployment:**
   - Check Azure DevOps pipeline logs
   - Check App Service logs after deployment
   - Test health endpoint

4. **Verify Service is Running:**
   - Check App Service status in Azure Portal
   - Test API endpoints
   - Monitor logs for errors

---

**Status:** ✅ Fixes Applied, Ready for Deployment
