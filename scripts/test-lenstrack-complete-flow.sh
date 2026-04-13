#!/bin/bash

# Complete Flow Test for Lenstrack Tenant
# Tests all APIs in the correct sequence

set -e

NEW_INGRESS_ALB=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>&1)
BASE_URL="http://${NEW_INGRESS_ALB}"

echo "🧪 Complete Flow Test - Lenstrack Tenant"
echo "====================================="
echo ""
echo "Base URL: $BASE_URL"
echo "Tenant: lenstrack"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TOTAL=0
PASSED=0
FAILED=0

test_api() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local headers="$5"
    local expected="${6:-200}"
    
    TOTAL=$((TOTAL + 1))
    printf "%-60s" "Testing $name..."
    
    if [ "$method" = "POST" ] || [ "$method" = "PUT" ] || [ "$method" = "PATCH" ]; then
        if [ -n "$data" ]; then
            RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X "$method" "${BASE_URL}${endpoint}" \
                -H "Content-Type: application/json" \
                -d "$data" \
                $([ -n "$headers" ] && echo "-H '$headers'") \
                --max-time 30 2>&1)
        else
            RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X "$method" "${BASE_URL}${endpoint}" \
                $([ -n "$headers" ] && echo "-H '$headers'") \
                --max-time 30 2>&1)
        fi
    else
        RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X "$method" "${BASE_URL}${endpoint}" \
            $([ -n "$headers" ] && echo "-H '$headers'") \
            --max-time 30 2>&1)
    fi
    
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2 || echo "000")
    BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE" | head -1)
    
    if [ "$HTTP_CODE" = "000" ]; then
        echo -e "${RED}❌ CONNECTION FAILED${NC}"
        FAILED=$((FAILED + 1))
        return 1
    elif [ "$HTTP_CODE" = "$expected" ] || [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $HTTP_CODE)"
        PASSED=$((PASSED + 1))
        echo "$BODY" > /dev/null 2>&1
        return 0
    elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        echo -e "${YELLOW}⚠️  AUTH REQUIRED${NC} (HTTP $HTTP_CODE)"
        FAILED=$((FAILED + 1))
        return 1
    elif [ "$HTTP_CODE" = "404" ]; then
        echo -e "${RED}❌ NOT FOUND${NC} (HTTP $HTTP_CODE)"
        FAILED=$((FAILED + 1))
        return 1
    elif [ "$HTTP_CODE" = "503" ] || [ "$HTTP_CODE" = "502" ]; then
        echo -e "${RED}❌ SERVICE UNAVAILABLE${NC} (HTTP $HTTP_CODE)"
        FAILED=$((FAILED + 1))
        return 1
    else
        echo -e "${RED}❌ HTTP $HTTP_CODE${NC}"
        echo "$BODY" | head -1
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Step 1: Login
echo -e "${BLUE}🔐 Step 1: Login as Lenstrack Admin${NC}"
echo "----------------------------------------"
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@lenstrack.com","password":"AdminPass123!"}' \
    --max-time 30 2>&1)

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // empty' 2>/dev/null || echo "")
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user._id // empty' 2>/dev/null || echo "")
EMPLOYEE_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.employee_id // empty' 2>/dev/null || echo "")

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ] && [ "$TOKEN" != "" ]; then
    echo -e "${GREEN}✅ Login successful!${NC}"
    echo "   User ID: $USER_ID"
    echo "   Employee ID: $EMPLOYEE_ID"
    AUTH_HEADER="Authorization: Bearer $TOKEN"
    TENANT_HEADER="x-tenant-id: lenstrack"
    echo ""
else
    echo -e "${RED}❌ Login failed!${NC}"
    echo "$LOGIN_RESPONSE" | head -5
    exit 1
fi

# Step 2: Auth APIs
echo -e "${BLUE}🔐 Step 2: Auth Service APIs${NC}"
echo "----------------------------------------"
test_api "GET /api/auth/me" "GET" "/api/auth/me" "" "$AUTH_HEADER"
echo ""

# Step 3: Tenant APIs
echo -e "${BLUE}🏢 Step 3: Tenant Registry APIs${NC}"
echo "----------------------------------------"
test_api "GET /api/tenants" "GET" "/api/tenants" "" "$AUTH_HEADER"
test_api "GET /api/platform/health" "GET" "/api/platform/health" "" ""
echo ""

# Step 4: HR Service - Stores
echo -e "${BLUE}🏪 Step 4: HR Service - Stores${NC}"
echo "----------------------------------------"
test_api "GET /api/hr/stores" "GET" "/api/hr/stores" "" "$AUTH_HEADER $TENANT_HEADER"
STORE_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/hr/stores" \
    -H "$AUTH_HEADER" \
    -H "$TENANT_HEADER" \
    --max-time 30 2>&1)
STORE_ID=$(echo "$STORE_RESPONSE" | jq -r '.data[0]._id // empty' 2>/dev/null || echo "")
STORE_CODE=$(echo "$STORE_RESPONSE" | jq -r '.data[0].code // .data[0].storeCode // empty' 2>/dev/null || echo "")
if [ -n "$STORE_ID" ]; then
    echo "   Found Store: $STORE_CODE (ID: $STORE_ID)"
    test_api "GET /api/hr/stores/$STORE_ID" "GET" "/api/hr/stores/$STORE_ID" "" "$AUTH_HEADER $TENANT_HEADER"
fi
echo ""

# Step 5: HR Service - Departments
echo -e "${BLUE}🏢 Step 5: HR Service - Departments${NC}"
echo "----------------------------------------"
test_api "GET /api/hr/departments" "GET" "/api/hr/departments" "" "$AUTH_HEADER $TENANT_HEADER"
DEPT_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/hr/departments" \
    -H "$AUTH_HEADER" \
    -H "$TENANT_HEADER" \
    --max-time 30 2>&1)
