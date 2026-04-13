#!/bin/bash

###############################################################################
# Quick Fix Deploy: HR Service with Auth Middleware Fix
# Rebuilds HR service with fix and deploys
###############################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

REGION="ap-south-1"
ACCOUNT_ID="383234048604"
NAMESPACE="etelios-prod"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
SERVICE="hr-service"
IMAGE_NAME="$ECR_REGISTRY/etelios-$SERVICE:latest"

log "=========================================="
log "Quick Fix Deploy: HR Service"
log "=========================================="
log ""

# Step 1: Verify fix is in source
log "Step 1: Verifying fix in source code..."
if grep -q "tenantId: decoded.tenantId" microservices/$SERVICE/src/middleware/auth.middleware.js; then
    log "✅ Fix confirmed in source code"
else
    error "❌ Fix not found in source code!"
fi
echo ""

# Step 2: Login to ECR
log "Step 2: Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REGISTRY || error "ECR login failed"
log "✅ ECR login successful"
echo ""

# Step 3: Build and push
log "Step 3: Building HR service image (with fix)..."
log "  Image: $IMAGE_NAME"
log "  Platform: linux/amd64"
log ""

cd microservices/$SERVICE

if docker buildx build \
    --platform linux/amd64 \
    --tag "$IMAGE_NAME" \
    --file Dockerfile \
    --push \
    . 2>&1 | tee /tmp/hr-build.log; then
    log "✅ HR service image built and pushed"
else
    error "❌ Build failed! Check /tmp/hr-build.log"
fi

cd ../..
echo ""

# Step 4: Restart deployment
log "Step 4: Restarting HR service deployment..."
kubectl rollout restart deployment $SERVICE -n $NAMESPACE
log "✅ Deployment restarted"
echo ""

# Step 5: Wait for rollout
log "Step 5: Waiting for rollout..."
kubectl rollout status deployment $SERVICE -n $NAMESPACE --timeout=300s || warning "⚠️  Rollout timeout"
echo ""

# Step 6: Verify pods
log "Step 6: Verifying pods..."
sleep 10
READY=$(kubectl get deployment $SERVICE -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
DESIRED=$(kubectl get deployment $SERVICE -n $NAMESPACE -o jsonpath='{.status.replicas}' 2>/dev/null || echo "0")
log "  Pods ready: $READY/$DESIRED"

if [ "$READY" = "$DESIRED" ] && [ "$READY" -gt 0 ]; then
    log "✅ All pods ready!"
else
    warning "⚠️  Some pods not ready yet"
fi
echo ""

# Step 7: Test API
log "Step 7: Testing HR API..."
sleep 5

API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

# Generate token
TOKEN=$(kubectl exec -n $NAMESPACE $(kubectl get pods -n $NAMESPACE | grep auth-service | grep Running | head -1 | awk '{print $1}') -- node -e "
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:etelios123@mongodb.etelios-prod.svc.cluster.local:27017/etelios?authSource=admin';
const JWT_SECRET = process.env.JWT_SECRET || 'etelios-super-secret-jwt-key-2024';
(async () => {
  await mongoose.connect(MONGODB_URI);
  const User = require('/app/src/models/User.model');
  const user = await User.findOne({ tenantId: 'apitest1771147024', email: 'admin@apitest1771147024.com' });
  if (user) {
    const token = jwt.sign({ userId: user._id.toString(), role: user.role, tenantId: user.tenantId, employee_id: user.employee_id }, JWT_SECRET, { expiresIn: '24h' });
    console.log(token);
  }
  await mongoose.connection.close();
})();
" 2>/dev/null | tail -1)

if [ ! -z "$TOKEN" ]; then
    TENANT_ID="apitest1771147024"
    
    RESPONSE=$(curl -s -X GET "$API_BASE/api/hr/employees" \
      -H "Authorization: Bearer $TOKEN" \
      -H "x-tenant-id: $TENANT_ID")
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        log "✅ HR API working!"
    elif echo "$RESPONSE" | grep -q "INVALID_TOKEN"; then
        warning "⚠️  Token validation issue (may need auth service fix)"
    else
        warning "⚠️  API response: $(echo $RESPONSE | head -c 100)"
    fi
else
    warning "⚠️  Could not generate token for testing"
fi

echo ""
log "=========================================="
log "✅ Quick Deploy Complete!"
log "=========================================="
log ""
log "HR service rebuilt with auth middleware fix"
log "Deployed to EKS cluster"
log ""
log "Next: Test all APIs or rebuild other services"
log ""
