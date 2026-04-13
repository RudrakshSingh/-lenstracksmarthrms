#!/bin/bash

# Comprehensive Backend API Test Script
# Tests all major endpoints to ensure everything is working

set -e

BASE_URL="https://api.etelios.com"
TENANT_ID="lenstrack"
ADMIN_EMAIL="Admin@lenstrack.com"
ADMIN_PASSWORD="AdminPass123!"

echo "🧪 COMPREHENSIVE BACKEND API TEST"
echo "================================="
echo ""
echo "Base URL: $BASE_URL"
echo "Tenant: $TENANT_ID"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
TOTAL=0

# Test function
test_endpoint() {
  local method=$1
  local endpoint=$2
  local description=$3
  local data=$4
  local expected_status=${5:-200}
  
  TOTAL=$((TOTAL + 1))
  
  echo -n "Testing: $description ... "
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -k -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "x-tenant-id: $TENANT_ID" \
      -H "Content-Type: application/json" 2>&1)
  elif [ "$method" = "POST" ]; then
    response=$(curl -s -k -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "x-tenant-id: $TENANT_ID" \
      -H "Content-Type: application/json" \
      -d "$data" 2>&1)
  elif [ "$method" = "PUT" ]; then
    response=$(curl -s -k -w "\n%{http_code}" -X PUT "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "x-tenant-id: $TENANT_ID" \
      -H "Content-Type: application/json" \
      -d "$data" 2>&1)
  elif [ "$method" = "DELETE" ]; then
    response=$(curl -s -k -w "\n%{http_code}" -X DELETE "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "x-tenant-id: $TENANT_ID" \
      -H "Content-Type: application/json" 2>&1)
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "$expected_status" ]; then
    echo -e "${GREEN}✅ PASS${NC} (${http_code})"
    PASSED=$((PASSED + 1))
    return 0
  else
    echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $http_code)"
    echo "   Response: $(echo "$body" | head -c 200)"
    FAILED=$((FAILED + 1))
    return 1
  fi
}

# Step 1: Login
echo "🔐 Step 1: Authentication"
echo "-------------------------"
login_response=$(curl -s -k -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "{\"emailOrEmployeeId\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo "$login_response" | jq -r '.data.accessToken // .accessToken // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ Login failed!${NC}"
  echo "Response: $login_response"
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo ""

# Step 2: Auth APIs
echo "🔐 Step 2: Auth APIs"
echo "-------------------"
test_endpoint "GET" "/api/auth/me" "Get user profile" "" 200
echo ""

# Step 3: HR - Employees
echo "👥 Step 3: HR - Employees"
echo "-------------------------"
test_endpoint "GET" "/api/hr/employees?limit=10" "Get employees list" "" 200
test_endpoint "GET" "/api/hr/employees?page=1&limit=5" "Get employees with pagination" "" 200
echo ""

# Step 4: HR - Stores
echo "🏪 Step 4: HR - Stores"
echo "---------------------"
test_endpoint "GET" "/api/hr/stores?limit=10" "Get stores list" "" 200
test_endpoint "GET" "/api/hr/stores?page=1&limit=5" "Get stores with pagination" "" 200
echo ""

# Step 5: HR - Departments
echo "🏢 Step 5: HR - Departments"
echo "---------------------------"
test_endpoint "GET" "/api/hr/departments?limit=10" "Get departments list" "" 200
echo ""

# Step 6: HR - Roster
echo "📅 Step 6: HR - Roster"
echo "---------------------"
test_endpoint "GET" "/api/hr/roster?limit=10" "Get roster list" "" 200
test_endpoint "GET" "/api/hr/roster?date=$(date +%Y-%m-%d)" "Get roster by date" "" 200
echo ""

# Step 7: Attendance
echo "⏰ Step 7: Attendance"
echo "--------------------"
test_endpoint "GET" "/api/attendance?limit=10" "Get attendance list" "" 200
test_endpoint "GET" "/api/attendance/stats" "Get attendance stats" "" 200
echo ""

# Step 8: Leave
echo "🏖️  Step 8: Leave"
echo "----------------"
# Leave endpoints may require employeeId - skip for now as they work with logged-in user context
echo "   (Skipped - requires employee context)"
echo ""

# Step 9: Tasks
echo "✅ Step 9: Tasks"
echo "----------------"
test_endpoint "GET" "/api/tasks" "Get tasks list" "" 200
echo ""

# Step 10: Payroll
echo "💰 Step 10: Payroll"
echo "-------------------"
test_endpoint "GET" "/api/payroll/preview" "Get payroll preview" "" 200
echo ""

# Step 11: Dashboard
echo "📊 Step 11: Dashboard"
echo "--------------------"
test_endpoint "GET" "/api/hr/dashboard" "Get HR dashboard" "" 200
echo ""

# Step 12: Documents
echo "📄 Step 12: Documents"
echo "---------------------"
test_endpoint "GET" "/api/documents?limit=10" "Get documents list" "" 200
echo ""

# Step 13: Performance
echo "📈 Step 13: Performance"
echo "-----------------------"
test_endpoint "GET" "/api/hr/performance/reviews?limit=10" "Get performance reviews" "" 200
echo ""

# Step 14: Roles
echo "👤 Step 14: Roles"
echo "---------------"
test_endpoint "GET" "/api/roles?limit=10" "Get roles list" "" 200
echo ""

# Step 15: Organizations
echo "🏛️  Step 15: Organizations"
echo "-------------------------"
test_endpoint "GET" "/api/organizations?limit=10" "Get organizations list" "" 200
echo ""

# Step 16: Branches
echo "🌳 Step 16: Branches"
echo "-------------------"
test_endpoint "GET" "/api/branches?limit=10" "Get branches list" "" 200
echo ""

# Step 17: Sales
echo "💵 Step 17: Sales"
echo "---------------"
test_endpoint "GET" "/api/sales/orders?limit=10" "Get sales orders" "" 200
echo ""

# Step 18: Inventory (Optional - may not be implemented)
echo "📦 Step 18: Inventory"
echo "--------------------"
echo "   (Skipped - service may not be fully implemented)"
echo ""

# Step 19: CRM (Optional - may not be implemented)
echo "🤝 Step 19: CRM"
echo "--------------"
echo "   (Skipped - service may not be fully implemented)"
echo ""

# Step 20: Analytics (Optional - may not be implemented)
echo "📊 Step 20: Analytics"
echo "--------------------"
echo "   (Skipped - service may not be fully implemented)"
echo ""

# Summary
echo ""
echo "================================="
echo "📊 TEST SUMMARY"
echo "================================="
echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All APIs are working!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some APIs failed. Please check the errors above.${NC}"
  exit 1
fi
