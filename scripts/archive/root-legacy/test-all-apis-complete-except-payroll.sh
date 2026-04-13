#!/bin/bash

###############################################################################
# Complete API Testing - All APIs Except Payroll
###############################################################################

set +e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com}"

echo "=========================================="
echo "🧪 Complete API Testing"
echo "All APIs (Except Payroll)"
echo "=========================================="
echo ""

# Test counters
PASSED=0
FAILED=0
TOTAL=0
FAILED_APIS=()

# Test function
test_api() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local body="$4"
  local expected="${5:-200}"
  
  ((TOTAL++))
  echo -n "   $name ... "
  
  if [ "$method" = "GET" ]; then
    if [ -n "$body" ]; then
      response=$(curl -s -w "\n%{http_code}" -X GET \
        "$API_BASE_URL$endpoint" \
        -H "Authorization: Bearer $TOKEN" \
        -H "x-tenant-id: $TENANT_ID" \
        -H "Content-Type: application/json" \
        -G -d "$body" 2>&1)
    else
      response=$(curl -s -w "\n%{http_code}" -X GET \
        "$API_BASE_URL$endpoint" \
        -H "Authorization: Bearer $TOKEN" \
        -H "x-tenant-id: $TENANT_ID" \
        -H "Content-Type: application/json" 2>&1)
    fi
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      "$API_BASE_URL$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "x-tenant-id: $TENANT_ID" \
      -H "Content-Type: application/json" \
      -d "$body" 2>&1)
  fi
  
  http_code=$(echo "$response" | tail -1)
  body_resp=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "$expected" ] || [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}❌ FAIL${NC} (HTTP $http_code)"
    error_msg=$(echo "$body_resp" | jq -r '.message // .error // "Unknown error"' 2>/dev/null | head -1)
    if [ -n "$error_msg" ] && [ "$error_msg" != "null" ]; then
      echo "      Error: $error_msg"
    fi
    ((FAILED++))
    FAILED_APIS+=("$name (HTTP $http_code)")
    return 1
  fi
}

# Step 1: Login
echo "1️⃣  Admin Login"
echo "----------------------------------------"
LOGIN_BODY='{"email":"Admin@lenstrack.com","password":"Kadarkhan@123"}'
LOGIN_RESPONSE=$(curl -s -X POST \
  "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_BODY")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // .data.token // empty')
TENANT_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.tenantId // "lenstrack"')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo "   Tenant: $TENANT_ID"
echo ""

