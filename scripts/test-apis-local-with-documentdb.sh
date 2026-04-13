#!/bin/bash

# ============================================
# Test APIs Locally with DocumentDB
# ============================================
# Tests APIs when services are running locally
# Connects to DocumentDB (not local MongoDB)
#
# Usage:
#   1. Start services locally:
#      cd microservices/auth-service && npm start &
#      cd microservices/hr-service && npm start &
#      cd microservices/attendance-service && npm start &
#   
#   2. Run tests:
#      ./scripts/test-apis-local-with-documentdb.sh
# ============================================

set +e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="${BASE_URL:-http://localhost:3000}"
TEST_EMAIL="${TEST_EMAIL:-lenstrack01@gmail.com}"
TEST_PASSWORD="${TEST_PASSWORD:-cnbxs2b9A1!}"
TENANT_ID="${TENANT_ID:-lenstrack}"

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

# Check if services are running
step "Checking Local Services"

check_service() {
    local service=$1
    local port=$2
    local response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/health" --max-time 2 2>/dev/null)
    if [ "$response" == "200" ] || [ "$response" == "000" ]; then
        if [ "$response" == "200" ]; then
            log "✅ $service (port $port) - Running"
            return 0
        else
            warning "⚠️  $service (port $port) - Not running"
            return 1
        fi
    else
        warning "⚠️  $service (port $port) - Status: $response"
        return 1
    fi
}

check_service "Auth Service" "3001"
check_service "HR Service" "3002"
check_service "Attendance Service" "3003"

step "Testing APIs"

# Test login
log "Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "X-Tenant-Id: $TENANT_ID" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
    "${BASE_URL}/api/auth/login" 2>/dev/null)

if echo "$LOGIN_RESPONSE" | grep -q "token\|accessToken"; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // .accessToken // .data.token' 2>/dev/null)
    if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        log "✅ Login successful"
        echo ""
        echo "Testing protected endpoints..."
        
        # Test a few key endpoints
        echo ""
        echo "1. Get Current User:"
        curl -s -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT_ID" \
            "${BASE_URL}/api/auth/me" | jq '.' 2>/dev/null | head -10 || echo "Failed"
        
        echo ""
        echo "2. Get Employees:"
        curl -s -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT_ID" \
            "${BASE_URL}/api/hr/employees" | jq '.data | length' 2>/dev/null || echo "Failed"
        
        echo ""
        echo "3. Get Today's Attendance:"
        EMPLOYEE_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.employeeId // .data.employeeId' 2>/dev/null)
        if [ -n "$EMPLOYEE_ID" ] && [ "$EMPLOYEE_ID" != "null" ]; then
            TODAY=$(date +%Y-%m-%d)
            curl -s -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT_ID" \
                "${BASE_URL}/api/attendance/today?employeeId=$EMPLOYEE_ID&date=$TODAY" | jq '.' 2>/dev/null | head -15 || echo "Failed"
        fi
        
        log ""
        log "✅ Basic API tests completed"
    else
        error "❌ Login failed - No token"
    fi
else
    error "❌ Login failed"
    echo "Response: $LOGIN_RESPONSE"
fi
