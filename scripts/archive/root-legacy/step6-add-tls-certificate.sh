#!/bin/bash

NAMESPACE="etelios-prod"

echo "=========================================="
echo "STEP 6: Add TLS Certificate for DocumentDB"
echo "=========================================="
echo ""

echo "DocumentDB requires TLS certificate for secure connections"
echo ""

# Download AWS RDS/DocumentDB certificate bundle
echo "1. Downloading AWS certificate bundle..."
if [ ! -f "rds-combined-ca-bundle.pem" ]; then
    curl -sS https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -o rds-combined-ca-bundle.pem
    echo "   ✅ Certificate downloaded"
else
    echo "   ✅ Certificate already exists"
fi
echo ""

# Create Kubernetes secret with certificate
echo "2. Creating Kubernetes secret with certificate..."
kubectl delete secret documentdb-ca-cert -n $NAMESPACE 2>/dev/null || true

kubectl create secret generic documentdb-ca-cert \
  --from-file=rds-combined-ca-bundle.pem=rds-combined-ca-bundle.pem \
  -n $NAMESPACE

echo "   ✅ Secret created"
echo ""

# Update deployments to mount certificate
echo "3. Updating deployments to mount certificate..."

for deployment in $(kubectl get deployments -n $NAMESPACE -o name | cut -d'/' -f2); do
    echo -n "   Updating $deployment... "
    
    # Patch to add volume and volumeMount
    kubectl patch deployment $deployment -n $NAMESPACE -p '{
      "spec": {
        "template": {
          "spec": {
            "volumes": [{
              "name": "documentdb-ca",
              "secret": {
                "secretName": "documentdb-ca-cert"
              }
            }],
            "containers": [{
              "name": "'$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].name}')'",
              "volumeMounts": [{
                "name": "documentdb-ca",
                "mountPath": "/app/certs",
                "readOnly": true
              }]
            }]
          }
        }
      }
    }' &>/dev/null && echo "✅" || echo "⚠️"
done

echo ""

# Update ConfigMap with certificate path
echo "4. Updating connection string to use certificate..."

# Load credentials
LATEST_DAY2=$(ls -t aws-resources-day2-*.txt 2>/dev/null | head -n 1)
DOCDB_ENDPOINT=$(grep "^DOCDB_ENDPOINT=" "$LATEST_DAY2" | cut -d'=' -f2)
DOCDB_USER=$(grep "^DOCDB_MASTER_USER=" "$LATEST_DAY2" | cut -d'=' -f2)
DOCDB_PASSWORD=$(grep "^DOCDB_MASTER_PASSWORD=" "$LATEST_DAY2" | cut -d'=' -f2)

# Connection string WITH certificate
MONGODB_URI="mongodb://${DOCDB_USER}:${DOCDB_PASSWORD}@${DOCDB_ENDPOINT}:27017/?tls=true&tlsCAFile=/app/certs/rds-combined-ca-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"

kubectl delete configmap etelios-config -n $NAMESPACE 2>/dev/null || true

kubectl create configmap etelios-config -n $NAMESPACE \
  --from-literal=MONGODB_URI="$MONGODB_URI" \
  --from-literal=MONGO_URI="$MONGODB_URI" \
  --from-literal=DB_NAME=etelios-db \
  --from-literal=NODE_ENV=production \
  --from-literal=STORAGE_PROVIDER=local \
  --from-literal=USE_KEY_VAULT=false \
  --from-literal=CORS_ORIGIN="*" \
  --from-literal=JWT_SECRET=etelios-jwt-secret \
  --from-literal=LOG_LEVEL=debug

echo "   ✅ ConfigMap updated with certificate path"
echo ""

echo "=========================================="
echo "STEP 6: COMPLETE ✅"
echo "=========================================="
echo ""
echo "TLS certificate configured for secure DocumentDB connections"
echo ""
echo "Next: ./step7-test-from-debug-pod.sh"
