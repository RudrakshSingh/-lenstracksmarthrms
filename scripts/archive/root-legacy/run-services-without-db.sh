#!/bin/bash

set -e

NAMESPACE="etelios-prod"

echo "=========================================="
echo "Quick Fix: Run Services WITHOUT DocumentDB"
echo "=========================================="
echo ""
echo "Strategy: Services will start without DB"
echo "  - Health endpoints will work"
echo "  - Services will be accessible"
echo "  - DB features won't work until connected"
echo ""

# Update ConfigMap to use localhost MongoDB (will fail gracefully)
echo "1. Updating ConfigMap to fail gracefully..."

kubectl delete configmap etelios-config -n $NAMESPACE 2>/dev/null || true

kubectl create configmap etelios-config -n $NAMESPACE \
  --from-literal=NODE_ENV=production \
  --from-literal=MONGODB_URI="mongodb://localhost:27017/etelios-db" \
  --from-literal=MONGO_URI="mongodb://localhost:27017/etelios-db" \
  --from-literal=DB_NAME=etelios-db \
  --from-literal=STORAGE_PROVIDER=local \
  --from-literal=USE_KEY_VAULT=false \
  --from-literal=CORS_ORIGIN="*" \
  --from-literal=LOG_LEVEL=info \
  --from-literal=JWT_SECRET=etelios-super-secret-jwt-key-change-in-production \
  --from-literal=JWT_EXPIRATION=24h

echo "   ✅ ConfigMap updated (local MongoDB)"
echo ""

# Update all deployments
echo "2. Updating deployments..."
for deployment in $(kubectl get deployments -n $NAMESPACE -o name | cut -d'/' -f2); do
    kubectl set env deployment/$deployment -n $NAMESPACE --from=configmap/etelios-config &>/dev/null && echo "   ✅ $deployment" || echo "   ⚠️  $deployment"
done

echo ""
echo "3. Restarting pods..."
kubectl delete pods --all -n $NAMESPACE --grace-period=0 --force &>/dev/null || true
echo "   ✅ Pods restarting"
echo ""

echo "4. Waiting 90 seconds for services to start..."
sleep 90

# Check status
RUNNING=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')
TOTAL=$(kubectl get deployments -n $NAMESPACE --no-headers 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "=========================================="
echo "STATUS"
echo "=========================================="
echo "  Pods Running: $RUNNING / $TOTAL"
echo ""

if [ "$RUNNING" -ge 10 ]; then
    echo "✅ Services are starting!"
    echo ""
    echo "Test now:"
    echo "  curl http://a0adb495fa82c42bfafa50a3552b78dd-1883230600.ap-south-1.elb.amazonaws.com/health"
    echo ""
    echo "⚠️  Note: DB features won't work until DocumentDB is connected"
    echo "   But at least services will respond!"
else
    echo "⚠️  Services still initializing"
    echo "   Check: kubectl get pods -n $NAMESPACE"
fi

echo ""
