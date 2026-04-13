#!/bin/bash

NAMESPACE="etelios-prod"

echo "=========================================="
echo "STEP 10: Final Verification & Testing"
echo "=========================================="
echo ""

# Final pod status
echo "1. Final Pod Status:"
kubectl get pods -n $NAMESPACE -o custom-columns=NAME:.metadata.name,READY:.status.containerStatuses[0].ready,STATUS:.status.phase,RESTARTS:.status.containerStatuses[0].restartCount | head -n 25

echo ""

READY=$(kubectl get pods -n $NAMESPACE -o jsonpath='{range .items[*]}{.status.containerStatuses[0].ready}{"\n"}{end}' 2>/dev/null | grep -c "true" || echo "0")
TOTAL=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | wc -l | tr -d ' ')

echo "=========================================="
echo "Summary:"
echo "  Pods Ready: $READY / $TOTAL"
echo "=========================================="
echo ""

if [ "$READY" -ge 15 ]; then
    echo "✅ SUCCESS! Services are running!"
    echo ""
    
    # Test LoadBalancer
    echo "2. Testing LoadBalancer..."
    AUTH_LB=$(kubectl get service auth-service-lb -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null)
    
    echo "   URL: http://$AUTH_LB/health"
    echo ""
    
    RESPONSE=$(curl -s --max-time 10 http://$AUTH_LB/health 2>&1)
    if [ -n "$RESPONSE" ] && [ "$RESPONSE" != "Empty reply from server" ]; then
        echo "   ✅ Response: $RESPONSE"
        echo ""
        echo "🎉 MIGRATION COMPLETE!"
        echo ""
        echo "Your services are now live on AWS:"
        echo "  Auth: http://$AUTH_LB"
        echo ""
    else
        echo "   ⏳ Service starting (wait 2-3 minutes)"
    fi
    
elif [ "$READY" -gt 5 ]; then
    echo "⚠️  Partial success ($READY services working)"
    echo ""
    echo "Check which services are failing:"
    kubectl get pods -n $NAMESPACE | grep -v "1/1.*Running"
    
elif [ "$READY" -gt 0 ]; then
    echo "⚠️  Only $READY service(s) working"
    echo ""
    echo "Check logs of crashed pods:"
    CRASHED=$(kubectl get pods -n $NAMESPACE | grep "CrashLoopBackOff\|Error" | head -n 1 | awk '{print $1}')
    if [ -n "$CRASHED" ]; then
        echo ""
        kubectl logs -n $NAMESPACE $CRASHED --tail=20
    fi
else
    echo "❌ No services ready"
    echo ""
    echo "DocumentDB connection is still failing."
    echo ""
    echo "Options:"
    echo "  1. Check DocumentDB console for issues"
    echo "  2. Use Azure Cosmos DB temporarily"
    echo "  3. Deploy MongoDB in Kubernetes"
fi

echo ""
echo "=========================================="
echo "STEP 10: COMPLETE"
echo "=========================================="
echo ""
echo "Debug process finished."
echo ""
