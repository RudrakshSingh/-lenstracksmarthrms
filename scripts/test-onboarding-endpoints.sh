#!/bin/bash

# Test Onboarding Employee Endpoints
# Tests the endpoints that are giving 500 errors in frontend

BASE_URL="https://98.70.245.87"
HOST_HEADER="Host: api.etelios.com"
EMPLOYEE_ID="EMP-2025-153599"

echo "═══════════════════════════════════════════════════════════"
echo "     TESTING ONBOARDING EMPLOYEE ENDPOINTS"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Base URL: $BASE_URL"
echo "Employee ID: $EMPLOYEE_ID"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Get Auth Token
echo "Step 1: Getting Auth Token..."
TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/mock-login-fast" \
  -H "$HOST_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}')

TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Failed to get token${NC}"
  echo "Response: $TOKEN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Token obtained${NC}"
echo ""

# Step 2: Test GET /api/hr/employees
echo "═══════════════════════════════════════════════════════════"
echo "Test 1: GET /api/hr/employees"
echo "═══════════════════════════════════════════════════════════"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/hr/employees?status=active&limit=10" \
  -H "$HOST_HEADER" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ SUCCESS${NC}"
  echo "$BODY" | jq '.success, .message, .data | length' 2>/dev/null || echo "$BODY" | head -c 200
else
  echo -e "${RED}❌ FAILED${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
echo ""

# Step 3: Test GET /api/hr/employees/:id
echo "═══════════════════════════════════════════════════════════"
echo "Test 2: GET /api/hr/employees/$EMPLOYEE_ID"
echo "═══════════════════════════════════════════════════════════"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/hr/employees/$EMPLOYEE_ID" \
  -H "$HOST_HEADER" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ SUCCESS${NC}"
  echo "$BODY" | jq '.success, .message, .data.employeeId, .data.fullName' 2>/dev/null || echo "$BODY" | head -c 200
else
  echo -e "${RED}❌ FAILED${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
echo ""

# Step 4: Test PUT /api/hr/employees/:id
echo "═══════════════════════════════════════════════════════════"
echo "Test 3: PUT /api/hr/employees/$EMPLOYEE_ID"
echo "═══════════════════════════════════════════════════════════"
RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/hr/employees/$EMPLOYEE_ID" \
  -H "$HOST_HEADER" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "phone": "+1234567890",
    "jobTitle": "Software Engineer"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ SUCCESS${NC}"
  echo "$BODY" | jq '.success, .message' 2>/dev/null || echo "$BODY" | head -c 200
else
  echo -e "${RED}❌ FAILED${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
echo ""

# Step 5: Test POST /api/hr/employees/:id/assign-role
echo "═══════════════════════════════════════════════════════════"
echo "Test 4: POST /api/hr/employees/$EMPLOYEE_ID/assign-role"
echo "═══════════════════════════════════════════════════════════"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/hr/employees/$EMPLOYEE_ID/assign-role" \
  -H "$HOST_HEADER" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"roleName":"Employee"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ SUCCESS${NC}"
  echo "$BODY" | jq '.success, .message' 2>/dev/null || echo "$BODY" | head -c 200
else
  echo -e "${RED}❌ FAILED${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
echo ""

# Step 6: Test PATCH /api/hr/employees/:id/status
echo "═══════════════════════════════════════════════════════════"
echo "Test 5: PATCH /api/hr/employees/$EMPLOYEE_ID/status"
echo "═══════════════════════════════════════════════════════════"
RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/hr/employees/$EMPLOYEE_ID/status" \
  -H "$HOST_HEADER" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"active"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ SUCCESS${NC}"
  echo "$BODY" | jq '.success, .message' 2>/dev/null || echo "$BODY" | head -c 200
else
  echo -e "${RED}❌ FAILED${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "                    TESTING COMPLETE"
echo "═══════════════════════════════════════════════════════════"

