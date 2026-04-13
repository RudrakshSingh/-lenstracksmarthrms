#!/bin/bash

###############################################################################
# Test Frontend to Backend Employee Creation Flow
# This simulates what frontend does
###############################################################################

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

echo "=========================================="
echo "🧪 Testing Frontend to Backend Flow"
echo "=========================================="
echo ""

# Step 1: Login (as frontend would)
echo "Step 1: Login (simulating frontend)"
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@upcapto.com",
    "password": "Upcapto@2026"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // .data.token // empty')
TENANT_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.tenantId // "upcapto"')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo "   Tenant: $TENANT_ID"
echo ""

# Step 2: Create Employee (exactly as frontend would)
echo "Step 2: Create Employee (simulating frontend form submission)"
RANDOM_ID=$(date +%s | tail -c 6)
EMPLOYEE_DATA=$(cat <<EOF
{
  "firstName": "Frontend",
  "lastName": "Test${RANDOM_ID}",
  "email": "frontendtest${RANDOM_ID}@test.com",
  "phone": "+91 98765${RANDOM_ID}",
  "employeeId": "EMP-FRONTEND-${RANDOM_ID}",
  "designation": "Sales Executive",
  "department": "Sales",
  "status": "active",
  "joiningDate": "$(date +%Y-%m-%d)"
}
EOF
)

echo "Request URL: $API_BASE/api/hr/employees"
echo "Request Headers:"
echo "  Authorization: Bearer $TOKEN"
echo "  x-tenant-id: $TENANT_ID"
echo ""

CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/hr/employees" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d "$EMPLOYEE_DATA")

HTTP_CODE=$(echo "$CREATE_RESPONSE" | tail -n1)
BODY=$(echo "$CREATE_RESPONSE" | sed '$d')

echo "Response HTTP Code: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" == "201" ] || [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✅ Employee created successfully!${NC}"
  
  EMP_ID=$(echo "$BODY" | jq -r '.data.id // .data._id // empty')
  EMP_EMAIL=$(echo "$BODY" | jq -r '.data.email // empty')
  
  echo "   Employee ID: $EMP_ID"
  echo "   Email: $EMP_EMAIL"
  echo ""
  
  # Step 3: Verify in DB
  echo "Step 3: Verify Employee in Database"
  sleep 2
  
  VERIFY_RESPONSE=$(curl -s -X GET "$API_BASE/api/hr/employees?search=EMP-FRONTEND-${RANDOM_ID}" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-tenant-id: $TENANT_ID")
  
  VERIFY_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_BASE/api/hr/employees?search=EMP-FRONTEND-${RANDOM_ID}" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-tenant-id: $TENANT_ID")
  
  if [ "$VERIFY_HTTP" == "200" ]; then
    FOUND=$(echo "$VERIFY_RESPONSE" | jq '.data[]? | select(.employeeId == "EMP-FRONTEND-'$RANDOM_ID'")' 2>/dev/null)
    
    if [ -n "$FOUND" ] && [ "$FOUND" != "null" ]; then
      echo -e "${GREEN}✅ Employee found in database!${NC}"
      echo "$FOUND" | jq '{employeeId, name: .fullName, email, createdAt}'
    else
      echo -e "${YELLOW}⚠️  Employee created but not found in search${NC}"
      echo "   This might be a search/indexing delay"
    fi
  else
    echo -e "${YELLOW}⚠️  Could not verify (HTTP: $VERIFY_HTTP)${NC}"
  fi
else
  echo -e "${RED}❌ Employee creation failed (HTTP: $HTTP_CODE)${NC}"
  echo ""
  echo "Possible issues:"
  echo "1. Backend not receiving request"
  echo "2. Validation error"
  echo "3. Database connection issue"
  echo "4. Tenant ID mismatch"
fi

echo ""
echo "=========================================="
echo "✅ Test Complete!"
echo "=========================================="
