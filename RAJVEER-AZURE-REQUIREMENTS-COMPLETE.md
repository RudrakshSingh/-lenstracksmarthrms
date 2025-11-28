# Complete Azure DevOps Requirements - Rajveer Singh Rajput

## Overview
This document contains **ALL** the requirements and configurations needed from the DevOps side to ensure the Etelios HRMS backend services are properly configured and operational in Azure.

---

## 🎯 Priority Tasks

### 🔴 URGENT - Must Complete First

1. **Fix Cosmos DB Connection Strings** (Login endpoint returning 500 error)
2. **Update JWT Secrets** (Security requirement)
3. **Verify CORS Configuration** (Frontend connectivity)

---

## 📋 Task 1: Cosmos DB Connection Strings

### Problem
Login endpoint is returning **500 Internal Server Error** because connection strings are missing the **database name**.

### Solution

#### Connection String Format
The connection string **MUST** include the database name before the `?` character:

```
mongodb://[username]:[password]@[host]:[port]/[DATABASE_NAME]?[options]
                                    ^^^^^^^^^^^^^^^^
                                    REQUIRED!
```

### Auth Service Connection String

**Account:** `etelios-mongo-db` (shared with auth service)

**For Key Vault:**
```bash
az keyvault secret set \
  --vault-name etelios-keyvault \
  --name "kv-mongo-uri-auth-service" \
  --value "mongodb://etelios-mongo-db:h4cmg34pAbKZxyZRqwqxa2PhWoZ9ux5quvBZh2EqhSIaGrPMAaF8btIdgoMawHILafZBw8YgsddlACDbbpOoJQ==@etelios-mongo-db.mongo.cosmos.azure.com:10255/etelios_auth?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-mongo-db@"
```

**For Environment Variables:**
```bash
az webapp config appsettings set \
  --name etelios-auth-service-h8btakd4byhncmgc \
  --resource-group <your-resource-group> \
  --settings \
    MONGO_URI="mongodb://etelios-mongo-db:h4cmg34pAbKZxyZRqwqxa2PhWoZ9ux5quvBZh2EqhSIaGrPMAaF8btIdgoMawHILafZBw8YgsddlACDbbpOoJQ==@etelios-mongo-db.mongo.cosmos.azure.com:10255/etelios_auth?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-mongo-db@" \
    SERVICE_NAME=auth-service
```

### HR Service Connection String

**Account:** `etelios-hr-service-server` (dedicated for HR service)

**For Key Vault:**
```bash
az keyvault secret set \
  --vault-name etelios-keyvault \
  --name "kv-mongo-uri-hr-service" \
  --value "mongodb://etelios-hr-service-server:jfoIoaQ4fg7Qn8P13HSwjqytvXM1BiCv3hq1k8gYGLwKIMsDwSXKSnJVdIqB8Twpcr4S6NCkS81nACDb0ttZfg==@etelios-hr-service-server.mongo.cosmos.azure.com:10255/etelios_hr?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-hr-service-server@"
```

**For Environment Variables:**
```bash
az webapp config appsettings set \
  --name etelios-hr-service-backend-a4ayeqefdsbsc2g3 \
  --resource-group <your-resource-group> \
  --settings \
    MONGO_URI="mongodb://etelios-hr-service-server:jfoIoaQ4fg7Qn8P13HSwjqytvXM1BiCv3hq1k8gYGLwKIMsDwSXKSnJVdIqB8Twpcr4S6NCkS81nACDb0ttZfg==@etelios-hr-service-server.mongo.cosmos.azure.com:10255/etelios_hr?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-hr-service-server@" \
    SERVICE_NAME=hr-service
```

**Key Points:**
- Auth Service uses database: `etelios_auth`
- HR Service uses database: `etelios_hr`
- Both must have `retrywrites=true` (code will override if false)
- Both must have `ssl=true`

---

## 📋 Task 2: JWT Secrets Configuration

### Generated Secrets

**JWT_SECRET:**
```
f0d8a229b4f0d48a8a1e01e41c84076bd39e3445b4a677bbdf9b6c73044f6d54a2271de85572d631098a442efe0f72c8826d31a39d2bda35b3a3e54fa67f7565
```

**JWT_REFRESH_SECRET:**
```
5dc6de32b2f8125ad6c3d72f4f6920a900e6858e1bd2848410aa615c839231db0a1692a079b60c421285910a93e28c13a63aabc3da9786d4f6a3ed77bac4e947
```

