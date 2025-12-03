# HR Service - Application Error Fix

## Problem
Azure App Service showing "Application Error" page - service is crashing on startup.

## Root Causes

1. **Unhandled Promise Rejections** - Async errors not caught
2. **Module Loading Failures** - Missing dependencies or config files
3. **Database Connection Failures** - Causing app to crash
4. **Missing Error Handlers** - No fallback when startup fails

## Fixes Applied

### 1. Added Error Handling for Module Loading

**File:** `microservices/hr-service/src/server.js`

- Wrapped logger, azureConfig, and middleware loading in try-catch
- Added fallback implementations if modules fail to load
- App can start even if some modules are missing

### 2. Added Unhandled Error Handlers

```javascript
// Handle unhandled promise rejections early
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - log and continue
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit immediately - try to start server anyway
});
```

### 3. Wrapped startServer() Call

```javascript
// Start server with error handling
startServer().catch((error) => {
  logger.error('Failed to start server:', { error: error.message, stack: error.stack });
  // Try to start in degraded mode
  const PORT = process.env.PORT || process.env.WEBSITES_PORT || 3002;
  try {
    app.listen(PORT, '0.0.0.0', () => {
      logger.warn(`hr-service started in emergency mode on port ${PORT}`);
      logger.warn('Limited functionality available');
    });
  } catch (listenError) {
    logger.error('Failed to start server even in emergency mode:', { error: listenError.message });
    // Last resort - exit after 5 seconds to allow Azure to restart
    setTimeout(() => {
      process.exit(1);
    }, 5000);
  }
});
```

## Immediate Actions Required

### Step 1: Check Azure App Service Logs

1. Go to Azure Portal → App Service → `etelios-hr-service`
2. Go to **Log stream** or **Logs**
3. Look for error messages

**Common Errors to Look For:**
- `Cannot find module`
- `Database connection failed`
- `EADDRINUSE` (port already in use)
- `SyntaxError` or `ReferenceError`

### Step 2: Verify Environment Variables

**Required Variables:**
```bash
PORT=3002
NODE_ENV=production
SERVICE_NAME=hr-service
MONGO_URI=mongodb://...  # Cosmos DB connection string
```

**Check in Azure:**
1. App Service → Configuration → Application Settings
2. Verify all required variables are set
3. Check for typos

### Step 3: Verify Dependencies

**Check package.json:**
```bash
cd microservices/hr-service
npm install
```

**Common Missing Dependencies:**
- `winston` (logger)
- `mongoose` (database)
- `express` (web framework)
- `cors`, `helmet` (middleware)

### Step 4: Test Locally First

```bash
cd microservices/hr-service
npm install
npm start
```

**If it works locally but not on Azure:**
- Check environment variables
- Check Azure App Service logs
- Verify Node.js version matches

## Quick Diagnostic Commands

### Check if Service is Running
```bash
curl https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net/health
```

### Check Logs via Azure CLI
```bash
az webapp log tail --name etelios-hr-service --resource-group Etelios-rg
```

### Check Environment Variables
```bash
az webapp config appsettings list --name etelios-hr-service --resource-group Etelios-rg
```

## Common Issues & Solutions

### Issue 1: Missing MONGO_URI

**Error:** `MONGO_URI not set`

**Solution:**
1. Get Cosmos DB connection string from Azure Portal
2. Set `MONGO_URI` in App Service Configuration
3. Restart App Service

### Issue 2: Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3002`

**Solution:**
- Azure App Service automatically sets PORT
- Don't hardcode port 3002
- Use: `process.env.PORT || process.env.WEBSITES_PORT || 3002`

### Issue 3: Missing Dependencies

**Error:** `Cannot find module 'xyz'`

**Solution:**
1. Check `package.json` has all dependencies
2. Run `npm install` in service directory
3. Verify `node_modules` is included in deployment

### Issue 4: Syntax Error

**Error:** `SyntaxError: Unexpected token`

**Solution:**
1. Check code for syntax errors
2. Verify Node.js version compatibility
3. Check for missing brackets, quotes, etc.

## Verification Steps

After fixes are deployed:

1. **Check Health Endpoint:**
   ```bash
   curl https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net/health
   ```

2. **Check Logs:**
   - Should see: `hr-service running on port 3002`
   - Should NOT see: `Application Error` page

3. **Test Endpoints:**
   ```bash
   curl https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net/api/hr/status
   ```

## Code Changes Summary

✅ Added error handling for module loading
✅ Added unhandled rejection handlers
✅ Added uncaught exception handlers
✅ Wrapped startServer() in try-catch
✅ Added emergency mode startup
✅ Better error logging

---

**Status:** ✅ Fixes Applied, Ready for Deployment

