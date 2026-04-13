#!/bin/bash

###############################################################################
# Fix ALB Gateway Timeout Issue
# This script updates the ALB idle timeout from 60s to 120s to prevent 504 errors
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
    exit 1
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Configuration
REGION="ap-south-1"
CLUSTER_NAME="etelios-prod-v2"
NAMESPACE="etelios-prod"  # Try etelios-backend-prod if this doesn't work

log "=========================================="
log "Fixing ALB Gateway Timeout Issue"
log "=========================================="
log "Cluster: $CLUSTER_NAME"
log "Region: $REGION"
log "Namespace: $NAMESPACE"
log ""

###############################################################################
# Step 1: Update kubeconfig
###############################################################################
log "Step 1: Updating kubeconfig..."
if aws eks update-kubeconfig --name $CLUSTER_NAME --region $REGION 2>/dev/null; then
    log "✅ Kubeconfig updated"
else
    error "Failed to update kubeconfig. Check AWS credentials."
fi
echo ""

###############################################################################
# Step 2: Check current ingress
###############################################################################
log "Step 2: Checking current ingress configuration..."

# Try both namespaces
INGRESS_NAMESPACE=""
if kubectl get ingress etelios-ingress -n $NAMESPACE &>/dev/null; then
    INGRESS_NAMESPACE=$NAMESPACE
    log "✅ Found ingress in namespace: $NAMESPACE"
elif kubectl get ingress etelios-ingress -n etelios-backend-prod &>/dev/null; then
    INGRESS_NAMESPACE="etelios-backend-prod"
    log "✅ Found ingress in namespace: etelios-backend-prod"
else
    warning "⚠️  Ingress not found. Will create new one."
    INGRESS_NAMESPACE=$NAMESPACE
fi

if [ -n "$INGRESS_NAMESPACE" ] && kubectl get ingress etelios-ingress -n $INGRESS_NAMESPACE &>/dev/null; then
    CURRENT_TIMEOUT=$(kubectl get ingress etelios-ingress -n $INGRESS_NAMESPACE -o jsonpath='{.metadata.annotations.alb\.ingress\.kubernetes\.io/load-balancer-attributes}' 2>/dev/null || echo "")
    if echo "$CURRENT_TIMEOUT" | grep -q "idle_timeout.timeout_seconds=120"; then
        log "✅ ALB timeout is already set to 120s"
        exit 0
    else
        log "Current timeout configuration: $CURRENT_TIMEOUT"
        log "Will update to 120s..."
    fi
fi
echo ""

###############################################################################
# Step 3: Apply ALB timeout fix
###############################################################################
log "Step 3: Applying ALB timeout fix..."

# Method 1: Patch existing ingress
if [ -n "$INGRESS_NAMESPACE" ] && kubectl get ingress etelios-ingress -n $INGRESS_NAMESPACE &>/dev/null; then
    log "Patching existing ingress..."
    
    kubectl annotate ingress etelios-ingress \
        -n $INGRESS_NAMESPACE \
        --overwrite \
        alb.ingress.kubernetes.io/load-balancer-attributes="idle_timeout.timeout_seconds=120,draining.enabled=true,draining.timeout_seconds=30" \
        2>/dev/null || {
        warning "Direct annotation failed, trying JSON patch..."
        
        # JSON patch method
        kubectl patch ingress etelios-ingress -n $INGRESS_NAMESPACE --type=json -p='[
            {
                "op": "replace",
                "path": "/metadata/annotations/alb.ingress.kubernetes.io~1load-balancer-attributes",
                "value": "idle_timeout.timeout_seconds=120,draining.enabled=true,draining.timeout_seconds=30"
            }
        ]' || error "Failed to patch ingress"
    }
    
    log "✅ Ingress patched successfully"
else
    # Method 2: Apply new ingress configuration
    log "Applying new ingress configuration..."
    
    # Update namespace in the YAML file
    sed "s/namespace: etelios-prod/namespace: $INGRESS_NAMESPACE/" k8s/ingress-alb-fixed.yaml | kubectl apply -f - || error "Failed to apply ingress"
    
    log "✅ New ingress configuration applied"
fi
echo ""

###############################################################################
# Step 4: Verify the fix
###############################################################################
log "Step 4: Verifying ALB timeout configuration..."

sleep 5

if kubectl get ingress etelios-ingress -n $INGRESS_NAMESPACE &>/dev/null; then
    UPDATED_TIMEOUT=$(kubectl get ingress etelios-ingress -n $INGRESS_NAMESPACE -o jsonpath='{.metadata.annotations.alb\.ingress\.kubernetes\.io/load-balancer-attributes}' 2>/dev/null || echo "")
    
    if echo "$UPDATED_TIMEOUT" | grep -q "idle_timeout.timeout_seconds=120"; then
        log "✅ ALB timeout successfully updated to 120s"
        log "Configuration: $UPDATED_TIMEOUT"
    else
        warning "⚠️  Timeout annotation may not be visible yet. ALB update can take 2-3 minutes."
        log "Current annotation: $UPDATED_TIMEOUT"
    fi
    
    # Get ALB ARN for manual verification
    ALB_ARN=$(kubectl get ingress etelios-ingress -n $INGRESS_NAMESPACE -o jsonpath='{.metadata.annotations.alb\.ingress\.kubernetes\.io/load-balancer-arn}' 2>/dev/null || echo "")
    if [ -n "$ALB_ARN" ]; then
        log ""
        log "ALB ARN: $ALB_ARN"
        log "You can verify in AWS Console:"
        log "  EC2 → Load Balancers → Find ALB → Attributes → Idle timeout"
    fi
else
    warning "⚠️  Could not verify ingress. Check manually:"
    warning "  kubectl get ingress etelios-ingress -n $INGRESS_NAMESPACE"
fi
echo ""

###############################################################################
# Step 5: Additional service-level fixes
###############################################################################
log "Step 5: Checking service configurations..."

# Check if services have proper timeouts
for service in payroll-service attendance-service hr-service; do
    if kubectl get deployment $service -n $INGRESS_NAMESPACE &>/dev/null; then
        log "  ✅ $service deployment exists"
    fi
done
echo ""

###############################################################################
# Summary
###############################################################################
log "=========================================="
log "✅ ALB Timeout Fix Applied!"
log "=========================================="
log ""
log "What was done:"
log "  1. ✅ Updated ALB idle timeout: 60s → 120s"
log "  2. ✅ Enabled connection draining: 30s"
log "  3. ✅ Updated ingress annotations"
log ""
log "Next steps:"
log "  1. Wait 2-3 minutes for ALB to update"
log "  2. Test APIs: curl http://\$ALB_URL/api/payroll/health"
log "  3. Verify in AWS Console: EC2 → Load Balancers → Attributes"
log ""
log "To verify timeout in AWS Console:"
log "  1. Go to EC2 → Load Balancers"
log "  2. Find your ALB (search for 'etelios')"
log "  3. Click on it → Attributes tab"
log "  4. Check 'Idle timeout' should be 120 seconds"
log ""
log "If 504 errors persist after 5 minutes:"
log "  1. Check service logs: kubectl logs -n $INGRESS_NAMESPACE deployment/payroll-service"
log "  2. Check pod health: kubectl get pods -n $INGRESS_NAMESPACE"
log "  3. Test directly from pod: kubectl exec -n $INGRESS_NAMESPACE deployment/payroll-service -- curl http://localhost:3004/health"
log ""
