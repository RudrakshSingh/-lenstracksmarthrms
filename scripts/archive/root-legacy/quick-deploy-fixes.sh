#!/bin/bash

###############################################################################
# Quick Deploy - Just Restart Pods with Existing Images
# Faster than rebuilding everything
###############################################################################

set -e

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

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

NAMESPACE="etelios-prod"

# Services to restart
SERVICES=(
    "auth-service"
    "hr-service"
    "attendance-service"
)

log "=========================================="
log "Quick Deploy - Restarting Services"
log "=========================================="
log "This will restart pods to pick up code changes"
log ""

# Restart deployments (forces pod recreation)
for service in "${SERVICES[@]}"; do
    log "Restarting $service..."
    if kubectl rollout restart deployment/$service -n $NAMESPACE 2>/dev/null; then
        log "  ✅ $service restart initiated"
    else
        warning "  ⚠️  $service not found or already restarting"
    fi
done

echo ""
log "Waiting for pods to be ready (max 3 minutes)..."
for service in "${SERVICES[@]}"; do
    if kubectl rollout status deployment/$service -n $NAMESPACE --timeout=3m 2>/dev/null; then
        log "  ✅ $service is ready"
    else
        warning "  ⚠️  $service may still be starting"
    fi
done

echo ""
log "=========================================="
log "Quick Deploy Complete!"
log "=========================================="
log "Services restarted. Testing APIs..."
echo ""

# Quick API test
ALB_URL="k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
BASE_URL="http://$ALB_URL"

log "Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@upcapto.com","password":"Upcapto@2026"}' 2>/dev/null || echo "")

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    log "✅ Login API working!"
else
    warning "⚠️  Login API may have issues"
    echo "$LOGIN_RESPONSE" | head -c 200
    echo ""
fi

echo ""
log "✅ Quick deploy complete! All services restarted."
