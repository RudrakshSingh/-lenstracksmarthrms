# 🔧 Environment Variables Hierarchy Guide

**Understanding .env Files in Microservices**

---

## 📂 Current Structure

```
lenstracksmarthrms/
├── .env                              # Root .env (for local development)
├── .env.example                      # Template file
└── microservices/
    ├── auth-service/
    │   ├── .env                      # Auth service specific
    │   └── src/
    ├── hr-service/
    │   ├── .env                      # HR service specific
    │   └── src/
    ├── attendance-service/
    │   ├── .env                      # Attendance specific
    │   └── src/
    └── ... (other services)
```

---

## 🎯 Priority Order (High to Low)

### When Service Runs:

```
1. Kubernetes Secrets/ConfigMaps (Highest - Production)
   ↓
2. Docker Environment Variables (Docker Compose)
   ↓
3. Service-Specific .env (microservices/hr-service/.env)
   ↓
4. Root .env (lenstracksmarthrms/.env)
   ↓
5. Default Values in Code (Lowest)
```

---

## 📝 Best Practice Setup

### Option 1: Shared Configuration (Recommended for Development)

**Root .env (Development - All Services):**
```bash
# lenstracksmarthrms/.env
# Shared across all services in development

# MongoDB
MONGO_URI=mongodb://localhost:27017/?retryWrites=false

# JWT (Shared secrets)
JWT_SECRET=your_dev_jwt_secret_here
JWT_REFRESH_SECRET=your_dev_refresh_secret_here

# Redis
REDIS_URL=redis://localhost:6379

# Email (Shared for all services)
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=dev_user
EMAIL_PASS=dev_pass

# Feature Flags (Development)
DEBUG=true
NODE_ENV=development
```

