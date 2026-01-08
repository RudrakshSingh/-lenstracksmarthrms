# 🗄️ Database Setup Guide - Production Ready

**Issue:** Database not configured - Placeholder keys in use  
**Solution:** Get real credentials from Azure and update Kubernetes secrets

---

## 🎯 Quick Fix (2 Minutes)

### Step 1: Get Cosmos DB Connection String from Azure

```bash
# Login to Azure
az login

# Get Cosmos DB connection string (replace with your actual Cosmos DB name)
az cosmosdb keys list \
  --name etelios-mongo-db \
  --resource-group etelios-resources \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" \
  -o tsv

# Copy the output - this is your MONGO_URI
```

**Expected Output:**
```
mongodb://etelios-mongo-db:Abc123XyzLongKeyHere==@etelios-mongo-db.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@etelios-mongo-db@
```

### Step 2: Update Kubernetes Secret

```bash
# Set the connection string (replace with actual value from Step 1)
MONGO_URI="mongodb://etelios-mongo-db:YOUR_ACTUAL_KEY@etelios-mongo-db.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@etelios-mongo-db@"

# Update Kubernetes secret
kubectl create secret generic etelios-secrets \
  --from-literal=MONGO_URI="$MONGO_URI" \
  --from-literal=MONGODB_URI="$MONGO_URI" \
  --namespace=etelios-backend-prod \
  --dry-run=client -o yaml | kubectl apply -f -

echo "✅ Database secret updated!"
```

### Step 3: Restart Services

```bash
# Restart all services to pick up new secret
kubectl rollout restart deployment/auth-service -n etelios-backend-prod
kubectl rollout restart deployment/hr-service -n etelios-backend-prod

# Wait for pods to be ready
kubectl wait --for=condition=ready pod \
  -l app=hr-service \
  -n etelios-backend-prod \
  --timeout=60s

echo "✅ Services restarted!"
```

### Step 4: Verify Connection

```bash
# Check HR service logs
kubectl logs -f deployment/hr-service -n etelios-backend-prod | grep -i "mongodb"

# Should show:
# ✅ MongoDB connected successfully
# Database: hr-db
```

---

## 📋 Detailed Setup (If Quick Fix Doesn't Work)

### Option 1: Using Azure Portal (GUI)

#### Get Cosmos DB Connection String:

