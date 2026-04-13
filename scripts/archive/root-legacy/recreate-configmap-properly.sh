#!/bin/bash

set -e

NAMESPACE="etelios-prod"
REGION="ap-south-1"

echo "=========================================="
echo "Recreate ConfigMap with Proper Format"
echo "=========================================="
echo ""

# Load DocumentDB credentials
LATEST_DAY2=$(ls -t aws-resources-day2-*.txt 2>/dev/null | head -n 1)
if [ -f "$LATEST_DAY2" ]; then
    DOCDB_ENDPOINT=$(grep "^DOCDB_ENDPOINT=" "$LATEST_DAY2" | cut -d'=' -f2)
    DOCDB_USER=$(grep "^DOCDB_MASTER_USER=" "$LATEST_DAY2" | cut -d'=' -f2)
    DOCDB_PASSWORD=$(grep "^DOCDB_MASTER_PASSWORD=" "$LATEST_DAY2" | cut -d'=' -f2)
fi

echo "DocumentDB:"
echo "  Endpoint: $DOCDB_ENDPOINT"
echo "  User: $DOCDB_USER"
echo ""

# Build proper MongoDB connection string
MONGODB_URI="mongodb://${DOCDB_USER}:${DOCDB_PASSWORD}@${DOCDB_ENDPOINT}:27017/?tls=true&tlsAllowInvalidCertificates=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"

echo "✅ Connection string created (proper format)"
echo ""

# Delete old ConfigMap
echo "Deleting old ConfigMap..."
kubectl delete configmap etelios-config -n $NAMESPACE 2>/dev/null || echo "No old ConfigMap"

# Create new ConfigMap with proper format
echo "Creating new ConfigMap..."

kubectl create configmap etelios-config -n $NAMESPACE \
  --from-literal=NODE_ENV=production \
  --from-literal=MONGODB_URI="$MONGODB_URI" \
  --from-literal=MONGO_URI="$MONGODB_URI" \
  --from-literal=DB_NAME=etelios-db \
  --from-literal=MONGO_DB_NAME=etelios-db \
  --from-literal=STORAGE_PROVIDER=local \
  --from-literal=USE_KEY_VAULT=false \
  --from-literal=CORS_ORIGIN="*" \
  --from-literal=LOG_LEVEL=info \
  --from-literal=AWS_REGION=$REGION \
  --from-literal=JWT_SECRET=etelios-super-secret-jwt-key-change-in-production \
  --from-literal=JWT_EXPIRATION=24h \
  --from-literal=REFRESH_TOKEN_EXPIRATION=7d

echo "✅ ConfigMap created"
echo ""

# Verify ConfigMap
echo "Verifying ConfigMap..."
STORED_URI=$(kubectl get configmap etelios-config -n $NAMESPACE -o jsonpath='{.data.MONGODB_URI}' 2>/dev/null | head -c 50)
echo "  MONGODB_URI (first 50 chars): $STORED_URI..."

if [[ "$STORED_URI" == mongodb://* ]]; then
    echo "  ✅ URI format correct!"
else
    echo "  ❌ URI format wrong!"
    exit 1
fi

echo ""

# Delete all pods to pick up new ConfigMap
echo "Restarting all pods..."
kubectl delete pods --all -n $NAMESPACE --grace-period=0 --force &>/dev/null || true

echo "✅ Pods deleted"
echo ""

echo "Waiting 2 minutes for pods to start..."
sleep 120

# Check status
READY=$(kubectl get pods -n $NAMESPACE -o jsonpath='{range .items[*]}{.status.containerStatuses[0].ready}{"\n"}{end}' 2>/dev/null | grep -c "true" || echo "0")
TOTAL=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "=========================================="
echo "FINAL STATUS"
echo "=========================================="
echo "  Pods Ready: $READY / $TOTAL"
echo ""

if [ "$READY" -ge 15 ]; then
    echo "✅ SUCCESS! Services are now running!"
    echo ""
    echo "Test:"
    echo "  curl http://a0adb495fa82c42bfafa50a3552b78dd-1883230600.ap-south-1.elb.amazonaws.com/health"
else
    echo "⚠️  Still initializing. Check logs:"
    SAMPLE_POD=$(kubectl get pods -n $NAMESPACE -o name | head -n 1 | cut -d'/' -f2)
    echo "  kubectl logs -n $NAMESPACE $SAMPLE_POD"
fi

echo ""
