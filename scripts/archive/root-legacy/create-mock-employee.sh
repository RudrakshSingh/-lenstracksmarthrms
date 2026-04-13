#!/bin/bash

# Script to create a mock employee for attendance testing
# This creates both an employee in HR service and a user in auth service

set -e

API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
TENANT_ID="upcapto"

echo "🔐 Step 1: Login as SuperAdmin to get token..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@upcapto.com",
    "password": "Upcapto@2026"
  }')

ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken')

if [ "$ADMIN_TOKEN" == "null" ] || [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Failed to login as admin"
  echo "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Admin token obtained"
echo ""

echo "📋 Step 2: Check if store exists, create if not..."
STORES_RESPONSE=$(curl -s -X GET "$API_BASE/api/hr/stores?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

STORE_COUNT=$(echo "$STORES_RESPONSE" | jq '.data | length // 0')

if [ "$STORE_COUNT" -eq 0 ]; then
  echo "📦 Creating a test store..."
  STORE_RESPONSE=$(curl -s -X POST "$API_BASE/api/hr/stores" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "x-tenant-id: $TENANT_ID" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Test Store Mumbai",
      "code": "STORE001",
      "address": {
        "street": "123 Test Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "zip": "400001",
        "country": "India"
      },
      "coordinates": {
        "latitude": 19.0760,
        "longitude": 72.8777
      },
      "geofenceRadius": 100,
      "status": "active"
    }')
  
  STORE_ID=$(echo "$STORE_RESPONSE" | jq -r '.data._id // .data.id')
  echo "✅ Store created: $STORE_ID"
else
  STORE_ID=$(echo "$STORES_RESPONSE" | jq -r '.data[0]._id // .data[0].id')
  echo "✅ Using existing store: $STORE_ID"
fi

echo ""

echo "👤 Step 3: Creating mock employee..."
EMPLOYEE_EMAIL="employee.test@upcapto.com"
EMPLOYEE_PASSWORD="Employee@123"
EMPLOYEE_ID="EMP-TEST-001"

# Generate a unique employee ID with timestamp
TIMESTAMP=$(date +%s)
EMPLOYEE_ID="EMP-TEST-${TIMESTAMP: -6}"

EMPLOYEE_RESPONSE=$(curl -s -X POST "$API_BASE/api/hr/employees" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"employeeId\": \"$EMPLOYEE_ID\",
    \"firstName\": \"Test\",
    \"lastName\": \"Employee\",
    \"email\": \"$EMPLOYEE_EMAIL\",
    \"phone\": \"+91-9876543210\",
    \"department\": \"Sales\",
    \"designation\": \"Sales Executive\",
    \"status\": \"active\",
    \"doj\": \"2024-01-15\",
    \"store\": \"$STORE_ID\",
    \"workLocation\": {
      \"storeId\": \"$STORE_ID\",
      \"city\": \"Mumbai\",
      \"state\": \"Maharashtra\",
      \"pincode\": \"400001\"
    },
    \"currentAddress\": {
      \"lines\": [\"123 Test Street\"],
      \"city\": \"Mumbai\",
      \"state\": \"Maharashtra\",
      \"pincode\": \"400001\",
      \"country\": \"India\"
    },
    \"annual_ctc\": 600000,
    \"salary_breakdown\": {
      \"basic\": 25000,
      \"hra\": 12500,
      \"special_allowance\": 7500
    }
  }")

EMPLOYEE_SUCCESS=$(echo "$EMPLOYEE_RESPONSE" | jq -r '.success')

if [ "$EMPLOYEE_SUCCESS" != "true" ]; then
  echo "❌ Failed to create employee"
  echo "$EMPLOYEE_RESPONSE" | jq '.'
  exit 1
fi

EMPLOYEE_DB_ID=$(echo "$EMPLOYEE_RESPONSE" | jq -r '.data._id // .data.id')
echo "✅ Employee created: $EMPLOYEE_ID (DB ID: $EMPLOYEE_DB_ID)"
echo ""

echo "🔑 Step 4: Creating auth user for employee..."
echo "Registering employee in auth service..."

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

REGISTER_SUCCESS=$(echo "$REGISTER_RESPONSE" | jq -r '.success')

if [ "$REGISTER_SUCCESS" == "true" ]; then
  echo "✅ Auth user created successfully"
elif [[ "$(echo "$REGISTER_RESPONSE" | jq -r '.message')" == *"already exists"* ]]; then
  echo "ℹ️  Auth user already exists"
else
  echo "⚠️  Auth user creation failed, but employee exists in HR service"
  echo "   Run ./create-auth-user-for-employee.sh separately"
fi

echo ""
echo "🧪 Step 5: Testing login..."
AUTH_CHECK=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMPLOYEE_EMAIL\",
    \"password\": \"$EMPLOYEE_PASSWORD\"
  }")

AUTH_SUCCESS=$(echo "$AUTH_CHECK" | jq -r '.success')

if [ "$AUTH_SUCCESS" == "true" ]; then
  echo "✅ Login successful!"
  EMPLOYEE_TOKEN=$(echo "$AUTH_CHECK" | jq -r '.data.accessToken')
else
  echo "⚠️  Login failed - run ./create-auth-user-for-employee.sh to create auth user"
  EMPLOYEE_TOKEN=""
fi

echo ""
echo "=========================================="
echo "✅ MOCK EMPLOYEE CREATED SUCCESSFULLY!"
echo "=========================================="
echo ""
echo "📋 Employee Details:"
echo "   Employee ID: $EMPLOYEE_ID"
echo "   Email: $EMPLOYEE_EMAIL"
echo "   Password: $EMPLOYEE_PASSWORD"
echo "   Store ID: $STORE_ID"
echo "   Status: active"
echo ""
echo "🔐 Login Credentials:"
echo "   Email: $EMPLOYEE_EMAIL"
echo "   Password: $EMPLOYEE_PASSWORD"
echo "   Tenant: $TENANT_ID"
echo ""
if [ -n "$EMPLOYEE_TOKEN" ]; then
  echo "✅ Test Token (if available):"
  echo "   $EMPLOYEE_TOKEN"
  echo ""
fi
echo "🧪 Test Clock-In:"
echo "   curl -X POST \"$API_BASE/api/attendance/clock-in\" \\"
echo "     -H \"Authorization: Bearer <TOKEN>\" \\"
echo "     -H \"x-tenant-id: $TENANT_ID\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"latitude\": 19.0760, \"longitude\": 72.8777, \"notes\": \"Test clock-in\"}'"
echo ""
echo "📄 Save these credentials in MOCK_EMPLOYEE_CREDENTIALS.md"
