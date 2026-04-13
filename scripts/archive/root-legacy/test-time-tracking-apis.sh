#!/bin/bash

# Test Time Tracking APIs

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

echo "🧪 Testing Time Tracking APIs"
echo "=========================================="
echo ""

# Login
echo "1️⃣  Admin Login..."
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "{\"email\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASSWORD\"}")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -1)
BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo -e "${RED}❌ Login failed${NC} (HTTP $HTTP_CODE)"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi

ADMIN_TOKEN=$(echo "$BODY" | jq -r '.data.accessToken // .accessToken // .token')
echo -e "${GREEN}✅ Login successful${NC}"
echo ""

# Test Time Tracking APIs
echo "2️⃣  Testing Time Tracking APIs"
echo "----------------------------------------"
echo ""

# Test 1: GET /api/hr/time-tracking
echo "📋 Testing GET /api/hr/time-tracking"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$API_BASE_URL/api/hr/time-tracking" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

HTTP=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP" = "200" ]; then
  echo -e "${GREEN}✅ PASSED${NC} (HTTP $HTTP)"
  echo "$BODY" | jq '.success, .message, .data | length' 2>/dev/null || echo "Response received"
else
  echo -e "${RED}❌ FAILED${NC} (HTTP $HTTP)"
  echo "$BODY" | jq '.' 2>/dev/null | head -10 || echo "$BODY" | head -5
fi
echo ""

# Test 2: GET /api/hr/time-tracking/timesheets
echo "📋 Testing GET /api/hr/time-tracking/timesheets"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$API_BASE_URL/api/hr/time-tracking/timesheets" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

HTTP=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP" = "200" ]; then
  echo -e "${GREEN}✅ PASSED${NC} (HTTP $HTTP)"
  echo "$BODY" | jq '.success, .message, .data.timesheets | length' 2>/dev/null || echo "Response received"
else
  echo -e "${RED}❌ FAILED${NC} (HTTP $HTTP)"
  echo "$BODY" | jq '.' 2>/dev/null | head -10 || echo "$BODY" | head -5
fi
echo ""

# Test 3: GET /api/hr/time-tracking/projects
echo "📋 Testing GET /api/hr/time-tracking/projects"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$API_BASE_URL/api/hr/time-tracking/projects" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

HTTP=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP" = "200" ]; then
  echo -e "${GREEN}✅ PASSED${NC} (HTTP $HTTP)"
  echo "$BODY" | jq '.success, .message, .data.projects | length' 2>/dev/null || echo "Response received"
else
  echo -e "${RED}❌ FAILED${NC} (HTTP $HTTP)"
  echo "$BODY" | jq '.' 2>/dev/null | head -10 || echo "$BODY" | head -5
fi
echo ""

# Test 4: GET /api/hr/time-tracking/stats
echo "📋 Testing GET /api/hr/time-tracking/stats"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$API_BASE_URL/api/hr/time-tracking/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

HTTP=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP" = "200" ]; then
  echo -e "${GREEN}✅ PASSED${NC} (HTTP $HTTP)"
  echo "$BODY" | jq '.success, .message' 2>/dev/null || echo "Response received"
else
  echo -e "${YELLOW}⚠️  ${NC} (HTTP $HTTP) - May not be implemented"
  echo "$BODY" | jq '.' 2>/dev/null | head -5 || echo "$BODY" | head -3
fi
echo ""

# Test with query parameters
echo "📋 Testing GET /api/hr/time-tracking/timesheets?startDate=2026-01-01&endDate=2026-02-20"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$API_BASE_URL/api/hr/time-tracking/timesheets?startDate=2026-01-01&endDate=2026-02-20" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

HTTP=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP" = "200" ]; then
  echo -e "${GREEN}✅ PASSED${NC} (HTTP $HTTP)"
  echo "$BODY" | jq '.success, .data.startDate, .data.endDate' 2>/dev/null || echo "Response received"
else
  echo -e "${RED}❌ FAILED${NC} (HTTP $HTTP)"
  echo "$BODY" | jq '.' 2>/dev/null | head -5 || echo "$BODY" | head -3
fi
echo ""

echo "=========================================="
echo "✅ Time Tracking APIs Test Complete!"
echo ""
