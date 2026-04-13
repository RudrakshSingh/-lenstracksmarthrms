#!/bin/bash

# Test all APIs with a real employee from database
# This script will:
# 1. Login with employee credentials
# 2. Test all APIs using that employee's token and ID

set +e  # Don't exit on error

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# API Configuration
API_BASE_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
TENANT_ID="lenstrack"

# Test credentials - using lenstrack01@gmail.com
TEST_EMAIL="lenstrack01@gmail.com"
TEST_PASSWORD="cnbxs2b9A1!"

# Counters
TOTAL_TESTS=0
PASSED=0
FAILED=0

# Test function
test_api() {
  local name="$1"
  local method="$2"
  local url="$3"
  local headers="$4"
  local data="$5"
  local expected_status="${6:-200}"
  
  ((TOTAL_TESTS++))
  
  echo -n "  Testing $name... "
  
  if [ -n "$data" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X "$method" \
      "$url" \
      -H "$headers" \
      -H "Content-Type: application/json" \
      -d "$data" \
      --max-time 10 2>/dev/null || echo -e "\n000")
  else
    RESPONSE=$(curl -s -w "\n%{http_code}" -X "$method" \
      "$url" \
      -H "$headers" \
      --max-time 10 2>/dev/null || echo -e "\n000")
  fi
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" = "$expected_status" ]; then
    echo -e "${GREEN}✅${NC} (HTTP $HTTP_CODE)"
    ((PASSED++))
    return 0
  elif [ "$HTTP_CODE" = "000" ]; then
    echo -e "${RED}❌${NC} (Connection Failed)"
    ((FAILED++))
    return 1
  else
    echo -e "${RED}❌${NC} (HTTP $HTTP_CODE)"
    ERROR_MSG=$(echo "$BODY" | jq -r '.message // .error // "Unknown error"' 2>/dev/null || echo "Unknown error")
    if [ ${#ERROR_MSG} -gt 50 ]; then
      ERROR_MSG="${ERROR_MSG:0:50}..."
    fi
    echo "     Error: $ERROR_MSG"
    ((FAILED++))
    return 1
  fi
}

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     TESTING ALL APIS WITH REAL EMPLOYEE                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Employee Email: $TEST_EMAIL"
echo "Base URL: $API_BASE_URL"
echo ""

# Step 1: Login
echo -e "${CYAN}1️⃣  Employee Login${NC}"
echo "=================================================="
echo -n "  Logging in... "

LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}" \
  --max-time 10 2>/dev/null || echo -e "\n000")

LOGIN_HTTP=$(echo "$LOGIN_RESPONSE" | tail -1)
LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

if [ "$LOGIN_HTTP" = "200" ]; then
  TOKEN=$(echo "$LOGIN_BODY" | jq -r '.data.accessToken // .data.token // .accessToken // .token' 2>/dev/null)
  USER_ID=$(echo "$LOGIN_BODY" | jq -r '.data.user._id // .data.user.id // .user._id // .user.id' 2>/dev/null)
  EMPLOYEE_ID=$(echo "$LOGIN_BODY" | jq -r '.data.user.employee_id // .data.user.employeeId // .user.employee_id // .user.employeeId' 2>/dev/null)
  EMPLOYEE_NAME=$(echo "$LOGIN_BODY" | jq -r '.data.user.name // .data.user.fullName // .user.name // .user.fullName' 2>/dev/null)
  
  if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌${NC} Failed to extract token"
    exit 1
  fi
  
  echo -e "${GREEN}✅${NC} (HTTP $LOGIN_HTTP)"
  echo "   Employee: $EMPLOYEE_NAME"
  echo "   Employee ID: $EMPLOYEE_ID"
  echo "   User ID: $USER_ID"
  echo ""
else
  echo -e "${RED}❌${NC} (HTTP $LOGIN_HTTP)"
  echo "   Response: $LOGIN_BODY"
  exit 1
fi

# Set headers
AUTH_HEADERS="Authorization: Bearer $TOKEN
x-tenant-id: $TENANT_ID"

# ============================================================
# TEST ALL APIS WITH EMPLOYEE
# ============================================================

echo -e "${CYAN}2️⃣  AUTH SERVICE APIs${NC}"
echo "=================================================="
test_api "GET /api/auth/profile" "GET" "$API_BASE_URL/api/auth/profile" "$AUTH_HEADERS" "" "200"
test_api "GET /api/auth/me" "GET" "$API_BASE_URL/api/auth/me" "$AUTH_HEADERS" "" "200"

echo ""
echo -e "${CYAN}3️⃣  HR SERVICE - Employee APIs${NC}"
echo "=================================================="

# Test with employee ID (string)
if [ -n "$EMPLOYEE_ID" ]; then
  test_api "GET /api/hr/employee/:id (by Employee ID)" "GET" "$API_BASE_URL/api/hr/employee/$EMPLOYEE_ID" "$AUTH_HEADERS" "" "200"
  test_api "GET /api/hr/employees/:id (by Employee ID)" "GET" "$API_BASE_URL/api/hr/employees/$EMPLOYEE_ID" "$AUTH_HEADERS" "" "200"
  test_api "GET /api/hr/performance/employee/:id (by Employee ID)" "GET" "$API_BASE_URL/api/hr/performance/employee/$EMPLOYEE_ID" "$AUTH_HEADERS" "" "200"
fi

# Test with Mongo ID
if [ -n "$USER_ID" ]; then
  test_api "GET /api/hr/employees/:id (by Mongo ID)" "GET" "$API_BASE_URL/api/hr/employees/$USER_ID" "$AUTH_HEADERS" "" "200"
fi

echo ""
echo -e "${CYAN}4️⃣  HR SERVICE - Dashboard APIs${NC}"
echo "=================================================="
test_api "GET /api/hr/dashboard" "GET" "$API_BASE_URL/api/hr/dashboard" "$AUTH_HEADERS" "" "200"
test_api "GET /api/hr/dashboard/overview" "GET" "$API_BASE_URL/api/hr/dashboard/overview" "$AUTH_HEADERS" "" "200"
test_api "GET /api/hr/dashboard/stats" "GET" "$API_BASE_URL/api/hr/dashboard/stats" "$AUTH_HEADERS" "" "200"

echo ""
echo -e "${CYAN}5️⃣  HR SERVICE - Time Tracking APIs${NC}"
echo "=================================================="
test_api "GET /api/hr/time-tracking" "GET" "$API_BASE_URL/api/hr/time-tracking" "$AUTH_HEADERS" "" "200"
test_api "GET /api/hr/time-tracking/timesheets" "GET" "$API_BASE_URL/api/hr/time-tracking/timesheets" "$AUTH_HEADERS" "" "200"
test_api "GET /api/hr/time-tracking/projects" "GET" "$API_BASE_URL/api/hr/time-tracking/projects" "$AUTH_HEADERS" "" "200"

echo ""
echo -e "${CYAN}6️⃣  ATTENDANCE SERVICE APIs${NC}"
echo "=================================================="
test_api "GET /api/attendance" "GET" "$API_BASE_URL/api/attendance?limit=5" "$AUTH_HEADERS" "" "200"
test_api "GET /api/attendance/history" "GET" "$API_BASE_URL/api/attendance/history?limit=5" "$AUTH_HEADERS" "" "200"

# Test clock-in (if not already clocked in)
echo ""
echo -e "${CYAN}7️⃣  ATTENDANCE - Clock In/Out${NC}"
echo "=================================================="
echo -n "  Testing POST /api/attendance/clock-in... "
CLOCKIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_BASE_URL/api/attendance/check-in" \
  -H "$AUTH_HEADERS" \
  -H "Content-Type: application/json" \
  -d "{\"latitude\": 19.0760, \"longitude\": 72.8777, \"notes\": \"Test clock-in\"}" \
  --max-time 10 2>/dev/null || echo -e "\n000")

CLOCKIN_HTTP=$(echo "$CLOCKIN_RESPONSE" | tail -1)
CLOCKIN_BODY=$(echo "$CLOCKIN_RESPONSE" | sed '$d')

if [ "$CLOCKIN_HTTP" = "200" ] || [ "$CLOCKIN_HTTP" = "201" ]; then
  echo -e "${GREEN}✅${NC} (HTTP $CLOCKIN_HTTP)"
  ((PASSED++))
  ((TOTAL_TESTS++))
elif [ "$CLOCKIN_HTTP" = "400" ]; then
  ERROR_MSG=$(echo "$CLOCKIN_BODY" | jq -r '.message // .error' 2>/dev/null || echo "Unknown")
  if [[ "$ERROR_MSG" == *"already clocked in"* ]] || [[ "$ERROR_MSG" == *"clock out"* ]]; then
    echo -e "${YELLOW}⚠️  Already clocked in${NC} (HTTP $CLOCKIN_HTTP)"
    ((PASSED++))
    ((TOTAL_TESTS++))
  else
    echo -e "${RED}❌${NC} (HTTP $CLOCKIN_HTTP)"
    echo "     Error: $ERROR_MSG"
    ((FAILED++))
    ((TOTAL_TESTS++))
  fi
else
  echo -e "${RED}❌${NC} (HTTP $CLOCKIN_HTTP)"
  ((FAILED++))
  ((TOTAL_TESTS++))
fi

# Test clock-out
echo -n "  Testing POST /api/attendance/clock-out... "
CLOCKOUT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_BASE_URL/api/attendance/check-out" \
  -H "$AUTH_HEADERS" \
  -H "Content-Type: application/json" \
  -d "{\"latitude\": 19.0760, \"longitude\": 72.8777, \"notes\": \"Test clock-out\"}" \
  --max-time 10 2>/dev/null || echo -e "\n000")

CLOCKOUT_HTTP=$(echo "$CLOCKOUT_RESPONSE" | tail -1)
CLOCKOUT_BODY=$(echo "$CLOCKOUT_RESPONSE" | sed '$d')

if [ "$CLOCKOUT_HTTP" = "200" ] || [ "$CLOCKOUT_HTTP" = "201" ]; then
  echo -e "${GREEN}✅${NC} (HTTP $CLOCKOUT_HTTP)"
  ((PASSED++))
  ((TOTAL_TESTS++))
elif [ "$CLOCKOUT_HTTP" = "400" ]; then
  ERROR_MSG=$(echo "$CLOCKOUT_BODY" | jq -r '.message // .error' 2>/dev/null || echo "Unknown")
  if [[ "$ERROR_MSG" == *"clock in"* ]] || [[ "$ERROR_MSG" == *"No open clock-in"* ]]; then
    echo -e "${YELLOW}⚠️  Not clocked in${NC} (HTTP $CLOCKOUT_HTTP)"
    ((PASSED++))
    ((TOTAL_TESTS++))
  else
    echo -e "${RED}❌${NC} (HTTP $CLOCKOUT_HTTP)"
    echo "     Error: $ERROR_MSG"
    ((FAILED++))
    ((TOTAL_TESTS++))
  fi
else
  echo -e "${RED}❌${NC} (HTTP $CLOCKOUT_HTTP)"
  ((FAILED++))
  ((TOTAL_TESTS++))
fi

# Summary
echo ""
echo "=================================================="
echo -e "${CYAN}📊 TEST SUMMARY${NC}"
echo "=================================================="
echo -e "Total Tests:  ${TOTAL_TESTS}"
echo -e "${GREEN}Passed:       ${PASSED}${NC}"
echo -e "${RED}Failed:       ${FAILED}${NC}"

if [ $FAILED -eq 0 ]; then
  echo ""
  echo -e "${GREEN}🎉 All tests passed!${NC}"
else
  SUCCESS_RATE=$((PASSED * 100 / TOTAL_TESTS))
  echo ""
  echo -e "Success Rate: ${SUCCESS_RATE}%"
fi
echo ""
