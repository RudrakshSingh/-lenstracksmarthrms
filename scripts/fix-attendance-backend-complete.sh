#!/bin/bash
# Complete Backend Fix for Attendance Service 503 Error

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 COMPLETE BACKEND FIX - Attendance Service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

NAMESPACE="etelios-prod"
SERVICE_NAME="attendance-service"

# Step 1: Check current status
echo "1️⃣  Checking Current Status..."
echo ""
kubectl get pods -n $NAMESPACE -l app=$SERVICE_NAME
echo ""
kubectl get svc -n $NAMESPACE $SERVICE_NAME
echo ""
kubectl get endpoints -n $NAMESPACE $SERVICE_NAME
echo ""

# Step 2: Verify service port configuration
echo "2️⃣  Verifying Service Port Configuration..."
echo ""
SERVICE_PORT=$(kubectl get svc -n $NAMESPACE $SERVICE_NAME -o jsonpath='{.spec.ports[0].port}')
TARGET_PORT=$(kubectl get svc -n $NAMESPACE $SERVICE_NAME -o jsonpath='{.spec.ports[0].targetPort}')
echo "   Service Port: $SERVICE_PORT"
echo "   Target Port: $TARGET_PORT"
echo ""

if [ "$SERVICE_PORT" != "80" ] || [ "$TARGET_PORT" != "3003" ]; then
  echo "   ⚠️  Port mismatch detected. Fixing..."
  kubectl patch svc $SERVICE_NAME -n $NAMESPACE --type='json' -p='[
    {"op": "replace", "path": "/spec/ports/0/port", "value": 80},
    {"op": "replace", "path": "/spec/ports/0/targetPort", "value": 3003}
  ]'
  echo "   ✅ Service ports fixed"
else
  echo "   ✅ Ports are correct"
fi
echo ""

# Step 3: Check pod health
echo "3️⃣  Checking Pod Health..."
echo ""
PODS=$(kubectl get pods -n $NAMESPACE -l app=$SERVICE_NAME -o jsonpath='{.items[*].metadata.name}')

for POD in $PODS; do
  echo "   Pod: $POD"
  STATUS=$(kubectl get pod $POD -n $NAMESPACE -o jsonpath='{.status.phase}')
  READY=$(kubectl get pod $POD -n $NAMESPACE -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')
  echo "   Status: $STATUS, Ready: $READY"
  
  if [ "$READY" = "True" ]; then
    echo "   Testing health endpoint..."
    HEALTH=$(kubectl exec -n $NAMESPACE $POD -- curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/health 2>/dev/null || echo "000")
    echo "   Health Check: $HEALTH"
  fi
  echo ""
done

# Step 4: Restart service
echo "4️⃣  Restarting Attendance Service..."
echo ""
kubectl rollout restart deployment/$SERVICE_NAME -n $NAMESPACE
echo "   ✅ Restart initiated"
echo ""

# Step 5: Wait for rollout
echo "5️⃣  Waiting for Rollout to Complete..."
echo ""
kubectl rollout status deployment/$SERVICE_NAME -n $NAMESPACE --timeout=120s
echo "   ✅ Rollout complete"
echo ""

# Step 6: Verify after restart
echo "6️⃣  Verifying After Restart..."
echo ""
sleep 5
kubectl get pods -n $NAMESPACE -l app=$SERVICE_NAME
echo ""
kubectl get endpoints -n $NAMESPACE $SERVICE_NAME
echo ""

# Step 7: Test pod health again
echo "7️⃣  Testing Pod Health After Restart..."
echo ""
NEW_POD=$(kubectl get pods -n $NAMESPACE -l app=$SERVICE_NAME -o jsonpath='{.items[0].metadata.name}')
if [ -n "$NEW_POD" ]; then
  echo "   Pod: $NEW_POD"
  HEALTH=$(kubectl exec -n $NAMESPACE $NEW_POD -- curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/health 2>/dev/null || echo "000")
  echo "   Health Check: $HEALTH"
  
  if [ "$HEALTH" = "200" ]; then
    echo "   ✅ Pod is healthy!"
  else
    echo "   ⚠️  Pod health check returned: $HEALTH"
  fi
fi
echo ""

# Step 8: Check ingress configuration
echo "8️⃣  Verifying Ingress Configuration..."
echo ""
INGRESS_PORT=$(kubectl get ingress -n $NAMESPACE -o yaml | grep -A 5 "attendance" | grep "number:" | head -1 | awk '{print $2}' || echo "not found")
echo "   Ingress port for attendance: $INGRESS_PORT"

if [ "$INGRESS_PORT" != "80" ]; then
  echo "   ⚠️  Ingress port should be 80, but found: $INGRESS_PORT"
  echo "   Run: kubectl apply -f k8s/ingress-alb-fixed.yaml -n $NAMESPACE"
else
  echo "   ✅ Ingress port is correct"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ BACKEND FIX COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Next Steps:"
echo "   1. Wait 1-2 minutes for ALB to update"
echo "   2. Check AWS Console → EC2 → Target Groups"
echo "   3. Verify targets are healthy"
echo "   4. Test API:"
echo ""
echo "   curl -X GET 'http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/api/attendance?page=1&limit=10' \\"
echo "     -H 'Authorization: Bearer <TOKEN>' \\"
echo "     -H 'x-tenant-id: upcapto'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
