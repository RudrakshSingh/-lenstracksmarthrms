#!/bin/bash

# ============================================================================
# Fix Istio Installation Issues
# Diagnoses and fixes common Istio installation problems
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "Istio Installation Troubleshooting"
echo "=========================================="
echo ""

# Check pod status
echo -e "${BLUE}1. Checking Istio pod status...${NC}"
kubectl get pods -n istio-system

echo ""
echo -e "${BLUE}2. Checking pod events...${NC}"
kubectl get events -n istio-system --sort-by='.lastTimestamp' | tail -10

echo ""
echo -e "${BLUE}3. Checking for common issues...${NC}"

# Check if pods are pending
PENDING_PODS=$(kubectl get pods -n istio-system -o jsonpath='{.items[?(@.status.phase=="Pending")].metadata.name}' 2>/dev/null || echo "")

if [ -n "$PENDING_PODS" ]; then
    echo -e "${YELLOW}⚠ Found pending pods: $PENDING_PODS${NC}"
    echo ""
    echo "Checking why pods are pending..."
    for pod in $PENDING_PODS; do
        echo "Pod: $pod"
        kubectl describe pod "$pod" -n istio-system | grep -A 5 "Events:" || true
    done
fi

# Check for image pull errors
echo ""
echo -e "${BLUE}4. Checking for image pull issues...${NC}"
kubectl get pods -n istio-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[*].state.waiting.reason}{"\n"}{end}' | grep -i "image\|pull" || echo "No image pull issues found"

# Check node resources
echo ""
echo -e "${BLUE}5. Checking node resources...${NC}"
kubectl top nodes 2>/dev/null || echo "Metrics server not available"

# Check if we can manually wait longer
echo ""
echo -e "${BLUE}6. Attempting to wait for pods to become ready...${NC}"
echo "Waiting up to 10 minutes for Istio pods..."

timeout 600 bash -c 'until kubectl wait --for=condition=ready pod -l app=istiod -n istio-system --timeout=60s 2>/dev/null; do echo "Waiting for istiod..."; sleep 10; done' || {
    echo -e "${YELLOW}⚠ Istiod still not ready after 10 minutes${NC}"
}

timeout 600 bash -c 'until kubectl wait --for=condition=ready pod -l app=istio-ingressgateway -n istio-system --timeout=60s 2>/dev/null; do echo "Waiting for ingress gateway..."; sleep 10; done' || {
    echo -e "${YELLOW}⚠ Ingress gateway still not ready after 10 minutes${NC}"
}

# Final status
echo ""
echo -e "${BLUE}7. Final pod status...${NC}"
kubectl get pods -n istio-system

# Provide solutions
echo ""
echo "=========================================="
echo "Troubleshooting Solutions"
echo "=========================================="
echo ""

NOT_READY=$(kubectl get pods -n istio-system --field-selector=status.phase!=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')

if [ "$NOT_READY" -gt 0 ]; then
    echo -e "${YELLOW}Some pods are not ready. Try these solutions:${NC}"
    echo ""
    echo "Solution 1: Check pod logs"
    echo "  kubectl logs -n istio-system -l app=istiod --tail=50"
    echo "  kubectl logs -n istio-system -l app=istio-ingressgateway --tail=50"
    echo ""
    echo "Solution 2: Check pod descriptions"
    echo "  kubectl describe pod <pod-name> -n istio-system"
    echo ""
    echo "Solution 3: If resources are insufficient, install with minimal profile"
    echo "  istioctl install --set profile=minimal -y"
    echo ""
    echo "Solution 4: Uninstall and reinstall"
    echo "  istioctl uninstall --purge -y"
    echo "  kubectl delete namespace istio-system"
    echo "  istioctl install --set profile=minimal -y"
    echo ""
    echo "Solution 5: If using Docker Desktop, ensure it has enough resources"
    echo "  Docker Desktop → Settings → Resources"
    echo "  Increase CPU (at least 4 cores) and Memory (at least 8GB)"
else
    echo -e "${GREEN}✓ All Istio pods are running!${NC}"
    echo ""
    echo "Istio is ready. You can now deploy services:"
    echo "  ./k8s/deploy-istio.sh all"
fi

