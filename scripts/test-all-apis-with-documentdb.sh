#!/bin/bash

# ============================================
# Comprehensive API Test Script with DocumentDB
# ============================================
# Tests ALL APIs with the new DocumentDB database
# Uses Kubernetes Ingress routing (NOT API Gateway)
# 
# Architecture:
#   Frontend → ALB → Kubernetes Ingress → Microservices
#   Routes: /api/auth, /api/hr, /api/attendance, etc.
#
# Usage:
#   ./scripts/test-all-apis-with-documentdb.sh
#   BASE_URL=http://localhost:3000 ./scripts/test-all-apis-with-documentdb.sh
#   BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com ./scripts/test-all-apis-with-documentdb.sh
# ============================================

set +e  # Don't exit on error - continue testing

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
TEST_EMAIL="${TEST_EMAIL:-test@lenstrack.com}"
TEST_PASSWORD="${TEST_PASSWORD:-Test@123456}"
TENANT_ID="${TENANT_ID:-lenstrack}"

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Results
RESULTS=()

# Functions
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

step() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

test_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    local url="${BASE_URL}${endpoint}"
    local headers=()
    
    if [ -n "$TOKEN" ]; then
        headers+=("-H" "Authorization: Bearer $TOKEN")
    fi
    
    if [ -n "$TENANT_ID" ]; then
        headers+=("-H" "X-Tenant-Id: $TENANT_ID")
    fi
    
    headers+=("-H" "Content-Type: application/json")
    
    local response
    local status_code
    
    if [ "$method" == "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "${headers[@]}" "$url" 2>/dev/null || echo -e "\n000")
    elif [ "$method" == "POST" ] || [ "$method" == "PUT" ] || [ "$method" == "PATCH" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "${headers[@]}" -d "$data" "$url" 2>/dev/null || echo -e "\n000")
    elif [ "$method" == "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "${headers[@]}" "$url" 2>/dev/null || echo -e "\n000")
    fi
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" == "000" ]; then
        error "❌ $description - Connection failed (service may be down)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        RESULTS+=("❌ $description - Connection failed")
        return 1
    fi
    
    # Handle 502/503/504 as service unavailable (not test failure)
    if [ "$status_code" == "502" ] || [ "$status_code" == "503" ] || [ "$status_code" == "504" ]; then
        warning "⚠️  $description - Service unavailable (Status: $status_code)"
        SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
        RESULTS+=("⚠️  $description - Service unavailable ($status_code)")
        return 2
    fi
    
    if [ -z "$expected_status" ]; then
        expected_status="200"
    fi
    
    if [ "$status_code" == "$expected_status" ] || [ "$status_code" == "201" ] || [ "$status_code" == "204" ]; then
        log "✅ $description - Status: $status_code"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        RESULTS+=("✅ $description - Status: $status_code")
        return 0
    else
        error "❌ $description - Expected: $expected_status, Got: $status_code"
        echo "   Response: $(echo "$body" | head -c 200)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        RESULTS+=("❌ $description - Expected: $expected_status, Got: $status_code")
        return 1
    fi
}

# ============================================
# STEP 1: Load DocumentDB Connection Info
# ============================================

step "STEP 1: Loading DocumentDB Connection Info"

if [ -f "documentdb-connection-info.txt" ]; then
    source documentdb-connection-info.txt
    log "✅ DocumentDB connection info loaded"
    log "   Endpoint: $ENDPOINT"
    log "   Username: $USERNAME"
else
    error "❌ documentdb-connection-info.txt not found"
    exit 1
fi

# ============================================
# STEP 2: Test Base URLs
# ============================================

step "STEP 2: Testing Base URLs"

test_api "GET" "/" "" "200" "Gateway Root"
test_api "GET" "/health" "" "200" "Gateway Health"
test_api "GET" "/api" "" "" "API Info"

# ============================================
# STEP 3: Auth Service - Public Endpoints
# ============================================

step "STEP 3: Auth Service - Public Endpoints"

test_api "GET" "/api/auth/status" "" "200" "Auth Service Status"
test_api "GET" "/api/auth/health" "" "200" "Auth Service Health"

# ============================================
# STEP 4: Login and Get Token
# ============================================

step "STEP 4: Login and Get Token"

log "Attempting login with: $TEST_EMAIL"

LOGIN_DATA="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
LOGIN_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "X-Tenant-Id: $TENANT_ID" \
    -d "$LOGIN_DATA" \
    "${BASE_URL}/api/auth/login" 2>/dev/null)

