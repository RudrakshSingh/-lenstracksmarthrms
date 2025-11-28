# Single App Service - MongoDB URI Configuration Guide

## Understanding Your Architecture

If you have a **single App Service** for the backend, you need to understand how the code differentiates between Auth and HR service MongoDB connections.

---

## How It Works

The code uses the **`SERVICE_NAME`** environment variable to determine which MongoDB connection string to use from Azure Key Vault.

### Key Vault Secret Naming Convention

The Key Vault utility automatically constructs the secret name based on `SERVICE_NAME`:

```
kv-mongo-uri-{SERVICE_NAME}
```

**Examples:**
- If `SERVICE_NAME=auth-service` → Looks for secret: `kv-mongo-uri-auth-service`
- If `SERVICE_NAME=hr-service` → Looks for secret: `kv-mongo-uri-hr-service`

---

## Configuration Options

### Option 1: Multi-Container App Service (Recommended)

If you're running both Auth and HR services in the same App Service using **multi-container** (Docker Compose):

**Each container needs its own `SERVICE_NAME`:**

**Container 1 (Auth Service):**
```yaml
environment:
  - SERVICE_NAME=auth-service
  - USE_KEY_VAULT=true
  - AZURE_KEY_VAULT_URL=https://etelios-keyvault.vault.azure.net/
  - MONGO_URI=""  # Leave empty - will fetch from Key Vault
```

**Container 2 (HR Service):**
```yaml
environment:
  - SERVICE_NAME=hr-service
  - USE_KEY_VAULT=true
  - AZURE_KEY_VAULT_URL=https://etelios-keyvault.vault.azure.net/
  - MONGO_URI=""  # Leave empty - will fetch from Key Vault
```

**Key Vault Secrets Required:**
- `kv-mongo-uri-auth-service` → Auth service connection string
- `kv-mongo-uri-hr-service` → HR service connection string

---

### Option 2: Single Container with API Gateway Only

If your single App Service only runs the **API Gateway** (which proxies to separate Auth and HR App Services):

**API Gateway doesn't need MONGO_URI** - it just proxies requests.

**Environment Variables:**
```bash
# API Gateway doesn't need MONGO_URI
# It only needs service URLs
AUTH_SERVICE_URL=https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net
HR_SERVICE_URL=https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net
```

**Separate App Services for Auth and HR:**
- **Auth Service App Service** needs: `SERVICE_NAME=auth-service` → Uses `kv-mongo-uri-auth-service`
- **HR Service App Service** needs: `SERVICE_NAME=hr-service` → Uses `kv-mongo-uri-hr-service`

---

### Option 3: Single Container Running One Service

If your single App Service runs **only one service** (either Auth OR HR):

**For Auth Service Only:**
```bash
SERVICE_NAME=auth-service
USE_KEY_VAULT=true
AZURE_KEY_VAULT_URL=https://etelios-keyvault.vault.azure.net/
MONGO_URI=""  # Leave empty - will fetch kv-mongo-uri-auth-service
```

**For HR Service Only:**
```bash
SERVICE_NAME=hr-service
USE_KEY_VAULT=true
AZURE_KEY_VAULT_URL=https://etelios-keyvault.vault.azure.net/
MONGO_URI=""  # Leave empty - will fetch kv-mongo-uri-hr-service
```

---

## Complete Configuration for Single App Service (Multi-Container)

If you're using **Docker Compose** in a single App Service:

### docker-compose.yml Configuration

```yaml
version: '3.8'

services:
  auth-service:
    image: eteliosacr.azurecr.io/auth-service:latest
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - SERVICE_NAME=auth-service  # ← This determines which Key Vault secret to use
      - USE_KEY_VAULT=true
      - AZURE_KEY_VAULT_URL=https://etelios-keyvault.vault.azure.net/
      - AZURE_KEY_VAULT_NAME=etelios-keyvault
      - MONGO_URI=""  # Leave empty - fetches kv-mongo-uri-auth-service
      - JWT_SECRET=""  # Leave empty - fetches kv-jwt-secret
      - JWT_REFRESH_SECRET=""  # Leave empty - fetches kv-jwt-refresh-secret
      - CORS_ORIGIN=*
    restart: always

  hr-service:
    image: eteliosacr.azurecr.io/hr-service:latest
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - PORT=3002
      - SERVICE_NAME=hr-service  # ← This determines which Key Vault secret to use
      - USE_KEY_VAULT=true
      - AZURE_KEY_VAULT_URL=https://etelios-keyvault.vault.azure.net/
      - AZURE_KEY_VAULT_NAME=etelios-keyvault
      - MONGO_URI=""  # Leave empty - fetches kv-mongo-uri-hr-service
      - JWT_SECRET=""  # Leave empty - fetches kv-jwt-secret
      - JWT_REFRESH_SECRET=""  # Leave empty - fetches kv-jwt-refresh-secret
      - CORS_ORIGIN=*
    restart: always
```

