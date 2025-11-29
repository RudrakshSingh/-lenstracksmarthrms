# ⚡ DevOps Quick Start - 5 Minute Setup

## 🎯 Quick Checklist for DevOps Engineer

### 1. Key Vault Setup (2 minutes)

```bash
KEY_VAULT_NAME="etelios-keyvault"
RESOURCE_GROUP="your-resource-group"

# Create secrets
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "kv-mongo-uri-auth-service" --value "YOUR_AUTH_CONNECTION_STRING"
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "kv-mongo-uri-hr-service" --value "YOUR_HR_CONNECTION_STRING"
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "kv-jwt-secret" --value "YOUR_JWT_SECRET"
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "kv-jwt-refresh-secret" --value "YOUR_JWT_REFRESH_SECRET"
```

### 2. App Service Configuration (2 minutes)

```bash
APP_SERVICE_NAME="etelios-app-service-cxf6hvgjb7gah7dr"

# Enable Managed Identity
az webapp identity assign --name $APP_SERVICE_NAME --resource-group $RESOURCE_GROUP

# Get Principal ID
PRINCIPAL_ID=$(az webapp identity show --name $APP_SERVICE_NAME --resource-group $RESOURCE_GROUP --query principalId -o tsv)

# Grant Key Vault access
az keyvault set-policy --name $KEY_VAULT_NAME --object-id $PRINCIPAL_ID --secret-permissions get list

# ⚠️ CRITICAL: Remove SERVICE_NAME
az webapp config appsettings delete --name $APP_SERVICE_NAME --resource-group $RESOURCE_GROUP --setting-names SERVICE_NAME

# Set required env vars
az webapp config appsettings set --name $APP_SERVICE_NAME --resource-group $RESOURCE_GROUP --settings \
  NODE_ENV=production \
  USE_KEY_VAULT=true \
  AZURE_KEY_VAULT_URL="https://${KEY_VAULT_NAME}.vault.azure.net/" \
  AZURE_KEY_VAULT_NAME="${KEY_VAULT_NAME}" \
  CORS_ORIGIN="*"

# Set startup command
az webapp config set --name $APP_SERVICE_NAME --resource-group $RESOURCE_GROUP --startup-file "pm2-runtime ecosystem.config.js"
```

### 3. Deploy & Restart (1 minute)

```bash
# Deploy code (via your CI/CD pipeline or manually)
# Then restart
az webapp restart --name $APP_SERVICE_NAME --resource-group $RESOURCE_GROUP
```

### 4. Verify (30 seconds)

```bash
# Test health
curl https://${APP_SERVICE_NAME}.azurewebsites.net/health

# Test login
curl -X POST https://${APP_SERVICE_NAME}.azurewebsites.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrEmployeeId": "test@example.com", "password": "testpassword"}'
```

---

## ⚠️ Critical Points

1. **DO NOT** set `SERVICE_NAME` in App Service env vars
2. **DO** set `USE_KEY_VAULT=true`
3. **DO** grant Managed Identity Key Vault access
4. **DO** use `pm2-runtime ecosystem.config.js` as startup command

---

## 📚 Full Documentation

See `DEVOPS-DEPLOYMENT-GUIDE.md` for complete instructions.

