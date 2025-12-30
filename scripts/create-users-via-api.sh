#!/bin/bash

# Script to create test users via API
# This uses the mock-login to get admin token, then creates users

API_BASE="https://98.70.245.87"

echo "═══════════════════════════════════════════════════════════"
echo "           🔐 Creating Test Users via API"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Step 1: Get admin token using mock login
echo "🔄 Step 1: Getting admin token..."
ADMIN_TOKEN=$(curl -s -k -X POST "${API_BASE}/api/auth/mock-login" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin","email":"admin@test.com","name":"Test Admin"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null)

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Failed to get admin token"
  echo "Trying alternative method..."
  
  # Alternative: Use superadmin mock login
  ADMIN_TOKEN=$(curl -s -k -X POST "${API_BASE}/api/auth/mock-login" \
    -H "Content-Type: application/json" \
    -d '{"role":"superadmin"}' \
    | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null)
fi

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Could not get admin token. Mock login might be disabled."
  echo "Please create users manually or enable mock login."
  exit 1
fi

echo "✅ Got admin token"
echo ""

# Step 2: Create test users
echo "🔄 Step 2: Creating test users..."
echo ""

# User 1: Admin
echo "Creating Admin User..."
curl -s -k -X POST "${API_BASE}/api/auth/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "employee_id": "EMP001",
    "name": "Test Admin",
    "email": "admin@test.com",
    "phone": "+919876543210",
    "password": "Admin@123",
    "role": "admin",
    "department": "IT",
    "designation": "System Administrator",
    "joining_date": "2024-01-01"
  }' | python3 -m json.tool 2>/dev/null || echo "User might already exist"
echo ""

# User 2: HR
echo "Creating HR User..."
curl -s -k -X POST "${API_BASE}/api/auth/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "employee_id": "EMP002",
    "name": "Test HR",
    "email": "hr@test.com",
    "phone": "+919876543211",
    "password": "HR@123",
    "role": "hr",
    "department": "HR",
    "designation": "HR Manager",
    "joining_date": "2024-01-01"
  }' | python3 -m json.tool 2>/dev/null || echo "User might already exist"
echo ""

# User 3: Employee
echo "Creating Employee User..."
curl -s -k -X POST "${API_BASE}/api/auth/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "employee_id": "EMP003",
    "name": "Test Employee",
    "email": "employee@test.com",
    "phone": "+919876543212",
    "password": "Employee@123",
    "role": "employee",
    "department": "SALES",
    "designation": "Sales Executive",
    "joining_date": "2024-01-01"
  }' | python3 -m json.tool 2>/dev/null || echo "User might already exist"
echo ""

# User 4: Manager
echo "Creating Manager User..."
curl -s -k -X POST "${API_BASE}/api/auth/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "employee_id": "EMP004",
    "name": "Test Manager",
    "email": "manager@test.com",
    "phone": "+919876543213",
    "password": "Manager@123",
    "role": "manager",
    "department": "SALES",
    "designation": "Operations Manager",
    "joining_date": "2024-01-01"
  }' | python3 -m json.tool 2>/dev/null || echo "User might already exist"
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "           ✅ Test Users Creation Complete"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📋 TEST CREDENTIALS:"
echo ""
echo "1. Admin:    admin@test.com    / Admin@123"
echo "2. HR:       hr@test.com       / HR@123"
echo "3. Employee: employee@test.com / Employee@123"
echo "4. Manager:  manager@test.com  / Manager@123"
echo ""
echo "🧪 Test login:"
echo "curl -k -X POST ${API_BASE}/api/auth/login \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"emailOrEmployeeId\":\"admin@test.com\",\"password\":\"Admin@123\"}'"
echo ""
echo "═══════════════════════════════════════════════════════════"

