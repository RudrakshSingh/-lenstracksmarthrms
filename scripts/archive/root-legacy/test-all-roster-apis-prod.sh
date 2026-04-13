#!/bin/bash

# Comprehensive Roster API Test on Production
# Tests all roster endpoints according to frontend contract documentation

BASE_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
TENANT_ID="default"

echo "=========================================="
echo "🧪 Roster API Production Test Suite"
echo "=========================================="
echo ""

# Login as Admin
echo "🔐 Logging in as Admin..."
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"Admin@lenstrack.com","password":"Kadarkhan@123"}' | jq -r '.data.accessToken')

if [ "$ADMIN_TOKEN" == "null" ] || [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Admin login failed"
  exit 1
fi

echo "✅ Admin logged in"
echo ""

# Test counters
PASSED=0
FAILED=0
SKIPPED=0

# Function to print test result
print_result() {
  local test_name=$1
  local status=$2
  local details=$3
  
  if [ "$status" == "PASS" ]; then
    echo "✅ $test_name"
    ((PASSED++))
  elif [ "$status" == "FAIL" ]; then
    echo "❌ $test_name"
    if [ -n "$details" ]; then
      echo "   $details"
    fi
    ((FAILED++))
  else
    echo "⏭️  $test_name (Skipped)"
    ((SKIPPED++))
  fi
}

# Test 1: GET /api/hr/roster (List)
echo "📋 Test 1: GET /api/hr/roster (List)"
echo "----------------------------------------"
RESPONSE=$(curl -s -X GET "$BASE_URL/api/hr/roster?startDate=2026-02-20&endDate=2026-02-25&limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Tenant-Id: $TENANT_ID")

SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
HAS_DATA=$(echo "$RESPONSE" | jq -r '.data.data != null // false')
TOTAL=$(echo "$RESPONSE" | jq -r '.data.total // 0')

if [ "$SUCCESS" == "true" ]; then
  print_result "GET /api/hr/roster" "PASS" "Total entries: $TOTAL, Has data array: $HAS_DATA"
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error // .message // "Unknown error"')
  print_result "GET /api/hr/roster" "FAIL" "Error: $ERROR"
fi
echo ""

# Test 2: GET /api/hr/roster with filters
echo "📋 Test 2: GET /api/hr/roster (with employeeId filter)"
echo "----------------------------------------"
RESPONSE=$(curl -s -X GET "$BASE_URL/api/hr/roster?employeeId=EMP-2026-969954&startDate=2026-02-20&endDate=2026-02-25" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Tenant-Id: $TENANT_ID")

SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
TOTAL=$(echo "$RESPONSE" | jq -r '.data.total // 0')

if [ "$SUCCESS" == "true" ]; then
  print_result "GET /api/hr/roster (filtered)" "PASS" "Total entries: $TOTAL"
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error // .message // "Unknown error"')
  print_result "GET /api/hr/roster (filtered)" "FAIL" "Error: $ERROR"
fi
echo ""

# Test 3: POST /api/hr/roster (Create) - Validation Test
echo "📋 Test 3: POST /api/hr/roster (Validation - Missing Fields)"
echo "----------------------------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/hr/roster" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Tenant-Id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"EMP-2026-969954"}')

SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
ERROR=$(echo "$RESPONSE" | jq -r '.error // .message // "Unknown error"')

if [ "$SUCCESS" == "false" ] && [[ "$ERROR" == *"Missing required fields"* ]]; then
  print_result "POST /api/hr/roster (validation)" "PASS" "Correctly rejects missing fields"
else
  print_result "POST /api/hr/roster (validation)" "FAIL" "Expected validation error, got: $ERROR"
fi
echo ""

# Test 4: POST /api/hr/roster (Create) - Full Request
echo "📋 Test 4: POST /api/hr/roster (Create - Full Request)"
echo "----------------------------------------"
# First, get a valid store ID
STORE_RESPONSE=$(curl -s -X GET "$BASE_URL/api/hr/stores?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Tenant-Id: $TENANT_ID")

STORE_CODE=$(echo "$STORE_RESPONSE" | jq -r '.data[0].code // .data.data[0].code // "STORE-001"')

RESPONSE=$(curl -s -X POST "$BASE_URL/api/hr/roster" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Tenant-Id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d "{\"employeeId\":\"EMP-2026-969954\",\"storeId\":\"$STORE_CODE\",\"date\":\"2026-02-25\",\"shift\":\"MORNING\",\"shiftStart\":\"09:00\",\"shiftEnd\":\"18:00\"}")

SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
HAS_DATA=$(echo "$RESPONSE" | jq -r '.data != null // false')
ROSTER_ID=$(echo "$RESPONSE" | jq -r '.data.id // .data._id // null')

if [ "$SUCCESS" == "true" ] && [ "$HAS_DATA" == "true" ]; then
  print_result "POST /api/hr/roster (create)" "PASS" "Roster created with ID: $ROSTER_ID"
  CREATED_ROSTER_ID=$ROSTER_ID
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error // .message // "Unknown error"')
  print_result "POST /api/hr/roster (create)" "FAIL" "Error: $ERROR"
  CREATED_ROSTER_ID=""
fi
echo ""

# Test 5: PUT /api/hr/roster/:id (Update)
echo "📋 Test 5: PUT /api/hr/roster/:id (Update)"
echo "----------------------------------------"
if [ -n "$CREATED_ROSTER_ID" ]; then
  RESPONSE=$(curl -s -X PUT "$BASE_URL/api/hr/roster/$CREATED_ROSTER_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "X-Tenant-Id: $TENANT_ID" \
    -H "Content-Type: application/json" \
    -d '{"shift":"EVENING","shiftStart":"14:00","shiftEnd":"22:00"}')
  
  SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
  UPDATED_SHIFT=$(echo "$RESPONSE" | jq -r '.data.shift // null')
  
  if [ "$SUCCESS" == "true" ] && [ "$UPDATED_SHIFT" == "EVENING" ]; then
    print_result "PUT /api/hr/roster/:id" "PASS" "Roster updated, shift: $UPDATED_SHIFT"
  else
    ERROR=$(echo "$RESPONSE" | jq -r '.error // .message // "Unknown error"')
    print_result "PUT /api/hr/roster/:id" "FAIL" "Error: $ERROR"
  fi
else
  print_result "PUT /api/hr/roster/:id" "SKIP" "No roster ID available (create failed)"
fi
echo ""

# Test 6: DELETE /api/hr/roster/:id
echo "📋 Test 6: DELETE /api/hr/roster/:id"
echo "----------------------------------------"
if [ -n "$CREATED_ROSTER_ID" ]; then
  RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/hr/roster/$CREATED_ROSTER_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "X-Tenant-Id: $TENANT_ID")
  
  SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
  MESSAGE=$(echo "$RESPONSE" | jq -r '.message // ""')
  
  if [ "$SUCCESS" == "true" ]; then
    print_result "DELETE /api/hr/roster/:id" "PASS" "$MESSAGE"
  else
    ERROR=$(echo "$RESPONSE" | jq -r '.error // .message // "Unknown error"')
    print_result "DELETE /api/hr/roster/:id" "FAIL" "Error: $ERROR"
  fi
else
  print_result "DELETE /api/hr/roster/:id" "SKIP" "No roster ID available (create failed)"
fi
echo ""

# Test 7: GET /api/hr/roster/settings
echo "📋 Test 7: GET /api/hr/roster/settings"
echo "----------------------------------------"
RESPONSE=$(curl -s -X GET "$BASE_URL/api/hr/roster/settings" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Tenant-Id: $TENANT_ID")

SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
IS_ARRAY=$(echo "$RESPONSE" | jq -r '.data | type == "array" // false')
SETTINGS_COUNT=$(echo "$RESPONSE" | jq -r '.data | length // 0')

if [ "$SUCCESS" == "true" ]; then
  print_result "GET /api/hr/roster/settings" "PASS" "Is array: $IS_ARRAY, Count: $SETTINGS_COUNT"
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error // .message // "Unknown error"')
  print_result "GET /api/hr/roster/settings" "FAIL" "Error: $ERROR"
fi
echo ""

# Test 8: GET /api/hr/roster/settings?storeId=...
echo "📋 Test 8: GET /api/hr/roster/settings (with storeId filter)"
echo "----------------------------------------"
RESPONSE=$(curl -s -X GET "$BASE_URL/api/hr/roster/settings?storeId=$STORE_CODE" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Tenant-Id: $TENANT_ID")

SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
IS_ARRAY=$(echo "$RESPONSE" | jq -r '.data | type == "array" // false')

if [ "$SUCCESS" == "true" ]; then
  print_result "GET /api/hr/roster/settings (filtered)" "PASS" "Is array: $IS_ARRAY"
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error // .message // "Unknown error"')
  print_result "GET /api/hr/roster/settings (filtered)" "FAIL" "Error: $ERROR"
fi
echo ""

# Test 9: POST /api/hr/roster/settings (Validation - Missing storeId)
echo "📋 Test 9: POST /api/hr/roster/settings (Validation - Missing storeId)"
echo "----------------------------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/hr/roster/settings" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Tenant-Id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"minimumRequired":5,"maximumAllowed":10}')

SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
ERROR=$(echo "$RESPONSE" | jq -r '.error // .message // "Unknown error"')

if [ "$SUCCESS" == "false" ] && [[ "$ERROR" == *"storeId"* ]] && [[ "$ERROR" == *"required"* ]]; then
  print_result "POST /api/hr/roster/settings (validation)" "PASS" "Correctly rejects missing storeId"
else
  print_result "POST /api/hr/roster/settings (validation)" "FAIL" "Expected validation error, got: $ERROR"
fi
echo ""

# Test 10: POST /api/hr/roster/settings (Validation - minimumRequired < 1)
echo "📋 Test 10: POST /api/hr/roster/settings (Validation - minimumRequired < 1)"
echo "----------------------------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/hr/roster/settings" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Tenant-Id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d "{\"storeId\":\"$STORE_CODE\",\"minimumRequired\":0,\"maximumAllowed\":10}")

SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
ERROR=$(echo "$RESPONSE" | jq -r '.error // .message // "Unknown error"')

if [ "$SUCCESS" == "false" ] && ([[ "$ERROR" == *"minimumRequired"* ]] || [[ "$ERROR" == *"must be"* ]] || [[ "$ERROR" == *">= 1"* ]]); then
  print_result "POST /api/hr/roster/settings (validation minRequired)" "PASS" "Correctly rejects minimumRequired < 1"
else
  print_result "POST /api/hr/roster/settings (validation minRequired)" "FAIL" "Expected validation error, got: $ERROR"
fi
echo ""

# Test 11: POST /api/hr/roster/settings (Create)
echo "📋 Test 11: POST /api/hr/roster/settings (Create)"
echo "----------------------------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/hr/roster/settings" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Tenant-Id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d "{\"storeId\":\"$STORE_CODE\",\"minimumRequired\":5,\"maximumAllowed\":10,\"shiftRequirements\":{\"morning\":{\"min\":2,\"max\":5},\"evening\":{\"min\":2,\"max\":5},\"night\":{\"min\":1,\"max\":3}}}")

SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
HAS_DATA=$(echo "$RESPONSE" | jq -r '.data != null // false')
SETTINGS_STORE_ID=$(echo "$RESPONSE" | jq -r '.data.storeId // null')

if [ "$SUCCESS" == "true" ] && [ "$HAS_DATA" == "true" ]; then
  print_result "POST /api/hr/roster/settings (create)" "PASS" "Settings created for store: $SETTINGS_STORE_ID"
  CREATED_STORE_ID=$SETTINGS_STORE_ID
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error // .message // "Unknown error"')
  print_result "POST /api/hr/roster/settings (create)" "FAIL" "Error: $ERROR"
  CREATED_STORE_ID=""
fi
echo ""

# Test 12: PUT /api/hr/roster/settings/:storeId
echo "📋 Test 12: PUT /api/hr/roster/settings/:storeId"
echo "----------------------------------------"
if [ -n "$CREATED_STORE_ID" ]; then
  RESPONSE=$(curl -s -X PUT "$BASE_URL/api/hr/roster/settings/$CREATED_STORE_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "X-Tenant-Id: $TENANT_ID" \
    -H "Content-Type: application/json" \
    -d "{\"storeId\":\"$CREATED_STORE_ID\",\"minimumRequired\":6,\"maximumAllowed\":12}")
  
  SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
  UPDATED_MIN=$(echo "$RESPONSE" | jq -r '.data.minimumRequired // null')
  
  if [ "$SUCCESS" == "true" ] && [ "$UPDATED_MIN" == "6" ]; then
    print_result "PUT /api/hr/roster/settings/:storeId" "PASS" "Settings updated, minimumRequired: $UPDATED_MIN"
  else
    ERROR=$(echo "$RESPONSE" | jq -r '.error // .message // "Unknown error"')
    print_result "PUT /api/hr/roster/settings/:storeId" "FAIL" "Error: $ERROR"
  fi
else
  print_result "PUT /api/hr/roster/settings/:storeId" "SKIP" "No store ID available (create failed)"
fi
echo ""

# Test 13: POST /api/hr/roster/bulk (Validation - Empty entries)
echo "📋 Test 13: POST /api/hr/roster/bulk (Validation - Empty entries)"
echo "----------------------------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/hr/roster/bulk" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Tenant-Id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"entries":[]}')

SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
ERROR=$(echo "$RESPONSE" | jq -r '.error // .message // "Unknown error"')

if [ "$SUCCESS" == "false" ] && ([[ "$ERROR" == *"entries"* ]] || [[ "$ERROR" == *"array"* ]] || [[ "$ERROR" == *"required"* ]]); then
  print_result "POST /api/hr/roster/bulk (validation)" "PASS" "Correctly rejects empty entries"
else
  print_result "POST /api/hr/roster/bulk (validation)" "FAIL" "Expected validation error, got: $ERROR"
fi
echo ""

# Test 14: POST /api/hr/roster/bulk (Create)
echo "📋 Test 14: POST /api/hr/roster/bulk (Create)"
echo "----------------------------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/hr/roster/bulk" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Tenant-Id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d "{\"entries\":[{\"employeeId\":\"EMP-2026-969954\",\"storeId\":\"$STORE_CODE\",\"date\":\"2026-02-26\",\"shift\":\"MORNING\",\"shiftStart\":\"09:00\",\"shiftEnd\":\"18:00\"}]}")

SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
HAS_DATA=$(echo "$RESPONSE" | jq -r '.data != null // false')

if [ "$SUCCESS" == "true" ]; then
  CREATED=$(echo "$RESPONSE" | jq -r '.data.created // .data.total // 0')
  print_result "POST /api/hr/roster/bulk" "PASS" "Bulk create successful, created: $CREATED"
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error // .message // "Unknown error"')
  print_result "POST /api/hr/roster/bulk" "FAIL" "Error: $ERROR"
