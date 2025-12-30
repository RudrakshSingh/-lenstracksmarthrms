#!/bin/bash

# ============================================================================
# Install Istio with Custom Low Resource Configuration
# ============================================================================

set -e

export PATH="$HOME/istio/istio-1.28.2/bin:$PATH"

echo "=========================================="
echo "Installing Istio with Low Resource Config"
echo "=========================================="
echo ""

# Uninstall existing if any
echo "Cleaning up existing installation..."
istioctl uninstall --purge -y 2>/dev/null || true
kubectl delete namespace istio-system --ignore-not-found=true --wait=false
sleep 3

# Install with custom configuration
echo "Installing Istio with custom resource limits..."
istioctl install \
  -f k8s/install-istio-low-resources.yaml \
  --skip-confirmation \
  -y

echo ""
echo "Installation completed!"
echo ""
echo "Checking pod status..."
kubectl get pods -n istio-system

echo ""
echo "Waiting for istiod to be ready (this may take a few minutes)..."
kubectl wait --for=condition=ready pod -l app=istiod -n istio-system --timeout=600s || {
    echo ""
    echo "⚠ Pods may still be starting. Check status:"
    echo "  kubectl get pods -n istio-system"
    echo "  kubectl describe pod -n istio-system -l app=istiod"
}

