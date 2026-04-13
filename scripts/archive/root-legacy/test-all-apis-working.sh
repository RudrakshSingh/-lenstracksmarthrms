#!/bin/bash

###############################################################################
# Comprehensive API Functionality Test
# Tests all APIs to verify they are working correctly
###############################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Get ALB URL
ALB_URL=$(kubectl get ingress etelios-ingress -n etelios-prod -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
if [ -z "$ALB_URL" ]; then
    ALB_URL="k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
fi

BASE_URL="http://$ALB_URL"

log "=========================================="
log "Comprehensive API Functionality Test"
log "=========================================="
log "Base URL: $BASE_URL"
log ""

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
declare -a FAILED_APIS

###############################################################################
# Helper Functions
###############################################################################
test_api() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local headers=$5
    local expected_status=${6:-200}
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    local response
    local http_code
    
    if [ "$method" = "POST" ] || [ "$method" = "PATCH" ] || [ "$method" = "PUT" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                $headers \
                -d "$data" 2>/dev/null || echo "ERROR\n000")
        else
            response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
                $headers 2>/dev/null || echo "ERROR\n000")
        fi
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            $headers 2>/dev/null || echo "ERROR\n000")
    fi
    
    http_code=$(echo "$response" | tail -1 | grep -o '[0-9]\{3\}' | head -1)
    body=$(echo "$response" | sed '$d')
    
    # Check if response contains error HTML (504, 503, etc.)
    if echo "$body" | grep -q "<title>.*Timeout\|<title>.*Error\|<h1>.*Error\|504 Gateway Time-out"; then
        http_code="504"
    fi
    
    # If http_code is empty or invalid, try to extract from body
    if [ -z "$http_code" ] || [ "$http_code" = "000" ]; then
        if echo "$body" | grep -q "504\|503\|502\|500"; then
            http_code=$(echo "$body" | grep -o '[0-9]\{3\}' | head -1)
        fi
        if [ -z "$http_code" ]; then
            http_code="000"
        fi
    fi
    
    if [ "$http_code" = "$expected_status" ] || ([ "$expected_status" = "200" ] && [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]); then
        log "  ✅ $name: HTTP $http_code"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        error "  ❌ $name: HTTP $http_code (expected $expected_status)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_APIS+=("$name: HTTP $http_code")
        
        # Show error details
        if echo "$body" | grep -q "error\|Error\|ERROR"; then
            local error_msg=$(echo "$body" | grep -o '"error":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")
            if [ -n "$error_msg" ]; then
                warning "     Error: $error_msg"
            fi
        fi
        return 1
    fi
}

###############################################################################
# Step 1: Get Authentication Token
###############################################################################
log "Step 1: Getting authentication token..."
TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@upcapto.com",
    "password": "Upcapto@2026"
  }' 2>/dev/null || echo "")

AUTH_TOKEN=""
TENANT_ID="upcapto"

if [ -n "$TOKEN_RESPONSE" ] && ! echo "$TOKEN_RESPONSE" | grep -q "error\|Error\|504\|503"; then
    AUTH_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4 || echo "")
    if [ -z "$AUTH_TOKEN" ]; then
        AUTH_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4 || echo "")
    fi
fi

if [ -n "$AUTH_TOKEN" ]; then
    log "✅ Auth token obtained"
    HEADERS="-H \"Authorization: Bearer $AUTH_TOKEN\" -H \"X-Tenant-Id: $TENANT_ID\""
else
    warning "⚠️  Could not get auth token, testing only public endpoints"
    HEADERS=""
fi
echo ""

###############################################################################
# Step 2: Test Health Endpoints
###############################################################################
log "Step 2: Testing Health Endpoints"
info "Health Checks:"

test_api "GET /health" "GET" "/health" "" "" 200
test_api "GET /api/auth/health" "GET" "/api/auth/health" "" "" 200
test_api "GET /api/hr/health" "GET" "/api/hr/health" "" "" 200
test_api "GET /api/attendance/health" "GET" "/api/attendance/health" "" "" 200
test_api "GET /api/payroll/health" "GET" "/api/payroll/health" "" "" 200

echo ""

###############################################################################
# Step 3: Test Auth Service APIs
###############################################################################
if [ -n "$AUTH_TOKEN" ]; then
    log "Step 3: Testing Auth Service APIs"
    info "Auth Endpoints:"
    
    test_api "GET /api/auth/me" "GET" "/api/auth/me" "" "$HEADERS" 200
    
    echo ""
fi

###############################################################################
# Step 4: Test HR Service APIs
###############################################################################
if [ -n "$AUTH_TOKEN" ]; then
    log "Step 4: Testing HR Service APIs"
    info "HR Endpoints:"
    
    test_api "GET /api/hr/employees" "GET" "/api/hr/employees" "" "$HEADERS" 200
    test_api "GET /api/hr/departments" "GET" "/api/hr/departments" "" "$HEADERS" 200
    test_api "GET /api/hr/stores" "GET" "/api/hr/stores" "" "$HEADERS" 200
    test_api "GET /api/hr/dashboard/departments" "GET" "/api/hr/dashboard/departments" "" "$HEADERS" 200
    
    echo ""
