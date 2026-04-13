#!/bin/bash

# Complete API Test with Authentication
BASE_URL="https://api.etelios.com"
TIMEOUT=10

echo "=========================================="
echo "🧪 Testing All APIs with Authentication"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0
AUTH_REQUIRED=0
TOTAL=0

# Get authentication token
echo -e "${BLUE}Step 1: Getting authentication token...${NC}"
TOKEN_RESPONSE=$(curl -sk -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lenstrack.com","password":"AdminPass123!"}' \
  --max-time $TIMEOUT 2>&1)

TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${YELLOW}⚠️  Could not get token. Testing without authentication...${NC}"
    TOKEN=""
else
    echo -e "${GREEN}✅ Token obtained${NC}"
fi

echo ""

test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    local needs_auth=$5
    
    ((TOTAL++))
    echo -n "[$TOTAL] Testing: $description ... "
    
    headers=(-H "Content-Type: application/json")
    if [ -n "$TOKEN" ] && [ "$needs_auth" == "true" ]; then
        headers+=(-H "Authorization: Bearer $TOKEN")
        headers+=(-H "x-tenant-id: lenstrack")
    fi
    
    if [ "$method" == "GET" ]; then
        response=$(curl -sk -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" \
            "${headers[@]}" \
            --max-time $TIMEOUT 2>&1)
    elif [ "$method" == "POST" ]; then
        response=$(curl -sk -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
            "${headers[@]}" \
            -d "$data" \
            --max-time $TIMEOUT 2>&1)
    else
        response=$(curl -sk -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            "${headers[@]}" \
            --max-time $TIMEOUT 2>&1)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [[ "$http_code" =~ ^2[0-9]{2}$ ]]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
        ((PASSED++))
        return 0
    elif [[ "$http_code" == "401" ]] || [[ "$http_code" == "403" ]]; then
        if [ -z "$TOKEN" ]; then
            echo -e "${YELLOW}⚠️  AUTH REQUIRED${NC} (HTTP $http_code)"
            ((AUTH_REQUIRED++))
        else
            echo -e "${RED}❌ AUTH FAILED${NC} (HTTP $http_code)"
            ((FAILED++))
        fi
        return 1
    elif [[ "$http_code" == "404" ]]; then
        echo -e "${RED}❌ NOT FOUND${NC} (HTTP $http_code)"
        ((FAILED++))
        return 1
    elif [[ "$http_code" == "000" ]]; then
        echo -e "${RED}❌ CONNECTION FAILED${NC}"
        ((FAILED++))
        return 1
    else
        echo -e "${RED}❌ FAILED${NC} (HTTP $http_code)"
        ((FAILED++))
        return 1
    fi
}

echo "=========================================="
echo "1. Health & Root (No Auth)"
echo "=========================================="
test_endpoint "GET" "/" "Root endpoint" "" "false"
test_endpoint "GET" "/health" "Health check" "" "false"
echo ""

echo "=========================================="
echo "2. Auth Service"
echo "=========================================="
test_endpoint "GET" "/api/auth/health" "Auth health" "" "false"
test_endpoint "GET" "/api/auth/status" "Auth status" "" "false"
echo ""

echo "=========================================="
echo "3. HR Service - Stores (With Auth)"
echo "=========================================="
test_endpoint "GET" "/api/hr/stores" "Get stores" "" "true"
echo ""

echo "=========================================="
echo "4. HR Service - Departments (With Auth)"
echo "=========================================="
test_endpoint "GET" "/api/hr/departments" "Get departments" "" "true"
echo ""

echo "=========================================="
echo "5. HR Service - Employees (With Auth)"
echo "=========================================="
test_endpoint "GET" "/api/hr/employees" "Get employees" "" "true"
echo ""

echo "=========================================="
echo "6. HR Service - Onboarding (With Auth)"
echo "=========================================="
test_endpoint "GET" "/api/hr/onboarding" "Onboarding endpoint" "" "true"
echo ""

echo "=========================================="
echo "7. HR Service - Roster (With Auth)"
echo "=========================================="
test_endpoint "GET" "/api/hr/roster" "Get roster" "" "true"
test_endpoint "GET" "/api/hr/roster/settings" "Roster settings" "" "true"
echo ""

echo "=========================================="
echo "8. Attendance Service"
echo "=========================================="
test_endpoint "GET" "/api/attendance/status" "Attendance status" "" "false"
test_endpoint "GET" "/api/attendance/today" "Today's attendance" "" "true"
echo ""

echo "=========================================="
echo "9. Document Service (With Auth)"
echo "=========================================="
test_endpoint "GET" "/api/documents" "Get documents" "" "true"
echo ""

echo "=========================================="
echo "10. Admin/Platform/System (With Auth)"
echo "=========================================="
test_endpoint "GET" "/api/admin" "Admin endpoint" "" "true"
test_endpoint "GET" "/api/platform" "Platform endpoint" "" "true"
test_endpoint "GET" "/api/system" "System endpoint" "" "true"
echo ""

echo "=========================================="
echo "11. Other Services"
echo "=========================================="
test_endpoint "GET" "/api/hr" "HR service root" "" "false"
test_endpoint "GET" "/api/hr/status" "HR status" "" "false"
test_endpoint "GET" "/api/time-tracking" "Time tracking" "" "true"
test_endpoint "GET" "/api/performance" "Performance" "" "true"
test_endpoint "GET" "/api/roles" "Get roles" "" "true"
echo ""

echo "=========================================="
echo "📊 FINAL TEST SUMMARY"
echo "=========================================="
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${YELLOW}⚠️  Auth Required: $AUTH_REQUIRED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo "Total Tested: $TOTAL"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some endpoints failed or require authentication${NC}"
    exit 1
fi
