# 🔧 Environment Configuration Guide

**Date:** 2026-01-08  
**Status:** ✅ Updated  

---

## 📋 Changes Made to .env.example

### 1. ✅ Fixed Database Names

#### Before (❌ Wrong):
```bash
MONGO_DB=hrms  # Generic name, not service-specific
```

#### After (✅ Correct):
```bash
# Service-Specific Database URIs
AUTH_SERVICE_DB_URI=.../auth-db?...
HR_SERVICE_DB_URI=.../hr-db?...           # ✅ Fixed from "sreung" to "hr-db"
ATTENDANCE_SERVICE_DB_URI=.../attendance-db?...
PAYROLL_SERVICE_DB_URI=.../payroll-db?...
NOTIFICATION_SERVICE_DB_URI=.../notification-db?...
ANALYTICS_SERVICE_DB_URI=.../analytics-db?...
DOCUMENT_SERVICE_DB_URI=.../document-db?...
CRM_SERVICE_DB_URI=.../crm-db?...
CPP_SERVICE_DB_URI=.../cpp-db?...
TENANT_REGISTRY_SERVICE_DB_URI=.../tenant-registry-db?...
```

**Note:** Each microservice now has its own dedicated database!

---

### 2. ✅ Enhanced JWT Configuration

#### Before (Basic):
```bash
JWT_SECRET=your_super_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_here
```

#### After (✅ Enhanced):
```bash
# IMPORTANT: Change these secrets in production!
# Generate strong secrets using: openssl rand -base64 64
JWT_SECRET=your_jwt_secret_key_change_this_in_production_minimum_32_characters_long
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_change_this_in_production_must_be_different_from_jwt_secret
JWT_REFRESH_EXPIRES_IN=7d

# Additional JWT settings
JWT_ALGORITHM=HS256
JWT_ISSUER=hrms-backend
JWT_AUDIENCE=hrms-frontend
```

---

## 🔐 How to Generate Secure JWT Secrets

### Method 1: Using OpenSSL (Recommended)
```bash
# Generate JWT_SECRET
openssl rand -base64 64

# Generate JWT_REFRESH_SECRET (different from JWT_SECRET)
openssl rand -base64 64
```

### Method 2: Using Node.js
```javascript
// Generate in Node.js
const crypto = require('crypto');
console.log('JWT_SECRET:', crypto.randomBytes(64).toString('base64'));
console.log('JWT_REFRESH_SECRET:', crypto.randomBytes(64).toString('base64'));
```

### Method 3: Online Generator
Visit: `https://generate-random.org/api-token-generator`
- Length: 64 characters
- Include: Letters, Numbers, Symbols

---

## 📊 Service-Specific Database Configuration

### Production (Azure Cosmos DB):

| Service | Database Name | Purpose |
|---------|---------------|---------|
| Auth Service | `auth-db` | Users, Roles, Permissions |
| HR Service | `hr-db` | Employees, Departments, Stores |
| Attendance | `attendance-db` | Clock-in/out, Records |
| Payroll | `payroll-db` | Salary, Deductions |
| Notifications | `notification-db` | Alerts, Messages |
| Analytics | `analytics-db` | Reports, Metrics |
| Document | `document-db` | Files, Documents |
| CRM | `crm-db` | Customers, Leads |
| CPP | `cpp-db` | Contact lens prescriptions |
| Tenant Registry | `tenant-registry-db` | Multi-tenancy |

### Connection String Format:
```bash
mongodb://[username]:[password]@[host]:10255/[database-name]?ssl=true&replicaSet=globaldb&retryWrites=false&maxIdleTimeMS=120000&appName=@[appname]@
```

**Important Parameters for Cosmos DB:**
- `ssl=true` - Required for Cosmos DB
- `retryWrites=false` - Cosmos DB doesn't support retryable writes
- `replicaSet=globaldb` - Cosmos DB global replica set
- `maxIdleTimeMS=120000` - Connection timeout (2 minutes)

---

## 🚀 Setting Up Environment Variables

### For Local Development:

1. **Copy the example file:**
```bash
cp .env.example .env
```

2. **Update the values:**
```bash
# Edit .env file
nano .env

# Or use your favorite editor
code .env
```

3. **Set required values:**
- MongoDB connection strings
- JWT secrets (generate new ones!)
- Redis password
- Email credentials
- Azure storage SAS URL

### For Production (Kubernetes):

Environment variables are stored in Kubernetes secrets and configmaps:

```bash
# View current secrets
kubectl get secrets -n etelios-backend-prod

# View current configmap
kubectl get configmap etelios-config-prod -n etelios-backend-prod -o yaml

# Update secret
kubectl edit secret etelios-secrets -n etelios-backend-prod
```

