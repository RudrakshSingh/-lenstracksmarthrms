# ✅ Recommended Approach for Your Setup

## Your Current Setup Analysis

Based on your codebase, you have:
- ✅ Docker Compose files (`docker-compose.app-service.yml`)
- ✅ Dockerfiles for each service
- ✅ Azure App Service deployment
- ✅ Single App Service running all microservices

## 🏆 **RECOMMENDED: Option 1 - PM2 Ecosystem (Best for Your Case)**

**Why PM2?**
- ✅ **Simple** - One config file, easy to manage
- ✅ **Production-ready** - Built for Node.js process management
- ✅ **Auto-restart** - Services restart if they crash
- ✅ **Logging** - Built-in log management
- ✅ **Works with Azure App Service** - No Docker needed
- ✅ **Easy to debug** - Can see all processes in one place

### Implementation Steps:

**Step 1: Create `ecosystem.config.js` in root directory**

```javascript
module.exports = {
  apps: [
    // API Gateway
    {
      name: 'api-gateway',
      script: 'src/server.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        USE_KEY_VAULT: 'true',
        AZURE_KEY_VAULT_URL: 'https://etelios-keyvault.vault.azure.net/',
        AZURE_KEY_VAULT_NAME: 'etelios-keyvault',
        CORS_ORIGIN: '*'
        // NO SERVICE_NAME - API Gateway doesn't need it
      },
      error_file: './logs/gateway-error.log',
      out_file: './logs/gateway-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    
    // Auth Service
    {
      name: 'auth-service',
      script: 'src/server.js',
      cwd: './microservices/auth-service',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        SERVICE_NAME: 'auth-service',  // ← Set per service
        USE_KEY_VAULT: 'true',
        AZURE_KEY_VAULT_URL: 'https://etelios-keyvault.vault.azure.net/',
        AZURE_KEY_VAULT_NAME: 'etelios-keyvault',
        CORS_ORIGIN: '*'
      },
      error_file: './logs/auth-error.log',
      out_file: './logs/auth-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    
    // HR Service
    {
      name: 'hr-service',
      script: 'src/server.js',
      cwd: './microservices/hr-service',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        SERVICE_NAME: 'hr-service',  // ← Set per service
        USE_KEY_VAULT: 'true',
        AZURE_KEY_VAULT_URL: 'https://etelios-keyvault.vault.azure.net/',
        AZURE_KEY_VAULT_NAME: 'etelios-keyvault',
        CORS_ORIGIN: '*'
      },
      error_file: './logs/hr-error.log',
      out_file: './logs/hr-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    
    // Attendance Service
    {
      name: 'attendance-service',
      script: 'src/server.js',
      cwd: './microservices/attendance-service',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        SERVICE_NAME: 'attendance-service',
        USE_KEY_VAULT: 'true',
        AZURE_KEY_VAULT_URL: 'https://etelios-keyvault.vault.azure.net/',
        AZURE_KEY_VAULT_NAME: 'etelios-keyvault',
        CORS_ORIGIN: '*'
      },
      error_file: './logs/attendance-error.log',
      out_file: './logs/attendance-out.log'
    }
    
    // Add other services as needed...
  ]
};
```

**Step 2: Install PM2**

```bash
npm install -g pm2
```

**Step 3: Update Azure App Service Startup Command**

In Azure Portal:
1. Go to: **App Services → Etelios-app-service → Configuration → General settings**
2. Set **Startup Command** to:
   ```bash
   pm2-runtime ecosystem.config.js
   ```

**Step 4: Update App Service Environment Variables**

Remove:
- ❌ `SERVICE_NAME` (will be set per service in PM2 config)

Keep/Add:
- ✅ `USE_KEY_VAULT=true`
- ✅ `AZURE_KEY_VAULT_URL=https://etelios-keyvault.vault.azure.net/`
- ✅ `AZURE_KEY_VAULT_NAME=etelios-keyvault`
- ✅ `CORS_ORIGIN=*`
- ✅ `NODE_ENV=production`

**Step 5: Install PM2 in package.json**

