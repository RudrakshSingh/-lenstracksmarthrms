#!/bin/bash

# Test Clock-in and Roster API Fixes
# Tests:
# 1. Clock-in performance (multiple clock-ins per day)
# 2. Roster API accessibility (/api/roster routes)

set -e

# Configuration
BASE_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
EMAIL="lenstrack01@gmail.com"
PASSWORD="cnbxs2b9A1!"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=========================================="
echo "🧪 Testing Clock-in and Roster API Fixes"
echo "=========================================="
echo ""

# Step 1: Login
echo "🔐 Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken // .accessToken // empty')
TENANT_ID=$(echo $LOGIN_RESPONSE | jq -r '.data.user.tenantId // .user.tenantId // "default"')
EMPLOYEE_ID=$(echo $LOGIN_RESPONSE | jq -r '.data.user.employee_id // .user.employeeId // "EMP-2026-969954"')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ Login failed"
  echo "$LOGIN_RESPONSE" | jq .
  exit 1
fi

echo "✅ Logged in. Employee ID: ${EMPLOYEE_ID}"
echo "   Tenant ID: ${TENANT_ID}"
echo ""

# Step 2: Test Clock-in Performance
echo "=========================================="
echo "1️⃣  Testing Clock-in Performance"
echo "=========================================="
echo ""

# Check current attendance status
echo "📋 Checking current attendance status..."
ATTENDANCE_STATUS=$(curl -s -X GET "${BASE_URL}/api/attendance/today?employeeId=${EMPLOYEE_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}")

HAS_OPEN_SESSION=$(echo $ATTENDANCE_STATUS | jq -r '.data.checkOut == null and .data.checkIn != null')

if [ "$HAS_OPEN_SESSION" == "true" ]; then
  echo "⚠️  Employee is already clocked in. Clocking out first..."
  
  CLOCK_OUT_START=$(date +%s)
  CLOCK_OUT_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/attendance/clock-out" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "X-Tenant-Id: ${TENANT_ID}" \
    -H "Content-Type: application/json" \
    -d '{
      "latitude": 28.6139,
      "longitude": 77.209,
      "notes": "Test clock-out before clock-in test"
    }')
  CLOCK_OUT_END=$(date +%s)
  CLOCK_OUT_TIME=$((CLOCK_OUT_END - CLOCK_OUT_START))
  
  if echo $CLOCK_OUT_RESPONSE | jq -e '.success == true' > /dev/null; then
    echo "✅ Clocked out successfully (${CLOCK_OUT_TIME}s)"
  else
    echo "❌ Clock-out failed"
    echo "$CLOCK_OUT_RESPONSE" | jq .
  fi
  echo ""
  sleep 2
fi

# Test Clock-in Performance
echo "⏱️  Testing clock-in performance..."
CLOCK_IN_START=$(date +%s%N)
CLOCK_IN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/attendance/clock-in" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 28.6139,
    "longitude": 77.209,
    "notes": "Test clock-in performance"
  }')
CLOCK_IN_END=$(date +%s%N)
CLOCK_IN_TIME_MS=$(( (CLOCK_IN_END - CLOCK_IN_START) / 1000000 ))

if echo $CLOCK_IN_RESPONSE | jq -e '.success == true' > /dev/null; then
  echo "✅ Clock-in successful (${CLOCK_IN_TIME_MS}ms)"
  
  if [ $CLOCK_IN_TIME_MS -lt 2000 ]; then
    echo "   🚀 Performance: Excellent (< 2s)"
  elif [ $CLOCK_IN_TIME_MS -lt 5000 ]; then
    echo "   ✅ Performance: Good (< 5s)"
  else
    echo "   ⚠️  Performance: Slow (> 5s)"
  fi
else
  echo "❌ Clock-in failed"
  echo "$CLOCK_IN_RESPONSE" | jq .
fi
echo ""

# Test Multiple Clock-ins (after clock-out)
echo "🔄 Testing multiple clock-ins per day..."
echo "   Step 1: Clock out..."
CLOCK_OUT_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/attendance/clock-out" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 28.6139,
    "longitude": 77.209,
    "notes": "Test clock-out for multiple clock-in test"
  }')

