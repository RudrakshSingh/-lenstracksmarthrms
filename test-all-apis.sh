#!/bin/bash

# Complete API Test Script for api.etelios.com
# Tests all endpoints: auth, onboarding, attendance, document, admin, store, department, roster

BASE_URL="https://api.etelios.com"
TIMEOUT=10

echo "=========================================="
echo "🧪 Testing All APIs on api.etelios.com"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    
    echo -n "Testing: $description ... "
    
    if [ "$method" == "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" --max-time $TIMEOUT 2>&1)
    elif [ "$method" == "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" \
            --max-time $TIMEOUT 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" --max-time $TIMEOUT 2>&1)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [[ "$http_code" =~ ^2[0-9]{2}$ ]] || [[ "$http_code" == "401" ]] || [[ "$http_code" == "403" ]]; then
        echo -e "${GREEN}✓${NC} (HTTP $http_code)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} (HTTP $http_code)"
        echo "  Response: $body" | head -c 100
        echo ""
        ((FAILED++))
        return 1
    fi
}

echo "=========================================="
echo "1. Health & Root Endpoints"
echo "=========================================="
test_endpoint "GET" "/" "Root endpoint"
test_endpoint "GET" "/health" "Health check"
echo ""

echo "=========================================="
echo "2. Auth Service APIs"
echo "=========================================="
test_endpoint "GET" "/api/auth/health" "Auth health"
test_endpoint "GET" "/api/auth/status" "Auth status"
test_endpoint "POST" "/api/auth/login" "Auth login (no creds)" '{"email":"test@test.com","password":"test"}'
test_endpoint "POST" "/api/auth/register" "Auth register" '{"email":"test@test.com","password":"test123"}'
echo ""

echo "=========================================="
echo "3. HR Service - Stores"
echo "=========================================="
test_endpoint "GET" "/api/hr/stores" "Get stores"
test_endpoint "GET" "/api/hr/stores/status" "Stores status"
echo ""

echo "=========================================="
echo "4. HR Service - Departments"
echo "=========================================="
test_endpoint "GET" "/api/hr/departments" "Get departments"
test_endpoint "GET" "/api/hr/departments/status" "Departments status"
echo ""

echo "=========================================="
echo "5. HR Service - Employees & Onboarding"
echo "=========================================="
test_endpoint "GET" "/api/hr/employees" "Get employees"
test_endpoint "GET" "/api/hr/employees/status" "Employees status"
test_endpoint "POST" "/api/hr/onboarding" "Onboarding endpoint" '{}'
test_endpoint "GET" "/api/hr/onboarding/status" "Onboarding status"
echo ""

echo "=========================================="
echo "6. Attendance Service"
echo "=========================================="
test_endpoint "GET" "/api/attendance/status" "Attendance status"
test_endpoint "GET" "/api/attendance/health" "Attendance health"
test_endpoint "GET" "/api/attendance/today" "Today's attendance"
test_endpoint "GET" "/api/attendance/summary" "Attendance summary"
test_endpoint "POST" "/api/attendance/clock-in" "Clock in" '{}'
echo ""

echo "=========================================="
echo "7. Document Service"
echo "=========================================="
test_endpoint "GET" "/api/documents" "Get documents"
test_endpoint "GET" "/api/documents/status" "Documents status"
test_endpoint "POST" "/api/documents/upload" "Document upload" '{}'
echo ""

echo "=========================================="
echo "8. Admin Service"
echo "=========================================="
test_endpoint "GET" "/api/admin" "Admin endpoint"
test_endpoint "GET" "/api/admin/status" "Admin status"
test_endpoint "GET" "/api/platform" "Platform endpoint"
test_endpoint "GET" "/api/system" "System endpoint"
echo ""

echo "=========================================="
echo "9. Roster Service"
echo "=========================================="
test_endpoint "GET" "/api/hr/roster" "Get roster"
test_endpoint "GET" "/api/hr/roster/status" "Roster status"
test_endpoint "GET" "/api/hr/roster/settings" "Roster settings"
test_endpoint "POST" "/api/hr/roster" "Create roster" '{}'
echo ""

echo "=========================================="
echo "10. Additional HR Endpoints"
echo "=========================================="
test_endpoint "GET" "/api/hr" "HR service root"
test_endpoint "GET" "/api/hr/status" "HR status"
test_endpoint "GET" "/api/hr/health" "HR health"
test_endpoint "GET" "/api/hr/roles" "Get roles"
test_endpoint "GET" "/api/hr/time-tracking" "Time tracking"
test_endpoint "GET" "/api/hr/performance" "Performance"
echo ""

echo "=========================================="
echo "11. Tenant Registry"
echo "=========================================="
test_endpoint "GET" "/api/tenant" "Tenant endpoint"
test_endpoint "GET" "/api/tenants" "Get tenants"
test_endpoint "GET" "/api/tenants/status" "Tenants status"
echo ""

echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed (may require authentication)${NC}"
    exit 1
fi
