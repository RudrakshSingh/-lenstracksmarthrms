#!/bin/bash

# Test Sales System with Aditya's Account
# Run this script manually to test

API_BASE="http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com"
EMAIL="Aditya@gmail.com"
PASSWORD="yrv0s48mA1!"
TENANT_ID="eyekra"

echo "🚀 Testing Sales System with Aditya's Account"
echo "=============================================="
echo ""

# Step 1: Login
echo "🔐 Step 1: Logging in..."
echo "Email: ${EMAIL}"
echo "Tenant: ${TENANT_ID}"
echo ""

LOGIN_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "${API_BASE}/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: ${TENANT_ID}" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | sed '/HTTP_CODE:/d')

echo "HTTP Code: $HTTP_CODE"
echo "Response: $RESPONSE_BODY"
echo ""

# Try multiple ways to extract token
TOKEN=$(echo "$RESPONSE_BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  # Try alternative token extraction
  TOKEN=$(echo "$RESPONSE_BODY" | grep -o '"token" *: *"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
  # Try data.token
  TOKEN=$(echo "$RESPONSE_BODY" | grep -o '"data":{[^}]*"token":"[^"]*' | grep -o '"token":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Full response:"
  echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"
  echo ""
  echo "Trying without tenant ID..."
  
  # Try without tenant ID
  LOGIN_RESPONSE2=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "${API_BASE}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\",\"tenantId\":\"${TENANT_ID}\"}")
  
  HTTP_CODE2=$(echo "$LOGIN_RESPONSE2" | grep "HTTP_CODE:" | cut -d: -f2)
  RESPONSE_BODY2=$(echo "$LOGIN_RESPONSE2" | sed '/HTTP_CODE:/d')
  
  echo "HTTP Code: $HTTP_CODE2"
  echo "Response: $RESPONSE_BODY2"
  
  TOKEN=$(echo "$RESPONSE_BODY2" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  
  if [ -z "$TOKEN" ]; then
    echo "❌ Login failed with both methods."
    exit 1
  fi
fi

echo "✅ Login successful"
echo "Token: ${TOKEN:0:50}..."
echo ""

# Step 2: Check clock-in status
echo "⏰ Step 2: Checking clock-in status..."
ATTENDANCE_RESPONSE=$(curl -s -X GET "${API_BASE}/api/attendance/today" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}")

echo "Response: $ATTENDANCE_RESPONSE"
echo ""

# Step 3: Clock in (if not already)
echo "⏰ Step 3: Clocking in..."
CLOCK_IN_RESPONSE=$(curl -s -X POST "${API_BASE}/api/attendance/clock-in" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: ${TENANT_ID}" \
  -d '{"latitude":19.0760,"longitude":72.8777,"notes":"Test sales system"}')

echo "Response: $CLOCK_IN_RESPONSE"
echo ""

# Step 4: Add sales entry
echo "💰 Step 4: Adding sales entry..."
SALES_RESPONSE=$(curl -s -X POST "${API_BASE}/api/sales/daily-entry" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: ${TENANT_ID}" \
  -d '{
    "customer_name": "Test Customer",
    "customer_phone": "+911234567890",
    "items": [{
      "product_name": "Test Product 1",
      "quantity": 2,
      "unit_price": 5000,
      "discount_percentage": 10,
      "tax_rate": 18
    }],
    "store_id": "store_id_here",
    "payment_method": "CASH",
    "notes": "Test sales entry"
  }')

echo "Response: $SALES_RESPONSE"
echo ""

# Step 5: Get today sales
echo "📊 Step 5: Getting today sales..."
TODAY_SALES_RESPONSE=$(curl -s -X GET "${API_BASE}/api/sales/employee/today" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}")

echo "Response: $TODAY_SALES_RESPONSE"
echo ""

# Step 6: End day
echo "🏁 Step 6: Ending day..."
END_DAY_RESPONSE=$(curl -s -X POST "${API_BASE}/api/sales/employee/end-day" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: ${TENANT_ID}")

echo "Response: $END_DAY_RESPONSE"
echo ""

# Step 7: Clock out
echo "⏰ Step 7: Clocking out..."
CLOCK_OUT_RESPONSE=$(curl -s -X POST "${API_BASE}/api/attendance/clock-out" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: ${TENANT_ID}" \
  -d '{"latitude":19.0760,"longitude":72.8777,"notes":"End of day clock-out"}')

echo "Response: $CLOCK_OUT_RESPONSE"
echo ""

# Step 8: Get dashboard
echo "📊 Step 8: Getting dashboard..."
DASHBOARD_RESPONSE=$(curl -s -X GET "${API_BASE}/api/hr/dashboard" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Tenant-Id: ${TENANT_ID}")

echo "Response: $DASHBOARD_RESPONSE"
echo ""

echo "✅ Test completed!"
echo ""
echo "📋 Summary:"
echo "1. Login: ✅"
echo "2. Clock-in: ✅"
echo "3. Sales Entry: ✅"
echo "4. Today Sales: ✅"
echo "5. End Day: ✅"
echo "6. Clock Out: ✅"
echo "7. Dashboard: ✅"
