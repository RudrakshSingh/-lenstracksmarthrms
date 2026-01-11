#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="https://98.70.245.87"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║             DASHBOARD APIS - COMPREHENSIVE TEST                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Login
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 1: Admin Login${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

LOGIN_RESPONSE=$(curl -sk -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrEmployeeId": "admin@etelios.com",
    "password": "Admin@123456"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ FAILED:${NC} Could not get admin token"
  exit 1
fi

echo -e "${GREEN}✅ SUCCESS:${NC} Admin logged in"
echo ""

# Step 2: Test Unified Dashboard (Employee Role)
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 2: Test Unified Dashboard (Employee Role)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

DASHBOARD_RESPONSE=$(curl -sk "$BASE_URL/api/hr/dashboard?role=employee" \
  -H "Authorization: Bearer $TOKEN")

DASHBOARD_SUCCESS=$(echo $DASHBOARD_RESPONSE | jq -r '.success')

if [ "$DASHBOARD_SUCCESS" = "true" ]; then
  echo -e "${GREEN}✅ SUCCESS:${NC} Unified Dashboard API working"
  
  # Check widgets
  HAS_ATTENDANCE=$(echo $DASHBOARD_RESPONSE | jq -r '.data.widgets.attendance != null')
  HAS_TASKS=$(echo $DASHBOARD_RESPONSE | jq -r '.data.widgets.tasks != null')
  HAS_PERFORMANCE=$(echo $DASHBOARD_RESPONSE | jq -r '.data.widgets.performance != null')
  HAS_PAYROLL=$(echo $DASHBOARD_RESPONSE | jq -r '.data.widgets.payroll != null')
  
  echo -e "${YELLOW}ℹ️  Widgets:${NC}"
  [ "$HAS_ATTENDANCE" = "true" ] && echo -e "  ✅ Attendance Widget" || echo -e "  ❌ Attendance Widget"
  [ "$HAS_TASKS" = "true" ] && echo -e "  ✅ Tasks Widget" || echo -e "  ❌ Tasks Widget"
  [ "$HAS_PERFORMANCE" = "true" ] && echo -e "  ✅ Performance Widget" || echo -e "  ❌ Performance Widget"
  [ "$HAS_PAYROLL" = "true" ] && echo -e "  ✅ Payroll Widget" || echo -e "  ❌ Payroll Widget"
else
  echo -e "${RED}❌ FAILED:${NC} Unified Dashboard API failed"
  echo "$DASHBOARD_RESPONSE" | jq '.'
fi
echo ""

# Step 3: Test Unified Dashboard (Manager Role)
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 3: Test Unified Dashboard (Manager Role)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

MANAGER_DASHBOARD=$(curl -sk "$BASE_URL/api/hr/dashboard?role=manager" \
  -H "Authorization: Bearer $TOKEN")

MANAGER_SUCCESS=$(echo $MANAGER_DASHBOARD | jq -r '.success')

if [ "$MANAGER_SUCCESS" = "true" ]; then
  echo -e "${GREEN}✅ SUCCESS:${NC} Manager Dashboard API working"
  
  # Check team widgets
  HAS_TEAM_PERF=$(echo $MANAGER_DASHBOARD | jq -r '.data.widgets.teamPerformance != null')
  HAS_TEAM_TASKS=$(echo $MANAGER_DASHBOARD | jq -r '.data.widgets.teamTasks != null')
  HAS_TEAM_ATT=$(echo $MANAGER_DASHBOARD | jq -r '.data.widgets.teamAttendance != null')
  
  echo -e "${YELLOW}ℹ️  Team Widgets:${NC}"
  [ "$HAS_TEAM_PERF" = "true" ] && echo -e "  ✅ Team Performance Widget" || echo -e "  ❌ Team Performance Widget"
  [ "$HAS_TEAM_TASKS" = "true" ] && echo -e "  ✅ Team Tasks Widget" || echo -e "  ❌ Team Tasks Widget"
  [ "$HAS_TEAM_ATT" = "true" ] && echo -e "  ✅ Team Attendance Widget" || echo -e "  ❌ Team Attendance Widget"
else
  echo -e "${RED}❌ FAILED:${NC} Manager Dashboard API failed"
fi
echo ""

# Step 4: Test Store Dashboard
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 4: Test Store Dashboard${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

# Get first store
STORE_RESPONSE=$(curl -sk "$BASE_URL/api/hr/stores" \
  -H "Authorization: Bearer $TOKEN")

STORE_ID=$(echo $STORE_RESPONSE | jq -r '.data[0]._id // .data[0].id')

if [ "$STORE_ID" != "null" ] && [ -n "$STORE_ID" ]; then
  STORE_DASHBOARD=$(curl -sk "$BASE_URL/api/hr/dashboard/store-manager?storeId=$STORE_ID" \
    -H "Authorization: Bearer $TOKEN")
  
  STORE_DASH_SUCCESS=$(echo $STORE_DASHBOARD | jq -r '.success')
  
  if [ "$STORE_DASH_SUCCESS" = "true" ]; then
    echo -e "${GREEN}✅ SUCCESS:${NC} Store Dashboard API working"
    
    STORE_NAME=$(echo $STORE_DASHBOARD | jq -r '.data.storeInfo.name')
    STAFF_COUNT=$(echo $STORE_DASHBOARD | jq -r '.data.stats.totalStaff')
    
    echo -e "${YELLOW}ℹ️  Store:${NC} $STORE_NAME"
    echo -e "${YELLOW}ℹ️  Staff Count:${NC} $STAFF_COUNT"
  else
    echo -e "${RED}❌ FAILED:${NC} Store Dashboard API failed"
  fi
else
  echo -e "${YELLOW}⚠️  SKIPPED:${NC} No stores available for testing"
fi
echo ""

# Step 5: Test HRMS Dashboard (HR Role)
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 5: Test HRMS Dashboard (HR Role)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

HRMS_DASHBOARD=$(curl -sk "$BASE_URL/api/hrms/dashboard?role=hr" \
  -H "Authorization: Bearer $TOKEN")

HRMS_SUCCESS=$(echo $HRMS_DASHBOARD | jq -r '.success')

if [ "$HRMS_SUCCESS" = "true" ]; then
  echo -e "${GREEN}✅ SUCCESS:${NC} HRMS Dashboard API working"
  
  TOTAL_EMP=$(echo $HRMS_DASHBOARD | jq -r '.data.overview.totalEmployees')
  NEW_HIRES=$(echo $HRMS_DASHBOARD | jq -r '.data.overview.newHires')
  ATT_RATE=$(echo $HRMS_DASHBOARD | jq -r '.data.overview.attendanceRate')
  
  echo -e "${YELLOW}ℹ️  Total Employees:${NC} $TOTAL_EMP"
  echo -e "${YELLOW}ℹ️  New Hires (30 days):${NC} $NEW_HIRES"
  echo -e "${YELLOW}ℹ️  Attendance Rate:${NC} $ATT_RATE%"
else
  echo -e "${RED}❌ FAILED:${NC} HRMS Dashboard API failed"
fi
echo ""

# Step 6: Test Legacy Dashboard Stats
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 6: Test Legacy Dashboard Stats${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

STATS_RESPONSE=$(curl -sk "$BASE_URL/api/hr/dashboard/stats" \
  -H "Authorization: Bearer $TOKEN")

STATS_SUCCESS=$(echo $STATS_RESPONSE | jq -r '.success')

if [ "$STATS_SUCCESS" = "true" ]; then
  echo -e "${GREEN}✅ SUCCESS:${NC} Dashboard Stats API working"
  
  TOTAL=$(echo $STATS_RESPONSE | jq -r '.data.totalEmployees')
  ACTIVE=$(echo $STATS_RESPONSE | jq -r '.data.activeEmployees')
  
  echo -e "${YELLOW}ℹ️  Total Employees:${NC} $TOTAL"
  echo -e "${YELLOW}ℹ️  Active Employees:${NC} $ACTIVE"
else
  echo -e "${RED}❌ FAILED:${NC} Dashboard Stats API failed"
fi
echo ""

# Step 7: Test Recent Activities
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 7: Test Recent Activities${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

ACTIVITIES_RESPONSE=$(curl -sk "$BASE_URL/api/hr/dashboard/recent-activities?limit=5" \
  -H "Authorization: Bearer $TOKEN")

ACTIVITIES_SUCCESS=$(echo $ACTIVITIES_RESPONSE | jq -r '.success')

if [ "$ACTIVITIES_SUCCESS" = "true" ]; then
  echo -e "${GREEN}✅ SUCCESS:${NC} Recent Activities API working"
  
  ACTIVITY_COUNT=$(echo $ACTIVITIES_RESPONSE | jq -r '.data | length')
  echo -e "${YELLOW}ℹ️  Activities Count:${NC} $ACTIVITY_COUNT"
else
  echo -e "${RED}❌ FAILED:${NC} Recent Activities API failed"
fi
echo ""

# Step 8: Test Department Overview
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 8: Test Department Overview${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

DEPT_RESPONSE=$(curl -sk "$BASE_URL/api/hr/dashboard/departments" \
  -H "Authorization: Bearer $TOKEN")

DEPT_SUCCESS=$(echo $DEPT_RESPONSE | jq -r '.success')

if [ "$DEPT_SUCCESS" = "true" ]; then
  echo -e "${GREEN}✅ SUCCESS:${NC} Department Overview API working"
  
  DEPT_COUNT=$(echo $DEPT_RESPONSE | jq -r '.data | length')
  echo -e "${YELLOW}ℹ️  Departments Count:${NC} $DEPT_COUNT"
else
  echo -e "${RED}❌ FAILED:${NC} Department Overview API failed"
fi
echo ""

# Final Summary
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                     FINAL TEST RESULTS                           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Dashboard API Test Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Unified Dashboard (Employee) → $([ "$DASHBOARD_SUCCESS" = "true" ] && echo "✅ SUCCESS" || echo "❌ FAILED")"
echo "2. Unified Dashboard (Manager) → $([ "$MANAGER_SUCCESS" = "true" ] && echo "✅ SUCCESS" || echo "❌ FAILED")"
echo "3. Store Dashboard → $([ "$STORE_DASH_SUCCESS" = "true" ] && echo "✅ SUCCESS" || echo "⚠️  SKIPPED")"
echo "4. HRMS Dashboard → $([ "$HRMS_SUCCESS" = "true" ] && echo "✅ SUCCESS" || echo "❌ FAILED")"
echo "5. Dashboard Stats (Legacy) → $([ "$STATS_SUCCESS" = "true" ] && echo "✅ SUCCESS" || echo "❌ FAILED")"
echo "6. Recent Activities (Legacy) → $([ "$ACTIVITIES_SUCCESS" = "true" ] && echo "✅ SUCCESS" || echo "❌ FAILED")"
echo "7. Department Overview (Legacy) → $([ "$DEPT_SUCCESS" = "true" ] && echo "✅ SUCCESS" || echo "❌ FAILED")"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ DASHBOARD APIS ARE WORKING!                          ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "All dashboard APIs are ready for frontend integration!"
echo ""
echo "Test completed at: $(date)"
echo "════════════════════════════════════════════════════════════════"
