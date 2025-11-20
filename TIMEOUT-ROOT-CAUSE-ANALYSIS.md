# 408 Timeout Root Cause Analysis

## Current Status

**Issue**: 408 Request Timeout consistently at ~10-11 seconds  
**Status**: Still occurring after code optimization and timeout increase

## Possible Root Causes

### 1. Load Balancer / Application Gateway Timeout ⚠️ MOST LIKELY

Azure App Service sits behind a load balancer/application gateway that may have its own timeout (often 10-30 seconds).

**Solution**: Configure timeout at load balancer level (requires Azure Portal access)

### 2. Database Connection Timeout

MongoDB connection might be taking too long, especially if:
- Database is in different region
- Network latency is high
- Connection pool is exhausted
- Database is slow to respond

**Current Settings**:
```javascript
serverSelectionTimeoutMS: 5000,  // 5 seconds
socketTimeoutMS: 45000,          // 45 seconds
```

**Solution**: Increase `serverSelectionTimeoutMS` or optimize connection

### 3. Code Not Deployed Yet

The new optimized code might not be deployed yet.

**Check**: Verify deployment completed in Azure DevOps pipeline

### 4. Cold Start

App Service might be cold, causing slow startup.

**Solution**: Enable Always On in App Service settings

## Immediate Actions

### Action 1: Check Database Connection

The timeout might be happening during database connection. Let's add more aggressive connection settings:

```javascript
// In src/server.js or database config
await mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: 30000,  // Increase to 30s
  socketTimeoutMS: 60000,            // Increase to 60s
  connectTimeoutMS: 30000,           // Add explicit connect timeout
  maxPoolSize: 10,
  minPoolSize: 2,
  // ... other options
});
```

### Action 2: Add Request Timeout in Code

Add explicit timeout handling in the mock login controller:

```javascript
const mockLogin = async (req, res, next) => {
  // Set longer timeout for this specific endpoint
  req.setTimeout(240000); // 4 minutes
  
  try {
    // ... existing code
  } catch (error) {
    // ... error handling
  }
};
```

### Action 3: Pre-create Mock Users

Run the pre-create script to eliminate user creation delays entirely:

```bash
# On Azure App Service (via SSH/Kudu)
node scripts/pre-create-mock-users.js
```

### Action 4: Check Azure Portal Settings

1. **App Service → Configuration → General Settings**
   - Enable "Always On"
   - Check "ARR Affinity" settings

2. **App Service → Networking**
   - Check if Application Gateway is configured
   - Check load balancer timeout settings

3. **App Service → Logs**
   - Check Application Insights for actual error
   - Look for database connection errors

## Recommended Fix Priority

1. **HIGH**: Pre-create mock users (eliminates DB write delay)
2. **HIGH**: Increase MongoDB connection timeouts
3. **MEDIUM**: Check load balancer/gateway timeout settings
4. **MEDIUM**: Enable Always On in App Service
5. **LOW**: Add request timeout in code (redundant if Azure timeout works)

## Quick Test

To verify if it's a database issue, test with a simple endpoint that doesn't hit the database:

```bash
curl https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net/health
```

If this works quickly, the issue is likely database-related.

## Next Steps

1. Pre-create mock users (fastest fix)
2. Increase MongoDB timeouts
3. Check Azure Portal for load balancer settings
4. Enable Always On
5. Monitor Application Insights for actual errors

