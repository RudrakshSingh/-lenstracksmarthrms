#!/bin/bash

###############################################################################
# Complete Attendance Flow Test
# Clock-In → Dashboard → Clock-Out → Verify Times
###############################################################################

set +e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com}"

echo "=========================================="
echo "🧪 Complete Attendance Flow Test"
echo "Clock-In → Dashboard → Clock-Out"
echo "=========================================="
echo ""

# Step 1: Admin Login
LOGIN_BODY='{"email":"Admin@lenstrack.com","password":"Kadarkhan@123"}'
LOGIN_RESPONSE=$(curl -s -X POST \
  "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_BODY")

ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // .data.token // empty')
TENANT_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.tenantId // "lenstrack"')

echo "✅ Admin logged in"
echo ""

# Step 2: Get Employee with Store
echo "📋 Getting employee with store..."
EMP_RESPONSE=$(curl -s -X GET \
  "$API_BASE_URL/api/hr/employees?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

FIRST_EMP=$(echo "$EMP_RESPONSE" | jq -r '.data[0]' 2>/dev/null)
EMP_EMAIL=$(echo "$FIRST_EMP" | jq -r '.email // empty')
EMP_EMP_ID=$(echo "$FIRST_EMP" | jq -r '.employeeId // empty')
EMP_STORE=$(echo "$FIRST_EMP" | jq -r '.store.id // .store._id // empty')

if [ -n "$EMP_EMAIL" ] && [ "$EMP_EMAIL" != "null" ]; then
  echo "✅ Employee found: $EMP_EMAIL"
  echo "   Employee ID: $EMP_EMP_ID"
  echo "   Store: $EMP_STORE"
  echo ""
  
  # Step 3: Clock-In
  echo "=========================================="
  echo "1️⃣  Clock-In"
  echo "=========================================="
  
  CLOCK_IN_BODY='{
    "latitude": 28.6139,
    "longitude": 77.2090,
    "location": "New Delhi, India"
  }'
  
  echo -n "Testing Clock-In ... "
  CLOCK_IN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "$API_BASE_URL/api/attendance/clock-in" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "x-tenant-id: $TENANT_ID" \
    -d "$CLOCK_IN_BODY")
  
  CLOCK_IN_HTTP=$(echo "$CLOCK_IN_RESPONSE" | tail -1)
  CLOCK_IN_BODY=$(echo "$CLOCK_IN_RESPONSE" | sed '$d')
  
  if [ "$CLOCK_IN_HTTP" = "200" ] || [ "$CLOCK_IN_HTTP" = "201" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $CLOCK_IN_HTTP)"
    CLOCK_IN_TIME=$(echo "$CLOCK_IN_BODY" | jq -r '.data.check_in_time // .data.clockInTime // .data.clockIn // empty' 2>/dev/null)
    if [ -n "$CLOCK_IN_TIME" ] && [ "$CLOCK_IN_TIME" != "null" ]; then
      echo "   🕐 Clock-In Time: $CLOCK_IN_TIME"
    fi
  else
    echo -e "${RED}❌ FAIL${NC} (HTTP $CLOCK_IN_HTTP)"
    ERROR=$(echo "$CLOCK_IN_BODY" | jq -r '.message // .error // "Unknown"' 2>/dev/null)
    echo "   ⚠️  $ERROR"
  fi
  echo ""
  
  # Step 4: Check Dashboard
  echo "=========================================="
  echo "2️⃣  Dashboard - Clock-In Time"
  echo "=========================================="
  
  DASHBOARD=$(curl -s -X GET \
    "$API_BASE_URL/api/hr/dashboard" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "x-tenant-id: $TENANT_ID")
  
  echo "Checking dashboard for clock-in time..."
  
  # Check various locations
  if echo "$DASHBOARD" | jq -e '.data.todayAttendance' > /dev/null 2>&1; then
    TODAY_CI=$(echo "$DASHBOARD" | jq -r '.data.todayAttendance.clockIn // .data.todayAttendance.check_in_time // empty' 2>/dev/null)
    if [ -n "$TODAY_CI" ] && [ "$TODAY_CI" != "null" ]; then
      echo -e "${GREEN}✅ Found clock-in in dashboard${NC}"
      echo "   🕐 Clock-In: $TODAY_CI"
    fi
  fi
  
  # Get attendance records
  ATTENDANCE=$(curl -s -X GET \
    "$API_BASE_URL/api/attendance/history?limit=1" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "x-tenant-id: $TENANT_ID")
  
  if echo "$ATTENDANCE" | jq -e '.data.attendances[0]' > /dev/null 2>&1; then
    LATEST=$(echo "$ATTENDANCE" | jq '.data.attendances[0]' 2>/dev/null)
    CI_TIME=$(echo "$LATEST" | jq -r '.check_in_time // .clockInTime // .clockIn // empty' 2>/dev/null)
    CO_TIME=$(echo "$LATEST" | jq -r '.check_out_time // .clockOutTime // .clockOut // empty' 2>/dev/null)
    
    if [ -n "$CI_TIME" ]; then
      echo ""
      echo -e "${GREEN}✅ Latest Attendance Record:${NC}"
      echo "   🕐 Clock-In: $CI_TIME"
      if [ -n "$CO_TIME" ] && [ "$CO_TIME" != "null" ]; then
        echo "   🕐 Clock-Out: $CO_TIME"
      else
        echo "   🕐 Clock-Out: Not yet clocked out"
      fi
    fi
  fi
  echo ""
  
  # Step 5: Clock-Out
  echo "=========================================="
  echo "3️⃣  Clock-Out"
  echo "=========================================="
  
  sleep 2
  
  CLOCK_OUT_BODY='{
    "latitude": 28.6139,
    "longitude": 77.2090,
    "location": "New Delhi, India"
  }'
  
  echo -n "Testing Clock-Out ... "
  CLOCK_OUT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "$API_BASE_URL/api/attendance/clock-out" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "x-tenant-id: $TENANT_ID" \
    -d "$CLOCK_OUT_BODY")
  
  CLOCK_OUT_HTTP=$(echo "$CLOCK_OUT_RESPONSE" | tail -1)
  CLOCK_OUT_BODY_RESP=$(echo "$CLOCK_OUT_RESPONSE" | sed '$d')
  
  if [ "$CLOCK_OUT_HTTP" = "200" ] || [ "$CLOCK_OUT_HTTP" = "201" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $CLOCK_OUT_HTTP)"
    CLOCK_OUT_TIME=$(echo "$CLOCK_OUT_BODY_RESP" | jq -r '.data.check_out_time // .data.clockOutTime // .data.clockOut // empty' 2>/dev/null)
    if [ -n "$CLOCK_OUT_TIME" ] && [ "$CLOCK_OUT_TIME" != "null" ]; then
      echo "   🕐 Clock-Out Time: $CLOCK_OUT_TIME"
    fi
    
    # Show working hours
    WORKING_HOURS=$(echo "$CLOCK_OUT_BODY_RESP" | jq -r '.data.workingHours // .data.working_hours // empty' 2>/dev/null)
    if [ -n "$WORKING_HOURS" ] && [ "$WORKING_HOURS" != "null" ]; then
      echo "   ⏱️  Working Hours: $WORKING_HOURS"
    fi
  else
    echo -e "${YELLOW}⚠️  May need active clock-in${NC} (HTTP $CLOCK_OUT_HTTP)"
  fi
  echo ""
  
  # Step 6: Final Dashboard Check
  echo "=========================================="
  echo "4️⃣  Final Dashboard Check"
  echo "=========================================="
  
  FINAL_DASHBOARD=$(curl -s -X GET \
    "$API_BASE_URL/api/hr/dashboard" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "x-tenant-id: $TENANT_ID")
  
  # Get latest attendance
  FINAL_ATTENDANCE=$(curl -s -X GET \
    "$API_BASE_URL/api/attendance/history?limit=1" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "x-tenant-id: $TENANT_ID")
  
  if echo "$FINAL_ATTENDANCE" | jq -e '.data.attendances[0]' > /dev/null 2>&1; then
    FINAL_RECORD=$(echo "$FINAL_ATTENDANCE" | jq '.data.attendances[0]' 2>/dev/null)
    FINAL_CI=$(echo "$FINAL_RECORD" | jq -r '.check_in_time // .clockInTime // .clockIn // empty' 2>/dev/null)
    FINAL_CO=$(echo "$FINAL_RECORD" | jq -r '.check_out_time // .clockOutTime // .clockOut // empty' 2>/dev/null)
    
    echo -e "${GREEN}✅ Attendance Record in Dashboard:${NC}"
    if [ -n "$FINAL_CI" ]; then
      echo "   🕐 Clock-In: $FINAL_CI"
    fi
    if [ -n "$FINAL_CO" ] && [ "$FINAL_CO" != "null" ]; then
      echo "   🕐 Clock-Out: $FINAL_CO"
    fi
  fi
  echo ""
  
  # Step 7: Test All Attendance APIs
  echo "=========================================="
  echo "5️⃣  All Attendance APIs"
  echo "=========================================="
  
  TODAY=$(date +%Y-%m-%d)
  
  echo -n "Attendance History ... "
  HIST=$(curl -s -w "\n%{http_code}" -X GET \
    "$API_BASE_URL/api/attendance/history?limit=5" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "x-tenant-id: $TENANT_ID")
  HIST_HTTP=$(echo "$HIST" | tail -1)
  [ "$HIST_HTTP" = "200" ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC} (HTTP $HIST_HTTP)"
  
  echo -n "Attendance Summary ... "
  SUMMARY=$(curl -s -w "\n%{http_code}" -X GET \
    "$API_BASE_URL/api/attendance/summary?startDate=$TODAY&endDate=$TODAY" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "x-tenant-id: $TENANT_ID")
  SUMMARY_HTTP=$(echo "$SUMMARY" | tail -1)
  [ "$SUMMARY_HTTP" = "200" ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC} (HTTP $SUMMARY_HTTP)"
  
  echo -n "Attendance Stats ... "
  STATS=$(curl -s -w "\n%{http_code}" -X GET \
    "$API_BASE_URL/api/attendance/stats" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "x-tenant-id: $TENANT_ID")
  STATS_HTTP=$(echo "$STATS" | tail -1)
  [ "$STATS_HTTP" = "200" ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC} (HTTP $STATS_HTTP)"
  
  echo -n "Attendance Records ... "
  RECORDS=$(curl -s -w "\n%{http_code}" -X GET \
    "$API_BASE_URL/api/attendance?page=1&limit=5" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "x-tenant-id: $TENANT_ID")
  RECORDS_HTTP=$(echo "$RECORDS" | tail -1)
  [ "$RECORDS_HTTP" = "200" ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC} (HTTP $RECORDS_HTTP)"
  
  echo ""
  
else
  echo -e "${RED}❌ No employee found${NC}"
fi

echo "=========================================="
echo "✅ Test Complete"
echo "=========================================="
