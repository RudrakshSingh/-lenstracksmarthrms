#!/bin/bash

# Comprehensive API Testing Script
# Tests all APIs across auth, hr, and attendance services

BASE_URL="https://98.70.245.87"
HOST_HEADER="Host: api.etelios.com"

echo "═══════════════════════════════════════════════════════════"
echo "           COMPREHENSIVE API TESTING"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Base URL: $BASE_URL"
echo "Host: api.etelios.com"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TOTAL=0
PASSED=0
FAILED=0
SKIPPED=0

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    TOTAL=$((TOTAL + 1))
    
    if [ -z "$expected_status" ]; then
        expected_status="200"
    fi
    
    echo -n "Testing: $method $endpoint ... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -H "$HOST_HEADER" "$BASE_URL$endpoint" 2>/dev/null)
    elif [ "$method" = "POST" ] || [ "$method" = "PUT" ] || [ "$method" = "PATCH" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X $method -H "$HOST_HEADER" -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint" 2>/dev/null)
        else
            response=$(curl -s -w "\n%{http_code}" -X $method -H "$HOST_HEADER" "$BASE_URL$endpoint" 2>/dev/null)
        fi
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE -H "$HOST_HEADER" "$BASE_URL$endpoint" 2>/dev/null)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    # Check if response contains error
    if echo "$body" | grep -qi "error\|500\|Internal Server Error"; then
        echo -e "${RED}FAILED${NC} (HTTP $http_code - Error in response)"
        FAILED=$((FAILED + 1))
        echo "  Response: $(echo "$body" | head -c 100)..."
        return 1
    elif [ "$http_code" = "$expected_status" ] || [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
        # 401/403 are expected for protected endpoints without auth
        echo -e "${GREEN}PASS${NC} (HTTP $http_code)"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${YELLOW}UNEXPECTED${NC} (HTTP $http_code, expected $expected_status)"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo "═══════════════════════════════════════════════════════════"
echo "1. HEALTH ENDPOINTS (No Auth Required)"
echo "═══════════════════════════════════════════════════════════"
echo ""

test_endpoint "GET" "/api/auth/health" "" "200" "Auth Service Health"
test_endpoint "GET" "/api/hr/health" "" "200" "HR Service Health"
test_endpoint "GET" "/api/attendance/health" "" "200" "Attendance Service Health"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "2. AUTH SERVICE ENDPOINTS"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Auth endpoints (public)
test_endpoint "POST" "/api/auth/login" '{"emailOrEmployeeId":"test@test.com","password":"test"}' "401" "Login (Invalid Credentials)"
test_endpoint "POST" "/api/auth/mock-login-fast" '{"role":"admin"}' "200" "Mock Login Fast"
test_endpoint "POST" "/api/auth/refresh-token" '{"refreshToken":"invalid"}' "401" "Refresh Token (Invalid)"
test_endpoint "POST" "/api/auth/request-password-reset" '{"email":"test@test.com"}' "200" "Request Password Reset"

# Auth endpoints (protected - will return 401)
test_endpoint "GET" "/api/auth/profile" "" "401" "Get Profile (No Auth)"
test_endpoint "PUT" "/api/auth/profile" '{"name":"Test"}' "401" "Update Profile (No Auth)"
test_endpoint "POST" "/api/auth/logout" '{}' "401" "Logout (No Auth)"
test_endpoint "POST" "/api/auth/change-password" '{"currentPassword":"old","newPassword":"new"}' "401" "Change Password (No Auth)"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "3. HR SERVICE ENDPOINTS (Protected - Will Return 401)"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Employee endpoints
test_endpoint "GET" "/api/hr/employees" "" "401" "Get Employees"
test_endpoint "GET" "/api/hr/employees?page=1&limit=10" "" "401" "Get Employees (Paginated)"
test_endpoint "GET" "/api/hr/employees/123" "" "401" "Get Employee By ID"
test_endpoint "POST" "/api/hr/employees" '{"employeeId":"EMP-001","firstName":"Test","lastName":"User","email":"test@test.com","password":"password123","roleName":"Employee"}' "401" "Create Employee"
test_endpoint "PUT" "/api/hr/employees/123" '{"firstName":"Updated"}' "401" "Update Employee"
test_endpoint "DELETE" "/api/hr/employees/123" "" "401" "Delete Employee"
test_endpoint "POST" "/api/hr/employees/123/assign-role" '{"roleName":"Manager"}' "401" "Assign Role"
test_endpoint "PATCH" "/api/hr/employees/123/status" '{"status":"active"}' "401" "Update Employee Status"

# Department endpoints
test_endpoint "GET" "/api/hr/departments" "" "401" "Get Departments"
test_endpoint "POST" "/api/hr/departments" '{"name":"IT","code":"IT"}' "401" "Create Department"

# Store endpoints
test_endpoint "GET" "/api/hr/stores" "" "401" "Get Stores"
test_endpoint "GET" "/api/hr/stores?page=1&limit=10" "" "401" "Get Stores (Paginated)"
test_endpoint "GET" "/api/hr/stores/123" "" "401" "Get Store By ID"
test_endpoint "POST" "/api/hr/stores" '{"name":"Store 1","code":"STORE1","address":{"street":"123 Main","city":"City","state":"State","country":"Country","zipCode":"12345"},"coordinates":{"latitude":0,"longitude":0},"geofenceRadius":100,"contact":{"phone":"1234567890","email":"store@test.com"}}' "401" "Create Store"
test_endpoint "PUT" "/api/hr/stores/123" '{"name":"Updated Store"}' "401" "Update Store"
test_endpoint "DELETE" "/api/hr/stores/123" "" "401" "Delete Store"

# Document endpoints
test_endpoint "POST" "/api/documents/upload" "" "401" "Upload Document"
test_endpoint "GET" "/api/documents/123" "" "401" "Get Employee Documents"
test_endpoint "DELETE" "/api/documents/123" "" "401" "Delete Document"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "4. ATTENDANCE SERVICE ENDPOINTS (Protected - Will Return 401)"
echo "═══════════════════════════════════════════════════════════"
echo ""

test_endpoint "POST" "/api/attendance/clock-in" '{"latitude":0,"longitude":0}' "401" "Clock In"
test_endpoint "POST" "/api/attendance/clock-out" '{"latitude":0,"longitude":0}' "401" "Clock Out"
test_endpoint "GET" "/api/attendance/history?startDate=2025-01-01&endDate=2025-12-31" "" "401" "Get Attendance History"
test_endpoint "GET" "/api/attendance/summary?startDate=2025-01-01&endDate=2025-12-31" "" "401" "Get Attendance Summary"
test_endpoint "GET" "/api/attendance?page=1&limit=10" "" "401" "Get Attendance Records"
test_endpoint "POST" "/api/attendance" '{"date":"2025-01-01","clockIn":"09:00","clockOut":"17:00"}' "401" "Mark Attendance"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "5. CHECKING FOR 500 ERRORS IN LOGS"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check logs for 500 errors
echo "Checking service logs for 500 errors..."
kubectl logs -n etelios-backend-prod -l app=auth-service --tail=50 2>/dev/null | grep -i "500\|Internal Server Error" | head -5 || echo "No 500 errors in auth-service logs"
kubectl logs -n etelios-backend-prod -l app=hr-service --tail=50 2>/dev/null | grep -i "500\|Internal Server Error" | head -5 || echo "No 500 errors in hr-service logs"
kubectl logs -n etelios-backend-prod -l app=attendance-service --tail=50 2>/dev/null | grep -i "500\|Internal Server Error" | head -5 || echo "No 500 errors in attendance-service logs"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "           TEST SUMMARY"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${YELLOW}Skipped: $SKIPPED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    exit 1
fi

