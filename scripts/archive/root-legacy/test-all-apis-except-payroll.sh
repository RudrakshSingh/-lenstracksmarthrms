#!/bin/bash

###############################################################################
# Test All APIs (Except Payroll) Using Existing DB Data
###############################################################################

# Don't exit on error - continue testing all APIs
set +e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com}"

echo "=========================================="
echo "🧪 Test All APIs (Except Payroll)"
echo "Using Existing DB Data"
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
  
  # Build curl command with proper header handling
  local curl_cmd="curl -s -w \"\n%{http_code}\" --max-time 10 -X \"$method\" \"$API_BASE_URL$endpoint\" -H \"Content-Type: application/json\""
  
  # Add auth headers if provided
  if [ -n "$headers" ]; then
    # Extract token and tenant from headers string
    local token=$(echo "$headers" | grep -o 'Bearer [^"]*' | cut -d' ' -f2)
    local tenant=$(echo "$headers" | grep -o 'x-tenant-id: [^"]*' | cut -d' ' -f2)
    
    if [ -n "$token" ]; then
      curl_cmd="$curl_cmd -H \"Authorization: Bearer $token\""
    fi
    if [ -n "$tenant" ]; then
      curl_cmd="$curl_cmd -H \"x-tenant-id: $tenant\""
    fi
  fi
  
  # Add body if provided
  if [ -n "$body" ]; then
    curl_cmd="$curl_cmd -d '$body'"
  fi
  
  # Execute curl with timeout
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
    fi
    
    return 0
  else
    echo -e "${RED}❌ FAIL${NC} (HTTP $http_code)"
    echo "   Response: $(echo "$body_response" | head -2 | tr '\n' ' ')"
    ((FAILED++))
    RESULTS+=("❌ $name: FAIL (HTTP $http_code)")
    return 1
  fi
}

# Step 1: Health Checks
echo "=========================================="
echo "1️⃣  Health Checks"
echo "=========================================="
test_api "Auth Health" "GET" "/api/auth/health" "" "" "200"
test_api "HR Health" "GET" "/api/hr/health" "" "" "200"
test_api "Attendance Health" "GET" "/api/attendance/health" "" "" "200"
echo ""

# Step 2: Admin Login
echo "=========================================="
echo "2️⃣  Admin Login"
echo "=========================================="
LOGIN_BODY='{"email":"admin@upcapto.com","password":"Admin@123"}'
LOGIN_RESPONSE=$(curl -s -X POST \
  "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_BODY")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // .data.token // .token // empty')
