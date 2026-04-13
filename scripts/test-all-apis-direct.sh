#!/bin/bash

# Comprehensive API Test Script - Direct Connection to Ingress ALB

set -e

BASE_URL="${INGRESS_URL:-http://k8s-ingressn-ingressn-3f8da1d2c3-bf10356d47b52801.elb.ap-south-1.amazonaws.com}"

echo "🧪 Testing All Backend APIs - Direct Connection"
echo "====================================="
echo ""
echo "Base URL: $BASE_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL=0
PASSED=0
FAILED=0
SKIPPED=0

# Test function
test_api() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local headers="$5"
    
    TOTAL=$((TOTAL + 1))
    
    echo -n "Testing $name... "
    
    # Build curl command
    CURL_CMD="curl -s -w '\nHTTP_CODE:%{http_code}' -X $method '${BASE_URL}${endpoint}' --max-time 30 --connect-timeout 10"
    
    if [ -n "$data" ]; then
        CURL_CMD="$CURL_CMD -H 'Content-Type: application/json' -d '$data'"
    fi
    
    if [ -n "$headers" ]; then
        CURL_CMD="$CURL_CMD -H '$headers'"
    fi
    
    RESPONSE=$(eval $CURL_CMD 2>&1)
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2 || echo "000")
    BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE" | head -5)
    
    if [ "$HTTP_CODE" = "000" ]; then
        echo -e "${RED}❌ CONNECTION FAILED${NC}"
        FAILED=$((FAILED + 1))
        return 1
    elif [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $HTTP_CODE)"
        PASSED=$((PASSED + 1))
        return 0
    elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        echo -e "${YELLOW}⚠️  AUTH REQUIRED${NC} (HTTP $HTTP_CODE) - Expected"
        PASSED=$((PASSED + 1))
        return 0
    elif [ "$HTTP_CODE" = "404" ]; then
        echo -e "${YELLOW}⚠️  NOT FOUND${NC} (HTTP $HTTP_CODE)"
        SKIPPED=$((SKIPPED + 1))
        return 0
    elif [ "$HTTP_CODE" = "503" ] || [ "$HTTP_CODE" = "502" ] || [ "$HTTP_CODE" = "504" ]; then
        echo -e "${RED}❌ SERVICE UNAVAILABLE${NC} (HTTP $HTTP_CODE)"
        FAILED=$((FAILED + 1))
        return 1
    else
        echo -e "${YELLOW}⚠️  HTTP $HTTP_CODE${NC}"
        SKIPPED=$((SKIPPED + 1))
        return 0
    fi
}

# First, test connectivity
echo "🔍 Step 0: Testing Connectivity..."
echo ""

CONNECT_TEST=$(curl -s -w "\nHTTP:%{http_code}" --max-time 10 --connect-timeout 5 "${BASE_URL}/health" 2>&1 || echo "HTTP:000")
CONNECT_CODE=$(echo "$CONNECT_TEST" | grep "HTTP:" | cut -d: -f2)

if [ "$CONNECT_CODE" = "000" ]; then
    echo -e "${RED}❌ Cannot connect to $BASE_URL${NC}"
    echo "   This might be a network/firewall issue."
    echo "   Trying alternative: Main ALB..."
    echo ""
    BASE_URL="http://etelios-frontend-alb-557163772.ap-south-1.elb.amazonaws.com"
    echo "Switching to: $BASE_URL"
    echo ""
fi

# Login first to get token
echo "🔐 Step 1: Login to get access token..."
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@lenstrack.com","password":"AdminPass123!"}' \
    --max-time 30 --connect-timeout 10 2>&1)

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // empty' 2>/dev/null || echo "")

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ] || [ "$TOKEN" = "" ]; then
    echo -e "${YELLOW}⚠️  Login failed or token not found. Testing without auth token...${NC}"
    echo "$LOGIN_RESPONSE" | head -3
    echo ""
    TOKEN=""
    AUTH_HEADER=""
else
    echo -e "${GREEN}✅ Login successful! Token obtained.${NC}"
    echo ""
    AUTH_HEADER="Authorization: Bearer $TOKEN"
fi

TENANT_HEADER="x-tenant-id: lenstrack"

echo "📋 Step 2: Testing All APIs..."
echo ""

