#!/bin/bash

# Script to ensure an employee exists in HR service with store assignment
# Works for any tenant - automatically detects tenant from user login
# Usage: ./ensure-employee-with-store.sh <email> <password> [employeeId]

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

EMAIL=${1:-"rudi@gmail.com"}
PASSWORD=${2:-"Rudi@123"}
EMPLOYEE_ID=${3:-"EMP-2026-886706"}

API_BASE_URL="https://api.etelios.com"

step "Ensuring Employee with Store Assignment"

# Step 1: Get user info and tenant
log "Step 1: Getting user info and tenant..."
LOGIN_RESPONSE=$(curl -s -k -X POST "${API_BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"emailOrEmployeeId\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // .accessToken // empty')
TENANT_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.tenantId // "default"')
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.id // empty')
USER_EMAIL=$(echo "$LOGIN_RESPONSE" | jq -r '.data.email // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  error "Failed to login. Check credentials."
  echo "Login Response: $LOGIN_RESPONSE"
  exit 1
fi

log "✅ User logged in"
log "   Tenant: $TENANT_ID"
log "   User ID: $USER_ID"
log "   Email: $USER_EMAIL"

# Step 2: Get admin token for the tenant
log "Step 2: Getting admin token for tenant: $TENANT_ID..."
if [ "$TENANT_ID" = "lenstrack" ]; then
  ADMIN_EMAIL="Admin@lenstrack.com"
  ADMIN_PASS="AdminPass123!"
elif [ "$TENANT_ID" = "upcapto" ]; then
  ADMIN_EMAIL="admin@upcapto.com"
  ADMIN_PASS="Upcapto@2026"
elif [ "$TENANT_ID" = "eyekra" ]; then
  ADMIN_EMAIL="admin@eyekra.com"
  ADMIN_PASS="Eyekra@Admin2026!"
else
  ADMIN_EMAIL="Admin@lenstrack.com"
  ADMIN_PASS="AdminPass123!"
fi

ADMIN_LOGIN=$(curl -s -k -X POST "${API_BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "{\"emailOrEmployeeId\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}")

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | jq -r '.data.accessToken // .accessToken // empty')

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
  error "Failed to get admin token for tenant: $TENANT_ID"
  exit 1
fi

log "✅ Admin token obtained"

# Step 3: Check if employee exists
log "Step 3: Checking if employee exists in HR service..."
EMPLOYEE_CHECK=$(curl -s -k -X GET "${API_BASE_URL}/api/hr/employees?search=$EMAIL&limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

EMPLOYEE_EXISTS=$(echo "$EMPLOYEE_CHECK" | jq '.data | length > 0')
HAS_STORE=$(echo "$EMPLOYEE_CHECK" | jq '.data[0].store != null')

if [ "$EMPLOYEE_EXISTS" = "true" ] && [ "$HAS_STORE" = "true" ]; then
  log "✅ Employee already exists with store assignment"
  echo "$EMPLOYEE_CHECK" | jq '.data[0] | {employeeId, fullName, email, store: .store.name, tenantId}'
  exit 0
fi

# Step 4: Get or create store
log "Step 4: Getting or creating store for tenant: $TENANT_ID..."
STORES=$(curl -s -k -X GET "${API_BASE_URL}/api/hr/stores?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

STORE_ID=$(echo "$STORES" | jq -r '.data[0]._id // empty')

if [ -z "$STORE_ID" ] || [ "$STORE_ID" = "null" ]; then
  warning "No store found. Creating default store..."
  STORE_CREATE=$(curl -s -k -X POST "${API_BASE_URL}/api/hr/stores" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "x-tenant-id: $TENANT_ID" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\":\"Default Store\",
      \"code\":\"DEF001\",
      \"address\":{
        \"city\":\"Mumbai\",
        \"state\":\"Maharashtra\",
        \"country\":\"India\"
      },
      \"coordinates\":{
        \"latitude\":19.076,
        \"longitude\":72.8777
      },
      \"tenantId\":\"$TENANT_ID\"
    }")
  
  STORE_ID=$(echo "$STORE_CREATE" | jq -r '.data._id // empty')
  
  if [ -z "$STORE_ID" ] || [ "$STORE_ID" = "null" ]; then
    error "Failed to create store"
    echo "$STORE_CREATE"
    exit 1
  fi
  
  log "✅ Store created: $STORE_ID"
else
  log "✅ Store found: $STORE_ID"
fi

# Step 5: Create or update employee
log "Step 5: Creating/updating employee record..."
EMPLOYEE_DATA=$(curl -s -k -X POST "${API_BASE_URL}/api/hr/employees" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\":\"$EMAIL\",
    \"employeeId\":\"$EMPLOYEE_ID\",
    \"firstName\":\"$(echo $EMAIL | cut -d'@' -f1 | cut -d'.' -f1 | sed 's/.*/\u&/')\",
    \"lastName\":\"Singh\",
    \"store\":\"$STORE_ID\",
    \"storeId\":\"$STORE_ID\",
    \"status\":\"active\",
    \"tenantId\":\"$TENANT_ID\"
  }")

SUCCESS=$(echo "$EMPLOYEE_DATA" | jq -r '.success // false')

if [ "$SUCCESS" != "true" ]; then
  error "Failed to create/update employee"
  echo "$EMPLOYEE_DATA"
  exit 1
fi

log "✅ Employee record created/updated successfully"
echo "$EMPLOYEE_DATA" | jq '.data | {employeeId, fullName, email, store: .store.name, tenantId}'

step "Employee Setup Complete"
log "Employee: $EMAIL"
log "Employee ID: $EMPLOYEE_ID"
log "Tenant: $TENANT_ID"
log "Store: Assigned"
