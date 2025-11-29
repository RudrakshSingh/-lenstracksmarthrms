# 🚀 DevOps & Cloud Deployment Guide - Etelios HRMS Backend

## Overview

This guide provides complete instructions for DevOps and Cloud engineers to deploy the Etelios HRMS Backend on Azure App Service.

**Architecture:** Single App Service running API Gateway + All Microservices using PM2

---

## 📋 Prerequisites

### Required Azure Resources

1. ✅ **Azure App Service** (Linux, Node.js 18+)
2. ✅ **Azure Key Vault** (`etelios-keyvault`)
3. ✅ **Azure Cosmos DB** (MongoDB API) - One database per service
4. ✅ **Azure Container Registry** (if using Docker) - Optional
5. ✅ **Managed Identity** (for Key Vault access)

### Required Tools

- Azure CLI (`az`)
- Git
- Node.js 18+ (for local testing)

---

## 🔧 Step 1: Azure Key Vault Setup

### 1.1 Create Key Vault (if not exists)

```bash
# Set variables
RESOURCE_GROUP="your-resource-group"
KEY_VAULT_NAME="etelios-keyvault"
LOCATION="centralindia"

# Create Key Vault
az keyvault create \
  --name $KEY_VAULT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku standard
```

### 1.2 Create Required Secrets

**Auth Service MongoDB Connection String:**
```bash
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "kv-mongo-uri-auth-service" \
  --value "mongodb://username:password@etelios-mongo-db.documents.azure.com:10255/etelios_auth?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-mongo-db@"
```

**HR Service MongoDB Connection String:**
```bash
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "kv-mongo-uri-hr-service" \
  --value "mongodb://username:password@etelios-hr-service-server.documents.azure.com:10255/etelios_hr?ssl=true&replicaSet=globaldb&retrywrites=true&maxIdleTimeMS=120000&appName=@etelios-hr-service-server@"
```

**JWT Secrets:**
```bash
# JWT Access Token Secret (64+ characters)
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "kv-jwt-secret" \
  --value "f0d8a229b4f0d48a8a1e01e41c84076bd39e3445b4a677bbdf9b6c73044f6d54a2271de85572d631098a442efe0f72c8826d31a39d2bda35b3a3e54fa67f7565"

# JWT Refresh Token Secret (64+ characters)
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "kv-jwt-refresh-secret" \
  --value "5dc6de32b2f8125ad6c3d72f4f6920a900e6858e1bd2848410aa615c839231db0a1692a079b60c421285910a93e28c13a63aabc3da9786d4f6a3ed77bac4e947"
```

**Optional Secrets:**
```bash
# Redis (if using)
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "kv-redis-url" \
  --value "redis://your-redis-host:6379"

# Azure Storage (if using)
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "kv-azure-storage-connection-string" \
  --value "DefaultEndpointsProtocol=https;AccountName=..."
```

### 1.3 Verify Secrets

```bash
# List all secrets
az keyvault secret list --vault-name $KEY_VAULT_NAME --query "[].name" -o table

# Verify a specific secret exists
az keyvault secret show --vault-name $KEY_VAULT_NAME --name "kv-mongo-uri-auth-service" --query name
```

---

## 🔐 Step 2: App Service Configuration

### 2.1 Enable Managed Identity

```bash
# Set variables
APP_SERVICE_NAME="etelios-app-service-cxf6hvgjb7gah7dr"
RESOURCE_GROUP="your-resource-group"

# Enable System-Assigned Managed Identity
az webapp identity assign \
  --name $APP_SERVICE_NAME \
  --resource-group $RESOURCE_GROUP

# Get the Principal ID
PRINCIPAL_ID=$(az webapp identity show \
  --name $APP_SERVICE_NAME \
  --resource-group $RESOURCE_GROUP \
  --query principalId -o tsv)

echo "Principal ID: $PRINCIPAL_ID"
```

### 2.2 Grant Key Vault Access to Managed Identity

```bash
# Grant Get and List permissions
az keyvault set-policy \
  --name $KEY_VAULT_NAME \
  --object-id $PRINCIPAL_ID \
  --secret-permissions get list
```

### 2.3 Configure App Service Environment Variables

**⚠️ CRITICAL: Remove SERVICE_NAME from App Service env vars!**

```bash
# Remove SERVICE_NAME (if exists) - This is set per service in PM2 config
az webapp config appsettings delete \
  --name $APP_SERVICE_NAME \
  --resource-group $RESOURCE_GROUP \
  --setting-names SERVICE_NAME

# Set required environment variables
az webapp config appsettings set \
  --name $APP_SERVICE_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    NODE_ENV=production \
    USE_KEY_VAULT=true \
    AZURE_KEY_VAULT_URL="https://${KEY_VAULT_NAME}.vault.azure.net/" \
    AZURE_KEY_VAULT_NAME="${KEY_VAULT_NAME}" \
    CORS_ORIGIN="*" \
    PORT=3000 \
    WEBSITES_PORT=3000
```

