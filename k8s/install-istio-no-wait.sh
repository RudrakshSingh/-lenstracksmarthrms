#!/bin/bash

# ============================================================================
# Install Istio Without Waiting (Skip Ready Check)
# Use this if pods are taking too long to become ready
# ============================================================================

set -e

export PATH="$HOME/istio/istio-1.28.2/bin:$PATH"

echo "Installing Istio with minimal profile (no wait)..."
echo ""

# Install without waiting for resources to be ready
istioctl install \
  --set profile=minimal \
  --set values.defaultRevision=default \
  --skip-confirmation \
  -y

echo ""
echo "Installation command completed."
echo "Note: Pods may still be starting. Check status with:"
echo "  kubectl get pods -n istio-system"
echo ""
echo "Wait for pods manually:"
echo "  kubectl wait --for=condition=ready pod -l app=istiod -n istio-system --timeout=600s"

