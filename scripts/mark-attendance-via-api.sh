#!/bin/bash

# Script to mark attendance via API (all data from API, no direct DB access)
# Usage: ./mark-attendance-via-api.sh <employeeEmail> <password> <tenantId>

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

EMPLOYEE_EMAIL=${1:-"mohammedaliriyaz0786@gmail.com"}
PASSWORD=${2:-"Riyaz@123"}
TENANT_ID=${3:-"lenstrack"}

step "Marking Attendance via API for $EMPLOYEE_EMAIL"

# Step 1: Get employee token via API
log "Step 1: Getting employee token via /api/auth/login..."
TOKEN=$(curl -s -k -X POST "https://api.etelios.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"emailOrEmployeeId\":\"$EMPLOYEE_EMAIL\",\"password\":\"$PASSWORD\"}" | jq -r '.data.accessToken // .accessToken // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  error "Failed to get token via API. Check credentials."
  exit 1
fi

log "✅ Token obtained via API"

# Step 2: Get employee data via API
log "Step 2: Getting employee data via /api/hr/employees..."
EMPLOYEE_DATA=$(curl -s -k -X GET "https://api.etelios.com/api/hr/employees?search=$EMPLOYEE_EMAIL&limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

EMPLOYEE_ID=$(echo "$EMPLOYEE_DATA" | jq -r '.data[0].employeeId // .data[0].employee_id // empty')
EMPLOYEE_NAME=$(echo "$EMPLOYEE_DATA" | jq -r '.data[0].fullName // empty')

if [ -z "$EMPLOYEE_ID" ]; then
  error "Employee not found via API"
  exit 1
fi

log "✅ Employee found via API: $EMPLOYEE_ID - $EMPLOYEE_NAME"

# Step 3: Get roster via API
log "Step 3: Getting roster via /api/hr/roster..."
ROSTER_DATA=$(curl -s -k -X GET "https://api.etelios.com/api/hr/roster?employeeId=$EMPLOYEE_ID&date=$(date +%Y-%m-%d)" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

ROSTER=$(echo "$ROSTER_DATA" | jq -r '.data[0] // empty')

if [ -z "$ROSTER" ] || [ "$ROSTER" = "null" ]; then
  warning "No roster found via API, using default (09:00-18:00)"
  SHIFT_START="09:00"
  SHIFT_END="18:00"
else
  SHIFT_START=$(echo "$ROSTER" | jq -r '.shiftStart // "09:00"')
  SHIFT_END=$(echo "$ROSTER" | jq -r '.shiftEnd // "18:00"')
  log "✅ Roster found via API: $SHIFT_START - $SHIFT_END"
fi

# Step 4: Get store location via API
STORE_LAT=$(echo "$EMPLOYEE_DATA" | jq -r '.data[0].store.coordinates.latitude // .data[0].store.latitude // "19.076"')
STORE_LNG=$(echo "$EMPLOYEE_DATA" | jq -r '.data[0].store.coordinates.longitude // .data[0].store.longitude // "72.8777"')

log "Store location: $STORE_LAT, $STORE_LNG"

# Step 5: Mark check-in via API
step "Step 4: Marking check-in via /api/attendance/check-in"
CHECKIN_RESULT=$(curl -s -k -X POST "https://api.etelios.com/api/attendance/check-in" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"latitude\": $STORE_LAT,
    \"longitude\": $STORE_LNG,
    \"notes\": \"Check-in according to roster: $SHIFT_START-$SHIFT_END\"
  }")

CHECKIN_SUCCESS=$(echo "$CHECKIN_RESULT" | jq -r '.success // false')
if [ "$CHECKIN_SUCCESS" = "true" ]; then
  log "✅ Check-in successful via API"
  echo "$CHECKIN_RESULT" | jq '{employeeId: .data.employeeId, checkIn: .data.checkIn.time, shift: .data.shift}'
else
  error "Check-in failed via API"
  echo "$CHECKIN_RESULT" | jq '{message, error}'
fi

# Step 6: Mark check-out via API
step "Step 5: Marking check-out via /api/attendance/check-out"
CHECKOUT_RESULT=$(curl -s -k -X POST "https://api.etelios.com/api/attendance/check-out" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"latitude\": $STORE_LAT,
    \"longitude\": $STORE_LNG,
    \"notes\": \"Check-out according to roster: $SHIFT_END\"
  }")

CHECKOUT_SUCCESS=$(echo "$CHECKOUT_RESULT" | jq -r '.success // false')
if [ "$CHECKOUT_SUCCESS" = "true" ]; then
  log "✅ Check-out successful via API"
  echo "$CHECKOUT_RESULT" | jq '{employeeId: .data.employeeId, checkOut: .data.checkOut.time, totalHours: .data.totalHours}'
else
  error "Check-out failed via API"
  echo "$CHECKOUT_RESULT" | jq '{message, error}'
fi

step "✅ Attendance marking complete - All via API!"

echo ""
log "Summary:"
log "  - Employee: $EMPLOYEE_ID ($EMPLOYEE_NAME)"
log "  - Roster: $SHIFT_START - $SHIFT_END"
log "  - All data fetched via API"
log "  - Attendance marked via API"
