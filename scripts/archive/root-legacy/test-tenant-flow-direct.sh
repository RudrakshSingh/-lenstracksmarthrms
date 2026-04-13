#!/bin/bash
API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

echo "🧪 Testing Tenant Creation Flow"
echo "================================"
echo ""

# Step 1: Try to login (might fail, but let's see)
echo "Step 1: Testing Upcapto login..."
LOGIN=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@upcapto.com","password":"Upcapto@2026"}')

echo "$LOGIN" | jq '.' || echo "$LOGIN"
echo ""

# If login fails, let's create a test tenant directly via API
echo "Step 2: Creating test tenant..."
TENANT_NAME="Test Company $(date +%s)"
TENANT_EMAIL="admin@testcompany$(date +%s).com"

TENANT_RESPONSE=$(curl -s -X POST "$API_BASE/api/admin/tenants" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$TENANT_NAME\",
    \"email\": \"$TENANT_EMAIL\",
    \"phone\": \"+91-9876543210\",
    \"plan\": \"Professional\"
  }")

echo "$TENANT_RESPONSE" | jq '.' || echo "$TENANT_RESPONSE"
