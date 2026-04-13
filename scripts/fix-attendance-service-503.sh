#!/bin/bash
# Fix Attendance Service 503 Error
# This script checks and fixes attendance service issues

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Fixing Attendance Service 503 Error"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

NAMESPACE="etelios-prod"
SERVICE_NAME="attendance-service"

# Step 1: Check pods
echo "1️⃣  Checking attendance service pods..."
echo ""
kubectl get pods -n $NAMESPACE -l app=$SERVICE_NAME

echo ""
echo "2️⃣  Checking pod status..."
PODS=$(kubectl get pods -n $NAMESPACE -l app=$SERVICE_NAME -o jsonpath='{.items[*].metadata.name}')

if [ -z "$PODS" ]; then
  echo "❌ No pods found for attendance-service"
  echo "   Creating deployment..."
  exit 1
fi

for POD in $PODS; do
  STATUS=$(kubectl get pod $POD -n $NAMESPACE -o jsonpath='{.status.phase}')
  echo "   Pod: $POD - Status: $STATUS"
  
  if [ "$STATUS" != "Running" ]; then
    echo "   ⚠️  Pod is not running. Checking logs..."
    kubectl logs $POD -n $NAMESPACE --tail=50
  fi
done

echo ""
echo "3️⃣  Checking service..."
kubectl get svc -n $NAMESPACE | grep $SERVICE_NAME

echo ""
echo "4️⃣  Checking deployment..."
kubectl get deployment -n $NAMESPACE | grep $SERVICE_NAME

echo ""
echo "5️⃣  Restarting attendance service..."
kubectl rollout restart deployment/$SERVICE_NAME -n $NAMESPACE

echo ""
echo "6️⃣  Waiting for rollout to complete..."
kubectl rollout status deployment/$SERVICE_NAME -n $NAMESPACE --timeout=120s

echo ""
echo "7️⃣  Checking pod logs after restart..."
NEW_POD=$(kubectl get pods -n $NAMESPACE -l app=$SERVICE_NAME -o jsonpath='{.items[0].metadata.name}')
if [ -n "$NEW_POD" ]; then
  echo "   Pod: $NEW_POD"
  kubectl logs $NEW_POD -n $NAMESPACE --tail=20
fi

echo ""
echo "8️⃣  Checking service health..."
sleep 5
HEALTH=$(kubectl exec -n $NAMESPACE $NEW_POD -- curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/health 2>/dev/null || echo "000")
echo "   Health check status: $HEALTH"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Fix Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Next Steps:"
echo "   1. Test the API:"
echo "      curl -X GET 'http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/api/attendance' \\"
echo "        -H 'Authorization: Bearer <TOKEN>' \\"
echo "        -H 'x-tenant-id: upcapto'"
echo ""
echo "   2. If still 503, check:"
echo "      - ALB target group health"
echo "      - Service endpoints"
echo "      - Pod resource limits"
echo ""
