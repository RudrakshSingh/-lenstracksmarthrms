#!/bin/bash

###############################################################################
# Mark Attendance for All Employees in Lenstrack Tenant
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
echo "⏰ Marking Attendance for All Employees"
echo "=========================================="
echo ""

# Step 1: Login as Admin
echo "Step 1: Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\"
  }")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // .data.token // empty')
TENANT_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.tenantId // .data.tenantId // "lenstrack"')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo "   Tenant ID: $TENANT_ID"
echo ""

# Step 2: Get All Employees
echo "Step 2: Fetching employees..."
EMPLOYEES_RESPONSE=$(curl -s -X GET "$API_BASE/api/hr/employees?limit=1000" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

EMPLOYEE_COUNT=$(echo "$EMPLOYEES_RESPONSE" | jq '.data | length' 2>/dev/null || echo "0")

if [ "$EMPLOYEE_COUNT" -eq 0 ]; then
  echo -e "${RED}❌ No employees found${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Found $EMPLOYEE_COUNT employees${NC}"
echo ""

# Step 3: Mark Attendance for Each Employee
echo "=========================================="
echo "⏰ Marking Attendance"
echo "=========================================="
echo ""

SUCCESS_COUNT=0
FAILED_COUNT=0
FAILED_EMPLOYEES=()

# Process each employee using jq to iterate
EMPLOYEE_COUNT=$(echo "$EMPLOYEES_RESPONSE" | jq '.data | length' 2>/dev/null || echo "0")

for i in $(seq 0 $((EMPLOYEE_COUNT - 1))); do
  EMP_ID=$(echo "$EMPLOYEES_RESPONSE" | jq -r ".data[$i] | .employeeId // .employee_id" 2>/dev/null)
  EMP_EMAIL=$(echo "$EMPLOYEES_RESPONSE" | jq -r ".data[$i] | .email" 2>/dev/null)
  EMP_NAME=$(echo "$EMPLOYEES_RESPONSE" | jq -r ".data[$i] | .fullName // .name // \"N/A\"" 2>/dev/null)
  
  if [ -z "$EMP_ID" ] || [ "$EMP_ID" == "null" ]; then
    continue
  fi
  
  echo "Processing: $EMP_NAME ($EMP_ID)"
  
  # Try to login as employee first (to get their token)
  EMP_LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$EMP_EMAIL\",
      \"password\": \"Kadarkhan@123\"
    }")
  
  EMP_TOKEN=$(echo "$EMP_LOGIN_RESPONSE" | jq -r '.data.accessToken // .data.token // empty')
  
  if [ -z "$EMP_TOKEN" ] || [ "$EMP_TOKEN" == "null" ]; then
    # If employee login fails, try with admin token (admin might be able to mark attendance)
    echo "  ⚠️  Employee login failed, trying with admin token..."
    EMP_TOKEN="$TOKEN"
  else
    echo "  ✅ Employee login successful"
  fi
  
  # Mark attendance (clock-in)
  CLOCK_IN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/api/attendance/clock-in" \
    -H "Authorization: Bearer $EMP_TOKEN" \
    -H "x-tenant-id: $TENANT_ID" \
    -H "Content-Type: application/json" \
    -d "{
      \"latitude\": 28.6139,
      \"longitude\": 77.2090,
      \"location\": \"Delhi, India\",
      \"notes\": \"Attendance marked by admin\"
    }")
  
  HTTP_CODE=$(echo "$CLOCK_IN_RESPONSE" | tail -n1)
  BODY=$(echo "$CLOCK_IN_RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" == "201" ] || [ "$HTTP_CODE" == "200" ]; then
    echo -e "  ${GREEN}✅ Attendance marked successfully${NC}"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo -e "  ${RED}❌ Failed (HTTP: $HTTP_CODE)${NC}"
    ERROR_MSG=$(echo "$BODY" | jq -r '.message // .error // "Unknown error"' 2>/dev/null)
    echo "     Error: $ERROR_MSG"
    FAILED_COUNT=$((FAILED_COUNT + 1))
    FAILED_EMPLOYEES+=("$EMP_NAME ($EMP_ID)")
  fi
  echo ""
  
  # Small delay to avoid rate limiting
  sleep 1
done

# Summary
echo "=========================================="
echo "📊 Attendance Summary"
echo "=========================================="
echo ""
echo "Total Employees: $EMPLOYEE_COUNT"
echo -e "${GREEN}Successfully Marked: $SUCCESS_COUNT${NC}"
echo -e "${RED}Failed: $FAILED_COUNT${NC}"
echo ""

if [ ${#FAILED_EMPLOYEES[@]} -gt 0 ]; then
  echo "Failed Employees:"
  for emp in "${FAILED_EMPLOYEES[@]}"; do
    echo "  - $emp"
  done
  echo ""
fi

# Step 4: Verify Attendance Records
echo "=========================================="
echo "✅ Verifying Attendance Records"
echo "=========================================="
echo ""

ATTENDANCE_RESPONSE=$(curl -s -X GET "$API_BASE/api/attendance?limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: $TENANT_ID")

ATTENDANCE_COUNT=$(echo "$ATTENDANCE_RESPONSE" | jq '.data | length' 2>/dev/null || echo "0")

echo "Recent Attendance Records: $ATTENDANCE_COUNT"
echo ""

if [ "$ATTENDANCE_COUNT" -gt 0 ]; then
  echo "Latest Attendance Records:"
  echo "$ATTENDANCE_RESPONSE" | jq -r '.data[0:5] | .[] | "\(.employeeId // .employee_id) - \(.clockIn // .clock_in) - \(.status // "N/A")"' 2>/dev/null | nl -w2 -s'. '
fi

echo ""
echo "=========================================="
echo "✅ Complete!"
echo "=========================================="
