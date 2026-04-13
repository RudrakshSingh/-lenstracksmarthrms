#!/bin/bash

ALB_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
RESULTS_FILE="production-test-results-$(date +%Y%m%d-%H%M%S).txt"

echo "╔══════════════════════════════════════════════════════════════════╗" | tee $RESULTS_FILE
echo "║       PRODUCTION ENDPOINT TEST - ALL LIVE SERVICES               ║" | tee -a $RESULTS_FILE
echo "╚══════════════════════════════════════════════════════════════════╝" | tee -a $RESULTS_FILE
echo "" | tee -a $RESULTS_FILE
echo "Testing Time: $(date)" | tee -a $RESULTS_FILE
echo "ALB URL: $ALB_URL" | tee -a $RESULTS_FILE
echo "" | tee -a $RESULTS_FILE

test_endpoint() {
    local name=$1
    local method=$2
    local path=$3
    local data=$4
    local auth=$5
    
    if [ "$method" = "GET" ]; then
        if [ -n "$auth" ]; then
            response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $auth" "${ALB_URL}${path}" 2>/dev/null)
        else
            response=$(curl -s -w "\n%{http_code}" "${ALB_URL}${path}" 2>/dev/null)
        fi
    else
        if [ -n "$auth" ]; then
            response=$(curl -s -w "\n%{http_code}" -X $method -H "Content-Type: application/json" -H "Authorization: Bearer $auth" -d "$data" "${ALB_URL}${path}" 2>/dev/null)
        else
            response=$(curl -s -w "\n%{http_code}" -X $method -H "Content-Type: application/json" -d "$data" "${ALB_URL}${path}" 2>/dev/null)
        fi
    fi
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$status_code" = "200" ]; then
        echo "  ✅ ${name}: HTTP ${status_code}" | tee -a $RESULTS_FILE
        echo "$body" | python3 -m json.tool 2>/dev/null | head -3 | sed 's/^/     /' | tee -a $RESULTS_FILE
    elif [ "$status_code" = "201" ]; then
        echo "  ✅ ${name}: HTTP ${status_code} (Created)" | tee -a $RESULTS_FILE
    elif [ "$status_code" = "401" ]; then
        echo "  🔒 ${name}: HTTP ${status_code} (Auth Required - Working)" | tee -a $RESULTS_FILE
    elif [ "$status_code" = "403" ]; then
        echo "  🔒 ${name}: HTTP ${status_code} (Forbidden - Working)" | tee -a $RESULTS_FILE
    elif [ "$status_code" = "404" ]; then
        echo "  ❌ ${name}: HTTP ${status_code} (Not Found)" | tee -a $RESULTS_FILE
    elif [ "$status_code" = "400" ]; then
        echo "  ⚠️  ${name}: HTTP ${status_code} (Bad Request - Endpoint exists)" | tee -a $RESULTS_FILE
    elif [ "$status_code" = "503" ]; then
        echo "  ❌ ${name}: HTTP ${status_code} (Service Unavailable)" | tee -a $RESULTS_FILE
    else
        echo "  ⚠️  ${name}: HTTP ${status_code}" | tee -a $RESULTS_FILE
    fi
}

echo "═══════════════════════════════════════════════════════════════════" | tee -a $RESULTS_FILE
echo "1. AUTH SERVICE - /api/auth" | tee -a $RESULTS_FILE
echo "═══════════════════════════════════════════════════════════════════" | tee -a $RESULTS_FILE
test_endpoint "Status" "GET" "/api/auth/status"
test_endpoint "Health" "GET" "/api/auth/health"
test_endpoint "Login (no creds)" "POST" "/api/auth/login" '{"email":"test","password":"test"}'
test_endpoint "Register (no data)" "POST" "/api/auth/register" '{}'
test_endpoint "Profile (no auth)" "GET" "/api/auth/profile"
test_endpoint "Logout (no auth)" "POST" "/api/auth/logout"
test_endpoint "Refresh Token" "POST" "/api/auth/refresh-token" '{"refreshToken":"fake"}'
echo "" | tee -a $RESULTS_FILE

