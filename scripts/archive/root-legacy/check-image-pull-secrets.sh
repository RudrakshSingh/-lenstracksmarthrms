#!/bin/bash

NAMESPACE="etelios-prod"

echo "=========================================="
echo "Checking Image Pull Secrets"
echo "=========================================="
echo ""

echo "📊 Checking if image pull secrets exist..."
kubectl get secrets -n $NAMESPACE | grep -i "pull\|ecr\|docker" || echo "⚠️  No image pull secrets found"
echo ""

echo "📊 Checking service account..."
kubectl get serviceaccount default -n $NAMESPACE -o yaml 2>&1 | grep -A 5 "imagePullSecrets" || echo "⚠️  No imagePullSecrets in service account"
echo ""

echo "📊 Checking a pod's image pull secret..."
FIRST_POD=$(kubectl get pods -n $NAMESPACE -o name 2>/dev/null | head -n 1 | cut -d'/' -f2)
if [ -n "$FIRST_POD" ]; then
    kubectl get pod -n $NAMESPACE $FIRST_POD -o jsonpath='{.spec.imagePullSecrets[*].name}' 2>&1 || echo "⚠️  No imagePullSecrets in pod spec"
    echo ""
fi

echo "📊 ECR Registry Check:"
echo "  Expected: 383234048604.dkr.ecr.ap-south-1.amazonaws.com"
echo ""

echo "💡 If image pull secrets are missing, pods can't pull images from ECR"
echo "   Solution: Create ECR image pull secret"