1. Open **Azure Portal** (https://portal.azure.com)
2. Navigate to **Cosmos DB** → `etelios-mongo-db` (or your Cosmos DB name)
3. Click **Connection String** (left sidebar)
4. Copy **Primary Connection String**
5. Should look like:
   ```
   mongodb://etelios-mongo-db:ABC123...==@etelios-mongo-db.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@etelios-mongo-db@
   ```

#### Update Kubernetes Secret:

1. Go to **Azure Kubernetes Service** → Your cluster
2. Click **Workloads** → **Secrets**
3. Find `etelios-secrets` in `etelios-backend-prod` namespace
4. Edit and add/update:
   - `MONGO_URI` = (paste connection string)
   - `MONGODB_URI` = (paste same connection string)
5. Save

#### Restart Services:

1. Go to **Workloads** → **Deployments**
2. Find `auth-service` → Click **Restart**
3. Find `hr-service` → Click **Restart**
4. Wait for pods to turn green

---

### Option 2: Using Azure CLI (Command Line)

```bash
# 1. Login
az login

# 2. Get your Cosmos DB resource details
az cosmosdb list --query "[].{name:name, resourceGroup:resourceGroup}" -o table

# Example output:
# Name                 ResourceGroup
# -------------------  ---------------
# etelios-mongo-db     etelios-resources

# 3. Get connection string
RESOURCE_GROUP="etelios-resources"  # Replace with your resource group
COSMOS_NAME="etelios-mongo-db"      # Replace with your Cosmos DB name

CONNECTION_STRING=$(az cosmosdb keys list \
  --name $COSMOS_NAME \
  --resource-group $RESOURCE_GROUP \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" \
  -o tsv)

echo "📋 Connection String:"
echo "$CONNECTION_STRING"

# 4. Generate JWT secrets (if not already done)
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')

# 5. Update Kubernetes secret
kubectl create secret generic etelios-secrets \
  --from-literal=MONGO_URI="$CONNECTION_STRING" \
  --from-literal=MONGODB_URI="$CONNECTION_STRING" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
  --namespace=etelios-backend-prod \
  --dry-run=client -o yaml | kubectl apply -f -

echo "✅ Secrets updated successfully!"

# 6. Verify secret was created
kubectl get secret etelios-secrets -n etelios-backend-prod -o jsonpath='{.data.MONGO_URI}' | base64 -d
echo ""
echo "✅ Secret verified!"

# 7. Restart services
kubectl rollout restart deployment -n etelios-backend-prod

# 8. Watch deployment status
kubectl get pods -n etelios-backend-prod -w
```

---

## 🔍 Troubleshooting

### Issue 1: Cosmos DB Not Found

```bash
# List all Cosmos DB accounts
az cosmosdb list -o table

# If empty, create one:
az cosmosdb create \
  --name etelios-mongo-db \
  --resource-group etelios-resources \
  --kind MongoDB \
  --server-version 4.0 \
  --default-consistency-level Session \
  --enable-automatic-failover true \
  --locations regionName=eastus failoverPriority=0 isZoneRedundant=false
```

### Issue 2: Resource Group Not Found

```bash
# List resource groups
az group list -o table

# If doesn't exist, create one:
az group create \
  --name etelios-resources \
  --location eastus
```

### Issue 3: Kubernetes Cluster Not Found

```bash
# List AKS clusters
az aks list -o table

# Get credentials
az aks get-credentials \
  --resource-group etelios-resources \
  --name etelios-aks-cluster
```

### Issue 4: Namespace Not Found

```bash
# List namespaces
kubectl get namespaces

# Create namespace if missing
kubectl create namespace etelios-backend-prod
```

### Issue 5: Secret Not Updating

```bash
# Delete old secret
kubectl delete secret etelios-secrets -n etelios-backend-prod

# Create new secret
kubectl create secret generic etelios-secrets \
  --from-literal=MONGO_URI="$CONNECTION_STRING" \
  --from-literal=MONGODB_URI="$CONNECTION_STRING" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
  --namespace=etelios-backend-prod

# Restart deployments
kubectl rollout restart deployment -n etelios-backend-prod
```

---

## 🧪 Verify Database Connection

### Test 1: Check Pod Logs

```bash
# Check auth-service
kubectl logs deployment/auth-service -n etelios-backend-prod | grep -A 5 "MongoDB"

# Should show:
# ✅ auth-service: MongoDB connected successfully
# Database: auth-db
# Host: etelios-mongo-db.mongo.cosmos.azure.com

# Check hr-service
kubectl logs deployment/hr-service -n etelios-backend-prod | grep -A 5 "MongoDB"

# Should show:
# ✅ hr-service: MongoDB connected successfully
# Database: hr-db
# Host: etelios-mongo-db.mongo.cosmos.azure.com
```

### Test 2: Check Pod Status

```bash
# All pods should be Running and Ready
kubectl get pods -n etelios-backend-prod

# Expected:
# NAME                            READY   STATUS    RESTARTS   AGE
# auth-service-xxx                1/1     Running   0          2m
# hr-service-xxx                  1/1     Running   0          2m
```

### Test 3: Test API Endpoints

```bash
# Health check
curl -k https://98.70.245.87/api/hr/health | jq

# Should return:
# {
#   "service": "hr-service",
#   "status": "healthy",
#   "database": "connected"  ← Important!
# }

# Test login
curl -k -X POST "https://98.70.245.87/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"emailOrEmployeeId":"admin@etelios.com","password":"Admin@123456"}' | jq

# Should return token (not error)
```

---

## 📝 Local Development Setup

### Create `.env` File:

```bash
cd /Users/rudrakshsingh/Desktop/lenstracksmarthrms

# Create root .env (use your actual Cosmos DB connection string)
cat > .env << 'EOF'
# ===============================
# MongoDB Connection (Production)
# ===============================
MONGO_URI=mongodb://etelios-mongo-db:YOUR_ACTUAL_KEY@etelios-mongo-db.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@etelios-mongo-db@

# OR for Local Development:
# MONGO_URI=mongodb://localhost:27017/?retryWrites=false

# ===============================
# JWT Secrets (Generate with: openssl rand -base64 64)
# ===============================
JWT_SECRET=your_generated_jwt_secret_here
JWT_REFRESH_SECRET=your_generated_refresh_secret_here

# ===============================
# Environment
# ===============================
NODE_ENV=development
DEBUG=true
EOF

# Create service-specific .env files
echo "PORT=3001
SERVICE_NAME=auth-service
DB_NAME=auth-db" > microservices/auth-service/.env

echo "PORT=3002
SERVICE_NAME=hr-service
DB_NAME=hr-db" > microservices/hr-service/.env

echo "✅ .env files created!"
```

### Generate JWT Secrets:

```bash
# Run the secret generator script
chmod +x scripts/generate-env-secrets.sh
./scripts/generate-env-secrets.sh

# Copy the output and paste into .env file
```

### Test Locally:

```bash
# Start HR service
cd microservices/hr-service
npm start

# Check console for:
# ✅ Loaded root .env from: .../lenstracksmarthrms/.env
# ✅ Loaded service .env from: .../hr-service/.env
# 📂 Environment Configuration:
#   Mongo URI: ✅ Set
#   JWT Secret: ✅ Set
# ✅ MongoDB connected successfully
# Database: hr-db
```

---

## 🚀 Complete Setup Script (All-in-One)

Save this as `scripts/setup-database.sh`:

```bash
#!/bin/bash

echo "🗄️ Setting up Database Configuration..."
echo ""

# Step 1: Get Cosmos DB connection string
echo "📋 Step 1: Getting Cosmos DB connection string..."
RESOURCE_GROUP="etelios-resources"
COSMOS_NAME="etelios-mongo-db"

CONNECTION_STRING=$(az cosmosdb keys list \
  --name $COSMOS_NAME \
  --resource-group $RESOURCE_GROUP \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" \
  -o tsv 2>/dev/null)

if [ -z "$CONNECTION_STRING" ]; then
  echo "❌ Failed to get connection string."
  echo "Please verify:"
  echo "  - Azure CLI is installed and logged in (az login)"
  echo "  - Resource group exists: $RESOURCE_GROUP"
  echo "  - Cosmos DB exists: $COSMOS_NAME"
  exit 1
fi

echo "✅ Connection string retrieved!"
echo ""

# Step 2: Generate JWT secrets
echo "🔐 Step 2: Generating JWT secrets..."
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
echo "✅ JWT secrets generated!"
echo ""

# Step 3: Update Kubernetes secret
echo "☸️ Step 3: Updating Kubernetes secret..."
kubectl create secret generic etelios-secrets \
  --from-literal=MONGO_URI="$CONNECTION_STRING" \
  --from-literal=MONGODB_URI="$CONNECTION_STRING" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
  --namespace=etelios-backend-prod \
  --dry-run=client -o yaml | kubectl apply -f -

if [ $? -eq 0 ]; then
  echo "✅ Kubernetes secret updated!"
else
  echo "❌ Failed to update Kubernetes secret."
  exit 1
fi
echo ""

# Step 4: Restart services
echo "🔄 Step 4: Restarting services..."
kubectl rollout restart deployment/auth-service -n etelios-backend-prod
kubectl rollout restart deployment/hr-service -n etelios-backend-prod
echo "✅ Services restart initiated!"
echo ""

# Step 5: Wait for services to be ready
echo "⏳ Step 5: Waiting for services to be ready..."
kubectl wait --for=condition=ready pod \
  -l app=hr-service \
  -n etelios-backend-prod \
  --timeout=120s

if [ $? -eq 0 ]; then
  echo "✅ Services are ready!"
else
  echo "⚠️ Services taking longer than expected to start."
  echo "Check logs with: kubectl logs -f deployment/hr-service -n etelios-backend-prod"
fi
echo ""

# Step 6: Verify connection
echo "🔍 Step 6: Verifying database connection..."
sleep 5

kubectl logs deployment/hr-service -n etelios-backend-prod --tail=50 | grep -i "mongodb connected"

if [ $? -eq 0 ]; then
  echo "✅ Database connection verified!"
else
  echo "⚠️ Could not verify connection. Check logs manually."
fi
echo ""

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Test login: curl -k https://98.70.245.87/api/auth/login -X POST -H 'Content-Type: application/json' -d '{\"emailOrEmployeeId\":\"admin@etelios.com\",\"password\":\"Admin@123456\"}'"
echo "2. Check logs: kubectl logs -f deployment/hr-service -n etelios-backend-prod"
echo "3. View pods: kubectl get pods -n etelios-backend-prod"
```

Run it:
```bash
chmod +x scripts/setup-database.sh
./scripts/setup-database.sh
```

---

## ✅ Success Checklist

- [ ] Azure CLI installed and logged in
- [ ] Cosmos DB exists and accessible
- [ ] Connection string retrieved
- [ ] JWT secrets generated
- [ ] Kubernetes secret updated
- [ ] Services restarted
- [ ] Pods show "Running" status
- [ ] Logs show "MongoDB connected successfully"
- [ ] Health check returns "database: connected"
- [ ] Login API returns token (not error)

---

## 📞 Quick Commands Reference

```bash
# Get connection string
az cosmosdb keys list --name etelios-mongo-db --resource-group etelios-resources --type connection-strings --query "connectionStrings[0].connectionString" -o tsv

# Update secret
kubectl create secret generic etelios-secrets --from-literal=MONGO_URI="..." --namespace=etelios-backend-prod --dry-run=client -o yaml | kubectl apply -f -

# Restart services
kubectl rollout restart deployment -n etelios-backend-prod

# Check logs
kubectl logs -f deployment/hr-service -n etelios-backend-prod | grep -i mongodb

# Check pods
kubectl get pods -n etelios-backend-prod

# Test health
curl -k https://98.70.245.87/api/hr/health | jq
```

---

**Status:** Ready to setup!  
**Time:** ~5-10 minutes  
**Difficulty:** Medium (requires Azure access)

