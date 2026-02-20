#!/bin/bash

# Comprehensive Production API Test Script
# Tests all available APIs on production environment

set +e  # Don't exit on error - continue testing all APIs

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# API Configuration
API_BASE_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
TENANT_ID="lenstrack"

# Test credentials
ADMIN_EMAIL="Admin@lenstrack.com"
ADMIN_PASSWORD="Kadarkhan@123"
TEST_EMAIL="lenstrack01@gmail.com"
TEST_PASSWORD="cnbxs2b9A1!"

# Counters
TOTAL_TESTS=0
PASSED=0
FAILED=0
SKIPPED=0

# Test function
test_api() {
  local name="$1"
  local method="$2"
  local url="$3"
  local headers="$4"
  local data="$5"
  local expected_status="${6:-200}"
  local is_optional="${7:-false}"
  
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
  elif [ "$HTTP_CODE" = "404" ] && [ "$is_optional" = "true" ]; then
    echo -e "${YELLOW}⚠️  Not Found (Optional)${NC}"
    ((SKIPPED++))
    return 1
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

# Print section header
print_section() {
  echo ""
  echo -e "${CYAN}$1${NC}"
  echo "=================================================="
}

# Print summary
print_summary() {
  echo ""
  echo "=================================================="
  echo -e "${CYAN}📊 TEST SUMMARY${NC}"
  echo "=================================================="
  echo -e "Total Tests:  ${TOTAL_TESTS}"
  echo -e "${GREEN}Passed:       ${PASSED}${NC}"
  echo -e "${RED}Failed:       ${FAILED}${NC}"
  echo -e "${YELLOW}Skipped:      ${SKIPPED}${NC}"
  
  if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests passed!${NC}"
  else
    SUCCESS_RATE=$((PASSED * 100 / TOTAL_TESTS))
    echo ""
    echo -e "Success Rate: ${SUCCESS_RATE}%"
  fi
  echo ""
}

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     PRODUCTION API TEST SUITE - COMPREHENSIVE CHECK      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Base URL: $API_BASE_URL"
echo "Tenant ID: $TENANT_ID"
echo ""

# ============================================================
# 1. GATEWAY / JTS SERVICE
# ============================================================
print_section "1️⃣  GATEWAY / JTS SERVICE"

test_api "GET /" "GET" "$API_BASE_URL/" "" "" "200"
test_api "GET /health" "GET" "$API_BASE_URL/health" "" "" "200"
test_api "GET /api" "GET" "$API_BASE_URL/api" "" "" "200"

# ============================================================
# 2. AUTH SERVICE - PUBLIC ENDPOINTS
# ============================================================
print_section "2️⃣  AUTH SERVICE - PUBLIC ENDPOINTS"

test_api "GET /api/auth/status" "GET" "$API_BASE_URL/api/auth/status" "" "" "200"
test_api "GET /api/auth/health" "GET" "$API_BASE_URL/api/auth/health" "" "" "200"

# Test login to get token
echo -n "  Testing POST /api/auth/login (Admin)... "
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "{\"email\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASSWORD\"}" \
  --max-time 10 2>/dev/null || echo -e "\n000")

LOGIN_HTTP=$(echo "$LOGIN_RESPONSE" | tail -1)
LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

if [ "$LOGIN_HTTP" = "200" ]; then
  ADMIN_TOKEN=$(echo "$LOGIN_BODY" | jq -r '.data.accessToken // .data.token // .accessToken // .token' 2>/dev/null)
  ADMIN_USER_ID=$(echo "$LOGIN_BODY" | jq -r '.data.user._id // .data.user.id // .user._id // .user.id' 2>/dev/null)
  echo -e "${GREEN}✅${NC} (HTTP $LOGIN_HTTP)"
  ((PASSED++))
  ((TOTAL_TESTS++))
else
  echo -e "${RED}❌${NC} (HTTP $LOGIN_HTTP)"
  ((FAILED++))
  ((TOTAL_TESTS++))
  echo "   Cannot continue with protected endpoints without admin token"
  print_summary
  exit 1
fi

# Test employee login
echo -n "  Testing POST /api/auth/login (Employee)... "
EMP_LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}" \
  --max-time 10 2>/dev/null || echo -e "\n000")

EMP_LOGIN_HTTP=$(echo "$EMP_LOGIN_RESPONSE" | tail -1)
EMP_LOGIN_BODY=$(echo "$EMP_LOGIN_RESPONSE" | sed '$d')

if [ "$EMP_LOGIN_HTTP" = "200" ]; then
  EMP_TOKEN=$(echo "$EMP_LOGIN_BODY" | jq -r '.data.accessToken // .data.token // .accessToken // .token' 2>/dev/null)
  EMP_USER_ID=$(echo "$EMP_LOGIN_BODY" | jq -r '.data.user._id // .data.user.id // .user._id // .user.id' 2>/dev/null)
  echo -e "${GREEN}✅${NC} (HTTP $EMP_LOGIN_HTTP)"
  ((PASSED++))
  ((TOTAL_TESTS++))
