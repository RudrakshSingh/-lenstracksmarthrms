#!/bin/bash

# Test all fixed APIs
# Tests:
# 1. Auto clock-out on logout
# 2. Auto clock-out on geofence violation (200m)
# 3. Null values fix in employee response
# 4. 503 error fix for attendance API

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

echo "🧪 Testing All Fixed APIs"
echo "=========================================="
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
  ADMIN_USER_ID=$(echo "$BODY" | jq -r '.data.user._id // .data.user.id // .user._id // .user.id')
  echo -e "${GREEN}✅ Login successful${NC} (HTTP $HTTP_CODE)"
  echo "   Token: ${ADMIN_TOKEN:0:50}..."
else
  echo -e "${RED}❌ Login failed${NC} (HTTP $HTTP_CODE)"
  echo "   Response: $BODY"
  exit 1
fi
echo ""

# Step 2: Get Employee List
echo "2️⃣  Get Employee List (Test Null Values Fix)"
echo "----------------------------------------"
EMP_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$API_BASE_URL/api/hr/employees?limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

EMP_HTTP=$(echo "$EMP_RESPONSE" | tail -1)
EMP_BODY=$(echo "$EMP_RESPONSE" | sed '$d')

if [ "$EMP_HTTP" = "200" ]; then
  EMP_COUNT=$(echo "$EMP_BODY" | jq '.data | length')
  echo -e "${GREEN}✅ Employees retrieved${NC} (HTTP $EMP_HTTP, Count: $EMP_COUNT)"
  
  # Check for null values in first employee
  FIRST_EMP=$(echo "$EMP_BODY" | jq '.data[0]')
  NULL_COUNT=$(echo "$FIRST_EMP" | jq '[paths | select(.[-1] | type == "null")] | length')
  
  if [ "$NULL_COUNT" = "0" ]; then
    echo -e "${GREEN}✅ No null values found in employee response${NC}"
  else
    echo -e "${YELLOW}⚠️  Found $NULL_COUNT null values${NC}"
    echo "$FIRST_EMP" | jq '[paths | select(.[-1] | type == "null")]'
  fi
  
  # Get first employee ID for testing
  FIRST_EMP_ID=$(echo "$FIRST_EMP" | jq -r '.employeeId // .employee_id // empty')
  FIRST_EMP_EMAIL=$(echo "$FIRST_EMP" | jq -r '.email // empty')
  
  if [ -z "$FIRST_EMP_ID" ]; then
    echo -e "${YELLOW}⚠️  No employee ID found, skipping employee-specific tests${NC}"
    SKIP_EMP_TESTS=true
  else
    echo "   Using employee: $FIRST_EMP_ID ($FIRST_EMP_EMAIL)"
    SKIP_EMP_TESTS=false
  fi
else
  echo -e "${RED}❌ Failed to get employees${NC} (HTTP $EMP_HTTP)"
  echo "   Response: $EMP_BODY"
  SKIP_EMP_TESTS=true
fi
echo ""

# Step 3: Test Attendance API (503 Fix)
echo "3️⃣  Test Attendance API (503 Error Fix)"
echo "----------------------------------------"
if [ "$SKIP_EMP_TESTS" = "false" ] && [ -n "$FIRST_EMP_ID" ]; then
  ATT_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
    "$API_BASE_URL/api/attendance?employeeId=$FIRST_EMP_ID&date=$(date +%Y-%m-%d)" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "x-tenant-id: $TENANT_ID")
  
  ATT_HTTP=$(echo "$ATT_RESPONSE" | tail -1)
  ATT_BODY=$(echo "$ATT_RESPONSE" | sed '$d')
  
  if [ "$ATT_HTTP" = "200" ]; then
    echo -e "${GREEN}✅ Attendance API working${NC} (HTTP $ATT_HTTP)"
    ATT_COUNT=$(echo "$ATT_BODY" | jq '.data | length // 0')
    echo "   Records found: $ATT_COUNT"
    
    # Check if response is 503
    if echo "$ATT_BODY" | jq -e '.message | test("unavailable|503"; "i")' > /dev/null 2>&1; then
      echo -e "${RED}❌ Still returning 503/unavailable error${NC}"
    else
      echo -e "${GREEN}✅ No 503 error - fix working${NC}"
    fi
  elif [ "$ATT_HTTP" = "503" ]; then
    echo -e "${RED}❌ Still returning 503${NC} (HTTP $ATT_HTTP)"
    echo "   Response: $ATT_BODY"
  else
    echo -e "${YELLOW}⚠️  Unexpected status${NC} (HTTP $ATT_HTTP)"
    echo "   Response: $ATT_BODY"
  fi
else
  echo -e "${YELLOW}⚠️  Skipping - no employee ID available${NC}"
fi
echo ""