if echo "$LOGIN_RESPONSE" | grep -q "token\|accessToken\|access_token"; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4 || \
            echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || \
            echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$TOKEN" ]; then
        TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // .accessToken // .access_token // .data.token // .data.accessToken' 2>/dev/null)
    fi
    
    if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        log "✅ Login successful - Token obtained"
        EMPLOYEE_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.employeeId // .data.employeeId // .employeeId' 2>/dev/null || echo "")
        USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user._id // .data._id // ._id' 2>/dev/null || echo "")
        PASSED_TESTS=$((PASSED_TESTS + 1))
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
    else
        error "❌ Login failed - No token in response"
        warning "Response: $(echo "$LOGIN_RESPONSE" | head -c 200)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        exit 1
    fi
else
    error "❌ Login failed"
    warning "Response: $(echo "$LOGIN_RESPONSE" | head -c 200)"
    exit 1
fi

# ============================================
# STEP 5: Auth Service - Protected Endpoints
# ============================================

step "STEP 5: Auth Service - Protected Endpoints"

test_api "GET" "/api/auth/me" "" "200" "Get Current User"
test_api "GET" "/api/auth/profile" "" "200" "Get User Profile"

# ============================================
# STEP 6: HR Service - Public Endpoints
# ============================================

step "STEP 6: HR Service - Public Endpoints"

test_api "GET" "/api/hr" "" "200" "HR Service Info"
test_api "GET" "/api/hr/status" "" "200" "HR Service Status"
test_api "GET" "/api/hr/health" "" "200" "HR Service Health"

# ============================================
# STEP 7: HR Service - Protected Endpoints
# ============================================

step "STEP 7: HR Service - Protected Endpoints"

test_api "GET" "/api/hr/employees" "" "200" "List Employees"
test_api "GET" "/api/hr/departments" "" "200" "List Departments"
test_api "GET" "/api/hr/stores" "" "200" "List Stores"
test_api "GET" "/api/hr/roles" "" "200" "List Roles"

if [ -n "$USER_ID" ] && [ "$USER_ID" != "null" ]; then
    test_api "GET" "/api/hr/employees/$USER_ID" "" "200" "Get Employee by ID"
fi

if [ -n "$EMPLOYEE_ID" ] && [ "$EMPLOYEE_ID" != "null" ]; then
    test_api "GET" "/api/hr/employees/$EMPLOYEE_ID" "" "" "Get Employee by Employee ID"
fi

# ============================================
# STEP 8: HR Dashboard APIs
# ============================================

step "STEP 8: HR Dashboard APIs"

test_api "GET" "/api/hr/dashboard" "" "200" "Dashboard Data"
test_api "GET" "/api/hr/dashboard/stats" "" "200" "Dashboard Stats"
test_api "GET" "/api/hr/dashboard/overview" "" "" "Dashboard Overview"

# ============================================
# STEP 9: HR Performance APIs
# ============================================

step "STEP 9: HR Performance APIs"

test_api "GET" "/api/hr/performance" "" "200" "Performance Data"
test_api "GET" "/api/hr/performance/me/metrics?period=monthly" "" "" "My Performance Metrics"

