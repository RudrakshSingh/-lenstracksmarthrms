#!/bin/bash

# Test script to verify dashboard login time tracking
# Tests: Recent login time and total login time calculation

set -e

BASE_URL="${BACKEND_URL:-http://localhost:3000}"
EMAIL="${TEST_EMAIL:-lenstrack01@gmail.com}"
PASSWORD="${TEST_PASSWORD:-cnbxs2b9A1!}"

echo "🧪 Testing Dashboard Login Time Tracking"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Login
echo "1️⃣ Logging in as employee..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // .token // empty')
TENANT_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.tenantId // .tenantId // "default"')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  echo "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo ""

# Get Dashboard
echo "2️⃣ Fetching dashboard data..."
DASHBOARD_RESPONSE=$(curl -s -X GET "$BASE_URL/api/hr/dashboard" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT_ID" \
  -H "Content-Type: application/json")

echo "$DASHBOARD_RESPONSE" | jq '.' > /tmp/dashboard_response.json

SUCCESS=$(echo "$DASHBOARD_RESPONSE" | jq -r '.success // true')

if [ "$SUCCESS" != "true" ]; then
  echo -e "${RED}❌ Dashboard fetch failed${NC}"
  echo "$DASHBOARD_RESPONSE" | jq '.'
  exit 1
fi

echo -e "${GREEN}✅ Dashboard fetched successfully${NC}"
echo ""

# Extract login time information
echo "3️⃣ Checking login time information..."
echo ""

USER_DATA=$(echo "$DASHBOARD_RESPONSE" | jq '.data.user')
ATTENDANCE_DATA=$(echo "$DASHBOARD_RESPONSE" | jq '.data.widgets.attendance')

LAST_LOGIN=$(echo "$USER_DATA" | jq -r '.lastLogin // empty')
RECENT_LOGIN_TIME=$(echo "$ATTENDANCE_DATA" | jq -r '.recentLoginTime // empty')
CURRENT_SESSION_START=$(echo "$ATTENDANCE_DATA" | jq -r '.currentSessionStart // empty')
TOTAL_LOGIN_TIME=$(echo "$ATTENDANCE_DATA" | jq -r '.totalLoginTimeToday // empty')

echo "📊 Login Time Information:"
echo "   - Last Login (from user): $LAST_LOGIN"
echo "   - Recent Login Time (from attendance): $RECENT_LOGIN_TIME"
echo "   - Current Session Start: $CURRENT_SESSION_START"
echo ""

if [ -n "$TOTAL_LOGIN_TIME" ] && [ "$TOTAL_LOGIN_TIME" != "null" ]; then
  TOTAL_HOURS=$(echo "$TOTAL_LOGIN_TIME" | jq -r '.hours // 0')
  TOTAL_MINUTES=$(echo "$TOTAL_LOGIN_TIME" | jq -r '.minutes // 0')
  FORMATTED=$(echo "$TOTAL_LOGIN_TIME" | jq -r '.formatted // "N/A"')
  SESSIONS_COUNT=$(echo "$TOTAL_LOGIN_TIME" | jq -r '.sessionsCount // 0')
  
  echo "   - Total Login Time Today:"
  echo "     * Hours: $TOTAL_HOURS"
  echo "     * Minutes: $TOTAL_MINUTES"
  echo "     * Formatted: $FORMATTED"
  echo "     * Sessions Count: $SESSIONS_COUNT"
  echo ""
  
  if [ "$TOTAL_HOURS" != "0" ] || [ "$TOTAL_MINUTES" != "0" ]; then
    echo -e "${GREEN}✅ Total login time calculated: $FORMATTED${NC}"
  else
    echo -e "${YELLOW}⚠️  Total login time is 0 (no sessions today or not logged in)${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Total login time not available${NC}"
fi

echo ""
echo "4️⃣ Full attendance widget data:"
echo "$ATTENDANCE_DATA" | jq '.'

echo ""
echo "========================================"
echo -e "${GREEN}✅ Test completed${NC}"
echo ""
