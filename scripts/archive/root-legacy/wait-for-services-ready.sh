#!/bin/bash

NAMESPACE="etelios-prod"

echo "=========================================="
echo "Waiting for Services to be Fully Ready"
echo "=========================================="
echo ""

echo "📊 Current Pod Status:"
kubectl get pods -n $NAMESPACE | grep -E "NAME|Running|1/1"
echo ""

echo "⏳ Services are starting up..."
echo "   This can take 2-5 minutes for all pods to be healthy"
echo ""

# Wait and monitor
for i in {1..10}; do
    READY=$(kubectl get pods -n $NAMESPACE -o jsonpath='{range .items[*]}{.status.containerStatuses[0].ready}{"\n"}{end}' 2>/dev/null | grep -c "true" || echo "0")
    TOTAL=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | wc -l | tr -d ' ')
    
    echo "[$i/10] Ready: $READY / $TOTAL"
    
    if [ "$READY" -ge 15 ]; then
        echo ""
        echo "✅ Most services are ready!"
        break
    fi
    
    sleep 30
done

echo ""
echo "📊 Final Status:"
kubectl get pods -n $NAMESPACE | grep "1/1.*Running" | wc -l | xargs echo "  Healthy pods:"
echo ""

# Get auth service URL
AUTH_LB=$(kubectl get service auth-service-lb -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")

if [ -n "$AUTH_LB" ] && [ "$AUTH_LB" != "null" ]; then
    echo "🧪 Testing auth service..."
    echo "   URL: http://$AUTH_LB/health"
    echo ""
    
    # Test with timeout
    RESPONSE=$(curl -s --max-time 10 http://$AUTH_LB/health 2>&1 || echo "")
    
    if [ -n "$RESPONSE" ] && [ "$RESPONSE" != "Empty reply from server" ]; then
        echo "✅ Response: $RESPONSE"
    else
        echo "⚠️  No response yet. Pods may still be initializing."
        echo "   Check pod logs: kubectl logs -n $NAMESPACE -l app=auth-service"
    fi
fi

echo ""
echo "✅ Service readiness check complete"
echo ""
echo "💡 If services still not responding:"
echo "   1. Check pod logs: kubectl logs -n $NAMESPACE <pod-name>"
echo "   2. Wait 2-3 more minutes for full initialization"
echo "   3. Check pod status: kubectl get pods -n $NAMESPACE"
