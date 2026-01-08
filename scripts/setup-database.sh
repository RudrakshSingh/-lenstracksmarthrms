#!/bin/bash

# =====================================================================
# Database Setup Script - Production
# =====================================================================
# This script:
# 1. Gets Cosmos DB connection string from Azure
# 2. Generates JWT secrets
# 3. Updates Kubernetes secrets
# 4. Restarts services
# 5. Verifies connection
# =====================================================================

set -e  # Exit on error

echo "════════════════════════════════════════════════════════════"
echo "🗄️  Database Setup for LensTrack HRMS"
echo "════════════════════════════════════════════════════════════"
echo ""

# =====================================================================
# Configuration (Update these if needed)
# =====================================================================
RESOURCE_GROUP="${RESOURCE_GROUP:-etelios-resources}"
COSMOS_NAME="${COSMOS_NAME:-etelios-mongo-db}"
NAMESPACE="${NAMESPACE:-etelios-backend-prod}"
SECRET_NAME="${SECRET_NAME:-etelios-secrets}"

echo "📋 Configuration:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Cosmos DB: $COSMOS_NAME"
echo "  Namespace: $NAMESPACE"
echo "  Secret Name: $SECRET_NAME"
echo ""

# =====================================================================
# Step 1: Check prerequisites
# =====================================================================
echo "🔍 Step 1: Checking prerequisites..."

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
  echo "❌ Azure CLI is not installed."
  echo "   Install: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
  exit 1
fi
echo "  ✅ Azure CLI installed"

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
  echo "❌ kubectl is not installed."
  echo "   Install: https://kubernetes.io/docs/tasks/tools/"
  exit 1
fi
echo "  ✅ kubectl installed"

# Check if openssl is installed
if ! command -v openssl &> /dev/null; then
  echo "❌ openssl is not installed."
  exit 1
fi
echo "  ✅ openssl installed"

# Check if jq is installed (optional but helpful)
if ! command -v jq &> /dev/null; then
  echo "  ⚠️  jq not installed (optional, but recommended for JSON parsing)"
fi

# Check Azure login status
echo "  Checking Azure login..."
if ! az account show &> /dev/null; then
  echo "❌ Not logged in to Azure."
  echo "   Please run: az login"
  exit 1
fi
SUBSCRIPTION=$(az account show --query name -o tsv)
echo "  ✅ Logged in to Azure (Subscription: $SUBSCRIPTION)"

# Check kubectl connection
echo "  Checking Kubernetes connection..."
if ! kubectl cluster-info &> /dev/null; then
  echo "❌ Cannot connect to Kubernetes cluster."
  echo "   Please run: az aks get-credentials --resource-group $RESOURCE_GROUP --name <cluster-name>"
  exit 1
fi
CLUSTER=$(kubectl config current-context)
echo "  ✅ Connected to Kubernetes ($CLUSTER)"

echo ""

# =====================================================================
# Step 2: Get Cosmos DB connection string
# =====================================================================
echo "📋 Step 2: Getting Cosmos DB connection string..."