TENANT_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.tenantId // .user.tenantId // "upcapto"')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${YELLOW}⚠️  First login failed - trying lenstrack admin${NC}"
  # Try lenstrack admin
  LOGIN_BODY='{"email":"Admin@lenstrack.com","password":"Kadarkhan@123"}'
  LOGIN_RESPONSE=$(curl -s -X POST \
    "$API_BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "$LOGIN_BODY")
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // .data.token // .token // empty')
  TENANT_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.tenantId // .user.tenantId // "lenstrack"')
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ Login failed - cannot continue${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo "   Tenant ID: $TENANT_ID"
echo ""

# Store token and tenant for use in test_api function
export AUTH_TOKEN="$TOKEN"
export AUTH_TENANT="$TENANT_ID"
AUTH_HEADERS="Bearer $TOKEN x-tenant-id: $TENANT_ID"

# Step 3: Auth APIs
echo "=========================================="
echo "3️⃣  Auth APIs (Existing Data)"
echo "=========================================="
test_api "Get Current User" "GET" "/api/auth/me" "$AUTH_HEADERS" "" "200"
echo ""

# Step 4: Tenant/Company APIs
echo "=========================================="
echo "4️⃣  Tenant/Company APIs (Existing Data)"
echo "=========================================="
test_api "Get Current Company" "GET" "/api/tenant/company" "$AUTH_HEADERS" "" "200"
echo ""

# Step 5: HR APIs - Get Existing Data
echo "=========================================="
echo "5️⃣  HR APIs (Existing DB Data)"
echo "=========================================="
test_api "Get Employees" "GET" "/api/hr/employees?page=1&limit=20" "$AUTH_HEADERS" "" "200"
test_api "Get Departments" "GET" "/api/hr/departments" "$AUTH_HEADERS" "" "200"
test_api "Get Stores" "GET" "/api/hr/stores" "$AUTH_HEADERS" "" "200"

# Get first employee ID for detailed tests
FIRST_EMPLOYEE_RESPONSE=$(curl -s -X GET \
  "$API_BASE_URL/api/hr/employees?page=1&limit=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

# Handle different response formats
FIRST_EMPLOYEE_ID=$(echo "$FIRST_EMPLOYEE_RESPONSE" | jq -r 'if .data.employees then .data.employees[0]._id elif .data[0] then .data[0]._id elif .employees[0] then .employees[0]._id elif .data then .data._id else empty end')
FIRST_EMPLOYEE_EMP_ID=$(echo "$FIRST_EMPLOYEE_RESPONSE" | jq -r 'if .data.employees then .data.employees[0].employeeId elif .data[0] then .data[0].employeeId elif .employees[0] then .employees[0].employeeId elif .data then .data.employeeId else empty end')

if [ -n "$FIRST_EMPLOYEE_ID" ] && [ "$FIRST_EMPLOYEE_ID" != "null" ]; then
  echo ""
  echo "   📋 Testing with existing employee: $FIRST_EMPLOYEE_EMP_ID"
  test_api "Get Employee by ID" "GET" "/api/hr/employees/$FIRST_EMPLOYEE_ID" "$AUTH_HEADERS" "" "200"
fi

# Get first store ID
FIRST_STORE_RESPONSE=$(curl -s -X GET \
  "$API_BASE_URL/api/hr/stores?page=1&limit=1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

# Handle different response formats
FIRST_STORE_ID=$(echo "$FIRST_STORE_RESPONSE" | jq -r 'if .data.stores then .data.stores[0]._id elif .data[0] then .data[0]._id elif .stores[0] then .stores[0]._id elif .data then .data._id else empty end')

if [ -n "$FIRST_STORE_ID" ] && [ "$FIRST_STORE_ID" != "null" ]; then
  echo ""
  echo "   📋 Testing with existing store ID: $FIRST_STORE_ID"
  test_api "Get Store by ID" "GET" "/api/hr/stores/$FIRST_STORE_ID" "$AUTH_HEADERS" "" "200"
fi

echo ""

# Step 6: Attendance APIs - Get Existing Data
echo "=========================================="
echo "6️⃣  Attendance APIs (Existing DB Data)"
echo "=========================================="
test_api "Get Attendance Records" "GET" "/api/attendance?page=1&limit=20" "$AUTH_HEADERS" "" "200"

# Get attendance summary with date range (last 30 days)
END_DATE=$(date +%Y-%m-%d)
START_DATE=$(date -v-30d +%Y-%m-%d 2>/dev/null || date -d "30 days ago" +%Y-%m-%d 2>/dev/null || echo "2026-01-01")
test_api "Get Attendance Summary" "GET" "/api/attendance/summary?startDate=$START_DATE&endDate=$END_DATE" "$AUTH_HEADERS" "" "200"
echo ""

# Step 7: Performance APIs (if available)
echo "=========================================="
echo "7️⃣  Performance APIs (Existing Data)"
echo "=========================================="
if [ -n "$FIRST_EMPLOYEE_ID" ] && [ "$FIRST_EMPLOYEE_ID" != "null" ]; then
  test_api "Get Employee Performance" "GET" "/api/hr/performance/employee/$FIRST_EMPLOYEE_ID" "$AUTH_HEADERS" "" "200"
  test_api "Get Employee Details" "GET" "/api/hr/employee/$FIRST_EMPLOYEE_ID" "$AUTH_HEADERS" "" "200"
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

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  Some tests failed${NC}"
  echo ""
  echo "Failed Tests:"
  for result in "${RESULTS[@]}"; do
    if [[ $result == ❌* ]]; then
      echo "  $result"
    fi
  done
  exit 1
fi
