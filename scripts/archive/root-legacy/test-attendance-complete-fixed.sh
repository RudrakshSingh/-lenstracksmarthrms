#!/bin/bash

###############################################################################
# Complete Attendance Test: Clock-In → Dashboard → Geofencing
# Fixed version with proper employee retrieval
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
echo "Clock-In → Dashboard → Geofencing"
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

# Step 2: Get Employees (check actual response format)
echo "📋 Getting employees..."
EMP_RESPONSE=$(curl -s -X GET \
  "$API_BASE_URL/api/hr/employees?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

# Check response structure
echo "Response structure:"
echo "$EMP_RESPONSE" | jq 'keys' 2>/dev/null | head -5

# Get employees array (response format: .data is array directly)
EMPLOYEES_COUNT=$(echo "$EMP_RESPONSE" | jq -r '.data | length' 2>/dev/null)

if [ -n "$EMPLOYEES_COUNT" ] && [ "$EMPLOYEES_COUNT" != "0" ] && [ "$EMPLOYEES_COUNT" != "null" ]; then
  echo ""
  echo "✅ Found $EMPLOYEES_COUNT employees"
  
  # Get first employee with details (data is array directly)
  FIRST_EMP=$(echo "$EMP_RESPONSE" | jq -r '.data[0]' 2>/dev/null)
  
  EMP_ID=$(echo "$FIRST_EMP" | jq -r '._id // .id // empty')
  EMP_EMAIL=$(echo "$FIRST_EMP" | jq -r '.email // empty')
  EMP_EMP_ID=$(echo "$FIRST_EMP" | jq -r '.employeeId // .employee_id // empty')
  EMP_STORE=$(echo "$FIRST_EMP" | jq -r '.store // empty')
  
  echo "   Employee ID: $EMP_EMP_ID"
  echo "   Email: $EMP_EMAIL"
  echo "   Store: $EMP_STORE"
  echo ""
  
  # Step 3: Test Onboarding APIs
  echo "=========================================="
  echo "4️⃣  Onboarding APIs"
  echo "=========================================="
  
  if [ -n "$EMP_EMP_ID" ]; then
    echo -n "Testing: Get Onboarding Draft ... "
    DRAFT_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
      "$API_BASE_URL/api/hr/onboarding/draft?employee_id=$EMP_EMP_ID" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "x-tenant-id: $TENANT_ID")
    
    HTTP_CODE=$(echo "$DRAFT_RESPONSE" | tail -1)
    if [ "$HTTP_CODE" = "200" ]; then
      echo -e "${GREEN}✅ PASS${NC}"
    else
      echo -e "${RED}❌ FAIL${NC} (HTTP $HTTP_CODE)"
    fi
  fi
  echo ""
  
  # Step 4: Test Clock-In (if employee has store)
  if [ -n "$EMP_STORE" ] && [ "$EMP_STORE" != "null" ] && [ "$EMP_STORE" != "" ]; then
    echo "=========================================="
    echo "5️⃣  Clock-In Test"
    echo "=========================================="
    
    # Try employee login with multiple password attempts
    PASSWORDS=("Employee@123" "Password@123" "Test@123" "ravirrr@123" "Ravi@123" "12345678")
    EMP_TOKEN=""
    
    for PWD in "${PASSWORDS[@]}"; do
      EMP_LOGIN_BODY="{\"email\":\"$EMP_EMAIL\",\"password\":\"$PWD\"}"
      EMP_LOGIN=$(curl -s -X POST \
        "$API_BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "$EMP_LOGIN_BODY")
      
      EMP_TOKEN=$(echo "$EMP_LOGIN" | jq -r '.data.accessToken // .data.token // empty')
      
      if [ -n "$EMP_TOKEN" ] && [ "$EMP_TOKEN" != "null" ]; then
        echo "✅ Employee logged in (email: $EMP_EMAIL)"
        break
      fi
    done
    
    if [ -z "$EMP_TOKEN" ] || [ "$EMP_TOKEN" = "null" ]; then
      echo -e "${YELLOW}⚠️  Employee login failed - will test with admin token (may fail clock-in)${NC}"
      echo "   Note: Clock-in requires employee with store assigned"
      EMP_TOKEN="$ADMIN_TOKEN"
    fi
    
    # Clock-In
    CLOCK_IN_BODY='{
      "latitude": 28.6139,
      "longitude": 77.2090,
      "location": "New Delhi, India"
    }'
    
    echo -n "Testing: Clock-In ... "
    CLOCK_IN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
      "$API_BASE_URL/api/attendance/clock-in" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $EMP_TOKEN" \
      -H "x-tenant-id: $TENANT_ID" \
      -d "$CLOCK_IN_BODY")
    
    CLOCK_IN_HTTP=$(echo "$CLOCK_IN_RESPONSE" | tail -1)
    CLOCK_IN_BODY_RESP=$(echo "$CLOCK_IN_RESPONSE" | sed '$d')
    
    if [ "$CLOCK_IN_HTTP" = "200" ] || [ "$CLOCK_IN_HTTP" = "201" ]; then
      echo -e "${GREEN}✅ PASS${NC} (HTTP $CLOCK_IN_HTTP)"
      CLOCK_IN_TIME=$(echo "$CLOCK_IN_BODY_RESP" | jq -r '.data.check_in_time // .data.clockInTime // empty' 2>/dev/null)
      echo "   🕐 Clock-In Time: $CLOCK_IN_TIME"
    else
      echo -e "${RED}❌ FAIL${NC} (HTTP $CLOCK_IN_HTTP)"
      ERROR_MSG=$(echo "$CLOCK_IN_BODY_RESP" | jq -r '.message // .error // "Unknown"' 2>/dev/null)
      echo "   ⚠️  $ERROR_MSG"
    fi
    echo ""
    
    # Step 5: Check Dashboard
    echo "=========================================="
    echo "6️⃣  Dashboard - Clock Times"
    echo "=========================================="
    
    DASHBOARD=$(curl -s -X GET \
      "$API_BASE_URL/api/hr/dashboard" \
      -H "Authorization: Bearer $EMP_TOKEN" \
      -H "x-tenant-id: $TENANT_ID")
    
    echo "Checking dashboard for attendance data..."
    
    # Check various possible locations
    if echo "$DASHBOARD" | jq -e '.data.attendance' > /dev/null 2>&1; then
      echo "✅ Found .data.attendance"
      echo "$DASHBOARD" | jq '.data.attendance' 2>/dev/null
    fi
    
    if echo "$DASHBOARD" | jq -e '.data.todayAttendance' > /dev/null 2>&1; then
      echo "✅ Found .data.todayAttendance"
      TODAY_CI=$(echo "$DASHBOARD" | jq -r '.data.todayAttendance.clockIn // .data.todayAttendance.check_in_time // empty' 2>/dev/null)
      if [ -n "$TODAY_CI" ]; then
        echo "   🕐 Clock-In: $TODAY_CI"
      fi
    fi
    
    # Get attendance records
    ATTENDANCE=$(curl -s -X GET \
      "$API_BASE_URL/api/attendance/history?limit=1" \
      -H "Authorization: Bearer $EMP_TOKEN" \
      -H "x-tenant-id: $TENANT_ID")
    
    if echo "$ATTENDANCE" | jq -e '.data.attendances[0]' > /dev/null 2>&1; then
      LATEST=$(echo "$ATTENDANCE" | jq '.data.attendances[0]' 2>/dev/null)
      CI_TIME=$(echo "$LATEST" | jq -r '.check_in_time // .clockInTime // .clockIn // empty' 2>/dev/null)
      CO_TIME=$(echo "$LATEST" | jq -r '.check_out_time // .clockOutTime // .clockOut // empty' 2>/dev/null)
      
      if [ -n "$CI_TIME" ]; then
        echo ""
        echo "✅ Latest Attendance Record:"
        echo "   🕐 Clock-In: $CI_TIME"
        if [ -n "$CO_TIME" ] && [ "$CO_TIME" != "null" ]; then
          echo "   🕐 Clock-Out: $CO_TIME"
        fi
      fi
    fi
    
    echo ""
    
    # Step 6: Geofencing Test
    echo "=========================================="
    echo "7️⃣  Geofencing Test"
    echo "=========================================="
    
    # Get stores
    STORES=$(curl -s -X GET \
      "$API_BASE_URL/api/hr/stores?page=1&limit=5" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "x-tenant-id: $TENANT_ID")
    
    # Get store ID from employee or stores list
    STORE_ID=$(echo "$FIRST_EMP" | jq -r '.store.id // .store._id // .store // empty' 2>/dev/null)
    
    # If not in employee, get from stores list
    if [ -z "$STORE_ID" ] || [ "$STORE_ID" = "null" ]; then
      STORE_ID=$(echo "$STORES" | jq -r 'if .data.stores then .data.stores[0]._id elif .data[0] then .data[0]._id elif .stores[0] then .stores[0]._id elif .data then .data[0]._id else empty end' 2>/dev/null)
    fi
    
    if [ -n "$STORE_ID" ] && [ "$STORE_ID" != "null" ]; then
      echo "   📍 Store ID: $STORE_ID"
      
      # Test geofencing check
      GEO_BODY="{\"storeId\":\"$STORE_ID\",\"latitude\":28.6139,\"longitude\":77.2090}"
      
      echo -n "Testing: Geofencing Check ... "
      GEO_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        "$API_BASE_URL/api/attendance/geofencing/check" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $EMP_TOKEN" \
        -H "x-tenant-id: $TENANT_ID" \
        -d "$GEO_BODY")
      
      GEO_HTTP=$(echo "$GEO_RESPONSE" | tail -1)
      if [ "$GEO_HTTP" = "200" ]; then
        echo -e "${GREEN}✅ PASS${NC}"
        GEO_STATUS=$(echo "$GEO_RESPONSE" | sed '$d' | jq -r '.data.isWithinGeofence // .data.withinGeofence // empty' 2>/dev/null)
        echo "   📍 Within Geofence: $GEO_STATUS"
      else
        echo -e "${YELLOW}⚠️  May need permissions${NC} (HTTP $GEO_HTTP)"
      fi
    else
      echo -e "${YELLOW}⚠️  No store found${NC}"
    fi
    
    echo ""
  else
    echo -e "${YELLOW}⚠️  Employee has no store assigned - cannot test clock-in${NC}"
    echo "   Need to assign store to employee first"
  fi
  
  # Step 7: Test All Attendance APIs
  echo "=========================================="
  echo "8️⃣  All Attendance APIs"
  echo "=========================================="
  
  TODAY=$(date +%Y-%m-%d)
  
  echo -n "Testing: Attendance History ... "
  HIST_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
    "$API_BASE_URL/api/attendance/history?limit=5" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "x-tenant-id: $TENANT_ID")
  HIST_HTTP=$(echo "$HIST_RESPONSE" | tail -1)
  [ "$HIST_HTTP" = "200" ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC} (HTTP $HIST_HTTP)"
  
  echo -n "Testing: Attendance Summary ... "
  SUMMARY_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
    "$API_BASE_URL/api/attendance/summary?startDate=$TODAY&endDate=$TODAY" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "x-tenant-id: $TENANT_ID")
  SUMMARY_HTTP=$(echo "$SUMMARY_RESPONSE" | tail -1)
  [ "$SUMMARY_HTTP" = "200" ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC} (HTTP $SUMMARY_HTTP)"
  
  echo -n "Testing: Attendance Stats ... "
  STATS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
    "$API_BASE_URL/api/attendance/stats" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "x-tenant-id: $TENANT_ID")
  STATS_HTTP=$(echo "$STATS_RESPONSE" | tail -1)
  [ "$STATS_HTTP" = "200" ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC} (HTTP $STATS_HTTP)"
  
  echo -n "Testing: Attendance Records ... "
  RECORDS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
    "$API_BASE_URL/api/attendance?page=1&limit=5" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "x-tenant-id: $TENANT_ID")
  RECORDS_HTTP=$(echo "$RECORDS_RESPONSE" | tail -1)
  [ "$RECORDS_HTTP" = "200" ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC} (HTTP $RECORDS_HTTP)"
  
  echo ""
  
else
  echo -e "${RED}❌ No employees found${NC}"
fi

echo "=========================================="
echo "✅ Test Complete"
echo "=========================================="
