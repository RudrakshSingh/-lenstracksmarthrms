# ✅ Cosmos DB Setup Complete - Verification Guide

## Setup Status

All configuration steps have been completed by Rajveer:

- ✅ Key Vault configured
- ✅ Secrets added (auth + hr)
- ✅ Managed identity enabled on both services
- ✅ Key Vault access given (Get, List)
- ✅ App Service env variables configured
- ✅ Cosmos DB access allowed
- ✅ Both services restarted

## Verification Steps

### 1. Check Service Health

All services should be healthy:

```bash
# Auth Service
curl https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net/health

# HR Service
curl https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net/health

# API Gateway
curl https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/health
```

**Expected Response:** `{"status":"OK"}` or similar with 200 status code

### 2. Test Login Endpoint via API Gateway

```bash
curl -X POST https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrEmployeeId":"test@example.com","password":"test123"}'
```

**Expected Responses:**
- **200 OK**: Login successful (if user exists)
- **400 Bad Request**: Invalid credentials (endpoint is working, just wrong credentials)
- **503 Service Unavailable**: Database connection issue (check logs)
- **500 Internal Server Error**: Application error (check logs)

### 3. Check Azure App Service Logs

For **Auth Service**:
```bash
az webapp log tail \
  --name etelios-auth-service-h8btakd4byhncmgc \
  --resource-group <your-resource-group>
```

Look for:
- ✅ `Connecting to Azure Cosmos DB (MongoDB API)`
- ✅ `MongoDB connected successfully`
- ❌ Any database connection errors

For **HR Service**:
```bash
az webapp log tail \
  --name etelios-hr-service-backend-a4ayeqefdsbsc2g3 \
  --resource-group <your-resource-group>
```

### 4. Verify Environment Variables

Check if environment variables are set correctly:

```bash
# Auth Service
az webapp config appsettings list \
  --name etelios-auth-service-h8btakd4byhncmgc \
  --resource-group <your-resource-group> \
  --query "[?name=='MONGO_URI' || name=='USE_KEY_VAULT' || name=='SERVICE_NAME']"

# HR Service
az webapp config appsettings list \
  --name etelios-hr-service-backend-a4ayeqefdsbsc2g3 \
  --resource-group <your-resource-group> \
  --query "[?name=='MONGO_URI' || name=='USE_KEY_VAULT' || name=='SERVICE_NAME']"
```

**Expected:**
- `USE_KEY_VAULT=true` (if using Key Vault)
- `AZURE_KEY_VAULT_URL=https://<your-keyvault>.vault.azure.net/`
- `SERVICE_NAME=auth-service` (for auth) or `SERVICE_NAME=hr-service` (for hr)
- `MONGO_URI` should be empty if using Key Vault, or contain connection string if using env vars

### 5. Verify Key Vault Secrets (if using Key Vault)

```bash
az keyvault secret show \
  --vault-name <your-keyvault-name> \
  --name kv-mongo-uri-auth-service

az keyvault secret show \
  --vault-name <your-keyvault-name> \
  --name kv-mongo-uri-hr-service
```

**Expected:** Connection strings should be visible (values will be hidden for security)

## Success Indicators

✅ **All services return 200 on health checks**
✅ **Login endpoint returns 400 (invalid credentials) or 200 (success) - NOT 500 or 503**
✅ **Logs show "MongoDB connected successfully"**
✅ **No database connection errors in logs**

## Troubleshooting

### If Login Returns 500 Error

1. **Check App Service Logs** for database connection errors
2. **Verify Connection String Format:**
   - Should include database name: `.../etelios_auth?ssl=true...` or `.../etelios_hr?ssl=true...`
   - Should have `retrywrites=true` (code will override if false)
   - Should have `ssl=true`

3. **Verify Key Vault Access:**
   ```bash
   # Check Managed Identity
   az webapp identity show \
     --name <app-service-name> \
     --resource-group <your-resource-group>
   
   # Check Key Vault Policy
   az keyvault show \
     --name <your-keyvault-name> \
     --query "properties.accessPolicies"
   ```

4. **Check Cosmos DB Firewall:**
   - Ensure "Allow access from Azure services" is enabled
   - Or add App Service outbound IPs to allowed list

### If Login Returns 503 Error

This means the service is not reachable or database connection failed:
1. Check if service is running
2. Check database connection in logs
3. Verify network connectivity

### If Login Returns 404 Error

The endpoint path might be wrong. Verify:
- Auth Service: `/api/auth/login`
- API Gateway: `/api/auth/login` (proxies to auth service)

## Next Steps

1. ✅ **Test the login endpoint** from the frontend
2. ✅ **Monitor logs** for any connection issues
3. ✅ **Create test users** in Cosmos DB if needed
4. ✅ **Verify all endpoints** are working correctly

## Connection String Format Reference

The connection string should be in this format:

```
mongodb://[username]:[password]@[host]:[port]/[database]?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-mongo-db@
```

**Important:**
- Replace `[database]` with `etelios_auth` for auth service
- Replace `[database]` with `etelios_hr` for hr service
- The code will automatically set `retrywrites=true` even if connection string has `retrywrites=false`

## Support

If issues persist:
1. Check Azure App Service logs
2. Check Cosmos DB metrics in Azure Portal
3. Verify all environment variables are set correctly
4. Test connection string directly using MongoDB client

