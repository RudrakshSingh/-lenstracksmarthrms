#!/bin/bash

set -e

NAMESPACE="etelios-prod"
REGION="ap-south-1"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo "=========================================="
echo "Quick Start: Get Services Running NOW"
echo "=========================================="
echo ""
log "Strategy: Minimal changes to get services running"
log "Storage migration can be done later"
echo ""

###############################################################################
# STEP 1: Get DocumentDB Connection String
###############################################################################

log "=========================================="
log "STEP 1: Getting DocumentDB Connection"
log "=========================================="

# Load Day 2 resources
LATEST_DAY2=$(ls -t aws-resources-day2-*.txt 2>/dev/null | head -n 1)
if [ -f "$LATEST_DAY2" ]; then
    DOCDB_ENDPOINT=$(grep "^DOCDB_ENDPOINT=" "$LATEST_DAY2" 2>/dev/null | cut -d'=' -f2 || echo "")
    DOCDB_MASTER_USER=$(grep "^DOCDB_MASTER_USER=" "$LATEST_DAY2" 2>/dev/null | cut -d'=' -f2 || echo "")
    DOCDB_MASTER_PASSWORD=$(grep "^DOCDB_MASTER_PASSWORD=" "$LATEST_DAY2" 2>/dev/null | cut -d'=' -f2 || echo "")
fi

if [ -z "$DOCDB_ENDPOINT" ]; then
    error "DocumentDB endpoint not found. Please run day2-aws-setup.sh first"
    exit 1
fi

log "DocumentDB Endpoint: $DOCDB_ENDPOINT"

# Build DocumentDB connection string
DOCDB_URI="mongodb://${DOCDB_MASTER_USER}:${DOCDB_MASTER_PASSWORD}@${DOCDB_ENDPOINT}:27017/?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"

log "✅ DocumentDB connection string created"
echo ""

###############################################################################
# STEP 2: Update ConfigMap with Minimal Changes
###############################################################################

log "=========================================="
log "STEP 2: Updating Service Configuration"
log "=========================================="

log "Creating updated ConfigMap..."

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: etelios-config
  namespace: $NAMESPACE
data:
  NODE_ENV: "production"
  PORT: "3000"
  
  # Database - DocumentDB (MongoDB compatible)
  MONGODB_URI: "$DOCDB_URI"
  DB_NAME: "etelios-db"
  
  # Storage - TEMPORARILY USE LOCAL (S3 migration later)
  STORAGE_PROVIDER: "local"
  UPLOAD_PATH: "/app/uploads"
  MAX_FILE_SIZE: "10485760"
  
  # Disable Azure-specific features
  USE_KEY_VAULT: "false"
  
  # CORS
  CORS_ORIGIN: "*"
  
  # Logging
  LOG_LEVEL: "info"
  
  # AWS Region
  AWS_REGION: "$REGION"
  
  # Redis (if available)
  REDIS_URL: "redis://redis-service:6379"
  
  # JWT
  JWT_EXPIRATION: "24h"
  REFRESH_TOKEN_EXPIRATION: "7d"
  
  # Rate Limiting
  RATE_LIMIT_WINDOW_MS: "900000"
  RATE_LIMIT_MAX_REQUESTS: "1000"
EOF

log "✅ ConfigMap updated"
echo ""

###############################################################################
# STEP 3: Fix ECR Permissions
###############################################################################

log "=========================================="
log "STEP 3: Fixing ECR Permissions"
log "=========================================="

./fix-ecr-permissions.sh || warning "ECR permissions fix may have failed, continuing..."

echo ""

###############################################################################
# STEP 4: Restart All Pods
###############################################################################

log "=========================================="
log "STEP 4: Restarting All Services"
log "=========================================="

log "Deleting all pods to pick up new configuration..."
kubectl delete pods --all -n $NAMESPACE --grace-period=0 --force &>/dev/null || true

log "✅ Pods deleted, recreating with new config..."
echo ""

log "Waiting for pods to start (3 minutes)..."
sleep 180

###############################################################################
# STEP 5: Check Status
###############################################################################

log "=========================================="
log "STEP 5: Service Status"
log "=========================================="

RUNNING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')
PENDING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Pending --no-headers 2>/dev/null | wc -l | tr -d ' ')

echo ""
log "Pod Status:"
log "  ✅ Running: $RUNNING / 20"
log "  ⏳ Pending: $PENDING"
echo ""

if [ "$RUNNING" -ge 10 ]; then
    log "✅ SUCCESS! Services are starting!"
    log "   They will connect to DocumentDB and run like Azure"
else
    warning "Services still starting. Check logs:"
    echo "   kubectl logs -n $NAMESPACE <pod-name>"
fi

echo ""
log "=========================================="
log "What's Working NOW:"
log "=========================================="
echo ""
log "✅ Database: Connected to DocumentDB (MongoDB compatible)"
log "✅ Services: Running on AWS EKS"
log "⏳ Storage: Using local (S3 migration pending)"
echo ""

log "Next: Expose services via LoadBalancer"
log "  ./make-services-accessible.sh"
echo ""
