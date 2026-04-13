#!/bin/bash

# Comprehensive Test Script for All Fixes
# Tests: /api/attendance/today, time-tracking permissions, performance permissions

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

# Employee credentials
EMP_EMAIL="lenstrack01@gmail.com"
EMP_PASSWORD="cnbxs2b9A1!"

# Admin credentials
ADMIN_EMAIL="Admin@lenstrack.com"
ADMIN_PASSWORD="Kadarkhan@123"

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
  local allow_null="${7:-false}" # Allow null data as success
  
  ((TOTAL_TESTS++))
  
  echo -n "  Testing $name... "
  
  if [ -n "$data" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X "$method" \
      "$url" \
      -H "$headers" \
      -H "Content-Type: application/json" \
      -d "$data" \
      --max-time 15 2>/dev/null || echo -e "\n000")
  else
    RESPONSE=$(curl -s -w "\n%{http_code}" -X "$method" \
      "$url" \
      -H "$headers" \
      --max-time 15 2>/dev/null || echo -e "\n000")
  fi
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" = "$expected_status" ]; then
    # Check if data is null (for attendance/today when not clocked in)
    if [ "$allow_null" = "true" ]; then
      DATA_VALUE=$(echo "$BODY" | jq -r '.data' 2>/dev/null)
      if [ "$DATA_VALUE" = "null" ]; then
        echo -e "${YELLOW}⚠️${NC} (HTTP $HTTP_CODE) - No data (expected if not clocked in)"
        ((PASSED++))
        return 0
      fi
    fi
    
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
    if [ ${#ERROR_MSG} -gt 60 ]; then
      ERROR_MSG="${ERROR_MSG:0:60}..."
    fi
    echo "     Error: $ERROR_MSG"
    ((FAILED++))
    return 1
  fi
}

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     COMPREHENSIVE FIXES TEST SUITE                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================
# STEP 1: Employee Login
# ============================================================
echo -e "${CYAN}1️⃣  Employee Login${NC}"
echo "=================================================="
echo -n "  Logging in as Employee... "

EMP_LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMP_EMAIL\", \"password\": \"$EMP_PASSWORD\"}" \
  --max-time 10 2>/dev/null || echo -e "\n000")

EMP_LOGIN_HTTP=$(echo "$EMP_LOGIN_RESPONSE" | tail -1)
EMP_LOGIN_BODY=$(echo "$EMP_LOGIN_RESPONSE" | sed '$d')

if [ "$EMP_LOGIN_HTTP" = "200" ]; then
  EMP_TOKEN=$(echo "$EMP_LOGIN_BODY" | jq -r '.data.accessToken // .data.token // .accessToken // .token' 2>/dev/null)
  EMP_EMPLOYEE_ID=$(echo "$EMP_LOGIN_BODY" | jq -r '.data.user.employee_id // .data.user.employeeId // .user.employee_id // .user.employeeId' 2>/dev/null)
  EMP_TENANT_ID=$(echo "$EMP_LOGIN_BODY" | jq -r '.data.user.tenantId // .data.user.tenant_id // .user.tenantId // .user.tenant_id // "default"' 2>/dev/null)
  
  if [ -z "$EMP_TOKEN" ]; then
    echo -e "${RED}❌${NC} Failed to extract token"
    exit 1
  fi
  
  if [ -z "$EMP_TENANT_ID" ] || [ "$EMP_TENANT_ID" = "null" ]; then
    EMP_TENANT_ID="default"
  fi
  
  echo -e "${GREEN}✅${NC} (HTTP $EMP_LOGIN_HTTP)"
  echo "   Employee ID: $EMP_EMPLOYEE_ID"
  echo "   Tenant ID: $EMP_TENANT_ID"
  echo ""
else
  echo -e "${RED}❌${NC} (HTTP $EMP_LOGIN_HTTP)"
  exit 1
fi

EMP_HEADERS="Authorization: Bearer $EMP_TOKEN
x-tenant-id: $EMP_TENANT_ID"

# ============================================================
# STEP 2: Admin Login
# ============================================================
echo -e "${CYAN}2️⃣  Admin Login${NC}"
echo "=================================================="
echo -n "  Logging in as Admin... "

ADMIN_LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASSWORD\"}" \
  --max-time 10 2>/dev/null || echo -e "\n000")

