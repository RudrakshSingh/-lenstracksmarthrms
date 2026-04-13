#!/bin/bash

###############################################################################
# Test API Latency and Identify Slow Endpoints
# Measures response time for all APIs
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
TARGET_LATENCY=100  # 100ms target

log "=========================================="
log "API Latency Testing"
log "=========================================="
log "Base URL: $BASE_URL"
log "Target Latency: ${TARGET_LATENCY}ms"
log ""

# Get auth token for protected endpoints
log "Getting authentication token..."
TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@upcapto.com",
    "password": "Upcapto@2026"
  }' 2>/dev/null || echo "")

if [ -z "$TOKEN_RESPONSE" ] || echo "$TOKEN_RESPONSE" | grep -q "error\|failed"; then
    warning "Could not get auth token, testing only public endpoints"
    AUTH_TOKEN=""
    TENANT_ID=""
else
    AUTH_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4 || echo "")
    TENANT_ID="upcapto"
fi

if [ -n "$AUTH_TOKEN" ]; then
    log "✅ Auth token obtained"
else
    warning "⚠️  No auth token, some tests will fail"
fi
echo ""

# Function to measure latency
measure_latency() {
    local endpoint=$1
    local method=${2:-GET}
    local data=${3:-""}
    local headers=${4:-""}
    
    local start_time=$(date +%s%N)
    local response
    
    if [ "$method" = "POST" ] || [ "$method" = "PATCH" ]; then
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
    
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds
    
    local http_code=$(echo "$response" | tail -1)
    local body=$(echo "$response" | sed '$d')
    
    echo "$duration|$http_code|$body"
}

# Test endpoints
declare -a RESULTS
declare -a SLOW_APIS

log "Testing API endpoints..."
echo ""

# Health endpoints (public)
info "Health Endpoints:"
for endpoint in "/health" "/api/auth/health" "/api/hr/health" "/api/attendance/health" "/api/payroll/health"; do
    result=$(measure_latency "$endpoint")
    latency=$(echo "$result" | cut -d'|' -f1)
    http_code=$(echo "$result" | cut -d'|' -f2)
    
    if [ "$latency" -lt $TARGET_LATENCY ]; then
        log "  ✅ $endpoint: ${latency}ms (HTTP $http_code)"
    else
        warning "  ⚠️  $endpoint: ${latency}ms (HTTP $http_code) - SLOW"
        SLOW_APIS+=("$endpoint: ${latency}ms")
    fi
    RESULTS+=("$endpoint|$latency|$http_code")
done
echo ""

if [ -z "$AUTH_TOKEN" ]; then
    warning "Skipping protected endpoints (no auth token)"
    exit 0
fi

HEADERS="-H \"Authorization: Bearer $AUTH_TOKEN\" -H \"X-Tenant-Id: $TENANT_ID\""

# Auth endpoints
info "Auth Endpoints:"
for endpoint in "/api/auth/me"; do
    result=$(measure_latency "$endpoint" "GET" "" "$HEADERS")
    latency=$(echo "$result" | cut -d'|' -f1)
    http_code=$(echo "$result" | cut -d'|' -f2)
    
    if [ "$latency" -lt $TARGET_LATENCY ]; then
        log "  ✅ $endpoint: ${latency}ms (HTTP $http_code)"
    else
        warning "  ⚠️  $endpoint: ${latency}ms (HTTP $http_code) - SLOW"
        SLOW_APIS+=("$endpoint: ${latency}ms")
    fi
    RESULTS+=("$endpoint|$latency|$http_code")
done
echo ""

# HR endpoints
info "HR Endpoints:"
for endpoint in "/api/hr/employees" "/api/hr/departments" "/api/hr/dashboard/departments"; do
    result=$(measure_latency "$endpoint" "GET" "" "$HEADERS")
    latency=$(echo "$result" | cut -d'|' -f1)
    http_code=$(echo "$result" | cut -d'|' -f2)
    
    if [ "$latency" -lt $TARGET_LATENCY ]; then
        log "  ✅ $endpoint: ${latency}ms (HTTP $http_code)"
    else
        warning "  ⚠️  $endpoint: ${latency}ms (HTTP $http_code) - SLOW"
        SLOW_APIS+=("$endpoint: ${latency}ms")
    fi
    RESULTS+=("$endpoint|$latency|$http_code")
done
echo ""

