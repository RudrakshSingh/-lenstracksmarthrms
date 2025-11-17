# Building and Pushing All Microservices to Azure Container Registry

This guide explains how to build and push Docker images for all microservices to separate ACR repositories.

## Prerequisites

1. **Azure Container Registry (ACR)** - You need an ACR instance in Azure
2. **Docker** - Installed and running locally
3. **Azure CLI** - Installed and logged in
4. **ACR Login** - Authenticated with your ACR

## Services and Ports

| Service Name | Port | Dockerfile Location |
|-------------|------|---------------------|
| auth-service | 3001 | `microservices/auth-service/Dockerfile` |
| hr-service | 3002 | `microservices/hr-service/Dockerfile` |
| attendance-service | 3003 | `microservices/attendance-service/Dockerfile` |
| payroll-service | 3004 | `microservices/payroll-service/Dockerfile` |
| crm-service | 3005 | `microservices/crm-service/Dockerfile` |
| inventory-service | 3006 | `microservices/inventory-service/Dockerfile` |
| sales-service | 3007 | `microservices/sales-service/Dockerfile` |
| purchase-service | 3008 | `microservices/purchase-service/Dockerfile` |
| financial-service | 3009 | `microservices/financial-service/Dockerfile` |
| document-service | 3010 | `microservices/document-service/Dockerfile` |
| service-management | 3011 | `microservices/service-management/Dockerfile` |
| cpp-service | 3012 | `microservices/cpp-service/Dockerfile` |
| prescription-service | 3013 | `microservices/prescription-service/Dockerfile` |
| analytics-service | 3014 | `microservices/analytics-service/Dockerfile` |
| notification-service | 3015 | `microservices/notification-service/Dockerfile` |
| monitoring-service | 3016 | `microservices/monitoring-service/Dockerfile` |
| realtime-service | 3021 | `microservices/realtime-service/Dockerfile` |
| tenant-registry-service | 3020 | `microservices/tenant-registry-service/Dockerfile` |

## Step 1: Login to Azure Container Registry

```bash
# Login to Azure
az login

# Login to ACR (replace with your ACR name)
az acr login --name <your-acr-name>

# Or if using Docker directly
docker login <your-acr-name>.azurecr.io
```

## Step 2: Set Variables

```bash
# Set your ACR name
export ACR_NAME="eteliosregistry"  # or your ACR name
export ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"

# Set image tag (use 'latest' for production or specific version)
export IMAGE_TAG="latest"
```

## Step 3: Build and Push Individual Service

### Example: Build and Push Auth Service

```bash
cd microservices/auth-service

# Build the image
docker build -t ${ACR_LOGIN_SERVER}/auth-service:${IMAGE_TAG} .

# Push to ACR
docker push ${ACR_LOGIN_SERVER}/auth-service:${IMAGE_TAG}
```

## Step 4: Build and Push All Services (Script)

Create a script `build-and-push-all.sh`:

```bash
#!/bin/bash

# Configuration
ACR_NAME="eteliosregistry"  # Change to your ACR name
ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"
IMAGE_TAG="latest"

# Services array
SERVICES=(
    "auth-service:3001"
    "hr-service:3002"
    "attendance-service:3003"
    "payroll-service:3004"
    "crm-service:3005"
    "inventory-service:3006"
    "sales-service:3007"
    "purchase-service:3008"
    "financial-service:3009"
    "document-service:3010"
    "service-management:3011"
    "cpp-service:3012"
    "prescription-service:3013"
    "analytics-service:3014"
    "notification-service:3015"
    "monitoring-service:3016"
    "realtime-service:3021"
    "tenant-registry-service:3020"
)

# Login to ACR
echo "Logging in to ACR..."
az acr login --name ${ACR_NAME}

# Build and push each service
for service_info in "${SERVICES[@]}"; do
    IFS=':' read -r service_name port <<< "$service_info"
    
    echo ""
    echo "========================================="
    echo "Building ${service_name} (port ${port})"
    echo "========================================="
    
    cd "microservices/${service_name}"
    
    # Build image
    docker build -t ${ACR_LOGIN_SERVER}/${service_name}:${IMAGE_TAG} .
    
    if [ $? -eq 0 ]; then
        echo "✅ Build successful for ${service_name}"
        
        # Push image
        echo "Pushing ${service_name} to ACR..."
        docker push ${ACR_LOGIN_SERVER}/${service_name}:${IMAGE_TAG}
        
        if [ $? -eq 0 ]; then
            echo "✅ Push successful for ${service_name}"
        else
            echo "❌ Push failed for ${service_name}"
        fi
    else
        echo "❌ Build failed for ${service_name}"
    fi
    
    # Go back to root
    cd ../..
done

echo ""
echo "========================================="
echo "Build and Push Complete!"
echo "========================================="
```

Make it executable and run:

```bash
chmod +x build-and-push-all.sh
./build-and-push-all.sh
```

## Step 5: Verify Images in ACR

```bash
# List all repositories
az acr repository list --name ${ACR_NAME} --output table

# List tags for a specific repository
az acr repository show-tags --name ${ACR_NAME} --repository auth-service --output table

# Show image details
az acr repository show --name ${ACR_NAME} --image auth-service:latest
```

## Step 6: Using Azure DevOps Pipelines

Each microservice should have its own pipeline file (`azure-pipelines.yml`) that:
1. Builds the Docker image
2. Pushes to ACR
3. Deploys to Azure App Service

### Example Pipeline Structure

```yaml
variables:
  serviceName: 'auth-service'
  dockerRegistryServiceConnection: 'AzureContainerRegistry'
  imageRepository: 'auth-service'
  containerRegistry: 'eteliosregistry.azurecr.io'
  dockerfilePath: '$(Build.SourcesDirectory)/microservices/auth-service/Dockerfile'

stages:
- stage: Build
  jobs:
  - job: Build
    steps:
    - task: Docker@2
      inputs:
        command: buildAndPush
        repository: $(imageRepository)
        dockerfile: $(dockerfilePath)
        containerRegistry: $(dockerRegistryServiceConnection)
        tags: |
          latest
```

## Dockerfile Features

All Dockerfiles follow a standardized multi-stage build pattern:

1. **Builder Stage**: Installs all dependencies (including dev)
2. **Production Stage**: 
   - Uses Alpine Linux for smaller image size
   - Installs only production dependencies
   - Runs as non-root user (nodejs)
   - Includes health checks
   - Uses dumb-init for proper signal handling

## Image Naming Convention

Images are named as: `<acr-name>.azurecr.io/<service-name>:<tag>`

Examples:
- `eteliosregistry.azurecr.io/auth-service:latest`
- `eteliosregistry.azurecr.io/hr-service:latest`
- `eteliosregistry.azurecr.io/attendance-service:latest`

## Troubleshooting

### Build Fails
- Check if `package.json` and `package-lock.json` exist
- Verify Node.js version compatibility (18+)
- Check for syntax errors in Dockerfile

### Push Fails
- Verify ACR login: `az acr login --name <acr-name>`
- Check ACR permissions
- Verify image name matches ACR repository name

### Image Too Large
- Use multi-stage builds (already implemented)
- Remove unnecessary files with `.dockerignore`
- Use Alpine Linux base images (already implemented)

## Next Steps

After building and pushing images:
1. Create Azure App Services for each microservice
2. Configure App Services to pull from ACR
3. Set up environment variables
4. Deploy and test

## Additional Resources

- [Azure Container Registry Documentation](https://docs.microsoft.com/azure/container-registry/)
- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Azure App Service Container Deployment](https://docs.microsoft.com/azure/app-service/quickstart-custom-container)

