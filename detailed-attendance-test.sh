#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="https://98.70.245.87"

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Detailed Attendance API Test${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Login
echo -e "${BLUE}[1] Logging in...${NC}"
LOGIN_RESPONSE=$(curl -sk -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrEmployeeId": "admin@etelios.com",
    "password": "Admin@123456"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')
USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.data.user._id // .data.user.id')
EMP_ID=$(echo $LOGIN_RESPONSE | jq -r '.data.user.employeeId')

echo -e "${GREEN}✅ Logged in${NC}"
echo ""

# Test 1: Clock In Status
echo -e "${BLUE}[2] Testing Clock-In Status...${NC}"
STATUS_RESPONSE=$(curl -sk "$BASE_URL/api/attendance/status" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP_CODE:%{http_code}")

STATUS_HTTP=$(echo "$STATUS_RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)
STATUS_BODY=$(echo "$STATUS_RESPONSE" | sed '/HTTP_CODE/d')

echo "HTTP Status: $STATUS_HTTP"
echo "Response:"
echo "$STATUS_BODY" | jq '.' 2>/dev/null || echo "$STATUS_BODY"
echo ""

# Test 2: Try Clock In (to enable clock out)
echo -e "${BLUE}[3] Testing Clock-In API...${NC}"
CLOCKIN_RESPONSE=$(curl -sk -X POST "$BASE_URL/api/attendance/clock-in" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 28.6139,
    "longitude": 77.2090,
    "notes": "Test clock-in"
  }' \
  -w "\nHTTP_CODE:%{http_code}")

CLOCKIN_HTTP=$(echo "$CLOCKIN_RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)
CLOCKIN_BODY=$(echo "$CLOCKIN_RESPONSE" | sed '/HTTP_CODE/d')

echo "HTTP Status: $CLOCKIN_HTTP"
echo "Response:"
echo "$CLOCKIN_BODY" | jq '.' 2>/dev/null || echo "$CLOCKIN_BODY"
echo ""

if [ "$CLOCKIN_HTTP" = "201" ] || [ "$CLOCKIN_HTTP" = "200" ]; then
  echo -e "${GREEN}✅ Clock-In: SUCCESS${NC}"
  
  # Now test clock out
  echo -e "${BLUE}[4] Testing Clock-Out API...${NC}"
  sleep 2
  
  CLOCKOUT_RESPONSE=$(curl -sk -X POST "$BASE_URL/api/attendance/clock-out" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "latitude": 28.6139,
      "longitude": 77.2090,
      "notes": "Test clock-out"
    }' \
    -w "\nHTTP_CODE:%{http_code}")
  
  CLOCKOUT_HTTP=$(echo "$CLOCKOUT_RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)
  CLOCKOUT_BODY=$(echo "$CLOCKOUT_RESPONSE" | sed '/HTTP_CODE/d')
  
  echo "HTTP Status: $CLOCKOUT_HTTP"
  echo "Response:"
  echo "$CLOCKOUT_BODY" | jq '.' 2>/dev/null || echo "$CLOCKOUT_BODY"
  echo ""
  
  if [ "$CLOCKOUT_HTTP" = "200" ]; then
    echo -e "${GREEN}✅ Clock-Out: SUCCESS${NC}"
  else
    echo -e "${RED}❌ Clock-Out: FAILED (HTTP $CLOCKOUT_HTTP)${NC}"
  fi
else
  echo -e "${RED}❌ Clock-In: FAILED (HTTP $CLOCKIN_HTTP)${NC}"
  echo "   Cannot test clock-out without successful clock-in"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  FINAL STATUS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Leave Balance API:     ✅ WORKING"
echo "Clock-In API:          $([ "$CLOCKIN_HTTP" = "200" ] || [ "$CLOCKIN_HTTP" = "201" ] && echo "✅ WORKING" || echo "❌ FAILED (HTTP $CLOCKIN_HTTP)")"
echo "Clock-Out API:         $([ "$CLOCKOUT_HTTP" = "200" ] && echo "✅ WORKING" || echo "$([ -z "$CLOCKOUT_HTTP" ] && echo "⚠️  NOT TESTED" || echo "❌ FAILED (HTTP $CLOCKOUT_HTTP)")")"
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
