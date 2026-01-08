# 🔐 Production Environment Configuration Template

**File:** Copy this content to `.env` in project root

---

## 📋 Root `.env` File (Shared Configuration)

```bash
# =====================================================================
# LensTrack Smart HRMS - Production Environment Configuration
# =====================================================================
# INSTRUCTIONS:
# 1. Copy EVERYTHING below to `.env` in project root
# 2. Replace all YOUR_*_HERE with actual secrets from Azure Portal
# 3. Save and restart all services
# =====================================================================

# ===============================
# APPLICATION ENVIRONMENT
# ===============================
NODE_ENV=production
APP_NAME=etelios-lenstrack-hrms
APP_VERSION=1.0.0
DEBUG=false

# ===============================
# MongoDB - SINGLE Connection String for ALL Microservices
# ===============================
# Azure Cosmos DB (MongoDB API) - Production
# Get from: Azure Portal > Cosmos DB > Connection Strings > Primary Connection String
MONGO_URI=mongodb://etelios-mongo-db:YOUR_PRIMARY_KEY_HERE@etelios-mongo-db.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@etelios-lenstrack-hrms@

# Alternative for Local Testing (uncomment if testing locally):
# MONGO_URI=mongodb://localhost:27017/?retryWrites=false

# ===============================
# Database Names - Per Microservice
# IMPORTANT: These are database NAMES, not connection strings!
# Each service uses the same MONGO_URI but different DB_NAME
# ===============================
AUTH_SERVICE_DB_NAME=auth-db
HR_SERVICE_DB_NAME=hr-db
ATTENDANCE_SERVICE_DB_NAME=attendance-db
PAYROLL_SERVICE_DB_NAME=payroll-db
NOTIFICATION_SERVICE_DB_NAME=notification-db
ANALYTICS_SERVICE_DB_NAME=analytics-db
DOCUMENT_SERVICE_DB_NAME=document-db
CRM_SERVICE_DB_NAME=crm-db
CPP_SERVICE_DB_NAME=cpp-db
PRESCRIPTION_SERVICE_DB_NAME=prescription-db
PURCHASE_SERVICE_DB_NAME=purchase-db
SALES_SERVICE_DB_NAME=sales-db
INVENTORY_SERVICE_DB_NAME=inventory-db
FINANCIAL_SERVICE_DB_NAME=financial-db
SERVICE_MANAGEMENT_DB_NAME=service-management-db
REALTIME_SERVICE_DB_NAME=realtime-db
TENANT_REGISTRY_SERVICE_DB_NAME=tenant-registry-db
MONITORING_SERVICE_DB_NAME=monitoring-db

# ===============================
# JWT Authentication & Security
# ===============================
# Generate using: openssl rand -base64 64
JWT_SECRET=YOUR_JWT_SECRET_64_CHARS_MINIMUM_REPLACE_WITH_OPENSSL_GENERATED_KEY
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=YOUR_JWT_REFRESH_SECRET_DIFFERENT_FROM_JWT_SECRET_64_CHARS_MIN
JWT_REFRESH_EXPIRES_IN=7d
JWT_ALGORITHM=HS256
JWT_ISSUER=etelios-hrms-backend
JWT_AUDIENCE=etelios-hrms-frontend

# ===============================
# Redis Cache - Azure Cache for Redis
# ===============================
# Get from: Azure Portal > Azure Cache for Redis > Access Keys
REDIS_URL=rediss://etelios-redis.redis.cache.windows.net:6380
REDIS_PASSWORD=YOUR_REDIS_PRIMARY_KEY_HERE

# For Local Development (uncomment):
# REDIS_URL=redis://localhost:6379
# REDIS_PASSWORD=

# ===============================
# Azure Blob Storage
# ===============================
# Get from: Azure Portal > Storage Account > Access Keys
AZURE_STORAGE_ACCOUNT_NAME=eteliosstorage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=eteliosstorage;AccountKey=YOUR_STORAGE_ACCOUNT_KEY_HERE;EndpointSuffix=core.windows.net
BLOB_CONTAINER_DOCUMENTS=documents
BLOB_CONTAINER_IMAGES=images
BLOB_CONTAINER_BACKUPS=backups
BLOB_CONTAINER_LOGS=logs

# ===============================
# Azure Key Vault
# ===============================
AZURE_KEY_VAULT_NAME=etelios-kv
AZURE_KEY_VAULT_URL=https://etelios-kv.vault.azure.net/
USE_KEY_VAULT=true

# ===============================
# Azure Application Insights
# ===============================
# Get from: Azure Portal > Application Insights > Properties
APPINSIGHTS_INSTRUMENTATIONKEY=YOUR_APP_INSIGHTS_INSTRUMENTATION_KEY_HERE
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=YOUR_APP_INSIGHTS_KEY;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/

# ===============================
# CORS Configuration
# ===============================
CORS_ORIGIN=https://98.70.245.87,https://etelios-frontend.azurewebsites.net,https://etelios-admin.azurewebsites.net
CORS_CREDENTIALS=true
CORS_METHODS=GET,POST,PUT,DELETE,PATCH,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization,X-Requested-With,Accept,Origin

# ===============================
# Rate Limiting
# ===============================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX_ATTEMPTS=5

# ===============================
# Logging Configuration
# ===============================
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE_ENABLED=true
LOG_FILE_PATH=/var/log/etelios

# ===============================
# Security Headers
# ===============================
HELMET_ENABLED=true
HELMET_HSTS=true
HELMET_HSTS_MAX_AGE=31536000

# ===============================
# File Upload Configuration
# ===============================
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document
UPLOAD_PATH=/tmp/uploads

# ===============================
# Feature Flags
# ===============================
FEATURE_ANALYTICS=true
FEATURE_REPORTING=true
FEATURE_NOTIFICATIONS=true
FEATURE_INTEGRATIONS=true
FEATURE_BACKUP=true
FEATURE_MONITORING=true
FEATURE_LOGGING=true
FEATURE_CACHING=true
FEATURE_RATE_LIMITING=true
FEATURE_SECURITY=true

# ===============================
# Production Mode Settings
# ===============================
PRODUCTION_MODE=true
STRICT_MODE=true
VALIDATION_STRICT=true
ERROR_HANDLING_STRICT=true
VERBOSE_LOGGING=false
MOCK_SERVICES=false
SKIP_AUTHENTICATION=false
SKIP_RATE_LIMITING=false

# ===============================
# Health Check & Monitoring
# ===============================
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000
MONITORING_ENABLED=true
METRICS_ENABLED=true
TRACING_ENABLED=true
PERFORMANCE_MONITORING=true
SLOW_QUERY_THRESHOLD=1000
```

