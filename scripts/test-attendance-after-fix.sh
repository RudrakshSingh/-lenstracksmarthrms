#!/bin/bash

# Test attendance endpoints after ALB fix
# Run this script after waiting 2-3 minutes

ALB_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com"
TOKEN=$(cat /tmp/emp_token.txt 2>/dev/null || cat /tmp/admin_token.txt 2>/dev/null || echo "")
TENANT_ID=$(cat /tmp/emp_tenant.txt 2>/dev/null || cat /tmp/tenant_id.txt 2>/dev/null || echo "upcapto")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 TESTING ATTENDANCE ENDPOINTS AFTER FIX"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -z "$TOKEN" ]; then
  echo "❌ No token found. Please login first."
  exit 1
fi

# Test 1: Get Attendance Records
echo "1️⃣  Testing GET /api/attendance..."
ATTENDANCE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$ALB_URL/api/attendance?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" 2>&1)

ATTENDANCE_HTTP=$(echo "$ATTENDANCE_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
ATTENDANCE_BODY=$(echo "$ATTENDANCE_RESPONSE" | sed '/HTTP_CODE:/d')

echo "   HTTP Status: $ATTENDANCE_HTTP"
if [ "$ATTENDANCE_HTTP" = "200" ]; then
  COUNT=$(echo "$ATTENDANCE_BODY" | jq '.data | length' 2>/dev/null || echo "0")
  TOTAL=$(echo "$ATTENDANCE_BODY" | jq '.pagination.total' 2>/dev/null || echo "0")
  echo "   ✅✅✅ Working! Records: $COUNT, Total: $TOTAL"
elif [ "$ATTENDANCE_HTTP" = "503" ]; then
  echo "   ⚠️  503 - Still waiting for ALB (wait 1-2 more minutes)"
else
  echo "   ⚠️  Status: $ATTENDANCE_HTTP"
  echo "$ATTENDANCE_BODY" | head -2
fi
echo ""

# Test 2: Clock In
echo "2️⃣  Testing POST /api/attendance/clock-in..."
CLOCKIN_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$ALB_URL/api/attendance/clock-in" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"latitude":19.0760,"longitude":72.8777,"notes":"Test clock in"}' 2>&1)

CLOCKIN_HTTP=$(echo "$CLOCKIN_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
CLOCKIN_BODY=$(echo "$CLOCKIN_RESPONSE" | sed '/HTTP_CODE:/d')

echo "   HTTP Status: $CLOCKIN_HTTP"
if [ "$CLOCKIN_HTTP" = "200" ] || [ "$CLOCKIN_HTTP" = "201" ]; then
  ATTENDANCE_ID=$(echo "$CLOCKIN_BODY" | jq -r '.data._id // .data.id // empty' 2>/dev/null)
  echo "   ✅✅✅ Working! Attendance ID: $ATTENDANCE_ID"
  echo "$ATTENDANCE_ID" > /tmp/attendance_id.txt
elif [ "$CLOCKIN_HTTP" = "503" ]; then
  echo "   ⚠️  503 - Still waiting for ALB (wait 1-2 more minutes)"
elif [ "$CLOCKIN_HTTP" = "400" ]; then
  ERROR_MSG=$(echo "$CLOCKIN_BODY" | jq -r '.message // .error // "Bad Request"' 2>/dev/null)
  if echo "$ERROR_MSG" | grep -qi "already clocked in"; then
    echo "   ✅ Service is working! (Already clocked in - this is expected)"
  else
    echo "   ⚠️  400: $ERROR_MSG"
  fi
else
  echo "   ⚠️  Status: $CLOCKIN_HTTP"
  echo "$CLOCKIN_BODY" | head -2
fi
echo ""

# Test 3: Clock Out (if clocked in)
echo "3️⃣  Testing POST /api/attendance/clock-out..."
CLOCKOUT_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$ALB_URL/api/attendance/clock-out" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"latitude":19.0760,"longitude":72.8777,"notes":"Test clock out"}' 2>&1)

CLOCKOUT_HTTP=$(echo "$CLOCKOUT_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
CLOCKOUT_BODY=$(echo "$CLOCKOUT_RESPONSE" | sed '/HTTP_CODE:/d')

echo "   HTTP Status: $CLOCKOUT_HTTP"
if [ "$CLOCKOUT_HTTP" = "200" ] || [ "$CLOCKOUT_HTTP" = "201" ]; then
  TOTAL_HOURS=$(echo "$CLOCKOUT_BODY" | jq -r '.data.total_hours // .data.hours_worked // "N/A"' 2>/dev/null)
  echo "   ✅✅✅ Working! Total Hours: $TOTAL_HOURS"
elif [ "$CLOCKOUT_HTTP" = "503" ]; then
  echo "   ⚠️  503 - Still waiting for ALB (wait 1-2 more minutes)"
elif [ "$CLOCKOUT_HTTP" = "400" ]; then
  ERROR_MSG=$(echo "$CLOCKOUT_BODY" | jq -r '.message // .error // "Bad Request"' 2>/dev/null)
  if echo "$ERROR_MSG" | grep -qi "not clocked in\|no active"; then
    echo "   ✅ Service is working! (Not clocked in - this is expected)"
  else
    echo "   ⚠️  400: $ERROR_MSG"
  fi
else
  echo "   ⚠️  Status: $CLOCKOUT_HTTP"
  echo "$CLOCKOUT_BODY" | head -2
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

WORKING_COUNT=0
if [ "$ATTENDANCE_HTTP" = "200" ]; then WORKING_COUNT=$((WORKING_COUNT + 1)); fi
if [ "$CLOCKIN_HTTP" = "200" ] || [ "$CLOCKIN_HTTP" = "201" ] || ([ "$CLOCKIN_HTTP" = "400" ] && echo "$CLOCKIN_BODY" | grep -qi "already clocked in"); then WORKING_COUNT=$((WORKING_COUNT + 1)); fi
if [ "$CLOCKOUT_HTTP" = "200" ] || [ "$CLOCKOUT_HTTP" = "201" ] || ([ "$CLOCKOUT_HTTP" = "400" ] && echo "$CLOCKOUT_BODY" | grep -qi "not clocked in\|no active"); then WORKING_COUNT=$((WORKING_COUNT + 1)); fi

if [ $WORKING_COUNT -eq 3 ]; then
  echo "✅✅✅ ALL ATTENDANCE ENDPOINTS WORKING!"
elif [ $WORKING_COUNT -gt 0 ]; then
  echo "✅ $WORKING_COUNT/3 endpoints working"
  echo "⏳ Wait 1-2 more minutes for remaining endpoints"
else
  echo "⏳ Waiting for ALB to update (2-5 minutes total)"
  echo "💡 Run this script again in 1-2 minutes"
fi
echo ""
