#!/bin/bash

NAMESPACE="etelios-prod"

echo "=========================================="
echo "Reducing Resource Requests in Deployments"
echo "=========================================="
echo ""

echo "📊 Checking current resource requests..."
echo ""

# Get first deployment to check current requests
FIRST_DEPLOYMENT=$(kubectl get deployments -n $NAMESPACE -o name | head -n 1 | cut -d'/' -f2)
if [ -n "$FIRST_DEPLOYMENT" ]; then
    echo "Example: $FIRST_DEPLOYMENT"
    kubectl get deployment $FIRST_DEPLOYMENT -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].resources}' 2>/dev/null | jq '.' 2>/dev/null || echo "  No resource requests found"
    echo ""
fi

echo "🔄 Reducing CPU requests to 100m (0.1 CPU) per pod..."
echo "   This will allow 20 pods to fit in 20 vCPUs"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

echo ""

# Get all deployments
DEPLOYMENTS=$(kubectl get deployments -n $NAMESPACE -o name | cut -d'/' -f2)

SUCCESS=0
FAILED=0

for deployment in $DEPLOYMENTS; do
    echo -n "  Updating $deployment... "
    
    # Patch deployment to set CPU request to 100m and limit to 500m
    if kubectl patch deployment $deployment -n $NAMESPACE -p '{"spec":{"template":{"spec":{"containers":[{"name":"'$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].name}')'","resources":{"requests":{"cpu":"100m","memory":"128Mi"},"limits":{"cpu":"500m","memory":"512Mi"}}}]}}}}' &>/dev/null; then
        echo "✅"
        SUCCESS=$((SUCCESS + 1))
    else
        echo "❌"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "=========================================="
echo "Summary:"
echo "  Updated: $SUCCESS"
echo "  Failed: $FAILED"
echo "=========================================="
echo ""

echo "⏳ Waiting 30 seconds for pods to restart..."
sleep 30

echo ""
echo "📊 Updated Status:"
PENDING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Pending --no-headers 2>/dev/null | wc -l | tr -d ' ')
RUNNING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')
echo "  Pending: $PENDING"
echo "  Running: $RUNNING"
echo ""

echo "✅ Resource requests updated!"
echo ""
echo "💡 Pods should now schedule on available nodes"
echo "   Monitor: kubectl get pods -n $NAMESPACE -w"
