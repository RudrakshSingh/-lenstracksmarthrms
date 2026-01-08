# ⚡ Quick Environment Setup Guide

**5-Minute Setup for Production Environment**

---

## 🎯 What You Need

From Azure Portal, collect these 4 keys:
1. ✅ Cosmos DB Primary Connection String
2. ✅ Redis Primary Access Key  
3. ✅ Storage Account Key
4. ✅ Application Insights Instrumentation Key

---

## 🚀 Step 1: Generate JWT Secrets (1 minute)

```bash
cd /Users/rudrakshsingh/Desktop/lenstracksmarthrms

# Make script executable
chmod +x scripts/generate-env-secrets.sh

# Run it
./scripts/generate-env-secrets.sh
```

**Copy the output!** You'll need it in Step 3.

---

## 📝 Step 2: Create Root .env File (2 minutes)

```bash
cd /Users/rudrakshsingh/Desktop/lenstracksmarthrms

# Create .env file
nano .env
```

**Paste this template and fill in YOUR_*_HERE values:**

```bash
# ===============================
# APPLICATION
# ===============================
NODE_ENV=production
DEBUG=false

# ===============================
# MongoDB Connection (SINGLE for ALL services)
# Get from: Azure Portal > Cosmos DB > Connection Strings
# ===============================
MONGO_URI=mongodb://etelios-mongo-db:YOUR_PRIMARY_KEY_HERE@etelios-mongo-db.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@etelios-lenstrack-hrms@

# ===============================
# JWT Secrets (From Step 1 output)
# ===============================
JWT_SECRET=PASTE_FROM_STEP1_OUTPUT
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=PASTE_FROM_STEP1_OUTPUT
JWT_REFRESH_EXPIRES_IN=7d
JWT_ALGORITHM=HS256
JWT_ISSUER=etelios-hrms-backend
JWT_AUDIENCE=etelios-hrms-frontend

# ===============================
# Redis Cache
# Get from: Azure Portal > Redis > Access Keys
# ===============================
REDIS_URL=rediss://etelios-redis.redis.cache.windows.net:6380
REDIS_PASSWORD=YOUR_REDIS_PRIMARY_KEY_HERE

# ===============================
# Azure Storage
# Get from: Azure Portal > Storage Account > Access Keys
# ===============================
AZURE_STORAGE_ACCOUNT_NAME=eteliosstorage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=eteliosstorage;AccountKey=YOUR_STORAGE_KEY_HERE;EndpointSuffix=core.windows.net

# ===============================
# Application Insights
# Get from: Azure Portal > App Insights > Properties
# ===============================
APPINSIGHTS_INSTRUMENTATIONKEY=YOUR_APP_INSIGHTS_KEY_HERE

# ===============================
# CORS (Production Frontend URLs)
# ===============================
CORS_ORIGIN=https://98.70.245.87,https://etelios-frontend.azurewebsites.net

# ===============================
# Feature Flags
# ===============================
PRODUCTION_MODE=true
STRICT_MODE=true
```

**Save:** `Ctrl+X` → `Y` → `Enter`

---

## 🔧 Step 3: Create Service .env Files (1 minute)

### Auth Service:
```bash
cd microservices/auth-service
nano .env
```

Paste:
```bash
PORT=3001
SERVICE_NAME=auth-service
DB_NAME=auth-db
```

Save: `Ctrl+X` → `Y` → `Enter`

### HR Service:
```bash
cd ../hr-service
nano .env
```

Paste:
```bash
PORT=3002
SERVICE_NAME=hr-service
DB_NAME=hr-db
```

Save: `Ctrl+X` → `Y` → `Enter`

---

## ✅ Step 4: Verify Setup (1 minute)

```bash
cd /Users/rudrakshsingh/Desktop/lenstracksmarthrms

# Check root .env exists
ls -la .env

# Check it has MONGO_URI
grep MONGO_URI .env

# Check JWT_SECRET
grep JWT_SECRET .env

# Check service .env files
ls -la microservices/auth-service/.env
ls -la microservices/hr-service/.env
```

**Expected:** All files should exist and show content.

---

## 🧪 Step 5: Test It! (1 minute)

```bash
# Start HR service
cd microservices/hr-service
npm start
```

**Look for this output:**
```
✅ Loaded root .env from: /Users/.../lenstracksmarthrms/.env
✅ Loaded service .env from: /Users/.../hr-service/.env
📂 Environment Configuration:
  Service Name: hr-service
  Port: 3002
  Database: hr-db
  Mongo URI: ✅ Set  ← Must be "Set" not "Missing"!
  JWT Secret: ✅ Set  ← Must be "Set" not "Missing"!
  NODE_ENV: production
```