# Get employee ID and store ID for testing
EMP_RESPONSE=$(curl -s -X GET \
  "$API_BASE_URL/api/hr/employees?limit=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

EMP_ID=$(echo "$EMP_RESPONSE" | jq -r 'if .data then (.data[0]._id // .data[0].id) elif .data.employees then .data.employees[0]._id else empty end' 2>/dev/null)
EMP_EMP_ID=$(echo "$EMP_RESPONSE" | jq -r 'if .data then (.data[0].employeeId) elif .data.employees then .data.employees[0].employeeId else empty end' 2>/dev/null)

STORE_RESPONSE=$(curl -s -X GET \
  "$API_BASE_URL/api/hr/stores?limit=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

STORE_ID=$(echo "$STORE_RESPONSE" | jq -r 'if .data then (.data[0]._id // .data[0].id) elif .data.stores then .data.stores[0]._id else empty end' 2>/dev/null)

DEPT_RESPONSE=$(curl -s -X GET \
  "$API_BASE_URL/api/hr/departments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

DEPT_ID=$(echo "$DEPT_RESPONSE" | jq -r 'if .data then (.data[0]._id // .data[0].id) elif .data.departments then .data.departments[0]._id else empty end' 2>/dev/null)

TODAY=$(date +%Y-%m-%d)
YESTERDAY=$(date -v-1d +%Y-%m-%d 2>/dev/null || date -d "1 day ago" +%Y-%m-%d)

# Step 2: Auth APIs
echo "=========================================="
echo "2️⃣  Authentication APIs"
echo "=========================================="
test_api "Health Check" "GET" "/api/auth/health" "" "200"
test_api "Get Current User" "GET" "/api/auth/me" "" "200"
test_api "Refresh Token" "POST" "/api/auth/refresh" '{"refreshToken":"test"}' "401"  # Expected to fail without valid token
echo ""

# Step 3: Tenant/Company APIs
echo "=========================================="
echo "3️⃣  Tenant/Company APIs"
echo "=========================================="
test_api "Get Current Company" "GET" "/api/tenant/company" "" "200"
test_api "Get Tenants" "GET" "/api/tenant" "" "200"
echo ""

# Step 4: HR Health & Basic
echo "=========================================="
echo "4️⃣  HR Service - Health & Basic"
echo "=========================================="
test_api "HR Health" "GET" "/api/hr/health" "" "200"
echo ""

# Step 5: HR - Employees
echo "=========================================="
echo "5️⃣  HR - Employees"
echo "=========================================="
test_api "Get All Employees" "GET" "/api/hr/employees" "" "200"
test_api "Get Employees (Paginated)" "GET" "/api/hr/employees?page=1&limit=10" "" "200"
test_api "Get Employees (Search)" "GET" "/api/hr/employees?search=test" "" "200"
if [ -n "$EMP_ID" ] && [ "$EMP_ID" != "null" ]; then
  test_api "Get Employee By ID" "GET" "/api/hr/employees/$EMP_ID" "" "200"
fi
if [ -n "$EMP_EMP_ID" ] && [ "$EMP_EMP_ID" != "null" ]; then
  test_api "Get Employee By Employee ID" "GET" "/api/hr/employees?employeeId=$EMP_EMP_ID" "" "200"
fi
test_api "Get Employee Performance" "GET" "/api/hr/performance/employee/$EMP_ID" "" "200"
test_api "Get Employee Details" "GET" "/api/hr/employee/$EMP_ID" "" "200"
echo ""

# Step 6: HR - Departments
echo "=========================================="
echo "6️⃣  HR - Departments"
echo "=========================================="
test_api "Get All Departments" "GET" "/api/hr/departments" "" "200"
if [ -n "$DEPT_ID" ] && [ "$DEPT_ID" != "null" ]; then
  test_api "Get Department By ID" "GET" "/api/hr/departments/$DEPT_ID" "" "200"
fi
echo ""

# Step 7: HR - Stores
echo "=========================================="
echo "7️⃣  HR - Stores"
echo "=========================================="
test_api "Get All Stores" "GET" "/api/hr/stores" "" "200"
test_api "Get Stores (Paginated)" "GET" "/api/hr/stores?page=1&limit=10" "" "200"
if [ -n "$STORE_ID" ] && [ "$STORE_ID" != "null" ]; then
  test_api "Get Store By ID" "GET" "/api/hr/stores/$STORE_ID" "" "200"
fi
echo ""

# Step 8: HR - Roles
echo "=========================================="
echo "8️⃣  HR - Roles"
echo "=========================================="
test_api "Get All Roles" "GET" "/api/hr/roles" "" "200"
echo ""

# Step 9: HR - Dashboard
echo "=========================================="
echo "9️⃣  HR - Dashboard"
echo "=========================================="
test_api "Get Dashboard" "GET" "/api/hr/dashboard" "" "200"
test_api "Get Dashboard Store Manager" "GET" "/api/hr/dashboard/store-manager?storeId=$STORE_ID" "" "200"
test_api "Get HR Reports" "GET" "/api/hr/dashboard/reports?dateFrom=$YESTERDAY&dateTo=$TODAY" "" "200"
echo ""

# Step 10: HR - Performance
echo "=========================================="
echo "🔟 HR - Performance"
echo "=========================================="
test_api "Get Performance Metrics" "GET" "/api/hr/performance" "" "200"
if [ -n "$EMP_ID" ] && [ "$EMP_ID" != "null" ]; then
  test_api "Get Employee Performance" "GET" "/api/hr/performance/employee/$EMP_ID" "" "200"
fi
echo ""

# Step 11: Attendance Health & Basic
echo "=========================================="
echo "1️⃣1️⃣  Attendance Service - Health & Basic"
echo "=========================================="
test_api "Attendance Health" "GET" "/api/attendance/health" "" "200"
echo ""

# Step 12: Attendance - Records
echo "=========================================="
echo "1️⃣2️⃣  Attendance - Records"
echo "=========================================="
test_api "Get Attendance Records" "GET" "/api/attendance" "" "200"
test_api "Get Attendance Records (Paginated)" "GET" "/api/attendance?page=1&limit=10" "" "200"
test_api "Get Attendance History" "GET" "/api/attendance/history" "" "200"
test_api "Get Attendance History (Paginated)" "GET" "/api/attendance/history?page=1&limit=10" "" "200"
echo ""

# Step 13: Attendance - Summary & Stats
echo "=========================================="
echo "1️⃣3️⃣  Attendance - Summary & Stats"
echo "=========================================="
test_api "Get Attendance Summary" "GET" "/api/attendance/summary?startDate=$YESTERDAY&endDate=$TODAY" "" "200"
test_api "Get Attendance Stats" "GET" "/api/attendance/stats" "" "200"
test_api "Get Attendance Records (Alt Route)" "GET" "/api/attendance/records" "" "200"
echo ""

# Step 14: Onboarding
echo "=========================================="
echo "1️⃣4️⃣  Onboarding APIs"
echo "=========================================="
test_api "Get Onboarding Draft" "GET" "/api/hr/onboarding/draft" "" "200"
echo ""

# Step 15: Final Summary
echo ""
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo ""
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo -e "${BLUE}📊 Total: $TOTAL${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Failed APIs:${NC}"
  for api in "${FAILED_APIS[@]}"; do
    echo "   - $api"
  done
  echo ""
fi

SUCCESS_RATE=$((PASSED * 100 / TOTAL))
echo "Success Rate: ${SUCCESS_RATE}%"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All APIs Working!${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  Some APIs need attention${NC}"
  exit 1
fi
