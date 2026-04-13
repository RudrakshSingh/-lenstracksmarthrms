#!/bin/bash

# Clock Out Script for Employee
# Logs in and performs clock-out operation

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

# Employee credentials
EMPLOYEE_EMAIL="lenstrack01@gmail.com"
EMPLOYEE_PASSWORD="cnbxs2b9A1!"
TENANT_ID="lenstrack"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     EMPLOYEE CLOCK-OUT SCRIPT                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Backend URL:${NC} $API_BASE_URL"
echo -e "${CYAN}Employee:${NC} $EMPLOYEE_EMAIL"
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
    \"email\": \"$EMPLOYEE_EMAIL\",
    \"password\": \"$EMPLOYEE_PASSWORD\"
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
  echo "Response: $BODY"
  exit 1
fi

if [ -z "$USER_TENANT_ID" ] || [ "$USER_TENANT_ID" = "null" ]; then
  USER_TENANT_ID="$TENANT_ID"
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo "   User: $USER_NAME"
echo "   Employee ID: $EMPLOYEE_ID"
echo "   User ID: $USER_ID"
echo "   Tenant ID: $USER_TENANT_ID"
echo ""

# ============================================================
# STEP 2: Check if clocked in, if not, clock in first
# ============================================================
echo -e "${CYAN}2️⃣  Checking attendance status...${NC}"
echo "=================================================="

# Get current location (Mumbai coordinates as default)
LATITUDE="19.0760"
LONGITUDE="72.8777"
NOTES="Automated clock-out via script"

# Try to clock out first
CLOCK_OUT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_BASE_URL/api/attendance/check-out" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $USER_TENANT_ID" \
  -d "{
    \"latitude\": $LATITUDE,
    \"longitude\": $LONGITUDE,
    \"notes\": \"$NOTES\"
  }" \
  --max-time 15 2>/dev/null || echo -e "\n000")

CLOCK_OUT_HTTP=$(echo "$CLOCK_OUT_RESPONSE" | tail -1)
CLOCK_OUT_BODY=$(echo "$CLOCK_OUT_RESPONSE" | sed '$d')

# If not clocked in, clock in first
if [ "$CLOCK_OUT_HTTP" = "400" ]; then
  ERROR_MSG=$(echo "$CLOCK_OUT_BODY" | jq -r '.error // .message // ""' 2>/dev/null)
  
  if [[ "$ERROR_MSG" == *"No open clock-in"* ]] || [[ "$ERROR_MSG" == *"clock in first"* ]] || [[ "$ERROR_MSG" == *"not clocked in"* ]]; then
    echo -e "${YELLOW}ℹ️  Not currently clocked in. Clocking in first...${NC}"
    echo ""
    
    # Clock in
    CLOCK_IN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
      "$API_BASE_URL/api/attendance/check-in" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -H "x-tenant-id: $USER_TENANT_ID" \
      -d "{
        \"latitude\": $LATITUDE,
        \"longitude\": $LONGITUDE,
        \"notes\": \"Auto clock-in before clock-out\"
      }" \
      --max-time 15 2>/dev/null || echo -e "\n000")
    
    CLOCK_IN_HTTP=$(echo "$CLOCK_IN_RESPONSE" | tail -1)
    CLOCK_IN_BODY=$(echo "$CLOCK_IN_RESPONSE" | sed '$d')
    
    if [ "$CLOCK_IN_HTTP" = "200" ] || [ "$CLOCK_IN_HTTP" = "201" ]; then
      echo -e "${GREEN}✅ Clock-in successful${NC} (HTTP $CLOCK_IN_HTTP)"
      CLOCK_IN_TIME=$(echo "$CLOCK_IN_BODY" | jq -r '.data.clockInTime // .data.checkInTime // .clockInTime // .checkInTime // "N/A"' 2>/dev/null)
      if [ "$CLOCK_IN_TIME" != "null" ] && [ "$CLOCK_IN_TIME" != "N/A" ]; then
        echo "   Clock-in Time: $CLOCK_IN_TIME"
      fi
      echo ""
      echo -e "${CYAN}3️⃣  Now clocking out...${NC}"
      echo "=================================================="
      
      # Now try clock out again
      CLOCK_OUT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        "$API_BASE_URL/api/attendance/check-out" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -H "x-tenant-id: $USER_TENANT_ID" \
        -d "{
          \"latitude\": $LATITUDE,
          \"longitude\": $LONGITUDE,
          \"notes\": \"$NOTES\"
        }" \
        --max-time 15 2>/dev/null || echo -e "\n000")
      
      CLOCK_OUT_HTTP=$(echo "$CLOCK_OUT_RESPONSE" | tail -1)
      CLOCK_OUT_BODY=$(echo "$CLOCK_OUT_RESPONSE" | sed '$d')
    elif [ "$CLOCK_IN_HTTP" = "400" ]; then
      CLOCK_IN_ERROR=$(echo "$CLOCK_IN_BODY" | jq -r '.error // .message // "Unknown error"' 2>/dev/null)
      if [[ "$CLOCK_IN_ERROR" == *"already clocked in"* ]] || [[ "$CLOCK_IN_ERROR" == *"already clocked-in"* ]]; then
        echo -e "${YELLOW}ℹ️  Already clocked in. Proceeding to clock out...${NC}"
        echo ""
        echo -e "${CYAN}3️⃣  Clocking out...${NC}"
        echo "=================================================="
        
        # Try clock out again
        CLOCK_OUT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
          "$API_BASE_URL/api/attendance/check-out" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $TOKEN" \
          -H "x-tenant-id: $USER_TENANT_ID" \
          -d "{
            \"latitude\": $LATITUDE,
            \"longitude\": $LONGITUDE,
            \"notes\": \"$NOTES\"
          }" \
          --max-time 15 2>/dev/null || echo -e "\n000")
        
        CLOCK_OUT_HTTP=$(echo "$CLOCK_OUT_RESPONSE" | tail -1)
        CLOCK_OUT_BODY=$(echo "$CLOCK_OUT_RESPONSE" | sed '$d')
      else
        echo -e "${RED}❌ Clock-in failed${NC} (HTTP $CLOCK_IN_HTTP)"
        echo "   Error: $CLOCK_IN_ERROR"
        exit 1
      fi
    else
      echo -e "${RED}❌ Clock-in failed${NC} (HTTP $CLOCK_IN_HTTP)"
      echo "Response: $CLOCK_IN_BODY"
      exit 1
    fi
  fi