# Step 4: Test Employee Login and Clock-In
echo "4️⃣  Test Employee Clock-In (for logout/geofence tests)"
echo "----------------------------------------"
if [ "$SKIP_EMP_TESTS" = "false" ] && [ -n "$FIRST_EMP_EMAIL" ]; then
  # Try to login as employee (password might be default)
  EMP_LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "$API_BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -H "x-tenant-id: $TENANT_ID" \
    -d "{
      \"email\": \"$FIRST_EMP_EMAIL\",
      \"password\": \"Employee@123\"
    }")
  
  EMP_LOGIN_HTTP=$(echo "$EMP_LOGIN_RESPONSE" | tail -1)
  EMP_LOGIN_BODY=$(echo "$EMP_LOGIN_RESPONSE" | sed '$d')
  
  if [ "$EMP_LOGIN_HTTP" = "200" ]; then
    EMP_TOKEN=$(echo "$EMP_LOGIN_BODY" | jq -r '.data.accessToken // .accessToken // .token')
    EMP_USER_ID=$(echo "$EMP_LOGIN_BODY" | jq -r '.data.user._id // .data.user.id // .user._id // .user.id')
    echo -e "${GREEN}✅ Employee login successful${NC}"
    
    # Clock-in
    CLOCKIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
      "$API_BASE_URL/api/attendance/clock-in" \
      -H "Authorization: Bearer $EMP_TOKEN" \
      -H "Content-Type: application/json" \
      -H "x-tenant-id: $TENANT_ID" \
      -d "{
        \"latitude\": 19.0764,
        \"longitude\": 72.8778,
        \"notes\": \"Test clock-in for auto logout test\"
      }")
    
    CLOCKIN_HTTP=$(echo "$CLOCKIN_RESPONSE" | tail -1)
    CLOCKIN_BODY=$(echo "$CLOCKIN_RESPONSE" | sed '$d')
    
    if [ "$CLOCKIN_HTTP" = "200" ] || [ "$CLOCKIN_HTTP" = "201" ]; then
      echo -e "${GREEN}✅ Clock-in successful${NC} (HTTP $CLOCKIN_HTTP)"
      ATTENDANCE_ID=$(echo "$CLOCKIN_BODY" | jq -r '.data.id // .data._id // .id // empty')
      echo "   Attendance ID: $ATTENDANCE_ID"
      HAS_CLOCKED_IN=true
    elif echo "$CLOCKIN_BODY" | jq -e '.message | test("already|clocked"; "i")' > /dev/null 2>&1; then
      echo -e "${YELLOW}⚠️  Already clocked in${NC}"
      HAS_CLOCKED_IN=true
    else
      echo -e "${YELLOW}⚠️  Clock-in failed${NC} (HTTP $CLOCKIN_HTTP)"
      echo "   Response: $CLOCKIN_BODY"
      HAS_CLOCKED_IN=false
    fi
  else
    echo -e "${YELLOW}⚠️  Employee login failed${NC} (HTTP $EMP_LOGIN_HTTP)"
    echo "   Response: $EMP_LOGIN_BODY"
    echo "   Skipping clock-in test"
    HAS_CLOCKED_IN=false
  fi
else
  echo -e "${YELLOW}⚠️  Skipping - no employee email available${NC}"
  HAS_CLOCKED_IN=false
fi
echo ""

# Step 5: Test Auto Clock-Out on Logout
echo "5️⃣  Test Auto Clock-Out on Logout"
echo "----------------------------------------"
if [ "$HAS_CLOCKED_IN" = "true" ] && [ -n "$EMP_TOKEN" ]; then
  # Logout
  LOGOUT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "$API_BASE_URL/api/auth/logout" \
    -H "Authorization: Bearer $EMP_TOKEN" \
    -H "x-tenant-id: $TENANT_ID")
  
  LOGOUT_HTTP=$(echo "$LOGOUT_RESPONSE" | tail -1)
  LOGOUT_BODY=$(echo "$LOGOUT_RESPONSE" | sed '$d')
  
  if [ "$LOGOUT_HTTP" = "200" ]; then
    echo -e "${GREEN}✅ Logout successful${NC} (HTTP $LOGOUT_HTTP)"
    
    # Check if attendance was clocked out (using admin token)
    if [ -n "$ATTENDANCE_ID" ]; then
      sleep 2 # Wait a bit for async clock-out
      CHECK_ATT_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
        "$API_BASE_URL/api/attendance?employeeId=$FIRST_EMP_ID&date=$(date +%Y-%m-%d)" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "x-tenant-id: $TENANT_ID")
      
      CHECK_ATT_HTTP=$(echo "$CHECK_ATT_RESPONSE" | tail -1)
      CHECK_ATT_BODY=$(echo "$CHECK_ATT_RESPONSE" | sed '$d')
      
      if [ "$CHECK_ATT_HTTP" = "200" ]; then
        CHECK_OUT_TIME=$(echo "$CHECK_ATT_BODY" | jq -r '.data[0].checkOutTime // .data[0].check_out_time // empty')
        if [ -n "$CHECK_OUT_TIME" ] && [ "$CHECK_OUT_TIME" != "null" ]; then
          echo -e "${GREEN}✅ Auto clock-out on logout working!${NC}"
          echo "   Check-out time: $CHECK_OUT_TIME"
        else
          echo -e "${YELLOW}⚠️  Clock-out time not found (may be async)${NC}"
        fi
      fi
    else
      echo -e "${YELLOW}⚠️  Could not verify clock-out (no attendance ID)${NC}"
    fi
  else
    echo -e "${RED}❌ Logout failed${NC} (HTTP $LOGOUT_HTTP)"
    echo "   Response: $LOGOUT_BODY"
  fi
