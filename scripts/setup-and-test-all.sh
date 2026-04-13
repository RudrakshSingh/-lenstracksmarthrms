#!/bin/bash

# Complete Setup and Test Script
# 
# This script:
# 1. Tries to create superadmin via API (if first user registration allowed)
# 2. Seeds complete system
# 3. Tests all APIs
#
# Usage:
#   ./scripts/setup-and-test-all.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 Complete Setup & Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${CYAN}Base URL: ${BASE_URL}${NC}"
echo ""

cd "$ROOT_DIR"
export BASE_URL="$BASE_URL"

# Step 1: Try to create superadmin via API
echo -e "${YELLOW}📝 Step 1: Setting up Superadmin...${NC}"
echo ""

# Try to login first
echo "   Trying to login as superadmin..."
LOGIN_RESULT=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@upcapto.com","password":"Upcapto@2026"}' 2>/dev/null || echo '{"success":false}')

if echo "$LOGIN_RESULT" | grep -q '"success":true'; then
  echo -e "   ${GREEN}✅ Superadmin already exists and can login${NC}"
else
  echo -e "   ${YELLOW}⚠️  Superadmin login failed, trying to register...${NC}"
  
  # Try to register superadmin (if first user registration is allowed)
  REGISTER_RESULT=$(curl -s -X POST "${BASE_URL}/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "admin@upcapto.com",
      "password": "Upcapto@2026",
      "name": "Upcapto Super Admin",
      "employee_id": "UPCAPTO-ADMIN-001",
      "role": "superadmin",
      "tenantId": "upcapto",
      "department": "HR",
      "band_level": "A",
      "hierarchy_level": "NATIONAL",
      "designation": "Super Administrator",
      "status": "active",
      "is_active": true
    }' 2>/dev/null || echo '{"success":false}')
  
  if echo "$REGISTER_RESULT" | grep -q '"success":true'; then
    echo -e "   ${GREEN}✅ Superadmin registered successfully${NC}"
  else
    echo -e "   ${RED}❌ Cannot create superadmin via API${NC}"
    echo ""
    echo -e "   ${YELLOW}Please create superadmin manually:${NC}"
    echo "   1. Connect to database directly"
    echo "   2. Run: node scripts/seed-superadmin-direct.js (with MONGODB_URI)"
    echo "   3. Or create user via database admin tool"
    echo ""
    echo -e "   ${CYAN}Superadmin Credentials:${NC}"
    echo "   Email: admin@upcapto.com"
    echo "   Password: Upcapto@2026"
    echo "   Tenant: upcapto"
    echo ""
    echo -e "   ${YELLOW}After creating superadmin, run this script again.${NC}"
    exit 1
  fi
fi

echo ""

# Step 2: Seed complete system
echo -e "${YELLOW}📝 Step 2: Seeding Complete System...${NC}"
echo ""
node scripts/seed-complete-system.js

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Seed failed!${NC}"
  echo ""
  echo -e "${YELLOW}Note: Some data might already exist (this is OK)${NC}"
  echo ""
fi

echo ""

# Step 3: Test all APIs
echo -e "${YELLOW}🧪 Step 3: Testing All APIs...${NC}"
echo ""
node scripts/test-complete-flow.js

if [ $? -ne 0 ]; then
  echo -e "${YELLOW}⚠️  Some tests failed. Check test-results.json for details.${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ All setup and tests completed!${NC}"
echo ""
echo -e "${CYAN}📄 Files generated:${NC}"
echo "   - seed-credentials.json (login credentials)"
echo "   - test-results.json (test results)"
echo ""
