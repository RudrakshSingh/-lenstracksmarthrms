#!/bin/bash

# Simple test for dashboard login time API

BASE_URL="${BACKEND_URL:-http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com}"
EMAIL="lenstrack01@gmail.com"
PASSWORD="cnbxs2b9A1!"

echo "🧪 Testing Dashboard Login Time API"
echo "===================================="
echo ""

# Login
echo "1️⃣ Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // .data.token // .token // empty')
TENANT_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.tenantId // .data.tenantId // .tenantId // "default"')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Login failed - no token found"
  echo "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Login successful"
echo ""

# Get Dashboard
echo "2️⃣ Fetching dashboard..."
DASHBOARD_RESPONSE=$(curl -s -X GET "$BASE_URL/api/hr/dashboard" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT_ID")

SUCCESS=$(echo "$DASHBOARD_RESPONSE" | jq -r '.success // true')

if [ "$SUCCESS" != "true" ]; then
  echo "❌ Dashboard fetch failed"
  echo "$DASHBOARD_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Dashboard fetched"
echo ""

# Extract login time info
echo "3️⃣ Login Time Information:"
echo ""

LAST_LOGIN=$(echo "$DASHBOARD_RESPONSE" | jq -r '.data.user.lastLogin // "N/A"')
RECENT_LOGIN=$(echo "$DASHBOARD_RESPONSE" | jq -r '.data.widgets.attendance.recentLoginTime // "N/A"')
TOTAL_TIME=$(echo "$DASHBOARD_RESPONSE" | jq -r '.data.widgets.attendance.totalLoginTimeToday.formatted // "N/A"')
SESSIONS=$(echo "$DASHBOARD_RESPONSE" | jq -r '.data.widgets.attendance.totalLoginTimeToday.sessionsCount // 0')

echo "   Last Login: $LAST_LOGIN"
echo "   Recent Login Time: $RECENT_LOGIN"
echo "   Total Login Time Today: $TOTAL_TIME"
echo "   Sessions Count: $SESSIONS"
echo ""

# Show full attendance widget
echo "4️⃣ Full Attendance Widget:"
echo "$DASHBOARD_RESPONSE" | jq '.data.widgets.attendance'
echo ""

echo ""
echo "5️⃣ Full Dashboard Response (attendance widget):"
echo "$DASHBOARD_RESPONSE" | jq '.data.widgets.attendance'

echo ""
echo "6️⃣ User Info:"
echo "$DASHBOARD_RESPONSE" | jq '.data.user'

echo ""
echo "✅ Test completed"
