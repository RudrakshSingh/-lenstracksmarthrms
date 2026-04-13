#!/bin/bash

NAMESPACE="etelios-prod"

echo "=========================================="
echo "Final Cleanup and Status Check"
echo "=========================================="
echo ""

echo "📊 Current Pod Status:"
kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | wc -l | xargs echo "  Total pods:"
kubectl get pods -n $NAMESPACE --field-selector=status.phase=Pending --no-headers 2>/dev/null | wc -l | xargs echo "  Pending:"
kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | xargs echo "  Running:"
echo ""

echo "📊 Checking for duplicate pods..."
# Count pods per service
for service in analytics attendance auth cpp crm document financial hr inventory jts monitoring notification payroll prescription purchase realtime sales service-management tenant-management tenant-registry; do
    COUNT=$(kubectl get pods -n $NAMESPACE -l app=$service --no-headers 2>/dev/null | wc -l | tr -d ' ')
    if [ "$COUNT" -gt 1 ]; then
        echo "  ⚠️  $service: $COUNT pods (expected 1)"
    fi
done
echo ""

echo "🗑️  Deleting all pending pods to force fresh creation..."
PENDING_PODS=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Pending -o name 2>/dev/null)

if [ -n "$PENDING_PODS" ]; then
    DELETED=0
    for pod in $PENDING_PODS; do
        kubectl delete $pod -n $NAMESPACE --grace-period=0 --force &>/dev/null && DELETED=$((DELETED + 1))
    done
    echo "✅ Deleted $DELETED pending pods"
else
    echo "✅ No pending pods to delete"
fi

echo ""
echo "⏳ Waiting 60 seconds for new pods to be created and schedule..."
sleep 60

echo ""
echo "📊 Final Status:"
echo ""
kubectl get pods -n $NAMESPACE --field-selector=status.phase=Pending --no-headers 2>/dev/null | wc -l | xargs echo "  Pending:"
kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | xargs echo "  Running:"
kubectl get pods -n $NAMESPACE --field-selector=status.phase=ContainerCreating --no-headers 2>/dev/null | wc -l | xargs echo "  Creating:"
echo ""

echo "📊 Sample Pod Status:"
kubectl get pods -n $NAMESPACE | head -n 10

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "💡 If pods are still pending, check:"
echo "   kubectl describe pod <pod-name> -n $NAMESPACE | grep -A 10 Events"
