#!/bin/bash

###############################################################################
# Comprehensive Test: Dashboard, Onboarding, Attendance & All Active APIs
# Tests all dashboard APIs, employee onboarding, and data flow
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
echo "🧪 Comprehensive API Test"
echo "Dashboard | Onboarding | Attendance | All"
echo "=========================================="
echo ""
echo "API Base URL: $API_BASE_URL"
echo ""

# Test results
PASSED=0
FAILED=0
RESULTS=()

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
  local curl_cmd="curl -s -w \"\n%{http_code}\" --max-time 10 -X \"$method\" \"$API_BASE_URL$endpoint\" -H \"Content-Type: application/json\""
  
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
  
  if [ "$http_code" = "$expected_status" ] || [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
    ((PASSED++))
    RESULTS+=("✅ $name: PASS (HTTP $http_code)")
    
    # Show data count if available
    if echo "$body_response" | jq -e '.data | length' > /dev/null 2>&1; then
      count=$(echo "$body_response" | jq '.data | length')
      echo "   📊 Found: $count items"
    elif echo "$body_response" | jq -e '.data.total' > /dev/null 2>&1; then
      total=$(echo "$body_response" | jq -r '.data.total // .total // 0')
      echo "   📊 Total: $total items"
    elif echo "$body_response" | jq -e '.data.employees' > /dev/null 2>&1; then
      emp_count=$(echo "$body_response" | jq -r '.data.employees | length // 0')
      echo "   👥 Employees: $emp_count"
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

# Step 1: Login
echo "=========================================="
echo "1️⃣  Login"
echo "=========================================="
LOGIN_BODY='{"email":"Admin@lenstrack.com","password":"Kadarkhan@123"}'
LOGIN_RESPONSE=$(curl -s -X POST \
  "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_BODY")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // .data.token // .token // empty')
TENANT_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.tenantId // .user.tenantId // "lenstrack"')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo "   Tenant: $TENANT_ID"
echo ""

# Step 2: Dashboard APIs
echo "=========================================="
echo "2️⃣  Dashboard APIs"
echo "=========================================="
test_api "Main Dashboard" "GET" "/api/hr/dashboard" "$TOKEN" "$TENANT_ID" "" "200"
test_api "Dashboard (with role)" "GET" "/api/hr/dashboard?role=admin" "$TOKEN" "$TENANT_ID" "" "200"
test_api "Dashboard Departments" "GET" "/api/hr/dashboard/departments" "$TOKEN" "$TENANT_ID" "" "200"
test_api "Dashboard Store Manager" "GET" "/api/hr/dashboard/store-manager" "$TOKEN" "$TENANT_ID" "" "200"
echo ""

# Step 3: Employee Onboarding APIs
echo "=========================================="
echo "3️⃣  Employee Onboarding APIs"
echo "=========================================="
test_api "Get Onboarding Draft" "GET" "/api/hr/onboarding/draft?employee_id=TEST-001" "$TOKEN" "$TENANT_ID" "" "200"

# Get first employee for testing
FIRST_EMP_RESPONSE=$(curl -s -X GET \
  "$API_BASE_URL/api/hr/employees?page=1&limit=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

FIRST_EMP_ID=$(echo "$FIRST_EMP_RESPONSE" | jq -r 'if .data.employees then .data.employees[0]._id elif .data[0] then .data[0]._id elif .employees[0] then .employees[0]._id else empty end')

if [ -n "$FIRST_EMP_ID" ] && [ "$FIRST_EMP_ID" != "null" ]; then
  echo "   📋 Testing with employee: $FIRST_EMP_ID"
  test_api "Complete Onboarding" "POST" "/api/hr/employees/$FIRST_EMP_ID/complete-onboarding" "$TOKEN" "$TENANT_ID" '{"system_access":{"create_system_account":false}}' "200"
fi
echo ""

# Step 4: Attendance APIs & Data Flow
echo "=========================================="
echo "4️⃣  Attendance APIs & Data Flow"
echo "=========================================="
test_api "Attendance Records" "GET" "/api/attendance?page=1&limit=10" "$TOKEN" "$TENANT_ID" "" "200"

END_DATE=$(date +%Y-%m-%d)
START_DATE=$(date -v-30d +%Y-%m-%d 2>/dev/null || date -d "30 days ago" +%Y-%m-%d 2>/dev/null || echo "2026-01-01")
test_api "Attendance Summary" "GET" "/api/attendance/summary?startDate=$START_DATE&endDate=$END_DATE" "$TOKEN" "$TENANT_ID" "" "200"
test_api "Attendance Stats" "GET" "/api/attendance/stats" "$TOKEN" "$TENANT_ID" "" "200"
echo ""

# Step 5: HR APIs (Data Sources)
echo "=========================================="
echo "5️⃣  HR APIs (Data Sources for Dashboard)"
echo "=========================================="
test_api "Get Employees" "GET" "/api/hr/employees?page=1&limit=10" "$TOKEN" "$TENANT_ID" "" "200"
test_api "Get Departments" "GET" "/api/hr/departments" "$TOKEN" "$TENANT_ID" "" "200"
test_api "Get Stores" "GET" "/api/hr/stores" "$TOKEN" "$TENANT_ID" "" "200"
test_api "Get Workforce" "GET" "/api/hr/workforce" "$TOKEN" "$TENANT_ID" "" "200"
echo ""

# Step 6: Performance APIs
echo "=========================================="
echo "6️⃣  Performance APIs"
echo "=========================================="
if [ -n "$FIRST_EMP_ID" ] && [ "$FIRST_EMP_ID" != "null" ]; then
  test_api "Employee Performance" "GET" "/api/hr/performance/employee/$FIRST_EMP_ID" "$TOKEN" "$TENANT_ID" "" "200"
  test_api "Employee Details" "GET" "/api/hr/employee/$FIRST_EMP_ID" "$TOKEN" "$TENANT_ID" "" "200"
fi
echo ""

# Step 7: Reports & Analytics
echo "=========================================="
echo "7️⃣  Reports & Analytics APIs"
echo "=========================================="
test_api "HR Reports" "GET" "/api/hr/reports" "$TOKEN" "$TENANT_ID" "" "200"
test_api "Attendance Reports" "GET" "/api/attendance/reports" "$TOKEN" "$TENANT_ID" "" "200"
echo ""

# Step 8: Check Data Flow
echo "=========================================="
echo "8️⃣  Data Flow Check"
echo "=========================================="
echo "Checking how data flows from APIs to dashboard..."

# Get dashboard data
DASHBOARD_RESPONSE=$(curl -s -X GET \
  "$API_BASE_URL/api/hr/dashboard" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

echo "Dashboard Response Structure:"
echo "$DASHBOARD_RESPONSE" | jq -r 'keys[]' 2>/dev/null | head -10 | while read key; do
  echo "   - $key"
done

# Check if dashboard has widgets/data
if echo "$DASHBOARD_RESPONSE" | jq -e '.data.widgets' > /dev/null 2>&1; then
  widget_count=$(echo "$DASHBOARD_RESPONSE" | jq '.data.widgets | length' 2>/dev/null || echo "0")
  echo ""
  echo "   📊 Dashboard Widgets: $widget_count"
fi

if echo "$DASHBOARD_RESPONSE" | jq -e '.data.employees' > /dev/null 2>&1; then
  emp_count=$(echo "$DASHBOARD_RESPONSE" | jq '.data.employees | length' 2>/dev/null || echo "0")
  echo "   👥 Employees in Dashboard: $emp_count"
fi

if echo "$DASHBOARD_RESPONSE" | jq -e '.data.attendance' > /dev/null 2>&1; then
  echo "   ✅ Attendance data present in dashboard"
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