### Option A: Store in Key Vault (Recommended)

```bash
# Update JWT Secret
az keyvault secret set \
  --vault-name etelios-keyvault \
  --name "kv-jwt-secret" \
  --value "f0d8a229b4f0d48a8a1e01e41c84076bd39e3445b4a677bbdf9b6c73044f6d54a2271de85572d631098a442efe0f72c8826d31a39d2bda35b3a3e54fa67f7565"

# Update JWT Refresh Secret
az keyvault secret set \
  --vault-name etelios-keyvault \
  --name "kv-jwt-refresh-secret" \
  --value "5dc6de32b2f8125ad6c3d72f4f6920a900e6858e1bd2848410aa615c839231db0a1692a079b60c421285910a93e28c13a63aabc3da9786d4f6a3ed77bac4e947"
```

### Option B: Set as Environment Variables

**For Auth Service:**
```bash
az webapp config appsettings set \
  --name etelios-auth-service-h8btakd4byhncmgc \
  --resource-group <your-resource-group> \
  --settings \
    JWT_SECRET="f0d8a229b4f0d48a8a1e01e41c84076bd39e3445b4a677bbdf9b6c73044f6d54a2271de85572d631098a442efe0f72c8826d31a39d2bda35b3a3e54fa67f7565" \
    JWT_REFRESH_SECRET="5dc6de32b2f8125ad6c3d72f4f6920a900e6858e1bd2848410aa615c839231db0a1692a079b60c421285910a93e28c13a63aabc3da9786d4f6a3ed77bac4e947"
```

**For HR Service:**
```bash
az webapp config appsettings set \
  --name etelios-hr-service-backend-a4ayeqefdsbsc2g3 \
  --resource-group <your-resource-group> \
  --settings \
    JWT_SECRET="f0d8a229b4f0d48a8a1e01e41c84076bd39e3445b4a677bbdf9b6c73044f6d54a2271de85572d631098a442efe0f72c8826d31a39d2bda35b3a3e54fa67f7565" \
    JWT_REFRESH_SECRET="5dc6de32b2f8125ad6c3d72f4f6920a900e6858e1bd2848410aa615c839231db0a1692a079b60c421285910a93e28c13a63aabc3da9786d4f6a3ed77bac4e947"
```

**For API Gateway:**
```bash
az webapp config appsettings set \
  --name etelios-app-service-cxf6hvgjb7gah7dr \
  --resource-group <your-resource-group> \
  --settings \
    JWT_SECRET="f0d8a229b4f0d48a8a1e01e41c84076bd39e3445b4a677bbdf9b6c73044f6d54a2271de85572d631098a442efe0f72c8826d31a39d2bda35b3a3e54fa67f7565" \
    JWT_REFRESH_SECRET="5dc6de32b2f8125ad6c3d72f4f6920a900e6858e1bd2848410aa615c839231db0a1692a079b60c421285910a93e28c13a63aabc3da9786d4f6a3ed77bac4e947"
```

**⚠️ IMPORTANT:** All services MUST use the **SAME** JWT secrets, otherwise tokens won't work across services.

---

## 📋 Task 3: CORS Configuration

Set `CORS_ORIGIN` on all backend services to allow frontend connections.

### Quick Update (All Services)

```bash
# List of all App Services
SERVICES=(
  "etelios-app-service-cxf6hvgjb7gah7dr"
  "etelios-auth-service-h8btakd4byhncmgc"
  "etelios-hr-service-backend-a4ayeqefdsbsc2g3"
  "etelios-attendance-service"
  "etelios-payroll-service"
  "etelios-crm-service"
  "etelios-inventory-service"
  "etelios-sales-service"
  "etelios-purchase-service"
  "etelios-financial-service"
  "etelios-document-service"
  "etelios-service-management"
  "etelios-cpp-service"
  "etelios-prescription-service"
  "etelios-analytics-service"
  "etelios-notification-service"
  "etelios-monitoring-service"
  "etelios-tenant-registry"
  "etelios-realtime-service"
  "etelios-jts-service"
  "etelios-tenant-management"
)

RESOURCE_GROUP="<your-resource-group>"

for SERVICE_NAME in "${SERVICES[@]}"; do
  echo "Setting CORS_ORIGIN for $SERVICE_NAME..."
  az webapp config appsettings set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$SERVICE_NAME" \
    --settings CORS_ORIGIN="*" \
    --output none
  
  if [ $? -eq 0 ]; then
    echo "✅ $SERVICE_NAME configured"
  else
    echo "❌ Failed to configure $SERVICE_NAME"
  fi
done
```

