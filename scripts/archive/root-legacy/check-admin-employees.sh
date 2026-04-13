#!/bin/bash

###############################################################################
# Check Employees with Admin Credentials
# Login: Admin@lenstrack.com / Kadarkhan@123
###############################################################################

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

ADMIN_EMAIL="Admin@lenstrack.com"
ADMIN_PASSWORD="Kadarkhan@123"

echo "=========================================="
echo "👤 Admin Employee Count Check"
echo "=========================================="
echo ""
echo "Login: $ADMIN_EMAIL"
echo ""

# Step 1: Login
echo "Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\"
  }")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // .data.token // empty')
TENANT_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.tenantId // .data.tenantId // "default"')
USER_ROLE=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.role // "N/A"')
USER_EMAIL=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.email // "N/A"')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  echo "Response:"
  echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo "   Email: $USER_EMAIL"
echo "   Role: $USER_ROLE"
echo "   Tenant ID: $TENANT_ID"
echo ""

# Step 2: Get Employees
echo "Step 2: Fetching employees..."
echo "Request: GET $API_BASE/api/hr/employees"
echo "Headers: x-tenant-id: $TENANT_ID"
echo ""

EMPLOYEES_RESPONSE=$(curl -s -X GET "$API_BASE/api/hr/employees?limit=1000" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json")

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_BASE/api/hr/employees?limit=1000" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

if [ "$HTTP_CODE" != "200" ]; then
  echo -e "${RED}❌ Failed to fetch employees (HTTP: $HTTP_CODE)${NC}"
  echo "$EMPLOYEES_RESPONSE" | jq '.' 2>/dev/null || echo "$EMPLOYEES_RESPONSE"
  exit 1
fi

# Extract count
TOTAL=$(echo "$EMPLOYEES_RESPONSE" | jq '.pagination.total // (.data | length) // 0' 2>/dev/null || echo "0")
DATA_ARRAY=$(echo "$EMPLOYEES_RESPONSE" | jq '.data // []' 2>/dev/null)
ACTUAL_COUNT=$(echo "$DATA_ARRAY" | jq 'length' 2>/dev/null || echo "0")

echo -e "${GREEN}✅ Request successful${NC}"
echo ""
echo "=========================================="
echo "📊 Employee Count Results"
echo "=========================================="
echo ""
echo "Tenant ID: $TENANT_ID"
echo -e "${GREEN}Total Employees: $TOTAL${NC}"
echo "Employees in Response: $ACTUAL_COUNT"
echo ""

# Show employee list
echo "=========================================="
echo "👥 Employee List"
echo "=========================================="
echo ""

if [ "$ACTUAL_COUNT" -gt 0 ]; then
  echo "$EMPLOYEES_RESPONSE" | jq -r '.data[] | "\(.employeeId // .employee_id // "N/A") - \(.fullName // .name // "N/A") - \(.email // "N/A")"' 2>/dev/null | nl -w2 -s'. '
else
  echo "No employees found"
fi

echo ""
echo "=========================================="
echo "📄 Employee Details (First 5)"
echo "=========================================="
echo ""

echo "$EMPLOYEES_RESPONSE" | jq '.data[0:5] | .[] | {
  employeeId: .employeeId // .employee_id,
  name: .fullName // .name,
  email: .email,
  department: .department,
  designation: .designation // .jobTitle,
  status: .status,
  createdAt: .createdAt // .created_at
}' 2>/dev/null

echo ""
echo "=========================================="
echo "✅ Complete!"
echo "=========================================="
echo ""
echo -e "${GREEN}Total Employees: $TOTAL${NC}"
echo ""
