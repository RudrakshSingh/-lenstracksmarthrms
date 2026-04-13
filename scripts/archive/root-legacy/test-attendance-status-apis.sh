#!/bin/bash

# Test Attendance Status APIs - Critical for Frontend Clock-Out
# Tests all status-related endpoints that frontend uses

set +e  # Don't exit on error

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# API Configuration
API_BASE_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

# Employee credentials
EMP_EMAIL="lenstrack01@gmail.com"
EMP_PASSWORD="cnbxs2b9A1!"
TENANT_ID="lenstrack"

# Counters
TOTAL_TESTS=0
PASSED=0
FAILED=0

# Test function
test_api() {
  local name="$1"
  local method="$2"
  local url="$3"
  local headers="$4"
  local data="$5"
  local expected_status="${6:-200}"
  
  ((TOTAL_TESTS++))
  
  echo -n "  Testing $name... "
  
  if [ -n "$data" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X "$method" \
      "$url" \
      -H "$headers" \
      -H "Content-Type: application/json" \
      -d "$data" \
      --max-time 15 2>/dev/null || echo -e "\n000")
  else
    RESPONSE=$(curl -s -w "\n%{http_code}" -X "$method" \
      "$url" \
      -H "$headers" \
      --max-time 15 2>/dev/null || echo -e "\n000")
  fi
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" = "$expected_status" ]; then
    echo -e "${GREEN}✅${NC} (HTTP $HTTP_CODE)"
    
    # Show key response data
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
      SUCCESS=$(echo "$BODY" | jq -r '.success' 2>/dev/null)
      MESSAGE=$(echo "$BODY" | jq -r '.message // "N/A"' 2>/dev/null)
      DATA=$(echo "$BODY" | jq -r '.data' 2>/dev/null)
      
      if [ "$DATA" != "null" ] && [ -n "$DATA" ]; then
        echo "     Message: $MESSAGE"
        # Show relevant fields for status endpoints
        STATUS=$(echo "$BODY" | jq -r '.data.status // .data.clockedIn // .data.isClockedIn // "N/A"' 2>/dev/null)
        if [ "$STATUS" != "null" ] && [ "$STATUS" != "N/A" ]; then
          echo "     Status: $STATUS"
        fi
      fi
    fi
    
    ((PASSED++))
    return 0
  elif [ "$HTTP_CODE" = "000" ]; then
    echo -e "${RED}❌${NC} (Connection Failed)"
    ((FAILED++))
    return 1
  else
    echo -e "${RED}❌${NC} (HTTP $HTTP_CODE)"
    ERROR_MSG=$(echo "$BODY" | jq -r '.message // .error // "Unknown error"' 2>/dev/null || echo "Unknown error")
    if [ ${#ERROR_MSG} -gt 70 ]; then
      ERROR_MSG="${ERROR_MSG:0:70}..."
    fi
    echo "     Error: $ERROR_MSG"
    ((FAILED++))
    return 1
  fi
}

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     ATTENDANCE STATUS APIs TEST (Frontend Clock-Out)     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================
# STEP 1: Employee Login
# ============================================================
echo -e "${CYAN}1️⃣  Employee Login${NC}"
echo "=================================================="
echo -n "  Logging in... "

LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "{\"email\": \"$EMP_EMAIL\", \"password\": \"$EMP_PASSWORD\"}" \
  --max-time 10 2>/dev/null || echo -e "\n000")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -1)
BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo -e "${RED}❌${NC} (HTTP $HTTP_CODE)"
  exit 1
fi

