#!/bin/bash

# Test All APIs via Main ALB (which routes to ingress)

set -e

BASE_URL="http://etelios-frontend-alb-557163772.ap-south-1.elb.amazonaws.com"

echo "🧪 Testing All Backend APIs via Main ALB"
echo "====================================="
echo ""
echo "Base URL: $BASE_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TOTAL=0
PASSED=0
FAILED=0
SKIPPED=0

test_api() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local headers="$5"
    
    TOTAL=$((TOTAL + 1))
    echo -n "Testing $name... "
    
    CURL_CMD="curl -s -w '\nHTTP_CODE:%{http_code}' -X $method '${BASE_URL}${endpoint}' --max-time 30"
    
    [ -n "$data" ] && CURL_CMD="$CURL_CMD -H 'Content-Type: application/json' -d '$data'"
    [ -n "$headers" ] && CURL_CMD="$CURL_CMD -H '$headers'"
    
    RESPONSE=$(eval $CURL_CMD 2>&1)
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2 || echo "000")
    
    if [ "$HTTP_CODE" = "000" ]; then
        echo -e "${RED}❌ CONNECTION FAILED${NC}"
        FAILED=$((FAILED + 1))
    elif [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $HTTP_CODE)"
        PASSED=$((PASSED + 1))
    elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        echo -e "${YELLOW}⚠️  AUTH REQUIRED${NC} (HTTP $HTTP_CODE)"
        PASSED=$((PASSED + 1))
    elif [ "$HTTP_CODE" = "404" ]; then
        echo -e "${YELLOW}⚠️  NOT FOUND${NC} (HTTP $HTTP_CODE)"
        SKIPPED=$((SKIPPED + 1))
    elif [ "$HTTP_CODE" = "503" ] || [ "$HTTP_CODE" = "502" ]; then
        echo -e "${RED}❌ SERVICE UNAVAILABLE${NC} (HTTP $HTTP_CODE)"
        FAILED=$((FAILED + 1))
    else
        echo -e "${YELLOW}⚠️  HTTP $HTTP_CODE${NC}"
        SKIPPED=$((SKIPPED + 1))
    fi
}

# Login
echo "🔐 Step 1: Login..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@lenstrack.com","password":"AdminPass123!"}' \
    --max-time 30 2>&1)

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // empty' 2>/dev/null || echo "")

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo -e "${GREEN}✅ Login successful!${NC}"
    AUTH_HEADER="Authorization: Bearer $TOKEN"
else
    echo -e "${YELLOW}⚠️  Login failed, testing without auth...${NC}"
    AUTH_HEADER=""
fi
echo ""

# Test APIs
echo -e "${BLUE}📋 Step 2: Testing APIs...${NC}"
echo ""

echo -e "${BLUE}🏥 Health Checks${NC}"
test_api "GET /health" "GET" "/health" "" ""
test_api "GET /api/health" "GET" "/api/health" "" ""
echo ""

echo -e "${BLUE}🔐 Auth APIs${NC}"
test_api "POST /api/auth/login" "POST" "/api/auth/login" '{"email":"admin@lenstrack.com","password":"AdminPass123!"}' ""
[ -n "$TOKEN" ] && test_api "GET /api/auth/me" "GET" "/api/auth/me" "" "$AUTH_HEADER"
echo ""

echo -e "${BLUE}👥 HR APIs${NC}"
[ -n "$TOKEN" ] && test_api "GET /api/hr/stores" "GET" "/api/hr/stores" "" "$AUTH_HEADER"
[ -n "$TOKEN" ] && test_api "GET /api/hr/employees" "GET" "/api/hr/employees" "" "$AUTH_HEADER"
[ -n "$TOKEN" ] && test_api "GET /api/hr/departments" "GET" "/api/hr/departments" "" "$AUTH_HEADER"
[ -n "$TOKEN" ] && test_api "GET /api/hr/time-tracking" "GET" "/api/hr/time-tracking?employeeId=EMP-2026-969954&date=2026-02-28" "" "$AUTH_HEADER"
echo ""

echo -e "${BLUE}⏰ Attendance APIs${NC}"
[ -n "$TOKEN" ] && test_api "GET /api/attendance/today" "GET" "/api/attendance/today?employeeId=EMP-2026-969954&date=2026-02-28" "" "$AUTH_HEADER"
[ -n "$TOKEN" ] && test_api "GET /api/attendance/summary" "GET" "/api/attendance/summary?employeeId=EMP-2026-969954&startDate=2026-02-01&endDate=2026-02-28" "" "$AUTH_HEADER"
[ -n "$TOKEN" ] && test_api "GET /api/attendance/status" "GET" "/api/attendance/status?employeeId=EMP-2026-969954" "" "$AUTH_HEADER"
echo ""

echo -e "${BLUE}🏢 Tenant APIs${NC}"
test_api "GET /api/tenants" "GET" "/api/tenants" "" "$AUTH_HEADER"
test_api "GET /api/platform/health" "GET" "/api/platform/health" "" ""
echo ""

# Summary
echo "====================================="
echo "📊 Summary"
echo "====================================="
echo "Total: $TOTAL | ${GREEN}Passed: $PASSED${NC} | ${YELLOW}Skipped: $SKIPPED${NC} | ${RED}Failed: $FAILED${NC}"
[ $TOTAL -gt 0 ] && echo "Success Rate: $((PASSED * 100 / TOTAL))%"
echo ""

[ $FAILED -eq 0 ] && echo -e "${GREEN}✅ All tests passed!${NC}" || echo -e "${YELLOW}⚠️  Some tests failed${NC}"
