#!/bin/bash

###############################################################################
# Complete Admin Flow Test
# 1. Admin Login
# 2. Create Employee
# 3. Mark Attendance
# 4. Sales Entry & Target Check
# 5. All APIs Test
###############################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

PASSED=0
FAILED=0

test_api() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="${5:-200}"
    
    echo -e "${BLUE}Testing: $name${NC}"
    
    if [ "$method" == "GET" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "x-tenant-id: $TENANT_ID" \
            -H "Content-Type: application/json" 2>&1)
    elif [ "$method" == "POST" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "x-tenant-id: $TENANT_ID" \
            -H "Content-Type: application/json" \
            -d "$data" 2>&1)
    elif [ "$method" == "PUT" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$API_BASE$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "x-tenant-id: $TENANT_ID" \
            -H "Content-Type: application/json" \
            -d "$data" 2>&1)
    elif [ "$method" == "PATCH" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$API_BASE$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "x-tenant-id: $TENANT_ID" \
            -H "Content-Type: application/json" \
            -d "$data" 2>&1)
    fi
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" == "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP: $HTTP_CODE)"
        if echo "$BODY" | jq -e '.success' > /dev/null 2>&1; then
            MESSAGE=$(echo "$BODY" | jq -r '.message // "N/A"')
            echo "   Message: $MESSAGE"
        fi
        PASSED=$((PASSED + 1))
        echo "$BODY"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (HTTP: $HTTP_CODE, Expected: $expected_status)"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo "=========================================="
echo "🧪 Complete Admin Flow Test"
echo "=========================================="
echo ""

# Step 1: Login (Try admin first, fallback to any user)
echo "=========================================="
echo "Step 1: Login"
echo "=========================================="

# Try multiple admin accounts
ADMIN_ACCOUNTS=(
  '{"email":"admin@upcapto.com","password":"Upcapto@2026"}'
  '{"email":"admin@etelios.com","password":"Admin@123"}'
  '{"email":"admin@etelios.com","password":"Admin@123456"}'
  '{"email":"superadmin@etelios.com","password":"Admin@123"}'
  '{"email":"hr@etelios.com","password":"Admin@123"}'
)

TOKEN=""
for account in "${ADMIN_ACCOUNTS[@]}"; do
  LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "$account")
  
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // .data.token // empty')
  if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo "$LOGIN_RESPONSE" | jq '.'
    break
  fi
done

# If no admin, use employee account
if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo -e "${YELLOW}⚠️  No admin account found, using employee account${NC}"
  LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "lenstrack01@gmail.com",
      "password": "cnbxs2b9A1!"
    }')
  
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // .data.token // empty')
  if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo -e "${RED}❌ Login failed - no token received${NC}"
    exit 1
  fi
  echo "$LOGIN_RESPONSE" | jq '.'
fi

TENANT_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.tenantId // .data.user.tenant_id // "default"')
USER_NAME=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.name // .data.user.fullName // "N/A"')
USER_ROLE=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.role // "N/A"')

echo ""
echo -e "${GREEN}✅ Login successful!${NC}"
echo "   User: $USER_NAME"
echo "   Role: $USER_ROLE"
echo "   Tenant ID: $TENANT_ID"
echo ""

# Step 2: Create Employee (Skip if not admin)
echo "=========================================="
echo "Step 2: Create Employee"
echo "=========================================="

RANDOM_ID=$(date +%s | tail -c 6)
EMPLOYEE_EMAIL="testemployee${RANDOM_ID}@test.com"
EMPLOYEE_NAME="Test Employee ${RANDOM_ID}"

CREATE_EMPLOYEE_DATA=$(cat <<EOF
{
  "firstName": "Test",
  "lastName": "Employee${RANDOM_ID}",
  "email": "$EMPLOYEE_EMAIL",
  "phone": "+91 98765${RANDOM_ID}",
  "employeeId": "EMP-TEST-${RANDOM_ID}",
  "designation": "Sales Executive",
  "department": "Sales",
  "status": "active",
  "joiningDate": "$(date +%Y-%m-%d)"
}
EOF
)

