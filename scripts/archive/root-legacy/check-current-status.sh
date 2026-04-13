#!/bin/bash

NAMESPACE="etelios-prod"

echo "=========================================="
echo "Current Status Check"
echo "=========================================="
echo ""

echo "1. MongoDB Status:"
kubectl get pods -n $NAMESPACE -l app=mongodb
echo ""

echo "2. Service Pods (first 10):"
kubectl get pods -n $NAMESPACE -l app!=mongodb | head -n 11
echo ""

echo "3. Ready Count:"
READY=$(kubectl get pods -n $NAMESPACE -l app!=mongodb -o jsonpath='{range .items[*]}{.status.containerStatuses[0].ready}{"\n"}{end}' 2>/dev/null | grep -c "true" || echo "0")
TOTAL=$(kubectl get pods -n $NAMESPACE -l app!=mongodb --no-headers 2>/dev/null | wc -l | tr -d ' ')
echo "   Ready: $READY / $TOTAL"
echo ""

echo "4. Sample Pod Logs (auth-service):"
AUTH_POD=$(kubectl get pods -n $NAMESPACE -l app=auth-service -o name | head -n 1 | cut -d'/' -f2)
if [ -n "$AUTH_POD" ]; then
    kubectl logs -n $NAMESPACE $AUTH_POD --tail=20 2>&1 | head -n 25
fi

echo ""
echo "5. Test LoadBalancer:"
echo "   curl http://a0adb495fa82c42bfafa50a3552b78dd-1883230600.ap-south-1.elb.amazonaws.com/health"
echo ""