DEPT_ID=$(echo "$DEPT_RESPONSE" | jq -r '.data[0]._id // empty' 2>/dev/null || echo "")
if [ -n "$DEPT_ID" ]; then
    echo "   Found Department ID: $DEPT_ID"
fi
echo ""

# Step 6: HR Service - Employees
echo -e "${BLUE}👥 Step 6: HR Service - Employees${NC}"
echo "----------------------------------------"
test_api "GET /api/hr/employees" "GET" "/api/hr/employees" "" "$AUTH_HEADER $TENANT_HEADER"
test_api "GET /api/hr/employees?limit=10" "GET" "/api/hr/employees?limit=10" "" "$AUTH_HEADER $TENANT_HEADER"
if [ -n "$EMPLOYEE_ID" ]; then
    test_api "GET /api/hr/employees/$EMPLOYEE_ID" "GET" "/api/hr/employees/$EMPLOYEE_ID" "" "$AUTH_HEADER $TENANT_HEADER"
fi
echo ""

# Step 7: HR Service - Roles
echo -e "${BLUE}👔 Step 7: HR Service - Roles${NC}"
echo "----------------------------------------"
test_api "GET /api/hr/roles" "GET" "/api/hr/roles" "" "$AUTH_HEADER $TENANT_HEADER"
echo ""

# Step 8: Attendance - Status
echo -e "${BLUE}⏰ Step 8: Attendance Service - Status${NC}"
echo "----------------------------------------"
if [ -n "$EMPLOYEE_ID" ]; then
    TODAY=$(date +%Y-%m-%d)
    test_api "GET /api/attendance/status" "GET" "/api/attendance/status?employeeId=$EMPLOYEE_ID" "" "$AUTH_HEADER"
    test_api "GET /api/attendance/today" "GET" "/api/attendance/today?employeeId=$EMPLOYEE_ID&date=$TODAY" "" "$AUTH_HEADER"
fi
echo ""

# Step 9: Attendance - Summary
echo -e "${BLUE}📊 Step 9: Attendance Service - Summary${NC}"
echo "----------------------------------------"
if [ -n "$EMPLOYEE_ID" ]; then
    START_DATE=$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d "7 days ago" +%Y-%m-%d)
    END_DATE=$(date +%Y-%m-%d)
    test_api "GET /api/attendance/summary" "GET" "/api/attendance/summary?employeeId=$EMPLOYEE_ID&startDate=$START_DATE&endDate=$END_DATE" "" "$AUTH_HEADER"
    test_api "GET /api/attendance/timeline" "GET" "/api/attendance/timeline?employeeId=$EMPLOYEE_ID&date=$TODAY" "" "$AUTH_HEADER"
fi
echo ""

# Step 10: HR Service - Time Tracking
echo -e "${BLUE}⏱️  Step 10: HR Service - Time Tracking${NC}"
echo "----------------------------------------"
if [ -n "$EMPLOYEE_ID" ]; then
    test_api "GET /api/hr/time-tracking" "GET" "/api/hr/time-tracking?employeeId=$EMPLOYEE_ID&date=$TODAY" "" "$AUTH_HEADER $TENANT_HEADER"
fi
echo ""

# Step 11: HR Service - Dashboard
echo -e "${BLUE}📈 Step 11: HR Service - Dashboard${NC}"
echo "----------------------------------------"
test_api "GET /api/hr/dashboard/stats" "GET" "/api/hr/dashboard/stats" "" "$AUTH_HEADER $TENANT_HEADER"
test_api "GET /api/hr/dashboard/employee-stats" "GET" "/api/hr/dashboard/employee-stats?employeeId=$EMPLOYEE_ID" "" "$AUTH_HEADER $TENANT_HEADER"
echo ""

# Step 12: Roster APIs
echo -e "${BLUE}📅 Step 12: Roster Management APIs${NC}"
echo "----------------------------------------"
test_api "GET /api/hr/roster" "GET" "/api/hr/roster" "" "$AUTH_HEADER $TENANT_HEADER"
test_api "GET /api/hr/roster/settings" "GET" "/api/hr/roster/settings" "" "$AUTH_HEADER $TENANT_HEADER"
if [ -n "$STORE_CODE" ]; then
    test_api "GET /api/hr/roster/settings?storeId=$STORE_CODE" "GET" "/api/hr/roster/settings?storeId=$STORE_CODE" "" "$AUTH_HEADER $TENANT_HEADER"
fi
echo ""

# Step 13: Performance APIs
echo -e "${BLUE}📊 Step 13: Performance APIs${NC}"
echo "----------------------------------------"
if [ -n "$EMPLOYEE_ID" ]; then
    test_api "GET /api/hr/performance/employee/$EMPLOYEE_ID" "GET" "/api/hr/performance/employee/$EMPLOYEE_ID" "" "$AUTH_HEADER $TENANT_HEADER"
fi
echo ""

# Summary
echo "====================================="
echo "📊 Complete Flow Test Summary"
echo "====================================="
echo "Base URL: $BASE_URL"
echo "Tenant: lenstrack"
echo "User: admin@lenstrack.com"
echo "Employee ID: $EMPLOYEE_ID"
echo ""
echo "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $TOTAL -gt 0 ]; then
    SUCCESS_RATE=$((PASSED * 100 / TOTAL))
    echo "Success Rate: $SUCCESS_RATE%"
    echo ""
fi

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All APIs working perfectly!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some APIs failed. Check details above.${NC}"
    exit 1
fi