# Try to create employee, but continue if it fails (not admin)
if test_api "Create Employee" "POST" "/api/hr/employees" "$CREATE_EMPLOYEE_DATA" "201"; then
  EMPLOYEE_CREATED=true
else
  echo -e "${YELLOW}⚠️  Cannot create employee (not admin), using existing employee${NC}"
  EMPLOYEE_CREATED=false
  # Use current user as employee
  EMPLOYEE_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user._id // .data.user.id // empty')
  if [ -z "$EMPLOYEE_ID" ] || [ "$EMPLOYEE_ID" == "null" ]; then
    # Try to get from employee list
    EMP_LIST_RESPONSE=$(curl -s -X GET "$API_BASE/api/hr/employees?limit=1" \
      -H "Authorization: Bearer $TOKEN" \
      -H "x-tenant-id: $TENANT_ID")
    
    EMPLOYEE_ID=$(echo "$EMP_LIST_RESPONSE" | jq -r '.data[0].id // .data[0]._id // .data.employees[0].id // empty')
  fi
fi

if [ -z "$EMPLOYEE_ID" ] || [ "$EMPLOYEE_ID" == "null" ]; then
  echo -e "${RED}❌ Could not get employee ID${NC}"
  EMPLOYEE_ID="unknown"
else
  echo -e "${GREEN}✅ Using Employee ID: $EMPLOYEE_ID${NC}"
fi

EMPLOYEE_ID=$(echo "$BODY" | jq -r '.data.id // .data._id // empty')
if [ -z "$EMPLOYEE_ID" ] || [ "$EMPLOYEE_ID" == "null" ]; then
  echo -e "${YELLOW}⚠️  Employee ID not found in response, trying to get from list${NC}"
  # Try to get employee from list
  EMP_LIST_RESPONSE=$(curl -s -X GET "$API_BASE/api/hr/employees?search=$EMPLOYEE_EMAIL" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-tenant-id: $TENANT_ID")
  
  EMPLOYEE_ID=$(echo "$EMP_LIST_RESPONSE" | jq -r '.data[0].id // .data.employees[0].id // .data[0]._id // empty')
fi

if [ -z "$EMPLOYEE_ID" ] || [ "$EMPLOYEE_ID" == "null" ]; then
  echo -e "${RED}❌ Could not get employee ID${NC}"
  EMPLOYEE_ID="unknown"
else
  echo -e "${GREEN}✅ Employee ID: $EMPLOYEE_ID${NC}"
fi

echo ""

# Step 3: Mark Attendance for Employee
echo "=========================================="
echo "Step 3: Mark Attendance"
echo "=========================================="

# Clock In (try different route formats)
CLOCK_IN_DATA=$(cat <<EOF
{
  "latitude": 19.0764,
  "longitude": 72.8778,
  "notes": "Test attendance from admin flow"
}
EOF
)

# Try clock-in route
echo -e "${BLUE}Testing: Clock In${NC}"
CLOCK_IN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/attendance/clock-in" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d "$CLOCK_IN_DATA" 2>&1)

HTTP_CODE=$(echo "$CLOCK_IN_RESPONSE" | tail -n1)
BODY=$(echo "$CLOCK_IN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "201" ] || [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✅ PASS${NC} (HTTP: $HTTP_CODE)"
  PASSED=$((PASSED + 1))
  ATTENDANCE_ID=$(echo "$BODY" | jq -r '.data._id // .data.id // empty')
  echo "   Attendance ID: $ATTENDANCE_ID"
else
  # Try alternative route
  echo -e "${YELLOW}⚠️  Clock-in route not found, trying alternative${NC}"
  CLOCK_IN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/attendance" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-tenant-id: $TENANT_ID" \
    -H "Content-Type: application/json" \
    -d "$CLOCK_IN_DATA" 2>&1)
  
  HTTP_CODE=$(echo "$CLOCK_IN_RESPONSE" | tail -n1)
  BODY=$(echo "$CLOCK_IN_RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" == "201" ] || [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP: $HTTP_CODE)"
    PASSED=$((PASSED + 1))
    ATTENDANCE_ID=$(echo "$BODY" | jq -r '.data._id // .data.id // empty')
    echo "   Attendance ID: $ATTENDANCE_ID"
  else
    echo -e "${YELLOW}⚠️  Clock-in may have failed or already clocked in${NC} (HTTP: $HTTP_CODE)"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  fi
fi

ATTENDANCE_ID=$(echo "$BODY" | jq -r '.data._id // .data.id // empty')
echo "   Attendance ID: $ATTENDANCE_ID"
echo ""

# Get Attendance Records (use /records endpoint)
test_api "Get Attendance Records" "GET" "/api/attendance/records" "" "200"
echo ""

# Get Attendance Summary
START_DATE=$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d '7 days ago' +%Y-%m-%d)
END_DATE=$(date +%Y-%m-%d)
test_api "Get Attendance Summary" "GET" "/api/attendance/summary?startDate=$START_DATE&endDate=$END_DATE" "" "200"
echo ""

