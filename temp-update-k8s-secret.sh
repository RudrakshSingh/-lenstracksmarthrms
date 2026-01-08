#!/bin/bash

echo "🔐 Updating Kubernetes Secret with actual MongoDB URI..."
echo ""

# Set variables
NAMESPACE="etelios-backend-prod"
SECRET_NAME="etelios-secrets"
MONGO_URI="mongodb://etelios-mongo-db:h4cmg34pAbKZxyZRqwqxa2PhWoZ9ux5quvBZh2EqhSIaGrPMAaF8btIdgoMawHILafZBw8YgsddlACDbbpOoJQ==@etelios-mongo-db.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@etelios-mongo-db@"

# Generate JWT secrets (strong ones)
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')

echo "📋 Configuration:"
echo "  Namespace: $NAMESPACE"
echo "  Secret: $SECRET_NAME"
echo "  MongoDB: etelios-mongo-db.mongo.cosmos.azure.com"
echo "  JWT Secret Length: ${#JWT_SECRET} chars"
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install kubectl first."
    exit 1
fi

# Check if connected to cluster
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Not connected to Kubernetes cluster."
    echo "Run: az aks get-credentials --resource-group etelios-resources --name etelios-aks-cluster"
    exit 1
fi

echo "✅ Connected to cluster: $(kubectl config current-context)"
echo ""

# Update/Create secret
echo "🔄 Updating Kubernetes secret..."
kubectl create secret generic $SECRET_NAME \
  --from-literal=MONGO_URI="$MONGO_URI" \
  --from-literal=MONGODB_URI="$MONGO_URI" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
  --from-literal=JWT_EXPIRES_IN="1h" \
  --from-literal=JWT_REFRESH_EXPIRES_IN="7d" \
  --from-literal=NODE_ENV="production" \
  --namespace=$NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

if [ $? -eq 0 ]; then
  echo "✅ Secret updated successfully!"
else
  echo "❌ Failed to update secret."
  exit 1
fi
echo ""

# Verify secret
echo "🔍 Verifying secret..."
STORED_URI=$(kubectl get secret $SECRET_NAME -n $NAMESPACE -o jsonpath='{.data.MONGO_URI}' 2>/dev/null | base64 -d)
if [ -n "$STORED_URI" ]; then
  MASKED=$(echo "$STORED_URI" | sed 's/:[^@]*@/:****@/')
  echo "✅ Secret verified: $MASKED"
else
  echo "❌ Secret verification failed!"
  exit 1
fi
echo ""

# Restart services
echo "🔄 Restarting services to pick up new configuration..."
kubectl rollout restart deployment/auth-service -n $NAMESPACE
kubectl rollout restart deployment/hr-service -n $NAMESPACE
echo "✅ Services restart initiated!"
echo ""

# Wait for services
echo "⏳ Waiting for services to be ready (max 2 minutes)..."
kubectl wait --for=condition=ready pod \
  -l app=hr-service \
  -n $NAMESPACE \
  --timeout=120s 2>/dev/null

if [ $? -eq 0 ]; then
  echo "✅ Services are ready!"
else
  echo "⚠️  Services taking longer than expected."
  echo "Check status: kubectl get pods -n $NAMESPACE"
fi
echo ""

echo "🎉 Kubernetes secret updated successfully!"
echo ""
echo "Next steps:"
echo "1. Check logs: kubectl logs -f deployment/hr-service -n $NAMESPACE"
echo "2. Test health: curl -k https://98.70.245.87/api/hr/health | jq"
echo "3. Test login: curl -k -X POST https://98.70.245.87/api/auth/login -H 'Content-Type: application/json' -d '{\"emailOrEmployeeId\":\"admin@etelios.com\",\"password\":\"Admin@123456\"}' | jq"
