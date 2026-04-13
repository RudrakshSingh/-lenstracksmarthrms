#!/bin/bash

# Complete System Seed and Test Script
# 
# This script:
# 1. Seeds the database with all necessary data
# 2. Tests all APIs according to the flow documentation
#
# Usage:
#   ./scripts/run-seed-and-test.sh
#   BASE_URL=http://localhost:3000 ./scripts/run-seed-and-test.sh

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
echo -e "${BLUE}🚀 Complete System Seed & Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${CYAN}Base URL: ${BASE_URL}${NC}"
echo ""

# Step 1: Seed the system
echo -e "${YELLOW}📝 Step 1: Seeding database...${NC}"
echo ""
cd "$ROOT_DIR"
export BASE_URL="$BASE_URL"
node scripts/seed-complete-system.js

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Seed failed!${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Seed completed!${NC}"
echo ""

# Step 2: Test all APIs
echo -e "${YELLOW}🧪 Step 2: Testing all APIs...${NC}"
echo ""
export BASE_URL="$BASE_URL"
node scripts/test-complete-flow.js

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Tests failed!${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ All tests completed!${NC}"
echo ""
echo -e "${CYAN}📄 Check seed-credentials.json for login credentials${NC}"
echo -e "${CYAN}📄 Check test-results.json for test results${NC}"
echo ""
