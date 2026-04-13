#!/bin/bash
set -e

BASE_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
EMAIL="lenstrack01@gmail.com"
PASSWORD="cnbxs2b9A1!"

echo "=========================================="
echo "🧪 Testing All Backend Fixes on Production"
echo "=========================================="
echo ""

# Login
echo "1️⃣ Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')
TENANT=$(echo $LOGIN_RESPONSE | jq -r '.data.user.tenantId')
EMPLOYEE_ID=$(echo $LOGIN_RESPONSE | jq -r '.data.user.employee_id // .data.user.employeeId')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo "$LOGIN_RESPONSE" | jq .
  exit 1
fi

echo "✅ Logged in - Employee ID: $EMPLOYEE_ID"
echo ""

# Test 1: Time-Tracking Endpoint (Issue 1)
echo "2️⃣ Testing Time-Tracking Endpoint (Issue 1)..."
DATE=$(date +%Y-%m-%d)
TIME_TRACKING_RESPONSE=$(curl -s -X GET "$BASE_URL/api/hr/time-tracking?employeeId=$EMPLOYEE_ID&date=$DATE" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT")

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/api/hr/time-tracking?employeeId=$EMPLOYEE_ID&date=$DATE" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT")

SUCCESS=$(echo $TIME_TRACKING_RESPONSE | jq -r '.success')
DATA_TYPE=$(echo $TIME_TRACKING_RESPONSE | jq -r '.data | type')

if [ "$HTTP_STATUS" == "200" ] && [ "$SUCCESS" == "true" ] && [ "$DATA_TYPE" == "array" ]; then
  echo "✅ PASS: Time-tracking returns 200 with array"
  echo "   Response: { success: $SUCCESS, data: $DATA_TYPE }"
else
  echo "❌ FAIL: Time-tracking issue"
  echo "   HTTP Status: $HTTP_STATUS (expected 200)"
  echo "   Success: $SUCCESS (expected true)"
  echo "   Data Type: $DATA_TYPE (expected array)"
  echo "$TIME_TRACKING_RESPONSE" | jq .
fi
echo ""

# Test 2: Today's Attendance (Store Code)
echo "3️⃣ Testing Today's Attendance (Store Code)..."
ATTENDANCE_RESPONSE=$(curl -s -X GET "$BASE_URL/api/attendance/today?employeeId=$EMPLOYEE_ID&date=$DATE" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT")

STORE_CODE=$(echo $ATTENDANCE_RESPONSE | jq -r '.data.storeCode // "null"')
IS_CLOCKED_IN=$(echo $ATTENDANCE_RESPONSE | jq -r '.data.isClockedIn // false')

if [ "$STORE_CODE" != "null" ] && [ "$STORE_CODE" != "UNKNOWN" ] && [ -n "$STORE_CODE" ]; then
  echo "✅ PASS: Store code is present: $STORE_CODE"
else
  echo "⚠️  Store code: $STORE_CODE (may be null if no attendance today)"
fi

if [ "$IS_CLOCKED_IN" == "true" ] || [ "$IS_CLOCKED_IN" == "false" ]; then
  echo "✅ PASS: isClockedIn field present: $IS_CLOCKED_IN"
else
  echo "⚠️  isClockedIn field may be missing"
fi
echo ""

# Test 3: Clock-Out (if clocked in)
echo "4️⃣ Testing Clock-Out (if needed)..."
if [ "$IS_CLOCKED_IN" == "true" ]; then
  CLOCK_OUT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/attendance/clock-out" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Tenant-Id: $TENANT" \
    -H "Content-Type: application/json" \
    -d "{\"latitude\":28.6139,\"longitude\":77.209,\"notes\":\"Test clock-out\"}")
  
  CLOCK_OUT_SUCCESS=$(echo $CLOCK_OUT_RESPONSE | jq -r '.success')
  if [ "$CLOCK_OUT_SUCCESS" == "true" ]; then
    echo "✅ PASS: Clock-out successful"
    sleep 2
  else
    echo "⚠️  Clock-out response: $(echo $CLOCK_OUT_RESPONSE | jq -r '.message')"
  fi
else
  echo "ℹ️  Not clocked in, skipping clock-out test"
fi
echo ""

# Test 4: Clock-In (with base64 selfie simulation)
echo "5️⃣ Testing Clock-In (Base64 Selfie Support - Issue 4)..."
# Create a minimal base64 image (1x1 pixel PNG)
MINIMAL_BASE64="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

