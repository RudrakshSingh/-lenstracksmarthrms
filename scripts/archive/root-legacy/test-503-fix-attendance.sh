#!/bin/bash

# Test the attendance API that was giving 503 error
# GET /api/attendance?employeeId=EMP-2026-969954&date=2026-02-19

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API Configuration
API_BASE_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
TENANT_ID="lenstrack"

# Test credentials
ADMIN_EMAIL="Admin@lenstrack.com"
ADMIN_PASSWORD="Kadarkhan@123"

# Test employee ID (the one that was giving 503)
TEST_EMPLOYEE_ID="EMP-2026-969954"
TEST_DATE="2026-02-19"

echo "🧪 Testing Attendance API (503 Fix)"
echo "=========================================="
echo ""
echo "API: GET /api/attendance?employeeId=$TEST_EMPLOYEE_ID&date=$TEST_DATE"
echo ""

# Step 1: Admin Login
echo "1️⃣  Admin Login"
echo "----------------------------------------"
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\"
  }")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -1)
BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  ADMIN_TOKEN=$(echo "$BODY" | jq -r '.data.accessToken // .accessToken // .token')
  echo -e "${GREEN}✅ Login successful${NC} (HTTP $HTTP_CODE)"
else
  echo -e "${RED}❌ Login failed${NC} (HTTP $HTTP_CODE)"
  echo "   Response: $BODY"
  exit 1
fi
echo ""

# Step 2: Test the specific API that was giving 503
echo "2️⃣  Testing Attendance API (Original 503 Error)"
echo "----------------------------------------"
echo "URL: $API_BASE_URL/api/attendance?employeeId=$TEST_EMPLOYEE_ID&date=$TEST_DATE"
echo ""

ATT_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$API_BASE_URL/api/attendance?employeeId=$TEST_EMPLOYEE_ID&date=$TEST_DATE" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

ATT_HTTP=$(echo "$ATT_RESPONSE" | tail -1)
ATT_BODY=$(echo "$ATT_RESPONSE" | sed '$d')

echo "Response Status: $ATT_HTTP"
echo ""

if [ "$ATT_HTTP" = "503" ]; then
  echo -e "${RED}❌ STILL RETURNING 503 ERROR!${NC}"
  echo ""
  echo "Response Body:"
  echo "$ATT_BODY" | jq '.' 2>/dev/null || echo "$ATT_BODY"
  echo ""
  echo "⚠️  Fix is NOT working - needs investigation"
  exit 1
elif [ "$ATT_HTTP" = "200" ]; then
  echo -e "${GREEN}✅ API returning 200 (not 503)${NC}"
  echo ""
  
  # Check response structure
  SUCCESS=$(echo "$ATT_BODY" | jq -r '.success // false')
  DATA=$(echo "$ATT_BODY" | jq -r '.data // []')
  MESSAGE=$(echo "$ATT_BODY" | jq -r '.message // empty')
  
  echo "Response Details:"
  echo "  Success: $SUCCESS"
  echo "  Message: $MESSAGE"
  
  if echo "$DATA" | jq -e 'type == "array"' > /dev/null 2>&1; then
    COUNT=$(echo "$DATA" | jq 'length')
    echo "  Records Count: $COUNT"
    
    if [ "$COUNT" -gt 0 ]; then
      echo ""
      echo "  First Record:"
      echo "$DATA" | jq '.[0]' | head -20
    else
      echo "  (Empty array - no records found for this date)"
    fi
  else
    echo "  Data: $DATA"
  fi
  
  # Check for error messages
  if echo "$ATT_BODY" | jq -e '.message | test("unavailable|503|error"; "i")' > /dev/null 2>&1; then
    echo ""
    echo -e "${YELLOW}⚠️  Response contains error message${NC}"
    echo "   Message: $MESSAGE"
  else
    echo ""
    echo -e "${GREEN}✅ No error messages - fix is working!${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Unexpected status code${NC} (HTTP $ATT_HTTP)"
  echo ""
  echo "Response Body:"
  echo "$ATT_BODY" | jq '.' 2>/dev/null || echo "$ATT_BODY"
fi
echo ""

# Step 3: Test with different dates
echo "3️⃣  Testing with Different Dates"
echo "----------------------------------------"

# Today's date
TODAY=$(date +%Y-%m-%d)
echo "Testing with today's date: $TODAY"

ATT_TODAY_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$API_BASE_URL/api/attendance?employeeId=$TEST_EMPLOYEE_ID&date=$TODAY" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

ATT_TODAY_HTTP=$(echo "$ATT_TODAY_RESPONSE" | tail -1)
ATT_TODAY_BODY=$(echo "$ATT_TODAY_RESPONSE" | sed '$d')

if [ "$ATT_TODAY_HTTP" = "200" ]; then
  echo -e "${GREEN}✅ Today's date: 200 OK${NC}"
  COUNT=$(echo "$ATT_TODAY_BODY" | jq '.data | length // 0')
  echo "   Records: $COUNT"
else
  echo -e "${RED}❌ Today's date: HTTP $ATT_TODAY_HTTP${NC}"
fi
echo ""

# Step 4: Test without date parameter
echo "4️⃣  Testing without date parameter"
echo "----------------------------------------"

ATT_NO_DATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$API_BASE_URL/api/attendance?employeeId=$TEST_EMPLOYEE_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

ATT_NO_DATE_HTTP=$(echo "$ATT_NO_DATE_RESPONSE" | tail -1)
ATT_NO_DATE_BODY=$(echo "$ATT_NO_DATE_RESPONSE" | sed '$d')

if [ "$ATT_NO_DATE_HTTP" = "200" ]; then
  echo -e "${GREEN}✅ Without date: 200 OK${NC}"
  COUNT=$(echo "$ATT_NO_DATE_BODY" | jq '.data | length // 0')
  echo "   Records: $COUNT"
else
  echo -e "${YELLOW}⚠️  Without date: HTTP $ATT_NO_DATE_HTTP${NC}"
fi
echo ""

# Summary
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo ""
if [ "$ATT_HTTP" = "200" ]; then
  echo -e "${GREEN}✅ 503 FIX IS WORKING!${NC}"
  echo "   Original API now returns 200 instead of 503"
  echo "   API: GET /api/attendance?employeeId=$TEST_EMPLOYEE_ID&date=$TEST_DATE"
else
  echo -e "${RED}❌ 503 FIX NOT WORKING${NC}"
  echo "   API still returns 503"
  echo "   Needs further investigation"
fi
echo ""
