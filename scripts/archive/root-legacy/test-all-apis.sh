#!/bin/bash

# Comprehensive API Testing Script
# Tests: Payroll, Auth, HR, CTC Calculator, Tenant, Employee, Store, Department

API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
RESULTS_FILE="api-test-results-$(date +%Y%m%d-%H%M%S).json"

echo "🧪 Comprehensive API Testing"
echo "============================="
echo ""

# Initialize results
echo '{"timestamp":"'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'","tests":[]}' > "$RESULTS_FILE"

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
            $headers)
    elif [ "$method" = "POST" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE$endpoint" \
            -H "Content-Type: application/json" \
            $headers \
            -d "$data")
    elif [ "$method" = "PUT" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$API_BASE$endpoint" \
            -H "Content-Type: application/json" \
            $headers \
            -d "$data")
    elif [ "$method" = "DELETE" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$API_BASE$endpoint" \
            -H "Content-Type: application/json" \
            $headers)
    fi
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    STATUS="✅"
    if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
        STATUS="❌"
    fi
    
    echo "  $STATUS HTTP $HTTP_CODE"
    echo "$BODY" | jq '.' 2>/dev/null | head -5 || echo "$BODY" | head -3
    echo ""
    
    # Save result
    jq --arg name "$name" --arg method "$method" --arg endpoint "$endpoint" \
       --arg http_code "$HTTP_CODE" --arg body "$BODY" \
       '.tests += [{"name":$name,"method":$method,"endpoint":$endpoint,"http_code":$http_code,"response":$body}]' \
       "$RESULTS_FILE" > "${RESULTS_FILE}.tmp" && mv "${RESULTS_FILE}.tmp" "$RESULTS_FILE"
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

echo "✅ Token obtained"
echo "   Tenant: $TENANT_ID"
echo ""

AUTH_HEADERS="-H \"Authorization: Bearer $TOKEN\" -H \"x-tenant-id: $TENANT_ID\""

# Step 2: Test Payroll APIs
echo "Step 2: Payroll Service APIs"
echo "----------------------------"
test_api "Payroll Health" "GET" "/api/payroll/health" "" ""
test_api "Payroll Status" "GET" "/api/payroll/status" "" ""
test_api "Calculate Salary" "POST" "/api/payroll/salary/calculate" \
  '{"employee_id":"TEST001","gross_monthly":50000,"variable_incentive":5000}' \
  "$AUTH_HEADERS"

# Step 3: Test Auth APIs
echo "Step 3: Auth Service APIs"
echo "-------------------------"
test_api "Auth Me" "GET" "/api/auth/me" "" "$AUTH_HEADERS"
test_api "Auth Profile" "GET" "/api/auth/profile" "" "$AUTH_HEADERS"
test_api "Auth Health" "GET" "/api/auth/health" "" ""

# Step 4: Test HR APIs
echo "Step 4: HR Service APIs"
echo "----------------------"
test_api "HR Health" "GET" "/api/hr/health" "" ""
test_api "HR Status" "GET" "/api/hr/status" "" ""
test_api "List Employees" "GET" "/api/hr/employees" "" "$AUTH_HEADERS"
test_api "List Departments" "GET" "/api/hr/departments" "" "$AUTH_HEADERS"
test_api "List Stores" "GET" "/api/hr/stores" "" "$AUTH_HEADERS"

# Step 5: Test Tenant APIs
echo "Step 5: Tenant Service APIs"
echo "---------------------------"
test_api "Get Company" "GET" "/api/tenants/company" "" "$AUTH_HEADERS"
test_api "List Tenants" "GET" "/api/tenants" "" "$AUTH_HEADERS"

# Step 6: Test CTC Calculator
echo "Step 6: CTC Breakdown Calculator"
echo "---------------------------------"
test_api "CTC Calculator" "POST" "/api/payroll/salary/calculate" \
  '{"employee_id":"TEST002","gross_monthly":60000}' \
  "$AUTH_HEADERS"

echo ""
echo "✅ Testing Complete!"
echo "Results saved to: $RESULTS_FILE"
