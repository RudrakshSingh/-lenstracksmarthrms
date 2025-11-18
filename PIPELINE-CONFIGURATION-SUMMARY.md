# Pipeline Configuration Summary

## For DevOps & Cloud Engineers

### What You Need to Create

**2 Separate Azure App Services:**

1. **Auth Service App Service**
   - Name: `etelios-auth-service`
   - Port: `3001`
   - Image: `eteliosacr.azurecr.io/auth-service:latest`

2. **HR Service App Service**
   - Name: `etelios-hr-service`
   - Port: `3002`
   - Image: `eteliosacr.azurecr.io/hr-service:latest`

**Shared Resources:**
- App Service Plan: `etelios-app-service-plan` (Linux, B1 or higher)
- Container Registry: `eteliosacr`
- Key Vault: `etelios-keyvault`
- Resource Group: `etelios-hrms-rg`

### Quick Setup Commands

See `QUICK-START-FOR-DEVOPS.md` for quick commands, or `DEVOPS-SETUP-GUIDE.md` for detailed instructions.

## For Developers

### Code Configuration

✅ **Code is already configured** to work with separate App Services!

**Key Files:**
- `src/config/services.config.js` - Service URLs (uses environment variables)
- `microservices/auth-service/azure-pipelines.yml` - Auth service pipeline
- `microservices/hr-service/azure-pipelines.yml` - HR service pipeline

### Pipeline Configuration

Both pipelines are configured to:
- Build Docker images
- Push to `eteliosacr.azurecr.io`
- Deploy to separate App Services
- Use Key Vault for secrets

### Environment Variables

**Main API Gateway** needs these environment variables:
```bash
AUTH_SERVICE_URL=https://etelios-auth-service.azurewebsites.net
HR_SERVICE_URL=https://etelios-hr-service.azurewebsites.net
```

**Auth Service** needs:
- `WEBSITES_PORT=3001`
- `PORT=3001`
- `MONGO_URI` (from Key Vault)
- `JWT_SECRET` (from Key Vault)
- `JWT_REFRESH_SECRET` (from Key Vault)

**HR Service** needs:
- `WEBSITES_PORT=3002`
- `PORT=3002`
- `MONGO_URI` (from Key Vault)
- `JWT_SECRET` (from Key Vault)
- `JWT_REFRESH_SECRET` (from Key Vault)
- `AZURE_STORAGE_CONNECTION_STRING` (from Key Vault)
- `AUTH_SERVICE_URL=https://etelios-auth-service.azurewebsites.net`

## Pipeline Files

### Auth Service Pipeline
**File:** `microservices/auth-service/azure-pipelines.yml`

**Key Variables:**
```yaml
containerRegistry: 'eteliosacr.azurecr.io'
imageRepository: 'auth-service'
appServiceName: 'etelios-auth-service'
```

### HR Service Pipeline
**File:** `microservices/hr-service/azure-pipelines.yml`

**Key Variables:**
```yaml
containerRegistry: 'eteliosacr.azurecr.io'
imageRepository: 'hr-service'
appServiceName: 'etelios-hr-service'
```

## How It Works

1. **Code Push** → Triggers pipelines
2. **Build Stage** → Builds Docker images
3. **Push Stage** → Pushes to ACR
4. **Deploy Stage** → Deploys to App Services
5. **Services Run** → Independently on separate App Services

## Benefits of Separate App Services

✅ **Independent Scaling** - Scale each service separately
✅ **Independent Deployment** - Deploy one without affecting the other
✅ **Better Resource Management** - Allocate resources per service
✅ **Isolation** - Issues in one service don't affect the other
✅ **Cost Optimization** - Scale based on actual usage

## Next Steps

1. Share `DEVOPS-SETUP-GUIDE.md` with DevOps team
2. DevOps creates the App Services
3. DevOps provides the App Service URLs
4. Update environment variables in Main API Gateway
5. Push code to trigger pipelines
6. Verify deployments

