#!/bin/bash

# Test script for lenstrack01@gmail.com clock-in
# Email: lenstrack01@gmail.com
# Password: cnbxs2b9A1!

API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

echo "🧪 Testing Clock-In for lenstrack01@gmail.com"
echo "=============================================="
echo ""

# Step 1: Login
echo "1️⃣  Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "lenstrack01@gmail.com",
    "password": "cnbxs2b9A1!"
  }')

echo "$LOGIN_RESPONSE" | jq '.'

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // .data.token // empty')
if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ Login failed - no token received"
  exit 1
fi

TENANT_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.tenantId // .data.user.tenant_id // "default"')
USER_NAME=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.name // "N/A"')
EMPLOYEE_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.employee_id // "N/A"')

echo ""
echo "✅ Login successful!"
echo "   User: $USER_NAME"
echo "   Employee ID: $EMPLOYEE_ID"
echo "   Tenant ID: $TENANT_ID"
echo ""

# Step 2: Clock In
echo "2️⃣  Clocking in..."
CLOCK_IN_RESPONSE=$(curl -s -X POST "$API_BASE/api/attendance/clock-in" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 19.0764,
    "longitude": 72.8778,
    "notes": "Clock-in test from script"
  }')

echo "$CLOCK_IN_RESPONSE" | jq '.'

SUCCESS=$(echo "$CLOCK_IN_RESPONSE" | jq -r '.success // false')
if [ "$SUCCESS" == "true" ]; then
  ATTENDANCE_ID=$(echo "$CLOCK_IN_RESPONSE" | jq -r '.data._id // .data.id // "N/A"')
  CHECK_IN_TIME=$(echo "$CLOCK_IN_RESPONSE" | jq -r '.data.check_in_time // .data.checkIn.time // .data.clockIn // "N/A"')
  GEOFENCE_STATUS=$(echo "$CLOCK_IN_RESPONSE" | jq -r '.data.geofence_status // .data.geofenceStatus // "N/A"')
  
  echo ""
  echo "✅ Clock-in successful!"
  echo "   Attendance ID: $ATTENDANCE_ID"
  echo "   Check-in Time: $CHECK_IN_TIME"
  echo "   Geofence Status: $GEOFENCE_STATUS"
else
  echo ""
  echo "❌ Clock-in failed!"
  ERROR_MSG=$(echo "$CLOCK_IN_RESPONSE" | jq -r '.message // .error // "Unknown error"')
  echo "   Error: $ERROR_MSG"
fi

echo ""
echo "=============================================="
echo "Test completed!"
