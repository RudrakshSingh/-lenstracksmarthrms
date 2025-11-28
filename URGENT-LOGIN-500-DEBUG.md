# URGENT: Login 500 Error Debug Guide

## Current Status
- **Error:** `POST /api/auth/login 500 Internal Server Error`
- **Response Time:** 1.62ms (very fast - suggests error before DB query)
- **Response Length:** 66 bytes

## Possible Causes

### 1. Code Not Deployed Yet
The fix with `.select('+password')` has been committed and pushed, but **may not be deployed to Azure yet**.

**Action Required:**
- Deploy the latest code to Azure
- Restart the auth service

### 2. Error Handler Issue
The error might be thrown but not properly formatted by the error handler.

### 3. Missing Dependency
A required module might be missing in the Azure environment.

### 4. Validation Error
The validation middleware might be throwing an error that's not being caught properly.

## Debugging Steps

### Step 1: Check Azure Logs
```bash
# View real-time logs
az webapp log tail \
  --name <auth-service-name> \
  --resource-group <resource-group>

# Or check in Azure Portal:
# App Service → Log stream
```

**Look for:**
- "Error in login controller"
- "User login failed"
- "Database connection unavailable"
- Any stack traces

### Step 2: Test the Endpoint Directly
```bash
curl -X POST https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrEmployeeId": "test@example.com",
    "password": "testpassword"
  }' \
  -v
```

**Check the response body** - it should be 66 bytes. What does it say?

### Step 3: Check if Code is Deployed
Verify the deployed code has `.select('+password')`:
```bash
# SSH into the App Service (if enabled)
az webapp ssh \
  --name <auth-service-name> \
  --resource-group <resource-group>

# Then check the file:
cat microservices/auth-service/src/services/auth.service.js | grep "select.*password"
```

### Step 4: Check Environment Variables
```bash
az webapp config appsettings list \
  --name <auth-service-name> \
  --resource-group <resource-group> \
  --query "[?name=='SERVICE_NAME' || name=='USE_KEY_VAULT' || name=='MONGO_URI']"
```

**Verify:**
- `SERVICE_NAME=auth-service`
- `USE_KEY_VAULT=true` (or `MONGO_URI` is set)
- `AZURE_KEY_VAULT_URL` is set

### Step 5: Check Database Connection
```bash
# Test database connection
curl https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/health
```

**Expected Response:**
```json
{
  "service": "auth-service",
  "status": "healthy",
  "timestamp": "...",
  "businessLogic": "active"
}
```

## Quick Fixes to Try

### Fix 1: Add Better Error Logging
Add more detailed error logging in the controller to see what's actually failing.

### Fix 2: Wrap logAuthEvent in Try-Catch
Even though `logAuthEvent` shouldn't fail, wrap it in try-catch to prevent it from breaking the flow.

### Fix 3: Check Error Handler
Ensure the error handler in `server.js` is properly catching and formatting errors.

## Most Likely Issue

Based on the 1.62ms response time, the error is happening **very early**, likely:
1. **Validation middleware** - Check if Joi validation is failing
2. **Missing module** - A required module might not be installed
3. **Error handler** - The error might not be properly formatted

## Next Steps

1. **Check Azure Logs** - This will tell us exactly what error is being thrown
2. **Verify Deployment** - Make sure the latest code is deployed
3. **Test Endpoint** - Use curl to see the actual error response
4. **Check Environment** - Verify all environment variables are set correctly

---

**Priority:** 🔴 **URGENT** - This is blocking user login