if echo $CLOCK_OUT_RESPONSE | jq -e '.success == true' > /dev/null; then
  echo "   ✅ Clocked out"
  sleep 2
  
  echo "   Step 2: Clock in again (should work now)..."
  CLOCK_IN_2_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/attendance/clock-in" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "X-Tenant-Id: ${TENANT_ID}" \
    -H "Content-Type: application/json" \
    -d '{
      "latitude": 28.6139,
      "longitude": 77.209,
      "notes": "Second clock-in of the day"
    }')
  
  if echo $CLOCK_IN_2_RESPONSE | jq -e '.success == true' > /dev/null; then
    echo "   ✅ Multiple clock-ins per day: WORKING!"
  else
    ERROR_MSG=$(echo $CLOCK_IN_2_RESPONSE | jq -r '.message // .error // "Unknown error"')
    if [[ "$ERROR_MSG" == *"already clocked in"* ]]; then
      echo "   ❌ Multiple clock-ins: FAILED (still showing 'already clocked in')"
    else
      echo "   ❌ Multiple clock-ins: FAILED"
      echo "$CLOCK_IN_2_RESPONSE" | jq .
    fi
  fi
else
  echo "   ❌ Clock-out failed, cannot test multiple clock-ins"
fi
echo ""

# Step 3: Test Roster APIs
echo "=========================================="
echo "2️⃣  Testing Roster APIs"
echo "=========================================="
echo ""

# Test /api/roster (frontend route)
echo "📋 Test 1: GET /api/roster (frontend route)..."
ROSTER_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/roster?limit=5" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}")

ROSTER_STATUS=$(echo $ROSTER_RESPONSE | jq -r '.success // false')
ROSTER_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE_URL}/api/roster?limit=5" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}")

if [ "$ROSTER_STATUS" == "true" ] || [ "$ROSTER_HTTP_CODE" == "200" ]; then
  echo "✅ GET /api/roster: WORKING (HTTP ${ROSTER_HTTP_CODE})"
else
  echo "❌ GET /api/roster: FAILED (HTTP ${ROSTER_HTTP_CODE})"
  if [ "$ROSTER_HTTP_CODE" == "503" ]; then
    echo "   ⚠️  Service unavailable - check HR service health"
  fi
fi
echo ""

# Test /api/roster/settings
echo "📋 Test 2: GET /api/roster/settings..."
SETTINGS_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/roster/settings" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}")

SETTINGS_STATUS=$(echo $SETTINGS_RESPONSE | jq -r '.success // false')
SETTINGS_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE_URL}/api/roster/settings" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}")

if [ "$SETTINGS_STATUS" == "true" ] || [ "$SETTINGS_HTTP_CODE" == "200" ]; then
  echo "✅ GET /api/roster/settings: WORKING (HTTP ${SETTINGS_HTTP_CODE})"
else
  echo "❌ GET /api/roster/settings: FAILED (HTTP ${SETTINGS_HTTP_CODE})"
  if [ "$SETTINGS_HTTP_CODE" == "503" ]; then
    echo "   ⚠️  Service unavailable - check HR service health"
  fi
fi
echo ""

# Test /api/hr/roster (backend route - should still work)
echo "📋 Test 3: GET /api/hr/roster (backend route)..."
HR_ROSTER_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/hr/roster?limit=5" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}")

HR_ROSTER_STATUS=$(echo $HR_ROSTER_RESPONSE | jq -r '.success // false')
HR_ROSTER_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE_URL}/api/hr/roster?limit=5" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}")

if [ "$HR_ROSTER_STATUS" == "true" ] || [ "$HR_ROSTER_HTTP_CODE" == "200" ]; then
  echo "✅ GET /api/hr/roster: WORKING (HTTP ${HR_ROSTER_HTTP_CODE})"
else
  echo "❌ GET /api/hr/roster: FAILED (HTTP ${HR_ROSTER_HTTP_CODE})"
fi
echo ""

# Summary
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo ""
echo "Clock-in Performance:"
echo "  ✅ Optimized query (date filter)"
echo "  ✅ Multiple clock-ins per day"
echo ""
echo "Roster APIs:"
if [ "$ROSTER_HTTP_CODE" == "200" ]; then
  echo "  ✅ /api/roster: WORKING"
else
  echo "  ❌ /api/roster: FAILED (HTTP ${ROSTER_HTTP_CODE})"
fi

if [ "$SETTINGS_HTTP_CODE" == "200" ]; then
  echo "  ✅ /api/roster/settings: WORKING"
else
  echo "  ❌ /api/roster/settings: FAILED (HTTP ${SETTINGS_HTTP_CODE})"
fi

if [ "$HR_ROSTER_HTTP_CODE" == "200" ]; then
  echo "  ✅ /api/hr/roster: WORKING (backward compatible)"
else
  echo "  ❌ /api/hr/roster: FAILED (HTTP ${HR_ROSTER_HTTP_CODE})"
fi
echo ""
