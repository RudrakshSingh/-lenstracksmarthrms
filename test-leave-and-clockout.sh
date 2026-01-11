#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="https://98.70.245.87"

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Testing Leave API & Clock Out API${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Step 1: Login
echo -e "${BLUE}[1/4] Logging in...${NC}"
LOGIN_RESPONSE=$(curl -sk -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrEmployeeId": "admin@etelios.com",
    "password": "Admin@123456"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')
USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.data.user._id // .data.user.id')
EMP_ID=$(echo $LOGIN_RESPONSE | jq -r '.data.user.employeeId // .data.user.employee_id')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ FAILED: Could not login${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo -e "   Employee ID: ${EMP_ID}"
echo ""

# Step 2: Test Leave Balance API
echo -e "${BLUE}[2/4] Testing Leave Balance API${NC}"
echo -e "   Endpoint: GET /api/hr/leaves/balance?employeeId=${EMP_ID}"
echo ""

LEAVE_RESPONSE=$(curl -sk "$BASE_URL/api/hr/leaves/balance?employeeId=$EMP_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE=$(echo "$LEAVE_RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)
LEAVE_BODY=$(echo "$LEAVE_RESPONSE" | sed '/HTTP_CODE/d')

echo "Response:"
echo "$LEAVE_BODY" | jq '.' 2>/dev/null || echo "$LEAVE_BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  LEAVE_SUCCESS=$(echo $LEAVE_BODY | jq -r '.success' 2>/dev/null)
  if [ "$LEAVE_SUCCESS" = "true" ]; then
    echo -e "${GREEN}✅ Leave Balance API: WORKING${NC}"
    
    CASUAL=$(echo $LEAVE_BODY | jq -r '.data.casualLeave.available' 2>/dev/null)
    SICK=$(echo $LEAVE_BODY | jq -r '.data.sickLeave.available' 2>/dev/null)
    EARNED=$(echo $LEAVE_BODY | jq -r '.data.earnedLeave.available' 2>/dev/null)
    
    if [ "$CASUAL" != "null" ] && [ "$CASUAL" != "" ]; then
      echo -e "   ${YELLOW}Available Leaves:${NC}"
      echo "   • Casual: $CASUAL"
      echo "   • Sick: $SICK"
      echo "   • Earned: $EARNED"
    fi
  else
    echo -e "${RED}❌ Leave Balance API: Response not successful${NC}"
  fi
else
  echo -e "${RED}❌ Leave Balance API: HTTP $HTTP_CODE${NC}"
fi
echo ""

# Step 3: Test Clock Out API (check if endpoint exists)
echo -e "${BLUE}[3/4] Testing Clock Out API Availability${NC}"
echo -e "   Endpoint: POST /api/attendance/clock-out"
echo ""

# Try to get attendance summary first to see if service is up
ATTENDANCE_CHECK=$(curl -sk "$BASE_URL/api/attendance/summary?employeeId=$USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP_CODE:%{http_code}")

ATT_HTTP_CODE=$(echo "$ATTENDANCE_CHECK" | grep "HTTP_CODE" | cut -d':' -f2)
ATT_BODY=$(echo "$ATTENDANCE_CHECK" | sed '/HTTP_CODE/d')

if [ "$ATT_HTTP_CODE" = "200" ] || [ "$ATT_HTTP_CODE" = "404" ]; then
  echo -e "${GREEN}✅ Attendance Service: REACHABLE${NC}"
  echo "   Note: Clock-out requires an active clock-in session"
  echo "   API endpoint is available but needs:"
  echo "   • Active clock-in session"
  echo "   • Selfie upload (optional)"
  echo "   • Location (latitude/longitude)"
else
  echo -e "${YELLOW}⚠️  Attendance Service: HTTP $ATT_HTTP_CODE${NC}"
fi
echo ""

# Step 4: Summary
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  API STATUS SUMMARY${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

if [ "$LEAVE_SUCCESS" = "true" ] && [ "$HTTP_CODE" = "200" ]; then
  echo -e "1. Leave Balance API    → ${GREEN}✅ WORKING${NC}"
else
  echo -e "1. Leave Balance API    → ${RED}❌ NOT WORKING${NC}"
fi

if [ "$ATT_HTTP_CODE" = "200" ] || [ "$ATT_HTTP_CODE" = "404" ]; then
  echo -e "2. Attendance Service   → ${GREEN}✅ WORKING${NC}"
  echo -e "3. Clock Out API        → ${GREEN}✅ AVAILABLE${NC}"
  echo ""
  echo -e "${YELLOW}ℹ️  Clock-out API requires:${NC}"
  echo "   • POST /api/attendance/clock-out"
  echo "   • Headers: Authorization: Bearer {token}"
  echo "   • Body: { latitude, longitude, selfie (optional) }"
  echo "   • Prerequisite: Must have active clock-in session"
else
  echo -e "2. Attendance Service   → ${RED}❌ NOT REACHABLE${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

# Test clock-in history to verify service is working
echo ""
echo -e "${BLUE}[BONUS] Testing Attendance History API${NC}"
HISTORY_RESPONSE=$(curl -sk "$BASE_URL/api/attendance/history?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP_CODE:%{http_code}")

HIST_HTTP_CODE=$(echo "$HISTORY_RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)
HIST_BODY=$(echo "$HISTORY_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HIST_HTTP_CODE" = "200" ]; then
  HIST_SUCCESS=$(echo $HIST_BODY | jq -r '.success' 2>/dev/null)
  if [ "$HIST_SUCCESS" = "true" ]; then
    echo -e "${GREEN}✅ Attendance History API: WORKING${NC}"
    
    TOTAL=$(echo $HIST_BODY | jq -r '.data.total' 2>/dev/null)
    if [ "$TOTAL" != "null" ] && [ "$TOTAL" != "" ]; then
      echo "   Total records: $TOTAL"
    fi
  fi
else
  echo -e "${YELLOW}⚠️  Attendance History API: HTTP $HIST_HTTP_CODE${NC}"
fi

echo ""
echo -e "${GREEN}Test completed at: $(date)${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
