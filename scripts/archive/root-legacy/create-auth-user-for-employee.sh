#!/bin/bash

# Script to create auth user for existing employee
# This registers the employee in auth service so they can login

set -e

API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
TENANT_ID="upcapto"

# Employee details
EMPLOYEE_EMAIL="employee.test@upcapto.com"
EMPLOYEE_PASSWORD="Employee@123"
EMPLOYEE_ID="EMP-TEST-177219"  # Update this if you created a different employee

echo "🔐 Step 1: Login as Admin..."
ADMIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@upcapto.com",
    "password": "Upcapto@2026"
  }')

ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | jq -r '.data.accessToken')

if [ "$ADMIN_TOKEN" == "null" ] || [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Failed to login as admin"
  exit 1
fi

echo "✅ Admin token obtained"
echo ""

echo "👤 Step 2: Register employee in auth service..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/register" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"employee_id\": \"$EMPLOYEE_ID\",
    \"name\": \"Test Employee\",
    \"email\": \"$EMPLOYEE_EMAIL\",
    \"password\": \"$EMPLOYEE_PASSWORD\",
    \"role\": \"employee\",
    \"phone\": \"+91-9876543210\"
  }")

# Check if response is valid JSON
if ! echo "$REGISTER_RESPONSE" | jq . > /dev/null 2>&1; then
  echo "⚠️  Invalid JSON response from register endpoint"
  echo "Response: $REGISTER_RESPONSE"
  REGISTER_SUCCESS="false"
else
  REGISTER_SUCCESS=$(echo "$REGISTER_RESPONSE" | jq -r '.success // false')
fi

if [ "$REGISTER_SUCCESS" == "true" ]; then
  echo "✅ Auth user created successfully"
else
  ERROR_MSG=$(echo "$REGISTER_RESPONSE" | jq -r '.message')
  echo "⚠️  Registration response: $ERROR_MSG"
  
  # Check if user already exists
  if [[ "$ERROR_MSG" == *"already exists"* ]]; then
    echo "ℹ️  User already exists in auth service"
  else
    echo "❌ Failed to create auth user"
    echo "$REGISTER_RESPONSE" | jq '.'
    exit 1
  fi
fi

echo ""

echo "🧪 Step 3: Test login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMPLOYEE_EMAIL\",
    \"password\": \"$EMPLOYEE_PASSWORD\"
  }")

LOGIN_SUCCESS=$(echo "$LOGIN_RESPONSE" | jq -r '.success')

if [ "$LOGIN_SUCCESS" == "true" ]; then
  EMPLOYEE_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken')
  echo "✅ Login successful!"
  echo ""
  echo "=========================================="
  echo "✅ EMPLOYEE LOGIN READY!"
  echo "=========================================="
  echo ""
  echo "📋 Login Credentials:"
  echo "   Email: $EMPLOYEE_EMAIL"
  echo "   Password: $EMPLOYEE_PASSWORD"
  echo "   Tenant: $TENANT_ID"
  echo ""
  echo "🎫 Access Token:"
  echo "   $EMPLOYEE_TOKEN"
  echo ""
  echo "🧪 Test Clock-In:"
  echo "   curl -X POST \"$API_BASE/api/attendance/clock-in\" \\"
  echo "     -H \"Authorization: Bearer $EMPLOYEE_TOKEN\" \\"
  echo "     -H \"x-tenant-id: $TENANT_ID\" \\"
  echo "     -H \"Content-Type: application/json\" \\"
  echo "     -d '{\"latitude\": 19.0760, \"longitude\": 72.8777, \"notes\": \"Test clock-in\"}'"
else
  echo "❌ Login failed"
  echo "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi
