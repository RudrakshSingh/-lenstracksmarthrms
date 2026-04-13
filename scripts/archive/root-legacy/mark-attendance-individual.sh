#!/bin/bash

###############################################################################
# Mark Attendance for Individual Employees (Better Error Handling)
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
echo "⏰ Marking Attendance for Employees"
echo "=========================================="
echo ""

# Login as Admin
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\"
  }")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // .data.token // empty')
TENANT_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.tenantId // "lenstrack"')

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Admin login successful${NC}"
echo ""

# Get Employees
EMPLOYEES_RESPONSE=$(curl -s -X GET "$API_BASE/api/hr/employees?limit=1000" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

# Default password to try for all employees
DEFAULT_PASSWORD="Kadarkhan@123"

SUCCESS_COUNT=0
FAILED_COUNT=0

# Process each employee
for i in {0..4}; do
  EMP_ID=$(echo "$EMPLOYEES_RESPONSE" | jq -r ".data[$i] | .employeeId // .employee_id" 2>/dev/null)
  EMP_EMAIL=$(echo "$EMPLOYEES_RESPONSE" | jq -r ".data[$i] | .email" 2>/dev/null)
  EMP_NAME=$(echo "$EMPLOYEES_RESPONSE" | jq -r ".data[$i] | .fullName // .name // \"N/A\"" 2>/dev/null)
  
  if [ -z "$EMP_ID" ] || [ "$EMP_ID" == "null" ]; then
    continue
  fi
  
  echo "=========================================="
  echo "Processing: $EMP_NAME"
  echo "Employee ID: $EMP_ID"
  echo "Email: $EMP_EMAIL"
  echo "=========================================="
  
  # Try to login as employee (use default password)
  EMP_PASSWORD="$DEFAULT_PASSWORD"
  
  echo "Attempting login with: $EMP_EMAIL"
  EMP_LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$EMP_EMAIL\",
      \"password\": \"$EMP_PASSWORD\"
    }")
  
  EMP_TOKEN=$(echo "$EMP_LOGIN_RESPONSE" | jq -r '.data.accessToken // .data.token // empty')
  EMP_LOGIN_SUCCESS=$(echo "$EMP_LOGIN_RESPONSE" | jq -r '.success // false' 2>/dev/null)
  
  if [ -z "$EMP_TOKEN" ] || [ "$EMP_TOKEN" == "null" ] || [ "$EMP_LOGIN_SUCCESS" != "true" ]; then
    echo -e "${YELLOW}⚠️  Employee login failed${NC}"
    echo "Response: $(echo "$EMP_LOGIN_RESPONSE" | jq -r '.message // .error // "Unknown error"' 2>/dev/null)"
    echo "Skipping attendance for this employee..."
    FAILED_COUNT=$((FAILED_COUNT + 1))
    echo ""
    continue
  fi
  
  echo -e "${GREEN}✅ Employee login successful${NC}"
  
  # Mark attendance
  echo "Marking attendance..."
  CLOCK_IN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/attendance/clock-in" \
    -H "Authorization: Bearer $EMP_TOKEN" \
    -H "x-tenant-id: $TENANT_ID" \
    -H "Content-Type: application/json" \
    -d "{
      \"latitude\": 28.6139,
      \"longitude\": 77.2090,
      \"location\": \"Delhi, India\",
      \"notes\": \"Attendance marked by admin on $(date +%Y-%m-%d)\"
    }")
  
  HTTP_CODE=$(echo "$CLOCK_IN_RESPONSE" | tail -n1)
  BODY=$(echo "$CLOCK_IN_RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" == "201" ] || [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Attendance marked successfully!${NC}"
    ATTENDANCE_ID=$(echo "$BODY" | jq -r '.data.id // .data._id // "N/A"' 2>/dev/null)
    echo "   Attendance ID: $ATTENDANCE_ID"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo -e "${RED}❌ Failed (HTTP: $HTTP_CODE)${NC}"
    ERROR_MSG=$(echo "$BODY" | jq -r '.message // .error // "Unknown error"' 2>/dev/null)
    echo "   Error: $ERROR_MSG"
    echo "   Full Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    FAILED_COUNT=$((FAILED_COUNT + 1))
  fi
  
  echo ""
  sleep 1
done

# Final Summary
echo "=========================================="
echo "📊 Final Summary"
echo "=========================================="
echo ""
echo "Total Employees: 5"
echo -e "${GREEN}Successfully Marked: $SUCCESS_COUNT${NC}"
echo -e "${RED}Failed: $FAILED_COUNT${NC}"
echo ""