else
  echo -e "${YELLOW}⚠️  ${NC} (HTTP $EMP_LOGIN_HTTP) - Employee login failed, continuing with admin token"
  EMP_TOKEN=""
  ((SKIPPED++))
  ((TOTAL_TESTS++))
fi

# Set headers for authenticated requests
AUTH_HEADERS="Authorization: Bearer $ADMIN_TOKEN"
AUTH_HEADERS_TENANT="Authorization: Bearer $ADMIN_TOKEN
x-tenant-id: $TENANT_ID"

# ============================================================
# 3. AUTH SERVICE - PROTECTED ENDPOINTS
# ============================================================
print_section "3️⃣  AUTH SERVICE - PROTECTED ENDPOINTS"

test_api "GET /api/auth/profile" "GET" "$API_BASE_URL/api/auth/profile" "$AUTH_HEADERS_TENANT" "" "200"
test_api "GET /api/auth/me" "GET" "$API_BASE_URL/api/auth/me" "$AUTH_HEADERS_TENANT" "" "200"

# ============================================================
# 4. HR SERVICE - PUBLIC ENDPOINTS
# ============================================================
print_section "4️⃣  HR SERVICE - PUBLIC ENDPOINTS"

test_api "GET /api/hr" "GET" "$API_BASE_URL/api/hr" "" "" "200"
test_api "GET /api/hr/status" "GET" "$API_BASE_URL/api/hr/status" "" "" "200"
test_api "GET /api/hr/health" "GET" "$API_BASE_URL/api/hr/health" "" "" "200"

# ============================================================
# 5. HR SERVICE - PROTECTED ENDPOINTS
# ============================================================
print_section "5️⃣  HR SERVICE - PROTECTED ENDPOINTS"

test_api "GET /api/hr/employees" "GET" "$API_BASE_URL/api/hr/employees?limit=5" "$AUTH_HEADERS_TENANT" "" "200"
test_api "GET /api/hr/departments" "GET" "$API_BASE_URL/api/hr/departments?limit=5" "$AUTH_HEADERS_TENANT" "" "200"
test_api "GET /api/hr/stores" "GET" "$API_BASE_URL/api/hr/stores?limit=5" "$AUTH_HEADERS_TENANT" "" "200"
test_api "GET /api/hr/roles" "GET" "$API_BASE_URL/api/hr/roles" "$AUTH_HEADERS_TENANT" "" "200"
test_api "GET /api/hr/dashboard" "GET" "$API_BASE_URL/api/hr/dashboard" "$AUTH_HEADERS_TENANT" "" "200"
test_api "GET /api/hr/dashboard/overview" "GET" "$API_BASE_URL/api/hr/dashboard/overview" "$AUTH_HEADERS_TENANT" "" "200"
test_api "GET /api/hr/dashboard/stats" "GET" "$API_BASE_URL/api/hr/dashboard/stats" "$AUTH_HEADERS_TENANT" "" "200"
test_api "GET /api/hr/performance" "GET" "$API_BASE_URL/api/hr/performance" "$AUTH_HEADERS_TENANT" "" "200"
test_api "GET /api/hr/workforce" "GET" "$API_BASE_URL/api/hr/workforce" "$AUTH_HEADERS_TENANT" "" "200"
test_api "GET /api/hr/time-tracking" "GET" "$API_BASE_URL/api/hr/time-tracking" "$AUTH_HEADERS_TENANT" "" "200"
test_api "GET /api/hr/time-tracking/timesheets" "GET" "$API_BASE_URL/api/hr/time-tracking/timesheets" "$AUTH_HEADERS_TENANT" "" "200"
test_api "GET /api/hr/time-tracking/projects" "GET" "$API_BASE_URL/api/hr/time-tracking/projects" "$AUTH_HEADERS_TENANT" "" "200"

# Get first employee ID for detailed tests
echo -n "  Fetching employee ID for detailed tests... "
EMP_LIST=$(curl -s -X GET "$API_BASE_URL/api/hr/employees?limit=1" \
  -H "$AUTH_HEADERS_TENANT" \
  --max-time 10 2>/dev/null)

FIRST_EMP_ID=$(echo "$EMP_LIST" | jq -r '.data[0].employeeId // .data[0].employee_id // empty' 2>/dev/null)
FIRST_EMP_MONGO_ID=$(echo "$EMP_LIST" | jq -r '.data[0]._id // .data[0].id // empty' 2>/dev/null)

if [ -n "$FIRST_EMP_ID" ] || [ -n "$FIRST_EMP_MONGO_ID" ]; then
  echo -e "${GREEN}✅${NC}"
  if [ -n "$FIRST_EMP_ID" ]; then
    test_api "GET /api/hr/employee/:id (by Employee ID)" "GET" "$API_BASE_URL/api/hr/employee/$FIRST_EMP_ID" "$AUTH_HEADERS_TENANT" "" "200"
  fi
  if [ -n "$FIRST_EMP_MONGO_ID" ]; then
    test_api "GET /api/hr/employees/:id (by Mongo ID)" "GET" "$API_BASE_URL/api/hr/employees/$FIRST_EMP_MONGO_ID" "$AUTH_HEADERS_TENANT" "" "200"
  fi
  if [ -n "$FIRST_EMP_ID" ]; then
    test_api "GET /api/hr/performance/employee/:id" "GET" "$API_BASE_URL/api/hr/performance/employee/$FIRST_EMP_ID" "$AUTH_HEADERS_TENANT" "" "200"
  fi
