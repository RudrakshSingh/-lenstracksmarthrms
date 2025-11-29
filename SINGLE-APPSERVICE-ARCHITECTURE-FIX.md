# Single App Service Architecture - Complete Fix Guide

## Your Architecture

You have a **single App Service** that runs:
- **API Gateway** on port 3000 (proxies to microservices)
- **Auth Service** on port 3001 (handles `/api/auth/*`)
- **HR Service** on port 3002 (handles `/api/hr/*`)
- **All other microservices** on ports 3003-3016

All services run under the same base URL: `https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net`

## The Problem

Your App Service has **global environment variables**:
```
SERVICE_NAME=hr-service  ← This is WRONG!
```

When **auth-service** starts, it reads `SERVICE_NAME=hr-service` from the global env vars and tries to:
- Connect to `kv-mongo-uri-hr-service` (wrong database!)
- Should connect to `kv-mongo-uri-auth-service` (correct database)

This causes the 500 error because auth-service can't connect to the correct database.

## The Solution

### Option 1: Remove SERVICE_NAME from Global Env Vars (Recommended)

**Step 1: Remove SERVICE_NAME from App Service Environment Variables**

1. Go to: **Azure Portal → App Services → Etelios-app-service → Settings → Environment variables**
2. **Delete** the `SERVICE_NAME` variable (or set it to empty)
3. Click **Apply**

**Step 2: Set SERVICE_NAME Per Service in Startup**

Each microservice must set its own `SERVICE_NAME` when it starts. Update your startup script or process manager to set `SERVICE_NAME` per service.

### Option 2: Use Docker Compose (Best for Production)

If you're using Docker Compose, each container gets its own environment variables. Update `docker-compose.app-service.yml`:

```yaml
services:
  api-gateway:
    image: eteliosacr.azurecr.io/api-gateway:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      # NO SERVICE_NAME - API Gateway doesn't need it
    restart: always

  auth-service:
    image: eteliosacr.azurecr.io/auth-service:latest
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - SERVICE_NAME=auth-service  ← Each service has its own
      - USE_KEY_VAULT=true
      - AZURE_KEY_VAULT_URL=https://etelios-keyvault.vault.azure.net/
      - MONGO_URI=""
    restart: always

  hr-service:
    image: eteliosacr.azurecr.io/hr-service:latest
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - PORT=3002
      - SERVICE_NAME=hr-service  ← Each service has its own
      - USE_KEY_VAULT=true
      - AZURE_KEY_VAULT_URL=https://etelios-keyvault.vault.azure.net/
      - MONGO_URI=""
    restart: always
```

### Option 3: Update Startup Script (If Using Node.js Processes)

If you're using `start-all-services.js` or PM2, update it to set `SERVICE_NAME` per service:

```javascript
// In start-all-services.js
async startService(service) {
  const env = {
    ...process.env,
    PORT: service.port,
    SERVICE_NAME: service.name,  ← Set per service
    NODE_ENV: 'production',
    USE_KEY_VAULT: 'true',
    AZURE_KEY_VAULT_URL: 'https://etelios-keyvault.vault.azure.net/',
    MONGO_URI: ''  // Empty - will use Key Vault
  };
  
  const child = spawn('node', [serverPath], {
    cwd: servicePath,
    env: env,  ← Each process gets its own env
    stdio: 'pipe'
  });
}
```

## Immediate Fix for Your Current Setup

### Step 1: Update App Service Environment Variables

**Remove or Update:**
- ❌ `SERVICE_NAME=hr-service` → **DELETE THIS** (or leave empty)

**Add/Update:**
- ✅ `USE_KEY_VAULT=true`
- ✅ `AZURE_KEY_VAULT_URL=https://etelios-keyvault.vault.azure.net/`
- ✅ `AZURE_KEY_VAULT_NAME=etelios-keyvault`
- ✅ `CORS_ORIGIN=*`
- ✅ `PORT=3000` (for API Gateway)

**Keep:**
- ✅ `MONGO_URI` (can keep for now, but should use Key Vault)
- ✅ `JWT_REFRESH_SECRET`
- ✅ `NODE_ENV=production`

### Step 2: Update Your Startup Script

If you're using a startup script, ensure each service sets its own `SERVICE_NAME`:

```bash
# Example startup.sh
#!/bin/bash

# Start API Gateway (no SERVICE_NAME needed)
PORT=3000 node src/server.js &

# Start Auth Service
PORT=3001 SERVICE_NAME=auth-service node microservices/auth-service/src/server.js &

# Start HR Service
PORT=3002 SERVICE_NAME=hr-service node microservices/hr-service/src/server.js &

# ... etc for other services
```

### Step 3: Update package.json Start Script

If using npm start, update `package.json`:

```json
{
  "scripts": {
    "start": "node src/server.js",
    "start:gateway": "PORT=3000 node src/server.js",
    "start:auth": "PORT=3001 SERVICE_NAME=auth-service node microservices/auth-service/src/server.js",
    "start:hr": "PORT=3002 SERVICE_NAME=hr-service node microservices/hr-service/src/server.js",
    "start:all": "./start-all-services.sh"
  }
}
```

## Verify the Fix

### 1. Check Each Service's SERVICE_NAME

```bash
# Test auth service
curl http://localhost:3001/health
# Should show: "service": "auth-service"

# Test hr service
curl http://localhost:3002/health
# Should show: "service": "hr-service"
```

### 2. Check Database Connections

Each service should connect to its own database:
- Auth service → `kv-mongo-uri-auth-service`
- HR service → `kv-mongo-uri-hr-service`

### 3. Test Login Endpoint

```bash
curl -X POST https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrEmployeeId": "test@example.com", "password": "testpassword"}'
```

## Summary

**The Root Cause:**
- Global `SERVICE_NAME=hr-service` in App Service env vars
- All services read this global value
- Auth service tries to connect to HR database → 500 error

**The Fix:**
1. **Remove** `SERVICE_NAME` from App Service global env vars
2. **Set** `SERVICE_NAME` per service when starting (via startup script, Docker Compose, or PM2)
3. Each service will then connect to its correct database

---

**Priority:** 🔴 **URGENT** - This is blocking all auth endpoints