### Individual Service Update

```bash
az webapp config appsettings set \
  --name <app-service-name> \
  --resource-group <your-resource-group> \
  --settings CORS_ORIGIN="*"
```

**Note:** Use `"*"` to allow all origins, or specify specific frontend URLs for better security.

---

## 📋 Task 4: Azure Key Vault Secrets Configuration

### Complete List of Secrets Required in Key Vault

All the following secrets need to be added/updated in Azure Key Vault:

#### 1. Database Connection Strings

**Secret Name:** `kv-mongo-uri-auth-service`  
**Value:** 
```
mongodb://etelios-mongo-db:h4cmg34pAbKZxyZRqwqxa2PhWoZ9ux5quvBZh2EqhSIaGrPMAaF8btIdgoMawHILafZBw8YgsddlACDbbpOoJQ==@etelios-mongo-db.mongo.cosmos.azure.com:10255/etelios_auth?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-mongo-db@
```
**Used By:** Auth Service  
**Status:** ✅ Connection string verified - includes database name `/etelios_auth`

**Secret Name:** `kv-mongo-uri-hr-service`  
**Value:**
```
mongodb://etelios-hr-service-server:jfoIoaQ4fg7Qn8P13HSwjqytvXM1BiCv3hq1k8gYGLwKIMsDwSXKSnJVdIqB8Twpcr4S6NCkS81nACDb0ttZfg==@etelios-hr-service-server.mongo.cosmos.azure.com:10255/etelios_hr?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-hr-service-server@
```
**Used By:** HR Service  
**Status:** ✅ Connection string verified - includes database name `/etelios_hr`  
**Source:** Provided by Rajveer (etelios-hr-service-server account)

#### 2. JWT Secrets (Shared Across All Services)

**Secret Name:** `kv-jwt-secret`  
**Value:**
```
f0d8a229b4f0d48a8a1e01e41c84076bd39e3445b4a677bbdf9b6c73044f6d54a2271de85572d631098a442efe0f72c8826d31a39d2bda35b3a3e54fa67f7565
```
**Used By:** Auth Service, HR Service, API Gateway  
**Status:** ✅ Generated secure random secret (128 characters)

**Secret Name:** `kv-jwt-refresh-secret`  
**Value:**
```
5dc6de32b2f8125ad6c3d72f4f6920a900e6858e1bd2848410aa615c839231db0a1692a079b60c421285910a93e28c13a63aabc3da9786d4f6a3ed77bac4e947
```
**Used By:** Auth Service, HR Service, API Gateway  
**Status:** ✅ Generated secure random secret (128 characters)

### Add/Update All Secrets in Key Vault

Run these commands to add/update all secrets:

```bash
KEY_VAULT_NAME="etelios-keyvault"

# 1. Auth Service Connection String
az keyvault secret set \
  --vault-name "$KEY_VAULT_NAME" \
  --name "kv-mongo-uri-auth-service" \
  --value "mongodb://etelios-mongo-db:h4cmg34pAbKZxyZRqwqxa2PhWoZ9ux5quvBZh2EqhSIaGrPMAaF8btIdgoMawHILafZBw8YgsddlACDbbpOoJQ==@etelios-mongo-db.mongo.cosmos.azure.com:10255/etelios_auth?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-mongo-db@"

# 2. HR Service Connection String
az keyvault secret set \
  --vault-name "$KEY_VAULT_NAME" \
  --name "kv-mongo-uri-hr-service" \
  --value "mongodb://etelios-hr-service-server:jfoIoaQ4fg7Qn8P13HSwjqytvXM1BiCv3hq1k8gYGLwKIMsDwSXKSnJVdIqB8Twpcr4S6NCkS81nACDb0ttZfg==@etelios-hr-service-server.mongo.cosmos.azure.com:10255/etelios_hr?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-hr-service-server@"

# 3. JWT Secret
az keyvault secret set \
  --vault-name "$KEY_VAULT_NAME" \
  --name "kv-jwt-secret" \
  --value "f0d8a229b4f0d48a8a1e01e41c84076bd39e3445b4a677bbdf9b6c73044f6d54a2271de85572d631098a442efe0f72c8826d31a39d2bda35b3a3e54fa67f7565"

# 4. JWT Refresh Secret
az keyvault secret set \
  --vault-name "$KEY_VAULT_NAME" \
  --name "kv-jwt-refresh-secret" \
  --value "5dc6de32b2f8125ad6c3d72f4f6920a900e6858e1bd2848410aa615c839231db0a1692a079b60c421285910a93e28c13a63aabc3da9786d4f6a3ed77bac4e947"
```

