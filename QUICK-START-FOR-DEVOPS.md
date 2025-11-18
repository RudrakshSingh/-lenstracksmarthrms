# Quick Start Guide for DevOps Engineers

## What You Need to Create

Create **2 separate Azure App Services** for Auth and HR microservices.

## Prerequisites Checklist

- [ ] Azure Subscription access
- [ ] Resource Group: `etelios-hrms-rg`
- [ ] Azure Container Registry: `eteliosacr`
- [ ] Azure Key Vault: `etelios-keyvault`
- [ ] Service Connection: `Azure-Service-Connection` (Azure DevOps)

## Quick Setup Commands

### 1. Create App Service Plan

```bash
az appservice plan create \
  --name etelios-app-service-plan \
  --resource-group etelios-hrms-rg \
  --location centralindia \
  --is-linux \
  --sku B1
```

### 2. Create Auth Service App Service

```bash
az webapp create \
  --resource-group etelios-hrms-rg \
  --plan etelios-app-service-plan \
  --name etelios-auth-service \
  --deployment-container-image-name eteliosacr.azurecr.io/auth-service:latest

az webapp config container set \
  --name etelios-auth-service \
  --resource-group etelios-hrms-rg \
  --docker-custom-image-name eteliosacr.azurecr.io/auth-service:latest \
  --docker-registry-server-url https://eteliosacr.azurecr.io

az webapp config appsettings set \
  --resource-group etelios-hrms-rg \
  --name etelios-auth-service \
  --settings WEBSITES_PORT=3001 PORT=3001 NODE_ENV=production SERVICE_NAME=auth-service
```

### 3. Create HR Service App Service

```bash
az webapp create \
  --resource-group etelios-hrms-rg \
  --plan etelios-app-service-plan \
  --name etelios-hr-service \
  --deployment-container-image-name eteliosacr.azurecr.io/hr-service:latest

az webapp config container set \
  --name etelios-hr-service \
  --resource-group etelios-hrms-rg \
  --docker-custom-image-name eteliosacr.azurecr.io/hr-service:latest \
  --docker-registry-server-url https://eteliosacr.azurecr.io

az webapp config appsettings set \
  --resource-group etelios-hrms-rg \
  --name etelios-hr-service \
  --settings WEBSITES_PORT=3002 PORT=3002 NODE_ENV=production SERVICE_NAME=hr-service
```

### 4. Get App Service URLs

```bash
echo "Auth Service: https://$(az webapp show --name etelios-auth-service --resource-group etelios-hrms-rg --query defaultHostName -o tsv)"
echo "HR Service: https://$(az webapp show --name etelios-hr-service --resource-group etelios-hrms-rg --query defaultHostName -o tsv)"
```

## What to Share with Development Team

After creating the App Services, provide:

1. **Auth Service URL**: `https://etelios-auth-service.azurewebsites.net` (or actual URL)
2. **HR Service URL**: `https://etelios-hr-service.azurewebsites.net` (or actual URL)

## Full Details

See `DEVOPS-SETUP-GUIDE.md` for complete setup instructions including:
- Key Vault configuration
- Managed Identity setup
- Health checks
- Monitoring
- Troubleshooting

