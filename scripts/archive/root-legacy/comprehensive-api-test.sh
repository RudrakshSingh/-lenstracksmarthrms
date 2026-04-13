#!/bin/bash

# Comprehensive API Testing Script
# Tests all APIs: Payroll, Auth, HR, CTC Calculator, Tenant, Employee, Store, Department

API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
RESULTS=()

echo "🧪 Comprehensive API Testing"
echo "============================="
echo ""

# Function to test API
test_api() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local headers=$5
    
    echo "Testing: $name"
    echo "  $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE$endpoint" \
            -H "Content-Type: application/json" \
            $headers 2>/dev/null)
    elif [ "$method" = "POST" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE$endpoint" \
            -H "Content-Type: application/json" \
            $headers \
            -d "$data" 2>/dev/null)
    elif [ "$method" = "PUT" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$API_BASE$endpoint" \
            -H "Content-Type: application/json" \
            $headers \
            -d "$data" 2>/dev/null)
    elif [ "$method" = "PATCH" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$API_BASE$endpoint" \
            -H "Content-Type: application/json" \
            $headers \
            -d "$data" 2>/dev/null)
    elif [ "$method" = "DELETE" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$API_BASE$endpoint" \
            -H "Content-Type: application/json" \
            $headers 2>/dev/null)
    fi
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    STATUS="✅"
    if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ] && [ "$HTTP_CODE" != "204" ]; then
        STATUS="❌"
    fi
    
    echo "  $STATUS HTTP $HTTP_CODE"
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        echo "$BODY" | jq -r '.message // .data // .' 2>/dev/null | head -2 || echo "$BODY" | head -2
    else
        echo "$BODY" | jq -r '.message // .error // .' 2>/dev/null | head -2 || echo "$BODY" | head -2
    fi
    echo ""
    
    RESULTS+=("$name|$HTTP_CODE|$STATUS")
}

# Step 1: Get Auth Token
echo "Step 1: Authentication"
echo "---------------------"
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@upcapto.com","password":"Upcapto@2026"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken' 2>/dev/null)
TENANT_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.tenantId' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Failed to get auth token"
    exit 1
fi

echo "✅ Token obtained (Tenant: $TENANT_ID)"
echo ""

AUTH_HEADERS="-H \"Authorization: Bearer $TOKEN\" -H \"x-tenant-id: $TENANT_ID\""

# Step 2: Test Payroll APIs
echo "Step 2: Payroll Service APIs"
echo "----------------------------"
test_api "Payroll Health" "GET" "/api/payroll/health" "" ""
test_api "Payroll Status" "GET" "/api/payroll/status" "" ""

# Step 3: Test Auth APIs
echo "Step 3: Auth Service APIs"
echo "-------------------------"
test_api "Auth Health" "GET" "/api/auth/health" "" ""
test_api "Auth Me" "GET" "/api/auth/me" "" "$AUTH_HEADERS"

# Step 4: Test HR APIs
echo "Step 4: HR Service APIs"
echo "----------------------"
test_api "HR Health" "GET" "/api/hr/health" "" ""
test_api "HR Status" "GET" "/api/hr/status" "" ""
test_api "List Employees" "GET" "/api/hr/employees" "" "$AUTH_HEADERS"
test_api "List Departments" "GET" "/api/hr/departments" "" "$AUTH_HEADERS"
test_api "List Stores" "GET" "/api/hr/stores" "" "$AUTH_HEADERS"

# Step 5: Test CTC Calculator
echo "Step 5: CTC Breakdown Calculator"
echo "--------------------------------"
test_api "Calculate Salary (CTC)" "POST" "/api/payroll/salary/calculate" \
  '{"employee_id":"TEST001","gross_monthly":60000,"variable_incentive":5000}' \
  "$AUTH_HEADERS"

# Step 6: Test Tenant APIs
echo "Step 6: Tenant Service APIs"
echo "---------------------------"
test_api "Get Company" "GET" "/api/tenants/company" "" "$AUTH_HEADERS"

# Step 7: Test Employee Management
echo "Step 7: Employee Management APIs"
echo "--------------------------------"
# Get first employee ID for testing
EMP_LIST=$(curl -s -X GET "$API_BASE/api/hr/employees" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" 2>/dev/null)

FIRST_EMP_ID=$(echo "$EMP_LIST" | jq -r '.data[0]._id // .data[0].id // empty' 2>/dev/null)

if [ ! -z "$FIRST_EMP_ID" ] && [ "$FIRST_EMP_ID" != "null" ]; then
    test_api "Update Employee Status (Inactive)" "PATCH" "/api/hr/employees/$FIRST_EMP_ID/status" \
      '{"status":"inactive"}' \
      "$AUTH_HEADERS"
    
    test_api "Update Employee Status (Active)" "PATCH" "/api/hr/employees/$FIRST_EMP_ID/status" \
      '{"status":"active"}' \
      "$AUTH_HEADERS"
else
    echo "⚠️  No employees found for status update test"
    echo ""
fi

# Step 8: Test Department Management
echo "Step 8: Department Management APIs"
echo "----------------------------------"
# Get first department ID for testing
DEPT_LIST=$(curl -s -X GET "$API_BASE/api/hr/departments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" 2>/dev/null)

FIRST_DEPT_ID=$(echo "$DEPT_LIST" | jq -r '.data[0]._id // .data[0].id // empty' 2>/dev/null)

if [ ! -z "$FIRST_DEPT_ID" ] && [ "$FIRST_DEPT_ID" != "null" ]; then
    test_api "Get Department" "GET" "/api/hr/departments/$FIRST_DEPT_ID" "" "$AUTH_HEADERS"
    
    test_api "Update Department" "PUT" "/api/hr/departments/$FIRST_DEPT_ID" \
      '{"name":"Updated Department Name"}' \
      "$AUTH_HEADERS"
else
    echo "⚠️  No departments found for edit test"
    echo ""
fi

# Step 9: Test Dashboard
echo "Step 9: Dashboard APIs"
echo "---------------------"
test_api "Dashboard Departments" "GET" "/api/hr/dashboard/departments" "" "$AUTH_HEADERS"

# Summary
echo "============================="
echo "Test Summary"
echo "============================="
echo ""
for result in "${RESULTS[@]}"; do
    IFS='|' read -r name code status <<< "$result"
    echo "$status $name (HTTP $code)"
done

echo ""
echo "✅ Testing Complete!"
