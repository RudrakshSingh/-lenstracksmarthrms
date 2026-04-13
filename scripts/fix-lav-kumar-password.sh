#!/bin/bash

# Script to fix Lav Kumar password in auth-service
# This ensures password is set correctly in auth-service database

ALB_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com"
EMAIL="lav@lenstrack.com"
NEW_PASSWORD="lav@1234"
TENANT="lenstrack"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Fixing Lav Kumar Password in Auth Service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "=== Step 1: Admin Login ==="
ADMIN_RESP=$(curl -s -X POST "$ALB_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lenstrack.com","password":"AdminPass123!"}')

ADMIN_TOKEN=$(echo "$ADMIN_RESP" | jq -r '.data.accessToken // .accessToken // empty' 2>/dev/null)
if [ -z "$ADMIN_TOKEN" ]; then
  ADMIN_TOKEN=$(echo "$ADMIN_RESP" | grep -oE '"accessToken"\s*:\s*"[^"]*"' | cut -d'"' -f4 | head -1)
fi

if [ -z "$ADMIN_TOKEN" ] || [ ${#ADMIN_TOKEN} -lt 20 ]; then
  echo "❌ Admin login failed"
  exit 1
fi

echo "✅ Admin login successful"
echo ""

echo "=== Step 2: Register/Create User in Auth Service ==="
REGISTER_DATA="{
  \"tenantId\": \"$TENANT\",
  \"employee_id\": \"EMP-2026-650044\",
  \"name\": \"Lav Kumar\",
  \"email\": \"$EMAIL\",
  \"phone\": \"+91-9876543210\",
  \"password\": \"$NEW_PASSWORD\",
  \"role\": \"hr\",
  \"department\": \"HR\",
  \"designation\": \"HR Head\",
  \"joining_date\": \"2026-01-01\"
}"

REGISTER_RESP=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$ALB_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "$REGISTER_DATA")

REGISTER_HTTP=$(echo "$REGISTER_RESP" | grep "HTTP_CODE:" | cut -d: -f2)
REGISTER_BODY=$(echo "$REGISTER_RESP" | sed '/HTTP_CODE:/d')

echo "HTTP Status: $REGISTER_HTTP"

if [ "$REGISTER_HTTP" = "200" ] || [ "$REGISTER_HTTP" = "201" ]; then
  echo "✅ User created/registered in auth-service"
elif [ "$REGISTER_HTTP" = "400" ]; then
  ERROR_MSG=$(echo "$REGISTER_BODY" | jq -r '.message // .error // "Bad Request"' 2>/dev/null)
  if echo "$ERROR_MSG" | grep -qi "already exists\|duplicate\|email.*exists"; then
    echo "✅ User already exists in auth-service"
    echo "   Error: $ERROR_MSG"
    echo ""
    echo "⚠️  Password needs to be updated in auth-service"
    echo "   Note: Password update requires current password or admin access"
  else
    echo "❌ Registration failed: $ERROR_MSG"
    echo "$REGISTER_BODY" | head -5
  fi
else
  echo "⚠️  Registration status: $REGISTER_HTTP"
  echo "$REGISTER_BODY" | head -5
fi

echo ""
echo "=== Step 3: Test Login ==="
sleep 2
LOGIN_RESP=$(curl -s -X POST "$ALB_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$NEW_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESP" | jq -r '.data.accessToken // .accessToken // empty' 2>/dev/null)

if [ -n "$TOKEN" ] && [ ${#TOKEN} -gt 20 ]; then
  echo "✅✅✅ LOGIN SUCCESSFUL!"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔐 Lav Kumar - Login Credentials"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Email: $EMAIL"
  echo "Password: $NEW_PASSWORD"
  echo "Tenant: $TENANT"
  echo ""
  USER_INFO=$(echo "$LOGIN_RESP" | jq -r '.data.user // .user' 2>/dev/null)
  echo "User Details:"
  echo "$USER_INFO" | jq -r '"   Name: \(.name // .firstName // "N/A") \(.lastName // "")\n   Employee ID: \(.employeeId // .employee_id // "N/A")\n   Role: \(.role // "N/A")"' 2>/dev/null
  echo ""
  echo "✅✅✅ Password successfully set to: $NEW_PASSWORD"
else
  echo "❌ Login still failing"
  ERROR_MSG=$(echo "$LOGIN_RESP" | jq -r '.message // .error // "Unknown error"' 2>/dev/null)
  echo "   Error: $ERROR_MSG"
  echo ""
  echo "⚠️  Issue: User might exist but password is different"
  echo "   Solution: Password needs to be updated in auth-service database"
  echo "   This requires:"
  echo "   1. Admin access to auth-service database"
  echo "   2. Or user to know current password to change it"
  echo "   3. Or implement forgot password feature"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
