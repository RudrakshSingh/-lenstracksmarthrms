#!/bin/bash

BASE_URL="https://98.70.245.87"

# Login
TOKEN=$(curl -sk -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"emailOrEmployeeId":"admin@etelios.com","password":"Admin@123456"}' \
  | jq -r '.data.accessToken')

echo "Testing HR API filtering..."
echo ""

# Test 1: Search with employeeId
echo "Test 1: GET /api/hr/employees?employeeId=ADMIN-001"
RESPONSE1=$(curl -sk "$BASE_URL/api/hr/employees?employeeId=ADMIN-001" \
  -H "Authorization: Bearer $TOKEN")

COUNT1=$(echo "$RESPONSE1" | jq -r '.data | length')
FIRST_EMP=$(echo "$RESPONSE1" | jq -r '.data[0].employeeId')

echo "  Result: Found $COUNT1 employees"
echo "  First employee: $FIRST_EMP"
echo ""

if [ "$COUNT1" = "1" ] && [ "$FIRST_EMP" = "ADMIN-001" ]; then
  echo "✅ PASS: Filtering works correctly"
else
  echo "❌ FAIL: Should return only 1 employee with employeeId=ADMIN-001"
  echo "  But returned $COUNT1 employees"
  echo ""
  echo "All employeeIds returned:"
  echo "$RESPONSE1" | jq -r '.data[].employeeId'
fi