fi

###############################################################################
# Step 5: Test Payroll Service APIs
###############################################################################
log "Step 5: Testing Payroll Service APIs"
info "Payroll Endpoints:"

test_api "GET /api/payroll/health" "GET" "/api/payroll/health" "" "" 200

if [ -n "$AUTH_TOKEN" ]; then
    test_api "POST /api/payroll/calculate" "POST" "/api/payroll/calculate" \
        '{"grossMonthly": 50000}' "$HEADERS" 200
    
    test_api "GET /api/payroll/salary" "GET" "/api/payroll/salary?employeeId=EMP001" "" "$HEADERS" 200
fi

echo ""

###############################################################################
# Step 6: Test Attendance Service APIs
###############################################################################
if [ -n "$AUTH_TOKEN" ]; then
    log "Step 6: Testing Attendance Service APIs"
    info "Attendance Endpoints:"
    
    test_api "GET /api/attendance" "GET" "/api/attendance?employeeId=EMP001&date=2026-02-16" "" "$HEADERS" 200
    test_api "GET /api/attendance/summary" "GET" "/api/attendance/summary?startDate=2026-02-01&endDate=2026-02-16" "" "$HEADERS" 200
    
    echo ""
fi

###############################################################################
# Step 7: Test Tenant Service APIs
###############################################################################
if [ -n "$AUTH_TOKEN" ]; then
    log "Step 7: Testing Tenant Service APIs"
    info "Tenant Endpoints:"
    
    test_api "GET /api/tenant/company" "GET" "/api/tenant/company" "" "$HEADERS" 200
    test_api "GET /api/tenants" "GET" "/api/tenants" "" "$HEADERS" 200
    
    echo ""
fi

###############################################################################
# Step 8: Test Time Tracking APIs
###############################################################################
if [ -n "$AUTH_TOKEN" ]; then
    log "Step 8: Testing Time Tracking APIs"
    info "Time Tracking Endpoints:"
    
    test_api "GET /api/time-tracking" "GET" "/api/time-tracking" "" "$HEADERS" 200
    test_api "GET /api/hr/time-tracking" "GET" "/api/hr/time-tracking" "" "$HEADERS" 200
    
    echo ""
fi

###############################################################################
# Step 9: Test Performance APIs
###############################################################################
if [ -n "$AUTH_TOKEN" ]; then
    log "Step 9: Testing Performance APIs"
    info "Performance Endpoints:"
    
    # Get first employee ID for testing
    EMP_RESPONSE=$(curl -s -X GET "$BASE_URL/api/hr/employees?limit=1" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "X-Tenant-Id: $TENANT_ID" 2>/dev/null || echo "")
    
    EMP_ID=$(echo "$EMP_RESPONSE" | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")
    
    if [ -n "$EMP_ID" ]; then
        test_api "GET /api/performance/employee/:id" "GET" "/api/performance/employee/$EMP_ID" "" "$HEADERS" 200
        test_api "GET /api/hr/performance/employee/:id" "GET" "/api/hr/performance/employee/$EMP_ID" "" "$HEADERS" 200
    else
        warning "  ⚠️  Could not get employee ID for performance test"
    fi
    
    echo ""
fi

###############################################################################
# Summary
###############################################################################
log "=========================================="
log "API Test Summary"
log "=========================================="
log "Total Tests: $TOTAL_TESTS"
log "✅ Passed: $PASSED_TESTS"
log "❌ Failed: $FAILED_TESTS"

if [ $FAILED_TESTS -gt 0 ]; then
    echo ""
    error "Failed APIs:"
    for api in "${FAILED_APIS[@]}"; do
        error "  - $api"
    done
    echo ""
    warning "⚠️  Some APIs are not working correctly"
else
    echo ""
    log "✅ All APIs are working correctly!"
fi

# Calculate success rate
if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    log "Success Rate: ${SUCCESS_RATE}%"
fi

echo ""

# Save results
RESULTS_FILE="api-test-results-$(date +%Y%m%d-%H%M%S).txt"
{
    echo "API Functionality Test Results - $(date)"
    echo "=========================================="
    echo "Base URL: $BASE_URL"
    echo ""
    echo "Summary:"
    echo "Total Tests: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"
    echo "Success Rate: ${SUCCESS_RATE}%"
    echo ""
    if [ ${#FAILED_APIS[@]} -gt 0 ]; then
        echo "Failed APIs:"
        for api in "${FAILED_APIS[@]}"; do
            echo "  - $api"
        done
    fi
} > "$RESULTS_FILE"

log "Results saved to: $RESULTS_FILE"
echo ""
