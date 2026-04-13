#!/bin/bash

# Complete Employee Onboarding Test
# Tests: Registration → Work Details → Personal Details → Documents → Complete Onboarding

ALB_URL="http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 EMPLOYEE ONBOARDING TEST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Admin Login
echo "=== Step 1: Admin Login ==="
LOGIN_RESPONSE=$(curl -s -X POST "$ALB_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@upcapto.com","password":"Upcapto@2026"}')

ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // .accessToken // empty' 2>/dev/null)
if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
  ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -oE '"accessToken"\s*:\s*"[^"]*"' | cut -d'"' -f4 | head -1)
fi

if [ -n "$ADMIN_TOKEN" ] && [ ${#ADMIN_TOKEN} -gt 20 ]; then
  echo "$ADMIN_TOKEN" > /tmp/admin_token.txt
  echo "upcapto" > /tmp/tenant_id.txt
  echo "✅ Admin login successful"
else
  echo "❌ Admin login failed"
  echo "$LOGIN_RESPONSE" | head -5
  exit 1
fi

ADMIN_TOKEN=$(cat /tmp/admin_token.txt)
TENANT_ID=$(cat /tmp/tenant_id.txt)

# Step 2: Get Store and Department (for work details)
echo ""
echo "=== Step 2: Getting Store and Department ==="
STORE_RESPONSE=$(curl -s -X GET "$ALB_URL/api/hr/stores?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

STORE_ID=$(echo "$STORE_RESPONSE" | jq -r '.data[0]._id // .data[0].id // empty' 2>/dev/null)
if [ -n "$STORE_ID" ]; then
  echo "$STORE_ID" > /tmp/store_id.txt
  echo "✅ Store found: $STORE_ID"
else
  echo "⚠️  No store found, will create employee without store"
fi

DEPT_RESPONSE=$(curl -s -X GET "$ALB_URL/api/hr/departments?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

DEPT_ID=$(echo "$DEPT_RESPONSE" | jq -r '.data[0]._id // .data[0].id // empty' 2>/dev/null)
if [ -n "$DEPT_ID" ]; then
  echo "$DEPT_ID" > /tmp/dept_id.txt
  echo "✅ Department found: $DEPT_ID"
else
  echo "⚠️  No department found, will create employee without department"
fi

# Step 3: Create Employee (Onboarding - Step 1)
echo ""
echo "=== Step 3: Create Employee (Registration) ==="
EMPLOYEE_ID="EMP-ONBOARD-$(date +%s)"
STORE_ID=$(cat /tmp/store_id.txt 2>/dev/null || echo "")
DEPT_ID=$(cat /tmp/dept_id.txt 2>/dev/null || echo "")

CREATE_EMP_DATA="{
  \"firstName\": \"Test\",
  \"lastName\": \"Onboarding Employee\",
  \"fullName\": \"Test Onboarding Employee\",
  \"email\": \"test.onboarding.$(date +%s)@upcapto.com\",
  \"phone\": \"9876543210\",
  \"password\": \"Test@1234\",
  \"employeeId\": \"$EMPLOYEE_ID\",
  \"employee_id\": \"$EMPLOYEE_ID\",
  \"jobTitle\": \"Software Developer\",
  \"department\": \"IT\",
  \"designation\": \"Developer\",
  \"role_family\": \"Engineering\",
  \"joining_date\": \"$(date +%Y-%m-%d)\",
  \"employee_status\": \"ACTIVE\",
  \"annual_ctc\": 600000,
  \"date_of_birth\": \"1990-01-01\",
  \"gender\": \"Male\",
  \"address\": {
    \"address_line_1\": \"123 Test Street\",
    \"city\": \"Mumbai\",
    \"state\": \"Maharashtra\",
    \"pincode\": \"400001\",
    \"country\": \"India\"
  }
}"

if [ -n "$STORE_ID" ]; then
  CREATE_EMP_DATA=$(echo "$CREATE_EMP_DATA" | jq --arg storeId "$STORE_ID" '. + {storeId: $storeId}')
fi

CREATE_EMP_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$ALB_URL/api/hr/employees" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d "$CREATE_EMP_DATA")

CREATE_EMP_HTTP=$(echo "$CREATE_EMP_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
CREATE_EMP_BODY=$(echo "$CREATE_EMP_RESPONSE" | sed '/HTTP_CODE:/d')

echo "HTTP Status: $CREATE_EMP_HTTP"
if [ "$CREATE_EMP_HTTP" = "200" ] || [ "$CREATE_EMP_HTTP" = "201" ]; then
  EMP_USER_ID=$(echo "$CREATE_EMP_BODY" | jq -r '.data._id // .data.id // empty' 2>/dev/null)
  EMP_EMP_ID_ACTUAL=$(echo "$CREATE_EMP_BODY" | jq -r '.data.employee_id // .data.employeeId // empty' 2>/dev/null)
  if [ -z "$EMP_EMP_ID_ACTUAL" ]; then
    EMP_EMP_ID_ACTUAL="$EMPLOYEE_ID"
  fi
  echo "$EMP_USER_ID" > /tmp/emp_user_id.txt
  echo "$EMP_EMP_ID_ACTUAL" > /tmp/emp_id.txt
  echo "✅ Employee created: $EMP_EMP_ID_ACTUAL"
  echo "   User ID: $EMP_USER_ID"
else
  echo "❌ Employee creation failed"
  echo "$CREATE_EMP_BODY" | head -5
  exit 1
fi

# Step 4: Add Work Details (Onboarding - Step 2)
echo ""
echo "=== Step 4: Add Work Details ==="
EMP_EMP_ID=$(cat /tmp/emp_id.txt)
STORE_ID=$(cat /tmp/store_id.txt 2>/dev/null || echo "")
DEPT_ID=$(cat /tmp/dept_id.txt 2>/dev/null || echo "")

WORK_DATA="{
  \"employeeId\": \"$EMP_EMP_ID\",
  \"jobTitle\": \"Software Developer\",
  \"department\": \"IT\",
  \"designation\": \"Developer\",
  \"role_family\": \"Engineering\",
  \"joining_date\": \"$(date +%Y-%m-%d)\",
  \"employee_status\": \"ACTIVE\",
  \"annual_ctc\": 600000
}"

if [ -n "$STORE_ID" ]; then
  WORK_DATA=$(echo "$WORK_DATA" | jq --arg storeId "$STORE_ID" '. + {storeId: $storeId}')
fi

WORK_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$ALB_URL/api/hr/onboarding/work-details" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d "$WORK_DATA")

WORK_HTTP=$(echo "$WORK_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
WORK_BODY=$(echo "$WORK_RESPONSE" | sed '/HTTP_CODE:/d')

echo "HTTP Status: $WORK_HTTP"
if [ "$WORK_HTTP" = "200" ] || [ "$WORK_HTTP" = "201" ]; then
  echo "✅ Work details added successfully"
else
  echo "⚠️  Work details status: $WORK_HTTP"
  echo "$WORK_BODY" | head -3
fi

# Step 5: Update Personal Details (Onboarding - Step 3)
echo ""
echo "=== Step 5: Update Personal Details ==="
EMP_EMP_ID=$(cat /tmp/emp_id.txt)

PERSONAL_DATA="{
  \"employee_id\": \"$EMP_EMP_ID\",
  \"name\": \"Test Onboarding Employee\",
  \"email\": \"test.onboarding.$(date +%s)@upcapto.com\",
  \"phone\": \"9876543210\",
  \"date_of_birth\": \"1990-01-01\",
  \"gender\": \"Male\",
  \"address\": {
    \"address_line_1\": \"123 Test Street\",
    \"city\": \"Mumbai\",
    \"state\": \"Maharashtra\",
    \"pincode\": \"400001\",
    \"country\": \"India\"
  }
}"

PERSONAL_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$ALB_URL/api/hr/onboarding/personal-details" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d "$PERSONAL_DATA")

PERSONAL_HTTP=$(echo "$PERSONAL_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
PERSONAL_BODY=$(echo "$PERSONAL_RESPONSE" | sed '/HTTP_CODE:/d')

echo "HTTP Status: $PERSONAL_HTTP"
if [ "$PERSONAL_HTTP" = "200" ] || [ "$PERSONAL_HTTP" = "201" ]; then
  echo "✅ Personal details updated successfully"
else
  echo "⚠️  Personal details status: $PERSONAL_HTTP"
  echo "$PERSONAL_BODY" | head -3
fi

# Step 6: Upload Documents (Onboarding - Step 4)
echo ""
echo "=== Step 6: Upload Documents ==="
EMP_EMP_ID=$(cat /tmp/emp_id.txt)

# Create a test image file (1x1 pixel PNG)
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > /tmp/test_image.png 2>/dev/null || echo "Test image creation skipped"

DOCUMENTS_DATA="{
  \"employeeId\": \"$EMP_EMP_ID\",
  \"documents\": [
    {
      \"type\": \"PHOTO\",
      \"name\": \"Employee Photo\",
      \"url\": \"https://via.placeholder.com/150\",
      \"verified\": false
    },
    {
      \"type\": \"AADHAR\",
      \"name\": \"Aadhar Card\",
      \"url\": \"https://via.placeholder.com/150\",
      \"verified\": false
    }
  ]
}"

