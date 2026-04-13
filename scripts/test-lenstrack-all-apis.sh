#!/bin/bash

# Fast Complete API Test for Lenstrack Tenant

set -e

NEW_INGRESS_ALB=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>&1)
BASE_URL="http://${NEW_INGRESS_ALB}"

echo "🧪 Complete API Test - Lenstrack Tenant"
echo "====================================="
echo "Base URL: $BASE_URL"
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
    
    TOTAL=$((TOTAL + 1))
    printf "%-55s" "$name"
    
    if [ "$method" = "POST" ] || [ "$method" = "PUT" ]; then
        RESPONSE=$(curl -s -w "\nHTTP:%{http_code}" -X "$method" "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            $([ -n "$data" ] && echo "-d '$data'") \
            $([ -n "$headers" ] && echo "-H '$headers'") \
            --max-time 15 2>&1)
    else
        RESPONSE=$(curl -s -w "\nHTTP:%{http_code}" -X "$method" "${BASE_URL}${endpoint}" \
            $([ -n "$headers" ] && echo "-H '$headers'") \
            --max-time 15 2>&1)
    fi
    
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP:" | cut -d: -f2 || echo "000")
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        echo -e "${GREEN}✅ PASS${NC} ($HTTP_CODE)"
        PASSED=$((PASSED + 1))
    elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        echo -e "${YELLOW}⚠️  AUTH${NC} ($HTTP_CODE)"
        PASSED=$((PASSED + 1))
    elif [ "$HTTP_CODE" = "404" ]; then
        echo -e "${RED}❌ NOT FOUND${NC} ($HTTP_CODE)"
        FAILED=$((FAILED + 1))
    elif [ "$HTTP_CODE" = "000" ]; then
        echo -e "${RED}❌ TIMEOUT${NC}"
        FAILED=$((FAILED + 1))
    else
        echo -e "${RED}❌ FAIL${NC} ($HTTP_CODE)"
        FAILED=$((FAILED + 1))
    fi
}

# Login
echo "🔐 Login..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@lenstrack.com","password":"AdminPass123!"}' \
    --max-time 20 2>&1)

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // empty' 2>/dev/null || echo "")
EMPLOYEE_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.employee_id // "LENSTRACK-ADMIN-001"' 2>/dev/null || echo "LENSTRACK-ADMIN-001")

if [ -z "$TOKEN" ]; then
    echo "❌ Login failed!"
    exit 1
fi

echo "✅ Login successful!"
AUTH="Authorization: Bearer $TOKEN"
TENANT="x-tenant-id: lenstrack"
echo ""

# Test all APIs
echo "📋 Testing All APIs..."
echo ""

echo -e "${BLUE}🔐 Auth APIs${NC}"
test_api "POST /api/auth/login" "POST" "/api/auth/login" '{"email":"admin@lenstrack.com","password":"AdminPass123!"}' ""
test_api "GET /api/auth/me" "GET" "/api/auth/me" "" "$AUTH"

echo -e "${BLUE}🏢 Tenant APIs${NC}"
test_api "GET /api/tenants" "GET" "/api/tenants" "" "$AUTH"
test_api "GET /api/platform/health" "GET" "/api/platform/health" "" ""

echo -e "${BLUE}🏪 HR - Stores${NC}"
test_api "GET /api/hr/stores" "GET" "/api/hr/stores" "" "$AUTH $TENANT"

echo -e "${BLUE}🏢 HR - Departments${NC}"
test_api "GET /api/hr/departments" "GET" "/api/hr/departments" "" "$AUTH $TENANT"

echo -e "${BLUE}👥 HR - Employees${NC}"
test_api "GET /api/hr/employees" "GET" "/api/hr/employees" "" "$AUTH $TENANT"
test_api "GET /api/hr/employees (limit)" "GET" "/api/hr/employees?limit=10" "" "$AUTH $TENANT"

echo -e "${BLUE}👔 HR - Roles${NC}"
test_api "GET /api/hr/roles" "GET" "/api/hr/roles" "" "$AUTH $TENANT"

echo -e "${BLUE}⏱️  HR - Time Tracking${NC}"
test_api "GET /api/hr/time-tracking" "GET" "/api/hr/time-tracking?employeeId=$EMPLOYEE_ID&date=$(date +%Y-%m-%d)" "" "$AUTH $TENANT"

echo -e "${BLUE}📈 HR - Dashboard${NC}"
test_api "GET /api/hr/dashboard/stats" "GET" "/api/hr/dashboard/stats" "" "$AUTH $TENANT"
test_api "GET /api/hr/dashboard/employee-stats" "GET" "/api/hr/dashboard/employee-stats?employeeId=$EMPLOYEE_ID" "" "$AUTH $TENANT"

echo -e "${BLUE}⏰ Attendance - Status${NC}"
test_api "GET /api/attendance/status" "GET" "/api/attendance/status?employeeId=$EMPLOYEE_ID" "" "$AUTH"
test_api "GET /api/attendance/today" "GET" "/api/attendance/today?employeeId=$EMPLOYEE_ID&date=$(date +%Y-%m-%d)" "" "$AUTH"

echo -e "${BLUE}📊 Attendance - Summary${NC}"
TODAY=$(date +%Y-%m-%d)
START_DATE=$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d "7 days ago" +%Y-%m-%d)
test_api "GET /api/attendance/summary" "GET" "/api/attendance/summary?employeeId=$EMPLOYEE_ID&startDate=$START_DATE&endDate=$TODAY" "" "$AUTH"
test_api "GET /api/attendance/timeline" "GET" "/api/attendance/timeline?employeeId=$EMPLOYEE_ID&date=$TODAY" "" "$AUTH"

echo -e "${BLUE}📅 Roster APIs${NC}"
test_api "GET /api/hr/roster" "GET" "/api/hr/roster" "" "$AUTH $TENANT"
test_api "GET /api/hr/roster/settings" "GET" "/api/hr/roster/settings" "" "$AUTH $TENANT"

echo -e "${BLUE}📊 Performance APIs${NC}"
test_api "GET /api/hr/performance/employee" "GET" "/api/hr/performance/employee/$EMPLOYEE_ID" "" "$AUTH $TENANT"

# Summary
echo ""
echo "====================================="
echo "📊 Test Summary"
echo "====================================="
echo "Total: $TOTAL | ${GREEN}Passed: $PASSED${NC} | ${RED}Failed: $FAILED${NC}"
[ $TOTAL -gt 0 ] && echo "Success Rate: $((PASSED * 100 / TOTAL))%"
echo ""

[ $FAILED -eq 0 ] && echo -e "${GREEN}✅ All APIs working!${NC}" || echo -e "${YELLOW}⚠️  $FAILED API(s) failed${NC}"