**⚠️ IMPORTANT:** Do NOT set `SERVICE_NAME` in App Service env vars. It's set per service in `ecosystem.config.js`.

### 2.4 Configure Startup Command

```bash
# Set PM2 as startup command
az webapp config set \
  --name $APP_SERVICE_NAME \
  --resource-group $RESOURCE_GROUP \
  --startup-file "pm2-runtime ecosystem.config.js"
```

**Or in Azure Portal:**
1. Go to: **App Service → Configuration → General settings**
2. Set **Startup Command** to: `pm2-runtime ecosystem.config.js`
3. Click **Save**

### 2.5 Install PM2 in App Service

**Option A: Via package.json (Recommended)**
- PM2 is already in `package.json` dependencies
- Run `npm install` during deployment

**Option B: Via Startup Command**
```bash
# Update startup command to install PM2 first
az webapp config set \
  --name $APP_SERVICE_NAME \
  --resource-group $RESOURCE_GROUP \
  --startup-file "npm install -g pm2 && pm2-runtime ecosystem.config.js"
```

### 2.6 Configure Always On

```bash
az webapp config set \
  --name $APP_SERVICE_NAME \
  --resource-group $RESOURCE_GROUP \
  --always-on true
```

### 2.7 Configure Health Check

```bash
az webapp config set \
  --name $APP_SERVICE_NAME \
  --resource-group $RESOURCE_GROUP \
  --health-check-path "/health"
```

---

## 📦 Step 3: Deployment

### 3.1 Deploy via Azure DevOps Pipeline

**Create `azure-pipelines.yml`:**

```yaml
trigger:
  branches:
    include:
      - main
      - production

pool:
  vmImage: 'ubuntu-latest'

variables:
  nodeVersion: '18.x'
  appServiceName: 'etelios-app-service-cxf6hvgjb7gah7dr'
  resourceGroup: 'your-resource-group'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '$(nodeVersion)'
    displayName: 'Install Node.js'

  - script: |
      npm ci
      npm run build:prod
    displayName: 'Install dependencies and build'

  - task: AzureWebApp@1
    inputs:
      azureSubscription: 'your-azure-subscription'
      appName: '$(appServiceName)'
      package: '.'
      deploymentMethod: 'zipDeploy'
      startUpCommand: 'pm2-runtime ecosystem.config.js'
    displayName: 'Deploy to Azure App Service'
```

### 3.2 Deploy via Azure CLI

```bash
# Install dependencies and build
npm ci
npm run build:prod

# Create deployment package
zip -r deploy.zip . -x "*.git*" "node_modules/.cache/*" "*.log"

# Deploy to App Service
az webapp deployment source config-zip \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_NAME \
  --src deploy.zip
```

### 3.3 Deploy via Git

```bash
# Configure local Git deployment
az webapp deployment source config-local-git \
  --name $APP_SERVICE_NAME \
  --resource-group $RESOURCE_GROUP

# Get deployment URL
DEPLOYMENT_URL=$(az webapp deployment source show \
  --name $APP_SERVICE_NAME \
  --resource-group $RESOURCE_GROUP \
  --query url -o tsv)

# Add remote and push
git remote add azure $DEPLOYMENT_URL
git push azure main
```

---

## ✅ Step 4: Post-Deployment Verification

### 4.1 Check Service Status

```bash
# Check App Service status
az webapp show \
  --name $APP_SERVICE_NAME \
  --resource-group $RESOURCE_GROUP \
  --query state

# Check logs
az webapp log tail \
  --name $APP_SERVICE_NAME \
  --resource-group $RESOURCE_GROUP
```

### 4.2 Test Health Endpoints

```bash
BASE_URL="https://${APP_SERVICE_NAME}.azurewebsites.net"

# API Gateway health
curl "${BASE_URL}/health"

# Auth service health
curl "${BASE_URL}/api/auth/health"

# HR service health
curl "${BASE_URL}/api/hr/health"
```

### 4.3 Test Login Endpoint

```bash
curl -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrEmployeeId": "test@example.com",
    "password": "testpassword"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": { ... }
}
```

---

## 🔍 Step 5: Monitoring & Troubleshooting

### 5.1 View Application Logs

```bash
# Real-time logs
az webapp log tail \
  --name $APP_SERVICE_NAME \
  --resource-group $RESOURCE_GROUP

# Download logs
az webapp log download \
  --name $APP_SERVICE_NAME \
  --resource-group $RESOURCE_GROUP \
  --log-file app-logs.zip
```

### 5.2 Check PM2 Status (via SSH)

```bash
# Enable SSH in App Service
az webapp ssh \
  --name $APP_SERVICE_NAME \
  --resource-group $RESOURCE_GROUP

# Inside SSH session
pm2 status
pm2 logs
pm2 monit
```

### 5.3 Common Issues & Solutions

**Issue: 500 Error on Login**
- ✅ Check `SERVICE_NAME` is NOT in App Service env vars
- ✅ Verify Key Vault secrets exist
- ✅ Check Managed Identity has Key Vault access
- ✅ Verify PM2 is running: `pm2 status`

