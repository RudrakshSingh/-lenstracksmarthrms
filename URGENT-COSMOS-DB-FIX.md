# 🚨 URGENT: Cosmos DB Connection String Fix

## Problem
Login endpoint is returning **500 Internal Server Error** because the connection string is missing the **database name**.

## Solution

The connection string **MUST** include the database name before the `?` character.

### Current Connection String (WRONG - Missing Database Name):
```
mongodb://etelios-mongo-db:password@etelios-mongo-db.mongo.cosmos.azure.com:10255/?ssl=true&...
```

### Correct Connection String Format:

**For Auth Service:**
```
mongodb://etelios-mongo-db:h4cmg34pAbKZxyZRqwqxa2PhWoZ9ux5quvBZh2EqhSIaGrPMAaF8btIdgoMawHILafZBw8YgsddlACDbbpOoJQ==@etelios-mongo-db.mongo.cosmos.azure.com:10255/etelios_auth?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-mongo-db@
```

**For HR Service:**
```
mongodb://etelios-hr-service-server:jfoIoaQ4fg7Qn8P13HSwjqytvXM1BiCv3hq1k8gYGLwKIMsDwSXKSnJVdIqB8Twpcr4S6NCkS81nACDb0ttZfg==@etelios-hr-service-server.mongo.cosmos.azure.com:10255/etelios_hr?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-hr-service-server@
```

## Quick Fix Commands

### If Using Key Vault:

**Update Auth Service Secret:**
```bash
az keyvault secret set \
  --vault-name <your-keyvault-name> \
  --name "kv-mongo-uri-auth-service" \
  --value "mongodb://etelios-mongo-db:h4cmg34pAbKZxyZRqwqxa2PhWoZ9ux5quvBZh2EqhSIaGrPMAaF8btIdgoMawHILafZBw8YgsddlACDbbpOoJQ==@etelios-mongo-db.mongo.cosmos.azure.com:10255/etelios_auth?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-mongo-db@"
```

**Update HR Service Secret:**
```bash
az keyvault secret set \
  --vault-name <your-keyvault-name> \
  --name "kv-mongo-uri-hr-service" \
  --value "mongodb://etelios-hr-service-server:jfoIoaQ4fg7Qn8P13HSwjqytvXM1BiCv3hq1k8gYGLwKIMsDwSXKSnJVdIqB8Twpcr4S6NCkS81nACDb0ttZfg==@etelios-hr-service-server.mongo.cosmos.azure.com:10255/etelios_hr?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-hr-service-server@"
```

### If Using Environment Variables:

**Update Auth Service:**
```bash
az webapp config appsettings set \
  --name etelios-auth-service-h8btakd4byhncmgc \
  --resource-group <your-resource-group> \
  --settings \
    MONGO_URI="mongodb://etelios-mongo-db:h4cmg34pAbKZxyZRqwqxa2PhWoZ9ux5quvBZh2EqhSIaGrPMAaF8btIdgoMawHILafZBw8YgsddlACDbbpOoJQ==@etelios-mongo-db.mongo.cosmos.azure.com:10255/etelios_auth?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-mongo-db@"
```

**Update HR Service:**
```bash
az webapp config appsettings set \
  --name etelios-hr-service-backend-a4ayeqefdsbsc2g3 \
  --resource-group <your-resource-group> \
  --settings \
    MONGO_URI="mongodb://etelios-hr-service-server:jfoIoaQ4fg7Qn8P13HSwjqytvXM1BiCv3hq1k8gYGLwKIMsDwSXKSnJVdIqB8Twpcr4S6NCkS81nACDb0ttZfg==@etelios-hr-service-server.mongo.cosmos.azure.com:10255/etelios_hr?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-hr-service-server@"
```

## After Updating

1. **Restart both App Services:**
```bash
az webapp restart --name etelios-auth-service-h8btakd4byhncmgc --resource-group <your-resource-group>
az webapp restart --name etelios-hr-service-backend-a4ayeqefdsbsc2g3 --resource-group <your-resource-group>
```

2. **Check Logs:**
```bash
az webapp log tail --name etelios-auth-service-h8btakd4byhncmgc --resource-group <your-resource-group>
```

Look for:
- ✅ `Connecting to Azure Cosmos DB (MongoDB API)`
- ✅ `MongoDB connected successfully`
- ❌ Any connection errors

3. **Test Login:**
```bash
curl -X POST https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrEmployeeId":"test@example.com","password":"test123"}'
```

**Expected:** Should return 400 (invalid credentials) or 200 (success), NOT 500.

## Connection String Format Breakdown

```
mongodb://[username]:[password]@[host]:[port]/[DATABASE_NAME]?[options]
                                    ^^^^^^^^^^^^^^^^
                                    THIS IS REQUIRED!
```

**Key Points:**
- Database name goes **BEFORE** the `?`
- Auth Service uses: `etelios_auth`
- HR Service uses: `etelios_hr`
- Options go **AFTER** the `?`

## WebSocket Issue (Secondary)

The WebSocket error is expected if WebSocket support isn't configured. This is a separate issue and won't affect login functionality.

