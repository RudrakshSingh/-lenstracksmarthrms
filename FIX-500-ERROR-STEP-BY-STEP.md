# 🔴 Fix 500 Error on Login - Step by Step Guide

## Root Causes Identified

### 1. **Wrong SERVICE_NAME in App Service** ❌
- App Service has `SERVICE_NAME=hr-service` globally
- Auth service reads this and looks for `kv-mongo-uri-hr-service` (WRONG!)
- Should look for `kv-mongo-uri-auth-service` (CORRECT!)

### 2. **Password Field Not Selected** ❌ (FIXED IN CODE)
- Login query wasn't selecting password field
- `comparePassword()` failed because `user.password` was undefined
- **✅ FIXED:** Added `.select('+password')` to queries

### 3. **Single App Service Architecture** ⚠️
- All microservices run in one App Service
- They share global environment variables
- Each service needs its own `SERVICE_NAME` when starting

---

## ✅ Complete Fix Steps

### Step 1: Remove SERVICE_NAME from App Service Global Env Vars

**In Azure Portal:**
1. Go to: **App Services → Etelios-app-service → Settings → Environment variables**
2. **Find** `SERVICE_NAME` variable
3. **Delete it** (or set to empty string)
4. Click **Apply**
5. **Restart** the App Service

**Why:** Global `SERVICE_NAME=hr-service` causes all services to use HR database.

---

### Step 2: Update App Service Environment Variables

**Add/Update these variables:**

| Variable | Value | Purpose |
|----------|-------|---------|
| `USE_KEY_VAULT` | `true` | Enable Key Vault |
| `AZURE_KEY_VAULT_URL` | `https://etelios-keyvault.vault.azure.net/` | Key Vault URL |
| `AZURE_KEY_VAULT_NAME` | `etelios-keyvault` | Key Vault name |
| `CORS_ORIGIN` | `*` | Allow all origins |
| `PORT` | `3000` | API Gateway port |
| `NODE_ENV` | `production` | Production mode |

**Remove:**
- ❌ `SERVICE_NAME` (will be set per service in startup script)

---

### Step 3: Update Startup Script to Set SERVICE_NAME Per Service

**Option A: If Using Docker Compose**

Update `docker-compose.app-service.yml` - each service gets its own `SERVICE_NAME`:

```yaml
services:
  api-gateway:
    environment:
      - PORT=3000
      # NO SERVICE_NAME - API Gateway doesn't need it

  auth-service:
    environment:
      - PORT=3001
      - SERVICE_NAME=auth-service  ← Each service has its own
      - USE_KEY_VAULT=true
      - AZURE_KEY_VAULT_URL=https://etelios-keyvault.vault.azure.net/

  hr-service:
    environment:
      - PORT=3002
      - SERVICE_NAME=hr-service  ← Each service has its own
      - USE_KEY_VAULT=true
      - AZURE_KEY_VAULT_URL=https://etelios-keyvault.vault.azure.net/
```

**Option B: If Using Node.js Startup Script**

Use the provided `start-services-azure.sh` or update your startup script:

```bash
# Start Auth Service with correct SERVICE_NAME
PORT=3001 SERVICE_NAME=auth-service node microservices/auth-service/src/server.js &

# Start HR Service with correct SERVICE_NAME
PORT=3002 SERVICE_NAME=hr-service node microservices/hr-service/src/server.js &
```

