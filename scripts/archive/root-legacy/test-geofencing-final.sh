#!/bin/bash

API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
TENANT_ID="upcapto"

echo "🧪 Testing Attendance APIs & Geofencing"
echo "================================================================"
echo ""

# Login
echo "1️⃣ Logging in..."
LOGIN=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@upcapto.com","password":"Upcapto@2026"}')

TOKEN=$(echo "$LOGIN" | jq -r '.data.accessToken')
if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ Login failed"
  exit 1
fi
echo "✅ Login successful"
echo ""

# Clock In
echo "2️⃣ Clocking In (within geofence)..."
CLOCK_IN=$(curl -s -X POST "$API_BASE/api/attendance/clock-in" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -F "latitude=19.0764" \
  -F "longitude=72.8778" \
  -F "notes=Test clock-in")

SUCCESS=$(echo "$CLOCK_IN" | jq -r '.success')
if [ "$SUCCESS" == "true" ]; then
  echo "✅ Clock-in successful"
  ATTENDANCE_ID=$(echo "$CLOCK_IN" | jq -r '.data._id')
  echo "   Attendance ID: $ATTENDANCE_ID"
  echo "   Geofence Status: $(echo "$CLOCK_IN" | jq -r '.data.geofence_status')"
else
  echo "❌ Clock-in failed"
  echo "$CLOCK_IN" | jq '{error, message}'
  exit 1
fi
echo ""

sleep 3

# Track Outside Geofence
echo "3️⃣ Tracking Location (Outside Geofence - Should Auto Logout)..."
TRACK_OUT=$(curl -s -X POST "$API_BASE/api/attendance/track-location" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"latitude":19.0780,"longitude":72.8800}')

ACTION=$(echo "$TRACK_OUT" | jq -r '.data.action')
if [ "$ACTION" == "auto_logout" ]; then
  echo "✅ Auto logout successful!"
  echo "   Distance: $(echo "$TRACK_OUT" | jq -r '.data.distance')m"
  echo "   Message: $(echo "$TRACK_OUT" | jq -r '.data.message')"
  AUTO_LOGOUT="true"
else
  echo "❌ Auto logout failed. Action: $ACTION"
  echo "$TRACK_OUT" | jq '.data'
  AUTO_LOGOUT="false"
fi
echo ""

sleep 3

# Track Back Within Geofence
echo "4️⃣ Tracking Location (Back Within Geofence - Should Show Auto Check-In)..."
TRACK_BACK=$(curl -s -X POST "$API_BASE/api/attendance/track-location" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"latitude":19.0764,"longitude":72.8778}')

ACTION_BACK=$(echo "$TRACK_BACK" | jq -r '.data.action')
if [ "$ACTION_BACK" == "auto_checkin_available" ]; then
  echo "✅ Auto check-in available!"
  echo "   Message: $(echo "$TRACK_BACK" | jq -r '.data.message')"
  AUTO_CHECKIN_AVAIL="true"
else
  echo "⚠️ Auto check-in not available. Action: $ACTION_BACK"
  echo "$TRACK_BACK" | jq '.data'
  AUTO_CHECKIN_AVAIL="false"
fi
echo ""

sleep 3

# Trigger Auto Check-In
if [ "$AUTO_CHECKIN_AVAIL" == "true" ]; then
  echo "5️⃣ Triggering Auto Check-In..."
  AUTO_CHECKIN=$(curl -s -X POST "$API_BASE/api/attendance/track-location" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-tenant-id: $TENANT_ID" \
    -H "Content-Type: application/json" \
    -d '{"latitude":19.0764,"longitude":72.8778,"autoCheckIn":true}')

  ACTION_CHECKIN=$(echo "$AUTO_CHECKIN" | jq -r '.data.action')
  if [ "$ACTION_CHECKIN" == "auto_checkin" ]; then
    echo "✅ Auto check-in successful!"
    echo "   Attendance ID: $(echo "$AUTO_CHECKIN" | jq -r '.data.attendance.id')"
    echo "   Message: $(echo "$AUTO_CHECKIN" | jq -r '.data.message')"
    AUTO_CHECKIN_SUCCESS="true"
  else
    echo "❌ Auto check-in failed. Action: $ACTION_CHECKIN"
    echo "$AUTO_CHECKIN" | jq '.data'
    AUTO_CHECKIN_SUCCESS="false"
  fi
else
  echo "5️⃣ Skipping auto check-in (not available)"
  AUTO_CHECKIN_SUCCESS="false"
fi
echo ""

# Summary
echo "================================================================"
echo "📊 Test Results Summary"
echo "================================================================"
echo "✅ Clock-In: PASSED"
if [ "$AUTO_LOGOUT" == "true" ]; then
  echo "✅ Auto Logout: PASSED"
else
  echo "❌ Auto Logout: FAILED"
fi
if [ "$AUTO_CHECKIN_AVAIL" == "true" ]; then
  echo "✅ Auto Check-In Available: PASSED"
else
  echo "⚠️ Auto Check-In Available: NOT AVAILABLE"
fi
if [ "$AUTO_CHECKIN_SUCCESS" == "true" ]; then
  echo "✅ Auto Check-In Triggered: PASSED"
else
  echo "⚠️ Auto Check-In Triggered: NOT TESTED/FAILED"
fi
echo ""

if [ "$AUTO_LOGOUT" == "true" ] && [ "$AUTO_CHECKIN_SUCCESS" == "true" ]; then
  echo "🎯 Status: ✅ FULLY WORKING (Auto logout + Auto check-in)"
elif [ "$AUTO_LOGOUT" == "true" ]; then
  echo "🎯 Status: ⚠️ PARTIALLY WORKING (Auto logout works)"
else
  echo "🎯 Status: ❌ NOT WORKING"
fi
echo ""

