#!/bin/bash

NAMESPACE="etelios-prod"

echo "=========================================="
echo "Checking Pod Resource Requests"
echo "=========================================="
echo ""

echo "📊 Node Capacity:"
kubectl get nodes -o custom-columns=NAME:.metadata.name,CPU:.status.capacity.cpu,MEMORY:.status.capacity.memory 2>&1 | head -n 6
echo ""

echo "📊 Pod Resource Requests (first 5 services):"
for service in analytics-service attendance-service auth-service cpp-service crm-service; do
    echo ""
    echo "  $service:"
    kubectl get deployment $service -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].resources}' 2>/dev/null | jq '.' 2>/dev/null || echo "    No resource requests found"
done

echo ""
echo "📊 Total CPU Requested (if all pods scheduled):"
# This is a rough estimate - would need to sum all resource requests
echo "  Check with: kubectl describe nodes | grep -A 5 'Allocated resources'"

echo ""
echo "💡 If CPU requests are too high, we need to either:"
echo "   1. Scale up nodes (recommended)"
echo "   2. Reduce CPU requests in deployments"