---

## Azure App Service Environment Variables

If you're setting environment variables directly in Azure App Service (not using Docker Compose):

### For Auth Service Container:

```bash
az webapp config appsettings set \
  --name <your-app-service-name> \
  --resource-group <your-resource-group> \
  --settings \
    SERVICE_NAME=auth-service \
    USE_KEY_VAULT=true \
    AZURE_KEY_VAULT_URL=https://etelios-keyvault.vault.azure.net/ \
    AZURE_KEY_VAULT_NAME=etelios-keyvault \
    MONGO_URI="" \
    CORS_ORIGIN="*"
```

### For HR Service Container:

```bash
az webapp config appsettings set \
  --name <your-app-service-name> \
  --resource-group <your-resource-group> \
  --settings \
    SERVICE_NAME=hr-service \
    USE_KEY_VAULT=true \
    AZURE_KEY_VAULT_URL=https://etelios-keyvault.vault.azure.net/ \
    AZURE_KEY_VAULT_NAME=etelios-keyvault \
    MONGO_URI="" \
    CORS_ORIGIN="*"
```

**Note:** In multi-container App Service, you set environment variables per container, not globally.

---

## How the Code Works

### Key Vault Utility Logic

```javascript
// In microservices/shared/utils/keyVault.js

const serviceName = process.env.SERVICE_NAME || 'default';

this.secretNameMap = {
  'MONGO_URI': `kv-mongo-uri-${serviceName}`,  // ← Uses SERVICE_NAME
  // ...
};

// When code calls: keyVault.getSecret('MONGO_URI')
// It automatically looks for: kv-mongo-uri-{SERVICE_NAME}
```

### Service Connection Logic

```javascript
// In microservices/auth-service/src/server.js or hr-service/src/server.js

let mongoUri = process.env.MONGO_URI;

if (!mongoUri && process.env.USE_KEY_VAULT === 'true') {
  const keyVault = require('../../shared/utils/keyVault');
  // This will fetch: kv-mongo-uri-{SERVICE_NAME}
  mongoUri = await keyVault.getSecret('MONGO_URI');
}
```

---

## Required Key Vault Secrets

Regardless of your setup, ensure these secrets exist in Key Vault:

1. **`kv-mongo-uri-auth-service`**
   - Value: `mongodb://etelios-mongo-db:password@etelios-mongo-db.mongo.cosmos.azure.com:10255/etelios_auth?ssl=true&...`

2. **`kv-mongo-uri-hr-service`**
   - Value: `mongodb://etelios-hr-service-server:password@etelios-hr-service-server.mongo.cosmos.azure.com:10255/etelios_hr?ssl=true&...`

3. **`kv-jwt-secret`** (shared)
   - Value: `f0d8a229b4f0d48a8a1e01e41c84076bd39e3445b4a677bbdf9b6c73044f6d54a2271de85572d631098a442efe0f72c8826d31a39d2bda35b3a3e54fa67f7565`

4. **`kv-jwt-refresh-secret`** (shared)
   - Value: `5dc6de32b2f8125ad6c3d72f4f6920a900e6858e1bd2848410aa615c839231db0a1692a079b60c421285910a93e28c13a63aabc3da9786d4f6a3ed77bac4e947`

---

## Verification

### Check Which Secret Will Be Used

The code will use:
- **Auth Service:** `kv-mongo-uri-auth-service` (when `SERVICE_NAME=auth-service`)
- **HR Service:** `kv-mongo-uri-hr-service` (when `SERVICE_NAME=hr-service`)

### Verify Key Vault Secrets

```bash
# Check Auth Service Secret
az keyvault secret show \
  --vault-name etelios-keyvault \
  --name kv-mongo-uri-auth-service \
  --query name

# Check HR Service Secret
az keyvault secret show \
  --vault-name etelios-keyvault \
  --name kv-mongo-uri-hr-service \
  --query name
```

---

## Summary

**The `SERVICE_NAME` environment variable is the key!**

- Set `SERVICE_NAME=auth-service` → Uses `kv-mongo-uri-auth-service`
- Set `SERVICE_NAME=hr-service` → Uses `kv-mongo-uri-hr-service`

**Each service/container needs its own `SERVICE_NAME` to fetch the correct connection string from Key Vault.**

---

**Key Vault URL:** `https://etelios-keyvault.vault.azure.net/`

