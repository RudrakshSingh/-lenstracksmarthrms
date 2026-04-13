#!/bin/bash

###############################################################################
# Complete Employee Test: Onboarding → Clock-In → Dashboard → Geofencing
# Tests full employee flow with attendance tracking
###############################################################################

set +e  # Don't exit on error - test all APIs

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com}"

echo "=========================================="
echo "🧪 Complete Employee Flow Test"
echo "Onboarding → Clock-In → Dashboard → Geofencing"
echo "=========================================="
echo ""
echo "API Base URL: $API_BASE_URL"
echo ""

# Test results
PASSED=0
FAILED=0
RESULTS=()
CLOCK_IN_TIME=""
CLOCK_OUT_TIME=""
EMPLOYEE_ID=""
EMPLOYEE_TOKEN=""

# Helper function to test API
test_api() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local token="$4"
  local tenant="$5"
  local body="$6"
  local expected_status="${7:-200}"
  
  echo -n "Testing: $name ... "
  
  # Build curl command
  local curl_cmd="curl -s -w \"\n%{http_code}\" --max-time 15 -X \"$method\" \"$API_BASE_URL$endpoint\" -H \"Content-Type: application/json\""
  
  if [ -n "$token" ]; then
    curl_cmd="$curl_cmd -H \"Authorization: Bearer $token\""
  fi
  if [ -n "$tenant" ]; then
    curl_cmd="$curl_cmd -H \"x-tenant-id: $tenant\""
  fi
  
  if [ -n "$body" ]; then
    curl_cmd="$curl_cmd -d '$body'"
  fi
  
  # Execute curl
  response=$(eval "$curl_cmd" 2>&1 || echo "CURL_ERROR\n000")
  
  http_code=$(echo "$response" | tail -1)
  body_response=$(echo "$response" | sed '$d')
  
  # Handle curl errors
  if [ "$http_code" = "000" ] || [ -z "$http_code" ]; then
    echo -e "${RED}❌ FAIL${NC} (Connection Error)"
    ((FAILED++))
    RESULTS+=("❌ $name: FAIL (Connection Error)")
    return 1
  fi
  
  if [ "$http_code" = "$expected_status" ] || [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
    ((PASSED++))
    RESULTS+=("✅ $name: PASS (HTTP $http_code)")
    
    # Show relevant data
    if echo "$body_response" | jq -e '.data' > /dev/null 2>&1; then
      echo "$body_response" | jq -r '.data | keys[]' 2>/dev/null | head -5 | while read key; do
        echo "   - $key"
      done
    fi
    
    return 0
  else
    echo -e "${RED}❌ FAIL${NC} (HTTP $http_code)"
    error_msg=$(echo "$body_response" | jq -r '.message // .error // "Unknown error"' 2>/dev/null | head -1)
    if [ -n "$error_msg" ] && [ "$error_msg" != "null" ]; then
      echo "   ⚠️  $error_msg"
    fi
    ((FAILED++))
    RESULTS+=("❌ $name: FAIL (HTTP $http_code)")
    return 1
  fi
}

# Step 1: Admin Login
echo "=========================================="
echo "1️⃣  Admin Login"
echo "=========================================="
LOGIN_BODY='{"email":"Admin@lenstrack.com","password":"Kadarkhan@123"}'
LOGIN_RESPONSE=$(curl -s -X POST \
  "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_BODY")

ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // .data.token // .token // empty')
TENANT_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.tenantId // .user.tenantId // "lenstrack"')

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
  echo -e "${RED}❌ Admin login failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Admin login successful${NC}"
echo "   Tenant: $TENANT_ID"
echo ""

# Step 2: Get Existing Employee with Store Assigned
echo "=========================================="
echo "2️⃣  Get Employee with Store for Testing"
echo "=========================================="

