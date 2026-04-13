#!/bin/bash

# Comprehensive API Latency Test Script
# Tests multiple endpoints and calculates average latency

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
step() { echo -e "\n${BLUE}========================================${NC}\n${BLUE}$1${NC}\n${BLUE}========================================${NC}\n"; }

API_BASE_URL="https://api.etelios.com"
TENANT_ID=${1:-"lenstrack"}
REQUESTS=${2:-5}

step "API Latency Test"

# Get auth token
log "Getting authentication token..."
LOGIN_RESPONSE=$(curl -s -k -X POST "${API_BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d '{"emailOrEmployeeId":"Admin@lenstrack.com","password":"AdminPass123!"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // .accessToken // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  error "Failed to get authentication token"
  exit 1
fi

log "✅ Token obtained"

# Test function
test_endpoint() {
  local endpoint=$1
  local method=${2:-GET}
  local data=${3:-""}
  local name=$4
  
  echo ""
  log "Testing: $name"
  echo "Endpoint: $endpoint"
  
  local times=()
  for i in $(seq 1 $REQUESTS); do
    if [ "$method" = "POST" ]; then
      response_time=$(curl -s -k -X POST "$endpoint" \
        -H "Authorization: Bearer $TOKEN" \
        -H "x-tenant-id: $TENANT_ID" \
        -H "Content-Type: application/json" \
        -d "$data" \
        -w "%{time_total}" \
        -o /dev/null)
    else
      response_time=$(curl -s -k -X GET "$endpoint" \
        -H "Authorization: Bearer $TOKEN" \
        -H "x-tenant-id: $TENANT_ID" \
        -w "%{time_total}" \
        -o /dev/null)
    fi
    
    times+=($response_time)
    echo "  Request $i: ${response_time}s"
  done
  
  # Calculate average
  local sum=0
  local count=${#times[@]}
  for time in "${times[@]}"; do
    sum=$(echo "$sum + $time" | bc)
  done
  local avg=$(echo "scale=3; $sum / $count" | bc)
  
  # Calculate min/max
  local min=${times[0]}
  local max=${times[0]}
  for time in "${times[@]}"; do
    if (( $(echo "$time < $min" | bc -l) )); then
      min=$time
    fi
    if (( $(echo "$time > $max" | bc -l) )); then
      max=$time
    fi
  done
  
  echo "  Average: ${avg}s"
  echo "  Min: ${min}s"
  echo "  Max: ${max}s"
}

# Test endpoints
step "Testing API Endpoints"

test_endpoint "${API_BASE_URL}/api/auth/me" "GET" "" "Auth - Get Profile"

test_endpoint "${API_BASE_URL}/api/hr/employees?limit=10" "GET" "" "HR - List Employees"

test_endpoint "${API_BASE_URL}/api/hr/stores?limit=10" "GET" "" "HR - List Stores"

test_endpoint "${API_BASE_URL}/api/hr/roster?limit=10" "GET" "" "HR - List Roster"

test_endpoint "${API_BASE_URL}/api/attendance?limit=10" "GET" "" "Attendance - List Records"

test_endpoint "${API_BASE_URL}/api/hr/dashboard" "GET" "" "HR - Dashboard"

step "Latency Test Complete"