fi

# ============================================================
# STEP 3: Process Clock Out Result
# ============================================================

CLOCK_OUT_HTTP=$(echo "$CLOCK_OUT_RESPONSE" | tail -1)
CLOCK_OUT_BODY=$(echo "$CLOCK_OUT_RESPONSE" | sed '$d')

if [ "$CLOCK_OUT_HTTP" = "200" ] || [ "$CLOCK_OUT_HTTP" = "201" ]; then
  echo -e "${GREEN}✅ Clock-out successful${NC} (HTTP $CLOCK_OUT_HTTP)"
  
  # Extract and display clock-out details
  CLOCK_OUT_TIME=$(echo "$CLOCK_OUT_BODY" | jq -r '.data.clockOutTime // .data.checkOutTime // .clockOutTime // .checkOutTime // "N/A"' 2>/dev/null)
  ATTENDANCE_ID=$(echo "$CLOCK_OUT_BODY" | jq -r '.data._id // .data.id // ._id // .id // "N/A"' 2>/dev/null)
  MESSAGE=$(echo "$CLOCK_OUT_BODY" | jq -r '.message // "Clock-out completed"' 2>/dev/null)
  
  echo "   Message: $MESSAGE"
  if [ "$CLOCK_OUT_TIME" != "null" ] && [ "$CLOCK_OUT_TIME" != "N/A" ]; then
    echo "   Clock-out Time: $CLOCK_OUT_TIME"
  fi
  if [ "$ATTENDANCE_ID" != "null" ] && [ "$ATTENDANCE_ID" != "N/A" ]; then
    echo "   Attendance ID: $ATTENDANCE_ID"
  fi
  echo ""
  echo -e "${GREEN}🎉 Clock-out completed successfully!${NC}"
elif [ "$CLOCK_OUT_HTTP" = "400" ]; then
  ERROR_MSG=$(echo "$CLOCK_OUT_BODY" | jq -r '.error // .message // "Unknown error"' 2>/dev/null)
  
  echo -e "${YELLOW}⚠️  Clock-out failed${NC} (HTTP $CLOCK_OUT_HTTP)"
  echo "   Error: $ERROR_MSG"
  
  # Check if already clocked out
  if [[ "$ERROR_MSG" == *"already clocked out"* ]] || [[ "$ERROR_MSG" == *"already clocked-out"* ]]; then
    echo ""
    echo -e "${YELLOW}ℹ️  You are already clocked out.${NC}"
  else
    echo ""
    echo -e "${RED}❌ Unexpected error during clock-out${NC}"
    echo "   Full Response:"
    echo "$CLOCK_OUT_BODY" | jq '.' 2>/dev/null || echo "$CLOCK_OUT_BODY"
    exit 1
  fi
else
  echo -e "${RED}❌ Clock-out failed${NC} (HTTP $CLOCK_OUT_HTTP)"
  echo "Response: $CLOCK_OUT_BODY"
  exit 1
fi

echo ""
echo -e "${BLUE}Script completed.${NC}"
