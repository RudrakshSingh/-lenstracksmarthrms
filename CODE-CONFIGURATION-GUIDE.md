# Code Configuration Guide
## Setting Up Code for Separate Auth and HR App Services

This guide explains how to configure your codebase to work with two separate Azure App Services for Auth and HR services.

## Overview

Your DevOps team will create:
- **Auth Service App Service**: `etelios-auth-service`
- **HR Service App Service**: `etelios-hr-service`

Both services will run independently and can be scaled separately.

## 1. Service URLs Configuration

### Main API Gateway Configuration

The API Gateway (`src/config/services.config.js`) is already configured to use environment variables:

```javascript
'auth': {
  defaultUrl: process.env.AUTH_SERVICE_URL || 'https://etelios-auth-service.azurewebsites.net',
  envVar: 'AUTH_SERVICE_URL'
},
'hr': {
  defaultUrl: process.env.HR_SERVICE_URL || 'https://etelios-hr-service.azurewebsites.net',
  envVar: 'HR_SERVICE_URL'
}
```

### Setting Environment Variables

**Option 1: Set in Main API Gateway App Service**

```bash
az webapp config appsettings set \
  --resource-group etelios-hrms-rg \
  --name Etelios-app-service \
  --settings \
    AUTH_SERVICE_URL="https://etelios-auth-service.azurewebsites.net" \
    HR_SERVICE_URL="https://etelios-hr-service.azurewebsites.net"
```

**Option 2: Update Default URLs in Code**

If the DevOps team provides different URLs, update `src/config/services.config.js`:

```javascript
defaultUrl: 'https://etelios-auth-service-<unique-id>.azurewebsites.net'
```

## 2. Pipeline Configuration

### Auth Service Pipeline

File: `microservices/auth-service/azure-pipelines.yml`

**Key Settings:**
- `containerRegistry`: `eteliosacr.azurecr.io`
- `appServiceName`: `etelios-auth-service`
- `imageRepository`: `auth-service`

### HR Service Pipeline

File: `microservices/hr-service/azure-pipelines.yml`

**Key Settings:**
- `containerRegistry`: `eteliosacr.azurecr.io`
- `appServiceName`: `etelios-hr-service`
- `imageRepository`: `hr-service`

## 3. Inter-Service Communication

### Auth Service Calling HR Service

If Auth service needs to call HR service, configure in Auth service:

```javascript
// In auth-service environment variables
HR_SERVICE_URL=https://etelios-hr-service.azurewebsites.net
```

### HR Service Calling Auth Service

HR service already configured to call Auth service:

```javascript
// In hr-service environment variables
AUTH_SERVICE_URL=https://etelios-auth-service.azurewebsites.net
```

## 4. Environment Variables for Each Service

### Auth Service Required Variables

Set these in the Auth Service App Service:

```bash
WEBSITES_PORT=3001
PORT=3001
NODE_ENV=production
SERVICE_NAME=auth-service
MONGO_URI=<from-key-vault>
JWT_SECRET=<from-key-vault>
JWT_REFRESH_SECRET=<from-key-vault>
JWT_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d
CORS_ORIGIN=*
LOG_LEVEL=info
TEST_MODE=false
```

### HR Service Required Variables

Set these in the HR Service App Service:

```bash
WEBSITES_PORT=3002
PORT=3002
NODE_ENV=production
SERVICE_NAME=hr-service
MONGO_URI=<from-key-vault>
JWT_SECRET=<from-key-vault>
JWT_REFRESH_SECRET=<from-key-vault>
JWT_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d
CORS_ORIGIN=*
FRONTEND_URL=https://your-frontend.azurewebsites.net
AZURE_FRONTEND_URL=https://your-frontend.azurewebsites.net
STORAGE_PROVIDER=azure
AZURE_STORAGE_CONNECTION_STRING=<from-key-vault>
LOG_LEVEL=info
TEST_MODE=false
ENABLE_ROLE_SEEDING=false
AUTH_SERVICE_URL=https://etelios-auth-service.azurewebsites.net
```

## 5. Health Check Endpoints

Both services expose health check endpoints:

- **Auth Service**: `https://etelios-auth-service.azurewebsites.net/health`
- **HR Service**: `https://etelios-hr-service.azurewebsites.net/health`

The API Gateway will check these endpoints to determine service status.

## 6. CORS Configuration

Both services should allow CORS from:
- Frontend URL
- API Gateway URL
- Or use `*` for development (not recommended for production)

## 7. Database Configuration

### Shared Database vs Separate Databases

**Option 1: Shared Database (Current Setup)**
- Both services use the same MongoDB instance
- Different database names: `etelios_auth` and `etelios_hr`

**Option 2: Separate Databases**
- Auth service: `etelios_auth`
- HR service: `etelios_hr`
- Different connection strings if using separate MongoDB instances

## 8. Testing the Setup

### Test Health Endpoints

```bash
# Test Auth Service
curl https://etelios-auth-service.azurewebsites.net/health

# Test HR Service
curl https://etelios-hr-service.azurewebsites.net/health

# Test through API Gateway
curl https://etelios-app-service.azurewebsites.net/api/auth/status
curl https://etelios-app-service.azurewebsites.net/api/hr/status
```

### Test Service Communication

```bash
# Login through API Gateway (calls Auth Service)
curl -X POST https://etelios-app-service.azurewebsites.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Get employees through API Gateway (calls HR Service)
curl https://etelios-app-service.azurewebsites.net/api/hr/employees \
  -H "Authorization: Bearer <token>"
```

## 9. Deployment Flow

1. **DevOps creates App Services** (using DEVOPS-SETUP-GUIDE.md)
2. **Code is pushed to repository**
3. **Pipelines automatically trigger**:
   - Auth service pipeline builds and deploys to `etelios-auth-service`
   - HR service pipeline builds and deploys to `etelios-hr-service`
4. **Services are accessible** via their respective URLs
5. **API Gateway routes requests** to appropriate services

## 10. Monitoring and Logging

### Application Insights

Both services should have Application Insights configured:

```bash
# Get instrumentation key from DevOps
APPINSIGHTS_INSTRUMENTATIONKEY=<from-devops>
```

### Log Streaming

```bash
# Stream Auth Service logs
az webapp log tail --name etelios-auth-service --resource-group etelios-hrms-rg

# Stream HR Service logs
az webapp log tail --name etelios-hr-service --resource-group etelios-hrms-rg
```

## 11. Scaling

Each service can be scaled independently:

```bash
# Scale Auth Service
az appservice plan update \
  --name etelios-app-service-plan \
  --resource-group etelios-hrms-rg \
  --sku S1  # Standard tier

# Enable auto-scaling (if needed)
az monitor autoscale create \
  --name etelios-auth-autoscale \
  --resource-group etelios-hrms-rg \
  --resource /subscriptions/<sub-id>/resourceGroups/etelios-hrms-rg/providers/Microsoft.Web/serverfarms/etelios-app-service-plan \
  --min-count 1 \
  --max-count 10 \
  --count 2
```

## Summary

✅ **Code is already configured** to work with separate App Services
✅ **Pipelines are updated** to deploy to correct App Service names
✅ **Service URLs** can be configured via environment variables
✅ **Inter-service communication** is handled through environment variables

**Next Steps:**
1. Share `DEVOPS-SETUP-GUIDE.md` with DevOps team
2. Get App Service URLs from DevOps after creation
3. Update environment variables in Main API Gateway
4. Test the deployment