CONNECTION_STRING=$(az cosmosdb keys list \
  --name $COSMOS_NAME \
  --resource-group $RESOURCE_GROUP \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" \
  -o tsv 2>/dev/null)

if [ -z "$CONNECTION_STRING" ]; then
  echo "❌ Failed to get connection string."
  echo ""
  echo "Troubleshooting:"
  echo "  1. Verify Cosmos DB exists:"
  echo "     az cosmosdb list --resource-group $RESOURCE_GROUP -o table"
  echo ""
  echo "  2. List all Cosmos DB accounts:"
  echo "     az cosmosdb list -o table"
  echo ""
  echo "  3. List resource groups:"
  echo "     az group list -o table"
  echo ""
  exit 1
fi

# Mask the key for display
MASKED_STRING=$(echo "$CONNECTION_STRING" | sed 's/:[^@]*@/:****@/')
echo "  ✅ Connection string retrieved!"
echo "  Connection: $MASKED_STRING"
echo ""

# =====================================================================
# Step 3: Generate JWT secrets
# =====================================================================
echo "🔐 Step 3: Generating JWT secrets..."

JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')

if [ -z "$JWT_SECRET" ] || [ -z "$JWT_REFRESH_SECRET" ]; then
  echo "❌ Failed to generate JWT secrets."
  exit 1
fi

echo "  ✅ JWT secrets generated! (${#JWT_SECRET} chars)"
echo ""

# =====================================================================
# Step 4: Check if namespace exists
# =====================================================================
echo "☸️  Step 4: Checking Kubernetes namespace..."

if ! kubectl get namespace $NAMESPACE &> /dev/null; then
  echo "  ⚠️  Namespace $NAMESPACE does not exist. Creating..."
  kubectl create namespace $NAMESPACE
  echo "  ✅ Namespace created!"
else
  echo "  ✅ Namespace exists"
fi
echo ""

# =====================================================================
# Step 5: Update Kubernetes secret
# =====================================================================
echo "🔑 Step 5: Updating Kubernetes secret..."

# Check if secret exists
SECRET_EXISTS=$(kubectl get secret $SECRET_NAME -n $NAMESPACE --ignore-not-found -o name)

if [ -n "$SECRET_EXISTS" ]; then
  echo "  Secret already exists. Updating..."
else
  echo "  Creating new secret..."
fi

kubectl create secret generic $SECRET_NAME \
  --from-literal=MONGO_URI="$CONNECTION_STRING" \
  --from-literal=MONGODB_URI="$CONNECTION_STRING" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
  --from-literal=JWT_EXPIRES_IN="1h" \
  --from-literal=JWT_REFRESH_EXPIRES_IN="7d" \
  --namespace=$NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

if [ $? -eq 0 ]; then
  echo "  ✅ Kubernetes secret updated!"
else
  echo "❌ Failed to update Kubernetes secret."
  exit 1
fi
echo ""

# =====================================================================
# Step 6: Verify secret was created
# =====================================================================
echo "🔍 Step 6: Verifying secret..."

STORED_URI=$(kubectl get secret $SECRET_NAME -n $NAMESPACE -o jsonpath='{.data.MONGO_URI}' 2>/dev/null | base64 -d)

if [ -n "$STORED_URI" ]; then
  MASKED_STORED=$(echo "$STORED_URI" | sed 's/:[^@]*@/:****@/')
  echo "  ✅ Secret verified!"
  echo "  Stored: $MASKED_STORED"
else
  echo "❌ Secret verification failed!"
  exit 1
fi
echo ""

# =====================================================================
# Step 7: Restart services
# =====================================================================
echo "🔄 Step 7: Restarting services..."

# Get list of deployments
DEPLOYMENTS=$(kubectl get deployments -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}')

if [ -z "$DEPLOYMENTS" ]; then
  echo "  ⚠️  No deployments found in namespace $NAMESPACE"
  echo "  Skipping service restart."
else
  echo "  Found deployments: $DEPLOYMENTS"
  
  for deployment in $DEPLOYMENTS; do
    echo "  Restarting $deployment..."
    kubectl rollout restart deployment/$deployment -n $NAMESPACE
  done
  
  echo "  ✅ All services restart initiated!"
fi
echo ""

# =====================================================================
# Step 8: Wait for services to be ready
# =====================================================================
echo "⏳ Step 8: Waiting for services to be ready..."
echo "  (This may take 1-2 minutes...)"

# Wait for hr-service specifically (or first deployment found)
WAIT_FOR_SERVICE="hr-service"
if [ -z "$(echo $DEPLOYMENTS | grep hr-service)" ]; then
  WAIT_FOR_SERVICE=$(echo $DEPLOYMENTS | awk '{print $1}')
fi

if [ -n "$WAIT_FOR_SERVICE" ]; then
  kubectl wait --for=condition=ready pod \
    -l app=$WAIT_FOR_SERVICE \
    -n $NAMESPACE \
    --timeout=120s 2>/dev/null
  
  if [ $? -eq 0 ]; then
    echo "  ✅ Services are ready!"
  else
    echo "  ⚠️  Services taking longer than expected to start."
    echo "  Check logs with: kubectl logs -f deployment/$WAIT_FOR_SERVICE -n $NAMESPACE"
  fi
else
  echo "  ⚠️  No services to wait for."
fi
echo ""

# =====================================================================
# Step 9: Verify database connection
# =====================================================================
echo "🔍 Step 9: Verifying database connection..."
echo "  (Waiting 10 seconds for services to initialize...)"
sleep 10

# Try to find auth-service or hr-service logs
for service in auth-service hr-service; do
  if kubectl get deployment $service -n $NAMESPACE &> /dev/null; then
    echo "  Checking $service logs..."
    LOGS=$(kubectl logs deployment/$service -n $NAMESPACE --tail=100 2>/dev/null | grep -i "mongodb connected")
    
    if [ -n "$LOGS" ]; then
      echo "  ✅ $service: Database connection verified!"
      echo "     $LOGS"
    else
      echo "  ⚠️  $service: Could not verify connection in logs (service may still be starting)"
    fi
  fi
done
echo ""

# =====================================================================
# Step 10: Display current pod status
# =====================================================================
echo "📊 Step 10: Current pod status..."
kubectl get pods -n $NAMESPACE
echo ""

# =====================================================================
# Summary
# =====================================================================
echo "════════════════════════════════════════════════════════════"
echo "🎉 Setup Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "✅ What was done:"
echo "  1. Retrieved Cosmos DB connection string"
echo "  2. Generated JWT secrets"
echo "  3. Updated Kubernetes secret: $SECRET_NAME"
echo "  4. Restarted all services in namespace: $NAMESPACE"
echo "  5. Verified database connection"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Check service logs:"
echo "   kubectl logs -f deployment/hr-service -n $NAMESPACE"
echo ""
echo "2. Test health endpoint:"
echo "   curl -k https://98.70.245.87/api/hr/health | jq"
echo ""
echo "3. Test login:"
echo "   curl -k -X POST https://98.70.245.87/api/auth/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"emailOrEmployeeId\":\"admin@etelios.com\",\"password\":\"Admin@123456\"}' | jq"
echo ""
echo "4. View all pods:"
echo "   kubectl get pods -n $NAMESPACE"
echo ""
echo "5. If issues persist, check detailed logs:"
echo "   kubectl describe pod <pod-name> -n $NAMESPACE"
echo ""
echo "════════════════════════════════════════════════════════════"

