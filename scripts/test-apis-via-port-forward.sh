#!/bin/bash

# Test APIs via Port-Forward (if ALB not accessible)

set -e

echo "🚀 Testing APIs via Port-Forward"
echo "====================================="
echo ""

# Start port-forwards in background
echo "📡 Setting up port-forwards..."
kubectl port-forward -n etelios-prod svc/auth-service 3001:3001 > /dev/null 2>&1 &
AUTH_PF=$!

kubectl port-forward -n etelios-prod svc/hr-service 3002:3002 > /dev/null 2>&1 &
HR_PF=$!

kubectl port-forward -n etelios-prod svc/attendance-service 3003:3003 > /dev/null 2>&1 &
ATTENDANCE_PF=$!

sleep 3

echo "✅ Port-forwards established"
echo ""

# Cleanup function
cleanup() {
  echo ""
  echo "🧹 Cleaning up port-forwards..."
  kill $AUTH_PF $HR_PF $ATTENDANCE_PF 2>/dev/null || true
  echo "✅ Cleanup complete"
}

trap cleanup EXIT

# Test functions
test_api() {
  local name=$1
  local method=$2
  local url=$3
  local data=$4
  local token=$5
  local tenant=$6

  if [ -n "$token" ]; then
    if [ -n "$data" ]; then
      response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -H "x-tenant-id: $tenant" \
        -d "$data" 2>&1)
    else
      response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -H "x-tenant-id: $tenant" 2>&1)
    fi
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" 2>&1)
  fi

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo "✅ $name (Status: $http_code)"
    return 0
  else
    echo "❌ $name (Status: $http_code)"
    echo "$body" | jq -r '.message // .error // "Unknown error"' 2>/dev/null || echo "$body" | head -1
    return 1
  fi
}

# Test results
PASSED=0
FAILED=0

echo "📋 AUTH SERVICE TESTS"
echo "====================================="
echo ""

# 1. Admin Login
echo "1️⃣  Admin Login..."
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lenstrack.com","password":"AdminPass123!"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // empty' 2>/dev/null)

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  echo "✅ Admin Login (Token obtained)"
  PASSED=$((PASSED + 1))
else
  echo "❌ Admin Login Failed"
  echo "$LOGIN_RESPONSE" | jq -r '.message // .error' 2>/dev/null || echo "$LOGIN_RESPONSE"
  FAILED=$((FAILED + 1))
  exit 1
fi

sleep 1

# 2. Health Check
test_api "2. Auth Health Check" "GET" "http://localhost:3001/health" && PASSED=$((PASSED + 1)) || FAILED=$((FAILED + 1))
sleep 1

echo ""
echo "📋 HR SERVICE TESTS"
echo "====================================="
echo ""

# 3. Get Stores
test_api "3. Get Stores" "GET" "http://localhost:3002/api/hr/stores" "" "$TOKEN" "lenstrack" && PASSED=$((PASSED + 1)) || FAILED=$((FAILED + 1))
sleep 1

# 4. Get Departments
test_api "4. Get Departments" "GET" "http://localhost:3002/api/hr/departments" "" "$TOKEN" "lenstrack" && PASSED=$((PASSED + 1)) || FAILED=$((FAILED + 1))
sleep 1

# 5. Get Employees
test_api "5. Get Employees" "GET" "http://localhost:3002/api/hr/employees" "" "$TOKEN" "lenstrack" && PASSED=$((PASSED + 1)) || FAILED=$((FAILED + 1))
sleep 1

# 6. Dashboard
test_api "6. Get Dashboard" "GET" "http://localhost:3002/api/hr/dashboard" "" "$TOKEN" "lenstrack" && PASSED=$((PASSED + 1)) || FAILED=$((FAILED + 1))
sleep 1

# 7. Time Tracking
test_api "7. Get Time Tracking" "GET" "http://localhost:3002/api/hr/time-tracking?date=2026-02-28" "" "$TOKEN" "lenstrack" && PASSED=$((PASSED + 1)) || FAILED=$((FAILED + 1))
sleep 1

# 8. Roster
test_api "8. Get Roster" "GET" "http://localhost:3002/api/hr/roster" "" "$TOKEN" "lenstrack" && PASSED=$((PASSED + 1)) || FAILED=$((FAILED + 1))
sleep 1

echo ""
echo "📋 ATTENDANCE SERVICE TESTS"
echo "====================================="
echo ""

# 9. Today's Attendance
test_api "9. Get Today's Attendance" "GET" "http://localhost:3003/api/attendance/today?employeeId=EMP-2026-969954&date=2026-02-28" "" "$TOKEN" "lenstrack" && PASSED=$((PASSED + 1)) || FAILED=$((FAILED + 1))
sleep 1

# 10. Attendance Summary
test_api "10. Get Attendance Summary" "GET" "http://localhost:3003/api/attendance/summary?startDate=2026-02-01&endDate=2026-02-28" "" "$TOKEN" "lenstrack" && PASSED=$((PASSED + 1)) || FAILED=$((FAILED + 1))

echo ""
echo "====================================="
echo "📊 TEST SUMMARY"
echo "====================================="
echo ""
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo "📈 Success Rate: $(( (PASSED * 100) / (PASSED + FAILED) ))%"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 All tests passed!"
  exit 0
else
  echo "⚠️  Some tests failed"
  exit 1
fi