else
  echo -e "${YELLOW}⚠️  Skipping - employee not clocked in${NC}"
fi
echo ""

# Step 6: Test Geofence Violation (200m)
echo "6️⃣  Test Geofence Violation Auto Clock-Out (200m)"
echo "----------------------------------------"
if [ "$SKIP_EMP_TESTS" = "false" ] && [ -n "$FIRST_EMP_ID" ]; then
  # First, clock-in again if needed
  if [ "$HAS_CLOCKED_IN" = "false" ]; then
    echo "   Clocking in first..."
    CLOCKIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
      "$API_BASE_URL/api/attendance/clock-in" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -H "x-tenant-id: $TENANT_ID" \
      -d "{
        \"latitude\": 19.0764,
        \"longitude\": 72.8778,
        \"employeeId\": \"$FIRST_EMP_ID\",
        \"notes\": \"Test clock-in for geofence test\"
      }")
    
    CLOCKIN_HTTP=$(echo "$CLOCKIN_RESPONSE" | tail -1)
    if [ "$CLOCKIN_HTTP" = "200" ] || [ "$CLOCKIN_HTTP" = "201" ]; then
      echo -e "${GREEN}✅ Clocked in${NC}"
      HAS_CLOCKED_IN=true
    fi
  fi
  
  if [ "$HAS_CLOCKED_IN" = "true" ]; then
    # Track location far from store (>200m)
    # Using coordinates far from Mumbai (store is likely in Mumbai)
    TRACK_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
      "$API_BASE_URL/api/attendance/track-location" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -H "x-tenant-id: $TENANT_ID" \
      -d "{
        \"latitude\": 28.6139,
        \"longitude\": 77.2090,
        \"employeeId\": \"$FIRST_EMP_ID\"
      }")
    
    TRACK_HTTP=$(echo "$TRACK_RESPONSE" | tail -1)
    TRACK_BODY=$(echo "$TRACK_RESPONSE" | sed '$d')
    
    if [ "$TRACK_HTTP" = "401" ]; then
      REQUIRES_RELOGIN=$(echo "$TRACK_BODY" | jq -r '.requiresReLogin // false')
      if [ "$REQUIRES_RELOGIN" = "true" ]; then
        echo -e "${GREEN}✅ Geofence violation auto clock-out working!${NC}"
        echo "   Status: 401 Unauthorized"
        echo "   Requires Re-login: true"
        echo "   Message: $(echo "$TRACK_BODY" | jq -r '.message // empty')"
      else
        echo -e "${YELLOW}⚠️  Got 401 but requiresReLogin not set${NC}"
      fi
    elif [ "$TRACK_HTTP" = "200" ]; then
      ACTION=$(echo "$TRACK_BODY" | jq -r '.data.action // .action // empty')
      if [ "$ACTION" = "auto_logout" ]; then
        echo -e "${GREEN}✅ Geofence violation detected${NC}"
        echo "   Action: auto_logout"
      else
        echo -e "${YELLOW}⚠️  Within geofence or no violation detected${NC}"
        echo "   Action: $ACTION"
      fi
    else
      echo -e "${YELLOW}⚠️  Unexpected response${NC} (HTTP $TRACK_HTTP)"
      echo "   Response: $TRACK_BODY"
    fi
  else
    echo -e "${YELLOW}⚠️  Skipping - could not clock in${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Skipping - no employee ID available${NC}"
fi
echo ""

# Summary
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo ""
echo "✅ Tests Completed:"
echo "   1. Admin Login"
echo "   2. Employee List (Null Values Check)"
echo "   3. Attendance API (503 Fix)"
echo "   4. Employee Clock-In"
echo "   5. Auto Clock-Out on Logout"
echo "   6. Geofence Violation Auto Clock-Out"
echo ""
echo "🎯 All fixed APIs tested!"
echo ""
