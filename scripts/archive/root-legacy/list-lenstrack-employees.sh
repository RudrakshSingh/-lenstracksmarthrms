#!/bin/bash

###############################################################################
# List All Employees in Lenstrack Tenant
###############################################################################

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

echo "=========================================="
echo "👥 All Employees in Lenstrack Tenant"
echo "=========================================="
echo ""

# Try to login as admin first
echo "Logging in as admin..."
ADMIN_LOGIN=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@upcapto.com",
    "password": "Upcapto@2026"
  }')

TOKEN=$(echo "$ADMIN_LOGIN" | jq -r '.data.accessToken // .data.token // empty')
TENANT_ID="upcapto"

# If admin fails, try lenstrack tenant directly
if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "Trying lenstrack tenant..."
  ADMIN_LOGIN=$(curl -s -X POST "$API_BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "lenstrack01@gmail.com",
      "password": "cnbxs2b9A1!"
    }')
  
  TOKEN=$(echo "$ADMIN_LOGIN" | jq -r '.data.accessToken // .data.token // empty')
  TENANT_ID=$(echo "$ADMIN_LOGIN" | jq -r '.data.user.tenantId // "default"')
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo "   Tenant: $TENANT_ID"
echo ""

# Get all employees
echo "Fetching all employees..."
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

# Extract employee count
TOTAL=$(echo "$EMPLOYEES_RESPONSE" | jq '.pagination.total // (.data | length) // 0' 2>/dev/null || echo "0")

echo -e "${GREEN}✅ Found $TOTAL employees${NC}"
echo ""

# Display all employees
echo "=========================================="
echo "📋 Employee List (Total: $TOTAL)"
echo "=========================================="
echo ""

# Show employee names and details
echo "$EMPLOYEES_RESPONSE" | jq -r '.data[] | 
  "Employee ID: \(.employeeId // .employee_id // "N/A")
Name: \(.fullName // .name // "N/A")
Email: \(.email // "N/A")
Phone: \(.phone // "N/A")
Designation: \(.designation // "N/A")
Department: \(.department // "N/A")
Status: \(.status // "N/A")
Created: \(.createdAt // .created_at // "N/A")
───────────────────────────────────────────────"
' 2>/dev/null

echo ""
echo "=========================================="
echo "📄 Employee Names Only"
echo "=========================================="
echo ""

# Just names
echo "$EMPLOYEES_RESPONSE" | jq -r '.data[] | "\(.fullName // .name // "N/A") - \(.employeeId // .employee_id // "N/A")"' 2>/dev/null | nl -w2 -s'. '

echo ""
echo "=========================================="
echo "📊 Summary"
echo "=========================================="
echo "Total Employees: $TOTAL"
echo ""

echo ""
echo "=========================================="
echo "✅ Complete!"
echo "=========================================="
