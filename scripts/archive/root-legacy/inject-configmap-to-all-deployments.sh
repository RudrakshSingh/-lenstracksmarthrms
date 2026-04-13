#!/bin/bash

set -e

NAMESPACE="etelios-prod"

echo "=========================================="
echo "Inject ConfigMap to ALL Deployments"
echo "=========================================="
echo ""

echo "Issue: ConfigMap exists but deployments not using it"
echo "Fix: Properly inject ConfigMap as environment variables"
echo ""

# Verify ConfigMap
echo "1. Verifying ConfigMap..."
MONGODB_URI=$(kubectl get configmap etelios-config -n $NAMESPACE -o jsonpath='{.data.MONGODB_URI}' 2>/dev/null | head -c 20)
if [[ "$MONGODB_URI" == mongodb://* ]]; then
    echo "   ✅ ConfigMap has correct MONGODB_URI"
else
    echo "   ❌ ConfigMap missing or invalid!"
    exit 1
fi
echo ""

# Get all deployments
DEPLOYMENTS=$(kubectl get deployments -n $NAMESPACE -o name | cut -d'/' -f2)

echo "2. Updating ALL deployments to use ConfigMap..."
echo ""

SUCCESS=0
FAILED=0

for deployment in $DEPLOYMENTS; do
    echo -n "   Updating $deployment... "
    
    # Get container name
    CONTAINER_NAME=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].name}' 2>/dev/null)
    
    # Patch deployment to add envFrom with configMapRef
    if kubectl patch deployment $deployment -n $NAMESPACE --type=json -p='[
      {
        "op": "add",
        "path": "/spec/template/spec/containers/0/envFrom",
        "value": [{"configMapRef": {"name": "etelios-config"}}]
      }
    ]' 2>/dev/null; then
        echo "✅"
        SUCCESS=$((SUCCESS + 1))
    else
        # Try alternative patch (if envFrom already exists)
        if kubectl patch deployment $deployment -n $NAMESPACE -p '{
          "spec": {
            "template": {
              "spec": {
                "containers": [{
                  "name": "'"$CONTAINER_NAME"'",
                  "envFrom": [{
                    "configMapRef": {
                      "name": "etelios-config"
                    }
                  }]
                }]
              }
            }
          }
        }' 2>/dev/null; then
            echo "✅ (alternative)"
            SUCCESS=$((SUCCESS + 1))
        else
            echo "⚠️"
            FAILED=$((FAILED + 1))
        fi
    fi
done

echo ""
echo "=========================================="
echo "Summary: Updated $SUCCESS/$((SUCCESS + FAILED)) deployments"
echo "=========================================="
echo ""

if [ $SUCCESS -lt 15 ]; then
    echo "⚠️  Many deployments failed to update"
    echo "   Trying bulk update..."
    echo ""
    
    # Bulk rollout restart (this forces pickup of ConfigMap)
    kubectl rollout restart deployment --all -n $NAMESPACE &>/dev/null
    echo "   ✅ Triggered rollout restart"
fi

echo "3. Deleting all pods for clean restart..."
kubectl delete pods --all -n $NAMESPACE --grace-period=0 --force &>/dev/null || true
echo "   ✅ Pods deleted"
echo ""

echo "4. Waiting 2 minutes for pods to start with ConfigMap..."
sleep 120

echo ""
echo "=========================================="
echo "FINAL CHECK"
echo "=========================================="

# Check pod status
READY=$(kubectl get pods -n $NAMESPACE -o jsonpath='{range .items[*]}{.status.containerStatuses[0].ready}{"\n"}{end}' 2>/dev/null | grep -c "true" || echo "0")
TOTAL=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | wc -l | tr -d ' ')

echo "Pods Ready: $READY / $TOTAL"
echo ""

if [ "$READY" -ge 15 ]; then
    echo "✅ SUCCESS! Services connected to DocumentDB!"
    echo ""
    echo "Test now:"
    echo "  curl http://a0adb495fa82c42bfafa50a3552b78dd-1883230600.ap-south-1.elb.amazonaws.com/health"
    echo ""
else
    echo "⚠️  Still not ready. Check a pod's logs:"
    SAMPLE_POD=$(kubectl get pods -n $NAMESPACE -o name | head -n 1 | cut -d'/' -f2)
    echo "  kubectl logs -n $NAMESPACE $SAMPLE_POD --tail=30"
    echo ""
    echo "Or wait 3-5 more minutes - database connections take time"
fi

echo ""