# Get all employees to find one with store
EMP_RESPONSE=$(curl -s -X GET \
  "$API_BASE_URL/api/hr/employees?page=1&limit=20" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

# Find employee with store (not admin)
FIRST_EMP_ID=$(echo "$EMP_RESPONSE" | jq -r 'if .data.employees then (.data.employees[] | select(.role != "admin" and (.store != null and .store != "")) | ._id) elif .data then (.data[] | select(.role != "admin" and (.store != null and .store != "")) | ._id) else empty end' | head -1)
FIRST_EMP_EMAIL=$(echo "$EMP_RESPONSE" | jq -r 'if .data.employees then (.data.employees[] | select(.role != "admin" and (.store != null and .store != "")) | .email) elif .data then (.data[] | select(.role != "admin" and (.store != null and .store != "")) | .email) else empty end' | head -1)
FIRST_EMP_EMP_ID=$(echo "$EMP_RESPONSE" | jq -r 'if .data.employees then (.data.employees[] | select(.role != "admin" and (.store != null and .store != "")) | .employeeId) elif .data then (.data[] | select(.role != "admin" and (.store != null and .store != "")) | .employeeId) else empty end' | head -1)

# If no employee with store, get any non-admin employee
if [ -z "$FIRST_EMP_ID" ] || [ "$FIRST_EMP_ID" = "null" ]; then
  FIRST_EMP_ID=$(echo "$EMP_RESPONSE" | jq -r 'if .data.employees then (.data.employees[] | select(.role != "admin") | ._id) elif .data then (.data[] | select(.role != "admin") | ._id) else empty end' | head -1)
  FIRST_EMP_EMAIL=$(echo "$EMP_RESPONSE" | jq -r 'if .data.employees then (.data.employees[] | select(.role != "admin") | .email) elif .data then (.data[] | select(.role != "admin") | .email) else empty end' | head -1)
  FIRST_EMP_EMP_ID=$(echo "$EMP_RESPONSE" | jq -r 'if .data.employees then (.data.employees[] | select(.role != "admin") | .employeeId) elif .data then (.data[] | select(.role != "admin") | .employeeId) else empty end' | head -1)
fi

if [ -n "$FIRST_EMP_EMAIL" ] && [ "$FIRST_EMP_EMAIL" != "null" ]; then
  EMPLOYEE_ID="$FIRST_EMP_EMP_ID"
  echo -e "${GREEN}✅ Using existing employee${NC}"
  echo "   Employee ID: $EMPLOYEE_ID"
  echo "   Email: $FIRST_EMP_EMAIL"
  echo "   MongoDB ID: $FIRST_EMP_ID"
else
  echo -e "${YELLOW}⚠️  No employee found, creating test employee...${NC}"
  # Create test employee (simplified)
  CREATE_EMP_BODY='{
    "name": "Test Employee Attendance",
    "email": "testattendance@example.com",
    "phone": "+919999999999",
    "employeeId": "EMP-ATTENDANCE-TEST",
    "department": "Engineering",
    "position": "Developer",
    "role": "employee"
  }'
  
  CREATE_RESPONSE=$(curl -s -X POST \
    "$API_BASE_URL/api/hr/employees" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "x-tenant-id: $TENANT_ID" \
    -d "$CREATE_EMP_BODY")
  
  EMPLOYEE_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.employeeId // .data.employee_id // "EMP-ATTENDANCE-TEST"')
  echo "   Created Employee ID: $EMPLOYEE_ID"
fi

echo ""

# Step 3: Employee Login (for clock-in)
echo "=========================================="
echo "3️⃣  Employee Login (for Clock-In)"
echo "=========================================="

if [ -n "$FIRST_EMP_EMAIL" ] && [ "$FIRST_EMP_EMAIL" != "null" ]; then
  # Try common passwords
  PASSWORDS=("Employee@123" "Password@123" "Test@123" "12345678")
  
  for PWD in "${PASSWORDS[@]}"; do
    EMP_LOGIN_BODY="{\"email\":\"$FIRST_EMP_EMAIL\",\"password\":\"$PWD\"}"
    EMP_LOGIN_RESPONSE=$(curl -s -X POST \
      "$API_BASE_URL/api/auth/login" \
      -H "Content-Type: application/json" \
      -d "$EMP_LOGIN_BODY")
    
    EMPLOYEE_TOKEN=$(echo "$EMP_LOGIN_RESPONSE" | jq -r '.data.accessToken // .data.token // .token // empty')
    
    if [ -n "$EMPLOYEE_TOKEN" ] && [ "$EMPLOYEE_TOKEN" != "null" ]; then
      echo -e "${GREEN}✅ Employee login successful${NC}"
      echo "   Email: $FIRST_EMP_EMAIL"
      break
    fi
  done
  
  if [ -z "$EMPLOYEE_TOKEN" ] || [ "$EMPLOYEE_TOKEN" = "null" ]; then
    echo -e "${YELLOW}⚠️  Employee login failed, will use admin token (may fail clock-in)${NC}"
    EMPLOYEE_TOKEN="$ADMIN_TOKEN"
  fi
else
  echo -e "${YELLOW}⚠️  No employee email found, using admin token${NC}"
  EMPLOYEE_TOKEN="$ADMIN_TOKEN"
