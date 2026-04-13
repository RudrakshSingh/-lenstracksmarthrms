# Code Changes Required: Azure to AWS Migration

## 🔍 Summary

Yes, code changes ARE required at microservice level. Here's what needs to change:

## 1. Database Connection (Cosmos DB → DocumentDB)

### Current (Azure Cosmos DB)
```javascript
// Detects Cosmos DB
const isCosmosDB = mongoUri.includes('cosmos.azure.com') || mongoUri.includes('documents.azure.com');

// Cosmos-specific options
retryWrites: false  // Cosmos DB doesn't support
```

### Required (AWS DocumentDB)
```javascript
// DocumentDB connection
const mongoUri = process.env.MONGODB_URI  // DocumentDB endpoint
// Example: mongodb://username:password@docdb-cluster.cluster-xxx.ap-south-1.docdb.amazonaws.com:27017/database?tls=true&tlsCAFile=rds-combined-ca-bundle.pem

// DocumentDB options
retryWrites: true  // DocumentDB supports this
tls: true
tlsCAFile: 'rds-combined-ca-bundle.pem'  // AWS certificate
```

### Files to Change
- `microservices/auth-service/src/server.js` (lines 156-178)
- `microservices/hr-service/src/server.js` (lines 287-311)
- `microservices/attendance-service/src/server.js` (lines 166-187)
- `microservices/tenant-management-service/src/config/database.js` (lines 88-109)
- `microservices/tenant-registry-service/src/utils/database.router.js` (lines 107-234)
- All other service database connections

## 2. File Storage (Azure Blob → AWS S3)

### Current (Azure Blob Storage)
```javascript
const { BlobServiceClient } = require('@azure/storage-blob');

// Azure connection
BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);

// Azure URLs
https://account.blob.core.windows.net/container/file
```

### Required (AWS S3)
```javascript
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

// S3 connection
const s3Client = new S3Client({ region: 'ap-south-1' });

// S3 URLs
https://bucket-name.s3.ap-south-1.amazonaws.com/file
// OR via CloudFront CDN
```

### Files to Change
- `microservices/shared/utils/storage.js`
- `microservices/shared/utils/azureBlobStorage.js` → rename to `awsS3Storage.js`
- `microservices/attendance-service/src/config/azureStorage.js` → rename to `s3Storage.js`
- `microservices/hr-service/src/utils/storage.js`
- `microservices/document-service/src/utils/storage.js`
- All services with storage.js (14 services total)

## 3. Environment Variables

### Current (Azure)
```bash
# Database
MONGO_URI=mongodb://...cosmos.azure.com:10255/...

# Storage
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_STORAGE_ACCOUNT_NAME=...
AZURE_STORAGE_SAS_TOKEN=...
AZURE_STORAGE_CONTAINER_NAME=...

# Key Vault
USE_KEY_VAULT=true
AZURE_KEY_VAULT_URL=https://etelios-keyvault.vault.azure.net/
AZURE_KEY_VAULT_NAME=etelios-keyvault

# Event Hub (Kafka)
KAFKA_BROKERS=etelios-eventhub.servicebus.windows.net:9093
EVENTHUB_CONNECTION_STRING=...
```

### Required (AWS)
```bash
# Database
MONGODB_URI=mongodb://...docdb.amazonaws.com:27017/...?tls=true
AWS_DOCDB_CA_FILE=/app/rds-combined-ca-bundle.pem

# Storage
AWS_REGION=ap-south-1
AWS_S3_BUCKET=etelios-prod-storage-ap-south-1
# IAM role-based auth (no keys needed in EKS)

# Secrets Manager
USE_SECRETS_MANAGER=true
AWS_REGION=ap-south-1
# IAM role-based auth

# Event Bridge / SQS
AWS_EVENTBRIDGE_BUS=etelios-events
AWS_SQS_QUEUE_URL=https://sqs.ap-south-1.amazonaws.com/...
```

## 4. NPM Dependencies

### Remove (Azure)
```json
"@azure/storage-blob": "^12.x.x",
"@azure/keyvault-secrets": "^4.x.x",
"@azure/identity": "^2.x.x"
```

### Add (AWS)
```json
"@aws-sdk/client-s3": "^3.x.x",
"@aws-sdk/client-secrets-manager": "^3.x.x",
"@aws-sdk/client-eventbridge": "^3.x.x",
"@aws-sdk/client-sqs": "^3.x.x"
```

## 5. Key Vault → Secrets Manager

### Current
```javascript
// microservices/shared/utils/keyVault.js
const { SecretClient } = require('@azure/keyvault-secrets');
const { DefaultAzureCredential } = require('@azure/identity');
```

### Required
```javascript
// microservices/shared/utils/secretsManager.js
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const client = new SecretsManagerClient({ region: 'ap-south-1' });
```

## 6. Files Affected (Total: ~60 files)

### Critical Changes Required
- Database connections: 20 files (all services)
- Storage utils: 14 files
- Environment variables: All ConfigMaps/Secrets
- Package.json: 14 services

### Good News: Database Already Compatible!

MongoDB connection strings work the same:
- ✅ Cosmos DB (MongoDB API) → DocumentDB (MongoDB compatible)
- ✅ Just change the connection string
- ✅ Most query code works without changes

## 7. Estimated Time

- Database env changes: 30 minutes (just env vars)
- Storage migration: 2-4 hours (code changes)
- Testing: 1-2 hours
- **Total: 4-7 hours**

## 8. Priority Order

### Phase 1: Get Services Running (1 hour)
1. ✅ Update MONGODB_URI to DocumentDB endpoint
2. ✅ Download DocumentDB CA certificate
3. ✅ Services will run!

### Phase 2: Storage Migration (2-4 hours)
1. Create S3 storage utility
2. Replace Azure Blob code with S3
3. Update environment variables
4. Test file uploads

### Phase 3: Secrets Migration (1 hour)
1. Create Secrets Manager utility
2. Migrate secrets from Key Vault to Secrets Manager
3. Update code references

## ✅ Quick Start: Get Services Running NOW

**Good news:** You can get services running WITHOUT code changes by:

1. Just updating environment variables:
```bash
# In Kubernetes ConfigMap
MONGODB_URI=mongodb://master:password@docdb-endpoint:27017/database?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
```

2. Disabling storage temporarily:
```bash
STORAGE_PROVIDER=local  # Use local storage instead of Azure/S3
```

3. Services will run! (Storage features won't work until Phase 2)

---

**Recommendation:** Get services running first (just env vars), then migrate storage code later.
