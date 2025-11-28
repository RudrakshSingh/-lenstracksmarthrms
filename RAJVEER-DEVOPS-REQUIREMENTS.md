# DevOps Requirements - Rajveer Singh Rajput

## Overview
This document outlines all the tasks and configurations required from the DevOps side to ensure the Etelios HRMS backend services are properly configured and operational.

---

## ✅ Completed Tasks

The following have already been completed:
- ✅ Key Vault configured
- ✅ Secrets added (auth + hr)
- ✅ Managed identity enabled on both services
- ✅ Key Vault access given (Get, List)
- ✅ App Service env variables configured
- ✅ Cosmos DB access allowed
- ✅ Both services restarted

---

## 🚨 URGENT: Fix Required

### Issue: Login Endpoint Returning 500 Error

**Root Cause:** The Cosmos DB connection strings are missing the **database name** in the connection string.

### Solution Required

The connection string **MUST** include the database name before the `?` character.

#### Current Format (WRONG):
```
mongodb://username:password@host:port/?ssl=true&...
```

#### Required Format (CORRECT):
```
mongodb://username:password@host:port/DATABASE_NAME?ssl=true&...
```

---

## 📋 Required Actions

### 1. Update Cosmos DB Connection Strings

#### Option A: Update Key Vault Secrets (Recommended)

**For Auth Service:**
```bash
az keyvault secret set \
  --vault-name <your-keyvault-name> \
  --name "kv-mongo-uri-auth-service" \
  --value "mongodb://etelios-mongo-db:h4cmg34pAbKZxyZRqwqxa2PhWoZ9ux5quvBZh2EqhSIaGrPMAaF8btIdgoMawHILafZBw8YgsddlACDbbpOoJQ==@etelios-mongo-db.mongo.cosmos.azure.com:10255/etelios_auth?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-mongo-db@"
```

**For HR Service:**
```bash
az keyvault secret set \
  --vault-name <your-keyvault-name> \
  --name "kv-mongo-uri-hr-service" \
  --value "mongodb://etelios-hr-service-server:jfoIoaQ4fg7Qn8P13HSwjqytvXM1BiCv3hq1k8gYGLwKIMsDwSXKSnJVdIqB8Twpcr4S6NCkS81nACDb0ttZfg==@etelios-hr-service-server.mongo.cosmos.azure.com:10255/etelios_hr?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-hr-service-server@"
```

**Key Changes:**
- Added `/etelios_auth` for auth service (before the `?`)
- Added `/etelios_hr` for hr service (before the `?`)
- Changed `retrywrites=false` to `retrywrites=true` (required for Cosmos DB)

#### Option B: Update Environment Variables (If not using Key Vault)

**For Auth Service:**
```bash
az webapp config appsettings set \
  --name etelios-auth-service-h8btakd4byhncmgc \
  --resource-group <your-resource-group> \
  --settings \
    MONGO_URI="mongodb://etelios-mongo-db:h4cmg34pAbKZxyZRqwqxa2PhWoZ9ux5quvBZh2EqhSIaGrPMAaF8btIdgoMawHILafZBw8YgsddlACDbbpOoJQ==@etelios-mongo-db.mongo.cosmos.azure.com:10255/etelios_auth?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-mongo-db@" \
    SERVICE_NAME=auth-service
```

**For HR Service:**
```bash
az webapp config appsettings set \
  --name etelios-hr-service-backend-a4ayeqefdsbsc2g3 \
  --resource-group <your-resource-group> \
  --settings \
    MONGO_URI="mongodb://etelios-hr-service-server:jfoIoaQ4fg7Qn8P13HSwjqytvXM1BiCv3hq1k8gYGLwKIMsDwSXKSnJVdIqB8Twpcr4S6NCkS81nACDb0ttZfg==@etelios-hr-service-server.mongo.cosmos.azure.com:10255/etelios_hr?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-hr-service-server@" \
    SERVICE_NAME=hr-service
```

