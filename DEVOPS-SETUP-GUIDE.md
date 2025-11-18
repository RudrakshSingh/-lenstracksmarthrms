# DevOps & Cloud Engineer Setup Guide
## Creating Separate App Services for Auth and HR Services

This guide provides step-by-step instructions for DevOps and Cloud Engineers to set up two separate Azure App Services for Auth and HR microservices.

## Prerequisites

1. Azure Subscription with appropriate permissions
2. Azure Container Registry (ACR) already created
3. Azure Key Vault for storing secrets
4. Resource Group: `etelios-hrms-rg` (or your preferred name)

## Step 1: Create Azure Container Registry (if not exists)

```bash
# Create ACR (if not already created)
az acr create \
  --resource-group etelios-hrms-rg \
  --name eteliosacr \
  --sku Basic \
  --admin-enabled true

# Get ACR login server
az acr show --name eteliosacr --query loginServer --output tsv
```

## Step 2: Create App Service Plan

```bash
# Create App Service Plan (Linux, for containers)
az appservice plan create \
  --name etelios-app-service-plan \
  --resource-group etelios-hrms-rg \
  --location centralindia \
  --is-linux \
  --sku B1  # Basic tier, can be upgraded to S1, P1V2, etc.
```

## Step 3: Create Auth Service App Service

```bash
# Create Auth Service App Service
az webapp create \
  --resource-group etelios-hrms-rg \
  --plan etelios-app-service-plan \
  --name etelios-auth-service \
  --deployment-container-image-name eteliosacr.azurecr.io/auth-service:latest

# Enable managed identity
az webapp identity assign \
  --resource-group etelios-hrms-rg \
  --name etelios-auth-service

# Configure container settings
az webapp config container set \
  --name etelios-auth-service \
  --resource-group etelios-hrms-rg \
  --docker-custom-image-name eteliosacr.azurecr.io/auth-service:latest \
  --docker-registry-server-url https://eteliosacr.azurecr.io

# Set environment variables
az webapp config appsettings set \
  --resource-group etelios-hrms-rg \
  --name etelios-auth-service \
  --settings \
    WEBSITES_PORT=3001 \
    PORT=3001 \
    NODE_ENV=production \
    SERVICE_NAME=auth-service \
    CORS_ORIGIN="*" \
    LOG_LEVEL=info

# Grant Key Vault access to App Service
az keyvault set-policy \
  --name etelios-keyvault \
  --object-id $(az webapp identity show --name etelios-auth-service --resource-group etelios-hrms-rg --query principalId -o tsv) \
  --secret-permissions get list

# Get the App Service URL
az webapp show \
  --name etelios-auth-service \
  --resource-group etelios-hrms-rg \
  --query defaultHostName \
  --output tsv
```

## Step 4: Create HR Service App Service

```bash
# Create HR Service App Service
az webapp create \
  --resource-group etelios-hrms-rg \
  --plan etelios-app-service-plan \
  --name etelios-hr-service \
  --deployment-container-image-name eteliosacr.azurecr.io/hr-service:latest

# Enable managed identity
az webapp identity assign \
  --resource-group etelios-hrms-rg \
  --name etelios-hr-service

# Configure container settings
az webapp config container set \
  --name etelios-hr-service \
  --resource-group etelios-hrms-rg \
  --docker-custom-image-name eteliosacr.azurecr.io/hr-service:latest \
  --docker-registry-server-url https://eteliosacr.azurecr.io

# Set environment variables
az webapp config appsettings set \
  --resource-group etelios-hrms-rg \
  --name etelios-hr-service \
  --settings \
    WEBSITES_PORT=3002 \
    PORT=3002 \
    NODE_ENV=production \
    SERVICE_NAME=hr-service \
    CORS_ORIGIN="*" \
    LOG_LEVEL=info \
    ENABLE_ROLE_SEEDING=false

# Grant Key Vault access to App Service
az keyvault set-policy \
  --name etelios-keyvault \
  --object-id $(az webapp identity show --name etelios-hr-service --resource-group etelios-hrms-rg --query principalId -o tsv) \
  --secret-permissions get list

# Get the App Service URL
az webapp show \
  --name etelios-hr-service \
  --resource-group etelios-hrms-rg \
  --query defaultHostName \
  --output tsv
```

## Step 5: Configure Azure Key Vault Secrets

Ensure these secrets exist in Key Vault (`etelios-keyvault`):

```bash
# Set secrets in Key Vault
az keyvault secret set \
  --vault-name etelios-keyvault \
  --name mongo-uri \
  --value "mongodb://your-mongo-connection-string"

az keyvault secret set \
  --vault-name etelios-keyvault \
  --name jwt-secret \
  --value "your-jwt-secret-key"

az keyvault secret set \
  --vault-name etelios-keyvault \
  --name jwt-refresh-secret \
  --value "your-jwt-refresh-secret-key"

az keyvault secret set \
  --vault-name etelios-keyvault \
  --name azure-storage-connection-string \
  --value "your-azure-storage-connection-string"
```

## Step 6: Configure App Service to Use Key Vault References