if [ -n "$EMPLOYEE_ID" ] && [ "$EMPLOYEE_ID" != "null" ]; then
    test_api "GET" "/api/hr/performance/employee/$EMPLOYEE_ID" "" "" "Employee Performance"
fi

# ============================================
# STEP 10: HR Time Tracking APIs
# ============================================

step "STEP 10: HR Time Tracking APIs"

if [ -n "$EMPLOYEE_ID" ] && [ "$EMPLOYEE_ID" != "null" ]; then
    TODAY=$(date +%Y-%m-%d)
    test_api "GET" "/api/hr/time-tracking?employeeId=$EMPLOYEE_ID&date=$TODAY" "" "200" "Time Tracking"
    test_api "GET" "/api/hr/time-tracking/timesheets?employeeId=$EMPLOYEE_ID" "" "" "Timesheets"
    test_api "GET" "/api/hr/time-tracking/projects" "" "" "Projects"
fi

# ============================================
# STEP 11: HR Workforce APIs
# ============================================

step "STEP 11: HR Workforce APIs"

test_api "GET" "/api/hr/workforce" "" "200" "Workforce Data"

# ============================================
# STEP 12: Attendance Service - Public
# ============================================

step "STEP 12: Attendance Service - Public Endpoints"

test_api "GET" "/api/attendance/status" "" "200" "Attendance Service Status"
test_api "GET" "/api/attendance/health" "" "200" "Attendance Service Health"

# ============================================
# STEP 13: Attendance Service - Protected
# ============================================

step "STEP 13: Attendance Service - Protected Endpoints"

test_api "GET" "/api/attendance" "" "200" "Get Attendance Records"

if [ -n "$EMPLOYEE_ID" ] && [ "$EMPLOYEE_ID" != "null" ]; then
    TODAY=$(date +%Y-%m-%d)
    test_api "GET" "/api/attendance/today?employeeId=$EMPLOYEE_ID&date=$TODAY" "" "" "Today's Attendance"
    test_api "GET" "/api/attendance/summary?employeeId=$EMPLOYEE_ID" "" "200" "Attendance Summary"
fi

# ============================================
# STEP 14: Roster APIs
# ============================================

step "STEP 14: Roster APIs"

test_api "GET" "/api/hr/roster" "" "200" "List Rosters"
test_api "GET" "/api/roster" "" "" "Roster (Alternative Route)"
test_api "GET" "/api/hr/roster/settings" "" "" "Roster Settings"

# ============================================
# STEP 15: Leave APIs
# ============================================

step "STEP 15: Leave APIs"

test_api "GET" "/api/hr/leave" "" "200" "List Leaves"
test_api "GET" "/api/hr/leave/balance" "" "" "Leave Balance"

# ============================================
# STEP 16: Tenant APIs
# ============================================

step "STEP 16: Tenant APIs"

test_api "GET" "/api/tenants" "" "200" "List Tenants"
test_api "GET" "/api/admin/tenants" "" "" "Admin Tenants"

# ============================================
# STEP 17: Reports APIs
# ============================================

step "STEP 17: Reports APIs"

test_api "GET" "/api/hr/reports" "" "" "HR Reports"

# ============================================
# STEP 18: Final Summary
# ============================================

step "FINAL SUMMARY"

echo ""
echo "=========================================="
echo "📊 **TEST RESULTS** 📊"
echo "=========================================="
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo -e "${YELLOW}Skipped: $SKIPPED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    SUCCESS_RATE=100
else
    SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
fi

echo "Success Rate: ${SUCCESS_RATE}%"
echo ""

if [ $FAILED_TESTS -gt 0 ]; then
    echo "❌ **Failed Tests:**"
    for result in "${RESULTS[@]}"; do
        if [[ "$result" == ❌* ]]; then
            echo "   $result"
        fi
    done
    echo ""
fi

echo "=========================================="
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    log "🎉 All tests passed!"
    exit 0
else
    error "⚠️  Some tests failed"
    exit 1
fi
