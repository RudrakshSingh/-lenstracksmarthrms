# Azure DevOps Deployment Guide
## HR-Service & Auth-Service Production Deployment

**Version**: 1.0.0  
**Last Updated**: 2025-11-11  
**Services**: HR-Service (Port 3002) & Auth-Service (Port 3001)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Azure Infrastructure Setup](#azure-infrastructure-setup)
3. [Azure DevOps Pipeline Configuration](#azure-devops-pipeline-configuration)
4. [Environment Variables & Secrets](#environment-variables--secrets)
5. [Deployment Steps](#deployment-steps)
6. [Verification & Testing](#verification--testing)
7. [Troubleshooting](#troubleshooting)
8. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

### Required Azure Resources
- ✅ Azure Subscription
- ✅ Azure DevOps Organization & Project
- ✅ Azure Container Registry (ACR)
- ✅ Azure App Service Plan (or Azure Kubernetes Service)
- ✅ Azure Cosmos DB (MongoDB API) or MongoDB Atlas
- ✅ Azure Key Vault (for secrets management)
- ✅ Application Insights (for monitoring)

### Required Permissions
- Azure DevOps: Project Administrator
- Azure: Contributor role on Resource Group
- ACR: AcrPush role
- Key Vault: Secrets Officer

### Tools Required
- Azure CLI (`az`)
- Docker
- kubectl (if using AKS)
- Git

---

## Azure Infrastructure Setup

### Step 1: Create Resource Group

```bash
az group create \
  --name etelios-hrms-rg \
  --location eastus
```

### Step 2: Create Azure Container Registry

```bash
az acr create \
  --resource-group etelios-hrms-rg \
  --name eteliosregistry \
  --sku Basic \
  --admin-enabled true
```

**Note**: Save the ACR login server URL (e.g., `eteliosregistry.azurecr.io`)

### Step 3: Create Azure Key Vault

```bash
az keyvault create \
  --name etelios-keyvault \
  --resource-group etelios-hrms-rg \
  --location eastus
```

### Step 4: Create MongoDB Database

**Option A: Azure Cosmos DB (MongoDB API)**
```bash
az cosmosdb create \
  --name etelios-cosmosdb \
  --resource-group etelios-hrms-rg \
  --kind MongoDB \
  --server-version 4.2

# Get connection string
az cosmosdb keys list \
  --name etelios-cosmosdb \
  --resource-group etelios-hrms-rg \
  --type connection-strings
```

**Option B: MongoDB Atlas**
- Create cluster at https://cloud.mongodb.com
- Get connection string from Atlas dashboard

### Step 5: Create App Service Plans

```bash
# For HR Service (Port 3002)
az appservice plan create \
  --name etelios-hr-service-plan \
  --resource-group etelios-hrms-rg \
  --sku B2 \
  --is-linux

# For Auth Service (Port 3001)
az appservice plan create \
  --name etelios-auth-service-plan \
  --resource-group etelios-hrms-rg \
  --sku B2 \
  --is-linux
```

### Step 6: Create App Services

```bash
# HR Service
az webapp create \
  --name etelios-hr-service \
  --resource-group etelios-hrms-rg \
  --plan etelios-hr-service-plan \
  --deployment-container-image-name eteliosregistry.azurecr.io/hr-service:latest

# Auth Service
az webapp create \
  --name etelios-auth-service \
  --resource-group etelios-hrms-rg \
  --plan etelios-auth-service-plan \
  --deployment-container-image-name eteliosregistry.azurecr.io/auth-service:latest
```

---

## Azure DevOps Pipeline Configuration

### Step 1: Create Service Connections

#### A. Azure Resource Manager Connection

1. Go to **Project Settings** → **Service connections**
2. Click **New service connection**
3. Select **Azure Resource Manager**
4. Choose **Service principal (automatic)**
5. Select your subscription and resource group
6. Name: `Azure-Service-Connection`
7. Click **Save**

#### B. Azure Container Registry Connection

1. Go to **Project Settings** → **Service connections**
2. Click **New service connection**
3. Select **Docker Registry**
4. Choose **Azure Container Registry**
5. Select your subscription and ACR
6. Name: `AzureContainerRegistry`
7. Click **Save**

### Step 2: Store Secrets in Key Vault

```bash
# JWT Secrets (generate new ones for production)
az keyvault secret set \
  --vault-name etelios-keyvault \
  --name jwt-secret \
  --value "YOUR-128-CHAR-HEX-KEY-HERE"

az keyvault secret set \
  --vault-name etelios-keyvault \
  --name jwt-refresh-secret \
  --value "YOUR-128-CHAR-HEX-KEY-HERE"

# MongoDB Connection String
az keyvault secret set \
  --vault-name etelios-keyvault \
  --name mongo-uri \
  --value "mongodb://your-connection-string"

# Azure Storage (if using)
az keyvault secret set \
  --vault-name etelios-keyvault \
  --name azure-storage-connection-string \
  --value "DefaultEndpointsProtocol=https;AccountName=..."
```

### Step 3: Create Pipeline Files

Create the following pipeline files in your repository:

---

## Pipeline Configuration Files

### HR-Service Pipeline (`microservices/hr-service/azure-pipelines.yml`)

```yaml
# Azure DevOps Pipeline for HR Service
trigger:
  branches:
    include:
      - main
      - master
      - production
  paths:
    include:
      - microservices/hr-service/*

pool:
  vmImage: 'ubuntu-latest'

variables:
  serviceName: 'hr-service'
  dockerRegistryServiceConnection: 'AzureContainerRegistry'
  imageRepository: 'hr-service'
  containerRegistry: 'eteliosregistry.azurecr.io'
  dockerfilePath: '$(Build.SourcesDirectory)/microservices/hr-service/Dockerfile'
  tag: '$(Build.BuildId)'
  resourceGroup: 'etelios-hrms-rg'
  appServiceName: 'etelios-hr-service'
  keyVaultName: 'etelios-keyvault'

stages:
- stage: Build
  displayName: 'Build and Push Docker Image'
  jobs:
  - job: Build
    displayName: 'Build HR Service'
    steps:
    - task: Docker@2
      displayName: 'Build and push image'
      inputs:
        command: buildAndPush
        repository: $(imageRepository)
        dockerfile: $(dockerfilePath)
        containerRegistry: $(dockerRegistryServiceConnection)
        tags: |
          $(tag)
          latest

- stage: Deploy
  displayName: 'Deploy to Azure App Service'
  dependsOn: Build
  condition: succeeded()
  jobs:
  - deployment: Deploy
    displayName: 'Deploy HR Service'
    environment: 'production-hr-service'
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureKeyVault@2
            displayName: 'Get secrets from Key Vault'
            inputs:
              azureSubscription: 'Azure-Service-Connection'
              KeyVaultName: '$(keyVaultName)'
              SecretsFilter: 'mongo-uri,jwt-secret,jwt-refresh-secret,azure-storage-connection-string'
              RunAsPreJob: true

          - task: AzureWebAppContainer@1
            displayName: 'Deploy to Azure App Service'
            inputs:
              azureSubscription: 'Azure-Service-Connection'
              appName: '$(appServiceName)'
              containers: '$(containerRegistry)/$(imageRepository):$(tag)'
              appSettings: |
                [
                  {
                    "name": "WEBSITES_PORT",
                    "value": "3002"
                  },
                  {
                    "name": "NODE_ENV",
                    "value": "production"
                  },
                  {
                    "name": "PORT",
                    "value": "3002"
                  },
                  {
                    "name": "SERVICE_NAME",
                    "value": "hr-service"
                  },
                  {
                    "name": "MONGO_URI",
                    "value": "$(mongo-uri)"
                  },
                  {
                    "name": "JWT_SECRET",
                    "value": "$(jwt-secret)"
                  },
                  {
                    "name": "JWT_REFRESH_SECRET",
                    "value": "$(jwt-refresh-secret)"
                  },
                  {
                    "name": "JWT_EXPIRY",
                    "value": "1h"
                  },
                  {
                    "name": "JWT_REFRESH_EXPIRY",
                    "value": "7d"
                  },
                  {
                    "name": "CORS_ORIGIN",
                    "value": "https://your-frontend.azurewebsites.net"
                  },
                  {
                    "name": "FRONTEND_URL",
                    "value": "https://your-frontend.azurewebsites.net"
                  },
                  {
                    "name": "AZURE_FRONTEND_URL",
                    "value": "https://your-frontend.azurewebsites.net"
                  },
                  {
                    "name": "STORAGE_PROVIDER",
                    "value": "azure"
                  },
                  {
                    "name": "AZURE_STORAGE_CONNECTION_STRING",
                    "value": "$(azure-storage-connection-string)"
                  },
                  {
                    "name": "LOG_LEVEL",
                    "value": "info"
                  },
                  {
                    "name": "TEST_MODE",
                    "value": "false"
                  }
                ]

          - task: AzureAppServiceManage@0
            displayName: 'Restart App Service'
            inputs:
              azureSubscription: 'Azure-Service-Connection'
              Action: 'Restart Azure App Service'
              WebAppName: '$(appServiceName)'
```

### Auth-Service Pipeline (`microservices/auth-service/azure-pipelines.yml`)

```yaml
# Azure DevOps Pipeline for Auth Service
trigger:
  branches:
    include:
      - main
      - master
      - production
  paths:
    include:
      - microservices/auth-service/*

pool:
  vmImage: 'ubuntu-latest'

variables:
  serviceName: 'auth-service'
  dockerRegistryServiceConnection: 'AzureContainerRegistry'
  imageRepository: 'auth-service'
  containerRegistry: 'eteliosregistry.azurecr.io'
  dockerfilePath: '$(Build.SourcesDirectory)/microservices/auth-service/Dockerfile'
  tag: '$(Build.BuildId)'
  resourceGroup: 'etelios-hrms-rg'
  appServiceName: 'etelios-auth-service'
  keyVaultName: 'etelios-keyvault'

stages:
- stage: Build
  displayName: 'Build and Push Docker Image'
  jobs:
  - job: Build
    displayName: 'Build Auth Service'
    steps:
    - task: Docker@2
      displayName: 'Build and push image'
      inputs:
        command: buildAndPush
        repository: $(imageRepository)
        dockerfile: $(dockerfilePath)
        containerRegistry: $(dockerRegistryServiceConnection)
        tags: |
          $(tag)
          latest

- stage: Deploy
  displayName: 'Deploy to Azure App Service'
  dependsOn: Build
  condition: succeeded()
  jobs:
  - deployment: Deploy
    displayName: 'Deploy Auth Service'
    environment: 'production-auth-service'
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureKeyVault@2
            displayName: 'Get secrets from Key Vault'
            inputs:
              azureSubscription: 'Azure-Service-Connection'
              KeyVaultName: '$(keyVaultName)'
              SecretsFilter: 'mongo-uri,jwt-secret,jwt-refresh-secret'
              RunAsPreJob: true

          - task: AzureWebAppContainer@1
            displayName: 'Deploy to Azure App Service'
            inputs:
              azureSubscription: 'Azure-Service-Connection'
              appName: '$(appServiceName)'
              containers: '$(containerRegistry)/$(imageRepository):$(tag)'
              appSettings: |
                [
                  {
                    "name": "WEBSITES_PORT",
                    "value": "3001"
                  },
                  {
                    "name": "NODE_ENV",
                    "value": "production"
                  },
                  {
                    "name": "PORT",
                    "value": "3001"
                  },
                  {
                    "name": "SERVICE_NAME",
                    "value": "auth-service"
                  },
                  {
                    "name": "MONGO_URI",
                    "value": "$(mongo-uri)"
                  },
                  {
                    "name": "JWT_SECRET",
                    "value": "$(jwt-secret)"
                  },
                  {
                    "name": "JWT_REFRESH_SECRET",
                    "value": "$(jwt-refresh-secret)"
                  },
                  {
                    "name": "JWT_EXPIRY",
                    "value": "1h"
                  },
                  {
                    "name": "JWT_REFRESH_EXPIRY",
                    "value": "7d"
                  },
                  {
                    "name": "CORS_ORIGIN",
                    "value": "https://your-frontend.azurewebsites.net"
                  },
                  {
                    "name": "REDIS_URL",
                    "value": "redis://your-redis.redis.cache.windows.net:6380"
                  },
                  {
                    "name": "LOG_LEVEL",
                    "value": "info"
                  },
                  {
                    "name": "TEST_MODE",
                    "value": "false"
                  }
                ]

          - task: AzureAppServiceManage@0
            displayName: 'Restart App Service'
            inputs:
              azureSubscription: 'Azure-Service-Connection'
              Action: 'Restart Azure App Service'
              WebAppName: '$(appServiceName)'
```

---

## Environment Variables & Secrets

### HR-Service Required Environment Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment | `production` | ✅ |
| `PORT` | Service port | `3002` | ✅ |
| `MONGO_URI` | MongoDB connection string | `mongodb://...` | ✅ |
| `JWT_SECRET` | JWT signing secret (128-char hex) | `6de4bc06c043...` | ✅ |
| `JWT_REFRESH_SECRET` | Refresh token secret (128-char hex) | `fdf83c1e4f62...` | ✅ |
| `JWT_EXPIRY` | Access token expiry | `1h` | ✅ |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry | `7d` | ✅ |
| `CORS_ORIGIN` | Frontend URL | `https://app.azurewebsites.net` | ✅ |
| `FRONTEND_URL` | Frontend URL | `https://app.azurewebsites.net` | ✅ |
| `AZURE_FRONTEND_URL` | Azure frontend URL | `https://app.azurewebsites.net` | ✅ |
| `STORAGE_PROVIDER` | Storage provider | `azure` | ⚠️ |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Storage connection | `DefaultEndpointsProtocol=...` | ⚠️ |
| `LOG_LEVEL` | Logging level | `info` | ⚠️ |
| `TEST_MODE` | Test mode flag | `false` | ✅ |

### Auth-Service Required Environment Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment | `production` | ✅ |
| `PORT` | Service port | `3001` | ✅ |
| `MONGO_URI` | MongoDB connection string | `mongodb://...` | ✅ |
| `JWT_SECRET` | JWT signing secret (128-char hex) | `6de4bc06c043...` | ✅ |
| `JWT_REFRESH_SECRET` | Refresh token secret (128-char hex) | `fdf83c1e4f62...` | ✅ |
| `JWT_EXPIRY` | Access token expiry | `1h` | ✅ |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry | `7d` | ✅ |
| `CORS_ORIGIN` | Frontend URL | `https://app.azurewebsites.net` | ✅ |
| `REDIS_URL` | Redis connection string | `redis://...` | ⚠️ |
| `LOG_LEVEL` | Logging level | `info` | ⚠️ |
| `TEST_MODE` | Test mode flag | `false` | ✅ |

### Generate JWT Secrets

```bash
# Generate secure hex keys (128 characters each)
node -e "const crypto = require('crypto'); console.log('JWT_SECRET=' + crypto.randomBytes(64).toString('hex')); console.log('JWT_REFRESH_SECRET=' + crypto.randomBytes(64).toString('hex'));"
```

**Important**: Use the SAME JWT secrets for both services if they share authentication.

---

## Deployment Steps

### Step 1: Create Pipelines in Azure DevOps

1. Go to **Pipelines** → **New pipeline**
2. Select **Azure Repos Git** (or your source)
3. Select repository: `etelios-repo`
4. Select **Existing Azure Pipelines YAML file**
5. Path: `microservices/hr-service/azure-pipelines.yml`
6. Click **Continue** → **Run**

Repeat for auth-service:
- Path: `microservices/auth-service/azure-pipelines.yml`

### Step 2: Configure Environments

1. Go to **Pipelines** → **Environments**
2. Create environment: `production-hr-service`
3. Create environment: `production-auth-service`
4. Add approval gates if needed

### Step 3: Update Pipeline Variables

For each pipeline, go to **Edit** → **Variables**:

**HR-Service Variables:**
- `containerRegistry`: `eteliosregistry.azurecr.io`
- `resourceGroup`: `etelios-hrms-rg`
- `appServiceName`: `etelios-hr-service`
- `keyVaultName`: `etelios-keyvault`

**Auth-Service Variables:**
- `containerRegistry`: `eteliosregistry.azurecr.io`
- `resourceGroup`: `etelios-hrms-rg`
- `appServiceName`: `etelios-auth-service`
- `keyVaultName`: `etelios-keyvault`

### Step 4: Configure App Service Settings

#### HR-Service App Settings

```bash
az webapp config appsettings set \
  --resource-group etelios-hrms-rg \
  --name etelios-hr-service \
  --settings \
    WEBSITES_PORT=3002 \
    NODE_ENV=production \
    PORT=3002 \
    SERVICE_NAME=hr-service \
    CORS_ORIGIN="https://your-frontend.azurewebsites.net" \
    FRONTEND_URL="https://your-frontend.azurewebsites.net" \
    AZURE_FRONTEND_URL="https://your-frontend.azurewebsites.net" \
    JWT_EXPIRY=1h \
    JWT_REFRESH_EXPIRY=7d \
    STORAGE_PROVIDER=azure \
    LOG_LEVEL=info \
    TEST_MODE=false
```

#### Auth-Service App Settings

```bash
az webapp config appsettings set \
  --resource-group etelios-hrms-rg \
  --name etelios-auth-service \
  --settings \
    WEBSITES_PORT=3001 \
    NODE_ENV=production \
    PORT=3001 \
    SERVICE_NAME=auth-service \
    CORS_ORIGIN="https://your-frontend.azurewebsites.net" \
    JWT_EXPIRY=1h \
    JWT_REFRESH_EXPIRY=7d \
    LOG_LEVEL=info \
    TEST_MODE=false
```

### Step 5: Configure Key Vault References

Instead of storing secrets directly, use Key Vault references:

```bash
# HR Service - Set Key Vault references
az webapp config appsettings set \
  --resource-group etelios-hrms-rg \
  --name etelios-hr-service \
  --settings \
    MONGO_URI="@Microsoft.KeyVault(SecretUri=https://etelios-keyvault.vault.azure.net/secrets/mongo-uri/)" \
    JWT_SECRET="@Microsoft.KeyVault(SecretUri=https://etelios-keyvault.vault.azure.net/secrets/jwt-secret/)" \
    JWT_REFRESH_SECRET="@Microsoft.KeyVault(SecretUri=https://etelios-keyvault.vault.azure.net/secrets/jwt-refresh-secret/)" \
    AZURE_STORAGE_CONNECTION_STRING="@Microsoft.KeyVault(SecretUri=https://etelios-keyvault.vault.azure.net/secrets/azure-storage-connection-string/)"

# Auth Service - Set Key Vault references
az webapp config appsettings set \
  --resource-group etelios-hrms-rg \
  --name etelios-auth-service \
  --settings \
    MONGO_URI="@Microsoft.KeyVault(SecretUri=https://etelios-keyvault.vault.azure.net/secrets/mongo-uri/)" \
    JWT_SECRET="@Microsoft.KeyVault(SecretUri=https://etelios-keyvault.vault.azure.net/secrets/jwt-secret/)" \
    JWT_REFRESH_SECRET="@Microsoft.KeyVault(SecretUri=https://etelios-keyvault.vault.azure.net/secrets/jwt-refresh-secret/)"
```

### Step 6: Grant App Service Access to Key Vault

```bash
# Get App Service Managed Identity
HR_MSI=$(az webapp identity show --resource-group etelios-hrms-rg --name etelios-hr-service --query principalId -o tsv)
AUTH_MSI=$(az webapp identity show --resource-group etelios-hrms-rg --name etelios-auth-service --query principalId -o tsv)

# Enable Managed Identity
az webapp identity assign \
  --resource-group etelios-hrms-rg \
  --name etelios-hr-service

az webapp identity assign \
  --resource-group etelios-hrms-rg \
  --name etelios-auth-service

# Grant Key Vault access
az keyvault set-policy \
  --name etelios-keyvault \
  --object-id $HR_MSI \
  --secret-permissions get list

az keyvault set-policy \
  --name etelios-keyvault \
  --object-id $AUTH_MSI \
  --secret-permissions get list
```

### Step 7: Configure CORS

```bash
# HR Service CORS
az webapp cors add \
  --resource-group etelios-hrms-rg \
  --name etelios-hr-service \
  --allowed-origins "https://your-frontend.azurewebsites.net"

# Auth Service CORS
az webapp cors add \
  --resource-group etelios-hrms-rg \
  --name etelios-auth-service \
  --allowed-origins "https://your-frontend.azurewebsites.net"
```

### Step 8: Enable Continuous Deployment

```bash
# Enable CD for HR Service
az webapp deployment container config \
  --name etelios-hr-service \
  --resource-group etelios-hrms-rg \
  --enable-cd true

# Enable CD for Auth Service
az webapp deployment container config \
  --name etelios-auth-service \
  --resource-group etelios-hrms-rg \
  --enable-cd true
```

---

## Verification & Testing

### Step 1: Check Service Health

```bash
# HR Service Health
curl https://etelios-hr-service.azurewebsites.net/health

# Auth Service Health
curl https://etelios-auth-service.azurewebsites.net/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "hr-service",
  "timestamp": "2025-11-11T12:00:00.000Z"
}
```

### Step 2: Test Authentication Endpoints

```bash
# Test HR Service Login
curl -X POST https://etelios-hr-service.azurewebsites.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456",
    "rememberMe": false
  }'

# Test Auth Service Login (if separate)
curl -X POST https://etelios-auth-service.azurewebsites.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456"
  }'
```

### Step 3: Verify Database Connection

Check App Service logs:
```bash
az webapp log tail \
  --name etelios-hr-service \
  --resource-group etelios-hrms-rg

az webapp log tail \
  --name etelios-auth-service \
  --resource-group etelios-hrms-rg
```

Look for:
- ✅ "MongoDB connected successfully"
- ✅ "hr-service running on port 3002"
- ✅ "auth-service running on port 3001"

### Step 4: Test Protected Endpoints

```bash
# Get token from login response
TOKEN="your-access-token-here"

# Test protected endpoint
curl -X GET https://etelios-hr-service.azurewebsites.net/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## Troubleshooting

### Issue 1: Container Won't Start

**Symptoms**: App Service shows "Container failed to start"

**Solutions**:
1. Check logs: `az webapp log tail --name <app-name> --resource-group <rg>`
2. Verify `WEBSITES_PORT` matches service port (3001 or 3002)
3. Check Dockerfile CMD is correct
4. Verify environment variables are set

### Issue 2: Database Connection Failed

**Symptoms**: "MongoDB connection failed" in logs

**Solutions**:
1. Verify `MONGO_URI` is correct
2. Check MongoDB firewall allows Azure IPs
3. For Cosmos DB, verify connection string format
4. Test connection string manually

### Issue 3: 401 Unauthorized Errors

**Symptoms**: All requests return 401

**Solutions**:
1. Verify `JWT_SECRET` and `JWT_REFRESH_SECRET` are set
2. Check secrets match between services (if sharing auth)
3. Verify token format in requests
4. Check token expiry settings

### Issue 4: CORS Errors

**Symptoms**: Frontend can't call APIs

**Solutions**:
1. Verify `CORS_ORIGIN` matches frontend URL exactly
2. Check App Service CORS settings
3. Verify frontend URL in environment variables
4. Check browser console for exact CORS error

### Issue 5: Key Vault Access Denied

**Symptoms**: "Access denied to Key Vault"

**Solutions**:
1. Enable Managed Identity on App Service
2. Grant Key Vault access to Managed Identity
3. Verify Key Vault policy allows `get` and `list`
4. Check Key Vault network rules

### Issue 6: Pipeline Build Fails

**Symptoms**: Docker build fails in pipeline

**Solutions**:
1. Check Dockerfile syntax
2. Verify all dependencies in package.json
3. Check for missing files in repository
4. Review build logs for specific errors

---

## Monitoring & Maintenance

### Application Insights Setup

```bash
# Create Application Insights
az monitor app-insights component create \
  --app etelios-hr-service-insights \
  --location eastus \
  --resource-group etelios-hrms-rg

# Get Instrumentation Key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app etelios-hr-service-insights \
  --resource-group etelios-hrms-rg \
  --query instrumentationKey -o tsv)

# Configure App Service
az webapp config appsettings set \
  --resource-group etelios-hrms-rg \
  --name etelios-hr-service \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY
```

### Log Monitoring

```bash
# Stream logs
az webapp log tail --name etelios-hr-service --resource-group etelios-hrms-rg

# Download logs
az webapp log download \
  --name etelios-hr-service \
  --resource-group etelios-hrms-rg \
  --log-file hr-service-logs.zip
```

### Health Check Alerts

1. Go to **Azure Portal** → **App Service** → **Alerts**
2. Create alert rule:
   - Condition: HTTP 5xx errors
   - Threshold: > 10 in 5 minutes
   - Action: Email/SMS notification

### Backup Strategy

```bash
# Enable backup
az webapp config backup update \
  --resource-group etelios-hrms-rg \
  --webapp-name etelios-hr-service \
  --container-url "https://yourstorageaccount.blob.core.windows.net/backups" \
  --retention-one-day-backup 30
```

---

## Quick Reference Commands

### Check Service Status
```bash
az webapp show --name etelios-hr-service --resource-group etelios-hrms-rg --query state
az webapp show --name etelios-auth-service --resource-group etelios-hrms-rg --query state
```

### Restart Services
```bash
az webapp restart --name etelios-hr-service --resource-group etelios-hrms-rg
az webapp restart --name etelios-auth-service --resource-group etelios-hrms-rg
```

### View App Settings
```bash
az webapp config appsettings list --name etelios-hr-service --resource-group etelios-hrms-rg
az webapp config appsettings list --name etelios-auth-service --resource-group etelios-hrms-rg
```

### Update App Settings
```bash
az webapp config appsettings set \
  --name etelios-hr-service \
  --resource-group etelios-hrms-rg \
  --settings KEY=VALUE
```

### Scale Services
```bash
az appservice plan update \
  --name etelios-hr-service-plan \
  --resource-group etelios-hrms-rg \
  --sku P1V2
```

---

## Post-Deployment Checklist

- [ ] Both services are running and healthy
- [ ] Health endpoints return 200 OK
- [ ] Database connections successful
- [ ] Authentication endpoints working
- [ ] JWT tokens generated correctly
- [ ] Protected endpoints require authentication
- [ ] CORS configured correctly
- [ ] Logs are being generated
- [ ] Application Insights configured
- [ ] Alerts configured
- [ ] Backup enabled
- [ ] Secrets stored in Key Vault
- [ ] Managed Identity configured
- [ ] Pipeline triggers on code push
- [ ] Documentation updated

---

## Support & Contacts

- **DevOps Team**: [Your DevOps Email]
- **Backend Team**: [Your Backend Email]
- **Azure Support**: https://portal.azure.com

---

## Appendix

### Service URLs

- **HR Service**: `https://etelios-hr-service.azurewebsites.net`
- **Auth Service**: `https://etelios-auth-service.azurewebsites.net`
- **Health Checks**: 
  - HR: `https://etelios-hr-service.azurewebsites.net/health`
  - Auth: `https://etelios-auth-service.azurewebsites.net/health`

### API Endpoints

**HR Service:**
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `GET /api/hr/employees` - Get employees
- `GET /api/hr/stores` - Get stores
- `GET /api/hr/policies/leave` - Get leave policies
- And more...

**Auth Service:**
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/auth/me` - Get current user
- And more...

---

**Document Version**: 1.0.0  
**Last Updated**: 2025-11-11  
**Maintained By**: DevOps Team