---

## ⚠️ Security Best Practices

### 1. Never Commit Secrets
```bash
# .gitignore should include:
.env
.env.local
.env.production
*.key
*.pem
```

### 2. Use Strong Secrets
```bash
# ❌ Weak
JWT_SECRET=secret123

# ✅ Strong (64+ characters)
JWT_SECRET=xK7m9pL2qN5vR8wY1tU4oI6eA3sD0fG9hJ2kL5nM8pQ1rT4uW7yZ0bC3vF6gH9jK2
```

### 3. Different Secrets for Different Environments
```bash
# Development
JWT_SECRET=dev_secret_here

# Production
JWT_SECRET=prod_secret_completely_different_here
```

### 4. Rotate Secrets Regularly
- JWT secrets: Every 6 months
- Database passwords: Every 3 months
- API keys: As per provider recommendations

---

## 📝 Complete .env File Structure

```bash
# ===============================
# General
# ===============================
NODE_ENV=production
PORT=3000

# ===============================
# MongoDB - Service Databases
# ===============================
AUTH_SERVICE_DB_URI=mongodb://...
HR_SERVICE_DB_URI=mongodb://...
# ... (all services)

# ===============================
# Redis
# ===============================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=secure_password_here

# ===============================
# JWT Authentication
# ===============================
JWT_SECRET=your_64_char_secret_here
JWT_REFRESH_SECRET=different_64_char_secret_here
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# ===============================
# Email
# ===============================
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# ===============================
# Azure Storage
# ===============================
AZURE_STORAGE_SAS_URL=https://...

# ===============================
# Security
# ===============================
BCRYPT_SALT_ROUNDS=12
CORS_ORIGIN=https://your-frontend.com
```

---

## 🧪 Testing Your Configuration

### 1. Test Database Connection:
```bash
# Run from project root
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.AUTH_SERVICE_DB_URI)
  .then(() => console.log('✅ Database connected'))
  .catch(err => console.error('❌ Database error:', err));
"
```

### 2. Test JWT Secret:
```javascript
// test-jwt.js
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { userId: 'test123' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('✅ JWT Token generated:', token);

const decoded = jwt.verify(token, process.env.JWT_SECRET);
console.log('✅ JWT Token verified:', decoded);
```

### 3. Test Redis Connection:
```javascript
// test-redis.js
const redis = require('redis');
const client = redis.createClient({
  url: process.env.REDIS_URL
});

client.connect()
  .then(() => console.log('✅ Redis connected'))
  .catch(err => console.error('❌ Redis error:', err));
```

---

## 📚 Additional Configuration Files

### Service-Specific .env Files:

Each microservice can have its own `.env` file:

```bash
microservices/
├── auth-service/
│   └── .env              # Auth-specific config
├── hr-service/
│   └── .env              # HR-specific config
└── attendance-service/
    └── .env              # Attendance-specific config
```

### Environment Hierarchy:
1. Kubernetes secrets (highest priority)
2. Docker environment variables
3. Service-specific .env
4. Root .env
5. .env.example (template only)

---

## 🔄 Migration from Old Config

If you were using the old configuration:

### Old (Wrong):
```bash
MONGO_DB=hrms
JWT_SECRET=simple_secret
```

### New (Correct):
```bash
AUTH_SERVICE_DB_URI=mongodb://.../auth-db?...
HR_SERVICE_DB_URI=mongodb://.../hr-db?...
JWT_SECRET=64_character_strong_secret_here
JWT_REFRESH_SECRET=different_64_char_secret_here
```

### Migration Steps:
1. Generate new JWT secrets
2. Update all service database URIs
3. Update Kubernetes secrets
4. Restart all services
5. Test authentication

---

## ✅ Checklist

Before deploying to production:

- [ ] All JWT secrets changed from defaults
- [ ] Database URIs updated for each service
- [ ] Redis password set
- [ ] Email credentials configured
- [ ] Azure storage SAS URL updated
- [ ] CORS origins set correctly
- [ ] All secrets stored in Kubernetes
- [ ] .env files not committed to git
- [ ] Documentation updated
- [ ] Team notified of changes

---

## 📞 Support

**File Updated:** `.env.example`  
**Date:** 2026-01-08  
**Key Changes:**
- ✅ Fixed database names (hr-db, auth-db, etc.)
- ✅ Added comprehensive JWT configuration
- ✅ Added all service-specific database URIs
- ✅ Enhanced security guidelines
- ✅ Added feature flags and monitoring config

**Status:** ✅ Ready for use

---

**Remember:** Always use strong, unique secrets in production!  
**Never commit secrets to git!**