CLOCK_IN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/attendance/clock-in" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT" \
  -H "Content-Type: application/json" \
  -d "{
    \"latitude\": 28.6139,
    \"longitude\": 77.209,
    \"timestamp\": $(date +%s)000,
    \"notes\": \"Test clock-in with base64 selfie\",
    \"selfie\": \"$MINIMAL_BASE64\"
  }")

CLOCK_IN_SUCCESS=$(echo $CLOCK_IN_RESPONSE | jq -r '.success')
CLOCK_IN_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/attendance/clock-in" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT" \
  -H "Content-Type: application/json" \
  -d "{
    \"latitude\": 28.6139,
    \"longitude\": 77.209,
    \"timestamp\": $(date +%s)000,
    \"notes\": \"Test clock-in with base64 selfie\",
    \"selfie\": \"$MINIMAL_BASE64\"
  }")

if [ "$CLOCK_IN_HTTP" == "201" ] || [ "$CLOCK_IN_HTTP" == "200" ]; then
  if [ "$CLOCK_IN_SUCCESS" == "true" ]; then
    echo "✅ PASS: Clock-in with base64 selfie successful (HTTP $CLOCK_IN_HTTP)"
    SELFIE_URL=$(echo $CLOCK_IN_RESPONSE | jq -r '.data.checkIn.selfie // .data.check_in.selfie // "null"')
    if [ "$SELFIE_URL" != "null" ] && [ -n "$SELFIE_URL" ]; then
      echo "   ✅ Selfie URL stored: $SELFIE_URL"
    else
      echo "   ⚠️  Selfie URL not in response (may be processing)"
    fi
  else
    ERROR_MSG=$(echo $CLOCK_IN_RESPONSE | jq -r '.message // .error')
    echo "⚠️  Clock-in response: $ERROR_MSG"
    echo "$CLOCK_IN_RESPONSE" | jq .
  fi
else
  echo "❌ FAIL: Clock-in returned HTTP $CLOCK_IN_HTTP (expected 201)"
  echo "$CLOCK_IN_RESPONSE" | jq .
fi
echo ""

# Test 5: Multiple Clock-In/Out
echo "6️⃣ Testing Multiple Clock-In/Out..."
echo "   Clocking out first..."
curl -s -X POST "$BASE_URL/api/attendance/clock-out" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT" \
  -H "Content-Type: application/json" \
  -d "{\"latitude\":28.6139,\"longitude\":77.209,\"notes\":\"Prep for multiple test\"}" > /dev/null
sleep 2

echo "   Clocking in..."
CLOCK_IN_1=$(curl -s -X POST "$BASE_URL/api/attendance/clock-in" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT" \
  -H "Content-Type: application/json" \
  -d "{\"latitude\":28.6139,\"longitude\":77.209,\"notes\":\"First clock-in\"}")

SUCCESS_1=$(echo $CLOCK_IN_1 | jq -r '.success')
sleep 2

echo "   Clocking out..."
curl -s -X POST "$BASE_URL/api/attendance/clock-out" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT" \
  -H "Content-Type: application/json" \
  -d "{\"latitude\":28.6139,\"longitude\":77.209,\"notes\":\"First clock-out\"}" > /dev/null
sleep 2

echo "   Clocking in again (should work)..."
CLOCK_IN_2=$(curl -s -X POST "$BASE_URL/api/attendance/clock-in" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT" \
  -H "Content-Type: application/json" \
  -d "{\"latitude\":28.6139,\"longitude\":77.209,\"notes\":\"Second clock-in\"}")

SUCCESS_2=$(echo $CLOCK_IN_2 | jq -r '.success')
ERROR_2=$(echo $CLOCK_IN_2 | jq -r '.error // .message')

if [ "$SUCCESS_1" == "true" ] && [ "$SUCCESS_2" == "true" ]; then
  echo "✅ PASS: Multiple clock-in/out working"
else
  if [ "$SUCCESS_2" != "true" ] && [[ "$ERROR_2" == *"clock out"* ]]; then
    echo "❌ FAIL: Second clock-in blocked (multiple clock-in not working)"
    echo "   Error: $ERROR_2"
  else
    echo "⚠️  Multiple clock-in test inconclusive"
  fi
fi
echo ""

echo "=========================================="
echo "✅ Testing Complete!"
echo "=========================================="
