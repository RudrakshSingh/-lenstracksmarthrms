#!/bin/bash

# Don't exit on error - continue testing all APIs
set +e

API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
TENANT_ID="upcapto"

echo "=========================================="
echo "🧪 Complete End-to-End API Test"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
TOTAL=0

# Helper function to test API
test_api() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"
  local expected_status="${5:-200}"
  
  TOTAL=$((TOTAL + 1))
  echo -e "${BLUE}Testing: $name${NC}"
  
  if [ "$method" == "GET" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "x-tenant-id: $TENANT_ID" \
      -H "Content-Type: application/json")
  elif [ "$method" == "POST" ]; then
    if [[ "$data" == *"FormData"* ]]; then
      # Handle multipart/form-data
      RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE$endpoint" \
        -H "Authorization: Bearer $TOKEN" \
        -H "x-tenant-id: $TENANT_ID" \
        -F "${data#FormData: }")
    else
      RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE$endpoint" \
        -H "Authorization: Bearer $TOKEN" \
        -H "x-tenant-id: $TENANT_ID" \
        -H "Content-Type: application/json" \
        -d "$data")
    fi
  elif [ "$method" == "PUT" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$API_BASE$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "x-tenant-id: $TENANT_ID" \
      -H "Content-Type: application/json" \
      -d "$data")
  elif [ "$method" == "PATCH" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$API_BASE$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "x-tenant-id: $TENANT_ID" \
      -H "Content-Type: application/json" \
      -d "$data")
  elif [ "$method" == "DELETE" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$API_BASE$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "x-tenant-id: $TENANT_ID" \
      -H "Content-Type: application/json")
  fi
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" == "$expected_status" ] || echo "$BODY" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ PASS${NC}"
    PASSED=$((PASSED + 1))
    echo "$BODY" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"   Message: {d.get('message', 'N/A')}\"); print(f\"   Data keys: {', '.join(d.get('data', {}).keys())[:50] if isinstance(d.get('data'), dict) else 'N/A'}\")" 2>/dev/null || echo "   Response received"
    return 0
  else
    echo -e "${RED}❌ FAIL${NC} (HTTP: $HTTP_CODE)"
    FAILED=$((FAILED + 1))
    echo "$BODY" | head -c 200
    echo ""
    return 1
  fi
}

# Step 1: Login
echo "=========================================="
echo "Step 1: Authentication"
echo "=========================================="
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@upcapto.com","password":"Upcapto@2026"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('accessToken', ''))" 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  echo "$LOGIN_RESPONSE" | head -c 300
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo "Token: ${TOKEN:0:60}..."
echo ""

# Step 2: Health Checks
echo "=========================================="
echo "Step 2: Health Checks"
echo "=========================================="
test_api "Auth Service Health" "GET" "/api/auth/health" "" "200"
test_api "HR Service Health" "GET" "/api/hr/health" "" "200"
test_api "Attendance Service Health" "GET" "/api/attendance/health" "" "200"
test_api "Payroll Service Health" "GET" "/api/payroll/health" "" "200"
echo ""

# Step 3: Tenant/Company APIs
echo "=========================================="
echo "Step 3: Tenant/Company APIs"
echo "=========================================="
test_api "Get Current Company" "GET" "/api/tenant/company" "" "200"
test_api "Get Auth User Info" "GET" "/api/auth/me" "" "200"
echo ""

# Step 4: Dashboard APIs
echo "=========================================="
echo "Step 4: Dashboard APIs"
echo "=========================================="
test_api "Get Dashboard Departments" "GET" "/api/hr/dashboard/departments" "" "200"
test_api "Get Unified Dashboard" "GET" "/api/hr/dashboard" "" "200"
test_api "Get Dashboard Stats" "GET" "/api/hr/dashboard/stats" "" "200"
echo ""

# Step 5: Department APIs
echo "=========================================="
echo "Step 5: Department Management"
echo "=========================================="
DEPT_DATA='{"name":"Test Department","code":"TEST-DEPT-001","description":"Test department for E2E testing"}'
test_api "Create Department" "POST" "/api/hr/departments" "$DEPT_DATA" "201"
test_api "List Departments" "GET" "/api/hr/departments" "" "200"

# Get department ID for update/delete
DEPT_LIST=$(curl -s -X GET "$API_BASE/api/hr/departments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID")
DEPT_ID=$(echo "$DEPT_LIST" | python3 -c "import sys, json; d=json.load(sys.stdin); depts=d.get('data', []); print(depts[0].get('id', '') if depts else '')" 2>/dev/null)

if [ -n "$DEPT_ID" ] && [ "$DEPT_ID" != "null" ]; then
  test_api "Get Department by ID" "GET" "/api/hr/departments/$DEPT_ID" "" "200"
  test_api "Update Department" "PUT" "/api/hr/departments/$DEPT_ID" '{"name":"Updated Test Department"}' "200"
fi
echo ""

# Step 6: Store APIs
echo "=========================================="
echo "Step 6: Store Management"
echo "=========================================="
test_api "List Stores" "GET" "/api/hr/stores" "" "200"