### 2. Restart App Services

After updating the connection strings, restart both services:

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

### 3. Verify Configuration

#### Check Environment Variables

**Auth Service:**
```bash
az webapp config appsettings list \
  --name etelios-auth-service-h8btakd4byhncmgc \
  --resource-group <your-resource-group> \
  --query "[?name=='MONGO_URI' || name=='USE_KEY_VAULT' || name=='SERVICE_NAME' || name=='AZURE_KEY_VAULT_URL']"
```

**HR Service:**
```bash
az webapp config appsettings list \
  --name etelios-hr-service-backend-a4ayeqefdsbsc2g3 \
  --resource-group <your-resource-group> \
  --query "[?name=='MONGO_URI' || name=='USE_KEY_VAULT' || name=='SERVICE_NAME' || name=='AZURE_KEY_VAULT_URL']"
```

**Expected Values:**
- `USE_KEY_VAULT=true` (if using Key Vault)
- `AZURE_KEY_VAULT_URL=https://<your-keyvault>.vault.azure.net/`
- `SERVICE_NAME=auth-service` (for auth) or `SERVICE_NAME=hr-service` (for hr)
- `MONGO_URI` should be empty if using Key Vault, or contain the full connection string if using env vars

#### Check Service Logs

**Auth Service Logs:**
```bash
az webapp log tail \
  --name etelios-auth-service-h8btakd4byhncmgc \
  --resource-group <your-resource-group>
```

**Look for:**
- ✅ `Connecting to Azure Cosmos DB (MongoDB API)`
- ✅ `MongoDB connected successfully`
- ❌ Any database connection errors

**HR Service Logs:**
```bash
az webapp log tail \
  --name etelios-hr-service-backend-a4ayeqefdsbsc2g3 \
  --resource-group <your-resource-group>
```

### 4. Test Login Endpoint

After restarting, test the login endpoint:

```bash
curl -X POST https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrEmployeeId":"test@example.com","password":"test123"}'
```

**Expected Responses:**
- ✅ **200 OK**: Login successful (if user exists)
- ✅ **400 Bad Request**: Invalid credentials (endpoint is working, just wrong credentials)
- ❌ **503 Service Unavailable**: Database connection issue (check logs)
- ❌ **500 Internal Server Error**: Application error (check logs)

**If you get 400 or 200, the connection is working correctly!**

---

## 🔧 Additional Configuration Requirements

### 1. CORS Configuration

Ensure `CORS_ORIGIN` is set on all backend services:

```bash
# For each App Service, set:
az webapp config appsettings set \
  --name <app-service-name> \
  --resource-group <your-resource-group> \
  --settings CORS_ORIGIN="*"
```

**Services that need CORS_ORIGIN:**
- etelios-app-service-cxf6hvgjb7gah7dr (API Gateway)
- etelios-auth-service-h8btakd4byhncmgc
- etelios-hr-service-backend-a4ayeqefdsbsc2g3
- etelios-attendance-service
- etelios-payroll-service
- etelios-crm-service
- etelios-inventory-service
- etelios-sales-service
- etelios-purchase-service
- etelios-financial-service
- etelios-document-service
- etelios-service-management
- etelios-cpp-service
- etelios-prescription-service
- etelios-analytics-service
- etelios-notification-service
- etelios-monitoring-service
- etelios-tenant-registry
- etelios-realtime-service
- etelios-jts-service
- etelios-tenant-management

**Note:** You can use the `azure-cors-config.sh` script if available, or set manually for each service.

### 2. Verify Key Vault Access

Ensure Managed Identity has proper access:

```bash
# Get Managed Identity Principal ID
az webapp identity show \
  --name etelios-auth-service-h8btakd4byhncmgc \
  --resource-group <your-resource-group> \
  --query principalId

# Verify Key Vault Policy
az keyvault show \
  --name <your-keyvault-name> \
  --query "properties.accessPolicies"
```

