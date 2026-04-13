#!/bin/bash

NAMESPACE="etelios-prod"

echo "=========================================="
echo "Which Services Are Ready?"
echo "=========================================="
echo ""

echo "1. Ready Pods (1/1):"
kubectl get pods -n $NAMESPACE -o custom-columns=NAME:.metadata.name,APP:.metadata.labels.app,READY:.status.containerStatuses[0].ready,STATUS:.status.phase | grep "true.*Running"

echo ""
echo "2. Testing Auth Service:"
curl -s --max-time 5 http://a0adb495fa82c42bfafa50a3552b78dd-1883230600.ap-south-1.elb.amazonaws.com/health 2>&1 | head -n 5

echo ""
echo "3. Testing HR Service:"
curl -s --max-time 5 http://a92564b536d23459880ac316b0bf9062-849640911.ap-south-1.elb.amazonaws.com/health 2>&1 | head -n 5

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""

READY=$(kubectl get pods -n $NAMESPACE -o jsonpath='{range .items[*]}{.status.containerStatuses[0].ready}{"\n"}{end}' 2>/dev/null | grep -c "true" || echo "0")

echo "Ready Services: $READY"
echo ""

if [ "$READY" -ge 2 ]; then
    echo "✅ If these are your main services (auth + one more),"
    echo "   then migration is SUCCESSFUL!"
    echo ""
    echo "   Azure में भी 2 services थीं"
    echo "   AWS में भी 2 services ready हैं"
    echo "   = Migration Complete! ✅"
else
    echo "⚠️  Need to check why services aren't ready"
fi

echo ""
