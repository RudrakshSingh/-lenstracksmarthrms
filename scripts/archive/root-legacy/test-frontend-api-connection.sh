#!/bin/bash

###############################################################################
# Test Frontend API Connection
# This script verifies that the frontend can connect to the backend API
###############################################################################

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

echo "=========================================="
echo "🔍 Frontend API Connection Test"
echo "=========================================="
echo ""
echo "Testing API Base URL: $API_BASE"
echo ""

# Test 1: Health Check (No Auth Required)
echo "Test 1: Health Check (No Auth)"
echo "----------------------------------------"
HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$API_BASE/api/auth/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$HEALTH_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✅ Health Check: PASSED (HTTP $HTTP_CODE)${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo -e "${RED}❌ Health Check: FAILED (HTTP $HTTP_CODE)${NC}"
  echo "$BODY"
fi
echo ""

# Test 2: Login (Get Token)
echo "Test 2: Login (Get Auth Token)"
echo "----------------------------------------"
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@upcapto.com",
    "password": "Upcapto@2026"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // .data.token // empty')
if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo -e "${RED}❌ Login: FAILED${NC}"
  echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
  exit 1
else
  echo -e "${GREEN}✅ Login: PASSED${NC}"
  echo "Token: ${TOKEN:0:50}..."
fi
echo ""

# Test 3: Get Employees (Requires Auth)
echo "Test 3: Get Employees (Requires Auth + Tenant ID)"
echo "----------------------------------------"
EMPLOYEES_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$API_BASE/api/hr/employees?limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$EMPLOYEES_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$EMPLOYEES_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✅ Get Employees: PASSED (HTTP $HTTP_CODE)${NC}"
  COUNT=$(echo "$BODY" | jq '.pagination.total // (.data | length) // 0' 2>/dev/null || echo "0")
  echo "Total Employees: $COUNT"
  echo "$BODY" | jq '.data[0:3] | .[] | {employeeId, name: .fullName, email}' 2>/dev/null || echo "Response received"
else
  echo -e "${RED}❌ Get Employees: FAILED (HTTP $HTTP_CODE)${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
echo ""

# Test 4: Create Employee (Requires Auth)
echo "Test 4: Create Employee (Requires Auth + Tenant ID)"
echo "----------------------------------------"
CREATE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_BASE/api/hr/employees" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Frontend Test Employee",
    "email": "frontend-test-'$(date +%s)'@test.com",
    "phone": "+919876543210",
    "department": "IT",
    "position": "Developer",
    "status": "active"
  }')

HTTP_CODE=$(echo "$CREATE_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$CREATE_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" == "201" ] || [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✅ Create Employee: PASSED (HTTP $HTTP_CODE)${NC}"
  EMPLOYEE_ID=$(echo "$BODY" | jq -r '.data.employeeId // .data.employee_id // "N/A"' 2>/dev/null)
  echo "Created Employee ID: $EMPLOYEE_ID"
  echo "$BODY" | jq '.data | {employeeId, fullName, email, status}' 2>/dev/null || echo "Response received"
else
  echo -e "${RED}❌ Create Employee: FAILED (HTTP $HTTP_CODE)${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
echo ""

# Test 5: CORS Check
echo "Test 5: CORS Headers Check"
echo "----------------------------------------"
CORS_RESPONSE=$(curl -s -I -X OPTIONS "$API_BASE/api/auth/health" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET")

CORS_HEADERS=$(echo "$CORS_RESPONSE" | grep -i "access-control" || echo "No CORS headers found")

if echo "$CORS_HEADERS" | grep -qi "access-control"; then
  echo -e "${GREEN}✅ CORS Headers: PRESENT${NC}"
  echo "$CORS_HEADERS"
else
  echo -e "${YELLOW}⚠️  CORS Headers: NOT FOUND (may still work)${NC}"
fi
echo ""

# Summary
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo ""
echo "API Base URL: $API_BASE"
echo ""
echo "✅ If all tests passed, your frontend should be able to connect!"
echo ""
echo "📝 Frontend Configuration:"
echo "   NEXT_PUBLIC_API_BASE_URL=$API_BASE"
echo "   NEXT_PUBLIC_API_URL=$API_BASE"
echo ""
echo "🔍 Next Steps:"
echo "   1. Verify frontend code uses process.env.NEXT_PUBLIC_API_BASE_URL"
echo "   2. Check browser DevTools Network tab when creating employee"
echo "   3. Ensure requests include Authorization header and x-tenant-id"
echo ""