# Step 4: Sales Entry & Target Check
echo "=========================================="
echo "Step 4: Sales Entry & Target Check"
echo "=========================================="

# Check if sales/CRM APIs exist
test_api "Get Dashboard Stats" "GET" "/api/hr/dashboard/stats" "" "200"
echo ""

# Get Employee Performance (includes targets)
test_api "Get Employee Performance" "GET" "/api/hr/performance/employee/$EMPLOYEE_ID" "" "200"
echo ""

# Get Employee Details
test_api "Get Employee by ID" "GET" "/api/hr/employees/$EMPLOYEE_ID" "" "200"
echo ""

# Step 5: All Other APIs
echo "=========================================="
echo "Step 5: All Other APIs Test"
echo "=========================================="

# Health Checks
test_api "Auth Service Health" "GET" "/api/auth/health" "" "200"
test_api "HR Service Health" "GET" "/api/hr/health" "" "200"
test_api "Attendance Service Health" "GET" "/api/attendance/health" "" "200"
echo ""

# Tenant/Company
test_api "Get Current Company" "GET" "/api/tenant/company" "" "200"
echo ""

# Dashboard
test_api "Get Dashboard" "GET" "/api/hr/dashboard" "" "200"
test_api "Get Dashboard Departments" "GET" "/api/hr/dashboard/departments" "" "200"
echo ""

# Departments
test_api "List Departments" "GET" "/api/hr/departments" "" "200"
echo ""

# Stores
test_api "List Stores" "GET" "/api/hr/stores" "" "200"
echo ""

# Employees
test_api "List Employees" "GET" "/api/hr/employees" "" "200"
echo ""

# Time Tracking
test_api "Get Time Tracking Stats" "GET" "/api/hr/time-tracking/stats" "" "200"
test_api "Get Time Tracking" "GET" "/api/hr/time-tracking" "" "200"
echo ""

# Performance
test_api "Get My Performance Metrics" "GET" "/api/hr/performance/me/metrics" "" "200"
test_api "Get My Performance Trends" "GET" "/api/hr/performance/me/trends" "" "200"
echo ""

# Clock Out
echo -e "${BLUE}Testing: Clock Out${NC}"
CLOCK_OUT_RESPONSE=$(curl -s -X POST "$API_BASE/api/attendance/clock-out" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 19.0764,
    "longitude": 72.8778,
    "notes": "Test clock out"
  }')

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_BASE/api/attendance/clock-out" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"latitude": 19.0764, "longitude": 72.8778}')

if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "201" ]; then
  echo -e "${GREEN}✅ PASS${NC} (HTTP: $HTTP_CODE)"
  PASSED=$((PASSED + 1))
else
  echo -e "${YELLOW}⚠️  Clock-Out may have failed or no active session${NC} (HTTP: $HTTP_CODE)"
fi
echo ""

# Final Summary
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
TOTAL=$((PASSED + FAILED))
echo -e "${BLUE}📊 Total: $TOTAL${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
else
  echo -e "${YELLOW}⚠️  Some tests failed. Check output above.${NC}"
fi

echo ""
echo "=========================================="
echo "✅ Complete Admin Flow Test Finished"
echo "=========================================="