else
  echo -e "${YELLOW}⚠️  No employee found${NC}"
fi

# ============================================================
# 6. ATTENDANCE SERVICE - PUBLIC ENDPOINTS
# ============================================================
print_section "6️⃣  ATTENDANCE SERVICE - PUBLIC ENDPOINTS"

test_api "GET /api/attendance/status" "GET" "$API_BASE_URL/api/attendance/status" "" "" "200"
test_api "GET /api/attendance/health" "GET" "$API_BASE_URL/api/attendance/health" "" "" "200"

# ============================================================
# 7. ATTENDANCE SERVICE - PROTECTED ENDPOINTS
# ============================================================
print_section "7️⃣  ATTENDANCE SERVICE - PROTECTED ENDPOINTS"

test_api "GET /api/attendance" "GET" "$API_BASE_URL/api/attendance?limit=5" "$AUTH_HEADERS_TENANT" "" "200"
test_api "GET /api/attendance/history" "GET" "$API_BASE_URL/api/attendance/history?limit=5" "$AUTH_HEADERS_TENANT" "" "200"

# Test with employee token if available
if [ -n "$EMP_TOKEN" ]; then
  EMP_AUTH_HEADERS="Authorization: Bearer $EMP_TOKEN
x-tenant-id: $TENANT_ID"
  
  test_api "GET /api/attendance/history (Employee)" "GET" "$API_BASE_URL/api/attendance/history?limit=1" "$EMP_AUTH_HEADERS" "" "200"
fi

# ============================================================
# 8. TENANT / ADMIN SERVICE - PUBLIC ENDPOINTS
# ============================================================
print_section "8️⃣  TENANT / ADMIN SERVICE - PUBLIC ENDPOINTS"

test_api "GET /api/admin/v1" "GET" "$API_BASE_URL/api/admin/v1" "" "" "200" "true"
test_api "GET /api/admin/v1/health" "GET" "$API_BASE_URL/api/admin/v1/health" "" "" "200" "true"
test_api "GET /api/admin/v1/status" "GET" "$API_BASE_URL/api/admin/v1/status" "" "" "200" "true"

# ============================================================
# 9. TENANT / ADMIN SERVICE - PROTECTED ENDPOINTS
# ============================================================
print_section "9️⃣  TENANT / ADMIN SERVICE - PROTECTED ENDPOINTS"

test_api "GET /api/admin/v1/tenants" "GET" "$API_BASE_URL/api/admin/v1/tenants" "$AUTH_HEADERS_TENANT" "" "200" "true"
test_api "GET /api/admin/v1/platform/metrics" "GET" "$API_BASE_URL/api/admin/v1/platform/metrics" "$AUTH_HEADERS_TENANT" "" "200" "true"

# ============================================================
# 10. ADDITIONAL SERVICES (Optional - may not be deployed)
# ============================================================
print_section "🔟 ADDITIONAL SERVICES (Optional)"

test_api "GET /api/analytics/health" "GET" "$API_BASE_URL/api/analytics/health" "" "" "200" "true"
test_api "GET /api/notification/health" "GET" "$API_BASE_URL/api/notification/health" "" "" "200" "true"
test_api "GET /api/realtime/health" "GET" "$API_BASE_URL/api/realtime/health" "" "" "200" "true"
test_api "GET /api/sales/health" "GET" "$API_BASE_URL/api/sales/health" "" "" "200" "true"
test_api "GET /api/inventory/health" "GET" "$API_BASE_URL/api/inventory/health" "" "" "200" "true"
test_api "GET /api/payroll/health" "GET" "$API_BASE_URL/api/payroll/health" "" "" "200" "true"
test_api "GET /api/financial/health" "GET" "$API_BASE_URL/api/financial/health" "" "" "200" "true"
test_api "GET /api/document/health" "GET" "$API_BASE_URL/api/document/health" "" "" "200" "true"
test_api "GET /api/crm/health" "GET" "$API_BASE_URL/api/crm/health" "" "" "200" "true"

# ============================================================
# SUMMARY
# ============================================================
print_summary

# Save results to file
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
RESULTS_FILE="api-test-results-${TIMESTAMP}.txt"

{
  echo "Production API Test Results"
  echo "Generated: $(date)"
  echo "Base URL: $API_BASE_URL"
  echo ""
  echo "Summary:"
  echo "  Total Tests: $TOTAL_TESTS"
  echo "  Passed: $PASSED"
  echo "  Failed: $FAILED"
  echo "  Skipped: $SKIPPED"
} > "$RESULTS_FILE"

echo -e "${BLUE}📄 Results saved to: $RESULTS_FILE${NC}"
echo ""