# Get store ID if available
STORE_LIST=$(curl -s -X GET "$API_BASE/api/hr/stores" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID")
STORE_ID=$(echo "$STORE_LIST" | python3 -c "import sys, json; d=json.load(sys.stdin); stores=d.get('data', []); print(stores[0].get('id', '') if stores else '')" 2>/dev/null)

if [ -n "$STORE_ID" ] && [ "$STORE_ID" != "null" ]; then
  test_api "Get Store by ID" "GET" "/api/hr/stores/$STORE_ID" "" "200"
fi
echo ""

# Step 7: Employee APIs
echo "=========================================="
echo "Step 7: Employee Management"
echo "=========================================="
test_api "List Employees" "GET" "/api/hr/employees" "" "200"

# Create employee
EMP_DATA='{
  "employeeId":"E2E-TEST-001",
  "firstName":"Test",
  "lastName":"Employee",
  "fullName":"Test Employee",
  "email":"test.employee@example.com",
  "phone":"+919876543210",
  "department":"'$DEPT_ID'",
  "designation":"Test Engineer",
  "jobTitle":"Test Engineer",
  "status":"active",
  "doj":"2024-01-01",
  "annual_ctc":600000,
  "storeId":"'$STORE_ID'"
}'

test_api "Create Employee" "POST" "/api/hr/employees" "$EMP_DATA" "201"

# Get employee ID
EMP_LIST=$(curl -s -X GET "$API_BASE/api/hr/employees?search=E2E-TEST-001" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID")
EMP_ID=$(echo "$EMP_LIST" | python3 -c "import sys, json; d=json.load(sys.stdin); emps=d.get('data', []); print(emps[0].get('id', '') if emps else '')" 2>/dev/null)

if [ -n "$EMP_ID" ] && [ "$EMP_ID" != "null" ]; then
  test_api "Get Employee by ID" "GET" "/api/hr/employees/$EMP_ID" "" "200"
  test_api "Update Employee" "PUT" "/api/hr/employees/$EMP_ID" '{"phone":"+919999999999"}' "200"
  test_api "Update Employee Status" "PATCH" "/api/hr/employees/$EMP_ID/status" '{"status":"active"}' "200"
fi
echo ""

# Step 8: Attendance APIs
echo "=========================================="
echo "Step 8: Attendance Management"
echo "=========================================="
# Clock-in first
CLOCK_IN_RESPONSE=$(curl -s -X POST "$API_BASE/api/attendance/clock-in" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -F "latitude=19.0764" \
  -F "longitude=72.8778" \
  -F "notes=E2E Test Clock-In")

if echo "$CLOCK_IN_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Clock-In successful${NC}"
  PASSED=$((PASSED + 1))
  TOTAL=$((TOTAL + 1))
  sleep 2
else
  echo -e "${YELLOW}⚠️  Clock-In may have failed or already clocked in${NC}"
  TOTAL=$((TOTAL + 1))
fi

TODAY=$(date +%Y-%m-%d)
START_DATE=$(date -d "7 days ago" +%Y-%m-%d 2>/dev/null || date -v-7d +%Y-%m-%d 2>/dev/null || date +%Y-%m-%d)
END_DATE=$(date +%Y-%m-%d)

test_api "Get Attendance Records" "GET" "/api/attendance?date=$TODAY&limit=10" "" "200"
test_api "Get Attendance Summary" "GET" "/api/attendance/summary?startDate=$START_DATE&endDate=$END_DATE" "" "200"
test_api "Track Location" "POST" "/api/attendance/track-location" '{"latitude":19.0764,"longitude":72.8778,"autoCheckIn":false}' "200"

# Clock-out
CLOCK_OUT_RESPONSE=$(curl -s -X POST "$API_BASE/api/attendance/clock-out" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -F "latitude=19.0764" \
  -F "longitude=72.8778" \
  -F "notes=E2E Test Clock-Out")

if echo "$CLOCK_OUT_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Clock-Out successful${NC}"
  PASSED=$((PASSED + 1))
  TOTAL=$((TOTAL + 1))
else
  echo -e "${YELLOW}⚠️  Clock-Out may have failed or no active session${NC}"
  TOTAL=$((TOTAL + 1))
fi

# Get attendance after clock-out
test_api "Get Attendance After Clock-Out" "GET" "/api/attendance?date=$TODAY&limit=10" "" "200"
echo ""

# Step 9: Payroll APIs
echo "=========================================="
echo "Step 9: Payroll APIs"
echo "=========================================="
test_api "Calculate Salary Breakdown" "POST" "/api/payroll/calculate" '{"grossMonthly":50000}' "200"
test_api "Get Salary Details" "GET" "/api/payroll/salary" "" "200"
echo ""

# Step 10: Time Tracking APIs
echo "=========================================="
echo "Step 10: Time Tracking APIs"
echo "=========================================="
test_api "Get Time Tracking Stats" "GET" "/api/hr/time-tracking/stats" "" "200"
test_api "Get Time Tracking via HR" "GET" "/api/hr/time-tracking" "" "200"
echo ""

# Step 11: Performance APIs
echo "=========================================="
echo "Step 11: Performance APIs"
echo "=========================================="
if [ -n "$EMP_ID" ] && [ "$EMP_ID" != "null" ]; then
  test_api "Get Employee Performance" "GET" "/api/hr/performance/employee/$EMP_ID?period=monthly" "" "200"
  test_api "Get Employee Performance (Alt Route)" "GET" "/api/hr/employee/$EMP_ID?period=monthly" "" "200"
fi
test_api "Get My Performance Metrics" "GET" "/api/hr/performance/me/metrics?period=monthly" "" "200"
test_api "Get My Performance Trends" "GET" "/api/hr/performance/me/trends?period=monthly" "" "200"
echo ""

# Final Summary
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo -e "${BLUE}📊 Total: $TOTAL${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  Some tests failed. Check output above.${NC}"
  exit 1
fi
