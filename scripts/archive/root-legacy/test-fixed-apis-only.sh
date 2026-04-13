#!/bin/bash

# Test only the fixed APIs

set +e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_BASE_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
TENANT_ID="lenstrack"
ADMIN_EMAIL="Admin@lenstrack.com"
ADMIN_PASSWORD="Kadarkhan@123"

echo "🧪 Testing Fixed APIs Only"
echo "=========================================="
echo ""

# Login
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "{\"email\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASSWORD\"}")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -1)
BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  exit 1
fi

ADMIN_TOKEN=$(echo "$BODY" | jq -r '.data.accessToken // .accessToken // .token')
EMP_ID=$(echo "$BODY" | jq -r '.data.user.employeeId // .data.user.employee_id // "EMP-2026-116865"')

echo "Using employee ID: $EMP_ID"
echo ""

# Test 1: GET /api/hr/employee/:id
echo "1️⃣  Testing GET /api/hr/employee/:id (with employee_id string)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$API_BASE_URL/api/hr/employee/$EMP_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

HTTP=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP" = "200" ]; then
  echo -e "${GREEN}✅ PASSED${NC} (HTTP $HTTP)"
else
  echo -e "${RED}❌ FAILED${NC} (HTTP $HTTP)"
  echo "Response: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
echo ""

# Test 2: GET /api/hr/performance/employee/:id
echo "2️⃣  Testing GET /api/hr/performance/employee/:id (with employee_id string)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$API_BASE_URL/api/hr/performance/employee/$EMP_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

HTTP=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP" = "200" ]; then
  echo -e "${GREEN}✅ PASSED${NC} (HTTP $HTTP)"
else
  echo -e "${RED}❌ FAILED${NC} (HTTP $HTTP)"
  echo "Response: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
echo ""

# Test 3: GET /api/hr/dashboard/overview
echo "3️⃣  Testing GET /api/hr/dashboard/overview"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$API_BASE_URL/api/hr/dashboard/overview" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

HTTP=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP" = "200" ]; then
  echo -e "${GREEN}✅ PASSED${NC} (HTTP $HTTP)"
else
  echo -e "${RED}❌ FAILED${NC} (HTTP $HTTP)"
  echo "Response: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
echo ""

# Test 4: GET /api/hr/time-tracking/timesheets
echo "4️⃣  Testing GET /api/hr/time-tracking/timesheets"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$API_BASE_URL/api/hr/time-tracking/timesheets" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

HTTP=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP" = "200" ]; then
  echo -e "${GREEN}✅ PASSED${NC} (HTTP $HTTP)"
else
  echo -e "${RED}❌ FAILED${NC} (HTTP $HTTP)"
  echo "Response: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
echo ""

# Test 5: GET /api/hr/time-tracking/projects
echo "5️⃣  Testing GET /api/hr/time-tracking/projects"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$API_BASE_URL/api/hr/time-tracking/projects" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

HTTP=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP" = "200" ]; then
  echo -e "${GREEN}✅ PASSED${NC} (HTTP $HTTP)"
else
  echo -e "${RED}❌ FAILED${NC} (HTTP $HTTP)"
  echo "Response: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
echo ""

echo "=========================================="
echo "✅ All fixed APIs tested!"
echo ""