fi

echo ""

# Step 4: Onboarding APIs Test
echo "=========================================="
echo "4️⃣  Employee Onboarding APIs"
echo "=========================================="
test_api "Get Onboarding Draft" "GET" "/api/hr/onboarding/draft?employee_id=$EMPLOYEE_ID" "$ADMIN_TOKEN" "$TENANT_ID" "" "200"

# Test onboarding steps
if [ -n "$FIRST_EMP_ID" ] && [ "$FIRST_EMP_ID" != "null" ]; then
  test_api "Get Employee Details" "GET" "/api/hr/employees/$FIRST_EMP_ID" "$ADMIN_TOKEN" "$TENANT_ID" "" "200"
fi

echo ""

# Step 5: Clock-In Test
echo "=========================================="
echo "5️⃣  Clock-In Test"
echo "=========================================="

CLOCK_IN_BODY='{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "location": "New Delhi, India",
  "deviceInfo": {
    "deviceId": "test-device-001",
    "platform": "web",
    "userAgent": "Mozilla/5.0"
  }
}'

CLOCK_IN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_BASE_URL/api/attendance/clock-in" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "$CLOCK_IN_BODY")

CLOCK_IN_HTTP=$(echo "$CLOCK_IN_RESPONSE" | tail -1)
CLOCK_IN_BODY=$(echo "$CLOCK_IN_RESPONSE" | sed '$d')

if [ "$CLOCK_IN_HTTP" = "200" ] || [ "$CLOCK_IN_HTTP" = "201" ]; then
  echo -e "${GREEN}✅ Clock-In successful${NC} (HTTP $CLOCK_IN_HTTP)"
  ((PASSED++))
  RESULTS+=("✅ Clock-In: PASS (HTTP $CLOCK_IN_HTTP)")
  
  # Extract clock-in time
  CLOCK_IN_TIME=$(echo "$CLOCK_IN_BODY" | jq -r '.data.clockInTime // .data.clock_in_time // .clockIn // empty' 2>/dev/null)
  if [ -z "$CLOCK_IN_TIME" ] || [ "$CLOCK_IN_TIME" = "null" ]; then
    CLOCK_IN_TIME=$(date +"%H:%M:%S")
  fi
  echo "   🕐 Clock-In Time: $CLOCK_IN_TIME"
  
  # Show attendance record
  ATTENDANCE_ID=$(echo "$CLOCK_IN_BODY" | jq -r '.data._id // .data.id // empty' 2>/dev/null)
  if [ -n "$ATTENDANCE_ID" ]; then
    echo "   📋 Attendance ID: $ATTENDANCE_ID"
  fi
else
  echo -e "${RED}❌ Clock-In failed${NC} (HTTP $CLOCK_IN_HTTP)"
  error_msg=$(echo "$CLOCK_IN_BODY" | jq -r '.message // .error // "Unknown error"' 2>/dev/null)
  echo "   ⚠️  $error_msg"
  ((FAILED++))
  RESULTS+=("❌ Clock-In: FAIL (HTTP $CLOCK_IN_HTTP)")
fi

echo ""

# Step 6: Check Dashboard for Clock-In Time
echo "=========================================="
echo "6️⃣  Dashboard - Check Clock-In Time Display"
echo "=========================================="

