#!/bin/bash

# ============================================================================
# Reinstall Istio with Minimal Profile
# Uses fewer resources, suitable for smaller clusters
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "Reinstalling Istio with Minimal Profile"
echo "=========================================="
echo ""

# Find istioctl
ISTIOCTL=$(which istioctl 2>/dev/null || echo "$HOME/istio/istio-1.28.2/bin/istioctl")

if [ ! -f "$ISTIOCTL" ]; then
    echo -e "${RED}✗ istioctl not found${NC}"
    echo "Please run: ./k8s/install-istio.sh first"
    exit 1
fi

echo -e "${GREEN}✓ Found istioctl: $ISTIOCTL${NC}"

# Step 1: Uninstall existing Istio
echo ""
echo -e "${BLUE}Step 1: Uninstalling existing Istio...${NC}"
"$ISTIOCTL" uninstall --purge -y || echo "No existing installation to remove"

# Step 2: Delete namespace (cleanup)
echo ""
echo -e "${BLUE}Step 2: Cleaning up namespace...${NC}"
kubectl delete namespace istio-system --ignore-not-found=true --wait=true
sleep 5

# Step 3: Install with minimal profile
echo ""
echo -e "${BLUE}Step 3: Installing Istio with minimal profile...${NC}"
echo "This profile uses fewer resources and is suitable for smaller clusters."

"$ISTIOCTL" install \
  --set profile=minimal \
  --set values.defaultRevision=default \
  -y

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Istio installed with minimal profile${NC}"
else
    echo -e "${RED}✗ Installation failed${NC}"
    exit 1
fi

# Step 4: Wait for pods
echo ""
echo -e "${BLUE}Step 4: Waiting for Istio pods to be ready...${NC}"
echo "This may take a few minutes..."

# Wait for istiod
for i in {1..30}; do
    if kubectl wait --for=condition=ready pod -l app=istiod -n istio-system --timeout=10s 2>/dev/null; then
        echo -e "${GREEN}✓ Istiod is ready${NC}"
        break
    fi
    echo "Waiting for istiod... ($i/30)"
    sleep 10
done

# Check final status
echo ""
echo -e "${BLUE}Final Status:${NC}"
kubectl get pods -n istio-system

# Verify
READY_PODS=$(kubectl get pods -n istio-system --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')

if [ "$READY_PODS" -gt 0 ]; then
    echo ""
    echo "=========================================="
    echo -e "${GREEN}✓ Istio installed successfully!${NC}"
    echo "=========================================="
    echo ""
    echo "Note: Minimal profile doesn't include ingress gateway by default."
    echo "If you need ingress gateway, install it separately:"
    echo ""
    echo "  kubectl apply -f - <<EOF"
    echo "  apiVersion: install.istio.io/v1alpha1"
    echo "  kind: IstioOperator"
    echo "  metadata:"
    echo "    name: ingress-gateway"
    echo "  spec:"
    echo "    components:"
    echo "      ingressGateways:"
    echo "      - name: istio-ingressgateway"
    echo "        enabled: true"
    echo "        k8s:"
    echo "          resources:"
    echo "            requests:"
    echo "              cpu: 100m"
    echo "              memory: 128Mi"
    echo "  EOF"
    echo ""
    echo "Or use your existing NGINX ingress instead of Istio Gateway."
    echo ""
    echo "Next steps:"
    echo "  ./k8s/deploy-istio.sh all"
else
    echo ""
    echo -e "${YELLOW}⚠ Some pods may still be starting. Check status:${NC}"
    echo "  kubectl get pods -n istio-system"
    echo "  kubectl describe pod <pod-name> -n istio-system"
fi

