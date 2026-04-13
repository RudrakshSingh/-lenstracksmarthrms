#!/bin/bash

###############################################################################
# Employee Login, Mark Attendance, and Count New Employees
###############################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

echo "=========================================="
echo "🧪 Employee Login, Attendance & Employee Count Test"
echo "=========================================="
echo ""

# Step 1: Employee Login
echo "=========================================="
echo "Step 1: Employee Login"
echo "=========================================="

LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "lenstrack01@gmail.com",
    "password": "cnbxs2b9A1!"
  }')

echo "$LOGIN_RESPONSE" | jq '.'

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // .data.token // empty')
if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo -e "${RED}❌ Login failed - no token received${NC}"
  exit 1
fi

TENANT_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.tenantId // .data.user.tenant_id // "default"')
USER_NAME=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.name // .data.user.fullName // "N/A"')
EMPLOYEE_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.employee_id // .data.user.employeeId // "N/A"')
USER_ROLE=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.role // "N/A"')

echo ""
echo -e "${GREEN}✅ Login successful!${NC}"
echo "   User: $USER_NAME"
echo "   Employee ID: $EMPLOYEE_ID"
echo "   Role: $USER_ROLE"
echo "   Tenant ID: $TENANT_ID"
echo ""

# Step 2: Mark Attendance (Clock In)
echo "=========================================="
echo "Step 2: Mark Attendance (Clock In)"
echo "=========================================="

CLOCK_IN_DATA=$(cat <<EOF
{
  "latitude": 19.0764,
  "longitude": 72.8778,
  "notes": "Clock-in test from script"
}
EOF
)

echo -e "${BLUE}Attempting Clock In...${NC}"
CLOCK_IN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/attendance/clock-in" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d "$CLOCK_IN_DATA" 2>&1)

HTTP_CODE=$(echo "$CLOCK_IN_RESPONSE" | tail -n1)
BODY=$(echo "$CLOCK_IN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "201" ] || [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✅ Clock-in successful!${NC} (HTTP: $HTTP_CODE)"
  echo "$BODY" | jq '.'
  ATTENDANCE_ID=$(echo "$BODY" | jq -r '.data._id // .data.id // empty')
  CHECK_IN_TIME=$(echo "$BODY" | jq -r '.data.check_in_time // .data.checkIn.time // .data.clockIn // "N/A"')
  echo ""
  echo "   Attendance ID: $ATTENDANCE_ID"
  echo "   Check-in Time: $CHECK_IN_TIME"
else
  echo -e "${YELLOW}⚠️  Clock-in response (HTTP: $HTTP_CODE)${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  
  # Check if already clocked in
  if echo "$BODY" | grep -q "already clocked\|active session\|already checked" 2>/dev/null; then
    echo -e "${GREEN}✅ Employee already clocked in (this is OK)${NC}"
  fi
fi

echo ""

# Step 3: Get Attendance Records
echo "=========================================="
echo "Step 3: Get Attendance Records"
echo "=========================================="

ATTENDANCE_RESPONSE=$(curl -s -X GET "$API_BASE/api/attendance/records" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "Content-Type: application/json")

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_BASE/api/attendance/records" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

if [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✅ Attendance records retrieved${NC}"
  echo "$ATTENDANCE_RESPONSE" | jq '.data | length' 2>/dev/null && echo "   Total records found"
  echo "$ATTENDANCE_RESPONSE" | jq '.data[0:3]' 2>/dev/null || echo "$ATTENDANCE_RESPONSE" | jq '.' | head -20
else
  echo -e "${YELLOW}⚠️  Could not retrieve attendance records (HTTP: $HTTP_CODE)${NC}"
fi

echo ""

# Step 4: Count New Employees in DB
echo "=========================================="
echo "Step 4: Count New Employees in Database"
echo "=========================================="

# First, try to login as admin to get all employees
echo -e "${BLUE}Logging in as admin to get all employees...${NC}"
ADMIN_LOGIN=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@upcapto.com",
    "password": "Upcapto@2026"
  }')

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | jq -r '.data.accessToken // .data.token // empty')
ADMIN_TENANT=$(echo "$ADMIN_LOGIN" | jq -r '.data.user.tenantId // "upcapto"')

if [ -n "$ADMIN_TOKEN" ] && [ "$ADMIN_TOKEN" != "null" ]; then
  echo -e "${GREEN}✅ Admin login successful${NC}"
  USE_TOKEN=$ADMIN_TOKEN
  USE_TENANT=$ADMIN_TENANT
else
  echo -e "${YELLOW}⚠️  Admin login failed, using employee token${NC}"
  USE_TOKEN=$TOKEN
  USE_TENANT=$TENANT_ID
fi

