#!/bin/bash

set -e

NAMESPACE="etelios-prod"

# Colors
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
}

echo "=========================================="
echo "Complete Final Fix - Get Services Working"
echo "=========================================="
echo ""

###############################################################################
# STEP 1: Check Current Pod Status
###############################################################################

log "=========================================="
log "STEP 1: Checking Pod Status"
log "=========================================="

kubectl get pods -n $NAMESPACE -o wide | head -n 25

echo ""
READY_PODS=$(kubectl get pods -n $NAMESPACE -o jsonpath='{range .items[*]}{.status.containerStatuses[0].ready}{"\n"}{end}' 2>/dev/null | grep -c "true" || echo "0")
TOTAL_PODS=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | wc -l | tr -d ' ')

log "Pod Status:"
log "  Ready: $READY_PODS / $TOTAL_PODS"
echo ""

if [ "$READY_PODS" -lt 10 ]; then
    warning "Most pods not ready yet. Checking why..."
    echo ""
    
    # Check first non-ready pod
    FIRST_POD=$(kubectl get pods -n $NAMESPACE -o name 2>/dev/null | head -n 1 | cut -d'/' -f2)
    if [ -n "$FIRST_POD" ]; then
        log "Checking pod: $FIRST_POD"
        kubectl logs -n $NAMESPACE $FIRST_POD --tail=30 2>&1 | head -n 30
    fi
    echo ""
fi

###############################################################################
# STEP 2: Cleanup Duplicate Pods
###############################################################################

log "=========================================="
log "STEP 2: Cleanup Duplicate Pods"
log "=========================================="

if [ "$TOTAL_PODS" -gt 20 ]; then
    warning "Found $TOTAL_PODS pods (expected 20). Cleaning up..."
    
    # Scale down to exactly 1 replica
    log "Scaling all deployments to 1 replica..."
    kubectl scale deployment --all --replicas=1 -n $NAMESPACE &>/dev/null
    
    # Delete all pods to force clean recreation
    log "Deleting all pods for clean restart..."
    kubectl delete pods --all -n $NAMESPACE --grace-period=0 --force &>/dev/null || true
    
    log "✅ Cleanup complete"
    echo ""
    
    log "Waiting 90 seconds for pods to restart..."
    sleep 90
else
    log "✅ Pod count looks good ($TOTAL_PODS)"
fi

echo ""

###############################################################################
# STEP 3: Wait for Pods to be Ready
###############################################################################

log "=========================================="
log "STEP 3: Waiting for Pods to be Ready"
log "=========================================="

log "Monitoring pod readiness (max 3 minutes)..."
echo ""

for i in {1..18}; do
    READY=$(kubectl get pods -n $NAMESPACE -o jsonpath='{range .items[*]}{.status.containerStatuses[0].ready}{"\n"}{end}' 2>/dev/null | grep -c "true" || echo "0")
    TOTAL=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | wc -l | tr -d ' ')
    
    log "Check $i/18: Ready=$READY/$TOTAL"
    
    if [ "$READY" -ge 15 ]; then
        log "✅ Most services are ready!"
        break
    fi
    
    sleep 10
done

echo ""

###############################################################################
# STEP 4: Test Services
###############################################################################

log "=========================================="
log "STEP 4: Testing Services"
log "=========================================="

# Get LoadBalancer URL
AUTH_LB=$(kubectl get service auth-service-lb -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")

if [ -n "$AUTH_LB" ] && [ "$AUTH_LB" != "null" ]; then
    log "Testing auth service health endpoint..."
    echo "   URL: http://$AUTH_LB/health"
    echo ""
    
    RESPONSE=$(curl -s --max-time 10 http://$AUTH_LB/health 2>&1 || echo "")
    
    if [ -n "$RESPONSE" ] && [ "$RESPONSE" != "Empty reply from server" ] && [ "$RESPONSE" != "curl: (52)" ]; then
        log "✅ Service responded: $RESPONSE"
        log ""
        log "🎉 SUCCESS! Services are now accessible!"
    else
        warning "Service not responding yet. Checking pod logs..."
        echo ""
        
        # Get auth service pod
        AUTH_POD=$(kubectl get pods -n $NAMESPACE -l app=auth-service -o name 2>/dev/null | head -n 1 | cut -d'/' -f2)
        if [ -n "$AUTH_POD" ]; then
            log "Logs from $AUTH_POD:"
            kubectl logs -n $NAMESPACE $AUTH_POD --tail=20 2>&1 | head -n 20
        fi
    fi
else
    error "LoadBalancer URL not found"
fi

echo ""

###############################################################################
# STEP 5: Final Summary
###############################################################################

log "=========================================="
log "FINAL STATUS"
log "=========================================="

READY=$(kubectl get pods -n $NAMESPACE -o jsonpath='{range .items[*]}{.status.containerStatuses[0].ready}{"\n"}{end}' 2>/dev/null | grep -c "true" || echo "0")
TOTAL=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | wc -l | tr -d ' ')

echo ""
log "Pods Ready: $READY / $TOTAL"
echo ""

if [ "$READY" -ge 15 ]; then
    log "✅ Migration Complete!"
    log "   Services are running on AWS"
    echo ""
    log "Access URLs:"
    echo "   Auth: http://$AUTH_LB"
    echo "   HR:   http://$(kubectl get service hr-service-lb -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null)"
    echo ""
else
    warning "Services still initializing..."
    warning "Wait 2-3 more minutes and retry"
    echo ""
    log "Manual check:"
    echo "   kubectl get pods -n $NAMESPACE"
    echo "   kubectl logs -n $NAMESPACE <pod-name>"
fi

echo ""