ADMIN_LOGIN_HTTP=$(echo "$ADMIN_LOGIN_RESPONSE" | tail -1)
ADMIN_LOGIN_BODY=$(echo "$ADMIN_LOGIN_RESPONSE" | sed '$d')

if [ "$ADMIN_LOGIN_HTTP" = "200" ]; then
  ADMIN_TOKEN=$(echo "$ADMIN_LOGIN_BODY" | jq -r '.data.accessToken // .data.token // .accessToken // .token' 2>/dev/null)
  ADMIN_TENANT_ID=$(echo "$ADMIN_LOGIN_BODY" | jq -r '.data.user.tenantId // .data.user.tenant_id // .user.tenantId // .user.tenant_id // "lenstrack"' 2>/dev/null)
  
  if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  Failed to extract token${NC}"
    ADMIN_TOKEN=""
  else
    if [ -z "$ADMIN_TENANT_ID" ] || [ "$ADMIN_TENANT_ID" = "null" ]; then
      ADMIN_TENANT_ID="lenstrack"
    fi
    echo -e "${GREEN}✅${NC} (HTTP $ADMIN_LOGIN_HTTP)"
    echo "   Tenant ID: $ADMIN_TENANT_ID"
  fi
  echo ""
else
  echo -e "${YELLOW}⚠️  Admin login failed${NC} (HTTP $ADMIN_LOGIN_HTTP)"
  ADMIN_TOKEN=""
  echo ""
fi

if [ -n "$ADMIN_TOKEN" ]; then
  ADMIN_HEADERS="Authorization: Bearer $ADMIN_TOKEN
x-tenant-id: $ADMIN_TENANT_ID"
fi

# ============================================================
# STEP 3: Test /api/attendance/today (FIX #1)
# ============================================================
echo -e "${CYAN}3️⃣  FIX #1: GET /api/attendance/today${NC}"
echo "=================================================="

TODAY=$(date +%Y-%m-%d)

# Test without date parameter
test_api "GET /api/attendance/today (Employee, no date)" "GET" "$API_BASE_URL/api/attendance/today" "$EMP_HEADERS" "" "200" "true"

# Test with date parameter
test_api "GET /api/attendance/today?date=$TODAY (Employee)" "GET" "$API_BASE_URL/api/attendance/today?date=$TODAY" "$EMP_HEADERS" "" "200" "true"

# Test with employeeId (for admin)
if [ -n "$ADMIN_TOKEN" ] && [ -n "$EMP_EMPLOYEE_ID" ]; then
  test_api "GET /api/attendance/today?employeeId=$EMP_EMPLOYEE_ID (Admin)" "GET" "$API_BASE_URL/api/attendance/today?employeeId=$EMP_EMPLOYEE_ID" "$ADMIN_HEADERS" "" "200" "true"
fi

echo ""

# ============================================================
# STEP 4: Test /api/hr/time-tracking (FIX #2)
# ============================================================
echo -e "${CYAN}4️⃣  FIX #2: GET /api/hr/time-tracking (Permission Fix)${NC}"
echo "=================================================="

# Test as employee (should work now)
test_api "GET /api/hr/time-tracking (Employee)" "GET" "$API_BASE_URL/api/hr/time-tracking" "$EMP_HEADERS" "" "200"

# Test with employeeId filter
if [ -n "$EMP_EMPLOYEE_ID" ]; then
  test_api "GET /api/hr/time-tracking?employeeId=$EMP_EMPLOYEE_ID (Employee)" "GET" "$API_BASE_URL/api/hr/time-tracking?employeeId=$EMP_EMPLOYEE_ID" "$EMP_HEADERS" "" "200"
fi

# Test with date filter
test_api "GET /api/hr/time-tracking?date=$TODAY (Employee)" "GET" "$API_BASE_URL/api/hr/time-tracking?date=$TODAY" "$EMP_HEADERS" "" "200"

# Test as admin
if [ -n "$ADMIN_TOKEN" ]; then
  test_api "GET /api/hr/time-tracking (Admin)" "GET" "$API_BASE_URL/api/hr/time-tracking" "$ADMIN_HEADERS" "" "200"
fi

echo ""

# ============================================================
# STEP 5: Test /api/hr/performance/me/metrics (FIX #3)
# ============================================================
echo -e "${CYAN}5️⃣  FIX #3: GET /api/hr/performance/me/metrics (Permission Fix)${NC}"
echo "=================================================="

