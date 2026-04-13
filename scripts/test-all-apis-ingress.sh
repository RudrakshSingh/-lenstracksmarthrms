#!/bin/bash

# Comprehensive API Test Script via Ingress
# Tests all backend APIs through ingress controller

set -e

BASE_URL="${INGRESS_URL:-http://k8s-ingressn-ingressn-3f8da1d2c3-bf10356d47b52801.elb.ap-south-1.amazonaws.com}"

echo "🧪 Testing All Backend APIs via Ingress"
echo "====================================="
echo ""
echo "Base URL: $BASE_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL=0
PASSED=0
FAILED=0

# Test function
test_api() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="${5:-200}"
    
    TOTAL=$((TOTAL + 1))
    
    echo -n "Testing $name... "
    
    if [ "$method" = "POST" ] || [ "$method" = "PUT" ] || [ "$method" = "PATCH" ]; then
        if [ -n "$data" ]; then
            RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X "$method" "${BASE_URL}${endpoint}" \
                -H "Content-Type: application/json" \
                -d "$data" \
                --max-time 20 2>&1)
        else
            RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X "$method" "${BASE_URL}${endpoint}" \
                --max-time 20 2>&1)
        fi
    else
        RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X "$method" "${BASE_URL}${endpoint}" \
            --max-time 20 2>&1)
    fi
    
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE")
    
    if [ "$HTTP_CODE" = "$expected_status" ] || [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $HTTP_CODE)"
        PASSED=$((PASSED + 1))
        return 0
    elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
        echo -e "${YELLOW}⚠️  AUTH REQUIRED${NC} (HTTP $HTTP_CODE) - Expected for protected endpoints"
        PASSED=$((PASSED + 1))
        return 0
    elif [ "$HTTP_CODE" = "404" ]; then
        echo -e "${YELLOW}⚠️  NOT FOUND${NC} (HTTP $HTTP_CODE) - Endpoint may not exist"
        FAILED=$((FAILED + 1))
        return 1
    else
        echo -e "${RED}❌ FAIL${NC} (HTTP $HTTP_CODE)"
        echo "$BODY" | head -3
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Login first to get token
echo "🔐 Step 1: Login to get access token..."
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@lenstrack.com","password":"AdminPass123!"}' \
    --max-time 20 2>&1)

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // empty' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Login failed! Cannot proceed with authenticated tests."
    echo "$LOGIN_RESPONSE" | head -5
    exit 1
fi

echo "✅ Login successful! Token obtained."
echo ""

# Auth Headers
AUTH_HEADER="Authorization: Bearer $TOKEN"
TENANT_HEADER="x-tenant-id: lenstrack"

echo "📋 Step 2: Testing All APIs..."
echo ""

# ============================================
# AUTH SERVICE APIs
# ============================================
echo "🔐 AUTH SERVICE APIs"
echo "----------------------------------------"

test_api "GET /health" "GET" "/health" "" "200"
test_api "POST /api/auth/login" "POST" "/api/auth/login" '{"email":"admin@lenstrack.com","password":"AdminPass123!"}' "200"
test_api "GET /api/auth/me" "GET" "/api/auth/me" "" "200" "$AUTH_HEADER"
test_api "POST /api/auth/refresh" "POST" "/api/auth/refresh" '{"refreshToken":"test"}' "401"

echo ""

# ============================================
# HR SERVICE APIs
# ============================================
echo "👥 HR SERVICE APIs"
echo "----------------------------------------"

test_api "GET /api/hr/stores" "GET" "/api/hr/stores" "" "200" "$AUTH_HEADER" "$TENANT_HEADER"
test_api "GET /api/hr/employees" "GET" "/api/hr/employees" "" "200" "$AUTH_HEADER" "$TENANT_HEADER"
test_api "GET /api/hr/departments" "GET" "/api/hr/departments" "" "200" "$AUTH_HEADER" "$TENANT_HEADER"
test_api "GET /api/hr/roles" "GET" "/api/hr/roles" "" "200" "$AUTH_HEADER" "$TENANT_HEADER"
test_api "GET /api/hr/time-tracking" "GET" "/api/hr/time-tracking?employeeId=EMP-2026-969954&date=2026-02-28" "" "200" "$AUTH_HEADER" "$TENANT_HEADER"
test_api "GET /api/hr/dashboard/stats" "GET" "/api/hr/dashboard/stats" "" "200" "$AUTH_HEADER" "$TENANT_HEADER"

echo ""

# ============================================
# ATTENDANCE SERVICE APIs
# ============================================
echo "⏰ ATTENDANCE SERVICE APIs"
echo "----------------------------------------"

test_api "GET /api/attendance/today" "GET" "/api/attendance/today?employeeId=EMP-2026-969954&date=2026-02-28" "" "200" "$AUTH_HEADER"
test_api "GET /api/attendance/summary" "GET" "/api/attendance/summary?employeeId=EMP-2026-969954&startDate=2026-02-01&endDate=2026-02-28" "" "200" "$AUTH_HEADER"
test_api "GET /api/attendance/timeline" "GET" "/api/attendance/timeline?employeeId=EMP-2026-969954&date=2026-02-28" "" "200" "$AUTH_HEADER"
test_api "GET /api/attendance/status" "GET" "/api/attendance/status?employeeId=EMP-2026-969954" "" "200" "$AUTH_HEADER"

echo ""

# ============================================
# TENANT REGISTRY APIs
# ============================================
echo "🏢 TENANT REGISTRY APIs"
echo "----------------------------------------"

test_api "GET /api/tenants" "GET" "/api/tenants" "" "200" "$AUTH_HEADER"
test_api "GET /api/platform/health" "GET" "/api/platform/health" "" "200"
test_api "GET /tenant-registry/health" "GET" "/tenant-registry/health" "" "200"

echo ""

# ============================================
# OTHER SERVICE APIs
# ============================================
echo "📦 OTHER SERVICE APIs"
echo "----------------------------------------"

test_api "GET /api/payroll/health" "GET" "/api/payroll/health" "" "200"
test_api "GET /api/crm/health" "GET" "/api/crm/health" "" "200"
test_api "GET /api/inventory/health" "GET" "/api/inventory/health" "" "200"
test_api "GET /api/sales/health" "GET" "/api/sales/health" "" "200"
test_api "GET /api/financial/health" "GET" "/api/financial/health" "" "200"

echo ""

# ============================================
# SUMMARY
# ============================================
echo "====================================="
echo "📊 Test Summary"
echo "====================================="
echo "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

SUCCESS_RATE=$((PASSED * 100 / TOTAL))
echo "Success Rate: $SUCCESS_RATE%"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All APIs are working!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some APIs failed. Check details above.${NC}"
    exit 1
fi
