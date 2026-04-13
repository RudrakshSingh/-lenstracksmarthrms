#!/bin/bash

NAMESPACE="etelios-prod"

echo "=========================================="
echo "Restarting Pods to Schedule on New Nodes"
echo "=========================================="
echo ""

echo "📊 Current Status:"
PENDING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Pending --no-headers 2>/dev/null | wc -l | tr -d ' ')
RUNNING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')
echo "  Pending: $PENDING"
echo "  Running: $RUNNING"
echo ""

if [ "$PENDING" -eq 0 ]; then
    echo "✅ All pods are running!"
    exit 0
fi

echo "🔄 Restarting deployments to schedule pods on new nodes..."
echo ""

# Get all deployments
DEPLOYMENTS=$(kubectl get deployments -n $NAMESPACE -o name | cut -d'/' -f2)

SUCCESS=0
FAILED=0

for deployment in $DEPLOYMENTS; do
    echo -n "  Restarting $deployment... "
    if kubectl rollout restart deployment $deployment -n $NAMESPACE &>/dev/null; then
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
echo "  Restarted: $SUCCESS"
echo "  Failed: $FAILED"
echo "=========================================="
echo ""

echo "⏳ Waiting 30 seconds for pods to start scheduling..."
sleep 30

echo ""
echo "📊 Updated Status:"
PENDING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Pending --no-headers 2>/dev/null | wc -l | tr -d ' ')
RUNNING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')
echo "  Pending: $PENDING"
echo "  Running: $RUNNING"
echo ""

echo "✅ Pod restart complete!"
echo ""
echo "💡 Monitor progress:"
echo "  kubectl get pods -n $NAMESPACE -w"
