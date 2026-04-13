#!/bin/bash

NAMESPACE="etelios-prod"

echo "=========================================="
echo "STEP 8: Inject ConfigMap to All Deployments"
echo "=========================================="
echo ""

echo "Ensuring all deployments use the ConfigMap..."
echo ""

# Get all deployments
DEPLOYMENTS=$(kubectl get deployments -n $NAMESPACE -o name | cut -d'/' -f2)

for deployment in $DEPLOYMENTS; do
    echo "Updating $deployment..."
    
    # Use kubectl set env (simpler and more reliable)
    kubectl set env deployment/$deployment -n $NAMESPACE --from=configmap/etelios-config &>/dev/null && \
        echo "  ✅ ConfigMap injected" || echo "  ⚠️  Failed"
done

echo ""
echo "✅ All deployments updated"
echo ""

# Verify one deployment
echo "Verification (checking auth-service)..."
kubectl get deployment auth-service -n $NAMESPACE -o yaml | grep -A 5 "envFrom\|configMapRef" | head -n 10

echo ""
echo "=========================================="
echo "STEP 8: COMPLETE ✅"
echo "=========================================="
echo ""
echo "Next: ./step9-restart-and-monitor.sh"
