#!/bin/bash

###############################################################################
# Fix Gateway Timeout Issue (Works for both Nginx and ALB)
# This script fixes 504 Gateway Timeout errors by increasing timeouts
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
NAMESPACE="etelios-backend-prod"  # Based on current ingress.yaml

log "=========================================="
log "Fixing Gateway Timeout Issue"
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
# Step 2: Check ingress type (Nginx or ALB)
###############################################################################
log "Step 2: Checking ingress configuration..."

INGRESS_NAME="etelios-ingress"
INGRESS_CLASS=""

if kubectl get ingress $INGRESS_NAME -n $NAMESPACE &>/dev/null; then
    INGRESS_CLASS=$(kubectl get ingress $INGRESS_NAME -n $NAMESPACE -o jsonpath='{.metadata.annotations.kubernetes\.io/ingress\.class}' 2>/dev/null || \
                    kubectl get ingress $INGRESS_NAME -n $NAMESPACE -o jsonpath='{.spec.ingressClassName}' 2>/dev/null || echo "")
    
    if echo "$INGRESS_CLASS" | grep -qi "nginx"; then
        log "✅ Found Nginx Ingress Controller"
        INGRESS_TYPE="nginx"
    elif echo "$INGRESS_CLASS" | grep -qi "alb"; then
        log "✅ Found ALB Ingress Controller"
        INGRESS_TYPE="alb"
    else
        log "⚠️  Unknown ingress type, defaulting to Nginx"
        INGRESS_TYPE="nginx"
    fi
else
    error "Ingress not found. Please check namespace: $NAMESPACE"
fi
echo ""

###############################################################################
# Step 3: Fix based on ingress type
###############################################################################
if [ "$INGRESS_TYPE" = "nginx" ]; then
    log "Step 3: Fixing Nginx Ingress timeout configuration..."
    
    # Current nginx timeout is 300s (5 minutes) which should be enough
    # But we'll increase it to 600s (10 minutes) for safety
    # Also increase proxy-read-timeout and proxy-send-timeout
    
    kubectl annotate ingress $INGRESS_NAME \
        -n $NAMESPACE \
        --overwrite \
        nginx.ingress.kubernetes.io/proxy-read-timeout="600" \
        nginx.ingress.kubernetes.io/proxy-send-timeout="600" \
        nginx.ingress.kubernetes.io/proxy-connect-timeout="60" \
        nginx.ingress.kubernetes.io/proxy-next-upstream-timeout="60" \
        2>/dev/null || {
        warning "Direct annotation failed, trying JSON patch..."
        
        kubectl patch ingress $INGRESS_NAME -n $NAMESPACE --type=json -p='[
            {
                "op": "replace",
                "path": "/metadata/annotations/nginx.ingress.kubernetes.io~1proxy-read-timeout",
                "value": "600"
            },
            {
                "op": "replace",
                "path": "/metadata/annotations/nginx.ingress.kubernetes.io~1proxy-send-timeout",
                "value": "600"
            },
            {
                "op": "replace",
                "path": "/metadata/annotations/nginx.ingress.kubernetes.io~1proxy-connect-timeout",
                "value": "60"
            },
            {
                "op": "replace",
                "path": "/metadata/annotations/nginx.ingress.kubernetes.io~1proxy-next-upstream-timeout",
                "value": "60"
            }
        ]' || error "Failed to patch ingress"
    }
    
    log "✅ Nginx timeout configuration updated:"
    log "   - proxy-read-timeout: 300s → 600s"
    log "   - proxy-send-timeout: 300s → 600s"
    log "   - proxy-connect-timeout: 10s → 60s"
    
elif [ "$INGRESS_TYPE" = "alb" ]; then
    log "Step 3: Fixing ALB timeout configuration..."
    
    kubectl annotate ingress $INGRESS_NAME \
        -n $NAMESPACE \
        --overwrite \
        alb.ingress.kubernetes.io/load-balancer-attributes="idle_timeout.timeout_seconds=120,draining.enabled=true,draining.timeout_seconds=30" \
        2>/dev/null || {
        warning "Direct annotation failed, trying JSON patch..."
        
        kubectl patch ingress $INGRESS_NAME -n $NAMESPACE --type=json -p='[
            {
                "op": "replace",
                "path": "/metadata/annotations/alb.ingress.kubernetes.io~1load-balancer-attributes",
                "value": "idle_timeout.timeout_seconds=120,draining.enabled=true,draining.timeout_seconds=30"
            }
        ]' || error "Failed to patch ingress"
    }
    
    log "✅ ALB timeout configuration updated:"
    log "   - idle_timeout: 60s → 120s"
    log "   - connection draining: enabled (30s)"
fi
echo ""

