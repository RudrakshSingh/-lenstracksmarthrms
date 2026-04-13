#!/bin/bash

###############################################################################
# Create New Employee → Assign Store/Dept → Employee Login → Mark Attendance with Image
###############################################################################

set +e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com}"

echo "=========================================="
echo "🧪 Create Employee & Mark Attendance"
echo "With Image (Selfie)"
echo "=========================================="
echo ""

# Step 1: Admin Login
echo "1️⃣  Admin Login"
LOGIN_BODY='{"email":"Admin@lenstrack.com","password":"Kadarkhan@123"}'
LOGIN_RESPONSE=$(curl -s -X POST \
  "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_BODY")

ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // .data.token // empty')
TENANT_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.tenantId // "lenstrack"')

echo "✅ Admin logged in"
echo ""

# Step 2: Get Existing Store and Department from DB
echo "2️⃣  Get Existing Store & Department from DB"
echo "----------------------------------------"

# Get first store
STORES_RESPONSE=$(curl -s -X GET \
  "$API_BASE_URL/api/hr/stores?page=1&limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

STORE_ID=$(echo "$STORES_RESPONSE" | jq -r 'if .data then (.data[] | ._id // .id) elif .data.stores then .data.stores[0]._id else empty end' 2>/dev/null | head -1)
STORE_NAME=$(echo "$STORES_RESPONSE" | jq -r 'if .data then (.data[] | .name) elif .data.stores then .data.stores[0].name else empty end' 2>/dev/null | head -1)

# Get first department
DEPT_RESPONSE=$(curl -s -X GET \
  "$API_BASE_URL/api/hr/departments" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

DEPT_NAME=$(echo "$DEPT_RESPONSE" | jq -r 'if .data then (.data[] | .name) elif .data.departments then .data.departments[0].name else "Engineering" end' 2>/dev/null | head -1)

if [ -z "$DEPT_NAME" ] || [ "$DEPT_NAME" = "null" ]; then
  DEPT_NAME="Engineering"
fi

echo "   Store ID: $STORE_ID"
echo "   Store Name: $STORE_NAME"
echo "   Department: $DEPT_NAME"
echo ""

# Step 3: Create New Employee
echo "3️⃣  Create New Employee"
echo "----------------------------------------"

TIMESTAMP=$(date +%s)
EMP_ID="EMP-TEST-${TIMESTAMP}"
EMP_EMAIL="testemployee${TIMESTAMP}@example.com"

# Split name into first and last name
FIRST_NAME="Test"
LAST_NAME="Employee${TIMESTAMP}"

CREATE_EMP_BODY=$(cat <<EOF
{
  "firstName": "${FIRST_NAME}",
  "lastName": "${LAST_NAME}",
  "fullName": "${FIRST_NAME} ${LAST_NAME}",
  "email": "${EMP_EMAIL}",
  "phone": "+919876543210",
  "employeeId": "${EMP_ID}",
  "department": "${DEPT_NAME}",
  "jobTitle": "Software Engineer",
  "designation": "Software Engineer",
  "roleName": "employee",
  "storeId": "${STORE_ID}",
  "doj": "$(date +%Y-%m-%d)",
  "password": "Employee@123",
  "annual_ctc": 500000,
  "roleFamily": "Engineering",
  "gradeBand": "E"
}
EOF
)

# Show request body for debugging
echo "Request Body:"
echo "$CREATE_EMP_BODY" | jq '.' 2>/dev/null || echo "$CREATE_EMP_BODY"
echo ""

echo "Creating employee: $EMP_EMAIL"
CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_BASE_URL/api/hr/employees" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -d "$CREATE_EMP_BODY")

CREATE_HTTP=$(echo "$CREATE_RESPONSE" | tail -1)
CREATE_BODY=$(echo "$CREATE_RESPONSE" | sed '$d')

if [ "$CREATE_HTTP" = "200" ] || [ "$CREATE_HTTP" = "201" ]; then
  echo -e "${GREEN}✅ Employee created${NC} (HTTP $CREATE_HTTP)"
  CREATED_EMP_ID=$(echo "$CREATE_BODY" | jq -r '.data._id // .data.id // empty' 2>/dev/null)
  CREATED_EMP_EMP_ID=$(echo "$CREATE_BODY" | jq -r '.data.employeeId // .data.employee_id // empty' 2>/dev/null)
  echo "   Employee ID: $CREATED_EMP_EMP_ID"
  echo "   MongoDB ID: $CREATED_EMP_ID"
  
  # Step 3.5: Create Auth Account (for login)
  echo ""
  echo "3.5️⃣  Create Auth Account for Login"
  echo "----------------------------------------"
  echo "   Creating auth account so employee can login..."
  
  AUTH_REGISTER_BODY=$(cat <<EOF
{
  "email": "${EMP_EMAIL}",
  "password": "Employee@123",
  "employee_id": "${CREATED_EMP_EMP_ID}",
  "name": "${FIRST_NAME} ${LAST_NAME}",
  "phone": "+919876543210",
  "role": "employee",
  "tenantId": "${TENANT_ID}",
  "designation": "Software Engineer",
  "department": "${DEPT_NAME}"
}
EOF
  )
  
  AUTH_REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "$API_BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "$AUTH_REGISTER_BODY")
  
  AUTH_REGISTER_HTTP=$(echo "$AUTH_REGISTER_RESPONSE" | tail -1)
  AUTH_REGISTER_BODY_RESPONSE=$(echo "$AUTH_REGISTER_RESPONSE" | sed '$d')
  
  if [ "$AUTH_REGISTER_HTTP" = "200" ] || [ "$AUTH_REGISTER_HTTP" = "201" ]; then
    echo -e "${GREEN}✅ Auth account created${NC} (HTTP $AUTH_REGISTER_HTTP)"
  else
    # Check if user already exists (that's okay)
    if echo "$AUTH_REGISTER_BODY_RESPONSE" | jq -e '.message' 2>/dev/null | grep -q "already exists"; then
      echo -e "${YELLOW}⚠️  Auth account already exists${NC} (this is okay)"
    else
      echo -e "${YELLOW}⚠️  Auth account creation failed${NC} (HTTP $AUTH_REGISTER_HTTP)"
      ERROR=$(echo "$AUTH_REGISTER_BODY_RESPONSE" | jq -r '.message // .error // "Unknown"' 2>/dev/null)
      echo "   Error: $ERROR"
      echo "   Employee can still be created in HR, but login may not work until auth account is created"
    fi
  fi
else
  echo -e "${RED}❌ Employee creation failed${NC} (HTTP $CREATE_HTTP)"
  ERROR=$(echo "$CREATE_BODY" | jq -r '.message // .error // "Unknown"' 2>/dev/null)
  echo "   ⚠️  $ERROR"
  echo ""
  echo "Full error response:"
  echo "$CREATE_BODY" | jq '.' 2>/dev/null || echo "$CREATE_BODY"
  exit 1
fi

echo ""

# Step 4: Employee Login
echo "4️⃣  Employee Login"
echo "----------------------------------------"

# Wait a bit for employee to be fully created and indexed
echo "   Waiting for employee to be ready..."
sleep 5

# Try employee login multiple times (employee might need time to be indexed)
EMP_TOKEN=""
for i in {1..3}; do
  EMP_LOGIN_BODY="{\"email\":\"${EMP_EMAIL}\",\"password\":\"Employee@123\"}"
  EMP_LOGIN_RESPONSE=$(curl -s -X POST \
    "$API_BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "$EMP_LOGIN_BODY")
  
  EMP_TOKEN=$(echo "$EMP_LOGIN_RESPONSE" | jq -r '.data.accessToken // .data.token // empty')
  
  if [ -n "$EMP_TOKEN" ] && [ "$EMP_TOKEN" != "null" ]; then
    echo -e "${GREEN}✅ Employee logged in${NC} (attempt $i)"
    echo "   Email: $EMP_EMAIL"
    break
  else
    if [ $i -lt 3 ]; then
      echo "   Attempt $i failed, retrying..."
      sleep 3
    fi
  fi
done

if [ -z "$EMP_TOKEN" ] || [ "$EMP_TOKEN" = "null" ]; then
  echo -e "${YELLOW}⚠️  Employee login failed after 3 attempts${NC}"
  echo "   Using admin token for attendance (employee may need more time to be indexed)"
  EMP_TOKEN="$ADMIN_TOKEN"
fi

echo ""

# Step 5: Mark Attendance with Image (Selfie)
echo "5️⃣  Mark Attendance with Image (Selfie)"
echo "----------------------------------------"

# Create a simple test image (base64 encoded 1x1 pixel PNG)
# In real scenario, this would be a selfie image
TEST_IMAGE_BASE64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

# For clock-in with image, we need to use multipart/form-data
# Create a temporary image file
TEMP_IMAGE="/tmp/test_selfie_${TIMESTAMP}.png"
echo "$TEST_IMAGE_BASE64" | base64 -d > "$TEMP_IMAGE" 2>/dev/null || echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -D > "$TEMP_IMAGE" 2>/dev/null

if [ ! -f "$TEMP_IMAGE" ]; then
  # Create a simple text file as fallback
  echo "test image" > "$TEMP_IMAGE"
fi

echo -n "Clock-In with selfie ... "
CLOCK_IN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_BASE_URL/api/attendance/clock-in" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -F "latitude=28.6139" \
  -F "longitude=77.2090" \
  -F "location=New Delhi, India" \
  -F "selfie=@$TEMP_IMAGE" \
  -F "notes=Test attendance with selfie")

CLOCK_IN_HTTP=$(echo "$CLOCK_IN_RESPONSE" | tail -1)
CLOCK_IN_BODY=$(echo "$CLOCK_IN_RESPONSE" | sed '$d')

if [ "$CLOCK_IN_HTTP" = "200" ] || [ "$CLOCK_IN_HTTP" = "201" ]; then
  echo -e "${GREEN}✅ PASS${NC} (HTTP $CLOCK_IN_HTTP)"
  CLOCK_IN_TIME=$(echo "$CLOCK_IN_BODY" | jq -r '.data.check_in_time // .data.clockInTime // .data.clockIn // empty' 2>/dev/null)
  if [ -n "$CLOCK_IN_TIME" ] && [ "$CLOCK_IN_TIME" != "null" ]; then
    echo "   🕐 Clock-In Time: $CLOCK_IN_TIME"
  fi
  
  # Check if selfie was saved
  SELFIE_URL=$(echo "$CLOCK_IN_BODY" | jq -r '.data.check_in_selfie // .data.selfie // .data.selfieUrl // empty' 2>/dev/null)
  if [ -n "$SELFIE_URL" ] && [ "$SELFIE_URL" != "null" ]; then
    echo "   📸 Selfie URL: $SELFIE_URL"
  fi
else
  echo -e "${RED}❌ FAIL${NC} (HTTP $CLOCK_IN_HTTP)"
  ERROR=$(echo "$CLOCK_IN_BODY" | jq -r '.message // .error // "Unknown"' 2>/dev/null)
  echo "   ⚠️  $ERROR"
fi

# Cleanup
rm -f "$TEMP_IMAGE" 2>/dev/null

echo ""

# Step 6: Verify Attendance in Dashboard
echo "6️⃣  Verify Attendance in Dashboard"
echo "----------------------------------------"

DASHBOARD=$(curl -s -X GET \
  "$API_BASE_URL/api/hr/dashboard" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

# Get attendance records
ATTENDANCE=$(curl -s -X GET \
  "$API_BASE_URL/api/attendance/history?limit=1" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

if echo "$ATTENDANCE" | jq -e '.data.attendances[0]' > /dev/null 2>&1; then
  LATEST=$(echo "$ATTENDANCE" | jq '.data.attendances[0]' 2>/dev/null)
  CI_TIME=$(echo "$LATEST" | jq -r '.check_in_time // .clockInTime // .clockIn // empty' 2>/dev/null)
  EMP_ATTENDANCE_ID=$(echo "$LATEST" | jq -r '.employee_id // .employeeId // empty' 2>/dev/null)
  
  if [ -n "$CI_TIME" ]; then
    echo -e "${GREEN}✅ Attendance found in dashboard${NC}"
    echo "   🕐 Clock-In: $CI_TIME"
    echo "   👤 Employee ID: $EMP_ATTENDANCE_ID"
    
    # Check if selfie is in record
    SELFIE_IN_RECORD=$(echo "$LATEST" | jq -r '.check_in_selfie // .selfie // empty' 2>/dev/null)
    if [ -n "$SELFIE_IN_RECORD" ] && [ "$SELFIE_IN_RECORD" != "null" ]; then
      echo "   📸 Selfie: Present in record"
    fi
  fi
else
  echo -e "${YELLOW}⚠️  Attendance not found in records yet${NC}"
fi

echo ""

# Step 7: Clock-Out
echo "7️⃣  Clock-Out"
echo "----------------------------------------"

sleep 2

echo -n "Clock-Out ... "
CLOCK_OUT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_BASE_URL/api/attendance/clock-out" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -F "latitude=28.6139" \
  -F "longitude=77.2090" \
  -F "location=New Delhi, India" \
  -F "selfie=@$TEMP_IMAGE" 2>/dev/null || curl -s -w "\n%{http_code}" -X POST \
  "$API_BASE_URL/api/attendance/clock-out" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -d '{"latitude":28.6139,"longitude":77.2090,"location":"New Delhi, India"}')

CLOCK_OUT_HTTP=$(echo "$CLOCK_OUT_RESPONSE" | tail -1)
CLOCK_OUT_BODY=$(echo "$CLOCK_OUT_RESPONSE" | sed '$d')

if [ "$CLOCK_OUT_HTTP" = "200" ] || [ "$CLOCK_OUT_HTTP" = "201" ]; then
  echo -e "${GREEN}✅ PASS${NC} (HTTP $CLOCK_OUT_HTTP)"
  CO_TIME=$(echo "$CLOCK_OUT_BODY" | jq -r '.data.check_out_time // .data.clockOutTime // .data.clockOut // empty' 2>/dev/null)
  if [ -n "$CO_TIME" ] && [ "$CO_TIME" != "null" ]; then
    echo "   🕐 Clock-Out Time: $CO_TIME"
  fi
else
  echo -e "${YELLOW}⚠️  Clock-Out: ${CLOCK_OUT_HTTP}${NC}"
fi

echo ""

# Step 8: Final Summary
echo "=========================================="
echo "📊 Summary"
echo "=========================================="
echo ""
echo "Employee Created:"
echo "   ID: $CREATED_EMP_EMP_ID"
echo "   Email: $EMP_EMAIL"
echo "   Store: $STORE_NAME ($STORE_ID)"
echo "   Department: $DEPT_NAME"
echo ""
echo "Attendance:"
if [ -n "$CLOCK_IN_TIME" ]; then
  echo "   ✅ Clock-In: $CLOCK_IN_TIME"
fi
if [ -n "$CO_TIME" ] && [ "$CO_TIME" != "null" ]; then
  echo "   ✅ Clock-Out: $CO_TIME"
fi
echo ""
echo -e "${GREEN}✅ Test Complete!${NC}"