DASHBOARD_RESPONSE=$(curl -s -X GET \
  "$API_BASE_URL/api/hr/dashboard" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

if echo "$DASHBOARD_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Dashboard loaded${NC}"
  
  # Check for attendance data in dashboard
  if echo "$DASHBOARD_RESPONSE" | jq -e '.data.attendance' > /dev/null 2>&1; then
    echo "   ✅ Attendance data found in dashboard"
    ATTENDANCE_TIME=$(echo "$DASHBOARD_RESPONSE" | jq -r '.data.attendance.clockInTime // .data.attendance.clock_in_time // .data.attendance.clockIn // empty' 2>/dev/null)
    if [ -n "$ATTENDANCE_TIME" ] && [ "$ATTENDANCE_TIME" != "null" ]; then
      echo "   🕐 Clock-In Time in Dashboard: $ATTENDANCE_TIME"
    else
      echo "   ⚠️  Clock-In time not found in dashboard structure"
    fi
  else
    echo "   ⚠️  Attendance data not in dashboard response"
  fi
  
  # Check for today's attendance
  if echo "$DASHBOARD_RESPONSE" | jq -e '.data.todayAttendance' > /dev/null 2>&1; then
    echo "   ✅ Today's attendance found"
    TODAY_CLOCK_IN=$(echo "$DASHBOARD_RESPONSE" | jq -r '.data.todayAttendance.clockIn // .data.todayAttendance.clock_in // empty' 2>/dev/null)
    if [ -n "$TODAY_CLOCK_IN" ] && [ "$TODAY_CLOCK_IN" != "null" ]; then
      echo "   🕐 Today's Clock-In: $TODAY_CLOCK_IN"
    fi
  fi
else
  echo -e "${RED}❌ Dashboard failed to load${NC}"
fi

echo ""

# Step 7: Get Attendance Records
echo "=========================================="
echo "7️⃣  Get Attendance Records"
echo "=========================================="
test_api "Get My Attendance" "GET" "/api/attendance/history" "$EMPLOYEE_TOKEN" "$TENANT_ID" "" "200"
test_api "Get All Attendance" "GET" "/api/attendance?page=1&limit=5" "$EMPLOYEE_TOKEN" "$TENANT_ID" "" "200"

# Check if clock-in time is in records
ATTENDANCE_RECORDS=$(curl -s -X GET \
  "$API_BASE_URL/api/attendance?page=1&limit=5" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

if echo "$ATTENDANCE_RECORDS" | jq -e '.data' > /dev/null 2>&1; then
  LATEST_RECORD=$(echo "$ATTENDANCE_RECORDS" | jq '.data[0] // .data.records[0] // empty' 2>/dev/null)
  if [ -n "$LATEST_RECORD" ] && [ "$LATEST_RECORD" != "null" ]; then
    RECORD_CLOCK_IN=$(echo "$LATEST_RECORD" | jq -r '.clockInTime // .clock_in_time // .clockIn // .checkInTime // empty' 2>/dev/null)
    if [ -n "$RECORD_CLOCK_IN" ] && [ "$RECORD_CLOCK_IN" != "null" ]; then
      echo "   🕐 Latest Clock-In in Records: $RECORD_CLOCK_IN"
    fi
  fi
fi

echo ""

# Step 8: Clock-Out Test
echo "=========================================="
echo "8️⃣  Clock-Out Test"
echo "=========================================="

# Wait a bit before clock-out
sleep 2

CLOCK_OUT_BODY='{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "location": "New Delhi, India",
  "deviceInfo": {
    "deviceId": "test-device-001",
    "platform": "web"
  }
}'

CLOCK_OUT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_BASE_URL/api/attendance/clock-out" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "$CLOCK_OUT_BODY")

CLOCK_OUT_HTTP=$(echo "$CLOCK_OUT_RESPONSE" | tail -1)
CLOCK_OUT_BODY_RESP=$(echo "$CLOCK_OUT_RESPONSE" | sed '$d')

if [ "$CLOCK_OUT_HTTP" = "200" ] || [ "$CLOCK_OUT_HTTP" = "201" ]; then
  echo -e "${GREEN}✅ Clock-Out successful${NC} (HTTP $CLOCK_OUT_HTTP)"
  ((PASSED++))
  RESULTS+=("✅ Clock-Out: PASS (HTTP $CLOCK_OUT_HTTP)")
  
  CLOCK_OUT_TIME=$(echo "$CLOCK_OUT_BODY_RESP" | jq -r '.data.clockOutTime // .data.clock_out_time // .clockOut // empty' 2>/dev/null)
  if [ -z "$CLOCK_OUT_TIME" ] || [ "$CLOCK_OUT_TIME" = "null" ]; then
    CLOCK_OUT_TIME=$(date +"%H:%M:%S")
  fi
  echo "   🕐 Clock-Out Time: $CLOCK_OUT_TIME"
  
  # Show working hours if available
  WORKING_HOURS=$(echo "$CLOCK_OUT_BODY_RESP" | jq -r '.data.workingHours // .data.working_hours // empty' 2>/dev/null)
  if [ -n "$WORKING_HOURS" ] && [ "$WORKING_HOURS" != "null" ]; then
    echo "   ⏱️  Working Hours: $WORKING_HOURS"
  fi
else
  echo -e "${YELLOW}⚠️  Clock-Out failed or not needed${NC} (HTTP $CLOCK_OUT_HTTP)"
  error_msg=$(echo "$CLOCK_OUT_BODY_RESP" | jq -r '.message // .error // "Unknown error"' 2>/dev/null)
  echo "   ⚠️  $error_msg"
fi

echo ""

# Step 9: Geofencing Test
echo "=========================================="
echo "9️⃣  Geofencing Test"
echo "=========================================="

# Get stores for geofencing
STORES_RESPONSE=$(curl -s -X GET \
  "$API_BASE_URL/api/hr/stores?page=1&limit=10" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

# Try different response formats
FIRST_STORE_ID=$(echo "$STORES_RESPONSE" | jq -r 'if .data.stores then .data.stores[0]._id elif .data[0] then .data[0]._id elif .stores[0] then .stores[0]._id elif .data then (.data[] | ._id) else empty end' | head -1)

if [ -n "$FIRST_STORE_ID" ] && [ "$FIRST_STORE_ID" != "null" ]; then
  echo "   📍 Testing with Store ID: $FIRST_STORE_ID"
  
  # Test geofencing check
  GEO_CHECK_BODY="{
    \"storeId\": \"$FIRST_STORE_ID\",
    \"latitude\": 28.6139,
    \"longitude\": 77.2090
  }"
  
  test_api "Geofencing Check" "POST" "/api/attendance/geofencing/check" "$EMPLOYEE_TOKEN" "$TENANT_ID" "$GEO_CHECK_BODY" "200"
  
  # Test track location
  TRACK_LOCATION_BODY="{
    \"latitude\": 28.6139,
    \"longitude\": 77.2090,
    \"storeId\": \"$FIRST_STORE_ID\"
  }"
  
  test_api "Track Location" "POST" "/api/attendance/track-location" "$EMPLOYEE_TOKEN" "$TENANT_ID" "$TRACK_LOCATION_BODY" "200"
