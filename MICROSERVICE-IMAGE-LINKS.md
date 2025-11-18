# Microservice Image Links - Azure Container Registry

This document lists all Docker image URLs for each microservice deployed to Azure App Service.

## Current Image Configuration

### Main API Gateway
- **Service Name**: `api-gateway`
- **Container Registry**: `eteliosacr-hvawabdbgge7e0fu.azurecr.io`
- **Image Repository**: `eteliosbackend`
- **Image URL**: `eteliosacr-hvawabdbgge7e0fu.azurecr.io/eteliosbackend:latest`
- **App Service**: `Etelios-app-service`
- **Pipeline**: `azure-pipelines.yml` (root)

### Auth Service
- **Service Name**: `auth-service`
- **Container Registry**: `eteliosregistry.azurecr.io`
- **Image Repository**: `auth-service`
- **Image URL**: `eteliosregistry.azurecr.io/auth-service:latest`
- **App Service**: `etelios-auth-service-h8btakd4byhncmgc`
- **Pipeline**: `microservices/auth-service/azure-pipelines.yml`

### HR Service
- **Service Name**: `hr-service`
- **Container Registry**: `eteliosregistry.azurecr.io`
- **Image Repository**: `hr-service`
- **Image URL**: `eteliosregistry.azurecr.io/hr-service:latest`
- **App Service**: `etelios-hr-service-backend-a4ayeqefdsbsc2g3`
- **Pipeline**: `microservices/hr-service/azure-pipelines.yml`

## All Microservices Image Links

Here are the image URLs for all microservices (configured for future deployment):

| Service Name | Container Registry | Image Repository | Full Image URL |
|--------------|-------------------|------------------|----------------|
| **api-gateway** | `eteliosacr-hvawabdbgge7e0fu.azurecr.io` | `eteliosbackend` | `eteliosacr-hvawabdbgge7e0fu.azurecr.io/eteliosbackend:latest` |
| **auth-service** | `eteliosregistry.azurecr.io` | `auth-service` | `eteliosregistry.azurecr.io/auth-service:latest` |
| **hr-service** | `eteliosregistry.azurecr.io` | `hr-service` | `eteliosregistry.azurecr.io/hr-service:latest` |
| **attendance-service** | `eteliosregistry.azurecr.io` | `attendance-service` | `eteliosregistry.azurecr.io/attendance-service:latest` |
| **payroll-service** | `eteliosregistry.azurecr.io` | `payroll-service` | `eteliosregistry.azurecr.io/payroll-service:latest` |
| **crm-service** | `eteliosregistry.azurecr.io` | `crm-service` | `eteliosregistry.azurecr.io/crm-service:latest` |
| **inventory-service** | `eteliosregistry.azurecr.io` | `inventory-service` | `eteliosregistry.azurecr.io/inventory-service:latest` |
| **sales-service** | `eteliosregistry.azurecr.io` | `sales-service` | `eteliosregistry.azurecr.io/sales-service:latest` |
| **purchase-service** | `eteliosregistry.azurecr.io` | `purchase-service` | `eteliosregistry.azurecr.io/purchase-service:latest` |
| **financial-service** | `eteliosregistry.azurecr.io` | `financial-service` | `eteliosregistry.azurecr.io/financial-service:latest` |
| **document-service** | `eteliosregistry.azurecr.io` | `document-service` | `eteliosregistry.azurecr.io/document-service:latest` |
| **service-management** | `eteliosregistry.azurecr.io` | `service-management` | `eteliosregistry.azurecr.io/service-management:latest` |
| **cpp-service** | `eteliosregistry.azurecr.io` | `cpp-service` | `eteliosregistry.azurecr.io/cpp-service:latest` |
| **prescription-service** | `eteliosregistry.azurecr.io` | `prescription-service` | `eteliosregistry.azurecr.io/prescription-service:latest` |
| **analytics-service** | `eteliosregistry.azurecr.io` | `analytics-service` | `eteliosregistry.azurecr.io/analytics-service:latest` |
| **notification-service** | `eteliosregistry.azurecr.io` | `notification-service` | `eteliosregistry.azurecr.io/notification-service:latest` |
| **monitoring-service** | `eteliosregistry.azurecr.io` | `monitoring-service` | `eteliosregistry.azurecr.io/monitoring-service:latest` |
| **tenant-registry-service** | `eteliosregistry.azurecr.io` | `tenant-registry-service` | `eteliosregistry.azurecr.io/tenant-registry-service:latest` |
| **realtime-service** | `eteliosregistry.azurecr.io` | `realtime-service` | `eteliosregistry.azurecr.io/realtime-service:latest` |

