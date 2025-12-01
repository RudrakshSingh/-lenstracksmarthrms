# HR Service - Azure Cosmos DB Connection Fix

## Problem
HR service is not connecting to Azure Cosmos DB for MongoDB.

## Azure Cosmos DB Details
- **Account Name:** `etelios-hr-service-server`
- **URI:** `https://etelios-hr-service-server.documents.azure.com:443/`
- **Type:** Azure Cosmos DB for MongoDB
- **Location:** Central India

## Solution Steps

### Step 1: Get Connection String from Azure Portal

1. Go to Azure Portal → Cosmos DB Account → `etelios-hr-service-server`
2. Click on **"Connection String"** in left menu
3. Copy the **"Primary Connection String"** or **"MongoDB connection string"**

**Expected Format:**
```
mongodb://etelios-hr-service-server:PRIMARY_KEY@etelios-hr-service-server.documents.azure.com:10255/?ssl=true&replicaSet=globaldb
```

**OR**

```
mongodb://etelios-hr-service-server:PRIMARY_KEY@etelios-hr-service-server.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@etelios-hr-service-server@
```

### Step 2: Set Environment Variable in Azure App Service

1. Go to Azure Portal → App Service → `etelios-hr-service`
2. Go to **Configuration** → **Application Settings**
3. Add/Edit `MONGO_URI`:
   - **Name:** `MONGO_URI`
   - **Value:** Paste the connection string from Step 1
   - **Make sure to replace `<PRIMARY_KEY>` with actual key**

4. **IMPORTANT:** Add database name to connection string:
   ```
   mongodb://...@host:10255/DATABASE_NAME?ssl=true&replicaSet=globaldb
   ```
   Replace `DATABASE_NAME` with your database name (e.g., `etelios_hr_service`)

5. Click **Save**
6. **Restart** the App Service

### Step 3: Verify Connection String Format

**Correct Format:**
```
mongodb://account:key@etelios-hr-service-server.documents.azure.com:10255/database_name?ssl=true&replicaSet=globaldb&retrywrites=true
```

**Key Points:**
- Port: `10255` (Cosmos DB MongoDB API port)
- Must include: `ssl=true`
- Must include: `replicaSet=globaldb`
- Must include: `retrywrites=true` (for write operations)
- Database name should be in path: `/database_name`

### Step 4: Test Connection

After setting environment variable and restarting:

```bash
# Test health endpoint
curl https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net/health

# Should return:
# {
#   "service": "hr-service",
#   "status": "healthy",
#   "database": "connected"  # ✅ This should be "connected"
# }
```

### Step 5: Check Logs

1. Go to Azure Portal → App Service → `etelios-hr-service`
2. Go to **Log stream** or **Logs**
3. Look for:
   - ✅ `hr-service: MongoDB connected successfully`
   - ❌ `Database connection failed` (if error)

## Common Issues & Fixes

### Issue 1: Connection String Missing Database Name

**Error:** `MongoServerError: database name is required`

**Fix:** Add database name to connection string:
```
mongodb://...@host:10255/etelios_hr_service?ssl=true&replicaSet=globaldb
```

### Issue 2: Wrong Port

**Error:** Connection timeout

**Fix:** Use port `10255` (not 443 or 27017)
```
mongodb://...@host:10255/...  # ✅ Correct
mongodb://...@host:443/...    # ❌ Wrong
mongodb://...@host:27017/...  # ❌ Wrong
```

### Issue 3: Missing SSL Parameters

**Error:** SSL connection failed

**Fix:** Ensure connection string has:
- `ssl=true`
- `replicaSet=globaldb`

### Issue 4: Wrong Key

**Error:** Authentication failed

**Fix:** 
1. Go to Cosmos DB → Connection String
2. Copy the **PRIMARY KEY** (not secondary)
3. Replace in connection string

### Issue 5: Connection String in Wrong Format

**Error:** Invalid connection string

**Fix:** Use MongoDB connection string format:
```
mongodb://username:password@host:port/database?options
```

**NOT:**
```
https://etelios-hr-service-server.documents.azure.com:443/  # ❌ This is HTTP, not MongoDB
```

## Quick Fix Script

If you have Azure CLI access:

```bash
# Get connection string
az cosmosdb keys list \
  --name etelios-hr-service-server \
  --resource-group Etelios-rg \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" \
  -o tsv

# Set in App Service
az webapp config appsettings set \
  --name etelios-hr-service \
  --resource-group Etelios-rg \
  --settings MONGO_URI="<connection_string_from_above>"
```

## Verification Checklist

- [ ] Connection string copied from Azure Portal
- [ ] Database name added to connection string
- [ ] Port is 10255 (not 443 or 27017)
- [ ] Connection string includes `ssl=true`
- [ ] Connection string includes `replicaSet=globaldb`
- [ ] Connection string includes `retrywrites=true`
- [ ] `MONGO_URI` set in App Service Configuration
- [ ] App Service restarted after setting variable
- [ ] Health endpoint shows `"database": "connected"`
- [ ] Logs show "MongoDB connected successfully"

## Code Changes Applied

✅ Updated `microservices/hr-service/src/server.js`:
- Added automatic Cosmos DB connection string formatting
- Ensures `retrywrites=true` and `replicaSet=globaldb` are present
- Better logging for Cosmos DB connections

## Next Steps

1. **Get connection string from Azure Portal** (Step 1)
2. **Set MONGO_URI in App Service** (Step 2)
3. **Restart App Service**
4. **Test health endpoint** (Step 4)
5. **Check logs** (Step 5)

---

**Status:** ⏳ Awaiting connection string configuration in Azure App Service

