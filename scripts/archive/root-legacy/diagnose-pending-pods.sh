#!/bin/bash

NAMESPACE="etelios-prod"

echo "=========================================="
echo "Diagnosing Pending Pods"
echo "=========================================="
echo ""

# Get first pending pod
FIRST_PENDING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Pending -o name 2>/dev/null | head -n 1 | cut -d'/' -f2)

if [ -z "$FIRST_PENDING" ]; then
    echo "✅ No pending pods found!"
    exit 0
fi

echo "🔍 Checking pod: $FIRST_PENDING"
echo ""

# Describe pod to see events
echo "📊 Pod Events:"
kubectl describe pod -n $NAMESPACE $FIRST_PENDING 2>&1 | grep -A 20 "Events:" | head -n 25
echo ""

# Check for common issues
echo "📊 Common Issues Check:"
echo ""

# Check if it's image pull issue
if kubectl describe pod -n $NAMESPACE $FIRST_PENDING 2>&1 | grep -qi "ImagePullBackOff\|ErrImagePull"; then
    echo "❌ Image Pull Issue Detected"
    echo "   Pods can't pull images from ECR"
    echo "   Solution: Check ECR permissions and image pull secrets"
fi

# Check if it's resource issue
if kubectl describe pod -n $NAMESPACE $FIRST_PENDING 2>&1 | grep -qi "Insufficient\|0/5 nodes are available"; then
    echo "❌ Resource Issue Detected"
    echo "   Not enough resources on nodes"
    echo "   Solution: Check node capacity or reduce resource requests"
fi

# Check if it's node selector issue
if kubectl describe pod -n $NAMESPACE $FIRST_PENDING 2>&1 | grep -qi "node(s) didn't match"; then
    echo "❌ Node Selector Issue Detected"
    echo "   Pods have node selectors that don't match nodes"
    echo "   Solution: Remove or fix node selectors"
fi

# Check pod status
echo ""
echo "📊 Pod Status:"
kubectl get pod -n $NAMESPACE $FIRST_PENDING -o jsonpath='{.status.conditions[*].message}' 2>/dev/null | head -n 1
echo ""

# Check all pending pods summary
echo "📊 All Pending Pods Summary:"
kubectl get pods -n $NAMESPACE --field-selector=status.phase=Pending -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,REASON:.status.reason 2>&1 | head -n 10
