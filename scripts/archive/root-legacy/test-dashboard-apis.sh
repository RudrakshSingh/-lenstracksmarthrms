#!/bin/bash

# Comprehensive Dashboard API Test Script
# Tests all dashboard-related endpoints with both Admin and Employee credentials

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

# Admin credentials
ADMIN_EMAIL="Admin@lenstrack.com"
ADMIN_PASSWORD="Kadarkhan@123"

# Employee credentials
EMP_EMAIL="lenstrack01@gmail.com"
EMP_PASSWORD="cnbxs2b9A1!"

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
    
    # Show response summary if successful
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
      DATA_COUNT=$(echo "$BODY" | jq -r '.data | length' 2>/dev/null || echo "N/A")
      SUCCESS=$(echo "$BODY" | jq -r '.success' 2>/dev/null || echo "N/A")
      if [ "$DATA_COUNT" != "null" ] && [ "$DATA_COUNT" != "N/A" ]; then
        echo "     📊 Data items: $DATA_COUNT"
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
    if [ ${#ERROR_MSG} -gt 60 ]; then
      ERROR_MSG="${ERROR_MSG:0:60}..."
    fi
    echo "     Error: $ERROR_MSG"
    ((FAILED++))
    return 1
  fi
}

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     COMPREHENSIVE DASHBOARD API TEST SUITE              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================
# STEP 1: Admin Login
# ============================================================
echo -e "${CYAN}1️⃣  Admin Login${NC}"
echo "=================================================="
echo -n "  Logging in as Admin... "

ADMIN_LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASSWORD\"}" \
  --max-time 10 2>/dev/null || echo -e "\n000")

ADMIN_LOGIN_HTTP=$(echo "$ADMIN_LOGIN_RESPONSE" | tail -1)
ADMIN_LOGIN_BODY=$(echo "$ADMIN_LOGIN_RESPONSE" | sed '$d')

if [ "$ADMIN_LOGIN_HTTP" = "200" ]; then
  ADMIN_TOKEN=$(echo "$ADMIN_LOGIN_BODY" | jq -r '.data.accessToken // .data.token // .accessToken // .token' 2>/dev/null)
  ADMIN_TENANT_ID=$(echo "$ADMIN_LOGIN_BODY" | jq -r '.data.user.tenantId // .data.user.tenant_id // .user.tenantId // .user.tenant_id // "lenstrack"' 2>/dev/null)
  
  if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${RED}❌${NC} Failed to extract token"
    exit 1
  fi
  
  if [ -z "$ADMIN_TENANT_ID" ] || [ "$ADMIN_TENANT_ID" = "null" ]; then
    ADMIN_TENANT_ID="lenstrack"
  fi
  
  echo -e "${GREEN}✅${NC} (HTTP $ADMIN_LOGIN_HTTP)"
  echo "   Tenant ID: $ADMIN_TENANT_ID"
  echo ""
else
  echo -e "${RED}❌${NC} (HTTP $ADMIN_LOGIN_HTTP)"
  exit 1
fi

ADMIN_HEADERS="Authorization: Bearer $ADMIN_TOKEN
x-tenant-id: $ADMIN_TENANT_ID"

# ============================================================
# STEP 2: Employee Login
# ============================================================
echo -e "${CYAN}2️⃣  Employee Login${NC}"
echo "=================================================="
echo -n "  Logging in as Employee... "

EMP_LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMP_EMAIL\", \"password\": \"$EMP_PASSWORD\"}" \
  --max-time 10 2>/dev/null || echo -e "\n000")

EMP_LOGIN_HTTP=$(echo "$EMP_LOGIN_RESPONSE" | tail -1)
EMP_LOGIN_BODY=$(echo "$EMP_LOGIN_RESPONSE" | sed '$d')

