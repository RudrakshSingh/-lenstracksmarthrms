#!/bin/bash

NAMESPACE="etelios-prod"
REPLICAS=1

echo "=========================================="
echo "Temporary Fix: Reduce Replicas to 1"
echo "=========================================="
echo ""

echo "💡 This will reduce all deployments to 1 replica"
echo "   This fits in current 5 nodes (10 vCPUs)"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

echo ""
echo "🔄 Scaling down deployments..."

DEPLOYMENTS=$(kubectl get deployments -n $NAMESPACE -o name | cut -d'/' -f2)

SUCCESS=0
for deployment in $DEPLOYMENTS; do
    echo -n "  Scaling $deployment to $REPLICAS replica... "
    if kubectl scale deployment $deployment -n $NAMESPACE --replicas=$REPLICAS &>/dev/null; then
        echo "✅"
        SUCCESS=$((SUCCESS + 1))
    else
        echo "❌"
    fi
done

echo ""
echo "✅ Scaled $SUCCESS deployments"
echo ""
echo "⏳ Waiting 30 seconds for pods to schedule..."
sleep 30

echo ""
echo "📊 Status:"
PENDING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Pending --no-headers 2>/dev/null | wc -l | tr -d ' ')
RUNNING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')
echo "  Pending: $PENDING"
echo "  Running: $RUNNING"

echo ""
echo "✅ Done! Pods should now schedule on available nodes"
