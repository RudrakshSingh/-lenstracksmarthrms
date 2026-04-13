#!/bin/bash

NAMESPACE="etelios-prod"

echo "=========================================="
echo "STEP 9: Restart Pods and Monitor"
echo "=========================================="
echo ""

echo "1. Scaling down to 1 replica per service..."
kubectl scale deployment --all --replicas=1 -n $NAMESPACE &>/dev/null
echo "   ✅ Scaled to 1 replica"
echo ""

echo "2. Deleting all pods for clean restart..."
kubectl delete pods --all -n $NAMESPACE --grace-period=0 --force &>/dev/null || true
echo "   ✅ Pods deleted"
echo ""

echo "3. Monitoring pod startup (3 minutes)..."
echo ""

for i in {1..18}; do
    READY=$(kubectl get pods -n $NAMESPACE -o jsonpath='{range .items[*]}{.status.containerStatuses[0].ready}{"\n"}{end}' 2>/dev/null | grep -c "true" || echo "0")
    RUNNING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')
    CRASH=$(kubectl get pods -n $NAMESPACE 2>/dev/null | grep -c "CrashLoopBackOff\|Error" || echo "0")
    TOTAL=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | wc -l | tr -d ' ')
    
    echo "[$i/18] Ready: $READY/$TOTAL | Running: $RUNNING | Crashing: $CRASH"
    
    if [ "$READY" -ge 15 ]; then
        echo ""
        echo "✅ Most services are ready!"
        break
    fi
    
    sleep 10
done

echo ""
echo "4. Checking pod logs for errors..."

# Check first 3 pods
for pod in $(kubectl get pods -n $NAMESPACE -o name | head -n 3 | cut -d'/' -f2); do
    echo ""
    echo "=== Logs from $pod ==="
    kubectl logs -n $NAMESPACE $pod --tail=10 2>&1 | grep -i "error\|connected\|database\|mongo" | head -n 5 || echo "No relevant logs"
done

echo ""
echo "=========================================="
echo "STEP 9: COMPLETE"
echo "=========================================="
echo ""

READY=$(kubectl get pods -n $NAMESPACE -o jsonpath='{range .items[*]}{.status.containerStatuses[0].ready}{"\n"}{end}' 2>/dev/null | grep -c "true" || echo "0")

if [ "$READY" -ge 15 ]; then
    echo "✅ SUCCESS! Most services connected!"
else
    echo "⚠️  Only $READY services ready"
    echo "   Need more investigation"
fi

echo ""
echo "Next: ./step10-final-verification.sh"
