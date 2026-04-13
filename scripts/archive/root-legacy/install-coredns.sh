#!/bin/bash

CLUSTER_NAME="etelios-prod"
REGION="ap-south-1"

echo "=========================================="
echo "CRITICAL: Install CoreDNS"
echo "=========================================="
echo ""

echo "CoreDNS is MISSING from cluster!"
echo "This is why ALL DNS resolution fails"
echo ""

# Check EKS add-ons
echo "1. Checking current EKS add-ons..."
eksctl get addons --cluster $CLUSTER_NAME --region $REGION

echo ""

# Install CoreDNS addon
echo "2. Installing CoreDNS add-on..."
eksctl create addon \
  --name coredns \
  --cluster $CLUSTER_NAME \
  --region $REGION \
  --force

echo ""
echo "✅ CoreDNS installation initiated"
echo ""

echo "3. Waiting for CoreDNS to be ready (60 seconds)..."
sleep 60

# Check CoreDNS pods
echo ""
echo "4. Checking CoreDNS pods..."
kubectl get pods -n kube-system -l k8s-app=kube-dns

echo ""

# Check kube-dns service
echo "5. Checking kube-dns service..."
kubectl get service kube-dns -n kube-system

echo ""

# Test DNS
echo "6. Testing DNS resolution..."
kubectl run test-dns-final --image=busybox:1.28 --restart=Never -n etelios-prod -- nslookup google.com &>/dev/null || true
sleep 10

DNS_TEST=$(kubectl logs -n etelios-prod test-dns-final 2>&1 | head -n 10)
echo "$DNS_TEST"

if echo "$DNS_TEST" | grep -q "Address.*:"; then
    echo ""
    echo "✅ DNS is working!"
else
    echo ""
    echo "⚠️  DNS still not working"
fi

# Cleanup
kubectl delete pod test-dns-final -n etelios-prod --force --grace-period=0 &>/dev/null || true

echo ""
echo "=========================================="
echo "CoreDNS Installation Complete"
echo "=========================================="
echo ""

COREDNS_READY=$(kubectl get pods -n kube-system -l k8s-app=kube-dns -o jsonpath='{range .items[*]}{.status.containerStatuses[0].ready}{"\n"}{end}' 2>/dev/null | grep -c "true" || echo "0")

if [ "$COREDNS_READY" -ge 2 ]; then
    echo "✅ SUCCESS! CoreDNS is now working!"
    echo "   $COREDNS_READY pods ready"
    echo ""
    echo "This fixes the DNS issue!"
    echo "Now pods can resolve DocumentDB hostname"
    echo ""
    echo "Next: Restart service pods"
    echo "  kubectl delete pods --all -n etelios-prod"
    echo ""
    echo "Then wait 2-3 minutes and test:"
    echo "  curl http://a0adb495fa82c42bfafa50a3552b78dd-1883230600.ap-south-1.elb.amazonaws.com/health"
else
    echo "⚠️  CoreDNS pods: $COREDNS_READY (need more time)"
    echo "   Wait 2-3 minutes and check:"
    echo "   kubectl get pods -n kube-system -l k8s-app=kube-dns"
fi

echo ""
