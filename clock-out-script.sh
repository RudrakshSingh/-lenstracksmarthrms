#!/bin/bash

# Script to login and clock out
# Usage: ./clock-out-script.sh

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
EMAIL="lenstrack01@gmail.com"
PASSWORD="cnbxs2b9A1!"

# Default location (Mumbai coordinates)
LATITUDE="${LATITUDE:-19.0760}"
LONGITUDE="${LONGITUDE:-72.8777}"

echo -e "${BLUE}🚀 Starting login and clock out process...${NC}"
echo "=================================================="
echo ""

# Step 1: Login
echo -e "${BLUE}🔐 Logging in...${NC}"
echo "   Email: $EMAIL"
echo "   API URL: $API_BASE_URL/api/auth/login"

LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }" \
  --max-time 10)

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  TOKEN=$(echo "$BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || echo "$BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  
  if [ -z "$TOKEN" ]; then
    # Try alternative JSON parsing
    TOKEN=$(echo "$BODY" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('accessToken') or data.get('data', {}).get('token') or data.get('token', ''))" 2>/dev/null || echo "")
  fi
  
  if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Failed to extract token from login response${NC}"
    echo "Response: $BODY"
    exit 1
  fi
  
  echo -e "${GREEN}✅ Login successful!${NC}"
  echo "   Token: ${TOKEN:0:20}..."
else
  echo -e "${RED}❌ Login failed!${NC}"
  echo "   Status: $HTTP_CODE"
  echo "   Response: $BODY"
  exit 1
fi

# Step 2: Clock out
echo ""
echo -e "${BLUE}🕐 Clocking out...${NC}"
echo "   Location: $LATITUDE, $LONGITUDE"
echo "   API URL: $API_BASE_URL/api/attendance/clock-out"

CLOCKOUT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL/api/attendance/clock-out" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"latitude\": $LATITUDE,
    \"longitude\": $LONGITUDE,
    \"notes\": \"Clock out via script\"
  }" \
  --max-time 10)

CLOCKOUT_HTTP_CODE=$(echo "$CLOCKOUT_RESPONSE" | tail -n1)
CLOCKOUT_BODY=$(echo "$CLOCKOUT_RESPONSE" | sed '$d')

if [ "$CLOCKOUT_HTTP_CODE" -eq 200 ] || [ "$CLOCKOUT_HTTP_CODE" -eq 201 ]; then
  echo -e "${GREEN}✅ Clock out successful!${NC}"
  
  # Try to extract clock out time
  CLOCKOUT_TIME=$(echo "$CLOCKOUT_BODY" | python3 -c "import sys, json; data=json.load(sys.stdin); att=data.get('data', data); print(att.get('check_out_time') or att.get('clockOutTime', ''))" 2>/dev/null || echo "")
  
  if [ -n "$CLOCKOUT_TIME" ]; then
    echo "   Clock out time: $CLOCKOUT_TIME"
  fi
  
  echo ""
  echo "=================================================="
  echo -e "${GREEN}✅ Process completed successfully!${NC}"
else
  echo -e "${RED}❌ Clock out failed!${NC}"
  echo "   Status: $CLOCKOUT_HTTP_CODE"
  echo "   Response: $CLOCKOUT_BODY"
  
  if [ "$CLOCKOUT_HTTP_CODE" -eq 400 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  You may not be clocked in. Please clock in first.${NC}"
  elif [ "$CLOCKOUT_HTTP_CODE" -eq 401 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Authentication failed. Token may be invalid.${NC}"
  elif [ "$CLOCKOUT_HTTP_CODE" -eq 403 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Clock out blocked due to security violation.${NC}"
  fi
  
  exit 1
fi
