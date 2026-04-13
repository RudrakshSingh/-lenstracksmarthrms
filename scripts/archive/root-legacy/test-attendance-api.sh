#!/bin/bash

# Test GET /api/attendance API
# Shows what information is returned

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Backend URL (Production)
API_BASE_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

# Credentials - Try both Admin and Employee
ADMIN_EMAIL="Admin@lenstrack.com"
ADMIN_PASSWORD="Kadarkhan@123"
EMPLOYEE_EMAIL="lenstrack01@gmail.com"
EMPLOYEE_PASSWORD="cnbxs2b9A1!"
TENANT_ID="lenstrack"

# Use Admin by default for full access
USE_ADMIN=true

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     GET /api/attendance API TEST                        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Backend URL:${NC} $API_BASE_URL"

if [ "$USE_ADMIN" = "true" ]; then
  echo -e "${CYAN}User:${NC} $ADMIN_EMAIL (Admin)"
  LOGIN_EMAIL="$ADMIN_EMAIL"
  LOGIN_PASSWORD="$ADMIN_PASSWORD"
else
  echo -e "${CYAN}User:${NC} $EMPLOYEE_EMAIL (Employee)"
  LOGIN_EMAIL="$EMPLOYEE_EMAIL"
  LOGIN_PASSWORD="$EMPLOYEE_PASSWORD"
fi
echo ""

# ============================================================
# STEP 1: Login
# ============================================================
echo -e "${CYAN}1️⃣  Logging in...${NC}"
echo "=================================================="

LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "{
    \"email\": \"$LOGIN_EMAIL\",
    \"password\": \"$LOGIN_PASSWORD\"
  }" \
  --max-time 15 2>/dev/null || echo -e "\n000")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -1)
BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo -e "${RED}❌ Login failed${NC} (HTTP $HTTP_CODE)"
  echo "Response: $BODY"
  exit 1
fi

# Extract token and user info
TOKEN=$(echo "$BODY" | jq -r '.data.accessToken // .data.token // .accessToken // .token' 2>/dev/null)
USER_ID=$(echo "$BODY" | jq -r '.data.user._id // .data.user.id // .user._id // .user.id' 2>/dev/null)
EMPLOYEE_ID=$(echo "$BODY" | jq -r '.data.user.employee_id // .data.user.employeeId // .user.employee_id // .user.employeeId' 2>/dev/null)
USER_NAME=$(echo "$BODY" | jq -r '.data.user.name // .data.user.fullName // .user.name // .user.fullName' 2>/dev/null)
USER_TENANT_ID=$(echo "$BODY" | jq -r '.data.user.tenantId // .data.user.tenant_id // .user.tenantId // .user.tenant_id // "lenstrack"' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ Failed to extract authentication token${NC}"
  exit 1
fi

if [ -z "$USER_TENANT_ID" ] || [ "$USER_TENANT_ID" = "null" ]; then
  USER_TENANT_ID="$TENANT_ID"
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo "   User: $USER_NAME"
echo "   Employee ID: $EMPLOYEE_ID"
echo "   Tenant ID: $USER_TENANT_ID"
echo ""

# ============================================================
# STEP 2: Test GET /api/attendance (Basic)
# ============================================================
echo -e "${CYAN}2️⃣  Testing GET /api/attendance (Basic)${NC}"
echo "=================================================="

ATTENDANCE_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$API_BASE_URL/api/attendance" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $USER_TENANT_ID" \
  --max-time 15 2>/dev/null || echo -e "\n000")

ATTENDANCE_HTTP=$(echo "$ATTENDANCE_RESPONSE" | tail -1)
ATTENDANCE_BODY=$(echo "$ATTENDANCE_RESPONSE" | sed '$d')

if [ "$ATTENDANCE_HTTP" != "200" ]; then
  echo -e "${RED}❌ Request failed${NC} (HTTP $ATTENDANCE_HTTP)"
  echo "Response: $ATTENDANCE_BODY"
  exit 1
fi

echo -e "${GREEN}✅ Request successful${NC} (HTTP $ATTENDANCE_HTTP)"
echo ""

# Parse and display response
SUCCESS=$(echo "$ATTENDANCE_BODY" | jq -r '.success' 2>/dev/null)
MESSAGE=$(echo "$ATTENDANCE_BODY" | jq -r '.message // "N/A"' 2>/dev/null)
DATA_COUNT=$(echo "$ATTENDANCE_BODY" | jq -r '.data | length' 2>/dev/null)

echo -e "${BLUE}Response Summary:${NC}"
echo "  Success: $SUCCESS"
echo "  Message: $MESSAGE"
echo "  Data Items: $DATA_COUNT"
echo ""