if [ "$EMP_LOGIN_HTTP" = "200" ]; then
  EMP_TOKEN=$(echo "$EMP_LOGIN_BODY" | jq -r '.data.accessToken // .data.token // .accessToken // .token' 2>/dev/null)
  EMP_TENANT_ID=$(echo "$EMP_LOGIN_BODY" | jq -r '.data.user.tenantId // .data.user.tenant_id // .user.tenantId // .user.tenant_id // "default"' 2>/dev/null)
  
  if [ -z "$EMP_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  Failed to extract token${NC}"
    EMP_TOKEN=""
  else
    if [ -z "$EMP_TENANT_ID" ] || [ "$EMP_TENANT_ID" = "null" ]; then
      EMP_TENANT_ID="default"
    fi
    echo -e "${GREEN}✅${NC} (HTTP $EMP_LOGIN_HTTP)"
    echo "   Tenant ID: $EMP_TENANT_ID"
  fi
  echo ""
else
  echo -e "${YELLOW}⚠️  Employee login failed${NC} (HTTP $EMP_LOGIN_HTTP)"
  EMP_TOKEN=""
  echo ""
fi

if [ -n "$EMP_TOKEN" ]; then
  EMP_HEADERS="Authorization: Bearer $EMP_TOKEN
x-tenant-id: $EMP_TENANT_ID"
fi

# ============================================================
# STEP 3: Test Dashboard APIs with Admin
# ============================================================
echo -e "${CYAN}3️⃣  DASHBOARD APIs - Admin Access${NC}"
echo "=================================================="

# Basic Dashboard Endpoints
test_api "GET /api/hr/dashboard" "GET" "$API_BASE_URL/api/hr/dashboard" "$ADMIN_HEADERS" "" "200"
test_api "GET /api/hr/dashboard/overview" "GET" "$API_BASE_URL/api/hr/dashboard/overview" "$ADMIN_HEADERS" "" "200"
test_api "GET /api/hr/dashboard/stats" "GET" "$API_BASE_URL/api/hr/dashboard/stats" "$ADMIN_HEADERS" "" "200"

# Dashboard with query parameters
test_api "GET /api/hr/dashboard?period=monthly" "GET" "$API_BASE_URL/api/hr/dashboard?period=monthly" "$ADMIN_HEADERS" "" "200"
test_api "GET /api/hr/dashboard?period=weekly" "GET" "$API_BASE_URL/api/hr/dashboard?period=weekly" "$ADMIN_HEADERS" "" "200"
test_api "GET /api/hr/dashboard?period=quarterly" "GET" "$API_BASE_URL/api/hr/dashboard?period=quarterly" "$ADMIN_HEADERS" "" "200"

test_api "GET /api/hr/dashboard/overview?period=monthly" "GET" "$API_BASE_URL/api/hr/dashboard/overview?period=monthly" "$ADMIN_HEADERS" "" "200"
test_api "GET /api/hr/dashboard/overview?period=weekly" "GET" "$API_BASE_URL/api/hr/dashboard/overview?period=weekly" "$ADMIN_HEADERS" "" "200"

test_api "GET /api/hr/dashboard/stats?period=monthly" "GET" "$API_BASE_URL/api/hr/dashboard/stats?period=monthly" "$ADMIN_HEADERS" "" "200"
test_api "GET /api/hr/dashboard/stats?period=weekly" "GET" "$API_BASE_URL/api/hr/dashboard/stats?period=weekly" "$ADMIN_HEADERS" "" "200"

# Date range queries
TODAY=$(date +%Y-%m-%d)
LAST_WEEK=$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d "7 days ago" +%Y-%m-%d 2>/dev/null || echo "")
LAST_MONTH=$(date -v-1m +%Y-%m-%d 2>/dev/null || date -d "1 month ago" +%Y-%m-%d 2>/dev/null || echo "")

if [ -n "$LAST_WEEK" ]; then
  test_api "GET /api/hr/dashboard?startDate=$LAST_WEEK&endDate=$TODAY" "GET" "$API_BASE_URL/api/hr/dashboard?startDate=$LAST_WEEK&endDate=$TODAY" "$ADMIN_HEADERS" "" "200"
fi

if [ -n "$LAST_MONTH" ]; then
  test_api "GET /api/hr/dashboard?startDate=$LAST_MONTH&endDate=$TODAY" "GET" "$API_BASE_URL/api/hr/dashboard?startDate=$LAST_MONTH&endDate=$TODAY" "$ADMIN_HEADERS" "" "200"
fi

# ============================================================
# STEP 4: Test Dashboard APIs with Employee
# ============================================================
if [ -n "$EMP_TOKEN" ]; then
  echo ""
  echo -e "${CYAN}4️⃣  DASHBOARD APIs - Employee Access${NC}"
  echo "=================================================="
  
  test_api "GET /api/hr/dashboard (Employee)" "GET" "$API_BASE_URL/api/hr/dashboard" "$EMP_HEADERS" "" "200"
  test_api "GET /api/hr/dashboard/overview (Employee)" "GET" "$API_BASE_URL/api/hr/dashboard/overview" "$EMP_HEADERS" "" "200"
  test_api "GET /api/hr/dashboard/stats (Employee)" "GET" "$API_BASE_URL/api/hr/dashboard/stats" "$EMP_HEADERS" "" "200"
  
  test_api "GET /api/hr/dashboard?period=monthly (Employee)" "GET" "$API_BASE_URL/api/hr/dashboard?period=monthly" "$EMP_HEADERS" "" "200"
  test_api "GET /api/hr/dashboard/overview?period=monthly (Employee)" "GET" "$API_BASE_URL/api/hr/dashboard/overview?period=monthly" "$EMP_HEADERS" "" "200"
