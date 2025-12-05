#!/bin/bash

# API Endpoint Testing Script (Like Postman)
# Tests all microservice endpoints

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base URL - Change this to your server URL
BASE_URL="${BASE_URL:-http://localhost:3000}"

# Counters
TOTAL=0
PASSED=0
FAILED=0

# Function to test an endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    local headers=$5
    
    TOTAL=$((TOTAL + 1))
    
    echo -e "${BLUE}[$TOTAL] Testing: $description${NC}"
    echo -e "  ${YELLOW}$method $endpoint${NC}"
    
    # Build curl command
    local curl_cmd="curl -s -w '\nHTTP_CODE:%{http_code}\nTIME:%{time_total}' -X $method"
    
    # Add headers
    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd -H '$headers'"
    fi
    
    # Add data for POST/PUT/PATCH
    if [ -n "$data" ] && [[ "$method" =~ ^(POST|PUT|PATCH)$ ]]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$BASE_URL$endpoint'"
    
    # Execute and capture response
    local response=$(eval $curl_cmd)
    local http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    local time_taken=$(echo "$response" | grep "TIME:" | cut -d: -f2)
    local body=$(echo "$response" | sed '/HTTP_CODE:/d' | sed '/TIME:/d')
    
    # Check if successful (2xx status codes)
    if [[ "$http_code" =~ ^2[0-9]{2}$ ]]; then
        echo -e "  ${GREEN}✓ PASS${NC} (HTTP $http_code, ${time_taken}s)"
        PASSED=$((PASSED + 1))
        # Show response preview
        echo "$body" | head -3 | sed 's/^/    /'
    else
        echo -e "  ${RED}✗ FAIL${NC} (HTTP $http_code, ${time_taken}s)"
        FAILED=$((FAILED + 1))
        echo "$body" | head -3 | sed 's/^/    /'
    fi
    echo ""
}

echo "=========================================="
echo "API Endpoint Testing Script"
echo "Base URL: $BASE_URL"
echo "=========================================="
echo ""

# ============================================
# 1. MAIN API GATEWAY ENDPOINTS
# ============================================
echo -e "${YELLOW}=== MAIN API GATEWAY ===${NC}"
test_endpoint "GET" "/" "Root endpoint"
test_endpoint "GET" "/health" "Health check"
test_endpoint "GET" "/api" "API discovery endpoint"
test_endpoint "GET" "/admin/services" "Admin services status"

# ============================================
# 2. AUTH SERVICE ENDPOINTS
# ============================================
echo -e "${YELLOW}=== AUTH SERVICE ===${NC}"
test_endpoint "GET" "/api/auth/status" "Auth service status"
test_endpoint "GET" "/api/auth/health" "Auth service health"
test_endpoint "POST" "/api/auth/login" "Login endpoint" '{"email":"test@example.com","password":"test123"}'
test_endpoint "POST" "/api/auth/register" "Register endpoint" '{"email":"newuser@example.com","password":"password123","name":"Test User"}'
test_endpoint "POST" "/api/auth/refresh-token" "Refresh token" '{"refreshToken":"test-token"}'
test_endpoint "GET" "/api/auth/profile" "Get profile" "" "Authorization: Bearer test-token"

# ============================================
# 3. HR SERVICE ENDPOINTS
# ============================================
echo -e "${YELLOW}=== HR SERVICE ===${NC}"
test_endpoint "GET" "/api/hr" "HR service info"
test_endpoint "GET" "/api/hr/status" "HR service status"
test_endpoint "GET" "/api/hr/health" "HR service health"
test_endpoint "GET" "/api/hr/employees" "Get employees" "" "Authorization: Bearer test-token"
test_endpoint "POST" "/api/hr/onboarding" "Start onboarding" '{"employee_id":"EMP001"}' "Authorization: Bearer test-token"
test_endpoint "GET" "/api/hr/leave" "Get leave records" "" "Authorization: Bearer test-token"
test_endpoint "GET" "/api/hr/payroll" "Get payroll data" "" "Authorization: Bearer test-token"
test_endpoint "GET" "/api/hr/reports" "Get HR reports" "" "Authorization: Bearer test-token"

# ============================================
# 4. ATTENDANCE SERVICE ENDPOINTS
# ============================================
echo -e "${YELLOW}=== ATTENDANCE SERVICE ===${NC}"
test_endpoint "GET" "/api/attendance/status" "Attendance service status"
test_endpoint "GET" "/api/attendance/health" "Attendance service health"
test_endpoint "POST" "/api/attendance/checkin" "Employee check-in" '{"employee_id":"EMP001","location":{"lat":28.6139,"lng":77.2090}}' "Authorization: Bearer test-token"
test_endpoint "POST" "/api/attendance/checkout" "Employee check-out" '{"employee_id":"EMP001"}' "Authorization: Bearer test-token"
test_endpoint "GET" "/api/attendance/records" "Get attendance records" "" "Authorization: Bearer test-token"
test_endpoint "GET" "/api/attendance/reports" "Get attendance reports" "" "Authorization: Bearer test-token"
test_endpoint "GET" "/api/geofencing" "Get geofencing data" "" "Authorization: Bearer test-token"

