# Login 500 Error - Diagnosis & Fix

## Current Issue

**Error:** `POST /api/auth/login 500 (Internal Server Error)`

## Root Cause Analysis

The 500 error is likely caused by one of these issues:

### 1. Database Connection Not Established
- The auth service may not be connected to Cosmos DB
- Key Vault secret may not be accessible
- `SERVICE_NAME` environment variable may not be set correctly

### 2. Key Vault Access Issues
- Managed Identity may not have proper permissions
- Key Vault secret name may be incorrect
- Connection string format may be invalid

### 3. Cosmos DB Connection String Issues
- Database name may be missing from connection string
- SSL configuration may be incorrect
- Network/firewall rules may be blocking connection

## Fixes Applied

### 1. Added Database Connection Check
- Login method now checks `mongoose.connection.readyState` before querying
- Returns 503 (Service Unavailable) if database is not connected

### 2. Added Query Timeout Protection
- All database queries now have `maxTimeMS: 5000` (5 second timeout)
- Prevents queries from hanging indefinitely

### 3. Improved Error Handling
- Distinguishes between database errors and authentication errors
- Returns appropriate HTTP status codes:
  - **503** for database connection errors
  - **400** for authentication errors (invalid credentials)
  - **500** for unexpected errors

### 4. Better Error Logging
- Logs database connection state
- Logs error names and stack traces
- Helps identify the exact cause of failures

## Verification Steps

### 1. Check Auth Service Environment Variables

In Azure App Service, verify these are set:

```bash
SERVICE_NAME=auth-service
USE_KEY_VAULT=true
AZURE_KEY_VAULT_URL=https://etelios-keyvault.vault.azure.net/
AZURE_KEY_VAULT_NAME=etelios-keyvault
MONGO_URI=""  # Leave empty to use Key Vault
```

### 2. Verify Key Vault Secret Exists

```bash
az keyvault secret show \
  --vault-name etelios-keyvault \
  --name kv-mongo-uri-auth-service \
  --query value
```

**Expected Format:**
```
mongodb://etelios-mongo-db:password@etelios-mongo-db.documents.azure.com:10255/etelios_auth?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-mongo-db@
```

**Important:** The database name (`etelios_auth`) MUST be included before the `?` character.

### 3. Check Managed Identity Permissions

```bash
# Get the App Service's Managed Identity Object ID
az webapp identity show \
  --name <auth-service-app-name> \
  --resource-group <resource-group> \
  --query principalId

# Verify Key Vault access policy
az keyvault show \
  --name etelios-keyvault \
  --query properties.accessPolicies
```

### 4. Test Database Connection

Check the auth service logs in Azure Portal:
- Go to: App Service → Log stream
- Look for: "auth-service: MongoDB connected successfully"
- If you see: "Database connection failed" → Check Key Vault and connection string

### 5. Test Login Endpoint Directly

```bash
# Test the login endpoint
curl -X POST https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrEmployeeId": "test@example.com",
    "password": "testpassword"
  }'
```

**Expected Responses:**

**If Database Not Connected (503):**
```json
{
  "success": false,
  "message": "Service temporarily unavailable. Please try again later.",
  "error": "Database connection error",
  "service": "auth-service"
}
```

**If Invalid Credentials (400):**
```json
{
  "success": false,
  "message": "Invalid email or password",
  "service": "auth-service"
}
```

**If Database Error (503):**
```json
{
  "success": false,
  "message": "Database connection timeout. Please try again later.",
  "service": "auth-service"
}
```

## Next Steps for Rajveer

1. **Verify Key Vault Secret:**
   - Secret name: `kv-mongo-uri-auth-service`
   - Must include database name: `/etelios_auth?`
   - Format must be correct (see above)

2. **Check Managed Identity:**
   - Ensure auth service has Managed Identity enabled
   - Verify it has "Get" and "List" permissions on Key Vault

3. **Restart Auth Service:**
   ```bash
   az webapp restart \
     --name <auth-service-app-name> \
     --resource-group <resource-group>
   ```

4. **Check Logs:**
   - Monitor App Service logs for connection errors
   - Look for "MongoDB connected successfully" message

## Code Changes Summary

1. **`microservices/auth-service/src/services/auth.service.js`:**
   - Added database connection check before login
   - Added query timeout (`maxTimeMS: 5000`)
   - Added `.select('+password')` to explicitly select password field
   - Improved error handling for database errors

2. **`microservices/auth-service/src/controllers/authController.js`:**
   - Improved error handling to return 503 for database errors
   - Better error messages for different error types

## Testing

After deployment, test with:

```bash
# Test with valid credentials (if user exists)
curl -X POST https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrEmployeeId": "admin@etelios.com", "password": "password123"}'

# Test with invalid credentials (should return 400)
curl -X POST https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrEmployeeId": "invalid@example.com", "password": "wrong"}'
```

---

**Status:** ✅ Code fixes applied, waiting for deployment and verification