fi

# ============================================================
# STEP 5: Test Related Dashboard Endpoints
# ============================================================
echo ""
echo -e "${CYAN}5️⃣  RELATED DASHBOARD ENDPOINTS - Admin${NC}"
echo "=================================================="

# Workforce analytics (often used in dashboards)
test_api "GET /api/hr/workforce" "GET" "$API_BASE_URL/api/hr/workforce" "$ADMIN_HEADERS" "" "200"
test_api "GET /api/hr/workforce?period=monthly" "GET" "$API_BASE_URL/api/hr/workforce?period=monthly" "$ADMIN_HEADERS" "" "200"

# Performance metrics (dashboard component)
test_api "GET /api/hr/performance" "GET" "$API_BASE_URL/api/hr/performance" "$ADMIN_HEADERS" "" "200"

# Attendance stats (dashboard component)
test_api "GET /api/attendance?limit=10" "GET" "$API_BASE_URL/api/attendance?limit=10" "$ADMIN_HEADERS" "" "200"
test_api "GET /api/attendance/history?limit=10" "GET" "$API_BASE_URL/api/attendance/history?limit=10" "$ADMIN_HEADERS" "" "200"

# Employee list (for dashboard filters)
test_api "GET /api/hr/employees?limit=5" "GET" "$API_BASE_URL/api/hr/employees?limit=5" "$ADMIN_HEADERS" "" "200"

# Departments (for dashboard filters)
test_api "GET /api/hr/departments?limit=5" "GET" "$API_BASE_URL/api/hr/departments?limit=5" "$ADMIN_HEADERS" "" "200"

# Stores (for dashboard filters)
test_api "GET /api/hr/stores?limit=5" "GET" "$API_BASE_URL/api/hr/stores?limit=5" "$ADMIN_HEADERS" "" "200"

# ============================================================
# STEP 6: Test Error Cases
# ============================================================
echo ""
echo -e "${CYAN}6️⃣  ERROR HANDLING TESTS${NC}"
echo "=================================================="

# Invalid period
test_api "GET /api/hr/dashboard?period=invalid" "GET" "$API_BASE_URL/api/hr/dashboard?period=invalid" "$ADMIN_HEADERS" "" "200" # Should handle gracefully

# Invalid date format
test_api "GET /api/hr/dashboard?startDate=invalid" "GET" "$API_BASE_URL/api/hr/dashboard?startDate=invalid" "$ADMIN_HEADERS" "" "200" # Should handle gracefully

# Missing authentication
test_api "GET /api/hr/dashboard (No Auth)" "GET" "$API_BASE_URL/api/hr/dashboard" "" "" "401"

# Invalid token
test_api "GET /api/hr/dashboard (Invalid Token)" "GET" "$API_BASE_URL/api/hr/dashboard" "Authorization: Bearer invalid_token
x-tenant-id: $ADMIN_TENANT_ID" "" "401"

# Wrong tenant
test_api "GET /api/hr/dashboard (Wrong Tenant)" "GET" "$API_BASE_URL/api/hr/dashboard" "Authorization: Bearer $ADMIN_TOKEN
x-tenant-id: wrong-tenant" "" "403"

# Summary
echo ""
echo "=================================================="
echo -e "${CYAN}📊 DASHBOARD API TEST SUMMARY${NC}"
echo "=================================================="
echo -e "Total Tests:  ${TOTAL_TESTS}"
echo -e "${GREEN}Passed:       ${PASSED}${NC}"
echo -e "${RED}Failed:       ${FAILED}${NC}"

if [ $FAILED -eq 0 ]; then
  echo ""
  echo -e "${GREEN}🎉 All dashboard API tests passed!${NC}"
  SUCCESS_RATE=100
else
  SUCCESS_RATE=$((PASSED * 100 / TOTAL_TESTS))
  echo ""
  echo -e "Success Rate: ${SUCCESS_RATE}%"
fi

echo ""
echo -e "${BLUE}Tested Endpoints:${NC}"
echo "  • GET /api/hr/dashboard"
echo "  • GET /api/hr/dashboard/overview"
echo "  • GET /api/hr/dashboard/stats"
echo "  • Various query parameters (period, date ranges)"
echo "  • Admin and Employee access"
echo "  • Error handling"
echo ""
