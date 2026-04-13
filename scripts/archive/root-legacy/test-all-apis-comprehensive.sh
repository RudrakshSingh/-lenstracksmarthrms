#!/bin/bash

# Comprehensive API Test Script
# Tests all APIs we've built/fixed

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com}"
EMAIL="${EMAIL:-raviraikwar10022001@gmail.com}"
PASSWORD="${PASSWORD:-es93ayq8A1!}"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test results
declare -a FAILED_ENDPOINTS=()

echo ""
echo "=========================================="
echo "🧪 Comprehensive API Test Suite"
echo "=========================================="
echo ""
echo "🌐 Base URL: $BASE_URL"
echo "👤 Email: $EMAIL"
echo ""

# Function to run a test
test_endpoint() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local headers="$4"
  local data="$5"
  local expected_status="${6:-200}"
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  echo -n "Testing: $name ... "
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" \
      -H "$headers" 2>&1)
  elif [ "$method" = "POST" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
      -H "$headers" \
      -H "Content-Type: application/json" \
      -d "$data" 2>&1)
  elif [ "$method" = "PUT" ]; then
    response=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL$endpoint" \
      -H "$headers" \
      -H "Content-Type: application/json" \
      -d "$data" 2>&1)
  elif [ "$method" = "DELETE" ]; then
    response=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL$endpoint" \
      -H "$headers" 2>&1)
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "$expected_status" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    return 0
  else
    echo -e "${RED}❌ FAIL${NC} (Expected $expected_status, got $http_code)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    FAILED_ENDPOINTS+=("$name: $method $endpoint (Expected $expected_status, got $http_code)")
    echo "$body" | jq '.' 2>/dev/null || echo "$body" | head -3
    return 1
  fi
}

# Step 1: Login
echo "=========================================="
echo "1️⃣  Authentication APIs"
echo "=========================================="
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // empty')
TENANT_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.tenantId // "default"')
EMPLOYEE_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.employee_id // .data.user.employeeId // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ] || [ "$TOKEN" = "" ]; then
  echo -e "${RED}❌ Login failed! Cannot continue tests.${NC}"
  echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo "   Employee ID: $EMPLOYEE_ID"
echo "   Tenant ID: $TENANT_ID"
echo ""

AUTH_HEADER="Authorization: Bearer $TOKEN"
TENANT_HEADER="X-Tenant-Id: $TENANT_ID"
HEADERS="$AUTH_HEADER\n$TENANT_HEADER"

# Step 2: Attendance APIs
echo "=========================================="
echo "2️⃣  Attendance APIs"
echo "=========================================="
echo ""

# Clock out first (if needed)
echo "Preparing: Clocking out if needed..."
curl -s -X POST "$BASE_URL/api/attendance/clock-out" \
  -H "$AUTH_HEADER" \
  -H "$TENANT_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"latitude":28.6139,"longitude":77.209,"notes":"Prep"}' > /dev/null 2>&1
sleep 2

# Clock In
test_endpoint "Clock In" "POST" "/api/attendance/clock-in" \
  "$AUTH_HEADER
$TENANT_HEADER" \
  '{"latitude":28.6139,"longitude":77.209,"notes":"API test"}'

sleep 2

# Today's Attendance
test_endpoint "Today's Attendance" "GET" "/api/attendance/today?employeeId=$EMPLOYEE_ID&date=$(date +%Y-%m-%d)" \
  "$AUTH_HEADER
$TENANT_HEADER"

# Today's Attendance (without date)
test_endpoint "Today's Attendance (no date)" "GET" "/api/attendance/today?employeeId=$EMPLOYEE_ID" \
  "$AUTH_HEADER
$TENANT_HEADER"

# Clock Out
test_endpoint "Clock Out" "POST" "/api/attendance/clock-out" \
  "$AUTH_HEADER
$TENANT_HEADER" \
  '{"latitude":28.6139,"longitude":77.209,"notes":"API test"}'

sleep 2

# Attendance Records
test_endpoint "Attendance Records" "GET" "/api/attendance/records?page=1&limit=10" \
  "$AUTH_HEADER
$TENANT_HEADER"

# Attendance Summary
test_endpoint "Attendance Summary" "GET" "/api/attendance/summary?startDate=$(date -d '7 days ago' +%Y-%m-%d)&endDate=$(date +%Y-%m-%d)" \
  "$AUTH_HEADER
$TENANT_HEADER"

# Attendance Stats
test_endpoint "Attendance Stats" "GET" "/api/attendance/stats" \
  "$AUTH_HEADER
$TENANT_HEADER"

echo ""

# Step 3: HR APIs
echo "=========================================="
echo "3️⃣  HR Service APIs"
echo "=========================================="
echo ""

# Time Tracking
test_endpoint "Time Tracking" "GET" "/api/hr/time-tracking?employeeId=$EMPLOYEE_ID&date=$(date +%Y-%m-%d)" \
  "$AUTH_HEADER
$TENANT_HEADER"

# Employee Details
if [ -n "$EMPLOYEE_ID" ]; then
  test_endpoint "Get Employee" "GET" "/api/hr/employees/$EMPLOYEE_ID" \
    "$AUTH_HEADER
$TENANT_HEADER"
fi

# Employee List
test_endpoint "Employee List" "GET" "/api/hr/employees?page=1&limit=10" \
  "$AUTH_HEADER
$TENANT_HEADER"

echo ""

# Step 4: Roster APIs
echo "=========================================="
echo "4️⃣  Roster APIs"
echo "=========================================="
echo ""

# Get Roster
test_endpoint "Get Roster" "GET" "/api/hr/roster?startDate=$(date +%Y-%m-%d)&endDate=$(date -d '+7 days' +%Y-%m-%d)" \
  "$AUTH_HEADER
$TENANT_HEADER"

# Roster Settings
test_endpoint "Roster Settings" "GET" "/api/hr/roster/settings" \
  "$AUTH_HEADER
$TENANT_HEADER"

# Unified Workday
test_endpoint "Unified Workday" "GET" "/api/workday/unified?date=$(date +%Y-%m-%d)" \
  "$AUTH_HEADER
$TENANT_HEADER"

echo ""

# Step 5: Dashboard APIs
echo "=========================================="
echo "5️⃣  Dashboard APIs"
echo "=========================================="
echo ""

# Employee Dashboard
if [ -n "$EMPLOYEE_ID" ]; then
  test_endpoint "Employee Dashboard" "GET" "/api/dashboard/employee/$EMPLOYEE_ID" \
    "$AUTH_HEADER
$TENANT_HEADER"
fi

echo ""

# Step 6: Health Check APIs
echo "=========================================="
echo "6️⃣  Health Check APIs"
echo "=========================================="
echo ""

# Attendance Health
test_endpoint "Attendance Health" "GET" "/api/attendance/health" \
  "$AUTH_HEADER
$TENANT_HEADER"

# Attendance Status
test_endpoint "Attendance Status" "GET" "/api/attendance/status" \
  "$AUTH_HEADER
$TENANT_HEADER"

echo ""

# Final Summary
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -gt 0 ]; then
  echo -e "${RED}❌ Failed Endpoints:${NC}"
  for endpoint in "${FAILED_ENDPOINTS[@]}"; do
    echo "   - $endpoint"
  done
  echo ""
  exit 1
else
  echo -e "${GREEN}✅ All tests passed!${NC}"
  echo ""
  exit 0
fi