```bash
# Auth Service - Reference secrets from Key Vault
az webapp config appsettings set \
  --resource-group etelios-hrms-rg \
  --name etelios-auth-service \
  --settings \
    MONGO_URI="@Microsoft.KeyVault(SecretUri=https://etelios-keyvault.vault.azure.net/secrets/mongo-uri/)" \
    JWT_SECRET="@Microsoft.KeyVault(SecretUri=https://etelios-keyvault.vault.azure.net/secrets/jwt-secret/)" \
    JWT_REFRESH_SECRET="@Microsoft.KeyVault(SecretUri=https://etelios-keyvault.vault.azure.net/secrets/jwt-refresh-secret/)"

# HR Service - Reference secrets from Key Vault
az webapp config appsettings set \
  --resource-group etelios-hrms-rg \
  --name etelios-hr-service \
  --settings \
    MONGO_URI="@Microsoft.KeyVault(SecretUri=https://etelios-keyvault.vault.azure.net/secrets/mongo-uri/)" \
    JWT_SECRET="@Microsoft.KeyVault(SecretUri=https://etelios-keyvault.vault.azure.net/secrets/jwt-secret/)" \
    JWT_REFRESH_SECRET="@Microsoft.KeyVault(SecretUri=https://etelios-keyvault.vault.azure.net/secrets/jwt-refresh-secret/)" \
    AZURE_STORAGE_CONNECTION_STRING="@Microsoft.KeyVault(SecretUri=https://etelios-keyvault.vault.azure.net/secrets/azure-storage-connection-string/)"
```

## Step 7: Configure CORS and Networking

```bash
# Allow CORS for both services
az webapp cors add \
  --resource-group etelios-hrms-rg \
  --name etelios-auth-service \
  --allowed-origins "*"

az webapp cors add \
  --resource-group etelios-hrms-rg \
  --name etelios-hr-service \
  --allowed-origins "*"
```

## Step 8: Enable Application Insights (Optional but Recommended)

```bash
# Create Application Insights
az monitor app-insights component create \
  --app etelios-insights \
  --location centralindia \
  --resource-group etelios-hrms-rg

# Get Instrumentation Key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app etelios-insights \
  --resource-group etelios-hrms-rg \
  --query instrumentationKey \
  --output tsv)

# Configure for Auth Service
az webapp config appsettings set \
  --resource-group etelios-hrms-rg \
  --name etelios-auth-service \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY

# Configure for HR Service
az webapp config appsettings set \
  --resource-group etelios-hrms-rg \
  --name etelios-hr-service \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY
```

## Step 9: Configure Health Checks

```bash
# Enable health check for Auth Service
az webapp config set \
  --resource-group etelios-hrms-rg \
  --name etelios-auth-service \
  --generic-configurations '{"healthCheckPath": "/health"}'

# Enable health check for HR Service
az webapp config set \
  --resource-group etelios-hrms-rg \
  --name etelios-hr-service \
  --generic-configurations '{"healthCheckPath": "/health"}'
```

## Step 10: Get App Service URLs

After creation, get the URLs:

```bash
# Auth Service URL
echo "Auth Service URL:"
az webapp show \
  --name etelios-auth-service \
  --resource-group etelios-hrms-rg \
  --query defaultHostName \
  --output tsv

# HR Service URL
echo "HR Service URL:"
az webapp show \
  --name etelios-hr-service \
  --resource-group etelios-hrms-rg \
  --query defaultHostName \
  --output tsv
```

## Summary of Resources Created

| Resource | Name | Purpose |
|----------|------|---------|
| **App Service Plan** | `etelios-app-service-plan` | Hosting plan for both App Services |
| **App Service** | `etelios-auth-service` | Auth microservice |
| **App Service** | `etelios-hr-service` | HR microservice |
| **Container Registry** | `eteliosacr` | Docker image storage |
| **Key Vault** | `etelios-keyvault` | Secrets management |
| **Application Insights** | `etelios-insights` | Monitoring (optional) |

## Important URLs to Share with Development Team

After setup, provide these URLs:

- **Auth Service**: `https://etelios-auth-service.azurewebsites.net`
- **HR Service**: `https://etelios-hr-service.azurewebsites.net`
- **Health Checks**:
  - Auth: `https://etelios-auth-service.azurewebsites.net/health`
  - HR: `https://etelios-hr-service.azurewebsites.net/health`

## Next Steps for DevOps

1. ✅ Verify both App Services are running
2. ✅ Test health endpoints
3. ✅ Configure CI/CD pipelines (see pipeline files)
4. ✅ Set up monitoring and alerts
5. ✅ Configure custom domains (if needed)
6. ✅ Set up SSL certificates

## Troubleshooting

### App Service not starting
- Check container logs: `az webapp log tail --name <app-name> --resource-group etelios-hrms-rg`
- Verify image exists in ACR: `az acr repository show-tags --name eteliosacr --repository <image-name>`

### Key Vault access denied
- Verify managed identity is enabled
- Check Key Vault access policies
- Ensure secrets exist in Key Vault

### Container pull failed
- Verify ACR credentials
- Check App Service has pull permissions for ACR
- Verify image name is correct