echo "═══════════════════════════════════════════════════════════════════" | tee -a $RESULTS_FILE
echo "2. HR SERVICE - /api/hr" | tee -a $RESULTS_FILE
echo "═══════════════════════════════════════════════════════════════════" | tee -a $RESULTS_FILE
test_endpoint "Base Info" "GET" "/api/hr"
test_endpoint "Status" "GET" "/api/hr/status"
test_endpoint "Health" "GET" "/api/hr/health"
test_endpoint "Employees (no auth)" "GET" "/api/hr/employees"
test_endpoint "Leave (no auth)" "GET" "/api/hr/leave"
test_endpoint "Payroll (no auth)" "GET" "/api/hr/payroll"
test_endpoint "Reports (no auth)" "GET" "/api/hr/reports"
test_endpoint "Onboarding (no auth)" "POST" "/api/hr/onboarding" '{}'
echo "" | tee -a $RESULTS_FILE

echo "═══════════════════════════════════════════════════════════════════" | tee -a $RESULTS_FILE
echo "3. ATTENDANCE SERVICE - /api/attendance" | tee -a $RESULTS_FILE
echo "═══════════════════════════════════════════════════════════════════" | tee -a $RESULTS_FILE
test_endpoint "Status" "GET" "/api/attendance/status"
test_endpoint "Health" "GET" "/api/attendance/health"
test_endpoint "Records (no auth)" "GET" "/api/attendance"
test_endpoint "Check-in (no auth)" "POST" "/api/attendance/checkin"
test_endpoint "Check-out (no auth)" "POST" "/api/attendance/checkout"
test_endpoint "Report (no auth)" "GET" "/api/attendance/report"
echo "" | tee -a $RESULTS_FILE

echo "═══════════════════════════════════════════════════════════════════" | tee -a $RESULTS_FILE
echo "4. TENANT MANAGEMENT - /api/admin/v1" | tee -a $RESULTS_FILE
echo "═══════════════════════════════════════════════════════════════════" | tee -a $RESULTS_FILE
test_endpoint "Base Info" "GET" "/api/admin/v1"
test_endpoint "Health" "GET" "/api/admin/v1/health"
test_endpoint "Status" "GET" "/api/admin/v1/status"
test_endpoint "Tenants (no auth)" "GET" "/api/admin/v1/tenants"
test_endpoint "Metrics (no auth)" "GET" "/api/admin/v1/platform/metrics"
echo "" | tee -a $RESULTS_FILE

echo "═══════════════════════════════════════════════════════════════════" | tee -a $RESULTS_FILE
echo "5. TENANT REGISTRY - /api/tenants" | tee -a $RESULTS_FILE
echo "═══════════════════════════════════════════════════════════════════" | tee -a $RESULTS_FILE
test_endpoint "List Tenants (no auth)" "GET" "/api/tenants"
test_endpoint "Create Tenant (no auth)" "POST" "/api/tenants" '{"name":"Test"}'
echo "" | tee -a $RESULTS_FILE

echo "═══════════════════════════════════════════════════════════════════" | tee -a $RESULTS_FILE
echo "SUMMARY" | tee -a $RESULTS_FILE
echo "═══════════════════════════════════════════════════════════════════" | tee -a $RESULTS_FILE

# Count results
TOTAL=$(grep -E "✅|🔒|❌|⚠️" $RESULTS_FILE | wc -l | xargs)
SUCCESS=$(grep "✅" $RESULTS_FILE | wc -l | xargs)
AUTH_REQUIRED=$(grep "🔒" $RESULTS_FILE | wc -l | xargs)
FAILED=$(grep "❌" $RESULTS_FILE | wc -l | xargs)

echo "Total Endpoints Tested: $TOTAL" | tee -a $RESULTS_FILE
echo "✅ Working (Public):     $SUCCESS" | tee -a $RESULTS_FILE
echo "🔒 Auth Required:        $AUTH_REQUIRED (Working, needs token)" | tee -a $RESULTS_FILE
echo "❌ Failed/Unavailable:   $FAILED" | tee -a $RESULTS_FILE
echo "" | tee -a $RESULTS_FILE
echo "Results saved to: $RESULTS_FILE" | tee -a $RESULTS_FILE