### Verify All Secrets Are in Key Vault

```bash
KEY_VAULT_NAME="etelios-keyvault"

# List all required secrets
az keyvault secret list \
  --vault-name "$KEY_VAULT_NAME" \
  --query "[?name=='kv-mongo-uri-auth-service' || name=='kv-mongo-uri-hr-service' || name=='kv-jwt-secret' || name=='kv-jwt-refresh-secret'].name" \
  --output table
```

**Expected Output:**
```
Name
---------------------------
kv-jwt-refresh-secret
kv-jwt-secret
kv-mongo-uri-auth-service
kv-mongo-uri-hr-service
```

### Connection String Verification

#### ✅ Auth Service Connection String - VERIFIED CORRECT

**Format Breakdown:**
- **Protocol:** `mongodb://`
- **Username:** `etelios-mongo-db`
- **Password:** `h4cmg34pAbKZxyZRqwqxa2PhWoZ9ux5quvBZh2EqhSIaGrPMAaF8btIdgoMawHILafZBw8YgsddlACDbbpOoJQ==`
- **Host:** `etelios-mongo-db.mongo.cosmos.azure.com`
- **Port:** `10255`
- **Database:** `etelios_auth` ✅ (Required - included before `?`)
- **Options:** `ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-mongo-db@`

**Status:** ✅ **CORRECT** - Database name is included, all required parameters present

#### ✅ HR Service Connection String - VERIFIED CORRECT

**Format Breakdown:**
- **Protocol:** `mongodb://`
- **Username:** `etelios-hr-service-server`
- **Password:** `jfoIoaQ4fg7Qn8P13HSwjqytvXM1BiCv3hq1k8gYGLwKIMsDwSXKSnJVdIqB8Twpcr4S6NCkS81nACDb0ttZfg==`
- **Host:** `etelios-hr-service-server.mongo.cosmos.azure.com`
- **Port:** `10255`
- **Database:** `etelios_hr` ✅ (Required - included before `?`)
- **Options:** `ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-hr-service-server@`

**Status:** ✅ **CORRECT** - Database name is included, all required parameters present  
**Source:** Converted from provided Cosmos DB connection string:
- Original: `AccountEndpoint=https://etelios-hr-service-server.documents.azure.com:443/;AccountKey=jfoIoaQ4fg7Qn8P13HSwjqytvXM1BiCv3hq1k8gYGLwKIMsDwSXKSnJVdIqB8Twpcr4S6NCkS81nACDb0ttZfg==;`
- Converted to MongoDB format with database name added

### Key Vault Secret Mapping

The code automatically maps environment variable names to Key Vault secret names:

| Environment Variable | Key Vault Secret Name | Service |
|---------------------|----------------------|---------|
| `MONGO_URI` | `kv-mongo-uri-{SERVICE_NAME}` | Auth/HR Service |
| `JWT_SECRET` | `kv-jwt-secret` | All Services |
| `JWT_REFRESH_SECRET` | `kv-jwt-refresh-secret` | All Services |

**Note:** The `SERVICE_NAME` environment variable determines which connection string is used:
- `SERVICE_NAME=auth-service` → Uses `kv-mongo-uri-auth-service`
- `SERVICE_NAME=hr-service` → Uses `kv-mongo-uri-hr-service`

---

## 📋 Task 5: Verify Key Vault Configuration

### Check Managed Identity

**Auth Service:**
```bash
az webapp identity show \
  --name etelios-auth-service-h8btakd4byhncmgc \
  --resource-group <your-resource-group>
```

**HR Service:**
```bash
az webapp identity show \
  --name etelios-hr-service-backend-a4ayeqefdsbsc2g3 \
  --resource-group <your-resource-group>
```

### Verify Key Vault Access Policies

```bash
az keyvault show \
  --name etelios-keyvault \
  --query "properties.accessPolicies"
```

