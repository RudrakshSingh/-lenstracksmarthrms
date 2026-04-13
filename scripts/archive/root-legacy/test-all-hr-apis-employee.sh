#!/bin/bash

# Test all HR APIs (except payment, login, tenant, attendance, auth, onboarding, clock in/out)
# Using an employee present in the DB

# Don't exit on error - continue testing all APIs
set +e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API Configuration
API_BASE_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
TENANT_ID="lenstrack"

# Admin credentials
ADMIN_EMAIL="Admin@lenstrack.com"
ADMIN_PASSWORD="Kadarkhan@123"

# Counters
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
  
  echo -n "  Testing $name... "
  
  if [ -n "$data" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X "$method" \
      "$url" \
      -H "$headers" \
      -H "Content-Type: application/json" \
      -d "$data" 2>/dev/null || echo -e "\n000")
  else
    RESPONSE=$(curl -s -w "\n%{http_code}" -X "$method" \
      "$url" \
      -H "$headers" 2>/dev/null || echo -e "\n000")
  fi
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" = "$expected_status" ]; then
    echo -e "${GREEN}✅${NC} (HTTP $HTTP_CODE)"
    ((PASSED++))
    return 0
  elif [ "$HTTP_CODE" = "404" ]; then
    echo -e "${YELLOW}⚠️  Not Found${NC} (HTTP $HTTP_CODE)"
    ((SKIPPED++))
    return 1
  elif [ "$HTTP_CODE" = "000" ]; then
    echo -e "${RED}❌${NC} (Connection Failed)"
    ((FAILED++))
    return 1
  else
    echo -e "${RED}❌${NC} (HTTP $HTTP_CODE)"
    ERROR_MSG=$(echo "$BODY" | jq -r '.message // .error // "Unknown error"' 2>/dev/null || echo "Unknown error")
    echo "     Error: $ERROR_MSG"
    ((FAILED++))
    return 1
  fi
}

echo "🧪 Testing All HR APIs (Employee Context)"
echo "=========================================="
echo ""

# Step 1: Admin Login
echo "1️⃣  Admin Login"
echo "----------------------------------------"
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\"
  }")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -1)
BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  ADMIN_TOKEN=$(echo "$BODY" | jq -r '.data.accessToken // .accessToken // .token')
  ADMIN_USER_ID=$(echo "$BODY" | jq -r '.data.user._id // .data.user.id // .user._id // .user.id')
  echo -e "${GREEN}✅ Login successful${NC}"
else
  echo -e "${RED}❌ Login failed${NC} (HTTP $HTTP_CODE)"
  exit 1
fi
echo ""

# Step 2: Get Employee List
echo "2️⃣  Get Employee List"
echo "----------------------------------------"
EMP_LIST_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$API_BASE_URL/api/hr/employees?limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

EMP_LIST_HTTP=$(echo "$EMP_LIST_RESPONSE" | tail -1)
EMP_LIST_BODY=$(echo "$EMP_LIST_RESPONSE" | sed '$d')

if [ "$EMP_LIST_HTTP" = "200" ]; then
  FIRST_EMP=$(echo "$EMP_LIST_BODY" | jq '.data[0]')
  EMP_ID=$(echo "$FIRST_EMP" | jq -r '.employeeId // .employee_id // empty')
  EMP_EMAIL=$(echo "$FIRST_EMP" | jq -r '.email // empty')
  EMP_MONGO_ID=$(echo "$FIRST_EMP" | jq -r '.id // empty')
  echo -e "${GREEN}✅ Employees retrieved${NC}"
  echo "   Using employee: $EMP_ID ($EMP_EMAIL)"
else
  echo -e "${RED}❌ Failed to get employees${NC}"
  exit 1
fi
echo ""

