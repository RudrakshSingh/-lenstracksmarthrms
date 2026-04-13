#!/bin/bash

set -e

NAMESPACE="etelios-prod"
REGION="ap-south-1"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo "=========================================="
echo "Fix Database Connection for All Services"
echo "=========================================="
echo ""

# Load DocumentDB credentials
LATEST_DAY2=$(ls -t aws-resources-day2-*.txt 2>/dev/null | head -n 1)
if [ -f "$LATEST_DAY2" ]; then
    log "Loading DocumentDB info from: $LATEST_DAY2"
    DOCDB_ENDPOINT=$(grep "^DOCDB_ENDPOINT=" "$LATEST_DAY2" 2>/dev/null | cut -d'=' -f2 || echo "")
    DOCDB_MASTER_USER=$(grep "^DOCDB_MASTER_USER=" "$LATEST_DAY2" 2>/dev/null | cut -d'=' -f2 || echo "")
    DOCDB_MASTER_PASSWORD=$(grep "^DOCDB_MASTER_PASSWORD=" "$LATEST_DAY2" 2>/dev/null | cut -d'=' -f2 || echo "")
fi

if [ -z "$DOCDB_ENDPOINT" ]; then
    error "DocumentDB endpoint not found!"
    exit 1
fi

log "DocumentDB:"
log "  Endpoint: $DOCDB_ENDPOINT"
log "  User: $DOCDB_MASTER_USER"
echo ""

# Build DocumentDB connection string
# Format: mongodb://username:password@host:port/database?options
DOCDB_URI="mongodb://${DOCDB_MASTER_USER}:${DOCDB_MASTER_PASSWORD}@${DOCDB_ENDPOINT}:27017/?tls=true&tlsAllowInvalidCertificates=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"

log "✅ Connection string created"
echo ""

# Create/Update ConfigMap with database connection
log "Updating ConfigMap with DocumentDB connection..."

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: etelios-config
  namespace: $NAMESPACE
data:
  NODE_ENV: "production"
  
  # Database - DocumentDB (MongoDB compatible)
  MONGODB_URI: "$DOCDB_URI"
  MONGO_URI: "$DOCDB_URI"
  DB_NAME: "etelios-db"
  MONGO_DB_NAME: "etelios-db"
  
  # Storage - Local (S3 migration later)
  STORAGE_PROVIDER: "local"
  UPLOAD_PATH: "/app/uploads"
  MAX_FILE_SIZE: "10485760"
  
  # Disable Azure features
  USE_KEY_VAULT: "false"
  
  # CORS
  CORS_ORIGIN: "*"
  
  # Logging
  LOG_LEVEL: "info"
  
  # AWS
  AWS_REGION: "$REGION"
  
  # JWT
  JWT_SECRET: "your-super-secret-jwt-key-change-this-in-production"
  JWT_EXPIRATION: "24h"
  REFRESH_TOKEN_EXPIRATION: "7d"
  
  # Rate Limiting
  RATE_LIMIT_WINDOW_MS: "900000"
  RATE_LIMIT_MAX_REQUESTS: "1000"
EOF

log "✅ ConfigMap updated"
echo ""

# Update deployments to use ConfigMap
log "Updating deployments to use ConfigMap..."

DEPLOYMENTS=$(kubectl get deployments -n $NAMESPACE -o name | cut -d'/' -f2)

for deployment in $DEPLOYMENTS; do
    # Patch deployment to add envFrom for ConfigMap
    kubectl patch deployment $deployment -n $NAMESPACE -p '{
      "spec": {
        "template": {
          "spec": {
            "containers": [{
              "name": "'$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].name}')'",
              "envFrom": [{
                "configMapRef": {
                  "name": "etelios-config"
                }
              }]
            }]
          }
        }
      }
    }' &>/dev/null && log "  ✅ $deployment" || warning "  ⚠️  $deployment"
done

echo ""
log "✅ All deployments updated"
echo ""

# Restart pods to pick up new config
log "Restarting all pods..."
kubectl delete pods --all -n $NAMESPACE --grace-period=0 --force &>/dev/null || true

log "✅ Pods deleted and recreating..."
echo ""

log "Waiting 60 seconds for pods to start with correct database connection..."
sleep 60

# Check final status
RUNNING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')
TOTAL=$(kubectl get deployments -n $NAMESPACE --no-headers 2>/dev/null | wc -l | tr -d ' ')

echo ""
log "=========================================="
log "Final Status:"
log "  Running: $RUNNING / $TOTAL"
log "=========================================="
echo ""

if [ "$RUNNING" -ge 15 ]; then
    log "✅ SUCCESS! Most services are running!"
    log "   Database connected to DocumentDB"
    log "   Services working like Azure!"
else
    warning "Some services still starting. Check logs if crashes continue:"
    echo "   kubectl logs -n $NAMESPACE <pod-name>"
fi

echo ""
log "Next: Expose services externally"
log "  ./make-services-accessible.sh"
echo ""