**Required Permissions:**
- `Get` - To retrieve secrets
- `List` - To list secrets

### Verify All Secrets Exist

```bash
KEY_VAULT_NAME="etelios-keyvault"

# Check Auth Service Connection String
az keyvault secret show \
  --vault-name "$KEY_VAULT_NAME" \
  --name kv-mongo-uri-auth-service \
  --query "{name:name, enabled:attributes.enabled, updated:attributes.updated}" \
  --output table

# Check HR Service Connection String
az keyvault secret show \
  --vault-name "$KEY_VAULT_NAME" \
  --name kv-mongo-uri-hr-service \
  --query "{name:name, enabled:attributes.enabled, updated:attributes.updated}" \
  --output table

# Check JWT Secret
az keyvault secret show \
  --vault-name "$KEY_VAULT_NAME" \
  --name kv-jwt-secret \
  --query "{name:name, enabled:attributes.enabled, updated:attributes.updated}" \
  --output table

# Check JWT Refresh Secret
az keyvault secret show \
  --vault-name "$KEY_VAULT_NAME" \
  --name kv-jwt-refresh-secret \
  --query "{name:name, enabled:attributes.enabled, updated:attributes.updated}" \
  --output table
```

**Expected:** All 4 secrets should exist and be enabled.

---

## 📋 Task 5: Verify Environment Variables

### Auth Service

```bash
az webapp config appsettings list \
  --name etelios-auth-service-h8btakd4byhncmgc \
  --resource-group <your-resource-group> \
  --query "[?name=='MONGO_URI' || name=='USE_KEY_VAULT' || name=='SERVICE_NAME' || name=='AZURE_KEY_VAULT_URL' || name=='JWT_SECRET' || name=='JWT_REFRESH_SECRET' || name=='CORS_ORIGIN']"
```

**Expected Values:**
- `USE_KEY_VAULT=true` (if using Key Vault)
- `AZURE_KEY_VAULT_URL=https://etelios-keyvault.vault.azure.net/`
- `SERVICE_NAME=auth-service`
- `MONGO_URI` should be empty if using Key Vault
- `JWT_SECRET` and `JWT_REFRESH_SECRET` should be set (or empty if using Key Vault)
- `CORS_ORIGIN=*`

### HR Service

```bash
az webapp config appsettings list \
  --name etelios-hr-service-backend-a4ayeqefdsbsc2g3 \
  --resource-group <your-resource-group> \
  --query "[?name=='MONGO_URI' || name=='USE_KEY_VAULT' || name=='SERVICE_NAME' || name=='AZURE_KEY_VAULT_URL' || name=='JWT_SECRET' || name=='JWT_REFRESH_SECRET' || name=='CORS_ORIGIN']"
```

**Expected Values:**
- `USE_KEY_VAULT=true` (if using Key Vault)
- `AZURE_KEY_VAULT_URL=https://etelios-keyvault.vault.azure.net/`
- `SERVICE_NAME=hr-service`
- `MONGO_URI` should be empty if using Key Vault
- `JWT_SECRET` and `JWT_REFRESH_SECRET` should be set (or empty if using Key Vault)
- `CORS_ORIGIN=*`

---

## 📋 Task 6: Restart Services

After making all configuration changes, restart all services:

```bash
# Restart Auth Service
az webapp restart \
  --name etelios-auth-service-h8btakd4byhncmgc \
  --resource-group <your-resource-group>

# Restart HR Service
az webapp restart \
  --name etelios-hr-service-backend-a4ayeqefdsbsc2g3 \
  --resource-group <your-resource-group>

# Restart API Gateway
az webapp restart \
  --name etelios-app-service-cxf6hvgjb7gah7dr \
  --resource-group <your-resource-group>
```

---

## 📋 Task 7: Verify Cosmos DB Firewall

Ensure Cosmos DB allows connections from Azure App Services:

1. Go to Azure Portal → Cosmos DB Account
2. Navigate to **Networking** → **Firewall and virtual networks**
3. Enable **"Allow access from Azure datacenters"**
4. Or add specific App Service outbound IPs to allowed list

**For Auth Service Cosmos DB:**
- Account: `etelios-mongo-db`

**For HR Service Cosmos DB:**
- Account: `etelios-hr-service-server`

---

## 📋 Task 8: Verification & Testing