# Show first few items in detail
if [ "$DATA_COUNT" != "null" ] && [ "$DATA_COUNT" != "0" ]; then
  echo -e "${CYAN}📋 First Attendance Record (Detailed):${NC}"
  echo "$ATTENDANCE_BODY" | jq '.data[0]' 2>/dev/null || echo "Could not parse first record"
  echo ""
  
  echo -e "${CYAN}📊 All Records Structure:${NC}"
  echo "$ATTENDANCE_BODY" | jq '.data[] | {
    _id,
    employee_id,
    employeeId,
    clockInTime,
    clockOutTime,
    checkInTime,
    checkOutTime,
    status,
    date,
    totalHours,
    notes
  }' 2>/dev/null | head -50
  echo ""
fi

# ============================================================
# STEP 3: Test GET /api/attendance with query parameters
# ============================================================
echo -e "${CYAN}3️⃣  Testing GET /api/attendance with Query Parameters${NC}"
echo "=================================================="

# Test with limit
echo -n "  Testing with limit=5... "
ATTENDANCE_LIMIT_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$API_BASE_URL/api/attendance?limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $USER_TENANT_ID" \
  --max-time 15 2>/dev/null || echo -e "\n000")

ATTENDANCE_LIMIT_HTTP=$(echo "$ATTENDANCE_LIMIT_RESPONSE" | tail -1)
if [ "$ATTENDANCE_LIMIT_HTTP" = "200" ]; then
  LIMIT_COUNT=$(echo "$ATTENDANCE_LIMIT_RESPONSE" | sed '$d' | jq -r '.data | length' 2>/dev/null)
  echo -e "${GREEN}✅${NC} (Returned $LIMIT_COUNT items)"
else
  echo -e "${RED}❌${NC} (HTTP $ATTENDANCE_LIMIT_HTTP)"
fi

# Test with date filter
TODAY=$(date +%Y-%m-%d)
echo -n "  Testing with date=$TODAY... "
ATTENDANCE_DATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$API_BASE_URL/api/attendance?date=$TODAY" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $USER_TENANT_ID" \
  --max-time 15 2>/dev/null || echo -e "\n000")

ATTENDANCE_DATE_HTTP=$(echo "$ATTENDANCE_DATE_RESPONSE" | tail -1)
if [ "$ATTENDANCE_DATE_HTTP" = "200" ]; then
  DATE_COUNT=$(echo "$ATTENDANCE_DATE_RESPONSE" | sed '$d' | jq -r '.data | length' 2>/dev/null)
  echo -e "${GREEN}✅${NC} (Returned $DATE_COUNT items)"
else
  echo -e "${RED}❌${NC} (HTTP $ATTENDANCE_DATE_HTTP)"
fi

# Test with employee filter
echo -n "  Testing with employeeId=$EMPLOYEE_ID... "
ATTENDANCE_EMP_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$API_BASE_URL/api/attendance?employeeId=$EMPLOYEE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $USER_TENANT_ID" \
  --max-time 15 2>/dev/null || echo -e "\n000")

ATTENDANCE_EMP_HTTP=$(echo "$ATTENDANCE_EMP_RESPONSE" | tail -1)
if [ "$ATTENDANCE_EMP_HTTP" = "200" ]; then
  EMP_COUNT=$(echo "$ATTENDANCE_EMP_RESPONSE" | sed '$d' | jq -r '.data | length' 2>/dev/null)
  echo -e "${GREEN}✅${NC} (Returned $EMP_COUNT items)"
else
  echo -e "${RED}❌${NC} (HTTP $ATTENDANCE_EMP_HTTP)"
fi

echo ""

# ============================================================
# STEP 4: Show Full Response (Formatted)
# ============================================================
echo -e "${CYAN}4️⃣  Full API Response (Formatted JSON)${NC}"
echo "=================================================="
echo ""
echo "$ATTENDANCE_BODY" | jq '.' 2>/dev/null || echo "$ATTENDANCE_BODY"
echo ""

# ============================================================
# STEP 5: Response Field Analysis
# ============================================================
echo -e "${CYAN}5️⃣  Response Field Analysis${NC}"
echo "=================================================="

if [ "$DATA_COUNT" != "null" ] && [ "$DATA_COUNT" != "0" ]; then
  echo "Available fields in attendance records:"
  echo "$ATTENDANCE_BODY" | jq -r '.data[0] | keys[]' 2>/dev/null | while read field; do
    VALUE=$(echo "$ATTENDANCE_BODY" | jq -r ".data[0].$field" 2>/dev/null)
    if [ "$VALUE" != "null" ]; then
      echo "  • $field: $VALUE"
    fi
  done
else
  echo "  No attendance records found"
fi

echo ""
echo -e "${GREEN}✅ Test completed!${NC}"
echo ""