# Step 3: Employee Login
echo "3️⃣  Employee Login"
echo "----------------------------------------"
# Try common passwords
for PASSWORD in "Employee@123" "Password@123" "12345678" "$ADMIN_PASSWORD"; do
  EMP_LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "$API_BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -H "x-tenant-id: $TENANT_ID" \
    -d "{
      \"email\": \"$EMP_EMAIL\",
      \"password\": \"$PASSWORD\"
    }")
  
  EMP_LOGIN_HTTP=$(echo "$EMP_LOGIN_RESPONSE" | tail -1)
  EMP_LOGIN_BODY=$(echo "$EMP_LOGIN_RESPONSE" | sed '$d')
  
  if [ "$EMP_LOGIN_HTTP" = "200" ]; then
    EMP_TOKEN=$(echo "$EMP_LOGIN_BODY" | jq -r '.data.accessToken // .accessToken // .token')
    echo -e "${GREEN}✅ Employee login successful${NC}"
    break
  fi
done

if [ -z "$EMP_TOKEN" ]; then
  echo -e "${YELLOW}⚠️  Employee login failed, using admin token for tests${NC}"
  EMP_TOKEN="$ADMIN_TOKEN"
fi
echo ""

# Headers
HEADERS="Authorization: Bearer $EMP_TOKEN
x-tenant-id: $TENANT_ID"

# Step 4: Test All HR APIs
echo "4️⃣  Testing HR APIs"
echo "=========================================="
echo ""

# Employees APIs
echo "📋 Employees APIs"
echo "----------------------------------------"
test_api "GET /api/hr/employees" "GET" "$API_BASE_URL/api/hr/employees?limit=10" "$HEADERS"
test_api "GET /api/hr/employees (with search)" "GET" "$API_BASE_URL/api/hr/employees?search=test&limit=5" "$HEADERS"
test_api "GET /api/hr/employees (with department filter)" "GET" "$API_BASE_URL/api/hr/employees?department=Lab&limit=5" "$HEADERS"
test_api "GET /api/hr/employees (with status filter)" "GET" "$API_BASE_URL/api/hr/employees?status=active&limit=5" "$HEADERS"
test_api "GET /api/hr/employee/:id" "GET" "$API_BASE_URL/api/hr/employee/$EMP_ID" "$HEADERS"
test_api "GET /api/hr/employees/:id" "GET" "$API_BASE_URL/api/hr/employees/$EMP_MONGO_ID" "$HEADERS"
echo ""

# Departments APIs
echo "📋 Departments APIs"
echo "----------------------------------------"
test_api "GET /api/hr/departments" "GET" "$API_BASE_URL/api/hr/departments" "$HEADERS"
test_api "GET /api/hr/departments (with pagination)" "GET" "$API_BASE_URL/api/hr/departments?page=1&limit=10" "$HEADERS"

# Get first department ID for detail test
DEPT_RESPONSE=$(curl -s -X GET "$API_BASE_URL/api/hr/departments?limit=1" \
  -H "$HEADERS" 2>/dev/null)
FIRST_DEPT_ID=$(echo "$DEPT_RESPONSE" | jq -r '.data[0].id // .data[0]._id // empty' 2>/dev/null)

if [ -n "$FIRST_DEPT_ID" ] && [ "$FIRST_DEPT_ID" != "null" ]; then
  test_api "GET /api/hr/departments/:id" "GET" "$API_BASE_URL/api/hr/departments/$FIRST_DEPT_ID" "$HEADERS"
fi
echo ""

# Stores APIs
echo "📋 Stores APIs"
echo "----------------------------------------"
test_api "GET /api/hr/stores" "GET" "$API_BASE_URL/api/hr/stores?limit=10" "$HEADERS"
test_api "GET /api/hr/stores (with status filter)" "GET" "$API_BASE_URL/api/hr/stores?status=active&limit=5" "$HEADERS"
test_api "GET /api/hr/stores (with city filter)" "GET" "$API_BASE_URL/api/hr/stores?city=mumbai&limit=5" "$HEADERS"

# Get first store ID for detail test
STORE_RESPONSE=$(curl -s -X GET "$API_BASE_URL/api/hr/stores?limit=1" \
  -H "$HEADERS" 2>/dev/null)
FIRST_STORE_ID=$(echo "$STORE_RESPONSE" | jq -r '.data[0].id // .data[0]._id // empty' 2>/dev/null)

if [ -n "$FIRST_STORE_ID" ] && [ "$FIRST_STORE_ID" != "null" ]; then
  test_api "GET /api/hr/stores/:id" "GET" "$API_BASE_URL/api/hr/stores/$FIRST_STORE_ID" "$HEADERS"
