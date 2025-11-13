# Pipeline Ready Checklist

## ✅ Service Connections (Created)
- [x] `Azure-Service-Connection` - Azure Resource Manager connection
- [ ] `AzureContainerRegistry` - Docker Registry connection (verify this exists)

## ✅ Pipeline Configuration
- [x] Build stage configured
- [x] Deploy stage configured
- [x] Port set to 3000
- [x] App Service name: `etelios-app-service-cxf6hvgjb7gah7dr`

## Next Steps

### 1. Verify Docker Registry Service Connection
Go to Azure DevOps → Project Settings → Service connections
- Check if `AzureContainerRegistry` exists
- If not, create it (see CREATE-SERVICE-CONNECTIONS.md)

### 2. Run the Pipeline
1. Go to: https://dev.azure.com/Hindempire-devops1/etelios/_build
2. Find your pipeline (or create new one from `azure-pipelines.yml`)
3. Click **Run pipeline**
4. Select branch: `main`
5. Click **Run**

### 3. Monitor the Build
- Watch the build progress
- Check for any errors
- Verify Docker image is built and pushed
- Verify deployment to App Service succeeds

### 4. Verify Deployment
After successful deployment:
- Check App Service logs
- Verify server starts on port 3000
- Test health endpoint: `https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/health`
- Test root endpoint: `https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/`

## Expected Results

### Build Stage:
- ✅ Docker image builds successfully
- ✅ Image pushed to: `eteliosacr-hvawabdbgge7e0fu.azurecr.io/eteliosbackend:latest`

### Deploy Stage:
- ✅ Container deployed to App Service
- ✅ App settings configured (WEBSITES_PORT=3000, PORT=3000)
- ✅ App Service restarted

### Logs Should Show:
```
🚀 Etelios Main Server started on port 3000
Environment: production
Health check: http://localhost:3000/health
```

**NO SIGTERM errors** - container should stay running!

## Troubleshooting

If pipeline fails:
1. Check service connections exist and are authorized
2. Verify App Service name is correct
3. Check container registry access
4. Review build/deploy logs for specific errors

