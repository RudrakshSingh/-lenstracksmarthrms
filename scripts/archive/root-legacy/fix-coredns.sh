#!/bin/bash

echo "=========================================="
echo "CRITICAL FIX: CoreDNS Not Working"
echo "=========================================="
echo ""

echo "Issue: Pods can't reach DNS server (172.20.0.10#53)"
echo "This is why DocumentDB hostname doesn't resolve"
echo ""

# Check CoreDNS pods
echo "1. Checking CoreDNS pods..."
kubectl get pods -n kube-system -l k8s-app=kube-dns

echo ""
COREDNS_COUNT=$(kubectl get pods -n kube-system -l k8s-app=kube-dns --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')

if [ "$COREDNS_COUNT" -lt 2 ]; then
    echo "❌ CoreDNS not running properly!"
    echo "   Expected: 2+ pods"
    echo "   Found: $COREDNS_COUNT"
    echo ""
    
    echo "Restarting CoreDNS..."
    kubectl rollout restart deployment coredns -n kube-system &>/dev/null || \
    kubectl delete pods -n kube-system -l k8s-app=kube-dns --force --grace-period=0 &>/dev/null
    
    echo "✅ CoreDNS restarted"
    echo "   Waiting 30 seconds..."
    sleep 30
else
    echo "✅ CoreDNS pods running: $COREDNS_COUNT"
fi

echo ""

# Check kube-dns service
echo "2. Checking kube-dns service..."
kubectl get service kube-dns -n kube-system

echo ""

# Check if CoreDNS can reach upstream DNS
echo "3. Checking CoreDNS configuration..."
kubectl get configmap coredns -n kube-system -o yaml | grep -A 10 "Corefile:"

echo ""

# Test DNS from a fresh pod
echo "4. Testing DNS with fresh pod..."

kubectl run test-dns --image=busybox:1.28 --restart=Never -n etelios-prod -- sleep 60 &>/dev/null || true
sleep 5

echo "   Testing nslookup google.com..."
kubectl exec -n etelios-prod test-dns -- nslookup google.com 2>&1 | head -n 10

echo ""
echo "   Testing DocumentDB endpoint..."
kubectl exec -n etelios-prod test-dns -- nslookup etelios-docdb-cluster.cluster-cl002moksa9v.ap-south-1.docdb.amazonaws.com 2>&1 | head -n 10

# Cleanup
kubectl delete pod test-dns -n etelios-prod --force --grace-period=0 &>/dev/null || true

echo ""
echo "=========================================="
echo "CoreDNS Fix Summary"
echo "=========================================="
echo ""

# Re-check CoreDNS
COREDNS_READY=$(kubectl get pods -n kube-system -l k8s-app=kube-dns -o jsonpath='{range .items[*]}{.status.containerStatuses[0].ready}{"\n"}{end}' 2>/dev/null | grep -c "true" || echo "0")

if [ "$COREDNS_READY" -ge 2 ]; then
    echo "✅ CoreDNS is working ($COREDNS_READY pods ready)"
    echo ""
    echo "If DNS still fails:"
    echo "  - VPC DNS settings issue"
    echo "  - Or DocumentDB endpoint in wrong zone"
else
    echo "❌ CoreDNS still not working"
    echo ""
    echo "Need to:"
    echo "  1. Check VPC CNI plugin"
    echo "  2. Recreate CoreDNS deployment"
    echo "  3. Check EKS add-ons"
fi

echo ""
echo "Next steps:"
echo "  If DNS working: Continue with step 5-10"
echo "  If DNS failing: Need VPC/CNI fix"
echo ""
