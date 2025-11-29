# Azure Key Vault Setup Guide

## Overview

This guide helps you set up and verify Azure Key Vault secrets for your Etelios microservices.

## Quick Start

### 1. Test Key Vault Connection

```bash
node scripts/test-keyvault-connection.js
```

This will verify:
- ✅ Azure credentials are working
- ✅ Key Vault connection is successful
- ✅ Permissions (Get, List, Set) are configured correctly

### 2. Check Existing Secrets

```bash
node scripts/setup-keyvault-secrets.js
```

This will:
- ✅ List all existing secrets
- ❌ Identify missing required secrets
- 💡 Show what needs to be created

### 3. Create Missing Secrets

Use Azure CLI to create secrets:

```bash
# Set Key Vault name
KV_NAME="etelios-keyvault"

# Create Auth Service MongoDB connection string
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "kv-mongo-uri-auth-service" \
  --value "mongodb://username:password@host:10255/etelios_auth?ssl=true&..."

# Create HR Service MongoDB connection string
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "kv-mongo-uri-hr-service" \
  --value "mongodb://username:password@host:10255/etelios_hr?ssl=true&..."

# Create JWT secrets
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "kv-jwt-secret" \
  --value "your-64-character-jwt-secret-key-here"

az keyvault secret set \
  --vault-name $KV_NAME \
  --name "kv-jwt-refresh-secret" \
  --value "your-64-character-jwt-refresh-secret-key-here"
```

## Required Secrets

### Database Connection Strings (Service-Specific)

| Secret Name | Service | Required | Description |
|------------|---------|----------|-------------|
| `kv-mongo-uri-auth-service` | Auth Service | ✅ Yes | Auth database connection string |
| `kv-mongo-uri-hr-service` | HR Service | ✅ Yes | HR database connection string |
| `kv-mongo-uri-attendance-service` | Attendance Service | ⚠️ Optional | Attendance database connection string |

### JWT Secrets (Shared)

| Secret Name | Required | Description |
|------------|----------|-------------|
| `kv-jwt-secret` | ✅ Yes | JWT access token secret (64+ characters) |
| `kv-jwt-refresh-secret` | ✅ Yes | JWT refresh token secret (64+ characters) |

### Optional Secrets

| Secret Name | Description |
|------------|-------------|
| `kv-redis-url` | Redis connection URL |
| `kv-azure-storage-connection-string` | Azure Storage connection string |

## Secret Naming Convention

The code automatically constructs secret names based on `SERVICE_NAME`:

```
kv-mongo-uri-{SERVICE_NAME}
```

**Examples:**
- `SERVICE_NAME=auth-service` → Looks for `kv-mongo-uri-auth-service`
- `SERVICE_NAME=hr-service` → Looks for `kv-mongo-uri-hr-service`

## How the Code Uses Key Vault

### In Your Microservices

```javascript
// microservices/shared/utils/keyVault.js
const serviceName = process.env.SERVICE_NAME || 'default';
const secretName = `kv-mongo-uri-${serviceName}`;

// Fetch from Key Vault
const mongoUri = await keyVault.getSecret('MONGO_URI');
// This automatically looks for: kv-mongo-uri-{SERVICE_NAME}
```

### Environment Variables Required

```bash
USE_KEY_VAULT=true
AZURE_KEY_VAULT_URL=https://etelios-keyvault.vault.azure.net/
AZURE_KEY_VAULT_NAME=etelios-keyvault
SERVICE_NAME=auth-service  # Or hr-service, etc.
```

## Authentication Methods

### Option 1: Managed Identity (Recommended for App Service)

1. Enable Managed Identity on App Service:
   ```bash
   az webapp identity assign \
     --name <app-service-name> \
     --resource-group <resource-group>
   ```

2. Grant Key Vault access:
   ```bash
   # Get the Managed Identity principal ID
   PRINCIPAL_ID=$(az webapp identity show \
     --name <app-service-name> \
     --resource-group <resource-group> \
     --query principalId -o tsv)

   # Grant Key Vault access
   az keyvault set-policy \
     --name etelios-keyvault \
     --object-id $PRINCIPAL_ID \
     --secret-permissions get list
   ```

### Option 2: Service Principal

Set environment variables:
```bash
AZURE_CLIENT_ID=<client-id>
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_SECRET=<client-secret>
```

### Option 3: Azure CLI (for local development)

```bash
az login
```

## Troubleshooting

### Error: "DefaultAzureCredential failed to retrieve a token"

**Solution:**
1. Verify you're logged in: `az login`
2. Check Managed Identity is enabled (if on App Service)
3. Verify Key Vault access policies

### Error: "Secret not found"

**Solution:**
1. Check secret name matches exactly (case-sensitive)
2. Verify secret exists: `az keyvault secret list --vault-name etelios-keyvault`
3. Check `SERVICE_NAME` environment variable is set correctly

### Error: "Access denied"

**Solution:**
1. Verify Managed Identity has "Get" and "List" permissions
2. Check Key Vault access policies
3. Ensure you're using the correct Key Vault name

## Testing Scripts

### Test Connection
```bash
node scripts/test-keyvault-connection.js
```

### Check Secrets
```bash
node scripts/setup-keyvault-secrets.js
```

### Create Secret (using the helper)
```javascript
const { createSecret } = require('./scripts/setup-keyvault-secrets');

await createSecret(
  'kv-mongo-uri-auth-service',
  'mongodb://...',
  'Auth Service MongoDB Connection String'
);
```

## Next Steps

1. ✅ Run `test-keyvault-connection.js` to verify connectivity
2. ✅ Run `setup-keyvault-secrets.js` to check existing secrets
3. ✅ Create missing required secrets using Azure CLI
4. ✅ Update App Service environment variables
5. ✅ Restart App Service
6. ✅ Test login endpoint

---

**Key Vault URL:** `https://etelios-keyvault.vault.azure.net/`

