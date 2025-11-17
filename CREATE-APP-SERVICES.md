# How to Create Auth and HR Service App Services in Azure

## Problem
The App Services for `etelios-auth-service` and `etelios-hr-service` don't exist in Azure, causing "This site cannot be reached" errors.

## Solution
Create the App Services in Azure Portal or using Azure CLI.

---

## Option 1: Create via Azure Portal (Recommended)

### Step 1: Create Auth Service App Service

1. **Go to Azure Portal**: https://portal.azure.com
2. **Click "Create a resource"** → Search for "Web App"
3. **Click "Create"** on "Web App"
4. **Fill in the details:**
   - **Subscription**: Select your subscription
   - **Resource Group**: `etelios-hrms-rg` (or create new)
   - **Name**: `etelios-auth-service` (must match exactly)
   - **Publish**: Docker Container
   - **Operating System**: Linux
   - **Region**: Same region as your other resources (e.g., Central India)
   - **Pricing Plan**: Select appropriate plan (Basic B1 minimum)

5. **Click "Next: Docker"**
   - **Options**: Single Container
   - **Image Source**: Azure Container Registry
   - **Registry**: Select your ACR (`eteliosregistry.azurecr.io` or `eteliosacr-hvawabdbgge7e0fu.azurecr.io`)
   - **Image**: `auth-service`
   - **Tag**: `latest`

6. **Click "Review + create"** → **Create**

### Step 2: Configure Auth Service Settings

After creation, go to **Configuration** → **Application settings** and add:

```
WEBSITES_PORT=3001
PORT=3001
NODE_ENV=production
SERVICE_NAME=auth-service
MONGO_URI=<your-mongo-uri>
JWT_SECRET=<your-jwt-secret>
JWT_REFRESH_SECRET=<your-jwt-refresh-secret>
JWT_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d
CORS_ORIGIN=https://your-frontend.azurewebsites.net
REDIS_URL=redis://your-redis.redis.cache.windows.net:6380
LOG_LEVEL=info
TEST_MODE=false
```

**Note**: Get `MONGO_URI`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` from Azure Key Vault (`etelios-keyvault`).

### Step 3: Create HR Service App Service

Repeat Steps 1-2 with these changes:

- **Name**: `etelios-hr-service`
- **Image**: `hr-service`
- **Port**: `3002` (instead of 3001)
- **Application Settings**:
  ```
  WEBSITES_PORT=3002
  PORT=3002
  NODE_ENV=production
  SERVICE_NAME=hr-service
  MONGO_URI=<your-mongo-uri>
  JWT_SECRET=<your-jwt-secret>
  JWT_REFRESH_SECRET=<your-jwt-refresh-secret>
  JWT_EXPIRY=1h
  JWT_REFRESH_EXPIRY=7d
  CORS_ORIGIN=https://your-frontend.azurewebsites.net
  FRONTEND_URL=https://your-frontend.azurewebsites.net
  AZURE_FRONTEND_URL=https://your-frontend.azurewebsites.net
  STORAGE_PROVIDER=azure
  AZURE_STORAGE_CONNECTION_STRING=<your-storage-connection-string>
  LOG_LEVEL=info
  TEST_MODE=false
  ENABLE_ROLE_SEEDING=false
  ```

---

## Option 2: Create via Azure CLI

### Prerequisites
```bash
# Login to Azure
az login

# Set your subscription
az account set --subscription "your-subscription-id"
```

### Create Auth Service

```bash
# Variables
RESOURCE_GROUP="etelios-hrms-rg"
APP_SERVICE_NAME="etelios-auth-service"
ACR_NAME="eteliosregistry"  # or your ACR name
ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"
PLAN_NAME="etelios-app-service-plan"
LOCATION="centralindia"  # or your preferred location

# Create App Service Plan (if not exists)
az appservice plan create \
  --name $PLAN_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --is-linux \
  --sku B1

# Create Web App with Container
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $PLAN_NAME \
  --name $APP_SERVICE_NAME \
  --deployment-container-image-name "${ACR_LOGIN_SERVER}/auth-service:latest"

# Configure App Settings
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_NAME \
  --settings \
    WEBSITES_PORT=3001 \
    PORT=3001 \
    NODE_ENV=production \
    SERVICE_NAME=auth-service

# Get secrets from Key Vault and set them
MONGO_URI=$(az keyvault secret show --vault-name etelios-keyvault --name mongo-uri --query value -o tsv)
JWT_SECRET=$(az keyvault secret show --vault-name etelios-keyvault --name jwt-secret --query value -o tsv)
JWT_REFRESH_SECRET=$(az keyvault secret show --vault-name etelios-keyvault --name jwt-refresh-secret --query value -o tsv)

