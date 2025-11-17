# Why APIs Are Showing 10000ms Timeout

## The 10000ms is a Test Timeout, Not Service Response Time

The **10000ms (10 seconds)** you're seeing is the **test script timeout**, not the actual service response time. This means:

1. **Test Script Configuration:** The test script has `timeout: 10000` set (line 42 in `test-auth-hr-endpoints.js`)
2. **Services Not Responding:** The services are **not responding at all** within 10 seconds
3. **Timeout Error:** When a service doesn't respond within 10 seconds, axios throws a timeout error

## Why Services Are Timing Out

### 1. **HR Service - Complete Failure**
**Problem:** Service is not running or crashed
- All endpoints timing out
- Service URL not responding
- Container likely crashed during startup

**Root Causes:**
- Database connection hanging (waiting indefinitely)
- Missing environment variables
- Application crash during startup
- Port mismatch

### 2. **Auth Service - Partial Failure**
**Problem:** Service starts but some endpoints hang
- Health check works (simple endpoint, no DB)
- Login/Logout endpoints timeout (require database)

**Root Causes:**
- Database connection hanging during request processing
- Redis connection issues
- Blocking operations in request handlers
- Slow database queries

## The Real Problem: Blocking Operations

### Database Connection Issues

Looking at the code:

**Auth Service:**
```javascript
// In server.js - connectDB() might hang if DB is unreachable
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || `mongodb://localhost:27017/...`;
    await mongoose.connect(mongoUri); // This can hang indefinitely!
    // ...
  }
}
```

**HR Service:**
```javascript
// Similar issue - database connection can hang
await mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: 5000, // Only 5s timeout
  // But if connection hangs, requests still timeout
});
```

### What Happens:

1. **Service Startup:**
   - Service tries to connect to database
   - If database is unreachable, connection hangs
   - Service might not start properly
   - Or service starts but all DB operations hang

2. **Request Processing:**
   - Request comes in
   - Handler tries to query database
   - Database connection hangs (waiting for response)
   - Request never completes
   - Test times out after 10 seconds

## Solutions

### 1. **Increase Test Timeout (Temporary Fix)**
```javascript
// In test-auth-hr-endpoints.js
timeout: 30000, // Increase to 30 seconds
```

**But this doesn't fix the root cause!**

### 2. **Fix Database Connection Timeouts (Proper Fix)**

**Auth Service:**
```javascript
await mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: 5000, // Fail fast after 5s
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000, // Connection timeout
  maxPoolSize: 10,
  retryWrites: true
});
```

**HR Service:** Already has timeout, but might need adjustment.

### 3. **Add Request Timeouts**
```javascript
// In route handlers, add timeout middleware
const timeout = require('connect-timeout');
app.use(timeout('10s'));
```

### 4. **Check Service Status First**
Before testing endpoints, check if services are actually running:
- Check Azure App Service logs
- Verify container is running
- Test health endpoint first

## Current Status

### Services That Timeout:
1. **HR Service:** All endpoints (service likely down)
2. **Auth Service:** Login/Logout endpoints (DB connection hanging)

### Services That Work:
1. **Auth Service:** `/health` endpoint (no DB required)
2. **Gateway:** `/health` endpoint (no DB required)

## Immediate Actions

1. **Check Azure Logs:**
   ```bash
   # Check if services are running
   az webapp log tail --name <service-name> --resource-group <rg>
   ```

2. **Test Database Connectivity:**
   - Verify MongoDB is accessible
   - Check connection strings
   - Test from Azure App Service

3. **Increase Test Timeout (for now):**
   - Change timeout to 30 seconds
   - This will help identify if services are just slow

4. **Fix Database Connection:**
   - Add proper timeouts
   - Add connection retry logic
   - Handle connection failures gracefully

## Test Script Timeout Configuration

**Current:**
```javascript
timeout: 10000, // 10 seconds
```

**Recommended for debugging:**
```javascript
timeout: 30000, // 30 seconds - gives more time to identify slow services
```

**But remember:** If services are timing out, they're likely not working properly. Increasing timeout only helps identify the issue, it doesn't fix it.

