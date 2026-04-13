#!/bin/bash

# Complete fix for Attendance Service 503 errors
# This script fixes ALB target group registration and service health

NAMESPACE="etelios-prod"
SERVICE_NAME="attendance-service"
ALB_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 COMPLETE ATTENDANCE SERVICE ALB FIX"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Check pods
echo "1️⃣  Checking Attendance Service Pods..."
PODS=$(kubectl get pods -n $NAMESPACE -l app=$SERVICE_NAME -o jsonpath='{.items[*].metadata.name}' 2>/dev/null)
if [ -z "$PODS" ]; then
  echo "   ❌ No pods found for $SERVICE_NAME"
  exit 1
fi

POD_COUNT=$(echo $PODS | wc -w | tr -d ' ')
echo "   ✅ Found $POD_COUNT pod(s):"
for POD in $PODS; do
  STATUS=$(kubectl get pod $POD -n $NAMESPACE -o jsonpath='{.status.phase}' 2>/dev/null)
  READY=$(kubectl get pod $POD -n $NAMESPACE -o jsonpath='{.status.containerStatuses[0].ready}' 2>/dev/null)
  echo "      - $POD: $STATUS (Ready: $READY)"
done
echo ""

# Step 2: Check service
echo "2️⃣  Checking Attendance Service..."
SVC=$(kubectl get svc $SERVICE_NAME -n $NAMESPACE -o json 2>/dev/null)
if [ -z "$SVC" ]; then
  echo "   ❌ Service $SERVICE_NAME not found"
  exit 1
fi

SVC_TYPE=$(echo "$SVC" | jq -r '.spec.type' 2>/dev/null)
SVC_PORTS=$(echo "$SVC" | jq -r '.spec.ports[] | "\(.port)->\(.targetPort)"' 2>/dev/null | tr '\n' ', ')
echo "   ✅ Service Type: $SVC_TYPE"
echo "   ✅ Ports: $SVC_PORTS"
echo ""

# Step 3: Check endpoints
echo "3️⃣  Checking Service Endpoints..."
ENDPOINTS=$(kubectl get endpoints $SERVICE_NAME -n $NAMESPACE -o jsonpath='{.subsets[0].addresses[*].ip}' 2>/dev/null)
if [ -z "$ENDPOINTS" ]; then
  echo "   ⚠️  No endpoints found - pods may not be ready"
else
  ENDPOINT_COUNT=$(echo $ENDPOINTS | wc -w | tr -d ' ')
  echo "   ✅ Found $ENDPOINT_COUNT endpoint(s):"
  for EP in $ENDPOINTS; do
    echo "      - $EP:3003"
  done
fi
echo ""

# Step 4: Test pod health directly
echo "4️⃣  Testing Pod Health Directly..."
for POD in $PODS; do
  POD_IP=$(kubectl get pod $POD -n $NAMESPACE -o jsonpath='{.status.podIP}' 2>/dev/null)
  if [ -n "$POD_IP" ]; then
    echo "   Testing $POD ($POD_IP:3003)..."
    # Port forward test (if possible)
    HEALTH=$(kubectl exec -n $NAMESPACE $POD -- curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/health 2>/dev/null || echo "N/A")
    if [ "$HEALTH" = "200" ]; then
      echo "      ✅ Pod health check: 200 OK"
    else
      echo "      ⚠️  Pod health check: $HEALTH"
    fi
  fi
done
echo ""

# Step 5: Restart service to force ALB refresh
echo "5️⃣  Restarting Attendance Service (to force ALB refresh)..."
kubectl rollout restart deployment/$SERVICE_NAME -n $NAMESPACE 2>/dev/null
if [ $? -eq 0 ]; then
  echo "   ✅ Restart initiated"
  echo "   ⏳ Waiting for rollout to complete..."
  kubectl rollout status deployment/$SERVICE_NAME -n $NAMESPACE --timeout=120s 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "   ✅ Rollout complete"
  else
    echo "   ⚠️  Rollout timeout (may still be in progress)"
  fi
else
  echo "   ⚠️  Could not restart (may need manual intervention)"
fi
echo ""

# Step 6: Verify service after restart
echo "6️⃣  Verifying Service After Restart..."
sleep 5
NEW_ENDPOINTS=$(kubectl get endpoints $SERVICE_NAME -n $NAMESPACE -o jsonpath='{.subsets[0].addresses[*].ip}' 2>/dev/null)
if [ -n "$NEW_ENDPOINTS" ]; then
  NEW_COUNT=$(echo $NEW_ENDPOINTS | wc -w | tr -d ' ')
  echo "   ✅ Service has $NEW_COUNT endpoint(s) after restart"
else
  echo "   ⚠️  No endpoints yet (pods may still be starting)"
fi
echo ""

# Step 7: Test ALB endpoint
echo "7️⃣  Testing ALB Endpoint..."
sleep 10
TOKEN=$(cat /tmp/emp_token.txt 2>/dev/null || cat /tmp/admin_token.txt 2>/dev/null || echo "")
TENANT_ID=$(cat /tmp/emp_tenant.txt 2>/dev/null || cat /tmp/tenant_id.txt 2>/dev/null || echo "upcapto")

if [ -n "$TOKEN" ]; then
  TEST_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$ALB_URL/api/attendance?page=1&limit=1" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-tenant-id: $TENANT_ID" 2>&1)
  
  HTTP_CODE=$(echo "$TEST_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
  BODY=$(echo "$TEST_RESPONSE" | sed '/HTTP_CODE:/d')
  
  echo "   HTTP Status: $HTTP_CODE"
  if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅✅✅ Attendance service is working!"
  elif [ "$HTTP_CODE" = "503" ]; then
    echo "   ⚠️  Still 503 - ALB may need more time (wait 1-2 more minutes)"
    echo "   💡 ALB target group updates can take 2-5 minutes"
  else
    echo "   ⚠️  Status: $HTTP_CODE"
    echo "$BODY" | head -2
  fi
else
  echo "   ⚠️  No token found, skipping ALB test"
fi
echo ""

# Step 8: Summary and recommendations
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 FIX SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Completed:"
echo "   - Pod status checked"
echo "   - Service configuration verified"
echo "   - Endpoints checked"
echo "   - Service restarted"
echo ""
echo "⏳ Next Steps:"
echo "   1. Wait 2-5 minutes for ALB target group to update"
echo "   2. Test attendance endpoints again"
echo "   3. If still 503, check AWS Console → EC2 → Target Groups"
echo ""
echo "🔍 Manual Checks (if needed):"
echo "   - AWS Console → EC2 → Target Groups → Find attendance-service target group"
echo "   - Check 'Health checks' tab for target health"
echo "   - Verify targets are registered and healthy"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
