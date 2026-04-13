#!/bin/bash

NAMESPACE="etelios-prod"

echo "=========================================="
echo "Cleaning Up Old Pending Pods"
echo "=========================================="
echo ""

echo "📊 Current Status:"
PENDING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Pending --no-headers 2>/dev/null | wc -l | tr -d ' ')
RUNNING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')
echo "  Pending: $PENDING"
echo "  Running: $RUNNING"
echo ""

if [ "$PENDING" -eq 0 ]; then
    echo "✅ No pending pods to clean up!"
    exit 0
fi

echo "🗑️  Deleting old pending pods..."
echo ""

# Delete all pending pods
PENDING_PODS=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Pending -o name 2>/dev/null)

DELETED=0
for pod in $PENDING_PODS; do
    pod_name=$(echo $pod | cut -d'/' -f2)
    echo -n "  Deleting $pod_name... "
    if kubectl delete $pod -n $NAMESPACE --grace-period=0 --force &>/dev/null; then
        echo "✅"
        DELETED=$((DELETED + 1))
    else
        echo "❌"
    fi
done

echo ""
echo "✅ Deleted $DELETED pending pods"
echo ""

echo "⏳ Waiting 30 seconds for new pods to be created..."
sleep 30

echo ""
echo "📊 Updated Status:"
PENDING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Pending --no-headers 2>/dev/null | wc -l | tr -d ' ')
RUNNING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')
CREATING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase!=Running,status.phase!=Pending --no-headers 2>/dev/null | wc -l | tr -d ' ')

echo "  Pending: $PENDING"
echo "  Running: $RUNNING"
echo "  Creating: $CREATING"
echo ""

echo "✅ Cleanup complete!"
echo ""
echo "💡 New pods should now be created with 1 replica each"
echo "   Monitor: kubectl get pods -n $NAMESPACE -w"
