#!/bin/bash

###############################################################################
# Debug Frontend Request - Compare with Working Request
# This shows what the frontend SHOULD send
###############################################################################

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

echo "=========================================="
echo "🔍 Frontend Request Debug Guide"
echo "=========================================="
echo ""
echo "This shows what your FRONTEND should send:"
echo ""

# Step 1: Login
echo "Step 1: Login (Frontend should do this first)"
echo "----------------------------------------"
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
echo "   Token: ${TOKEN:0:50}..."
echo "   Tenant ID: $TENANT_ID"
echo ""

# Step 2: Show what frontend should send
echo "Step 2: What Frontend Should Send"
echo "----------------------------------------"
echo ""
echo -e "${BLUE}Request URL:${NC}"
echo "   $API_BASE/api/hr/employees"
echo ""
echo -e "${BLUE}Request Method:${NC}"
echo "   POST"
echo ""
echo -e "${BLUE}Request Headers (REQUIRED):${NC}"
echo "   Authorization: Bearer $TOKEN"
echo "   x-tenant-id: $TENANT_ID"
echo "   Content-Type: application/json"
echo ""
echo -e "${BLUE}Request Payload (REQUIRED FIELDS):${NC}"
cat <<EOF
{
  "employeeId": "EMP-FRONTEND-$(date +%s)",  // ⚠️ REQUIRED!
  "firstName": "Frontend",                    // ⚠️ REQUIRED (or fullName)
  "lastName": "Test",
  "fullName": "Frontend Test",               // ⚠️ REQUIRED (or firstName)
  "email": "frontendtest@test.com",          // ⚠️ REQUIRED!
  "phone": "+91 9876543210",
  "department": "Sales",                     // ⚠️ REQUIRED!
  "designation": "Sales Executive",
  "status": "active"
}
EOF
echo ""
echo -e "${YELLOW}⚠️  CRITICAL: Frontend MUST include 'employeeId'!${NC}"
echo ""

# Step 3: Test with correct payload
echo "Step 3: Test with Correct Payload"
echo "----------------------------------------"
RANDOM_ID=$(date +%s | tail -c 6)
EMPLOYEE_DATA=$(cat <<EOF
{
  "employeeId": "EMP-FRONTEND-${RANDOM_ID}",
  "firstName": "Frontend",
  "lastName": "Test${RANDOM_ID}",
  "email": "frontendtest${RANDOM_ID}@test.com",
  "phone": "+91 98765${RANDOM_ID}",
  "department": "Sales",
  "designation": "Sales Executive",
  "status": "active"
}
EOF
)

echo "Sending request..."
CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/hr/employees" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d "$EMPLOYEE_DATA")

HTTP_CODE=$(echo "$CREATE_RESPONSE" | tail -n1)
BODY=$(echo "$CREATE_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "201" ] || [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✅ SUCCESS! (HTTP $HTTP_CODE)${NC}"
  echo ""
  echo "This is what your frontend should receive:"
  echo "$BODY" | jq '.data | {employeeId, fullName, email, status}' 2>/dev/null
else
  echo -e "${RED}❌ FAILED (HTTP $HTTP_CODE)${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi
echo ""

# Step 4: Common mistakes
echo "=========================================="
echo "🚨 Common Frontend Mistakes"
echo "=========================================="
echo ""
echo "1. ❌ Missing 'employeeId' in payload"
echo "   Fix: Add employeeId = \`EMP-\${Date.now()}\`"
echo ""
echo "2. ❌ Using localhost:3000 instead of production URL"
echo "   Fix: Use process.env.NEXT_PUBLIC_API_BASE_URL"
echo ""
echo "3. ❌ Missing Authorization header"
echo "   Fix: Add Authorization: Bearer \${token}"
echo ""
echo "4. ❌ Missing x-tenant-id header"
echo "   Fix: Add x-tenant-id: \${tenantId}"
echo ""
echo "5. ❌ Not handling errors"
echo "   Fix: Check response.status and show errors to user"
echo ""

# Step 5: Frontend code example
echo "=========================================="
echo "✅ Correct Frontend Code Example"
echo "=========================================="
echo ""
cat <<'EOF'
// ✅ CORRECT: Frontend employee creation
import apiClient from '@/api/client';

export const createEmployee = async (formData) => {
  // ⚠️ CRITICAL: Generate employeeId if not provided
  const employeeId = formData.employeeId || `EMP-${Date.now()}`;
  
  // ⚠️ CRITICAL: Ensure fullName exists
  const fullName = formData.fullName || 
    (formData.firstName && formData.lastName 
      ? `${formData.firstName} ${formData.lastName}` 
      : formData.firstName || '');
  
  const payload = {
    employeeId: employeeId,  // ⚠️ REQUIRED!
    firstName: formData.firstName,
    lastName: formData.lastName,
    fullName: fullName,
    email: formData.email,  // ⚠️ REQUIRED!
    phone: formData.phone || '',
    department: formData.department,  // ⚠️ REQUIRED!
    designation: formData.designation || formData.jobTitle,
    status: formData.status || 'active',
  };
  
  try {
    const response = await apiClient.post('/api/hr/employees', payload);
    
    if (response.data.success) {
      return response.data;
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    console.error('Employee creation failed:', error);
    throw error;
  }
};
EOF

echo ""
echo "=========================================="
echo "✅ Debug Complete!"
echo "=========================================="
echo ""
echo "📝 Next Steps:"
echo "1. Check browser DevTools Network tab"
echo "2. Compare your frontend request with the example above"
echo "3. Verify all required fields are present"
echo "4. Verify headers are correct"
echo ""