**Service-Specific .env (Override Only What's Different):**
```bash
# microservices/hr-service/.env
# Only HR-specific overrides

PORT=3002
SERVICE_NAME=hr-service
DB_NAME=hr-db

# HR Service specific config
HR_REPORTS_PATH=./reports/hr
```

**Why This Works:**
- Service loads root `.env` first (shared config)
- Then loads `microservices/hr-service/.env` (specific overrides)
- Service-specific values override shared ones

---

## 🔄 How It Works in Code

### In Each Service's Entry Point:

```javascript
// microservices/hr-service/src/server.js

// Load root .env first (if exists)
require('dotenv').config({ path: '../../.env' });

// Then load service-specific .env (overrides root)
require('dotenv').config({ path: './.env' });

// OR use dotenv with multiple paths
require('dotenv').config({ 
  path: [
    './.env',           // Service-specific (priority)
    '../../.env'        // Root fallback
  ] 
});

// Now use environment variables
const PORT = process.env.PORT || 3002;
const DB_NAME = process.env.DB_NAME || 'hr-db';
const MONGO_URI = process.env.MONGO_URI;
```

---

## 🎨 Configuration Strategies

### Strategy 1: Shared Base + Service Overrides (Recommended)

**Root .env:**
```bash
# Shared configuration
MONGO_URI=mongodb://localhost:27017/?retryWrites=false
JWT_SECRET=shared_jwt_secret
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

**HR Service .env:**
```bash
# HR-specific only
PORT=3002
SERVICE_NAME=hr-service
DB_NAME=hr-db
```

**Auth Service .env:**
```bash
# Auth-specific only
PORT=3001
SERVICE_NAME=auth-service
DB_NAME=auth-db
```

**Benefits:**
- ✅ Shared config in one place
- ✅ Easy to update common settings
- ✅ Service-specific values are clear

---

### Strategy 2: Independent Service Configs

Each service has COMPLETE configuration:

**HR Service .env:**
```bash
# Complete configuration for HR service
PORT=3002
SERVICE_NAME=hr-service
DB_NAME=hr-db
MONGO_URI=mongodb://localhost:27017/?retryWrites=false
JWT_SECRET=shared_jwt_secret
REDIS_URL=redis://localhost:6379
# ... all other configs
```

**Benefits:**
- ✅ Service is fully independent
- ✅ Can run service in isolation
- ❌ Duplicate configuration
- ❌ Hard to maintain consistency

---

## 🚀 Production Setup (Kubernetes)

### In Production, Ignore .env Files!

**Use Kubernetes ConfigMaps & Secrets:**

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: etelios-config-prod
  namespace: etelios-backend-prod
data:
  # Shared config
  NODE_ENV: "production"
  
  # Database names
  AUTH_SERVICE_DB_NAME: "auth-db"
  HR_SERVICE_DB_NAME: "hr-db"
  ATTENDANCE_SERVICE_DB_NAME: "attendance-db"
  
  # Service URLs
  AUTH_SERVICE_URL: "http://auth-service:3001"
  HR_SERVICE_URL: "http://hr-service:3002"
```

```yaml
# k8s/secrets.yaml (Base64 encoded)
apiVersion: v1
kind: Secret
metadata:
  name: etelios-secrets
  namespace: etelios-backend-prod
type: Opaque
data:
  MONGO_URI: <base64-encoded-connection-string>
  JWT_SECRET: <base64-encoded-secret>
  JWT_REFRESH_SECRET: <base64-encoded-secret>
```

**In Deployment:**
```yaml
# k8s/deployments/hr-service.yaml
env:
  # Service-specific
  - name: PORT
    value: "3002"
  - name: SERVICE_NAME
    value: "hr-service"
  - name: DB_NAME
    value: "hr-db"
  
  # From ConfigMap (Shared)
  - name: NODE_ENV
    valueFrom:
      configMapKeyRef:
        name: etelios-config-prod
        key: NODE_ENV
  
  # From Secret (Shared)
  - name: MONGO_URI
    valueFrom:
      secretKeyRef:
        name: etelios-secrets
        key: MONGO_URI
  - name: JWT_SECRET
    valueFrom:
      secretKeyRef:
        name: etelios-secrets
        key: JWT_SECRET
```

---

## 📋 Recommended Setup

### For Development:

```bash
# Root: .env (Shared Development Config)
MONGO_URI=mongodb://localhost:27017/?retryWrites=false
JWT_SECRET=dev_jwt_secret_here
JWT_REFRESH_SECRET=dev_refresh_secret_here
REDIS_URL=redis://localhost:6379
EMAIL_HOST=smtp.mailtrap.io
NODE_ENV=development
DEBUG=true

# microservices/auth-service/.env
PORT=3001
SERVICE_NAME=auth-service
DB_NAME=auth-db

# microservices/hr-service/.env
PORT=3002
SERVICE_NAME=hr-service
DB_NAME=hr-db

# microservices/attendance-service/.env
PORT=3003
SERVICE_NAME=attendance-service
DB_NAME=attendance-db
```

### Load Order in Code:

```javascript
// Each service's src/server.js
const path = require('path');
const dotenv = require('dotenv');

// 1. Load root .env (shared config)
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// 2. Load service .env (overrides)
dotenv.config({ path: path.join(__dirname, '../.env') });

// 3. Use environment variables
const config = {
  port: process.env.PORT || 3000,
  serviceName: process.env.SERVICE_NAME || 'unknown-service',
  dbName: process.env.DB_NAME || 'default-db',
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  // ... etc
};
```

---

## 🔍 Checking Which .env is Active

### Add Debug Logging:

```javascript
// At the top of server.js
console.log('📂 Environment Configuration:');
console.log('  Service Name:', process.env.SERVICE_NAME);
console.log('  Port:', process.env.PORT);
console.log('  Database:', process.env.DB_NAME);
console.log('  Mongo URI:', process.env.MONGO_URI ? '✅ Set' : '❌ Missing');
console.log('  JWT Secret:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');
console.log('  NODE_ENV:', process.env.NODE_ENV);
```

**Output Example:**
```
📂 Environment Configuration:
  Service Name: hr-service
  Port: 3002
  Database: hr-db
  Mongo URI: ✅ Set
  JWT Secret: ✅ Set
  NODE_ENV: development
```

---

## 🛠️ Common Issues & Solutions

### Issue 1: Service Can't Find Root .env

**Problem:**
```javascript
// Wrong path
dotenv.config({ path: '../../.env' });
```

**Solution:**
```javascript
// Use absolute path
const path = require('path');
dotenv.config({ 
  path: path.resolve(__dirname, '../../../.env') 
});
```

### Issue 2: Service-Specific .env Not Loading

**Problem:** Forgot to load service-specific after root

**Solution:**
```javascript
// Load both in correct order
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') }); // Overrides
```

### Issue 3: Production Using Wrong .env

**Problem:** .env files being used in production

**Solution:**
```javascript
// Only load .env in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
// In production, use Kubernetes env vars
```

---

## ✅ Best Practices Checklist

### Development:
- [ ] Root .env contains shared configuration
- [ ] Service .env contains ONLY service-specific values
- [ ] Root .env is in .gitignore
- [ ] All service .env files are in .gitignore
- [ ] .env.example is committed (template)
- [ ] Services load root .env then service .env

### Production:
- [ ] .env files are NOT deployed
- [ ] Using Kubernetes ConfigMaps for non-sensitive config
- [ ] Using Kubernetes Secrets for sensitive data
- [ ] Services read from process.env
- [ ] No hardcoded credentials

---

## 📊 Configuration Matrix

| Config Type | Root .env | Service .env | K8s ConfigMap | K8s Secret |
|-------------|-----------|--------------|---------------|------------|
| **MongoDB URI** | ✅ Dev | ❌ | ❌ | ✅ Prod |
| **JWT Secret** | ✅ Dev | ❌ | ❌ | ✅ Prod |
| **Service Port** | ❌ | ✅ Dev | ✅ Prod | ❌ |
| **Database Name** | ❌ | ✅ Dev | ✅ Prod | ❌ |
| **Service Name** | ❌ | ✅ Dev | ✅ Prod | ❌ |
| **Redis URL** | ✅ Dev | ❌ | ❌ | ✅ Prod |
| **Feature Flags** | ✅ Dev | ❌ | ✅ Prod | ❌ |

---

## 🎯 Quick Answer

### "Which .env should I use?"

**For Shared Config (MongoDB, JWT, Redis):**
→ Root `.env`

**For Service-Specific (Port, Service Name, DB Name):**
→ `microservices/[service-name]/.env`

**For Production:**
→ Kubernetes ConfigMaps & Secrets (NO .env files!)

---

## 🚀 Implementation Example

### Root .env:
```bash
# Shared Development Configuration
MONGO_URI=mongodb://localhost:27017/?retryWrites=false
JWT_SECRET=dev_jwt_secret_32_chars_minimum
JWT_REFRESH_SECRET=dev_refresh_secret_different
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

### HR Service .env:
```bash
# HR Service Specific
PORT=3002
SERVICE_NAME=hr-service  
DB_NAME=hr-db
```

### HR Service Code:
```javascript
// microservices/hr-service/src/server.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');

const config = {
  port: process.env.PORT,              // From service .env: 3002
  serviceName: process.env.SERVICE_NAME, // From service .env: hr-service
  dbName: process.env.DB_NAME,          // From service .env: hr-db
  mongoUri: process.env.MONGO_URI,      // From root .env
  jwtSecret: process.env.JWT_SECRET     // From root .env
};

// Connect to MongoDB
mongoose.connect(config.mongoUri, {
  dbName: config.dbName  // Uses hr-db
});

// Start server
app.listen(config.port); // Starts on 3002
```

---

**Summary: Root for shared, Service for specific, Kubernetes for production!** 🎯

