#!/bin/bash

API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

echo "🔑 Getting Auth Token"
TOKEN=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@upcapto.com","password":"Upcapto@2026"}' \
  | jq -r '.data.accessToken' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo "❌ Failed to get token"
    exit 1
fi

echo "✅ Token obtained"
echo ""

# Get employee ID
echo "📋 Getting Employee ID"
EMPLOYEES=$(curl -s -X GET "$API_BASE/api/hr/employees?limit=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto")

EMP_ID=$(echo "$EMPLOYEES" | jq -r '.data[0].id // .data[0]._id' 2>/dev/null)

if [ -z "$EMP_ID" ] || [ "$EMP_ID" == "null" ]; then
    EMP_ID="6991c22b4db4ec160667f2a3"
    echo "⚠️  Using test employee ID: $EMP_ID"
else
    echo "✅ Using employee ID: $EMP_ID"
fi

echo ""
echo "🧪 Testing All Frontend APIs"
echo "============================"
echo ""

test_api() {
    local METHOD=$1
    local PATH=$2
    local NAME=$3
    
    echo "Testing: $NAME"
    echo "  $METHOD $PATH"
    
    RESPONSE=$(curl -s -w "\nHTTP:%{http_code}" -X "$METHOD" "$API_BASE$PATH" \
      -H "Authorization: Bearer $TOKEN" \
      -H "x-tenant-id: upcapto")
    
    HTTP=$(echo "$RESPONSE" | grep "HTTP:" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP:/d')
    
    SUCCESS=$(echo "$BODY" | jq -r '.success' 2>/dev/null)
    MESSAGE=$(echo "$BODY" | jq -r '.message' 2>/dev/null)
    ERROR=$(echo "$BODY" | jq -r '.error' 2>/dev/null)
    
    if [ "$HTTP" == "200" ] || [ "$HTTP" == "201" ] || [ "$SUCCESS" == "true" ]; then
        echo "  ✅ Status: $HTTP - Working"
        echo "  Message: $MESSAGE"
    else
        echo "  ❌ Status: $HTTP"
        echo "  Message: $MESSAGE"
        if [ "$ERROR" != "null" ] && [ ! -z "$ERROR" ]; then
            echo "  Error: $ERROR"
        fi
    fi
    echo ""
}

# Test all APIs
test_api "GET" "/api/time-tracking?employeeId=$EMP_ID&date=2026-02-15" "1. /api/time-tracking (Frontend)"
test_api "GET" "/api/hr/time-tracking?employeeId=$EMP_ID&date=2026-02-15" "2. /api/hr/time-tracking (Alternative)"
test_api "GET" "/api/attendance?employeeId=$EMP_ID&date=2026-02-15" "3. /api/attendance (Frontend)"
test_api "GET" "/api/attendance?employeeId=$EMP_ID&startDate=2026-02-01&endDate=2026-02-15" "4. /api/attendance (Date Range)"
test_api "GET" "/api/performance/employee/$EMP_ID" "5. /api/performance/employee/:id (Frontend)"
test_api "GET" "/api/hr/performance/employee/$EMP_ID" "6. /api/hr/performance/employee/:id (Alternative)"

echo "📊 Summary"
echo "=========="
echo "All APIs tested. Check results above."
