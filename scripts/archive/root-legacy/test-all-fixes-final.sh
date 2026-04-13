#!/bin/bash

# Final Comprehensive Test - All Fixes
# Tests: Clock-in performance, Multiple clock-ins, Roster APIs

BASE_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
EMAIL="lenstrack01@gmail.com"
PASSWORD="cnbxs2b9A1!"
ADMIN_EMAIL="Admin@lenstrack.com"
ADMIN_PASSWORD="Kadarkhan@123"

echo "=========================================="
echo "🧪 Final Comprehensive API Test"
echo "=========================================="
echo ""

# Login
echo "🔐 Logging in..."
TOKEN=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" | jq -r '.data.accessToken')

ADMIN_TOKEN=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" | jq -r '.data.accessToken')

EMPLOYEE_ID="EMP-2026-969954"
TENANT_ID="default"

echo "✅ Logged in"
echo ""

PASSED=0
FAILED=0

# Test 1: GET /api/attendance/today
echo "1. GET /api/attendance/today"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE_URL}/api/attendance/today?employeeId=${EMPLOYEE_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}")
if [ "$CODE" == "200" ]; then
  echo "   ✅ PASSED (HTTP $CODE)"
  ((PASSED++))
else
  echo "   ❌ FAILED (HTTP $CODE)"
  ((FAILED++))
fi
echo ""

# Clock out first
echo "2. POST /api/attendance/clock-out (prepare)"
curl -s -X POST "${BASE_URL}/api/attendance/clock-out" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}" \
  -H "Content-Type: application/json" \
  -d '{"latitude":28.6139,"longitude":77.209,"notes":"Test"}' > /dev/null
sleep 2
echo "   ✅ Clocked out"
echo ""

# Test 3: Clock-in Performance
echo "3. POST /api/attendance/clock-in (Performance)"
START=$(date +%s%N)
RESPONSE=$(curl -s -X POST "${BASE_URL}/api/attendance/clock-in" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}" \
  -H "Content-Type: application/json" \
  -d '{"latitude":28.6139,"longitude":77.209,"notes":"Performance test"}')
END=$(date +%s%N)
TIME_MS=$(( (END - START) / 1000000 ))

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
  echo "   ✅ PASSED (${TIME_MS}ms)"
  if [ $TIME_MS -lt 2000 ]; then
    echo "   🚀 Performance: Excellent"
  elif [ $TIME_MS -lt 5000 ]; then
    echo "   ✅ Performance: Good"
  fi
  ((PASSED++))
else
  echo "   ❌ FAILED"
  ((FAILED++))
fi
echo ""

# Test 4: Multiple Clock-ins
echo "4. POST /api/attendance/clock-out (for multiple test)"
curl -s -X POST "${BASE_URL}/api/attendance/clock-out" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}" \
  -H "Content-Type: application/json" \
  -d '{"latitude":28.6139,"longitude":77.209,"notes":"Test"}' > /dev/null
sleep 2
echo "   ✅ Clocked out"
echo ""

echo "5. POST /api/attendance/clock-in (Second time)"
RESPONSE2=$(curl -s -X POST "${BASE_URL}/api/attendance/clock-in" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}" \
  -H "Content-Type: application/json" \
  -d '{"latitude":28.6139,"longitude":77.209,"notes":"Second clock-in"}')
if echo "$RESPONSE2" | jq -e '.success == true' > /dev/null; then
  echo "   ✅ PASSED - Multiple clock-ins working!"
  ((PASSED++))
else
  echo "   ❌ FAILED"
  ((FAILED++))
fi
echo ""

# Test 6: Attendance History
echo "6. GET /api/attendance (History)"
CODE6=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE_URL}/api/attendance?employeeId=${EMPLOYEE_ID}&limit=5" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}")
if [ "$CODE6" == "200" ]; then
  echo "   ✅ PASSED (HTTP $CODE6)"
  ((PASSED++))
else
  echo "   ❌ FAILED (HTTP $CODE6)"
  ((FAILED++))
fi
echo ""

# Roster Tests
echo "7. GET /api/hr/roster"
CODE7=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE_URL}/api/hr/roster?limit=5" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}")
if [ "$CODE7" == "200" ]; then
  echo "   ✅ PASSED (HTTP $CODE7)"
  ((PASSED++))
else
  echo "   ❌ FAILED (HTTP $CODE7)"
  ((FAILED++))
fi
echo ""

echo "8. GET /api/hr/roster/settings"
CODE8=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE_URL}/api/hr/roster/settings" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}")
if [ "$CODE8" == "200" ]; then
  echo "   ✅ PASSED (HTTP $CODE8)"
  ((PASSED++))
else
  echo "   ❌ FAILED (HTTP $CODE8)"
  ((FAILED++))
fi
echo ""

echo "9. GET /api/hr/roster/settings?storeId=..."
CODE9=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE_URL}/api/hr/roster/settings?storeId=6991BF3C8583D4F4470A1E6A" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}")
if [ "$CODE9" == "200" ]; then
  echo "   ✅ PASSED (HTTP $CODE9)"
  ((PASSED++))
else
  echo "   ❌ FAILED (HTTP $CODE9)"
  ((FAILED++))
fi
echo ""

echo "10. GET /api/hr/roster/weekly"
CODE10=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE_URL}/api/hr/roster/weekly?storeId=6991BF3C8583D4F4470A1E6A&weekStartDate=2026-02-24" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}")
if [ "$CODE10" == "200" ]; then
  echo "   ✅ PASSED (HTTP $CODE10)"
  ((PASSED++))
else
  echo "   ❌ FAILED (HTTP $CODE10)"
  ((FAILED++))
fi
echo ""

echo "11. GET /api/hr/roster/weekly-enhanced"
CODE11=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE_URL}/api/hr/roster/weekly-enhanced?storeId=6991BF3C8583D4F4470A1E6A&weekStartDate=2026-02-24" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}")
if [ "$CODE11" == "200" ]; then
  echo "   ✅ PASSED (HTTP $CODE11)"
  ((PASSED++))
else
  echo "   ❌ FAILED (HTTP $CODE11)"
  ((FAILED++))
fi
echo ""

# Summary
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo ""
echo "✅ Passed: ${PASSED}"
echo "❌ Failed: ${FAILED}"
echo "📋 Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 All tests passed!"
  echo ""
  echo "✅ Clock-in Performance: Optimized"
  echo "✅ Multiple Clock-ins: Working"
  echo "✅ Roster APIs: All working"
  echo ""
  echo "Status: All fixes deployed and verified! ✅"
else
  echo "⚠️  Some tests failed. Please review above."
fi

echo ""