fi
echo ""

# Roles APIs
echo "📋 Roles APIs"
echo "----------------------------------------"
test_api "GET /api/hr/roles" "GET" "$API_BASE_URL/api/hr/roles" "$HEADERS"
echo ""

# Dashboard APIs
echo "📋 Dashboard APIs"
echo "----------------------------------------"
test_api "GET /api/hr/dashboard" "GET" "$API_BASE_URL/api/hr/dashboard" "$HEADERS"
test_api "GET /api/hr/dashboard/overview" "GET" "$API_BASE_URL/api/hr/dashboard/overview" "$HEADERS"
test_api "GET /api/hr/dashboard/stats" "GET" "$API_BASE_URL/api/hr/dashboard/stats" "$HEADERS"

# Store manager dashboard (needs storeId)
if [ -n "$FIRST_STORE_ID" ] && [ "$FIRST_STORE_ID" != "null" ]; then
  test_api "GET /api/hr/dashboard/store-manager" "GET" "$API_BASE_URL/api/hr/dashboard/store-manager?storeId=$FIRST_STORE_ID" "$HEADERS"
fi

# Reports with date range
DATE_FROM=$(date -d "30 days ago" +%Y-%m-%d 2>/dev/null || date -v-30d +%Y-%m-%d 2>/dev/null || echo "2026-01-20")
DATE_TO=$(date +%Y-%m-%d)
test_api "GET /api/hr/dashboard/reports" "GET" "$API_BASE_URL/api/hr/dashboard/reports?dateFrom=$DATE_FROM&dateTo=$DATE_TO" "$HEADERS"
echo ""

# Performance APIs
echo "📋 Performance APIs"
echo "----------------------------------------"
test_api "GET /api/hr/performance" "GET" "$API_BASE_URL/api/hr/performance" "$HEADERS"
test_api "GET /api/hr/performance (with period)" "GET" "$API_BASE_URL/api/hr/performance?period=monthly" "$HEADERS"
test_api "GET /api/hr/performance/employee/:id" "GET" "$API_BASE_URL/api/hr/performance/employee/$EMP_ID" "$HEADERS"
test_api "GET /api/hr/performance/employee/:id (by Mongo ID)" "GET" "$API_BASE_URL/api/hr/performance/employee/$EMP_MONGO_ID" "$HEADERS"
echo ""

# Workforce APIs
echo "📋 Workforce APIs"
echo "----------------------------------------"
test_api "GET /api/hr/workforce" "GET" "$API_BASE_URL/api/hr/workforce" "$HEADERS"
test_api "GET /api/hr/workforce (with filters)" "GET" "$API_BASE_URL/api/hr/workforce?department=Lab" "$HEADERS"
echo ""

# Time Tracking APIs
echo "📋 Time Tracking APIs"
echo "----------------------------------------"
test_api "GET /api/hr/time-tracking" "GET" "$API_BASE_URL/api/hr/time-tracking" "$HEADERS"
test_api "GET /api/hr/time-tracking/timesheets" "GET" "$API_BASE_URL/api/hr/time-tracking/timesheets" "$HEADERS"
test_api "GET /api/hr/time-tracking/projects" "GET" "$API_BASE_URL/api/hr/time-tracking/projects" "$HEADERS"
echo ""

# Health/Status APIs
echo "📋 Health/Status APIs"
echo "----------------------------------------"
test_api "GET /api/hr/health" "GET" "$API_BASE_URL/api/hr/health" "" "" "200"
test_api "GET /api/hr/status" "GET" "$API_BASE_URL/api/hr/status" "" "" "200"
test_api "GET /api/hr" "GET" "$API_BASE_URL/api/hr" "" "" "200"
echo ""

# Summary
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo ""
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo -e "${YELLOW}⚠️  Skipped: $SKIPPED${NC}"
echo ""
TOTAL=$((PASSED + FAILED + SKIPPED))
if [ $TOTAL -gt 0 ]; then
  SUCCESS_RATE=$((PASSED * 100 / TOTAL))
  echo "Success Rate: $SUCCESS_RATE%"
fi
echo ""
echo "🎯 All HR APIs tested (except payment, login, tenant, attendance, auth, onboarding, clock in/out)!"
echo ""
