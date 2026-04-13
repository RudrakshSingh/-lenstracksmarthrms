#!/bin/bash

# Test All APIs with New Ingress ALB URL

set -e

NEW_INGRESS_ALB=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>&1)
BASE_URL="http://${NEW_INGRESS_ALB}"

echo "🧪 Testing All APIs - New Ingress ALB"
echo "====================================="
echo ""
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
    printf "%-50s" "Testing $name..."
    
    if [ "$method" = "POST" ]; then
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
    
    if [ "$HTTP_CODE" = "000" ]; then
        echo -e "${RED}❌ CONNECTION FAILED${NC}"
        FAILED=$((FAILED + 1))
    elif [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $HTTP_CODE)"
        PASSED=$((PASSED + 1))
    elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        echo -e "${YELLOW}⚠️  AUTH REQUIRED${NC} (HTTP $HTTP_CODE) - Expected"
        PASSED=$((PASSED + 1))
    elif [ "$HTTP_CODE" = "404" ]; then
        echo -e "${YELLOW}⚠️  NOT FOUND${NC} (HTTP $HTTP_CODE)"
        FAILED=$((FAILED + 1))
    elif [ "$HTTP_CODE" = "503" ] || [ "$HTTP_CODE" = "502" ]; then
        echo -e "${RED}❌ SERVICE UNAVAILABLE${NC} (HTTP $HTTP_CODE)"
        FAILED=$((FAILED + 1))
    else
        echo -e "${YELLOW}⚠️  HTTP $HTTP_CODE${NC}"
        FAILED=$((FAILED + 1))
    fi
}

# Login
echo "🔐 Step 1: Login..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@lenstrack.com","password":"AdminPass123!"}' \
    --max-time 30 2>&1)

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // empty' 2>/dev/null || echo "")

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ] && [ "$TOKEN" != "" ]; then
    echo -e "${GREEN}✅ Login successful!${NC}"
    AUTH_HEADER="Authorization: Bearer $TOKEN"
    echo ""
else
    echo -e "${RED}❌ Login failed${NC}"
    echo "$LOGIN_RESPONSE" | head -3
    AUTH_HEADER=""
    echo ""
fi

# Test APIs
echo -e "${BLUE}📋 Step 2: Testing All APIs...${NC}"
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
echo "📊 Test Summary"
echo "====================================="
echo "Base URL: $BASE_URL"
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
    echo -e "${GREEN}✅ All APIs are working!${NC}"
else
    echo -e "${YELLOW}⚠️  Some APIs need attention${NC}"
fi

echo ""
echo "📝 Frontend Environment Variable:"
echo "NEXT_PUBLIC_API_BASE_URL=$BASE_URL"