**If you see `❌ Missing`:**
- That variable is not in root `.env`
- Go back to Step 2 and check

**If everything shows `✅ Set`:**
- 🎉 **SUCCESS!** Environment is configured correctly!

---

## 🚀 Deploy to Production

### Option A: Push to Git (Azure Pipeline Deploys Automatically)

```bash
git add .
git commit -m "fix: Configure production environment variables"
git push origin main
```

Azure Pipeline will:
1. Build Docker images
2. Push to ACR
3. Deploy to AKS
4. Use Kubernetes Secrets (not .env files)

### Option B: Update Kubernetes Secrets Directly

```bash
# Get values from your .env
MONGO_URI=$(grep MONGO_URI .env | cut -d '=' -f2)
JWT_SECRET=$(grep JWT_SECRET .env | cut -d '=' -f2)
JWT_REFRESH_SECRET=$(grep JWT_REFRESH_SECRET .env | cut -d '=' -f2)

# Update Kubernetes secret
kubectl create secret generic etelios-secrets \
  --from-literal=MONGO_URI="$MONGO_URI" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
  --namespace=etelios-backend-prod \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart services to pick up new secrets
kubectl rollout restart deployment/auth-service -n etelios-backend-prod
kubectl rollout restart deployment/hr-service -n etelios-backend-prod
```

---

## 📋 Checklist - Before Going Live

- [ ] Root `.env` created with all values filled
- [ ] JWT secrets generated (NOT default placeholders)
- [ ] Cosmos DB connection string added
- [ ] Redis password added
- [ ] Storage account key added
- [ ] App Insights key added
- [ ] Auth service `.env` created
- [ ] HR service `.env` created
- [ ] Local test successful (shows "✅ Set")
- [ ] Kubernetes secrets updated (for production)
- [ ] Services restarted/redeployed
- [ ] Employee creation tested and working

---

## 🆘 Troubleshooting

### Problem: "❌ Missing" for Mongo URI

**Solution:**
```bash
# Check root .env has MONGO_URI
grep MONGO_URI .env

# If empty, add it:
echo 'MONGO_URI=mongodb://...' >> .env
```

### Problem: "❌ Missing" for JWT Secret

**Solution:**
```bash
# Generate new secret
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
echo "JWT_SECRET=$JWT_SECRET" >> .env

JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET" >> .env
```

### Problem: Employee creation still failing (500 error)

**Solution:**
```bash
# 1. Verify MongoDB connection
curl -k https://98.70.245.87/api/hr/health

# 2. Check HR service logs
kubectl logs -f deployment/hr-service -n etelios-backend-prod

# 3. Look for:
#    "✅ MongoDB connected successfully"
#    "database: hr-db"
```

### Problem: Services not loading root .env

**Solution:**
```bash
# Verify fix is deployed
cd microservices/hr-service/src
head -30 server.js

# Should show:
#   dotenv.config({ path: '../../../.env' });
#   dotenv.config({ path: '../.env' });
```

---

## 🎯 Quick Commands Reference

```bash
# Generate secrets
./scripts/generate-env-secrets.sh

# Check root .env
cat .env | grep -E "MONGO_URI|JWT_SECRET"

# Check service .env
cat microservices/hr-service/.env

# Test locally
cd microservices/hr-service && npm start

# Push to production
git add . && git commit -m "fix: env config" && git push

# Update K8s secrets
kubectl edit secret etelios-secrets -n etelios-backend-prod

# Restart services
kubectl rollout restart deployment/hr-service -n etelios-backend-prod

# Check service logs
kubectl logs -f deployment/hr-service -n etelios-backend-prod | grep "Environment Configuration"
```

---

## ✅ Success Indicators

**You'll know everything is working when:**

1. ✅ Console shows "✅ Set" for all env vars
2. ✅ MongoDB connection successful
3. ✅ User registration works
4. ✅ Employee creation works (no 500 error)
5. ✅ GET `/api/hr/employees` returns data
6. ✅ Full onboarding flow completes

---

**Total Time:** ~5-10 minutes  
**Difficulty:** Easy (just copy-paste!)  
**Support:** See `ENV_FIX_SUMMARY.md` for detailed explanation

🚀 **Ready? Start with Step 1!**

