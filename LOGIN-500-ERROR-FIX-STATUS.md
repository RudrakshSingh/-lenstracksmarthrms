# Login 500 Error - Fix Status & Next Steps

## Current Status

✅ **Good News:**
- Request is reaching the backend (not 404 anymore)
- API Gateway is routing correctly to auth service
- Auth service is online

❌ **Issue:**
- Login endpoint returning **500 Internal Server Error**
- This indicates the auth service is receiving the request but failing to process it

## Root Cause

The 500 error is most likely caused by:
1. **Database connection failure** - Cosmos DB connection string not configured correctly
2. **Missing database name** in connection string
3. **Services not restarted** after connection string update

## Solution

### Step 1: Verify Connection Strings Are Updated

Rajveer needs to ensure the connection strings in Azure Key Vault or environment variables include the database name:

**Auth Service Connection String MUST include `/etelios_auth`:**
```
mongodb://etelios-mongo-db:password@etelios-mongo-db.mongo.cosmos.azure.com:10255/etelios_auth?ssl=true&...
                                                                              ^^^^^^^^^^^^^^^^
                                                                              REQUIRED!
```

**HR Service Connection String MUST include `/etelios_hr`:**
```
mongodb://etelios-hr-service-server:password@etelios-hr-service-server.mongo.cosmos.azure.com:10255/etelios_hr?ssl=true&...
                                                                                              ^^^^^^^^^^^^^^^^
                                                                                              REQUIRED!
```

### Step 2: Restart Services

After updating connection strings, restart both services:

```bash
# Restart Auth Service
az webapp restart \
  --name etelios-auth-service-h8btakd4byhncmgc \
  --resource-group <your-resource-group>

# Restart HR Service  
az webapp restart \
  --name etelios-hr-service-backend-a4ayeqefdsbsc2g3 \
  --resource-group <your-resource-group>
```

### Step 3: Check Logs

After restarting, check the logs to verify database connection:

```bash
# Check Auth Service Logs
az webapp log tail \
  --name etelios-auth-service-h8btakd4byhncmgc \
  --resource-group <your-resource-group>
```

**Look for:**
- ✅ `Connecting to Azure Cosmos DB (MongoDB API)`
- ✅ `MongoDB connected successfully`
- ❌ Any database connection errors

### Step 4: Test Login Again

After restarting and verifying logs, test the login endpoint:

```bash
curl -X POST https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrEmployeeId":"test@example.com","password":"test123"}'
```

**Expected Responses:**
- ✅ **200 OK**: Login successful (if user exists)
- ✅ **400 Bad Request**: Invalid credentials (endpoint is working, just wrong credentials)
- ❌ **500 Internal Server Error**: Still a database/application error (check logs)
- ❌ **503 Service Unavailable**: Service not reachable

## Quick Verification Checklist

- [ ] Connection strings updated with database names (`/etelios_auth` and `/etelios_hr`)
- [ ] Connection strings have `retrywrites=true`
- [ ] Services restarted after connection string update
- [ ] Logs show "MongoDB connected successfully"
- [ ] Login endpoint tested and returns 400 or 200 (not 500)

## If Still Getting 500 Error

1. **Check Azure App Service Logs** for the exact error message
2. **Verify Key Vault Secrets** are correctly set:
   ```bash
   az keyvault secret show \
     --vault-name etelios-keyvault \
     --name kv-mongo-uri-auth-service \
     --query value
   ```
3. **Verify Environment Variables** are set correctly
4. **Check Cosmos DB Firewall** allows Azure App Services
5. **Verify Managed Identity** has access to Key Vault

## Reference Documents

- `RAJVEER-AZURE-REQUIREMENTS-COMPLETE.md` - Complete setup guide
- `URGENT-COSMOS-DB-FIX.md` - Quick fix guide
- `COSMOS-DB-CONNECTION-SETUP.md` - Detailed setup instructions

---

**Status:** ⏳ Waiting for DevOps to update connection strings and restart services

