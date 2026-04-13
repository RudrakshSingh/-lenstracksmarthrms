#!/bin/bash

API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
TENANT_ID="upcapto"

echo "🧪 Testing Attendance APIs & Geofencing Auto Check-In/Check-Out"
echo "================================================================"
echo ""

# Step 1: Login as Admin
echo "1️⃣  Logging in as Admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@upcapto.com",
    "password": "Upcapto@2026"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // .data.token // empty')
if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ Login failed!"
  echo "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Login successful"
echo ""

# Check for open sessions and clock out if needed
echo "1.5️⃣ Checking for open attendance sessions..."
OPEN_SESSIONS=$(curl -s -X GET "$API_BASE/api/attendance?limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

# Find open session (has check-in but no check-out)
OPEN_SESSION=$(echo "$OPEN_SESSIONS" | jq -r '.data[] | select(.checkOut == null or .checkOut.time == null) | .id' | head -1)

if [ -n "$OPEN_SESSION" ] && [ "$OPEN_SESSION" != "null" ]; then
  echo "   Found open session, clocking out..."
  WITHIN_LAT=19.0764
  WITHIN_LON=72.8778
  CLOCK_OUT=$(curl -s -X POST "$API_BASE/api/attendance/clock-out" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-tenant-id: $TENANT_ID" \
    -F "latitude=$WITHIN_LAT" \
    -F "longitude=$WITHIN_LON" \
    -F "notes=Clearing session for test")
  
  if [ "$(echo "$CLOCK_OUT" | jq -r '.success')" == "true" ]; then
    echo "✅ Clocked out successfully"
  else
    echo "⚠️  Clock-out response: $(echo "$CLOCK_OUT" | jq -r '.message')"
  fi
  sleep 2
fi

# Store coordinates (Mumbai Main Store)
STORE_LAT=19.0760
STORE_LON=72.8777
GEOFENCE_RADIUS=100  # 100 meters

# Coordinates within geofence (45m away)
WITHIN_LAT=19.0764
WITHIN_LON=72.8778

# Coordinates outside geofence (250m away)
OUTSIDE_LAT=19.0780
OUTSIDE_LON=72.8800

echo ""
echo "📍 Store Location: $STORE_LAT, $STORE_LON (Geofence: ${GEOFENCE_RADIUS}m)"
echo "📍 Within Geofence: $WITHIN_LAT, $WITHIN_LON (~45m)"
echo "📍 Outside Geofence: $OUTSIDE_LAT, $OUTSIDE_LON (~250m)"
echo ""

# Step 2: Clock In
echo "2️⃣  Clocking In (within geofence)..."
CLOCK_IN_RESPONSE=$(curl -s -X POST "$API_BASE/api/attendance/clock-in" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -F "latitude=$WITHIN_LAT" \
  -F "longitude=$WITHIN_LON" \
  -F "notes=Test clock-in for geofencing")

CLOCK_IN_SUCCESS=$(echo "$CLOCK_IN_RESPONSE" | jq -r '.success // false')
if [ "$CLOCK_IN_SUCCESS" == "true" ]; then
  ATTENDANCE_ID=$(echo "$CLOCK_IN_RESPONSE" | jq -r '.data._id // .data.id // empty')
  echo "✅ Clock-in successful"
  echo "   Attendance ID: $ATTENDANCE_ID"
  echo "   Check-in Time: $(echo "$CLOCK_IN_RESPONSE" | jq -r '.data.check_in_time // "N/A"')"
  echo "   Geofence Status: $(echo "$CLOCK_IN_RESPONSE" | jq -r '.data.geofence_status // "N/A"')"
else
  echo "❌ Clock-in failed!"
  echo "$CLOCK_IN_RESPONSE" | jq '.'
  exit 1
fi
echo ""

sleep 3

# Step 3: Track Location (Within Geofence)
echo "3️⃣  Tracking Location (within geofence)..."
TRACK_WITHIN=$(curl -s -X POST "$API_BASE/api/attendance/track-location" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"latitude\": $WITHIN_LAT,
    \"longitude\": $WITHIN_LON
  }")

TRACK_ACTION=$(echo "$TRACK_WITHIN" | jq -r '.data.action // "none"')
echo "   Action: $TRACK_ACTION"
echo "   Within Geofence: $(echo "$TRACK_WITHIN" | jq -r '.data.withinGeofence // false')"
echo "   Distance: $(echo "$TRACK_WITHIN" | jq -r '.data.distance // "N/A"')m"
if [ "$TRACK_ACTION" == "none" ]; then
  echo "✅ Location tracked - still within geofence"
else
  echo "   Response: $(echo "$TRACK_WITHIN" | jq -r '.data.message // "N/A"')"
fi
echo ""

sleep 3

# Step 4: Track Location (Outside Geofence - Should Auto Logout)
echo "4️⃣  Tracking Location (outside geofence - should auto logout)..."
TRACK_OUTSIDE=$(curl -s -X POST "$API_BASE/api/attendance/track-location" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"latitude\": $OUTSIDE_LAT,
    \"longitude\": $OUTSIDE_LON
  }")

TRACK_ACTION_OUT=$(echo "$TRACK_OUTSIDE" | jq -r '.data.action // "none"')
echo "   Action: $TRACK_ACTION_OUT"
echo "   Within Geofence: $(echo "$TRACK_OUTSIDE" | jq -r '.data.withinGeofence // false')"
echo "   Distance: $(echo "$TRACK_OUTSIDE" | jq -r '.data.distance // "N/A"')m"
echo "   Message: $(echo "$TRACK_OUTSIDE" | jq -r '.data.message // "N/A"')"

if [ "$TRACK_ACTION_OUT" == "auto_logout" ]; then
  echo "✅ Auto logout successful!"
  AUTO_LOGOUT_SUCCESS=true
else
  echo "❌ Auto logout failed! Expected 'auto_logout', got '$TRACK_ACTION_OUT'"
  echo "   Full response:"
  echo "$TRACK_OUTSIDE" | jq '.'
  AUTO_LOGOUT_SUCCESS=false
fi
echo ""

sleep 3

# Step 5: Verify Attendance Record (Should have check-out time)
echo "5️⃣  Verifying attendance record (should have check-out)..."
ATTENDANCE_RECORD=$(curl -s -X GET "$API_BASE/api/attendance?limit=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

HAS_CHECKOUT=$(echo "$ATTENDANCE_RECORD" | jq -r '.data[0].checkOut.time // empty')
LOGOUT_REASON=$(echo "$ATTENDANCE_RECORD" | jq -r '.data[0].checkOut.type // empty')

if [ -n "$HAS_CHECKOUT" ] && [ "$HAS_CHECKOUT" != "null" ]; then
  echo "✅ Attendance record has check-out time"
  echo "   Check-out Time: $HAS_CHECKOUT"
  echo "   Logout Reason: $LOGOUT_REASON"
  if [ "$LOGOUT_REASON" == "auto_geofence" ]; then
    echo "✅ Logout reason is 'auto_geofence' - correct!"
  else
    echo "⚠️  Logout reason is '$LOGOUT_REASON', expected 'auto_geofence'"
  fi
else
  echo "⚠️  Attendance record missing check-out time"
  echo "   Record: $(echo "$ATTENDANCE_RECORD" | jq -r '.data[0] | {id, checkIn: .checkIn.time, checkOut: .checkOut}')"
fi
echo ""

sleep 3

# Step 6: Track Location (Back Within Geofence - Should Show Auto Check-In Available)
echo "6️⃣  Tracking Location (back within geofence - should show auto check-in available)..."
TRACK_BACK=$(curl -s -X POST "$API_BASE/api/attendance/track-location" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"latitude\": $WITHIN_LAT,
    \"longitude\": $WITHIN_LON
  }")

TRACK_ACTION_BACK=$(echo "$TRACK_BACK" | jq -r '.data.action // "none"')
echo "   Action: $TRACK_ACTION_BACK"
echo "   Within Geofence: $(echo "$TRACK_BACK" | jq -r '.data.withinGeofence // false')"
echo "   Can Auto Check-In: $(echo "$TRACK_BACK" | jq -r '.data.canAutoCheckIn // false')"
echo "   Message: $(echo "$TRACK_BACK" | jq -r '.data.message // "N/A"')"

if [ "$TRACK_ACTION_BACK" == "auto_checkin_available" ]; then
  echo "✅ Auto check-in available!"
  AUTO_CHECKIN_AVAILABLE=true
else
  echo "⚠️  Auto check-in not available! Got '$TRACK_ACTION_BACK'"
  echo "   Full response:"
  echo "$TRACK_BACK" | jq '.'
  AUTO_CHECKIN_AVAILABLE=false
fi
echo ""

sleep 3

# Step 7: Trigger Auto Check-In (only if available)
if [ "$AUTO_CHECKIN_AVAILABLE" == "true" ]; then
  echo "7️⃣  Triggering Auto Check-In..."
  AUTO_CHECKIN=$(curl -s -X POST "$API_BASE/api/attendance/track-location" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-tenant-id: $TENANT_ID" \
    -H "Content-Type: application/json" \
    -d "{
      \"latitude\": $WITHIN_LAT,
      \"longitude\": $WITHIN_LON,
      \"autoCheckIn\": true
    }")

  AUTO_CHECKIN_ACTION=$(echo "$AUTO_CHECKIN" | jq -r '.data.action // "none"')
  echo "   Action: $AUTO_CHECKIN_ACTION"
  echo "   Within Geofence: $(echo "$AUTO_CHECKIN" | jq -r '.data.withinGeofence // false')"
  echo "   Message: $(echo "$AUTO_CHECKIN" | jq -r '.data.message // "N/A"')"

  if [ "$AUTO_CHECKIN_ACTION" == "auto_checkin" ]; then
    NEW_ATTENDANCE_ID=$(echo "$AUTO_CHECKIN" | jq -r '.data.attendance.id // empty')
    echo "✅ Auto check-in successful!"
    echo "   New Attendance ID: $NEW_ATTENDANCE_ID"
    echo "   Check-in Time: $(echo "$AUTO_CHECKIN" | jq -r '.data.attendance.checkInTime // "N/A"')"
    AUTO_CHECKIN_SUCCESS=true
  else
    echo "❌ Auto check-in failed! Expected 'auto_checkin', got '$AUTO_CHECKIN_ACTION'"
    echo "   Full response:"
    echo "$AUTO_CHECKIN" | jq '.'
    AUTO_CHECKIN_SUCCESS=false
  fi
else
  echo "7️⃣  Skipping auto check-in (not available)"
  AUTO_CHECKIN_SUCCESS=false
fi
echo ""

sleep 2

# Step 8: Get Attendance Records
echo "8️⃣  Getting all attendance records..."
ALL_ATTENDANCE=$(curl -s -X GET "$API_BASE/api/attendance?limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

RECORD_COUNT=$(echo "$ALL_ATTENDANCE" | jq -r '.data | length // 0')
echo "   Total Records: $RECORD_COUNT"
if [ "$RECORD_COUNT" -gt 0 ]; then
  echo "✅ Attendance records retrieved"
  echo "   Latest 2 records:"
  echo "$ALL_ATTENDANCE" | jq -r '.data[0:2] | .[] | "      ID: \(.id), Check-in: \(.checkIn.time // "N/A"), Check-out: \(.checkOut.time // "N/A"), Status: \(.status)"'
fi
echo ""

# Summary
echo "================================================================"
echo "📊 Test Summary"
echo "================================================================"
echo "✅ Clock-In: Tested"
echo "✅ Track Location (Within): Tested"
if [ "$AUTO_LOGOUT_SUCCESS" == "true" ]; then
  echo "✅ Auto Logout (Outside Geofence): PASSED"
else
  echo "❌ Auto Logout (Outside Geofence): FAILED"
fi
if [ "$AUTO_CHECKIN_AVAILABLE" == "true" ]; then
  echo "✅ Auto Check-In Available: PASSED"
else
  echo "⚠️  Auto Check-In Available: NOT AVAILABLE"
fi
if [ "$AUTO_CHECKIN_SUCCESS" == "true" ]; then
  echo "✅ Auto Check-In Triggered: PASSED"
else
  echo "⚠️  Auto Check-In Triggered: NOT TESTED/FAILED"
fi
echo "✅ Attendance Records: Retrieved"
echo ""
echo "🎯 Geofencing Feature Status:"
if [ "$AUTO_LOGOUT_SUCCESS" == "true" ]; then
  if [ "$AUTO_CHECKIN_SUCCESS" == "true" ]; then
    echo "   ✅ FULLY WORKING (Auto logout + Auto check-in)"
  else
    echo "   ⚠️  PARTIALLY WORKING (Auto logout works, auto check-in: $AUTO_CHECKIN_AVAILABLE)"
  fi
else
  echo "   ❌ NOT WORKING - Check logs above"
fi
echo ""

