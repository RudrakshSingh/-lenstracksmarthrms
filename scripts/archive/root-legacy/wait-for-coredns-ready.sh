#!/bin/bash

echo "=========================================="
echo "Waiting for CoreDNS to be Ready"
echo "=========================================="
echo ""

echo "CoreDNS pods are Running but not Ready yet (0/1)"
echo "They need 1-3 minutes to fully initialize"
echo ""

# Wait for CoreDNS to be ready
echo "Monitoring CoreDNS pods (max 3 minutes)..."
echo ""

for i in {1..18}; do
    READY=$(kubectl get pods -n kube-system -l k8s-app=kube-dns -o jsonpath='{range .items[*]}{.status.containerStatuses[0].ready}{"\n"}{end}' 2>/dev/null | grep -c "true" || echo "0")
    TOTAL=$(kubectl get pods -n kube-system -l k8s-app=kube-dns --no-headers 2>/dev/null | wc -l | tr -d ' ')
    
    echo "[$i/18] CoreDNS Ready: $READY / $TOTAL"
    
    if [ "$READY" -ge 2 ]; then
        echo ""
        echo "✅ CoreDNS is ready!"
        break
    fi
    
    sleep 10
done

echo ""

# Test DNS now
echo "Testing DNS resolution..."
kubectl run dns-test-final --image=busybox:1.28 --restart=Never -n etelios-prod -- nslookup google.com &>/dev/null || true
sleep 10

DNS_RESULT=$(kubectl logs -n etelios-prod dns-test-final 2>&1)
echo "$DNS_RESULT" | head -n 10

if echo "$DNS_RESULT" | grep -q "Address.*:"; then
    echo ""
    echo "✅ SUCCESS! DNS is working!"
    echo ""
    echo "Now pods can resolve DocumentDB hostname"
else
    echo ""
    echo "⚠️  DNS still not working"
    echo "   CoreDNS may need more time or has issues"
    echo ""
    echo "Check CoreDNS logs:"
    echo "  kubectl logs -n kube-system -l k8s-app=kube-dns"
fi

# Cleanup
kubectl delete pod dns-test-final -n etelios-prod --force --grace-period=0 &>/dev/null || true

echo ""

if [ "$READY" -ge 2 ]; then
    echo "=========================================="
    echo "NEXT: Restart Service Pods"
    echo "=========================================="
    echo ""
    echo "CoreDNS is ready. Now restart your service pods:"
    echo ""
    echo "  kubectl delete pods --all -n etelios-prod"
    echo ""
    echo "Wait 2-3 minutes, then test:"
    echo "  curl http://a0adb495fa82c42bfafa50a3552b78dd-1883230600.ap-south-1.elb.amazonaws.com/health"
    echo ""
    echo "Services should now work!"
fi

echo ""
