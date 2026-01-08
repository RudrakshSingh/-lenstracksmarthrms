# ⚡ Database Quick Fix - 2 Minutes

**Problem:** Database not configured - Services can't connect  
**Solution:** Run the automated setup script

---

## 🚀 Super Quick (One Command!)

```bash
cd /Users/rudrakshsingh/Desktop/lenstracksmarthrms

# Run automated setup script
./scripts/setup-database.sh

# That's it! ✅
```

**What it does:**
- ✅ Gets Cosmos DB connection string from Azure
- ✅ Generates JWT secrets
- ✅ Updates Kubernetes secrets  
- ✅ Restarts all services
- ✅ Verifies database connection

---

## 📋 Prerequisites (Do Once)

```bash
# 1. Login to Azure
az login

# 2. Connect to Kubernetes cluster
az aks get-credentials \
  --resource-group etelios-resources \
  --name etelios-aks-cluster

# Now run the setup script!
./scripts/setup-database.sh
```

---

## 🔍 Verify It Worked

```bash
# Check services are running
kubectl get pods -n etelios-backend-prod

# Should show all pods as "Running"

# Check hr-service logs
kubectl logs deployment/hr-service -n etelios-backend-prod | grep MongoDB

# Should show:
# ✅ MongoDB connected successfully
# Database: hr-db

# Test health endpoint
curl -k https://98.70.245.87/api/hr/health | jq

# Should return:
# {
#   "service": "hr-service",
#   "status": "healthy",
#   "database": "connected"  ← Important!
# }
```

---

## 🐛 If Script Fails

### Error: "Azure CLI not installed"
```bash
# macOS
brew install azure-cli

# Or download from:
# https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
```

### Error: "kubectl not installed"
```bash
# macOS
brew install kubectl

# Or download from:
# https://kubernetes.io/docs/tasks/tools/
```

### Error: "Not logged in to Azure"
```bash
az login

# Then run script again
./scripts/setup-database.sh
```

### Error: "Cannot connect to Kubernetes"
```bash
# Get cluster credentials
az aks get-credentials \
  --resource-group etelios-resources \
  --name <your-cluster-name>

# List clusters if you forgot the name
az aks list -o table
```

### Error: "Cosmos DB not found"
```bash
# List all Cosmos DB accounts
az cosmosdb list -o table

# Note the name and update script:
export COSMOS_NAME="your-cosmos-db-name"
./scripts/setup-database.sh
```

---

## 🎯 Manual Method (If Script Doesn't Work)

### Step 1: Get Connection String
```bash
az cosmosdb keys list \
  --name etelios-mongo-db \
  --resource-group etelios-resources \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" \
  -o tsv

# Copy the output
```

### Step 2: Update Kubernetes Secret
```bash
# Paste the connection string from Step 1
MONGO_URI="mongodb://etelios-mongo-db:YOUR_KEY@etelios-mongo-db.mongo.cosmos.azure.com:10255/..."

# Generate JWT secrets
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')

# Create/update secret
kubectl create secret generic etelios-secrets \
  --from-literal=MONGO_URI="$MONGO_URI" \
  --from-literal=MONGODB_URI="$MONGO_URI" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
  --namespace=etelios-backend-prod \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Step 3: Restart Services
```bash
kubectl rollout restart deployment -n etelios-backend-prod

# Wait for ready
kubectl wait --for=condition=ready pod \
  -l app=hr-service \
  -n etelios-backend-prod \
  --timeout=120s
```

---

## 📝 Local Development Setup

```bash
cd /Users/rudrakshsingh/Desktop/lenstracksmarthrms

# Create root .env (paste your actual connection string)
cat > .env << 'EOF'
MONGO_URI=mongodb://etelios-mongo-db:YOUR_KEY@etelios-mongo-db.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@etelios-mongo-db@
JWT_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)
NODE_ENV=development
EOF

# Create service .env files
echo "PORT=3001
SERVICE_NAME=auth-service
DB_NAME=auth-db" > microservices/auth-service/.env

echo "PORT=3002
SERVICE_NAME=hr-service
DB_NAME=hr-db" > microservices/hr-service/.env

# Test locally
cd microservices/hr-service
npm start

# Should show:
# ✅ Loaded root .env
# ✅ Loaded service .env
# ✅ MongoDB connected successfully
```

---

## ✅ Success Checklist

After running setup script:

- [ ] Script completed without errors
- [ ] All pods show status: `Running`
- [ ] Logs show: `MongoDB connected successfully`
- [ ] Health check returns: `"database": "connected"`
- [ ] Login API returns token (not 401/500)
- [ ] Employee creation works (not 500)

---

## 📞 Quick Commands

```bash
# Run setup
./scripts/setup-database.sh

# Check pods
kubectl get pods -n etelios-backend-prod

# Check logs
kubectl logs -f deployment/hr-service -n etelios-backend-prod

# Check secret
kubectl get secret etelios-secrets -n etelios-backend-prod -o jsonpath='{.data.MONGO_URI}' | base64 -d

# Restart services
kubectl rollout restart deployment -n etelios-backend-prod

# Test health
curl -k https://98.70.245.87/api/hr/health | jq

# Test login
curl -k -X POST https://98.70.245.87/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"emailOrEmployeeId":"admin@etelios.com","password":"Admin@123456"}' | jq
```

---

## 🎉 All Done!

**After setup:**
1. ✅ Database connected
2. ✅ Services running
3. ✅ APIs working
4. ✅ Employee creation fixed

**Now you can:**
- Create employees
- Login users
- Run full onboarding flow
- Deploy updates

---

**Time:** 2-5 minutes  
**Difficulty:** Easy (automated script)  
**Status:** Ready to run!

Run: `./scripts/setup-database.sh` 🚀

