#!/bin/bash

# Direct test of login time calculation from attendance records

BASE_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
EMAIL="lenstrack01@gmail.com"
PASSWORD="cnbxs2b9A1!"
EMPLOYEE_ID="EMP-2026-969954"
TODAY=$(date +%Y-%m-%d)

echo "🧪 Testing Login Time Calculation (Direct)"
echo "==========================================="
echo ""

# Login
echo "1️⃣ Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // .data.token // .token // empty')
TENANT_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.tenantId // .data.tenantId // .tenantId // "default"')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Login successful"
echo ""

# Get today's attendance
echo "2️⃣ Fetching today's attendance..."
TODAY_ATTENDANCE=$(curl -s -X GET "$BASE_URL/api/attendance/today?employeeId=$EMPLOYEE_ID&date=$TODAY" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT_ID")

echo "$TODAY_ATTENDANCE" | jq '.'
echo ""

# Get all today's records
echo "3️⃣ Fetching all today's attendance records..."
ATTENDANCE_RECORDS=$(curl -s -X GET "$BASE_URL/api/attendance?employeeId=$EMPLOYEE_ID&date=$TODAY&limit=100" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT_ID")

echo "Response structure:"
echo "$ATTENDANCE_RECORDS" | jq 'keys'
echo ""

# Extract records - try different response structures
RECORDS=$(echo "$ATTENDANCE_RECORDS" | jq '.data.data // .data.records // .data // .records // []')

RECORD_COUNT=$(echo "$RECORDS" | jq 'length')

if [ "$RECORD_COUNT" -gt 0 ]; then
  echo "✅ Found $RECORD_COUNT attendance record(s)"
  echo ""
  
  # Calculate total time
  echo "4️⃣ Calculating total login time..."
  echo ""
  
  TOTAL_MINUTES=0
  SESSION_COUNT=0
  RECENT_LOGIN=""
  
  # Process each record
  for i in $(seq 0 $((RECORD_COUNT - 1))); do
    RECORD=$(echo "$RECORDS" | jq ".[$i]")
    CHECK_IN=$(echo "$RECORD" | jq -r '.checkIn.time // .check_in_time // empty')
    CHECK_OUT=$(echo "$RECORD" | jq -r '.checkOut.time // .check_out_time // empty')
    
    if [ -n "$CHECK_IN" ] && [ "$CHECK_IN" != "null" ]; then
      SESSION_COUNT=$((SESSION_COUNT + 1))
      
      if [ -z "$RECENT_LOGIN" ]; then
        RECENT_LOGIN="$CHECK_IN"
      fi
      
      if [ -n "$CHECK_OUT" ] && [ "$CHECK_OUT" != "null" ]; then
        # Calculate duration
        CHECK_IN_MS=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${CHECK_IN%%.*}" +%s 2>/dev/null || echo "0")
        CHECK_OUT_MS=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${CHECK_OUT%%.*}" +%s 2>/dev/null || echo "0")
        DURATION_MIN=$(( (CHECK_OUT_MS - CHECK_IN_MS) / 60 ))
        TOTAL_MINUTES=$((TOTAL_MINUTES + DURATION_MIN))
        echo "   Session $SESSION_COUNT: $CHECK_IN → $CHECK_OUT (${DURATION_MIN} min)"
      else
        # Active session - calculate to now
        CHECK_IN_MS=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${CHECK_IN%%.*}" +%s 2>/dev/null || echo "0")
        NOW_MS=$(date +%s)
        DURATION_MIN=$(( (NOW_MS - CHECK_IN_MS) / 60 ))
        TOTAL_MINUTES=$((TOTAL_MINUTES + DURATION_MIN))
        echo "   Session $SESSION_COUNT: $CHECK_IN → Now (${DURATION_MIN} min) [Active]"
      fi
    fi
  done
  
  TOTAL_HOURS=$((TOTAL_MINUTES / 60))
  REMAINING_MIN=$((TOTAL_MINUTES % 60))
  
  echo ""
  echo "📊 Summary:"
  echo "   Recent Login Time: $RECENT_LOGIN"
  echo "   Sessions Count: $SESSION_COUNT"
  echo "   Total Login Time: ${TOTAL_HOURS}h ${REMAINING_MIN}m (${TOTAL_MINUTES} minutes)"
  
else
  echo "⚠️  No attendance records found for today"
  echo ""
  echo "Full response:"
  echo "$ATTENDANCE_RECORDS" | jq '.'
fi

echo ""
echo "✅ Test completed"
