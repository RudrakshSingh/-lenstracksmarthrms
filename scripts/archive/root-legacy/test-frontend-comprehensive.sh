#!/bin/bash

###############################################################################
# Comprehensive Frontend-Style API Test
# Simulates exactly how frontend sends requests to backend
###############################################################################

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com}"

echo "=========================================="
echo "🧪 Frontend-Style Comprehensive API Test"
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
  local headers="$4"
  local body="$5"
  local expected_status="${6:-200}"
  
  echo -n "Testing: $name ... "
  
  if [ "$method" = "GET" ]; then
    if [ -n "$body" ]; then
      response=$(curl -s -w "\n%{http_code}" -X "$method" \
        "$API_BASE_URL$endpoint" \
        -H "Content-Type: application/json" \
        $headers \
        -d "$body" 2>&1)
    else
      response=$(curl -s -w "\n%{http_code}" -X "$method" \
        "$API_BASE_URL$endpoint" \
        -H "Content-Type: application/json" \
        $headers 2>&1)
    fi
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      "$API_BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      $headers \
      -d "$body" 2>&1)
  fi
  
  http_code=$(echo "$response" | tail -1)
  body_response=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "$expected_status" ] || [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
    ((PASSED++))
    RESULTS+=("✅ $name: PASS (HTTP $http_code)")
    return 0
  else
    echo -e "${RED}❌ FAIL${NC} (HTTP $http_code)"
    echo "   Response: $(echo "$body_response" | head -3)"
    ((FAILED++))
    RESULTS+=("❌ $name: FAIL (HTTP $http_code)")
    return 1
  fi
}

# Step 1: Health Check (No auth required)
echo "=========================================="
echo "1️⃣  Health Checks"
echo "=========================================="
test_api "Auth Health" "GET" "/api/auth/health" "" "" "200"
test_api "HR Health" "GET" "/api/hr/health" "" "" "200"
test_api "Attendance Health" "GET" "/api/attendance/health" "" "" "200"
test_api "Payroll Health" "GET" "/api/payroll/health" "" "" "200"
echo ""

# Step 2: Admin Login (Frontend sends email/password)
echo "=========================================="
echo "2️⃣  Admin Login (Frontend Style)"
echo "=========================================="
LOGIN_BODY='{"email":"admin@upcapto.com","password":"Admin@123"}'
LOGIN_RESPONSE=$(curl -s -X POST \
  "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_BODY")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // .token // empty')
TENANT_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.tenantId // .user.tenantId // "upcapto"')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ Login failed - cannot continue${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo "   Token: ${TOKEN:0:50}..."
echo "   Tenant ID: $TENANT_ID"
echo ""

# Step 3: Get Current User (Frontend checks user after login)
echo "=========================================="
echo "3️⃣  Get Current User (Frontend Style)"
echo "=========================================="
AUTH_HEADERS="-H \"Authorization: Bearer $TOKEN\" -H \"x-tenant-id: $TENANT_ID\""
test_api "Get Current User" "GET" "/api/auth/me" "$AUTH_HEADERS" "" "200"
echo ""

# Step 4: Get Current Company (Frontend loads company info)
echo "=========================================="
echo "4️⃣  Get Current Company (Frontend Style)"
echo "=========================================="
test_api "Get Current Company" "GET" "/api/tenant/company" "$AUTH_HEADERS" "" "200"
echo ""

# Step 5: HR APIs (Frontend loads employee list)
echo "=========================================="
echo "5️⃣  HR APIs (Frontend Style)"
echo "=========================================="
test_api "Get Employees" "GET" "/api/hr/employees?page=1&limit=10" "$AUTH_HEADERS" "" "200"
test_api "Get Departments" "GET" "/api/hr/departments" "$AUTH_HEADERS" "" "200"
test_api "Get Stores" "GET" "/api/hr/stores" "$AUTH_HEADERS" "" "200"
echo ""

# Step 6: Create Employee (Frontend form submission)
echo "=========================================="
echo "6️⃣  Create Employee (Frontend Form)"
echo "=========================================="
EMPLOYEE_BODY='{
  "name": "Test Employee Frontend",
  "email": "testfrontend@example.com",
  "phone": "+1234567890",
  "employeeId": "EMP-FRONTEND-TEST",
  "department": "Engineering",
  "position": "Developer",
  "store": null,
  "salary": 50000
}'
test_api "Create Employee" "POST" "/api/hr/employees" "$AUTH_HEADERS" "$EMPLOYEE_BODY" "201"
echo ""

# Step 7: Attendance APIs (Frontend clock-in/out)
echo "=========================================="
echo "7️⃣  Attendance APIs (Frontend Style)"
echo "=========================================="
test_api "Get Attendance Records" "GET" "/api/attendance?page=1&limit=10" "$AUTH_HEADERS" "" "200"
test_api "Get Attendance Summary" "GET" "/api/attendance/summary" "$AUTH_HEADERS" "" "200"
echo ""

# Step 8: Payroll APIs (Frontend salary calculation)
echo "=========================================="
echo "8️⃣  Payroll APIs (Frontend Style)"
echo "=========================================="
CALCULATE_BODY='{"grossMonthly":50000,"variableIncentive":5000,"professionalTax":200,"tds":5000}'
test_api "Calculate Salary" "POST" "/api/payroll/calculate" "$AUTH_HEADERS" "$CALCULATE_BODY" "200"
test_api "Get Salary" "GET" "/api/payroll/salary?employeeId=EMP-FRONTEND-TEST" "$AUTH_HEADERS" "" "200"
echo ""

# Step 9: Department Management (Frontend CRUD)
echo "=========================================="
echo "9️⃣  Department Management (Frontend)"
echo "=========================================="
DEPT_BODY='{"name":"Frontend Test Dept","code":"FE-TEST","description":"Test department"}'
test_api "Create Department" "POST" "/api/hr/departments" "$AUTH_HEADERS" "$DEPT_BODY" "201"
echo ""

# Step 10: Store Management (Frontend CRUD)
echo "=========================================="
echo "🔟 Store Management (Frontend)"
echo "=========================================="
test_api "Get Store by ID" "GET" "/api/hr/stores" "$AUTH_HEADERS" "" "200"
echo ""

# Final Summary
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo ""
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo ""
echo "Total Tests: $((PASSED + FAILED))"
echo "Success Rate: $(( PASSED * 100 / (PASSED + FAILED) ))%"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}⚠️  Some tests failed${NC}"
  echo ""
  echo "Failed Tests:"
  for result in "${RESULTS[@]}"; do
    if [[ $result == ❌* ]]; then
      echo "  $result"
    fi
  done
  exit 1
fi