## Image URLs in Different Formats

### Docker Pull Commands

```bash
# Main API Gateway
docker pull eteliosacr-hvawabdbgge7e0fu.azurecr.io/eteliosbackend:latest

# Auth Service
docker pull eteliosregistry.azurecr.io/auth-service:latest

# HR Service
docker pull eteliosregistry.azurecr.io/hr-service:latest

# Attendance Service
docker pull eteliosregistry.azurecr.io/attendance-service:latest

# Payroll Service
docker pull eteliosregistry.azurecr.io/payroll-service:latest

# CRM Service
docker pull eteliosregistry.azurecr.io/crm-service:latest

# Inventory Service
docker pull eteliosregistry.azurecr.io/inventory-service:latest

# Sales Service
docker pull eteliosregistry.azurecr.io/sales-service:latest

# Purchase Service
docker pull eteliosregistry.azurecr.io/purchase-service:latest

# Financial Service
docker pull eteliosregistry.azurecr.io/financial-service:latest

# Document Service
docker pull eteliosregistry.azurecr.io/document-service:latest

# Service Management
docker pull eteliosregistry.azurecr.io/service-management:latest

# CPP Service
docker pull eteliosregistry.azurecr.io/cpp-service:latest

# Prescription Service
docker pull eteliosregistry.azurecr.io/prescription-service:latest

# Analytics Service
docker pull eteliosregistry.azurecr.io/analytics-service:latest

# Notification Service
docker pull eteliosregistry.azurecr.io/notification-service:latest

# Monitoring Service
docker pull eteliosregistry.azurecr.io/monitoring-service:latest

# Tenant Registry Service
docker pull eteliosregistry.azurecr.io/tenant-registry-service:latest

# Realtime Service
docker pull eteliosregistry.azurecr.io/realtime-service:latest
```

### Kubernetes Deployment Format

```yaml
# Example for auth-service
image: eteliosregistry.azurecr.io/auth-service:latest

# Example for hr-service
image: eteliosregistry.azurecr.io/hr-service:latest
```

### Azure App Service Container Configuration

```bash
# Auth Service
az webapp config container set \
  --name etelios-auth-service-h8btakd4byhncmgc \
  --resource-group <resource-group> \
  --docker-custom-image-name eteliosregistry.azurecr.io/auth-service:latest

# HR Service
az webapp config container set \
  --name etelios-hr-service-backend-a4ayeqefdsbsc2g3 \
  --resource-group <resource-group> \
  --docker-custom-image-name eteliosregistry.azurecr.io/hr-service:latest
```

## Container Registries Used

1. **eteliosacr-hvawabdbgge7e0fu.azurecr.io**
   - Used for: Main API Gateway
   - Service Connection: `c405786f-9b3e-4c33-92a4-75a3522f83a7`

2. **eteliosregistry.azurecr.io**
   - Used for: All microservices (auth, hr, attendance, payroll, etc.)
   - Service Connection: `AzureContainerRegistry`

## Verifying Images in ACR

### List all repositories
```bash
# For main registry
az acr repository list --name eteliosacr-hvawabdbgge7e0fu --output table

# For microservices registry
az acr repository list --name eteliosregistry --output table
```

### List tags for a specific repository
```bash
# Auth service
az acr repository show-tags --name eteliosregistry --repository auth-service --output table

# HR service
az acr repository show-tags --name eteliosregistry --repository hr-service --output table

# API Gateway
az acr repository show-tags --name eteliosacr-hvawabdbgge7e0fu --repository eteliosbackend --output table
```

## Notes

- All images use the `latest` tag by default
- Images are automatically built and pushed when code is pushed to `main` branch
- Each service has its own unique image URL
- The main API Gateway uses a different ACR registry than the microservices
- All microservices use the same ACR registry (`eteliosregistry.azurecr.io`)

## Future: Different Image Links Per Service

If you want each service to use a different ACR registry or have different naming conventions, you can:

1. Update the pipeline files to use different registries
2. Use the `k8s/service-image-config.sh` script (for Kubernetes)
3. Modify the `build-and-push.sh` script to support per-service configurations

Example configuration for different registries per service:
```bash
# In build-and-push.sh or pipeline
SERVICE_ACR["auth-service"]="eteliosacr-auth"
SERVICE_ACR["hr-service"]="eteliosacr-hr"
SERVICE_ACR["attendance-service"]="eteliosacr-attendance"
```

