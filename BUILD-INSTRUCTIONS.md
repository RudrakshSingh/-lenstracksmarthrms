# Build and Push Instructions

## Prerequisites

Before building and pushing Docker images, ensure:

1. **Docker Desktop is running**
   ```bash
   # Check if Docker is running
   docker ps
   
   # If not running, start Docker Desktop application
   ```

2. **Azure CLI is installed and logged in**
   ```bash
   az login
   az account show
   ```

3. **Access to Azure Container Registries**
   - Gateway ACR: `eteliosacr`
   - Microservices ACR: `eteliosregistry` (if it exists, otherwise use `eteliosacr`)

## Current ACR Configuration

Based on your Azure setup:
- **ACR Name**: `eteliosacr`
- **ACR Login Server**: `eteliosacr-hvawabdbgge7e0fu.azurecr.io`

## Build and Push All Images

### Option 1: Using the Build Script (Recommended)

```bash
# Make sure Docker Desktop is running first!
# Then run:
./k8s/build-and-push.sh all
```

### Option 2: Build Individual Services

```bash
# Build API Gateway
./k8s/build-and-push.sh api-gateway

# Build specific microservice
./k8s/build-and-push.sh auth-service
./k8s/build-and-push.sh hr-service
```

### Option 3: Use Azure DevOps Pipelines

The pipelines will automatically build and push when you push code to `main` branch.

## Troubleshooting

### Docker Not Running
```
Error: Cannot connect to the Docker daemon
```
**Solution**: Start Docker Desktop application on your Mac

### ACR Login Failed
```
Error: Registry names may contain only alpha numeric characters
```
**Solution**: Use the ACR name (e.g., `eteliosacr`) not the full login server URL

### Permission Denied
```
Error: Access denied
```
**Solution**: 
- Verify you're logged in: `az account show`
- Check ACR permissions: `az acr show --name eteliosacr`

## Next Steps

1. ✅ Start Docker Desktop
2. ✅ Run build script: `./k8s/build-and-push.sh all`
3. ✅ Verify images: `./verify-image-links.sh`
4. ✅ Deploy to App Service (via pipelines or manually)