TOKEN=$(echo "$BODY" | jq -r '.data.accessToken // .data.token // .accessToken // .token' 2>/dev/null)
EMP_EMPLOYEE_ID=$(echo "$BODY" | jq -r '.data.user.employee_id // .data.user.employeeId // .user.employee_id // .user.employeeId' 2>/dev/null)
EMP_TENANT_ID=$(echo "$BODY" | jq -r '.data.user.tenantId // .data.user.tenant_id // .user.tenantId // .user.tenant_id // "default"' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌${NC} Failed to extract token"
  exit 1
fi

if [ -z "$EMP_TENANT_ID" ] || [ "$EMP_TENANT_ID" = "null" ]; then
  EMP_TENANT_ID="default"
fi

echo -e "${GREEN}✅${NC} (HTTP $HTTP_CODE)"
echo "   Employee ID: $EMP_EMPLOYEE_ID"
echo "   Tenant ID: $EMP_TENANT_ID"
echo ""

HEADERS="Authorization: Bearer $TOKEN
x-tenant-id: $EMP_TENANT_ID"

TODAY=$(date +%Y-%m-%d)

# ============================================================
# STEP 2: Test Status/Status Check APIs (CRITICAL FOR CLOCK-OUT)
# ============================================================
echo -e "${CYAN}2️⃣  STATUS CHECK APIs (Frontend uses these before clock-out)${NC}"
echo "=================================================="

# Test /api/attendance/today (most important for frontend)
test_api "GET /api/attendance/today" "GET" "$API_BASE_URL/api/attendance/today" "$HEADERS" "" "200"

# Test with date parameter
test_api "GET /api/attendance/today?date=$TODAY" "GET" "$API_BASE_URL/api/attendance/today?date=$TODAY" "$HEADERS" "" "200"

# Test with employeeId
if [ -n "$EMP_EMPLOYEE_ID" ]; then
  test_api "GET /api/attendance/today?employeeId=$EMP_EMPLOYEE_ID" "GET" "$API_BASE_URL/api/attendance/today?employeeId=$EMP_EMPLOYEE_ID" "$HEADERS" "" "200"
fi

# Test /api/attendance/status (if exists)
test_api "GET /api/attendance/status" "GET" "$API_BASE_URL/api/attendance/status" "$HEADERS" "" "200"

# Test /api/attendance/current (if exists)
test_api "GET /api/attendance/current" "GET" "$API_BASE_URL/api/attendance/current" "$HEADERS" "" "200"

# Test /api/attendance/check-status (if exists)
test_api "GET /api/attendance/check-status" "GET" "$API_BASE_URL/api/attendance/check-status" "$HEADERS" "" "200"

echo ""

# ============================================================
# STEP 3: Test Clock-Out Endpoint
# ============================================================
echo -e "${CYAN}3️⃣  CLOCK-OUT API (The actual clock-out endpoint)${NC}"
echo "=================================================="

# First check if clocked in
echo -n "  Checking current attendance status... "
STATUS_RESPONSE=$(curl -s -X GET \
  "$API_BASE_URL/api/attendance/today" \
  -H "$HEADERS" \
  --max-time 10 2>/dev/null)

HAS_CHECK_IN=$(echo "$STATUS_RESPONSE" | jq -r '.data.checkIn // .data.check_in_time // empty' 2>/dev/null)
HAS_CHECK_OUT=$(echo "$STATUS_RESPONSE" | jq -r '.data.checkOut // .data.check_out_time // empty' 2>/dev/null)

if [ -n "$HAS_CHECK_IN" ] && [ "$HAS_CHECK_IN" != "null" ] && [ -z "$HAS_CHECK_OUT" ] || [ "$HAS_CHECK_OUT" = "null" ]; then
  echo -e "${GREEN}✅ Clocked in${NC}"
  echo ""
  
  # Try clock-out
  test_api "POST /api/attendance/check-out" "POST" "$API_BASE_URL/api/attendance/check-out" "$HEADERS" "{\"latitude\": 19.0760, \"longitude\": 72.8777, \"notes\": \"Test clock-out from status API test\"}" "200"
  
  # Also test clock-out alias
  test_api "POST /api/attendance/clock-out" "POST" "$API_BASE_URL/api/attendance/clock-out" "$HEADERS" "{\"latitude\": 19.0760, \"longitude\": 72.8777, \"notes\": \"Test clock-out alias\"}" "200"
else
  echo -e "${YELLOW}⚠️  Not clocked in${NC}"
  echo "   (Will test clock-in first, then clock-out)"
  echo ""
  
  # Clock in first
  test_api "POST /api/attendance/check-in" "POST" "$API_BASE_URL/api/attendance/check-in" "$HEADERS" "{\"latitude\": 19.0760, \"longitude\": 72.8777, \"notes\": \"Auto clock-in for test\"}" "201"
  
  sleep 2
  
  # Then clock out
  test_api "POST /api/attendance/check-out" "POST" "$API_BASE_URL/api/attendance/check-out" "$HEADERS" "{\"latitude\": 19.0760, \"longitude\": 72.8777, \"notes\": \"Test clock-out\"}" "200"
fi

echo ""

# ============================================================
# STEP 4: Test Other Status-Related Endpoints
# ============================================================
echo -e "${CYAN}4️⃣  OTHER STATUS ENDPOINTS${NC}"
echo "=================================================="

# Test attendance history (shows status)
test_api "GET /api/attendance/history?limit=5" "GET" "$API_BASE_URL/api/attendance/history?limit=5" "$HEADERS" "" "200"

# Test attendance with date filter
test_api "GET /api/attendance?date=$TODAY&limit=1" "GET" "$API_BASE_URL/api/attendance?date=$TODAY&limit=1" "$HEADERS" "" "200"

# Test attendance summary
test_api "GET /api/attendance/summary?startDate=$TODAY&endDate=$TODAY" "GET" "$API_BASE_URL/api/attendance/summary?startDate=$TODAY&endDate=$TODAY" "$HEADERS" "" "200"

echo ""

# ============================================================
# STEP 5: Detailed Response Analysis
# ============================================================
echo -e "${CYAN}5️⃣  DETAILED STATUS RESPONSE ANALYSIS${NC}"
echo "=================================================="

echo -n "  Analyzing /api/attendance/today response... "
TODAY_RESPONSE=$(curl -s -X GET \
  "$API_BASE_URL/api/attendance/today" \
  -H "$HEADERS" \
  --max-time 10 2>/dev/null)

SUCCESS=$(echo "$TODAY_RESPONSE" | jq -r '.success' 2>/dev/null)
MESSAGE=$(echo "$TODAY_RESPONSE" | jq -r '.message' 2>/dev/null)
DATA=$(echo "$TODAY_RESPONSE" | jq -r '.data' 2>/dev/null)

if [ "$SUCCESS" = "true" ]; then
  echo -e "${GREEN}✅${NC}"
  echo ""
  echo "  Response Structure:"
  echo "    Success: $SUCCESS"
  echo "    Message: $MESSAGE"
  
  if [ "$DATA" != "null" ] && [ -n "$DATA" ]; then
    echo "    Data: Present"
    echo ""
    echo "  Key Fields:"
    
    EMP_ID=$(echo "$TODAY_RESPONSE" | jq -r '.data.employeeId // .data.employee_id' 2>/dev/null)
    STATUS=$(echo "$TODAY_RESPONSE" | jq -r '.data.status' 2>/dev/null)
    CHECK_IN=$(echo "$TODAY_RESPONSE" | jq -r '.data.checkIn.time // .data.check_in_time // .data.checkIn' 2>/dev/null)
    CHECK_OUT=$(echo "$TODAY_RESPONSE" | jq -r '.data.checkOut.time // .data.check_out_time // .data.checkOut' 2>/dev/null)
    DATE=$(echo "$TODAY_RESPONSE" | jq -r '.data.date' 2>/dev/null)
    
    if [ -n "$EMP_ID" ] && [ "$EMP_ID" != "null" ]; then
      echo "    Employee ID: $EMP_ID"
    fi
    if [ -n "$STATUS" ] && [ "$STATUS" != "null" ]; then
      echo "    Status: $STATUS"
    fi
    if [ -n "$DATE" ] && [ "$DATE" != "null" ]; then
      echo "    Date: $DATE"
    fi
    if [ -n "$CHECK_IN" ] && [ "$CHECK_IN" != "null" ]; then
      echo "    Check-In: $CHECK_IN"
    else
      echo "    Check-In: Not clocked in"
    fi
    if [ -n "$CHECK_OUT" ] && [ "$CHECK_OUT" != "null" ]; then
      echo "    Check-Out: $CHECK_OUT"
    else
      echo "    Check-Out: Not clocked out"
    fi
  else
    echo "    Data: null (No attendance for today)"
    echo ""
    echo "  ⚠️  This means employee is NOT clocked in"
    echo "     Frontend should show 'Clock In' button, not 'Clock Out'"
  fi
else
  echo -e "${RED}❌${NC}"
  echo "  Error: $MESSAGE"
fi

echo ""

# Summary
echo "=================================================="
echo -e "${CYAN}📊 TEST SUMMARY${NC}"
echo "=================================================="
echo -e "Total Tests:  ${TOTAL_TESTS}"
echo -e "${GREEN}Passed:       ${PASSED}${NC}"
echo -e "${RED}Failed:       ${FAILED}${NC}"

if [ $FAILED -eq 0 ]; then
  echo ""
  echo -e "${GREEN}🎉 All status APIs working!${NC}"
  SUCCESS_RATE=100
else
  SUCCESS_RATE=$((PASSED * 100 / TOTAL_TESTS))
  echo ""
  echo -e "Success Rate: ${SUCCESS_RATE}%"
fi

echo ""
echo -e "${BLUE}Critical Endpoints for Frontend Clock-Out:${NC}"
echo "  ✅ GET /api/attendance/today - Status check (MOST IMPORTANT)"
echo "  ✅ POST /api/attendance/check-out - Clock-out endpoint"
echo "  ✅ POST /api/attendance/clock-out - Clock-out alias"
echo ""
