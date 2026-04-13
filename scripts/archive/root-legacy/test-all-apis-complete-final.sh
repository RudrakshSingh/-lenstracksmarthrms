#!/bin/bash

# Complete API Test Script - All APIs
# Tests all APIs we've created and fixed

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com}"
EMAIL="${EMAIL:-lenstrack01@gmail.com}"
PASSWORD="${PASSWORD:-cnbxs2b9A1!}"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo ""
echo "=========================================="
echo "🧪 Complete API Test Suite"
echo "=========================================="
echo ""
echo "Base URL: $BASE_URL"
echo "Email: $EMAIL"
echo ""

# Function to run test
test_api() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"
  local expected_status="${5:-200}"
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  echo -n "Testing: $name... "
  
  if [ -z "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "X-Tenant-Id: $TENANT_ID" \
      -H "Content-Type: application/json" 2>&1)
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "X-Tenant-Id: $TENANT_ID" \
      -H "Content-Type: application/json" \
      -d "$data" 2>&1)
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -eq "$expected_status" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    return 0
  else
    echo -e "${RED}❌ FAIL${NC} (HTTP $http_code, expected $expected_status)"
    echo "   Response: $(echo "$body" | jq -r '.message // .error // "Unknown error"' 2>/dev/null || echo "$body" | head -1)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    return 1
  fi
}

# Step 1: Login
echo "🔐 Step 1: Authentication"
echo "----------------------------------------"
echo -n "Logging in... "

login_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$login_response" | jq -r '.data.accessToken // empty')
TENANT_ID=$(echo "$login_response" | jq -r '.data.user.tenantId // "default"')
EMPLOYEE_ID=$(echo "$login_response" | jq -r '.data.user.employee_id // .data.user.employeeId // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ FAILED${NC}"
  echo "Login failed. Response:"
  echo "$login_response" | jq '.' 2>/dev/null || echo "$login_response"
  exit 1
fi

echo -e "${GREEN}✅ SUCCESS${NC}"
echo "   Employee ID: $EMPLOYEE_ID"
echo "   Tenant ID: $TENANT_ID"
echo ""

# Step 2: Health Checks
echo "🏥 Step 2: Health Checks"
echo "----------------------------------------"
test_api "Auth Health" "GET" "/api/auth/health" "" 200
test_api "HR Health" "GET" "/api/hr/health" "" 200
test_api "Attendance Health" "GET" "/api/attendance/health" "" 200
echo ""

# Step 3: Auth APIs
echo "🔐 Step 3: Auth APIs"
echo "----------------------------------------"
test_api "Get Current User" "GET" "/api/auth/me" "" 200
echo ""

# Step 4: Attendance APIs
echo "⏰ Step 4: Attendance APIs"
echo "----------------------------------------"
DATE=$(date +%Y-%m-%d)

# Clock out first (if needed)
echo -n "Preparing (clock out if needed)... "
curl -s -X POST "$BASE_URL/api/attendance/clock-out" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"latitude":28.6139,"longitude":77.209,"notes":"Prep"}' > /dev/null 2>&1
sleep 1
echo "Done"

test_api "Clock In" "POST" "/api/attendance/clock-in" \
  '{"latitude":28.6139,"longitude":77.209,"notes":"API test"}' 201

sleep 2

test_api "Today Attendance" "GET" "/api/attendance/today?employeeId=$EMPLOYEE_ID&date=$DATE" "" 200

test_api "Today Attendance (no date)" "GET" "/api/attendance/today?employeeId=$EMPLOYEE_ID" "" 200

test_api "Attendance Records" "GET" "/api/attendance?employeeId=$EMPLOYEE_ID&limit=5" "" 200

test_api "Attendance Summary" "GET" "/api/attendance/summary?startDate=$DATE&endDate=$DATE" "" 200

test_api "Clock Out" "POST" "/api/attendance/clock-out" \
  '{"latitude":28.6139,"longitude":77.209,"notes":"API test"}' 200

echo ""

# Step 5: HR Employee APIs
echo "👥 Step 5: HR Employee APIs"
echo "----------------------------------------"
test_api "List Employees" "GET" "/api/hr/employees?limit=5" "" 200

if [ ! -z "$EMPLOYEE_ID" ] && [ "$EMPLOYEE_ID" != "null" ]; then
  # Try to get employee by ID
  test_api "Get Employee by ID" "GET" "/api/hr/employees/$EMPLOYEE_ID" "" 200
fi

echo ""

# Step 6: HR Department APIs
echo "🏢 Step 6: HR Department APIs"
echo "----------------------------------------"
test_api "List Departments" "GET" "/api/hr/departments" "" 200
echo ""

# Step 7: HR Store APIs
echo "🏪 Step 7: HR Store APIs"
echo "----------------------------------------"
test_api "List Stores" "GET" "/api/hr/stores" "" 200
echo ""

# Step 8: HR Dashboard APIs
echo "📊 Step 8: HR Dashboard APIs"
echo "----------------------------------------"
test_api "Dashboard Stats" "GET" "/api/hr/dashboard/stats" "" 200
test_api "Dashboard Departments" "GET" "/api/hr/dashboard/departments" "" 200
test_api "Unified Dashboard" "GET" "/api/hr/dashboard" "" 200
echo ""

# Step 9: HR Time Tracking APIs
echo "⏱️  Step 9: HR Time Tracking APIs"
echo "----------------------------------------"
test_api "Time Tracking" "GET" "/api/hr/time-tracking?employeeId=$EMPLOYEE_ID&date=$DATE" "" 200
echo ""

# Step 10: Roster APIs
echo "📅 Step 10: Roster APIs"
echo "----------------------------------------"
test_api "List Roster" "GET" "/api/hr/roster?limit=5" "" 200
test_api "Roster Settings" "GET" "/api/hr/roster/settings" "" 200
echo ""

# Step 11: Attendance Status APIs
echo "📋 Step 11: Attendance Status APIs"
echo "----------------------------------------"
test_api "Attendance Status" "GET" "/api/attendance/status" "" 200
test_api "Attendance Stats" "GET" "/api/attendance/stats" "" 200
echo ""

# Summary
echo ""
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  Some tests failed. Check output above.${NC}"
  exit 1
fi