# Payroll endpoints
info "Payroll Endpoints:"
result=$(measure_latency "/api/payroll/calculate" "POST" '{"grossMonthly": 50000}' "$HEADERS")
latency=$(echo "$result" | cut -d'|' -f1)
http_code=$(echo "$result" | cut -d'|' -f2)

if [ "$latency" -lt $TARGET_LATENCY ]; then
    log "  ✅ /api/payroll/calculate: ${latency}ms (HTTP $http_code)"
else
    warning "  ⚠️  /api/payroll/calculate: ${latency}ms (HTTP $http_code) - SLOW"
    SLOW_APIS+=("/api/payroll/calculate: ${latency}ms")
fi
RESULTS+=("/api/payroll/calculate|$latency|$http_code")

result=$(measure_latency "/api/payroll/salary?employeeId=EMP001" "GET" "" "$HEADERS")
latency=$(echo "$result" | cut -d'|' -f1)
http_code=$(echo "$result" | cut -d'|' -f2)

if [ "$latency" -lt $TARGET_LATENCY ]; then
    log "  ✅ /api/payroll/salary: ${latency}ms (HTTP $http_code)"
else
    warning "  ⚠️  /api/payroll/salary: ${latency}ms (HTTP $http_code) - SLOW"
    SLOW_APIS+=("/api/payroll/salary: ${latency}ms")
fi
RESULTS+=("/api/payroll/salary|$latency|$http_code")
echo ""

# Attendance endpoints
info "Attendance Endpoints:"
for endpoint in "/api/attendance?employeeId=EMP001&date=2026-02-16"; do
    result=$(measure_latency "$endpoint" "GET" "" "$HEADERS")
    latency=$(echo "$result" | cut -d'|' -f1)
    http_code=$(echo "$result" | cut -d'|' -f2)
    
    if [ "$latency" -lt $TARGET_LATENCY ]; then
        log "  ✅ $endpoint: ${latency}ms (HTTP $http_code)"
    else
        warning "  ⚠️  $endpoint: ${latency}ms (HTTP $http_code) - SLOW"
        SLOW_APIS+=("$endpoint: ${latency}ms")
    fi
    RESULTS+=("$endpoint|$latency|$http_code")
done
echo ""

# Summary
log "=========================================="
log "Latency Test Summary"
log "=========================================="

TOTAL=0
SLOW_COUNT=0
FAST_COUNT=0
TOTAL_LATENCY=0

for result in "${RESULTS[@]}"; do
    endpoint=$(echo "$result" | cut -d'|' -f1)
    latency=$(echo "$result" | cut -d'|' -f2)
    http_code=$(echo "$result" | cut -d'|' -f3)
    
    TOTAL=$((TOTAL + 1))
    TOTAL_LATENCY=$((TOTAL_LATENCY + latency))
    
    if [ "$latency" -lt $TARGET_LATENCY ]; then
        FAST_COUNT=$((FAST_COUNT + 1))
    else
        SLOW_COUNT=$((SLOW_COUNT + 1))
    fi
done

AVG_LATENCY=$((TOTAL_LATENCY / TOTAL))

log "Total APIs tested: $TOTAL"
log "Fast APIs (< ${TARGET_LATENCY}ms): $FAST_COUNT"
log "Slow APIs (>= ${TARGET_LATENCY}ms): $SLOW_COUNT"
log "Average latency: ${AVG_LATENCY}ms"
echo ""

if [ ${#SLOW_APIS[@]} -gt 0 ]; then
    warning "Slow APIs (>= ${TARGET_LATENCY}ms):"
    for api in "${SLOW_APIS[@]}"; do
        warning "  - $api"
    done
    echo ""
    log "Optimization needed for ${#SLOW_APIS[@]} endpoint(s)"
else
    log "✅ All APIs are under ${TARGET_LATENCY}ms!"
fi

# Save results to file
RESULTS_FILE="api-latency-results-$(date +%Y%m%d-%H%M%S).txt"
{
    echo "API Latency Test Results - $(date)"
    echo "=========================================="
    echo "Base URL: $BASE_URL"
    echo "Target Latency: ${TARGET_LATENCY}ms"
    echo ""
    echo "Results:"
    for result in "${RESULTS[@]}"; do
        echo "$result"
    done
    echo ""
    echo "Summary:"
    echo "Total: $TOTAL"
    echo "Fast: $FAST_COUNT"
    echo "Slow: $SLOW_COUNT"
    echo "Average: ${AVG_LATENCY}ms"
} > "$RESULTS_FILE"

log "Results saved to: $RESULTS_FILE"
echo ""