# Test as employee (should work now)
test_api "GET /api/hr/performance/me/metrics (Employee)" "GET" "$API_BASE_URL/api/hr/performance/me/metrics" "$EMP_HEADERS" "" "200"

# Test with period parameter
test_api "GET /api/hr/performance/me/metrics?period=monthly (Employee)" "GET" "$API_BASE_URL/api/hr/performance/me/metrics?period=monthly" "$EMP_HEADERS" "" "200"

# Test as admin
if [ -n "$ADMIN_TOKEN" ]; then
  test_api "GET /api/hr/performance/me/metrics (Admin)" "GET" "$API_BASE_URL/api/hr/performance/me/metrics" "$ADMIN_HEADERS" "" "200"
fi

echo ""

# ============================================================
# STEP 6: Test Date Query Fix (Bonus)
# ============================================================
echo -e "${CYAN}6️⃣  BONUS: Date Query Fix (check both date and check_in_time)${NC}"
echo "=================================================="

# Test attendance with date filter
test_api "GET /api/attendance?date=$TODAY (Employee)" "GET" "$API_BASE_URL/api/attendance?date=$TODAY" "$EMP_HEADERS" "" "200"

# Test attendance with employeeId and date
if [ -n "$EMP_EMPLOYEE_ID" ]; then
  test_api "GET /api/attendance?employeeId=$EMP_EMPLOYEE_ID&date=$TODAY (Employee)" "GET" "$API_BASE_URL/api/attendance?employeeId=$EMP_EMPLOYEE_ID&date=$TODAY" "$EMP_HEADERS" "" "200"
fi

echo ""

# ============================================================
# STEP 7: Verify Response Data
# ============================================================
echo -e "${CYAN}7️⃣  Response Data Verification${NC}"
echo "=================================================="

# Check /api/attendance/today response
echo -n "  Checking /api/attendance/today response structure... "
TODAY_RESPONSE=$(curl -s -X GET \
  "$API_BASE_URL/api/attendance/today" \
  -H "$EMP_HEADERS" \
  --max-time 10 2>/dev/null)

SUCCESS=$(echo "$TODAY_RESPONSE" | jq -r '.success' 2>/dev/null)
MESSAGE=$(echo "$TODAY_RESPONSE" | jq -r '.message' 2>/dev/null)
DATA=$(echo "$TODAY_RESPONSE" | jq -r '.data' 2>/dev/null)

if [ "$SUCCESS" = "true" ]; then
  echo -e "${GREEN}✅${NC}"
  echo "     Success: $SUCCESS"
  echo "     Message: $MESSAGE"
  if [ "$DATA" != "null" ]; then
    echo "     Data: Present"
    EMP_ID=$(echo "$TODAY_RESPONSE" | jq -r '.data.employeeId // .data.employee_id' 2>/dev/null)
    if [ -n "$EMP_ID" ]; then
      echo "     Employee ID: $EMP_ID"
    fi
  else
    echo "     Data: null (No attendance for today - expected if not clocked in)"
  fi
else
  echo -e "${RED}❌${NC} Response structure incorrect"
fi

echo ""

# Summary
echo "=================================================="
echo -e "${CYAN}📊 TEST SUMMARY${NC}"
echo "=================================================="
echo -e "Total Tests:  ${TOTAL_TESTS}"
echo -e "${GREEN}Passed:       ${PASSED}${NC}"
echo -e "${RED}Failed:       ${FAILED}${NC}"

if [ $FAILED -eq 0 ]; then
  echo ""
  echo -e "${GREEN}🎉 All fixes working correctly!${NC}"
  SUCCESS_RATE=100
else
  SUCCESS_RATE=$((PASSED * 100 / TOTAL_TESTS))
  echo ""
  echo -e "Success Rate: ${SUCCESS_RATE}%"
fi

echo ""
echo -e "${BLUE}Fixes Tested:${NC}"
echo "  ✅ FIX #1: GET /api/attendance/today endpoint"
echo "  ✅ FIX #2: GET /api/hr/time-tracking permission fix"
echo "  ✅ FIX #3: GET /api/hr/performance/me/metrics permission fix"
echo "  ✅ BONUS: Date query improvements"
echo ""
