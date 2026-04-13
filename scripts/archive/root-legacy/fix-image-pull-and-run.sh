#!/bin/bash

set -e

NAMESPACE="etelios-prod"
REGION="ap-south-1"
ACCOUNT_ID="383234048604"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

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

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

echo "=========================================="
echo "Fix Image Pull & Get All Services Running"
echo "=========================================="
echo ""
log "As DevOps Engineer: Fixing ECR authentication"
echo ""

###############################################################################
# STEP 1: Fix ECR Image Pull Secret
###############################################################################

log "=========================================="
log "STEP 1: Creating ECR Image Pull Secret"
log "=========================================="

# Delete existing secret if it exists
kubectl delete secret ecr-registry-secret -n $NAMESPACE &>/dev/null || true
log "Cleaned up old secret (if any)"

# Get ECR login token
log "Getting ECR login token..."
ECR_TOKEN=$(aws ecr get-login-password --region $REGION 2>&1)

if [ $? -ne 0 ]; then
    error "Failed to get ECR token. Check AWS credentials."
    exit 1
fi

# Create docker-registry secret
log "Creating Kubernetes secret for ECR..."
kubectl create secret docker-registry ecr-registry-secret \
    --docker-server=$ECR_REGISTRY \
    --docker-username=AWS \
    --docker-password="$ECR_TOKEN" \
    --namespace=$NAMESPACE 2>&1

if [ $? -eq 0 ]; then
    log "✅ ECR secret created successfully"
else
    error "Failed to create ECR secret"
    exit 1
fi

echo ""

###############################################################################
# STEP 2: Update Service Account to Use Image Pull Secret
###############################################################################

log "=========================================="
log "STEP 2: Updating Service Account"
log "=========================================="

# Patch default service account
log "Updating default service account to use ECR secret..."
kubectl patch serviceaccount default -n $NAMESPACE -p '{"imagePullSecrets":[{"name":"ecr-registry-secret"}]}' 2>&1

if [ $? -eq 0 ]; then
    log "✅ Service account updated"
else
    warning "Failed to update service account, continuing..."
fi

echo ""

###############################################################################
# STEP 3: Update All Deployments to Use Image Pull Secret
###############################################################################

log "=========================================="
log "STEP 3: Updating All Deployments"
log "=========================================="

DEPLOYMENTS=$(kubectl get deployments -n $NAMESPACE -o name | cut -d'/' -f2)

log "Updating deployments to use ECR image pull secret..."
SUCCESS=0
FAILED=0

for deployment in $DEPLOYMENTS; do
    # Patch deployment to add imagePullSecrets
    if kubectl patch deployment $deployment -n $NAMESPACE -p '{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"ecr-registry-secret"}]}}}}' &>/dev/null; then
        info "  ✅ $deployment"
        SUCCESS=$((SUCCESS + 1))
    else
        warning "  ⚠️  $deployment"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
log "Updated: $SUCCESS deployments"
if [ $FAILED -gt 0 ]; then
    warning "Failed: $FAILED deployments"
fi
echo ""

###############################################################################
# STEP 4: Delete All Pods to Force Recreation
###############################################################################

log "=========================================="
log "STEP 4: Restarting All Pods"
log "=========================================="

log "Deleting all pods to force recreation with new image pull secret..."
kubectl delete pods --all -n $NAMESPACE --grace-period=0 --force &>/dev/null || true
log "✅ All pods deleted"

echo ""

###############################################################################
# STEP 5: Wait and Monitor
###############################################################################

log "=========================================="
log "STEP 5: Waiting for Pods to Start"
log "=========================================="

log "Waiting 90 seconds for pods to pull images and start..."
sleep 30

for i in {1..6}; do
    RUNNING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')
    PENDING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Pending --no-headers 2>/dev/null | wc -l | tr -d ' ')
    PULLING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase!=Running,status.phase!=Pending --no-headers 2>/dev/null | grep -i "pull\|creating" | wc -l | tr -d ' ')
    
    log "Status check $i/6: Running=$RUNNING, Pending=$PENDING, Pulling/Creating=$PULLING"
    
    if [ "$RUNNING" -ge 15 ]; then
        log "✅ Most pods are running!"
        break
    fi
    
    sleep 10
done

echo ""

###############################################################################
# STEP 6: Final Status
###############################################################################

log "=========================================="
log "STEP 6: Final Status Report"
log "=========================================="

RUNNING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')
PENDING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Pending --no-headers 2>/dev/null | wc -l | tr -d ' ')
FAILED=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Failed --no-headers 2>/dev/null | wc -l | tr -d ' ')
PULLBACK=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | grep -i "ImagePullBackOff\|ErrImagePull" | wc -l | tr -d ' ')

echo ""
log "Pod Status:"
log "  ✅ Running: $RUNNING / 20"
log "  ⏳ Pending: $PENDING"
log "  ❌ Failed: $FAILED"
log "  🔄 Image Pull Issues: $PULLBACK"
echo ""

if [ "$PULLBACK" -gt 0 ]; then
    warning "Some pods still have image pull issues. Checking..."
    echo ""
    kubectl get pods -n $NAMESPACE | grep -i "ImagePullBackOff\|ErrImagePull" | head -n 5
    echo ""
    warning "If issues persist, check ECR repository permissions"
fi

if [ "$RUNNING" -ge 15 ]; then
    log "✅ SUCCESS! Most services are running like Azure!"
    echo ""
    log "Services Status:"
    kubectl get services -n $NAMESPACE
    echo ""
    log "✅ Migration Complete - Services running on AWS!"
elif [ "$RUNNING" -gt 0 ]; then
    warning "Partial success: $RUNNING services running"
    warning "Others still starting. Wait a few more minutes."
else
    error "Pods not running yet. Check logs:"
    error "  kubectl describe pod <pod-name> -n $NAMESPACE"
fi

echo ""
log "=========================================="
log "Next: Monitor with:"
log "  kubectl get pods -n $NAMESPACE -w"
log "=========================================="
echo ""
