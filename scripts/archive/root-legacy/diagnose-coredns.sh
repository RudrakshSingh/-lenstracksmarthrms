#!/bin/bash

echo "=========================================="
echo "Diagnose Why CoreDNS Not Ready"
echo "=========================================="
echo ""

echo "1. CoreDNS Pod Status:"
kubectl get pods -n kube-system -l k8s-app=kube-dns -o wide

echo ""
echo "2. CoreDNS Pod Events:"
COREDNS_POD=$(kubectl get pods -n kube-system -l k8s-app=kube-dns -o name | head -n 1 | cut -d'/' -f2)
kubectl describe pod -n kube-system $COREDNS_POD | grep -A 15 "Events:"

echo ""
echo "3. CoreDNS Logs:"
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=30 2>&1 | head -n 40

echo ""
echo "4. Check kube-dns service endpoints:"
kubectl get endpoints kube-dns -n kube-system

echo ""
echo "=========================================="
echo "Analysis"
echo "=========================================="
echo ""
echo "Common CoreDNS issues:"
echo "  - CNI plugin not working"
echo "  - Network policy blocking"
echo "  - Resource limits too low"
echo "  - ConfigMap issue"
echo ""