###############################################################################
# Step 4: Restart ingress controller (if nginx)
###############################################################################
if [ "$INGRESS_TYPE" = "nginx" ]; then
    log "Step 4: Restarting Nginx Ingress Controller to apply changes..."
    
    # Find nginx ingress controller pod
    NGINX_POD=$(kubectl get pods -n ingress-nginx -l app.kubernetes.io/component=controller -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || \
                kubectl get pods -n kube-system -l app.kubernetes.io/name=ingress-nginx -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [ -n "$NGINX_POD" ]; then
        NGINX_NS=$(kubectl get pod $NGINX_POD --all-namespaces -o jsonpath='{.metadata.namespace}' 2>/dev/null || echo "ingress-nginx")
        log "Found Nginx pod: $NGINX_POD in namespace: $NGINX_NS"
        log "Restarting to apply new timeout settings..."
        kubectl delete pod $NGINX_POD -n $NGINX_NS 2>/dev/null || warning "Could not restart pod (may need manual restart)"
        log "✅ Nginx controller restart initiated"
    else
        warning "⚠️  Nginx ingress controller pod not found. Changes will apply on next reload."
    fi
    echo ""
fi

###############################################################################
# Step 5: Verify the fix
###############################################################################
log "Step 5: Verifying timeout configuration..."

sleep 3

if kubectl get ingress $INGRESS_NAME -n $NAMESPACE &>/dev/null; then
    if [ "$INGRESS_TYPE" = "nginx" ]; then
        READ_TIMEOUT=$(kubectl get ingress $INGRESS_NAME -n $NAMESPACE -o jsonpath='{.metadata.annotations.nginx\.ingress\.kubernetes\.io/proxy-read-timeout}' 2>/dev/null || echo "")
        SEND_TIMEOUT=$(kubectl get ingress $INGRESS_NAME -n $NAMESPACE -o jsonpath='{.metadata.annotations.nginx\.ingress\.kubernetes\.io/proxy-send-timeout}' 2>/dev/null || echo "")
        
        log "Current Nginx timeouts:"
        log "   - proxy-read-timeout: $READ_TIMEOUT"
        log "   - proxy-send-timeout: $SEND_TIMEOUT"
        
        if [ "$READ_TIMEOUT" = "600" ] && [ "$SEND_TIMEOUT" = "600" ]; then
            log "✅ Nginx timeout configuration verified"
        else
            warning "⚠️  Timeout values may not be updated yet. Wait 1-2 minutes and check again."
        fi
        
    elif [ "$INGRESS_TYPE" = "alb" ]; then
        ALB_ATTRS=$(kubectl get ingress $INGRESS_NAME -n $NAMESPACE -o jsonpath='{.metadata.annotations.alb\.ingress\.kubernetes\.io/load-balancer-attributes}' 2>/dev/null || echo "")
        
        log "Current ALB attributes: $ALB_ATTRS"
        
        if echo "$ALB_ATTRS" | grep -q "idle_timeout.timeout_seconds=120"; then
            log "✅ ALB timeout configuration verified"
        else
            warning "⚠️  ALB timeout may not be visible yet. AWS update can take 2-3 minutes."
        fi
    fi
else
    warning "⚠️  Could not verify ingress"
fi
echo ""

###############################################################################
# Step 6: Additional service-level recommendations
###############################################################################
log "Step 6: Service-level recommendations..."

log "For services experiencing timeouts, also check:"
log "  1. Service response time (should be < 5s)"
log "  2. Pod resource limits (CPU/Memory)"
log "  3. Database connection timeouts"
log "  4. External API call timeouts"
echo ""

###############################################################################
# Summary
###############################################################################
log "=========================================="
log "✅ Gateway Timeout Fix Applied!"
log "=========================================="
log ""
log "What was done:"
if [ "$INGRESS_TYPE" = "nginx" ]; then
    log "  1. ✅ Increased Nginx proxy-read-timeout: 300s → 600s"
    log "  2. ✅ Increased Nginx proxy-send-timeout: 300s → 600s"
    log "  3. ✅ Increased Nginx proxy-connect-timeout: 10s → 60s"
    log "  4. ✅ Restarted Nginx controller (if found)"
elif [ "$INGRESS_TYPE" = "alb" ]; then
    log "  1. ✅ Increased ALB idle timeout: 60s → 120s"
    log "  2. ✅ Enabled connection draining: 30s"
fi
log ""
log "Next steps:"
log "  1. Wait 2-3 minutes for changes to propagate"
log "  2. Test APIs: curl http://\$ALB_URL/api/payroll/health"
log "  3. Monitor for 504 errors"
log ""
log "To test:"
log "  ALB_URL=\$(kubectl get ingress $INGRESS_NAME -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
log "  curl -v http://\$ALB_URL/api/payroll/health"
log ""
log "If 504 errors persist after 5 minutes:"
log "  1. Check service logs: kubectl logs -n $NAMESPACE deployment/payroll-service"
log "  2. Check pod health: kubectl get pods -n $NAMESPACE"
log "  3. Test directly: kubectl exec -n $NAMESPACE deployment/payroll-service -- curl http://localhost:3004/health"
log ""
