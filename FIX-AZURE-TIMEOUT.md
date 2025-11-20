# Fix Azure App Service 408 Timeout

## Problem

The mock login endpoint is still returning 408 Request Timeout errors even after code optimization. The timeout occurs at ~10-11 seconds, which suggests **Azure App Service has a default request timeout**.

## Root Cause

Azure App Service has a default request timeout of **230 seconds**, but there might be:
1. **Load balancer timeout** (default: 4 minutes, but can be configured)
2. **Application Gateway timeout** (if using one)
3. **Database connection timeout** (MongoDB connection is slow)
4. **Cold start** (App Service might be cold)

## Solution: Increase Azure App Service Timeout

### Option 1: Add WEBSITES_REQUEST_TIMEOUT to App Settings

Add this to the Azure Pipeline `appSettings`:

```yaml
appSettings: '-WEBSITES_PORT "3001" -NODE_ENV "production" -PORT "3001" -WEBSITES_REQUEST_TIMEOUT "300" ...'
```

### Option 2: Configure in Azure Portal

1. Go to Azure Portal → App Service
2. Configuration → Application settings
3. Add new setting:
   - **Name**: `WEBSITES_REQUEST_TIMEOUT`
   - **Value**: `300` (5 minutes)

### Option 3: Update Pipeline

Update `microservices/auth-service/azure-pipelines.yml`:

```yaml
appSettings: '-WEBSITES_PORT "3001" -NODE_ENV "production" -PORT "3001" -WEBSITES_REQUEST_TIMEOUT "300" -SERVICE_NAME "auth-service" ...'
```

## Additional Optimizations

### 1. Pre-create Mock Users

Run the pre-create script to eliminate user creation delays:

```bash
# On Azure App Service (via SSH or Kudu console)
node scripts/pre-create-mock-users.js
```

### 2. Optimize Database Connection

Ensure MongoDB connection is optimized in `src/server.js`:

```javascript
await mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: 10000, // Increase to 10s
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 2,
  // ... other options
});
```

### 3. Add Response Timeout Handling

Add explicit timeout handling in the controller:

```javascript
const mockLogin = async (req, res, next) => {
  // Set response timeout
  req.setTimeout(250000); // 250 seconds
  
  try {
    // ... existing code
  } catch (error) {
    // ... error handling
  }
};
```

## Quick Fix: Update Pipeline

Update the pipeline to add the timeout setting:

```yaml
appSettings: '-WEBSITES_PORT "3001" -NODE_ENV "production" -PORT "3001" -WEBSITES_REQUEST_TIMEOUT "300" -SERVICE_NAME "auth-service" -MONGO_URI "$(mongo-uri)" ...'
```

## Verify Deployment

After updating, verify:
1. Pipeline completes successfully
2. App Service restarts
3. Check App Service logs for the new setting
4. Test the endpoint again

## Alternative: Use Async Processing

If timeout persists, consider:
1. Return immediately with "processing" status
2. Process login in background
3. Use webhooks or polling for completion

But this is more complex - try timeout increase first.