fi
echo ""

# Test 15: GET /api/hr/roster/weekly
echo "📋 Test 15: GET /api/hr/roster/weekly"
echo "----------------------------------------"
RESPONSE=$(curl -s -X GET "$BASE_URL/api/hr/roster/weekly?storeId=$STORE_CODE&weekStartDate=2026-02-24" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Tenant-Id: $TENANT_ID")

SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
HAS_DATA=$(echo "$RESPONSE" | jq -r '.data != null // false')

if [ "$SUCCESS" == "true" ]; then
  print_result "GET /api/hr/roster/weekly" "PASS" "Weekly roster retrieved"
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error // .message // "Unknown error"')
  print_result "GET /api/hr/roster/weekly" "FAIL" "Error: $ERROR"
fi
echo ""

# Test 16: GET /api/hr/roster/weekly-enhanced
echo "📋 Test 16: GET /api/hr/roster/weekly-enhanced"
echo "----------------------------------------"
RESPONSE=$(curl -s -X GET "$BASE_URL/api/hr/roster/weekly-enhanced?storeId=$STORE_CODE&weekStartDate=2026-02-24" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Tenant-Id: $TENANT_ID")

SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
HAS_DATA=$(echo "$RESPONSE" | jq -r '.data != null // false')

if [ "$SUCCESS" == "true" ]; then
  print_result "GET /api/hr/roster/weekly-enhanced" "PASS" "Enhanced weekly roster retrieved"
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error // .message // "Unknown error"')
  print_result "GET /api/hr/roster/weekly-enhanced" "FAIL" "Error: $ERROR"
fi
echo ""

# Summary
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo "⏭️  Skipped: $SKIPPED"
echo "📋 Total: $((PASSED + FAILED + SKIPPED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎯 All roster APIs are working correctly!"
else
  echo "⚠️  Some tests failed. Please review the errors above."
fi