```json
{
  "scripts": {
    "start": "pm2-runtime ecosystem.config.js",
    "pm2:start": "pm2 start ecosystem.config.js",
    "pm2:stop": "pm2 stop ecosystem.config.js",
    "pm2:restart": "pm2 restart ecosystem.config.js",
    "pm2:logs": "pm2 logs"
  },
  "dependencies": {
    "pm2": "^5.3.0"
  }
}
```

---

## 🥈 **Alternative: Option 2 - Docker Compose (If You Prefer Containers)**

**Use this if:**
- You want container isolation
- You're already using Docker
- You want easier scaling per service

**Update `docker-compose.app-service.yml`:**

```yaml
version: '3.8'

services:
  api-gateway:
    image: eteliosacr.azurecr.io/api-gateway:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - USE_KEY_VAULT=true
      - AZURE_KEY_VAULT_URL=https://etelios-keyvault.vault.azure.net/
      - AZURE_KEY_VAULT_NAME=etelios-keyvault
      - CORS_ORIGIN=*
    restart: always

  auth-service:
    image: eteliosacr.azurecr.io/auth-service:latest
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - SERVICE_NAME=auth-service  # ← Each service has its own
      - USE_KEY_VAULT=true
      - AZURE_KEY_VAULT_URL=https://etelios-keyvault.vault.azure.net/
      - AZURE_KEY_VAULT_NAME=etelios-keyvault
      - CORS_ORIGIN=*
    restart: always

  hr-service:
    image: eteliosacr.azurecr.io/hr-service:latest
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - PORT=3002
      - SERVICE_NAME=hr-service  # ← Each service has its own
      - USE_KEY_VAULT=true
      - AZURE_KEY_VAULT_URL=https://etelios-keyvault.vault.azure.net/
      - AZURE_KEY_VAULT_NAME=etelios-keyvault
      - CORS_ORIGIN=*
    restart: always
```

**In Azure Portal:**
- Set **Startup Command** to: (leave empty - Docker Compose handles it)

---

## 🥉 **Option 3: Simple Startup Script (Quick Fix)**

**Use this if:**
- You want the fastest fix
- You don't want to install PM2
- You're okay with basic process management

**Create `start.sh`:**

```bash
#!/bin/bash

# Start API Gateway
PORT=3000 node src/server.js &

# Start Auth Service
cd microservices/auth-service
PORT=3001 SERVICE_NAME=auth-service node src/server.js &
cd ../..

# Start HR Service
cd microservices/hr-service
PORT=3002 SERVICE_NAME=hr-service node src/server.js &
cd ../..

# Wait for all processes
wait
```

**In Azure Portal:**
- Set **Startup Command** to: `bash start.sh`

---

## 📊 Comparison

| Feature | PM2 (Recommended) | Docker Compose | Startup Script |
|---------|------------------|----------------|----------------|
| **Ease of Setup** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Process Management** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Auto-restart** | ✅ Yes | ✅ Yes | ❌ No |
| **Logging** | ✅ Built-in | ✅ Docker logs | ⚠️ Manual |
| **Production Ready** | ✅ Yes | ✅ Yes | ⚠️ Basic |
| **Debugging** | ✅ Easy | ⚠️ Medium | ⚠️ Hard |
| **Resource Usage** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## ✅ **My Recommendation: Use PM2**

**Why?**
1. ✅ **Fixes your 500 error** - Each service gets correct `SERVICE_NAME`
2. ✅ **Production-ready** - Used by millions of Node.js apps
3. ✅ **Easy to manage** - One config file, simple commands
4. ✅ **Works with Azure** - No Docker complexity
5. ✅ **Better than startup script** - Auto-restart, logging, monitoring

**Quick Start:**
1. Create `ecosystem.config.js` (copy from above)
2. Install PM2: `npm install -g pm2`
3. Update Azure startup command: `pm2-runtime ecosystem.config.js`
4. Remove `SERVICE_NAME` from App Service env vars
5. Restart App Service

---

## 🚀 Next Steps

1. **Choose your approach** (I recommend PM2)
2. **Follow the implementation steps** above
3. **Remove `SERVICE_NAME` from App Service env vars**
4. **Deploy and restart**
5. **Test login endpoint**

---

**Need help implementing?** Let me know which approach you want to use!

