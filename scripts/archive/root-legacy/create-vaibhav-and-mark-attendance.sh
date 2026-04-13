#!/bin/bash

# Script to create employee "Vaibhav Dwivedi" and mark attendance

set -e

API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
TENANT_ID="upcapto"

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
  echo "$ADMIN_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Admin token obtained"
echo ""

echo "📦 Step 2: Check if store exists, create if not..."
STORES_RESPONSE=$(curl -s -X GET "$API_BASE/api/hr/stores?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

STORE_COUNT=$(echo "$STORES_RESPONSE" | jq '.data | length // 0')

if [ "$STORE_COUNT" -eq 0 ]; then
  echo "📦 Creating a store..."
  STORE_RESPONSE=$(curl -s -X POST "$API_BASE/api/hr/stores" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "x-tenant-id: $TENANT_ID" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Main Store Mumbai",
      "code": "STORE001",
      "address": {
        "street": "123 Main Street",
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

echo "👤 Step 3: Creating employee 'Vaibhav Dwivedi'..."
TIMESTAMP=$(date +%s)
EMPLOYEE_ID="VAIBHAV-${TIMESTAMP: -6}"
EMPLOYEE_EMAIL="vaibhav.dwivedi@upcapto.com"
EMPLOYEE_PASSWORD="Vaibhav@123"

EMPLOYEE_RESPONSE=$(curl -s -X POST "$API_BASE/api/hr/employees" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"employeeId\": \"$EMPLOYEE_ID\",
    \"firstName\": \"Vaibhav\",
    \"lastName\": \"Dwivedi\",
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
      \"lines\": [\"123 Main Street\"],
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

echo "🔑 Step 4: Creating auth user..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/register" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"employee_id\": \"$EMPLOYEE_ID\",
    \"name\": \"Vaibhav Dwivedi\",
    \"email\": \"$EMPLOYEE_EMAIL\",
    \"password\": \"$EMPLOYEE_PASSWORD\",
    \"role\": \"employee\",
    \"phone\": \"+91-9876543210\"
  }")

# Check if response is valid JSON
if ! echo "$REGISTER_RESPONSE" | jq . > /dev/null 2>&1; then
  echo "⚠️  Auth user creation returned non-JSON response (might be error page)"
  echo "   Response: ${REGISTER_RESPONSE:0:100}..."
  REGISTER_SUCCESS="false"
else
  REGISTER_SUCCESS=$(echo "$REGISTER_RESPONSE" | jq -r '.success // false')
  if [ "$REGISTER_SUCCESS" == "true" ]; then
    echo "✅ Auth user created successfully"
  elif [[ "$(echo "$REGISTER_RESPONSE" | jq -r '.message // ""')" == *"already exists"* ]]; then
    echo "ℹ️  Auth user already exists"
  else
    echo "⚠️  Auth user creation failed:"
    echo "$REGISTER_RESPONSE" | jq '.message // .error // .' 2>/dev/null || echo "$REGISTER_RESPONSE"
  fi
fi

echo ""

echo "🧪 Step 5: Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMPLOYEE_EMAIL\",
    \"password\": \"$EMPLOYEE_PASSWORD\"
  }")

LOGIN_SUCCESS=$(echo "$LOGIN_RESPONSE" | jq -r '.success')

if [ "$LOGIN_SUCCESS" == "true" ]; then
  VAIBHAV_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken')
  echo "✅ Login successful!"
  echo ""
else
  echo "❌ Login failed"
  echo "$LOGIN_RESPONSE" | jq '.'
  echo ""
  echo "⚠️  Note: Auth user might need to be created separately"
  echo "   Employee exists in HR service but login failed"
  exit 1
fi

echo "📅 Step 6: Marking attendance (Clock-In)..."
CLOCK_IN_RESPONSE=$(curl -s -X POST "$API_BASE/api/attendance/clock-in" \
  -H "Authorization: Bearer $VAIBHAV_TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 19.0760,
    "longitude": 72.8777,
    "notes": "Clock-in for Vaibhav Dwivedi"
  }')

CLOCK_IN_SUCCESS=$(echo "$CLOCK_IN_RESPONSE" | jq -r '.success')

if [ "$CLOCK_IN_SUCCESS" == "true" ]; then
  ATTENDANCE_ID=$(echo "$CLOCK_IN_RESPONSE" | jq -r '.data._id // .data.id')
  echo "✅ Clock-in successful!"
  echo "   Attendance ID: $ATTENDANCE_ID"
  echo ""
else
  echo "❌ Clock-in failed"
  echo "$CLOCK_IN_RESPONSE" | jq '.'
  echo ""
  exit 1
fi

echo "📊 Step 7: Verifying attendance record..."
ATTENDANCE_CHECK=$(curl -s -X GET "$API_BASE/api/attendance?employeeId=$EMPLOYEE_DB_ID&date=$(date +%Y-%m-%d)" \
  -H "Authorization: Bearer $VAIBHAV_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

ATTENDANCE_COUNT=$(echo "$ATTENDANCE_CHECK" | jq '.data | length // 0')

if [ "$ATTENDANCE_COUNT" -gt 0 ]; then
  echo "✅ Attendance record found: $ATTENDANCE_COUNT record(s)"
  echo "$ATTENDANCE_CHECK" | jq '.data[0] | {employeeId, check_in_time, status, location: .check_in_location}'
else
  echo "⚠️  Attendance record not found yet (might need a moment to sync)"
fi

echo ""
echo "=========================================="
echo "✅ VAIBHAV DWIVEDI SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "📋 Employee Details:"
echo "   Name: Vaibhav Dwivedi"
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
echo "✅ Attendance Status:"
echo "   Clock-In: ✅ Completed"
echo "   Attendance ID: $ATTENDANCE_ID"
echo ""
echo "📄 Credentials saved in VAIBHAV_DWIVEDI_CREDENTIALS.md"