**Option C: If Using PM2**

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'api-gateway',
      script: 'src/server.js',
      env: {
        PORT: 3000
        // NO SERVICE_NAME
      }
    },
    {
      name: 'auth-service',
      script: 'microservices/auth-service/src/server.js',
      env: {
        PORT: 3001,
        SERVICE_NAME: 'auth-service',  ← Set per service
        USE_KEY_VAULT: 'true',
        AZURE_KEY_VAULT_URL: 'https://etelios-keyvault.vault.azure.net/'
      }
    },
    {
      name: 'hr-service',
      script: 'microservices/hr-service/src/server.js',
      env: {
        PORT: 3002,
        SERVICE_NAME: 'hr-service',  ← Set per service
        USE_KEY_VAULT: 'true',
        AZURE_KEY_VAULT_URL: 'https://etelios-keyvault.vault.azure.net/'
      }
    }
  ]
};
```

---

### Step 4: Verify Key Vault Secrets Exist

**Run the test script:**
```bash
node scripts/test-keyvault-connection.js
```

**Check required secrets:**
```bash
node scripts/setup-keyvault-secrets.js
```

**Required secrets:**
- ✅ `kv-mongo-uri-auth-service` (Auth database)
- ✅ `kv-mongo-uri-hr-service` (HR database)
- ✅ `kv-jwt-secret` (JWT secret)
- ✅ `kv-jwt-refresh-secret` (JWT refresh secret)

**If missing, create them:**
```bash
KV_NAME="etelios-keyvault"

# Auth Service MongoDB
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "kv-mongo-uri-auth-service" \
  --value "mongodb://username:password@host:10255/etelios_auth?ssl=true&..."

# HR Service MongoDB
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "kv-mongo-uri-hr-service" \
  --value "mongodb://username:password@host:10255/etelios_hr?ssl=true&..."
```

---

### Step 5: Deploy Updated Code

**The code fixes are already committed:**
- ✅ Added `.select('+password')` to login queries
- ✅ Added database connection checks
- ✅ Improved error handling

**Deploy to Azure:**
1. Push code to Azure DevOps
2. Trigger deployment pipeline
3. Or manually deploy if using other method

---

### Step 6: Restart App Service

**In Azure Portal:**
1. Go to: **App Services → Etelios-app-service → Overview**
2. Click **Restart**
3. Wait for restart to complete

---

### Step 7: Verify the Fix

**Test health endpoints:**
```bash
# API Gateway
curl https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/health

# Auth Service (via Gateway)
curl https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/health
```

**Test login endpoint:**
```bash
curl -X POST https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrEmployeeId": "test@example.com",
    "password": "testpassword"
  }'
```

**Expected responses:**

✅ **Success (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

✅ **Invalid Credentials (400):**
```json
{
  "success": false,
  "message": "Invalid email or password",
  "service": "auth-service"
}
```

❌ **Database Error (503):**
```json
{
  "success": false,
  "message": "Service temporarily unavailable. Please try again later.",
  "error": "Database connection error",
  "service": "auth-service"
}
```

---

## Summary: What Will Fix the 500 Error

### ✅ Code Fixes (Already Done)
1. Added `.select('+password')` to login queries
2. Added database connection checks
3. Improved error handling

### ⚠️ Configuration Fixes (You Need to Do)

1. **Remove `SERVICE_NAME` from App Service global env vars**
2. **Set `SERVICE_NAME` per service in startup script/Docker Compose**
3. **Verify Key Vault secrets exist**
4. **Deploy updated code**
5. **Restart App Service**

---

## Quick Checklist

- [ ] Remove `SERVICE_NAME=hr-service` from App Service env vars
- [ ] Add `USE_KEY_VAULT=true` to App Service env vars
- [ ] Add `AZURE_KEY_VAULT_URL` to App Service env vars
- [ ] Update startup script to set `SERVICE_NAME` per service
- [ ] Verify Key Vault secrets exist (`kv-mongo-uri-auth-service`, etc.)
- [ ] Deploy updated code (with password field fix)
- [ ] Restart App Service
- [ ] Test login endpoint

---

## Why This Fixes the 500 Error

**Before (BROKEN):**
```
App Service env: SERVICE_NAME=hr-service (global)
↓
Auth service starts → reads SERVICE_NAME=hr-service
↓
Looks for: kv-mongo-uri-hr-service (WRONG!)
↓
Can't find auth database → 500 error
```

**After (FIXED):**
```
App Service env: (no SERVICE_NAME)
↓
Startup script: SERVICE_NAME=auth-service (per service)
↓
Auth service starts → reads SERVICE_NAME=auth-service
↓
Looks for: kv-mongo-uri-auth-service (CORRECT!)
↓
Connects to auth database → Login works ✅
```

---

**Priority:** 🔴 **URGENT** - Follow these steps to fix the 500 error