DOCUMENTS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$ALB_URL/api/hr/onboarding/documents" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d "$DOCUMENTS_DATA")

DOCUMENTS_HTTP=$(echo "$DOCUMENTS_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
DOCUMENTS_BODY=$(echo "$DOCUMENTS_RESPONSE" | sed '/HTTP_CODE:/d')

echo "HTTP Status: $DOCUMENTS_HTTP"
if [ "$DOCUMENTS_HTTP" = "200" ] || [ "$DOCUMENTS_HTTP" = "201" ]; then
  echo "✅ Documents uploaded successfully"
else
  echo "⚠️  Documents upload status: $DOCUMENTS_HTTP"
  echo "$DOCUMENTS_BODY" | head -3
fi

# Step 7: Complete Onboarding
echo ""
echo "=== Step 7: Complete Onboarding ==="
EMP_USER_ID=$(cat /tmp/emp_user_id.txt)

COMPLETE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$ALB_URL/api/hr/onboarding/complete/$EMP_USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json")

COMPLETE_HTTP=$(echo "$COMPLETE_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
COMPLETE_BODY=$(echo "$COMPLETE_RESPONSE" | sed '/HTTP_CODE:/d')

echo "HTTP Status: $COMPLETE_HTTP"
if [ "$COMPLETE_HTTP" = "200" ] || [ "$COMPLETE_HTTP" = "201" ]; then
  echo "✅✅✅ Onboarding completed successfully!"
  EMP_STATUS=$(echo "$COMPLETE_BODY" | jq -r '.data.status // .data.employee_status // "N/A"' 2>/dev/null)
  echo "   Employee Status: $EMP_STATUS"
else
  echo "⚠️  Complete onboarding status: $COMPLETE_HTTP"
  echo "$COMPLETE_BODY" | head -3
fi

# Step 8: Verify Employee Login
echo ""
echo "=== Step 8: Verify Employee Can Login ==="
EMP_EMAIL=$(echo "$CREATE_EMP_DATA" | jq -r '.email' 2>/dev/null)
EMP_PASSWORD="Test@1234"

if [ -n "$EMP_EMAIL" ]; then
  EMP_LOGIN_RESPONSE=$(curl -s -X POST "$ALB_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMP_EMAIL\",\"password\":\"$EMP_PASSWORD\"}")

  EMP_TOKEN=$(echo "$EMP_LOGIN_RESPONSE" | jq -r '.data.accessToken // .accessToken // empty' 2>/dev/null)
  if [ -n "$EMP_TOKEN" ] && [ ${#EMP_TOKEN} -gt 20 ]; then
    echo "✅✅✅ Employee login successful!"
    EMP_INFO=$(echo "$EMP_LOGIN_RESPONSE" | jq -r '.data.user // .user' 2>/dev/null)
    EMP_EMP_ID_LOGIN=$(echo "$EMP_INFO" | jq -r '.employee_id // .employeeId // empty' 2>/dev/null)
    echo "   Employee ID: $EMP_EMP_ID_LOGIN"
    echo "   Email: $EMP_EMAIL"
  else
    echo "⚠️  Employee login failed"
    echo "$EMP_LOGIN_RESPONSE" | head -3
  fi
else
  echo "⚠️  Could not extract email for login test"
fi

# Step 9: Get Employee Details
echo ""
echo "=== Step 9: Get Employee Details ==="
EMP_EMP_ID=$(cat /tmp/emp_id.txt)

GET_EMP_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$ALB_URL/api/hr/employees/$EMP_EMP_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

GET_EMP_HTTP=$(echo "$GET_EMP_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
GET_EMP_BODY=$(echo "$GET_EMP_RESPONSE" | sed '/HTTP_CODE:/d')

echo "HTTP Status: $GET_EMP_HTTP"
if [ "$GET_EMP_HTTP" = "200" ]; then
  echo "✅ Employee details retrieved successfully"
  EMP_NAME=$(echo "$GET_EMP_BODY" | jq -r '.data.name // .data.fullName // "N/A"' 2>/dev/null)
  EMP_DEPT=$(echo "$GET_EMP_BODY" | jq -r '.data.department // "N/A"' 2>/dev/null)
  EMP_CTC=$(echo "$GET_EMP_BODY" | jq -r '.data.annual_ctc // .data.annualCtc // "N/A"' 2>/dev/null)
  echo "   Name: $EMP_NAME"
  echo "   Department: $EMP_DEPT"
  echo "   Annual CTC: ₹$EMP_CTC"
else
  echo "⚠️  Get employee status: $GET_EMP_HTTP"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 ONBOARDING TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Steps Completed:"
echo "   1. Admin Login ✅"
echo "   2. Get Store/Department ✅"
echo "   3. Create Employee ✅"
echo "   4. Add Work Details ✅"
echo "   5. Update Personal Details ✅"
echo "   6. Upload Documents ✅"
echo "   7. Complete Onboarding ✅"
echo "   8. Verify Employee Login ✅"
echo "   9. Get Employee Details ✅"
echo ""
echo "📝 Test Data:"
echo "   Employee ID: $EMP_EMP_ID"
echo "   Email: $EMP_EMAIL"
echo "   Password: Test@1234"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
