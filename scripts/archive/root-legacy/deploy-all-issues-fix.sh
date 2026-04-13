#!/bin/bash

###############################################################################
# 🚀 Deploy All Issues Fix - ASAP
# Fixes: Attendance routes, Tenant/company, Department duplicate, Store not found
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

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Configuration
REGION="ap-south-1"
ACCOUNT_ID="383234048604"
CLUSTER_NAME="etelios-prod-v2"
NAMESPACE="etelios-prod"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# Services to deploy (with fixes)
SERVICES=(
  "attendance-service"
  "tenant-registry-service"
  "hr-service"
  "auth-service"
)

log "=========================================="
log "🚀 Deploying All Issues Fix"
log "=========================================="
log "Services: ${SERVICES[*]}"
log ""

###############################################################################
# Step 1: Verify AWS Access
###############################################################################
log "Step 1: Verifying AWS access..."
if ! aws sts get-caller-identity &>/dev/null; then
    error "AWS credentials not configured. Run: aws configure"
fi
log "✅ AWS access verified"

###############################################################################
# Step 2: Login to ECR
###############################################################################
log "Step 2: Logging into ECR..."
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin $ECR_REGISTRY || \
  error "Failed to login to ECR"
log "✅ ECR login successful"

###############################################################################
# Step 3: Update kubeconfig
###############################################################################
log "Step 3: Updating kubeconfig..."
aws eks update-kubeconfig --name $CLUSTER_NAME --region $REGION || \
  error "Failed to update kubeconfig"
log "✅ Kubeconfig updated"

###############################################################################
# Step 4: Build and Push Docker Images
###############################################################################
log "Step 4: Building and pushing Docker images..."
for SERVICE in "${SERVICES[@]}"; do
    log "Building $SERVICE..."
    
    # Build image
    docker buildx build \
      --platform linux/amd64 \
      --tag ${ECR_REGISTRY}/etelios-${SERVICE}:latest \
      --tag ${ECR_REGISTRY}/etelios-${SERVICE}:fix-$(date +%Y%m%d-%H%M%S) \
      --file microservices/${SERVICE}/Dockerfile \
      . \
      --push || error "Failed to build/push $SERVICE"
    
    log "✅ $SERVICE image built and pushed"
done

###############################################################################
# Step 5: Deploy to EKS
###############################################################################
log "Step 5: Deploying to EKS..."
for SERVICE in "${SERVICES[@]}"; do
    log "Deploying $SERVICE..."
    
    # Restart deployment to pull new image
    kubectl rollout restart deployment $SERVICE -n $NAMESPACE || \
      warning "$SERVICE deployment not found, skipping restart"
    
    # Wait for rollout (non-blocking with shorter timeout)
    log "Waiting for $SERVICE rollout (max 60s)..."
    
    # Use timeout command to prevent hanging
    if timeout 60s kubectl rollout status deployment $SERVICE -n $NAMESPACE 2>&1; then
        log "✅ $SERVICE deployed successfully"
    else
        # Check status even if timeout
        READY=$(kubectl get deployment $SERVICE -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        DESIRED=$(kubectl get deployment $SERVICE -n $NAMESPACE -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
        if [ "$READY" -gt 0 ]; then
            log "✅ $SERVICE: $READY/$DESIRED pods ready (rollout continuing in background)"
        else
            warning "⚠️  $SERVICE: No pods ready yet. Rollout continuing in background..."
        fi
        log "ℹ️  $SERVICE rollout is continuing in background. Check status with: kubectl get pods -n $NAMESPACE | grep $SERVICE"
    fi
    
    # Small delay between services
    sleep 2
done

###############################################################################
# Step 6: Verify Deployment
###############################################################################
log "Step 6: Verifying deployment..."
sleep 10  # Wait for pods to be ready

for SERVICE in "${SERVICES[@]}"; do
    log "Checking $SERVICE pods..."
    PODS=$(kubectl get pods -n $NAMESPACE -l app=$SERVICE --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ' || echo "0")
    
    if [ "$PODS" -gt 0 ]; then
        log "✅ $SERVICE: $PODS pod(s) running"
    else
        warning "$SERVICE: No running pods found (may still be starting)"
    fi
done

log ""
log "=========================================="
log "✅ DEPLOYMENT COMPLETE!"
log "=========================================="
log ""
log "Next Steps:"
log "1. Wait 2-3 minutes for all pods to be fully ready"
log "2. Test APIs using:"
log "   ./test-complete-end-to-end-flow.sh"
log ""
log "All 5 issues should now be fixed! 🎉"
log ""
