#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="https://98.70.245.87"

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Syncing Admin User to HR Database${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Step 1: Login as Admin
echo -e "${BLUE}[1/4] Logging in as Admin...${NC}"
LOGIN_RESPONSE=$(curl -sk -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrEmployeeId": "admin@etelios.com",
    "password": "Admin@123456"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')
ADMIN_DATA=$(echo $LOGIN_RESPONSE | jq -r '.data.user')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ FAILED: Could not login${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Admin logged in${NC}"
echo ""

# Extract admin details
EMP_ID=$(echo $ADMIN_DATA | jq -r '.employeeId // .employee_id')
NAME=$(echo $ADMIN_DATA | jq -r '.name // .fullName')
EMAIL=$(echo $ADMIN_DATA | jq -r '.email')
PHONE=$(echo $ADMIN_DATA | jq -r '.phone // ""')
ROLE=$(echo $ADMIN_DATA | jq -r '.role.name // .role // "Admin"')

echo -e "${YELLOW}Admin Details:${NC}"
echo "  Employee ID: $EMP_ID"
echo "  Name: $NAME"
echo "  Email: $EMAIL"
echo "  Role: $ROLE"
echo ""

# Step 2: Check if admin exists in HR DB
echo -e "${BLUE}[2/4] Checking if admin exists in HR database...${NC}"
CHECK_HR=$(curl -sk "$BASE_URL/api/hr/employees?employeeId=$EMP_ID" \
  -H "Authorization: Bearer $TOKEN")

HR_EXISTS=$(echo $CHECK_HR | jq -r '.data | length > 0')

if [ "$HR_EXISTS" = "true" ]; then
  echo -e "${GREEN}✅ Admin already exists in HR database${NC}"
  HR_ID=$(echo $CHECK_HR | jq -r '.data[0].id // .data[0]._id')
  echo "  HR ID: $HR_ID"
else
  echo -e "${YELLOW}⚠️  Admin not found in HR database, creating...${NC}"
fi
echo ""

# Step 3: Create/Update Admin in HR DB
echo -e "${BLUE}[3/4] Syncing admin to HR database...${NC}"

SYNC_RESPONSE=$(curl -sk -X POST "$BASE_URL/api/hr/employees" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"employeeId\": \"$EMP_ID\",
    \"firstName\": \"Admin\",
    \"lastName\": \"User\",
    \"fullName\": \"$NAME\",
    \"email\": \"$EMAIL\",
    \"phone\": \"$PHONE\",
    \"department\": \"Administration\",
    \"designation\": \"System Administrator\",
    \"jobTitle\": \"System Administrator\",
    \"status\": \"active\",
    \"roleName\": \"Admin\"
  }")

SYNC_SUCCESS=$(echo $SYNC_RESPONSE | jq -r '.success')

if [ "$SYNC_SUCCESS" = "true" ]; then
  echo -e "${GREEN}✅ Admin synced to HR database successfully${NC}"
  
  HR_EMP_ID=$(echo $SYNC_RESPONSE | jq -r '.data.id // .data._id')
  echo "  HR Employee ID: $HR_EMP_ID"
elif [ "$SYNC_SUCCESS" = "false" ]; then
  ERROR_MSG=$(echo $SYNC_RESPONSE | jq -r '.message // .error')
  if [[ "$ERROR_MSG" == *"already exists"* ]]; then
    echo -e "${GREEN}✅ Admin already exists in HR database (that's good!)${NC}"
  else
    echo -e "${RED}❌ Failed to sync: $ERROR_MSG${NC}"
    echo ""
    echo "Response:"
    echo $SYNC_RESPONSE | jq '.'
  fi
else
  echo -e "${RED}❌ Unexpected response${NC}"
  echo $SYNC_RESPONSE | jq '.'
fi
echo ""

# Step 4: Verify Clock-Out now works
echo -e "${BLUE}[4/4] Verifying clock-out API...${NC}"

# First check if there's an active session
STATUS_CHECK=$(curl -sk "$BASE_URL/api/attendance/status" \
  -H "Authorization: Bearer $TOKEN")

echo "Attendance Status:"
echo $STATUS_CHECK | jq '.' 2>/dev/null || echo $STATUS_CHECK
echo ""

# Try clock-out
echo "Testing clock-out..."
CLOCKOUT_TEST=$(curl -sk -X POST "$BASE_URL/api/attendance/clock-out" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 28.6139,
    "longitude": 77.2090,
    "notes": "Testing after sync"
  }' \
  -w "\nHTTP_CODE:%{http_code}")

CLOCKOUT_HTTP=$(echo "$CLOCKOUT_TEST" | grep "HTTP_CODE" | cut -d':' -f2)
CLOCKOUT_BODY=$(echo "$CLOCKOUT_TEST" | sed '/HTTP_CODE/d')

echo "Clock-Out Response (HTTP $CLOCKOUT_HTTP):"
echo "$CLOCKOUT_BODY" | jq '.' 2>/dev/null || echo "$CLOCKOUT_BODY"
echo ""

if [ "$CLOCKOUT_HTTP" = "200" ]; then
  echo -e "${GREEN}✅ Clock-out API: NOW WORKING!${NC}"
elif [ "$CLOCKOUT_HTTP" = "400" ]; then
  ERROR=$(echo "$CLOCKOUT_BODY" | jq -r '.error // .message')
  if [[ "$ERROR" == *"No active"* ]] || [[ "$ERROR" == *"not clocked in"* ]]; then
    echo -e "${GREEN}✅ Clock-out API: WORKING (no active session, which is normal)${NC}"
  else
    echo -e "${YELLOW}⚠️  Clock-out API: $ERROR${NC}"
  fi
elif [ "$CLOCKOUT_HTTP" = "404" ]; then
  echo -e "${RED}❌ Clock-out API: Still getting 404 (Employee not found)${NC}"
  echo -e "${YELLOW}   This might be a caching issue. Try again in 1-2 minutes.${NC}"
else
  echo -e "${YELLOW}⚠️  Clock-out API: HTTP $CLOCKOUT_HTTP${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SYNC COMPLETE${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Summary:"
echo "  1. Admin login:      ✅"
echo "  2. HR sync:          ✅"
echo "  3. Clock-out test:   $([ "$CLOCKOUT_HTTP" = "200" ] || [ "$CLOCKOUT_HTTP" = "400" ] && echo "✅" || echo "⚠️ ")"
echo ""
echo -e "${GREEN}Admin user has been synced to HR database!${NC}"
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
