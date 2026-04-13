#!/bin/bash

# Quick API Test Script
# Run this to test all endpoints quickly

BASE_URL="https://api.etelios.com"

echo "=========================================="
echo "🧪 Quick API Test - api.etelios.com"
echo "=========================================="
echo ""

test_endpoint() {
    local endpoint=$1
    local name=$2
    
    echo -n "Testing $name ... "
    status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint" --max-time 5)
    
    if [ "$status" == "200" ] || [ "$status" == "401" ] || [ "$status" == "403" ]; then
        echo "✅ (HTTP $status)"
    else
        echo "❌ (HTTP $status)"
    fi
}

echo "1. Health & Root"
test_endpoint "/" "Root"
test_endpoint "/health" "Health"
echo ""

echo "2. Auth Service"
test_endpoint "/api/auth/health" "Auth Health"
test_endpoint "/api/auth/status" "Auth Status"
echo ""

echo "3. HR Service"
test_endpoint "/api/hr/health" "HR Health"
test_endpoint "/api/hr/stores" "Stores"
test_endpoint "/api/hr/departments" "Departments"
test_endpoint "/api/hr/employees" "Employees"
test_endpoint "/api/hr/roles" "Roles"
test_endpoint "/api/hr/roster" "Roster"
echo ""

echo "4. Attendance Service"
test_endpoint "/api/attendance/health" "Attendance Health"
test_endpoint "/api/attendance/status" "Attendance Status"
test_endpoint "/api/attendance/today" "Today"
echo ""

echo "5. Other Services"
test_endpoint "/api/documents" "Documents"
test_endpoint "/api/admin" "Admin"
test_endpoint "/api/platform" "Platform"
test_endpoint "/api/tenants" "Tenants"
echo ""

echo "=========================================="
echo "✅ Test Complete!"
echo "=========================================="
