# Azure Cosmos DB Connection Setup Guide

## Connection String Details

**Primary Connection String:**
```
mongodb://etelios-mongo-db:h4cmg34pAbKZxyZRqwqxa2PhWoZ9ux5quvBZh2EqhSIaGrPMAaF8btIdgoMawHILafZBw8YgsddlACDbbpOoJQ==@etelios-mongo-db.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@etelios-mongo-db@
```

**Connection Details:**
- **Username:** `etelios-mongo-db`
- **Password:** `h4cmg34pAbKZxyZRqwqxa2PhWoZ9ux5quvBZh2EqhSIaGrPMAaF8btIdgoMawHILafZBw8YgsddlACDbbpOoJQ==`
- **Host:** `etelios-mongo-db.mongo.cosmos.azure.com`
- **Port:** `10255`

## Setup Options

### Option 1: Azure Key Vault (Recommended - Secure)

1. **Create/Verify Azure Key Vault:**
   ```bash
   az keyvault create --name <your-keyvault-name> --resource-group <your-resource-group> --location centralindia
   ```

2. **Store Connection Strings as Secrets:**
   
   For Auth Service:
   ```bash
   az keyvault secret set \
     --vault-name <your-keyvault-name> \
     --name "kv-mongo-uri-auth-service" \
     --value "mongodb://etelios-mongo-db:h4cmg34pAbKZxyZRqwqxa2PhWoZ9ux5quvBZh2EqhSIaGrPMAaF8btIdgoMawHILafZBw8YgsddlACDbbpOoJQ==@etelios-mongo-db.mongo.cosmos.azure.com:10255/etelios_auth?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-mongo-db@"
   ```
   
   For HR Service:
   ```bash
   az keyvault secret set \
     --vault-name <your-keyvault-name> \
     --name "kv-mongo-uri-hr-service" \
     --value "mongodb://etelios-hr-service-server:jfoIoaQ4fg7Qn8P13HSwjqytvXM1BiCv3hq1k8gYGLwKIMsDwSXKSnJVdIqB8Twpcr4S6NCkS81nACDb0ttZfg==@etelios-hr-service-server.mongo.cosmos.azure.com:10255/etelios_hr?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-hr-service-server@"
   ```

3. **Configure App Services to Use Key Vault:**
   
   For each App Service (auth-service and hr-service):
   
   a. Enable Managed Identity:
   ```bash
   az webapp identity assign \
     --name <app-service-name> \
     --resource-group <your-resource-group>
   ```
   
   b. Grant Key Vault Access:
   ```bash
   # Get the principal ID from the previous command
   az keyvault set-policy \
     --name <your-keyvault-name> \
     --object-id <principal-id> \
     --secret-permissions get list
   ```
   
   c. Set Environment Variables:
   ```bash
   az webapp config appsettings set \
     --name <app-service-name> \
     --resource-group <your-resource-group> \
     --settings \
       USE_KEY_VAULT=true \
       AZURE_KEY_VAULT_URL=https://<your-keyvault-name>.vault.azure.net/ \
       SERVICE_NAME=auth-service \
       MONGO_URI=""  # Leave empty to use Key Vault
   ```

### Option 2: Environment Variables (Quick Setup)

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

## Important Notes

1. **Database Names:**
   - Auth Service: Use database name `etelios_auth` in connection string
   - HR Service: Use database name `etelios_hr` in connection string
   - Format: `mongodb://...@host:port/DATABASE_NAME?options`

2. **retrywrites Parameter:**
   - The connection string has `retrywrites=false`, but the code sets `retryWrites=true`
   - This is correct - Cosmos DB supports retrywrites and it's required for write operations
   - The code will override the connection string parameter

3. **SSL Configuration:**
   - SSL is automatically enabled for Cosmos DB connections
   - The code detects Cosmos DB by checking for `cosmos.azure.com` or `documents.azure.com` in the connection string

4. **Connection String Format:**
   ```
   mongodb://[username]:[password]@[host]:[port]/[database]?[options]
   ```

## Verification

After setting up, verify the connection:

1. **Check App Service Logs:**
   ```bash
   az webapp log tail --name <app-service-name> --resource-group <your-resource-group>
   ```

2. **Look for:**
   - `Connecting to Azure Cosmos DB (MongoDB API)`
   - `MongoDB connected successfully`
   - Any connection errors

3. **Test the Login Endpoint:**
   ```bash
   curl -X POST https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"emailOrEmployeeId":"test@example.com","password":"test123"}'
   ```

## Troubleshooting

### Error: "Database connection unavailable"
- Check if `MONGO_URI` is set correctly
- Verify the connection string format
- Check if Cosmos DB firewall allows Azure App Services

### Error: "Authentication failed"
- Verify username and password are correct
- Check if the connection string is URL-encoded properly

### Error: "Connection timeout"
- Check Cosmos DB firewall rules
- Verify network connectivity from App Service to Cosmos DB
- Check if Cosmos DB is running and accessible

## Security Best Practices

1. **Use Azure Key Vault** (Option 1) instead of environment variables when possible
2. **Enable Managed Identity** for App Services to access Key Vault
3. **Rotate passwords** regularly
4. **Monitor access logs** in Azure Key Vault
5. **Use separate databases** for each service (already configured)

## Next Steps

1. Set up the connection string using one of the options above
2. Restart the App Services after configuration
3. Verify the connection in logs
4. Test the login endpoint
5. Monitor for any connection issues