**Issue: Database Connection Failed**
- ✅ Verify Cosmos DB connection strings in Key Vault
- ✅ Check database name is included in connection string
- ✅ Verify SSL is enabled for Cosmos DB

**Issue: Services Not Starting**
- ✅ Check PM2 logs: `pm2 logs`
- ✅ Verify `ecosystem.config.js` is in root directory
- ✅ Check Node.js version (requires 18+)

---

## 📊 Step 6: Performance Optimization

### 6.1 Enable Application Insights

```bash
# Create Application Insights
az monitor app-insights component create \
  --app etelios-app-insights \
  --location centralindia \
  --resource-group $RESOURCE_GROUP

# Get Instrumentation Key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app etelios-app-insights \
  --resource-group $RESOURCE_GROUP \
  --query instrumentationKey -o tsv)

# Add to App Service
az webapp config appsettings set \
  --name $APP_SERVICE_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    APPINSIGHTS_INSTRUMENTATIONKEY="${INSTRUMENTATION_KEY}" \
    APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=${INSTRUMENTATION_KEY}"
```

### 6.2 Configure Auto-Scaling

```bash
# Create autoscale settings
az monitor autoscale create \
  --name etelios-autoscale \
  --resource-group $RESOURCE_GROUP \
  --resource "/subscriptions/{subscription-id}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Web/serverfarms/{app-service-plan}" \
  --min-count 1 \
  --max-count 3 \
  --count 1
```

### 6.3 Configure Caching

```bash
# Enable Redis cache (if using)
az redis create \
  --name etelios-redis \
  --resource-group $RESOURCE_GROUP \
  --location centralindia \
  --sku Basic \
  --vm-size c0
```

---

## 🔒 Step 7: Security Hardening

### 7.1 Enable HTTPS Only

```bash
az webapp update \
  --name $APP_SERVICE_NAME \
  --resource-group $RESOURCE_GROUP \
  --https-only true
```

### 7.2 Configure IP Restrictions (Optional)

```bash
# Allow specific IPs only
az webapp config access-restriction add \
  --name $APP_SERVICE_NAME \
  --resource-group $RESOURCE_GROUP \
  --rule-name "AllowOfficeIP" \
  --action Allow \
  --ip-address "1.2.3.4/32" \
  --priority 100
```

### 7.3 Enable Diagnostic Logging

```bash
# Enable application logging
az webapp log config \
  --name $APP_SERVICE_NAME \
  --resource-group $RESOURCE_GROUP \
  --application-logging filesystem \
  --level information
```

---

## 📝 Step 8: Backup & Recovery

### 8.1 Configure Backup

```bash
# Create storage account for backups
az storage account create \
  --name eteliosbackups \
  --resource-group $RESOURCE_GROUP \
  --location centralindia \
  --sku Standard_LRS

# Configure App Service backup
az webapp config backup create \
  --resource-group $RESOURCE_GROUP \
  --webapp-name $APP_SERVICE_NAME \
  --backup-name "daily-backup" \
  --storage-account-url "https://eteliosbackups.blob.core.windows.net/backups"
```

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Key Vault created and configured
- [ ] All required secrets created in Key Vault
- [ ] Managed Identity enabled on App Service
- [ ] Key Vault access granted to Managed Identity
- [ ] `SERVICE_NAME` removed from App Service env vars
- [ ] Required env vars set in App Service
- [ ] Startup command configured (`pm2-runtime ecosystem.config.js`)

### Deployment
- [ ] Code deployed to App Service
- [ ] PM2 installed (via npm or globally)
- [ ] `ecosystem.config.js` in root directory
- [ ] All services starting correctly

### Post-Deployment
- [ ] Health endpoints responding
- [ ] Login endpoint working
- [ ] Logs accessible and clean
- [ ] Monitoring configured
- [ ] Backup configured

---

## 🆘 Support & Troubleshooting

### Key Files
- `ecosystem.config.js` - PM2 configuration
- `package.json` - Dependencies and scripts
- `DEVOPS-DEPLOYMENT-GUIDE.md` - This guide

### Useful Commands

```bash
# Check App Service status
az webapp show --name $APP_SERVICE_NAME --resource-group $RESOURCE_GROUP

# View logs
az webapp log tail --name $APP_SERVICE_NAME --resource-group $RESOURCE_GROUP

# Restart App Service
az webapp restart --name $APP_SERVICE_NAME --resource-group $RESOURCE_GROUP

# Check environment variables
az webapp config appsettings list --name $APP_SERVICE_NAME --resource-group $RESOURCE_GROUP
```

---

## 📞 Contact

For issues or questions:
- Check logs: `az webapp log tail`
- Review `FIX-500-ERROR-STEP-BY-STEP.md` for common issues
- Check `RECOMMENDED-APPROACH.md` for architecture details

---

**Last Updated:** 2025-11-28  
**Version:** 1.0.0

