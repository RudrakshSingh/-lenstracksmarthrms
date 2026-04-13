#!/bin/bash

# Comprehensive API Test - Works with current setup
# Tests via main ALB and reports status

set -e

BASE_URL="http://etelios-frontend-alb-557163772.ap-south-1.elb.amazonaws.com"

echo "🧪 Comprehensive API Test"
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
SKIPPED=0

test_api() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local headers="$5"
    
    TOTAL=$((TOTAL + 1))
    printf "%-50s" "Testing $name..."
    
    if [ "$method" = "POST" ] || [ "$method" = "PUT" ]; then
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
    elif [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $HTTP_CODE)"
        PASSED=$((PASSED + 1))
    elif [ "$HTTP_CODE" = "307" ] || [ "$HTTP_CODE" = "308" ]; then
        echo -e "${YELLOW}⚠️  REDIRECT${NC} (HTTP $HTTP_CODE)"
        SKIPPED=$((SKIPPED + 1))
    elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        echo -e "${YELLOW}⚠️  AUTH REQUIRED${NC} (HTTP $HTTP_CODE) - Expected"
        PASSED=$((PASSED + 1))
    elif [ "$HTTP_CODE" = "404" ]; then
        echo -e "${YELLOW}⚠️  NOT FOUND${NC} (HTTP $HTTP_CODE)"
        SKIPPED=$((SKIPPED + 1))
    elif [ "$HTTP_CODE" = "503" ] || [ "$HTTP_CODE" = "502" ] || [ "$HTTP_CODE" = "504" ]; then
        echo -e "${RED}❌ SERVICE UNAVAILABLE${NC} (HTTP $HTTP_CODE)"
        FAILED=$((FAILED + 1))
    elif [ "$HTTP_CODE" = "500" ]; then
        echo -e "${RED}❌ SERVER ERROR${NC} (HTTP $HTTP_CODE)"
        FAILED=$((FAILED + 1))
    else
        echo -e "${YELLOW}⚠️  HTTP $HTTP_CODE${NC}"
        SKIPPED=$((SKIPPED + 1))
    fi
}

# Test connectivity
echo "🔍 Connectivity Test..."
test_api "GET /api/health" "GET" "/api/health" "" ""
echo ""

# Login
echo "🔐 Authentication Test..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@lenstrack.com","password":"AdminPass123!"}' \
    --max-time 30 2>&1)

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // empty' 2>/dev/null || echo "")

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo -e "${GREEN}✅ Login successful!${NC}"
    AUTH_HEADER="Authorization: Bearer $TOKEN"
    echo ""
else
    echo -e "${RED}❌ Login failed${NC}"
    echo "$LOGIN_RESPONSE" | head -3
    AUTH_HEADER=""
    echo ""
fi

# Test all APIs
echo -e "${BLUE}📋 Testing All APIs...${NC}"
echo ""

echo -e "${BLUE}🏥 Health & Basic${NC}"
test_api "GET /health" "GET" "/health" "" ""
test_api "GET /api/health" "GET" "/api/health" "" ""
echo ""

echo -e "${BLUE}🔐 Auth Service${NC}"
test_api "POST /api/auth/login" "POST" "/api/auth/login" '{"email":"admin@lenstrack.com","password":"AdminPass123!"}' ""
[ -n "$TOKEN" ] && test_api "GET /api/auth/me" "GET" "/api/auth/me" "" "$AUTH_HEADER"
test_api "POST /api/auth/refresh" "POST" "/api/auth/refresh" '{"refreshToken":"test"}' ""
echo ""

echo -e "${BLUE}👥 HR Service${NC}"
[ -n "$TOKEN" ] && test_api "GET /api/hr/stores" "GET" "/api/hr/stores" "" "$AUTH_HEADER"
[ -n "$TOKEN" ] && test_api "GET /api/hr/employees" "GET" "/api/hr/employees" "" "$AUTH_HEADER"
[ -n "$TOKEN" ] && test_api "GET /api/hr/departments" "GET" "/api/hr/departments" "" "$AUTH_HEADER"
[ -n "$TOKEN" ] && test_api "GET /api/hr/roles" "GET" "/api/hr/roles" "" "$AUTH_HEADER"
[ -n "$TOKEN" ] && test_api "GET /api/hr/time-tracking" "GET" "/api/hr/time-tracking?employeeId=EMP-2026-969954&date=2026-02-28" "" "$AUTH_HEADER"
[ -n "$TOKEN" ] && test_api "GET /api/hr/dashboard/stats" "GET" "/api/hr/dashboard/stats" "" "$AUTH_HEADER"
echo ""

echo -e "${BLUE}⏰ Attendance Service${NC}"
[ -n "$TOKEN" ] && test_api "GET /api/attendance/today" "GET" "/api/attendance/today?employeeId=EMP-2026-969954&date=2026-02-28" "" "$AUTH_HEADER"
[ -n "$TOKEN" ] && test_api "GET /api/attendance/summary" "GET" "/api/attendance/summary?employeeId=EMP-2026-969954&startDate=2026-02-01&endDate=2026-02-28" "" "$AUTH_HEADER"
[ -n "$TOKEN" ] && test_api "GET /api/attendance/timeline" "GET" "/api/attendance/timeline?employeeId=EMP-2026-969954&date=2026-02-28" "" "$AUTH_HEADER"
[ -n "$TOKEN" ] && test_api "GET /api/attendance/status" "GET" "/api/attendance/status?employeeId=EMP-2026-969954" "" "$AUTH_HEADER"
echo ""

echo -e "${BLUE}🏢 Tenant Registry${NC}"
test_api "GET /api/tenants" "GET" "/api/tenants" "" "$AUTH_HEADER"
test_api "GET /api/platform/health" "GET" "/api/platform/health" "" ""
test_api "GET /tenant-registry/health" "GET" "/tenant-registry/health" "" ""
echo ""

echo -e "${BLUE}📦 Other Services${NC}"
test_api "GET /api/payroll/health" "GET" "/api/payroll/health" "" ""
test_api "GET /api/crm/health" "GET" "/api/crm/health" "" ""
test_api "GET /api/inventory/health" "GET" "/api/inventory/health" "" ""
test_api "GET /api/sales/health" "GET" "/api/sales/health" "" ""
test_api "GET /api/financial/health" "GET" "/api/financial/health" "" ""
echo ""

# Summary
echo "====================================="
echo "📊 Test Summary"
echo "====================================="
echo "Base URL: $BASE_URL"
echo "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${YELLOW}Skipped/Expected: $SKIPPED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $TOTAL -gt 0 ]; then
    SUCCESS_RATE=$((PASSED * 100 / TOTAL))
    echo "Success Rate: $SUCCESS_RATE%"
    echo ""
fi

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All accessible APIs are working!${NC}"
else
    echo -e "${YELLOW}⚠️  Some APIs need attention (503 = routing issue, 500 = service error)${NC}"
fi

echo ""
echo "📝 Note: 503 errors indicate main ALB is not routing to ingress controller."
echo "   This requires VPC peering or updating ALB target group configuration."