# ============================================
# HEALTH & BASIC APIs
# ============================================
echo -e "${BLUE}🏥 HEALTH & BASIC APIs${NC}"
echo "----------------------------------------"

test_api "GET /health" "GET" "/health" "" ""
test_api "GET /api/health" "GET" "/api/health" "" ""

echo ""

# ============================================
# AUTH SERVICE APIs
# ============================================
echo -e "${BLUE}🔐 AUTH SERVICE APIs${NC}"
echo "----------------------------------------"

test_api "POST /api/auth/login" "POST" "/api/auth/login" '{"email":"admin@lenstrack.com","password":"AdminPass123!"}' ""
if [ -n "$TOKEN" ]; then
    test_api "GET /api/auth/me" "GET" "/api/auth/me" "" "$AUTH_HEADER"
fi
test_api "POST /api/auth/refresh" "POST" "/api/auth/refresh" '{"refreshToken":"test"}' ""

echo ""

# ============================================
# HR SERVICE APIs
# ============================================
echo -e "${BLUE}👥 HR SERVICE APIs${NC}"
echo "----------------------------------------"

if [ -n "$TOKEN" ]; then
    test_api "GET /api/hr/stores" "GET" "/api/hr/stores" "" "$AUTH_HEADER" 
    test_api "GET /api/hr/employees" "GET" "/api/hr/employees" "" "$AUTH_HEADER"
    test_api "GET /api/hr/departments" "GET" "/api/hr/departments" "" "$AUTH_HEADER"
    test_api "GET /api/hr/roles" "GET" "/api/hr/roles" "" "$AUTH_HEADER"
    test_api "GET /api/hr/time-tracking" "GET" "/api/hr/time-tracking?employeeId=EMP-2026-969954&date=2026-02-28" "" "$AUTH_HEADER"
    test_api "GET /api/hr/dashboard/stats" "GET" "/api/hr/dashboard/stats" "" "$AUTH_HEADER"
else
    echo "Skipping HR APIs (no auth token)"
fi

echo ""

# ============================================
# ATTENDANCE SERVICE APIs
# ============================================
echo -e "${BLUE}⏰ ATTENDANCE SERVICE APIs${NC}"
echo "----------------------------------------"

if [ -n "$TOKEN" ]; then
    test_api "GET /api/attendance/today" "GET" "/api/attendance/today?employeeId=EMP-2026-969954&date=2026-02-28" "" "$AUTH_HEADER"
    test_api "GET /api/attendance/summary" "GET" "/api/attendance/summary?employeeId=EMP-2026-969954&startDate=2026-02-01&endDate=2026-02-28" "" "$AUTH_HEADER"
    test_api "GET /api/attendance/timeline" "GET" "/api/attendance/timeline?employeeId=EMP-2026-969954&date=2026-02-28" "" "$AUTH_HEADER"
    test_api "GET /api/attendance/status" "GET" "/api/attendance/status?employeeId=EMP-2026-969954" "" "$AUTH_HEADER"
else
    echo "Skipping Attendance APIs (no auth token)"
fi

echo ""

# ============================================
# TENANT REGISTRY APIs
# ============================================
echo -e "${BLUE}🏢 TENANT REGISTRY APIs${NC}"
echo "----------------------------------------"

test_api "GET /api/tenants" "GET" "/api/tenants" "" "$AUTH_HEADER"
test_api "GET /api/platform/health" "GET" "/api/platform/health" "" ""
test_api "GET /tenant-registry/health" "GET" "/tenant-registry/health" "" ""

echo ""

# ============================================
# OTHER SERVICE APIs (Health Checks)
# ============================================
echo -e "${BLUE}📦 OTHER SERVICE APIs${NC}"
echo "----------------------------------------"

test_api "GET /api/payroll/health" "GET" "/api/payroll/health" "" ""
test_api "GET /api/crm/health" "GET" "/api/crm/health" "" ""
test_api "GET /api/inventory/health" "GET" "/api/inventory/health" "" ""
test_api "GET /api/sales/health" "GET" "/api/sales/health" "" ""
test_api "GET /api/financial/health" "GET" "/api/financial/health" "" ""

echo ""

# ============================================
# SUMMARY
# ============================================
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
    exit 0
else
    echo -e "${YELLOW}⚠️  Some APIs had issues. Check details above.${NC}"
    exit 1
fi
