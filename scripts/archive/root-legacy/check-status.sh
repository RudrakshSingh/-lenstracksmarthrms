#!/bin/bash

echo "=========================================="
echo "EKS Cluster Status Check"
echo "=========================================="
echo ""

echo "📊 Nodes:"
kubectl get nodes 2>&1 || echo "⚠️  Cannot check nodes (kubectl/AWS issue)"
echo ""

echo "📊 Nodegroups:"
eksctl get nodegroup --cluster=etelios-prod --region=ap-south-1 2>&1 | head -n 10 || echo "⚠️  Cannot check nodegroups"
echo ""

echo "📊 Pods Status:"
echo "  Pending: $(kubectl get pods -n etelios-prod --field-selector=status.phase=Pending --no-headers 2>/dev/null | wc -l | tr -d ' ')"
echo "  Running: $(kubectl get pods -n etelios-prod --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')"
echo ""

echo "📊 Deployments:"
kubectl get deployments -n etelios-prod 2>&1 | head -n 5 || echo "⚠️  Cannot check deployments"
echo ""

echo "✅ Status check complete!"
