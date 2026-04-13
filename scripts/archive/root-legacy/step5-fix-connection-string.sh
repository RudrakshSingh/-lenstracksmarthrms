#!/bin/bash

NAMESPACE="etelios-prod"
REGION="ap-south-1"

echo "=========================================="
echo "STEP 5: Fix Connection String Format"
echo "=========================================="
echo ""

# Load DocumentDB credentials
LATEST_DAY2=$(ls -t aws-resources-day2-*.txt 2>/dev/null | head -n 1)
DOCDB_ENDPOINT=$(grep "^DOCDB_ENDPOINT=" "$LATEST_DAY2" | cut -d'=' -f2)
DOCDB_USER=$(grep "^DOCDB_MASTER_USER=" "$LATEST_DAY2" | cut -d'=' -f2)
DOCDB_PASSWORD=$(grep "^DOCDB_MASTER_PASSWORD=" "$LATEST_DAY2" | cut -d'=' -f2)

echo "DocumentDB Credentials:"
echo "  Endpoint: $DOCDB_ENDPOINT"
echo "  User: $DOCDB_USER"
echo "  Password: ${DOCDB_PASSWORD:0:10}..."
echo ""

# Build proper connection string
# DocumentDB format: mongodb://user:pass@host:port/db?options
MONGODB_URI="mongodb://${DOCDB_USER}:${DOCDB_PASSWORD}@${DOCDB_ENDPOINT}:27017/?tls=true&tlsAllowInvalidCertificates=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"

echo "✅ Connection string built:"
echo "   mongodb://${DOCDB_USER}:***@${DOCDB_ENDPOINT}:27017/?tls=true&..."
echo ""

# Update ConfigMap
echo "Updating ConfigMap..."
kubectl delete configmap etelios-config -n $NAMESPACE 2>/dev/null || true

kubectl create configmap etelios-config -n $NAMESPACE \
  --from-literal=NODE_ENV=production \
  --from-literal=MONGODB_URI="$MONGODB_URI" \
  --from-literal=MONGO_URI="$MONGODB_URI" \
  --from-literal=DB_NAME=etelios-db \
  --from-literal=STORAGE_PROVIDER=local \
  --from-literal=USE_KEY_VAULT=false \
  --from-literal=CORS_ORIGIN="*" \
  --from-literal=JWT_SECRET=etelios-jwt-secret-key \
  --from-literal=LOG_LEVEL=debug

echo "✅ ConfigMap updated"
echo ""

# Verify
STORED_URI=$(kubectl get configmap etelios-config -n $NAMESPACE -o jsonpath='{.data.MONGODB_URI}' | head -c 50)
echo "Verification:"
echo "  Stored URI (first 50 chars): $STORED_URI..."

if [[ "$STORED_URI" == mongodb://* ]]; then
    echo "  ✅ Format correct!"
else
    echo "  ❌ Format wrong!"
    exit 1
fi

echo ""
echo "=========================================="
echo "STEP 5: COMPLETE ✅"
echo "=========================================="
echo ""
echo "Connection string properly formatted and stored"
echo ""
echo "Next: ./step6-add-tls-certificate.sh"