### Check Service Health

```bash
# Auth Service
curl https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net/health

# HR Service
curl https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net/health

# API Gateway
curl https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/health
```

**Expected:** `{"status":"OK"}` or similar with 200 status code

### Check Service Logs

**Auth Service:**
```bash
az webapp log tail \
  --name etelios-auth-service-h8btakd4byhncmgc \
  --resource-group <your-resource-group>
```

**Look for:**
- ✅ `Connecting to Azure Cosmos DB (MongoDB API)`
- ✅ `MongoDB connected successfully`
- ❌ Any database connection errors

**HR Service:**
```bash
az webapp log tail \
  --name etelios-hr-service-backend-a4ayeqefdsbsc2g3 \
  --resource-group <your-resource-group>
```

### Test Login Endpoint

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

## ✅ Complete Checklist

After completing all tasks, verify:

- [ ] Cosmos DB connection strings updated with database names (`/etelios_auth` and `/etelios_hr`)
- [ ] `retrywrites=true` in connection strings
- [ ] JWT secrets updated in Key Vault or environment variables
- [ ] All services use the same JWT secrets
- [ ] CORS_ORIGIN set on all services
- [ ] Both services restarted
- [ ] Logs show "MongoDB connected successfully"
- [ ] Login endpoint returns 400 or 200 (not 500 or 503)
- [ ] Key Vault access verified
- [ ] Cosmos DB firewall allows Azure services
- [ ] All environment variables verified

---

## 🆘 Troubleshooting

### Login Returns 500 Error

1. **Check App Service Logs** for database connection errors
2. **Verify Connection String Format:**
   - Must include database name: `.../etelios_auth?ssl=true...`
   - Must have `retrywrites=true`
   - Must have `ssl=true`
3. **Verify Key Vault Secrets** are correctly set
4. **Check Managed Identity** has access to Key Vault
5. **Test Connection String** directly using MongoDB client

### Services Won't Start

1. Check App Service logs for startup errors
2. Verify all environment variables are set correctly
3. Check if Key Vault is accessible
4. Verify Managed Identity is enabled

### Database Connection Times Out

1. Check Cosmos DB firewall rules
2. Verify network connectivity from App Service
3. Check if Cosmos DB is running and accessible
4. Verify connection string credentials are correct

### JWT Token Errors

1. Verify all services use the same JWT secrets
2. Check if JWT secrets are correctly set in Key Vault or environment variables
3. Restart all services after updating JWT secrets
4. Note: Existing tokens will be invalidated after updating secrets

---

## 📞 Support

If you encounter any issues:

1. Check the detailed logs in Azure App Service
2. Review the following documentation:
   - `COSMOS-DB-CONNECTION-SETUP.md`
   - `URGENT-COSMOS-DB-FIX.md`
   - `UPDATE-JWT-SECRETS-AZURE.md`
3. Contact the development team with:
   - Error messages from logs
   - Connection string format (without password)
   - Service status
   - Screenshots of error messages

---

## 📝 Quick Reference

### Connection String Format
```
mongodb://[username]:[password]@[host]:[port]/[DATABASE_NAME]?[options]
                                    ^^^^^^^^^^^^^^^^
                                    REQUIRED!
```

### Auth Service Database
- **Database Name:** `etelios_auth`
- **Cosmos DB Account:** `etelios-mongo-db`

### HR Service Database
- **Database Name:** `etelios_hr`
- **Cosmos DB Account:** `etelios-hr-service-server`

### Key Vault Secret Names
- `kv-mongo-uri-auth-service` - Auth service connection string
- `kv-mongo-uri-hr-service` - HR service connection string
- `kv-jwt-secret` - JWT secret (shared)
- `kv-jwt-refresh-secret` - JWT refresh secret (shared)

---

## 🎯 Success Criteria

The setup is complete when:

1. ✅ Both services restart without errors
2. ✅ Logs show "MongoDB connected successfully"
3. ✅ Login endpoint returns 400 (invalid credentials) or 200 (success) - NOT 500
4. ✅ No database connection errors in logs
5. ✅ Frontend can successfully call the login endpoint
6. ✅ JWT tokens are generated and validated correctly
7. ✅ CORS errors are resolved

---

**Last Updated:** 2025-11-27  
**Priority:** 🔴 URGENT - Required for application functionality  
**Status:** ⏳ Pending DevOps Configuration

