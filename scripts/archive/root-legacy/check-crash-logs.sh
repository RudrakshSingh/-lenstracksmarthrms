#!/bin/bash

NAMESPACE="etelios-prod"

echo "=========================================="
echo "Checking Why Pods Are Crashing"
echo "=========================================="
echo ""

# Get first crashed pod
CRASHED_POD=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Failed -o name 2>/dev/null | head -n 1 | cut -d'/' -f2)

if [ -z "$CRASHED_POD" ]; then
    # Try CrashLoopBackOff pods
    CRASHED_POD=$(kubectl get pods -n $NAMESPACE 2>/dev/null | grep "CrashLoopBackOff\|Error" | head -n 1 | awk '{print $1}')
fi

if [ -n "$CRASHED_POD" ]; then
    echo "🔍 Checking logs for: $CRASHED_POD"
    echo ""
    echo "📋 Last 30 lines of logs:"
    kubectl logs -n $NAMESPACE $CRASHED_POD --tail=30 2>&1 || echo "No logs available yet"
    echo ""
    echo "📋 Previous container logs (if crashed before):"
    kubectl logs -n $NAMESPACE $CRASHED_POD --previous --tail=30 2>&1 || echo "No previous logs"
else
    echo "✅ No crashed pods found!"
fi

echo ""
echo "📊 Current Status:"
kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | xargs echo "  Running:"
kubectl get pods -n $NAMESPACE 2>/dev/null | grep -i "error\|crash" | wc -l | xargs echo "  Crashed:"