# ============================================
# 5. PAYROLL SERVICE ENDPOINTS
# ============================================
echo -e "${YELLOW}=== PAYROLL SERVICE ===${NC}"
test_endpoint "GET" "/api/payroll/status" "Payroll service status"
test_endpoint "GET" "/api/payroll/health" "Payroll service health"
test_endpoint "GET" "/api/payroll/salaries" "Get salaries" "" "Authorization: Bearer test-token"
test_endpoint "POST" "/api/payroll/salaries" "Create salary record" '{"employee_id":"EMP001","amount":50000}' "Authorization: Bearer test-token"
test_endpoint "POST" "/api/payroll/process" "Process payroll" '{"month":"2024-12"}' "Authorization: Bearer test-token"
test_endpoint "GET" "/api/payroll/reports" "Get payroll reports" "" "Authorization: Bearer test-token"
test_endpoint "GET" "/api/payroll/compensation" "Get compensation profiles" "" "Authorization: Bearer test-token"

# ============================================
# 6. CRM SERVICE ENDPOINTS
# ============================================
echo -e "${YELLOW}=== CRM SERVICE ===${NC}"
test_endpoint "GET" "/api/crm/status" "CRM service status"
test_endpoint "GET" "/api/crm/health" "CRM service health"
test_endpoint "GET" "/api/crm/customers" "Get all customers" "" "Authorization: Bearer test-token"
test_endpoint "POST" "/api/crm/customers" "Create customer" '{"name":"John Doe","email":"john@example.com"}' "Authorization: Bearer test-token"
test_endpoint "GET" "/api/crm/customers/123" "Get customer by ID" "" "Authorization: Bearer test-token"
test_endpoint "GET" "/api/crm/campaigns" "Get marketing campaigns" "" "Authorization: Bearer test-token"
test_endpoint "GET" "/api/crm/loyalty" "Get loyalty programs" "" "Authorization: Bearer test-token"
test_endpoint "GET" "/api/crm/interactions" "Get customer interactions" "" "Authorization: Bearer test-token"

# ============================================
# 7. DOCUMENT SERVICE ENDPOINTS
# ============================================
echo -e "${YELLOW}=== DOCUMENT SERVICE ===${NC}"
test_endpoint "GET" "/api/documents" "Get all documents" "" "Authorization: Bearer test-token"
test_endpoint "POST" "/api/documents" "Upload document" '{"name":"test.pdf","type":"pdf"}' "Authorization: Bearer test-token"
test_endpoint "GET" "/api/documents/types" "Get document types" "" "Authorization: Bearer test-token"
test_endpoint "POST" "/api/documents/esign" "E-signature process" '{"document_id":"123"}' "Authorization: Bearer test-token"
test_endpoint "GET" "/api/documents/contracts" "Get contracts vault" "" "Authorization: Bearer test-token"

# ============================================
# 8. INVENTORY SERVICE ENDPOINTS
# ============================================
echo -e "${YELLOW}=== INVENTORY SERVICE ===${NC}"
test_endpoint "GET" "/api/inventory" "Inventory service info" "" "Authorization: Bearer test-token"
test_endpoint "GET" "/api/inventory/products" "Get products" "" "Authorization: Bearer test-token"
test_endpoint "GET" "/api/products" "Global products endpoint" "" "Authorization: Bearer test-token"

# ============================================
# 9. SALES SERVICE ENDPOINTS
# ============================================
echo -e "${YELLOW}=== SALES SERVICE ===${NC}"
test_endpoint "GET" "/api/sales" "Sales service info" "" "Authorization: Bearer test-token"
test_endpoint "GET" "/api/orders" "Global orders endpoint" "" "Authorization: Bearer test-token"

# ============================================
# 10. ANALYTICS SERVICE ENDPOINTS
# ============================================
echo -e "${YELLOW}=== ANALYTICS SERVICE ===${NC}"
test_endpoint "GET" "/api/analytics" "Analytics service info" "" "Authorization: Bearer test-token"
test_endpoint "GET" "/api/dashboard" "Dashboard data" "" "Authorization: Bearer test-token"

# ============================================
# 11. NOTIFICATION SERVICE ENDPOINTS
# ============================================
echo -e "${YELLOW}=== NOTIFICATION SERVICE ===${NC}"
test_endpoint "GET" "/api/notification" "Notification service info" "" "Authorization: Bearer test-token"

# ============================================
# 12. MONITORING SERVICE ENDPOINTS
# ============================================
echo -e "${YELLOW}=== MONITORING SERVICE ===${NC}"
test_endpoint "GET" "/api/monitoring" "Monitoring service info" "" "Authorization: Bearer test-token"

# ============================================
# SUMMARY
# ============================================
echo "=========================================="
echo -e "${YELLOW}TEST SUMMARY${NC}"
echo "=========================================="
echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "=========================================="

# Exit with error code if any tests failed
if [ $FAILED -gt 0 ]; then
    exit 1
fi