**Required Permissions:**
- `Get` - To retrieve secrets
- `List` - To list secrets

### 3. Cosmos DB Firewall Configuration

Ensure Cosmos DB allows connections from Azure App Services:

1. Go to Azure Portal → Cosmos DB Account
2. Navigate to **Networking** → **Firewall and virtual networks**
3. Enable **"Allow access from Azure datacenters"**
4. Or add specific App Service outbound IPs to allowed list

---

## 📊 Verification Checklist

After completing all tasks, verify:

- [ ] Connection strings updated with database names (`/etelios_auth` and `/etelios_hr`)
- [ ] `retrywrites=true` in connection strings
- [ ] Both services restarted
- [ ] Logs show "MongoDB connected successfully"
- [ ] Login endpoint returns 400 or 200 (not 500 or 503)
- [ ] CORS_ORIGIN set on all services
- [ ] Key Vault access verified
- [ ] Cosmos DB firewall allows Azure services

---

## 🆘 Troubleshooting

### If Login Still Returns 500 Error

1. **Check App Service Logs** for database connection errors
2. **Verify Connection String Format:**
   - Must include database name: `.../etelios_auth?ssl=true...`
   - Must have `retrywrites=true`
   - Must have `ssl=true`

3. **Verify Key Vault Secrets:**
   ```bash
   az keyvault secret show \
     --vault-name <your-keyvault-name> \
     --name kv-mongo-uri-auth-service \
     --query value
   ```

4. **Check Managed Identity:**
   ```bash
   az webapp identity show \
     --name etelios-auth-service-h8btakd4byhncmgc \
     --resource-group <your-resource-group>
   ```

5. **Test Connection String Directly:**
   - Use MongoDB Compass or mongo shell
   - Test if connection string works outside of App Service

### If Services Won't Start

1. Check App Service logs for startup errors
2. Verify all environment variables are set correctly
3. Check if Key Vault is accessible
4. Verify Managed Identity is enabled

### If Database Connection Times Out

1. Check Cosmos DB firewall rules
2. Verify network connectivity from App Service
3. Check if Cosmos DB is running and accessible
4. Verify connection string credentials are correct

---

## 📞 Support

If you encounter any issues:

1. Check the detailed logs in Azure App Service
2. Review the `COSMOS-DB-CONNECTION-SETUP.md` guide
3. Review the `URGENT-COSMOS-DB-FIX.md` guide
4. Contact the development team with:
   - Error messages from logs
   - Connection string format (without password)
   - Service status

---

## 📝 Connection String Format Reference

### Correct Format:
```
mongodb://[username]:[password]@[host]:[port]/[DATABASE_NAME]?[options]
                                    ^^^^^^^^^^^^^^^^
                                    REQUIRED!
```

### Example for Auth Service:
```
mongodb://etelios-mongo-db:password@etelios-mongo-db.mongo.cosmos.azure.com:10255/etelios_auth?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-mongo-db@
```

### Example for HR Service:
```
mongodb://etelios-hr-service-server:password@etelios-hr-service-server.mongo.cosmos.azure.com:10255/etelios_hr?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-hr-service-server@
```

**Key Points:**
- Database name (`etelios_auth` or `etelios_hr`) goes **BEFORE** the `?`
- Options go **AFTER** the `?`
- `retrywrites=true` is required for Cosmos DB
- `ssl=true` is required for Cosmos DB

---

## ✅ Success Criteria

The setup is complete when:

1. ✅ Both services restart without errors
2. ✅ Logs show "MongoDB connected successfully"
3. ✅ Login endpoint returns 400 (invalid credentials) or 200 (success) - NOT 500
4. ✅ No database connection errors in logs
5. ✅ Frontend can successfully call the login endpoint

---

**Last Updated:** 2025-11-27
**Priority:** 🔴 URGENT - Required for login functionality