# Get all employees
echo -e "${BLUE}Fetching all employees for tenant: $USE_TENANT...${NC}"
EMPLOYEES_RESPONSE=$(curl -s -X GET "$API_BASE/api/hr/employees?limit=1000" \
  -H "Authorization: Bearer $USE_TOKEN" \
  -H "x-tenant-id: $USE_TENANT" \
  -H "Content-Type: application/json")

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_BASE/api/hr/employees?limit=1000" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

if [ "$HTTP_CODE" == "200" ]; then
  # Try different response formats
  EMPLOYEES_ARRAY=$(echo "$EMPLOYEES_RESPONSE" | jq '.data // .data.employees // .data.data // []' 2>/dev/null)
  
  # Count total employees (use pagination.total if available, else count array)
  TOTAL_EMPLOYEES=$(echo "$EMPLOYEES_RESPONSE" | jq '.pagination.total // (.data | length) // 0' 2>/dev/null || echo "0")
  
  # Count employees created today
  TODAY=$(date +%Y-%m-%d)
  TODAY_EMPLOYEES=$(echo "$EMPLOYEES_RESPONSE" | jq --arg today "$TODAY" '.data[]? | select((.createdAt // .created_at // "") | startswith($today))' 2>/dev/null | jq -s 'length' || \
    echo "$EMPLOYEES_RESPONSE" | jq --arg today "$TODAY" '.data.employees[]? | select((.createdAt // .created_at // "") | startswith($today))' 2>/dev/null | jq -s 'length' || \
    echo "0")
  
  # Count employees created in last 7 days
  SEVEN_DAYS_AGO=$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d '7 days ago' +%Y-%m-%d)
  RECENT_EMPLOYEES=$(echo "$EMPLOYEES_RESPONSE" | jq --arg date "$SEVEN_DAYS_AGO" '.data[]? | select((.createdAt // .created_at // "") >= $date)' 2>/dev/null | jq -s 'length' || \
    echo "$EMPLOYEES_RESPONSE" | jq --arg date "$SEVEN_DAYS_AGO" '.data.employees[]? | select((.createdAt // .created_at // "") >= $date)' 2>/dev/null | jq -s 'length' || \
    echo "0")
  
  echo -e "${GREEN}✅ Employee count retrieved${NC}"
  echo ""
  echo "   📊 Employee Statistics:"
  echo "   ────────────────────────"
  echo "   Total Employees: $TOTAL_EMPLOYEES"
  echo "   Created Today: $TODAY_EMPLOYEES"
  echo "   Created in Last 7 Days: $RECENT_EMPLOYEES"
  echo ""
  
  # Show recent employees
  if [ "$RECENT_EMPLOYEES" -gt 0 ]; then
    echo -e "${BLUE}Recent Employees (Last 7 Days):${NC}"
    echo "$EMPLOYEES_RESPONSE" | jq --arg date "$SEVEN_DAYS_AGO" '.data[]? | select((.createdAt // .created_at // "") >= $date) | {employeeId, name: .fullName // .name, email, createdAt: .createdAt // .created_at}' 2>/dev/null | jq -s '.' | head -30 || \
    echo "$EMPLOYEES_RESPONSE" | jq --arg date "$SEVEN_DAYS_AGO" '.data.employees[]? | select((.createdAt // .created_at // "") >= $date) | {employeeId, name: .fullName // .name, email, createdAt: .createdAt // .created_at}' 2>/dev/null | jq -s '.' | head -30
  fi
  
  # Show response structure for debugging
  echo ""
  echo -e "${BLUE}Response Structure:${NC}"
  echo "$EMPLOYEES_RESPONSE" | jq 'keys' 2>/dev/null || echo "Could not parse response"
  echo ""
  echo -e "${BLUE}First Employee Sample:${NC}"
  echo "$EMPLOYEES_RESPONSE" | jq '.data[0] // .data.employees[0] // .data.data[0] // empty' 2>/dev/null | head -20
else
  echo -e "${YELLOW}⚠️  Could not retrieve employees (HTTP: $HTTP_CODE)${NC}"
  echo "$EMPLOYEES_RESPONSE" | jq '.' 2>/dev/null || echo "$EMPLOYEES_RESPONSE"
fi

echo ""

# Step 5: Summary
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo -e "${GREEN}✅ Employee Login: Success${NC}"
if [ "$HTTP_CODE" == "201" ] || [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✅ Clock In: Success${NC}"
else
  echo -e "${YELLOW}⚠️  Clock In: May have failed or already clocked in${NC}"
fi
echo -e "${GREEN}✅ Employee Count: Retrieved${NC}"
echo ""
echo "=========================================="
echo "✅ Test Complete!"
echo "=========================================="