az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_NAME \
  --settings \
    MONGO_URI="$MONGO_URI" \
    JWT_SECRET="$JWT_SECRET" \
    JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
    JWT_EXPIRY=1h \
    JWT_REFRESH_EXPIRY=7d \
    CORS_ORIGIN=https://your-frontend.azurewebsites.net \
    LOG_LEVEL=info \
    TEST_MODE=false

# Enable continuous deployment from ACR
az webapp config container set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_NAME \
  --docker-custom-image-name "${ACR_LOGIN_SERVER}/auth-service:latest" \
  --docker-registry-server-url "https://${ACR_LOGIN_SERVER}"

# Restart the app
az webapp restart --resource-group $RESOURCE_GROUP --name $APP_SERVICE_NAME
```

### Create HR Service

```bash
# Variables
APP_SERVICE_NAME="etelios-hr-service"

# Create Web App with Container
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $PLAN_NAME \
  --name $APP_SERVICE_NAME \
  --deployment-container-image-name "${ACR_LOGIN_SERVER}/hr-service:latest"

# Configure App Settings
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_NAME \
  --settings \
    WEBSITES_PORT=3002 \
    PORT=3002 \
    NODE_ENV=production \
    SERVICE_NAME=hr-service

# Get secrets from Key Vault and set them
MONGO_URI=$(az keyvault secret show --vault-name etelios-keyvault --name mongo-uri --query value -o tsv)
JWT_SECRET=$(az keyvault secret show --vault-name etelios-keyvault --name jwt-secret --query value -o tsv)
JWT_REFRESH_SECRET=$(az keyvault secret show --vault-name etelios-keyvault --name jwt-refresh-secret --query value -o tsv)
STORAGE_CONNECTION=$(az keyvault secret show --vault-name etelios-keyvault --name azure-storage-connection-string --query value -o tsv)

az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_NAME \
  --settings \
    MONGO_URI="$MONGO_URI" \
    JWT_SECRET="$JWT_SECRET" \
    JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
    JWT_EXPIRY=1h \
    JWT_REFRESH_EXPIRY=7d \
    CORS_ORIGIN=https://your-frontend.azurewebsites.net \
    FRONTEND_URL=https://your-frontend.azurewebsites.net \
    AZURE_FRONTEND_URL=https://your-frontend.azurewebsites.net \
    STORAGE_PROVIDER=azure \
    AZURE_STORAGE_CONNECTION_STRING="$STORAGE_CONNECTION" \
    LOG_LEVEL=info \
    TEST_MODE=false \
    ENABLE_ROLE_SEEDING=false

# Enable continuous deployment from ACR
az webapp config container set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_NAME \
  --docker-custom-image-name "${ACR_LOGIN_SERVER}/hr-service:latest" \
  --docker-registry-server-url "https://${ACR_LOGIN_SERVER}"

# Restart the app
az webapp restart --resource-group $RESOURCE_GROUP --name $APP_SERVICE_NAME
```

---

## Option 3: Use Azure DevOps Pipeline (After Creating App Services)

Once the App Services are created, the pipelines will automatically deploy to them:

1. **Auth Service Pipeline**: `microservices/auth-service/azure-pipelines.yml`
2. **HR Service Pipeline**: `microservices/hr-service/azure-pipelines.yml`

The pipelines will:
- Build Docker images
- Push to Azure Container Registry
- Deploy to App Services
- Configure app settings
- Restart services

---

## Verify Services are Running

### Check via Browser
- Auth Service: https://etelios-auth-service.azurewebsites.net/health
- HR Service: https://etelios-hr-service.azurewebsites.net/health

### Check via API Gateway
- Main Gateway: https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/
- The `/` endpoint will show service status (online/offline)

### Check via Azure Portal
1. Go to App Services
2. Click on `etelios-auth-service` or `etelios-hr-service`
3. Check **Log stream** for startup logs
4. Check **Metrics** for health status

---

## Troubleshooting

### Service shows "offline" in API Gateway
- Check if App Service exists in Azure Portal
- Check App Service status (should be "Running")
- Check Log stream for errors
- Verify container image exists in ACR
- Verify app settings are correct

### Container fails to start
- Check Log stream for error messages
- Verify `WEBSITES_PORT` matches service port (3001 for auth, 3002 for hr)
- Verify environment variables are set correctly
- Check if MongoDB/Redis connections are working

### DNS/Connection errors
- Wait 5-10 minutes after creating App Service for DNS propagation
- Verify App Service name matches exactly (case-sensitive)
- Check if App Service is in "Stopped" state

---

## Next Steps

After creating the App Services:
1. Wait for initial deployment to complete
2. Verify services are accessible via health endpoints
3. Run the pipelines to deploy latest code
4. Test API endpoints through the main API Gateway

