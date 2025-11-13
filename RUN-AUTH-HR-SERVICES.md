# How to Run Only Auth and HR Microservices on Azure App Service

## Overview

You have two options to run only auth and hr services:

1. **Option 1: Deploy as Separate App Services** (Recommended)
   - Deploy auth-service to one App Service (port 3001)
   - Deploy hr-service to another App Service (port 3002)
   - Use the main API gateway to route requests

2. **Option 2: Modify Main Server to Only Proxy Auth & HR**
   - Update the main `src/server.js` to only route to auth and hr services
   - Deploy the main server as a single App Service

---

## Option 1: Deploy as Separate App Services (Recommended)

### Step 1: Deploy Auth Service

1. **Go to Azure DevOps Pipelines:**
   - Navigate to: https://dev.azure.com/Hindempire-devops1/etelios/_build
   - Find or create pipeline for `auth-service`

2. **Create Pipeline for Auth Service:**
   - Go to **Pipelines** → **New Pipeline**
   - Select **Azure Repos Git**
   - Choose repository: `etelios-repo`
   - Select **Existing Azure Pipelines YAML file**
   - Path: `microservices/auth-service/azure-pipelines.yml`
   - Click **Continue** → **Run**

3. **Verify Auth Service Deployment:**
   - Check App Service: `etelios-auth-service`
   - Health check: `https://etelios-auth-service.azurewebsites.net/health`
   - Should be running on port 3001

### Step 2: Deploy HR Service

1. **Create Pipeline for HR Service:**
   - Go to **Pipelines** → **New Pipeline**
   - Select **Azure Repos Git**
   - Choose repository: `etelios-repo`
   - Select **Existing Azure Pipelines YAML file**
   - Path: `microservices/hr-service/azure-pipelines.yml`
   - Click **Continue** → **Run**

2. **Verify HR Service Deployment:**
   - Check App Service: `etelios-hr-service`
   - Health check: `https://etelios-hr-service.azurewebsites.net/health`
   - Should be running on port 3002

### Step 3: Update Main API Gateway (Optional)

If you want the main App Service to route to only auth and hr:

1. **Update `src/server.js`** to only proxy to auth and hr services
2. **Deploy main server** using the root `azure-pipelines.yml`

---

## Option 2: Modify Main Server to Only Route to Auth & HR

### Step 1: Update Main Server

Modify `src/server.js` to only proxy to auth and hr services:

```javascript
// Service proxy endpoints - Only Auth and HR
app.use('/api/auth', (req, res) => {
  const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
  res.redirect(302, `${authServiceUrl}${req.path}`);
});

app.use('/api/hr', (req, res) => {
  const hrServiceUrl = process.env.HR_SERVICE_URL || 'http://localhost:3002';
  res.redirect(302, `${hrServiceUrl}${req.path}`);
});

// Remove or comment out other service routes
// app.use('/api/tenants', ...); // Remove this
```

### Step 2: Set Environment Variables in Azure App Service

1. Go to Azure Portal → Your App Service → **Configuration** → **Application settings**
2. Add:
   - `AUTH_SERVICE_URL` = `https://etelios-auth-service.azurewebsites.net`
   - `HR_SERVICE_URL` = `https://etelios-hr-service.azurewebsites.net`
3. Click **Save**

### Step 3: Deploy Main Server

Run the main pipeline to deploy the updated server.

---

## Quick Setup: Use Existing Pipelines

### For Auth Service:

1. **Check if pipeline exists:**
   - Go to: https://dev.azure.com/Hindempire-devops1/etelios/_build
   - Look for pipeline: `auth-service` or `etelios-auth-service`

2. **If pipeline exists:**
   - Click on it → **Run pipeline** → Select branch `main` → **Run**

3. **If pipeline doesn't exist:**
   - Create new pipeline using `microservices/auth-service/azure-pipelines.yml`

### For HR Service:

1. **Check if pipeline exists:**
   - Look for pipeline: `hr-service` or `etelios-hr-service`

2. **If pipeline exists:**
   - Click on it → **Run pipeline** → Select branch `main` → **Run**

3. **If pipeline doesn't exist:**
   - Create new pipeline using `microservices/hr-service/azure-pipelines.yml`

---

## Verify Services Are Running

### Check Auth Service:
```bash
curl https://etelios-auth-service.azurewebsites.net/health
```

Expected response:
```json
{
  "status": "OK",
  "service": "auth-service",
  "timestamp": "..."
}
```

### Check HR Service:
```bash
curl https://etelios-hr-service.azurewebsites.net/health
```

Expected response:
```json
{
  "status": "OK",
  "service": "hr-service",
  "timestamp": "..."
}
```

---

## Environment Variables Needed

### Auth Service App Service Settings:
- `PORT` = `3001`
- `WEBSITES_PORT` = `3001`
- `NODE_ENV` = `production`
- `MONGO_URI` = (Your MongoDB connection string)
- `JWT_SECRET` = (Your JWT secret)
- `JWT_REFRESH_SECRET` = (Your refresh secret)

### HR Service App Service Settings:
- `PORT` = `3002`
- `WEBSITES_PORT` = `3002`
- `NODE_ENV` = `production`
- `MONGO_URI` = (Your MongoDB connection string)
- `AUTH_SERVICE_URL` = `https://etelios-auth-service.azurewebsites.net`

---

## Troubleshooting

### Service Not Starting:
1. Check App Service logs: **Log stream** in Azure Portal
2. Verify `WEBSITES_PORT` is set correctly
3. Check health endpoint returns 200

### Connection Issues:
1. Verify MongoDB connection string is correct
2. Check firewall rules allow Azure App Service IPs
3. Verify Redis connection (if used)

### Pipeline Fails:
1. Check service connections are created (`Azure-Service-Connection`, `AzureContainerRegistry`)
2. Verify App Service names match in pipeline
3. Check Docker build logs for errors

---

## Next Steps

1. ✅ Deploy auth-service to its own App Service
2. ✅ Deploy hr-service to its own App Service
3. ✅ Test both services independently
4. ✅ Update main API gateway to route to these services (optional)
5. ✅ Configure CORS and networking between services

