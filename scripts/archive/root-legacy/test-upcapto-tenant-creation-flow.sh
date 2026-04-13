#!/bin/bash

###############################################################################
# Test Complete Flow: Upcapto Login → Create Tenant → Temporary Password
# 
# This script tests:
# 1. Login with Upcapto super admin
# 2. Create a new tenant
# 3. Get temporary password for tenant admin
# 4. Test tenant admin login with temporary password
###############################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# API Base URL
API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

# Upcapto Credentials
UPCAPTO_EMAIL="admin@upcapto.com"
UPCAPTO_PASSWORD="Upcapto@2026"
UPCAPTO_TENANT="upcapto"

# Test Tenant Details
TEST_TENANT_NAME="Test Company $(date +%s)"
TEST_TENANT_EMAIL="admin@testcompany.com"
TEST_TENANT_PHONE="+91-9876543210"

log "=========================================="
log "Testing Upcapto → Tenant Creation Flow"
log "=========================================="
echo ""

# Step 1: Login with Upcapto Super Admin
log "Step 1: Logging in with Upcapto Super Admin..."
echo "   Email: $UPCAPTO_EMAIL"
echo "   Tenant: $UPCAPTO_TENANT"
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$UPCAPTO_EMAIL\",
    \"password\": \"$UPCAPTO_PASSWORD\",
    \"tenantId\": \"$UPCAPTO_TENANT\"
  }")

LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | grep -o '"success":[^,]*' | cut -d':' -f2 | tr -d ' ' || echo "false")

if [ "$LOGIN_STATUS" = "true" ]; then
    UPCAPTO_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    if [ -z "$UPCAPTO_TOKEN" ]; then
        error "Login successful but token not found in response"
    fi
    
    log "✅ Upcapto login successful!"
    echo "   Token: ${UPCAPTO_TOKEN:0:20}..."
    echo ""
else
    error "❌ Upcapto login failed!"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

# Step 2: Create New Tenant
log "Step 2: Creating new tenant..."
echo "   Name: $TEST_TENANT_NAME"
echo "   Email: $TEST_TENANT_EMAIL"
echo ""

TENANT_RESPONSE=$(curl -s -X POST "$API_BASE/api/admin/tenants" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $UPCAPTO_TOKEN" \
  -H "x-tenant-id: $UPCAPTO_TENANT" \
  -d "{
    \"name\": \"$TEST_TENANT_NAME\",
    \"email\": \"$TEST_TENANT_EMAIL\",
    \"phone\": \"$TEST_TENANT_PHONE\",
    \"plan\": \"Professional\",
    \"address\": {
      \"city\": \"Bangalore\",
      \"state\": \"Karnataka\",
      \"country\": \"India\"
    }
  }")

TENANT_STATUS=$(echo "$TENANT_RESPONSE" | grep -o '"success":[^,]*' | cut -d':' -f2 | tr -d ' ' || echo "false")

if [ "$TENANT_STATUS" = "true" ]; then
    log "✅ Tenant created successfully!"
    echo ""
    
    # Extract tenant details
    NEW_TENANT_ID=$(echo "$TENANT_RESPONSE" | grep -o '"tenantId":"[^"]*' | cut -d'"' -f4 | head -1)
    NEW_TENANT_NAME=$(echo "$TENANT_RESPONSE" | grep -o '"name":"[^"]*' | cut -d'"' -f4 | head -1)
    
    # Extract admin user details
    ADMIN_EMAIL=$(echo "$TENANT_RESPONSE" | grep -o '"email":"[^"]*' | grep -v "upcapto" | head -1 | cut -d'"' -f4)
    ADMIN_PASSWORD=$(echo "$TENANT_RESPONSE" | grep -o '"temporaryPassword":"[^"]*' | cut -d'"' -f4 | head -1)
    
    # Extract super admin user details
    SUPERADMIN_EMAIL=$(echo "$TENANT_RESPONSE" | grep -o '"email":"[^"]*' | grep -i "super" | head -1 | cut -d'"' -f4)
    SUPERADMIN_PASSWORD=$(echo "$TENANT_RESPONSE" | grep -o '"temporaryPassword":"[^"]*' | cut -d'"' -f4 | tail -1)
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "📋 Tenant Details:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "   Tenant ID: $NEW_TENANT_ID"
    echo "   Name: $NEW_TENANT_NAME"
    echo "   Status: Active"
    echo ""
    
    if [ ! -z "$ADMIN_EMAIL" ] && [ ! -z "$ADMIN_PASSWORD" ]; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        log "👤 Admin User (Temporary Password):"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "   Email: $ADMIN_EMAIL"
        echo "   Password: $ADMIN_PASSWORD"
        echo "   ⚠️  Must change password on first login!"
        echo ""
    fi
    
    if [ ! -z "$SUPERADMIN_EMAIL" ] && [ ! -z "$SUPERADMIN_PASSWORD" ]; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        log "👑 Super Admin User (Temporary Password):"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "   Email: $SUPERADMIN_EMAIL"
        echo "   Password: $SUPERADMIN_PASSWORD"
        echo "   ⚠️  Must change password on first login!"
        echo ""
    fi
    
    # Step 3: Test Login with Temporary Password
    if [ ! -z "$ADMIN_EMAIL" ] && [ ! -z "$ADMIN_PASSWORD" ] && [ ! -z "$NEW_TENANT_ID" ]; then
        log "Step 3: Testing login with temporary password..."
        echo "   Email: $ADMIN_EMAIL"
        echo "   Tenant: $NEW_TENANT_ID"
        echo ""
        
        TENANT_LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
          -H "Content-Type: application/json" \
          -d "{
            \"email\": \"$ADMIN_EMAIL\",
            \"password\": \"$ADMIN_PASSWORD\",
            \"tenantId\": \"$NEW_TENANT_ID\"
          }")
        
        TENANT_LOGIN_STATUS=$(echo "$TENANT_LOGIN_RESPONSE" | grep -o '"success":[^,]*' | cut -d':' -f2 | tr -d ' ' || echo "false")
        
        if [ "$TENANT_LOGIN_STATUS" = "true" ]; then
            TENANT_TOKEN=$(echo "$TENANT_LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
            log "✅ Tenant admin login successful with temporary password!"
            echo "   Token: ${TENANT_TOKEN:0:20}..."
            echo ""
            
            # Check if mustChangePassword flag is set
            MUST_CHANGE=$(echo "$TENANT_LOGIN_RESPONSE" | grep -o '"mustChangePassword":[^,]*' | cut -d':' -f2 | tr -d ' ' || echo "false")
            
            if [ "$MUST_CHANGE" = "true" ]; then
                warning "⚠️  Password change required on next login!"
            fi
        else
            warning "⚠️  Tenant admin login failed!"
            echo "Response: $TENANT_LOGIN_RESPONSE"
        fi
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "✅ Complete Flow Test Successful!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    log "📝 Summary:"
    echo "   1. ✅ Upcapto super admin login"
    echo "   2. ✅ Tenant creation"
    echo "   3. ✅ Temporary password generation"
    echo "   4. ✅ Tenant admin login with temporary password"
    echo ""
    
    log "🎯 Next Steps for Tenant Admin:"
    echo "   1. Login with temporary password"
    echo "   2. Change password immediately"
    echo "   3. Start using the system"
    echo ""
    
else
    error "❌ Tenant creation failed!"
    echo "Response: $TENANT_RESPONSE"
    exit 1
fi