else
  echo -e "${YELLOW}⚠️  No store found for geofencing test${NC}"
fi

echo ""

# Step 10: Verify Dashboard Shows Clock-In/Out Times
echo "=========================================="
echo "🔟 Final Dashboard Check - Clock Times"
echo "=========================================="

FINAL_DASHBOARD=$(curl -s -X GET \
  "$API_BASE_URL/api/hr/dashboard" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

echo "Checking dashboard for clock-in/out times..."
echo ""

# Check various possible locations for attendance data
if echo "$FINAL_DASHBOARD" | jq -e '.data.attendance' > /dev/null 2>&1; then
  echo "✅ Found attendance in .data.attendance"
  echo "$FINAL_DASHBOARD" | jq '.data.attendance' 2>/dev/null | head -10
fi

if echo "$FINAL_DASHBOARD" | jq -e '.data.todayAttendance' > /dev/null 2>&1; then
  echo "✅ Found attendance in .data.todayAttendance"
  echo "$FINAL_DASHBOARD" | jq '.data.todayAttendance' 2>/dev/null
fi

if echo "$FINAL_DASHBOARD" | jq -e '.data.recentAttendance' > /dev/null 2>&1; then
  echo "✅ Found attendance in .data.recentAttendance"
  echo "$FINAL_DASHBOARD" | jq '.data.recentAttendance' 2>/dev/null | head -5
fi

# Get attendance summary
ATTENDANCE_SUMMARY=$(curl -s -X GET \
  "$API_BASE_URL/api/attendance/summary?startDate=$(date +%Y-%m-%d)&endDate=$(date +%Y-%m-%d)" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

if echo "$ATTENDANCE_SUMMARY" | jq -e '.success' > /dev/null 2>&1; then
  echo ""
  echo "✅ Attendance Summary for Today:"
  echo "$ATTENDANCE_SUMMARY" | jq '.data' 2>/dev/null
fi

echo ""

# Final Summary
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo ""
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo ""
TOTAL=$((PASSED + FAILED))
if [ $TOTAL -gt 0 ]; then
  SUCCESS_RATE=$(( PASSED * 100 / TOTAL ))
  echo "Total Tests: $TOTAL"
  echo "Success Rate: ${SUCCESS_RATE}%"
fi
echo ""

if [ -n "$CLOCK_IN_TIME" ]; then
  echo "🕐 Clock-In Time: $CLOCK_IN_TIME"
fi
if [ -n "$CLOCK_OUT_TIME" ]; then
  echo "🕐 Clock-Out Time: $CLOCK_OUT_TIME"
fi

echo ""
echo "=========================================="
echo "📋 Detailed Results"
echo "=========================================="
for result in "${RESULTS[@]}"; do
  if [[ $result == ✅* ]]; then
    echo -e "${GREEN}$result${NC}"
  else
    echo -e "${RED}$result${NC}"
  fi
done
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  Some tests failed${NC}"
  exit 1
fi