---

## 📋 Auth Service `.env` (Service-Specific)

**File:** `microservices/auth-service/.env`

```bash
# ===============================
# Auth Service Configuration
# ===============================
PORT=3001
SERVICE_NAME=auth-service
DB_NAME=auth-db

# ===============================
# Service-Specific Settings
# ===============================
# Auth service will load shared config from root .env
# Only service-specific overrides needed here
```

---

## 📋 HR Service `.env` (Service-Specific)

**File:** `microservices/hr-service/.env`

```bash
# ===============================
# HR Service Configuration
# ===============================
PORT=3002
SERVICE_NAME=hr-service
DB_NAME=hr-db

# ===============================
# Service-Specific Settings
# ===============================
# HR service will load shared config from root .env
# Only service-specific overrides needed here
```

---

## 🔑 How to Get Secret Values from Azure Portal

### 1. Cosmos DB Primary Key
```bash
Azure Portal
→ Cosmos DB Account: "etelios-mongo-db"
→ Settings → Keys
→ Copy "PRIMARY CONNECTION STRING"
→ Paste in MONGO_URI (replace YOUR_PRIMARY_KEY_HERE)
```

### 2. Redis Primary Key
```bash
Azure Portal
→ Azure Cache for Redis: "etelios-redis"
→ Settings → Access Keys
→ Copy "Primary access key"
→ Paste in REDIS_PASSWORD
```

### 3. Storage Account Key
```bash
Azure Portal
→ Storage Account: "eteliosstorage"
→ Security + networking → Access keys
→ Copy "key1" value
→ Paste in AZURE_STORAGE_CONNECTION_STRING (replace YOUR_STORAGE_ACCOUNT_KEY_HERE)
```

### 4. Application Insights Key
```bash
Azure Portal
→ Application Insights: "etelios-insights"
→ Configure → Properties
→ Copy "Instrumentation Key"
→ Paste in APPINSIGHTS_INSTRUMENTATIONKEY
```

### 5. Generate JWT Secrets
```bash
# Run these commands in terminal:
openssl rand -base64 64

# Copy output and paste:
# - First run → JWT_SECRET
# - Second run → JWT_REFRESH_SECRET
```

---

## ✅ Quick Setup Checklist

- [ ] Create `.env` in project root
- [ ] Copy root .env template above
- [ ] Replace `YOUR_PRIMARY_KEY_HERE` with Cosmos DB key
- [ ] Generate and add JWT secrets
- [ ] Replace `YOUR_REDIS_PRIMARY_KEY_HERE` with Redis key
- [ ] Replace `YOUR_STORAGE_ACCOUNT_KEY_HERE` with Storage key
- [ ] Replace `YOUR_APP_INSIGHTS_INSTRUMENTATION_KEY_HERE` with Insights key
- [ ] Create `microservices/auth-service/.env` with auth config
- [ ] Create `microservices/hr-service/.env` with HR config
- [ ] Verify all placeholders replaced
- [ ] Test connection: `npm start` (should show "✅ Set" for all)

---

## 🚀 Deployment Steps

### For Local Testing:
```bash
# 1. Create .env files
cd /Users/rudrakshsingh/Desktop/lenstracksmarthrms
nano .env  # Paste root config

cd microservices/auth-service
nano .env  # Paste auth config

cd ../hr-service
nano .env  # Paste HR config

# 2. Restart services
npm start
```

### For Kubernetes Production:
```bash
# Don't use .env files in K8s!
# Instead, update Kubernetes secrets:
kubectl edit secret etelios-secrets -n etelios-backend-prod

# Add/update these keys (base64 encoded):
# - MONGO_URI
# - JWT_SECRET
# - JWT_REFRESH_SECRET
# - REDIS_PASSWORD
```

---

## 🔍 Verification

After setup, when you start services, you should see:

```
✅ Loaded root .env from: /path/to/root/.env
✅ Loaded service .env from: /path/to/service/.env
📂 Environment Configuration:
  Service Name: hr-service
  Port: 3002
  Database: hr-db
  Mongo URI: ✅ Set  ← Must show "Set"
  JWT Secret: ✅ Set  ← Must show "Set"
  NODE_ENV: production
```

**If you see `❌ Missing`** → That variable is not in `.env` file!

---

## 📝 Notes

1. **Never commit `.env` files to Git** - They contain secrets!
2. **Root `.env`** = Shared config (MONGO_URI, JWT_SECRET)
3. **Service `.env`** = Service-specific (PORT, DB_NAME)
4. **Production (K8s)** = Use ConfigMaps & Secrets, NOT .env files
5. **All microservices share same MONGO_URI** but use different DB_NAME

---

**Ready to use!** Just copy the templates above and replace placeholders with actual values. 🚀

