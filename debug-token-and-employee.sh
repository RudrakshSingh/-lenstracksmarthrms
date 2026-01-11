#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="https://98.70.245.87"

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Debugging Token & Employee Lookup${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Login
echo -e "${BLUE}[1/3] Logging in...${NC}"
LOGIN_RESPONSE=$(curl -sk -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrEmployeeId": "admin@etelios.com",
    "password": "Admin@123456"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')
USER=$(echo $LOGIN_RESPONSE | jq '.data.user')

echo -e "${GREEN}✅ Logged in${NC}"
echo ""
echo -e "${YELLOW}User Data from Login:${NC}"
echo "$USER" | jq '.'
echo ""

# Decode JWT token (header + payload only, no signature check)
echo -e "${BLUE}[2/3] Decoding JWT Token...${NC}"
PAYLOAD=$(echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null || echo $TOKEN | cut -d'.' -f2 | base64 -D 2>/dev/null)

echo -e "${YELLOW}JWT Payload:${NC}"
echo "$PAYLOAD" | jq '.' 2>/dev/null || echo "$PAYLOAD"
echo ""

# Check if JWT has employee_id
HAS_EMP_ID=$(echo "$PAYLOAD" | jq -r 'has("employee_id")' 2>/dev/null)
EMP_ID_IN_JWT=$(echo "$PAYLOAD" | jq -r '.employee_id // "NOT_FOUND"' 2>/dev/null)

echo -e "${YELLOW}Token Analysis:${NC}"
echo "  Has employee_id: $HAS_EMP_ID"
echo "  employee_id value: $EMP_ID_IN_JWT"
echo ""

# Try to get employee from HR service
echo -e "${BLUE}[3/3] Testing HR Service Employee Lookup...${NC}"

USER_ID=$(echo "$USER" | jq -r '._id // .id')
EMP_ID=$(echo "$USER" | jq -r '.employeeId // .employee_id')

echo "Searching with:"
echo "  Employee ID: $EMP_ID"
echo "  User _id: $USER_ID"
echo ""

# Method 1: By employeeId
echo "Method 1: GET /api/hr/employees?employeeId=$EMP_ID"
HR_RESPONSE_1=$(curl -sk "$BASE_URL/api/hr/employees?employeeId=$EMP_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo "$HR_RESPONSE_1" | jq '.' 2>/dev/null || echo "$HR_RESPONSE_1"
echo ""

# Method 2: By MongoDB _id
echo "Method 2: GET /api/hr/employees/$USER_ID"
HR_RESPONSE_2=$(curl -sk "$BASE_URL/api/hr/employees/$USER_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo "$HR_RESPONSE_2" | jq '.' 2>/dev/null || echo "$HR_RESPONSE_2"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  DIAGNOSIS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Check Method 1 success
METHOD1_SUCCESS=$(echo "$HR_RESPONSE_1" | jq -r '.success' 2>/dev/null)
METHOD1_COUNT=$(echo "$HR_RESPONSE_1" | jq -r '.data | length' 2>/dev/null)

# Check Method 2 success
METHOD2_SUCCESS=$(echo "$HR_RESPONSE_2" | jq -r '.success' 2>/dev/null)

if [ "$METHOD1_SUCCESS" = "true" ] && [ "$METHOD1_COUNT" != "0" ]; then
  echo -e "${GREEN}✅ Method 1 (employeeId): WORKING${NC}"
  echo "   Found $METHOD1_COUNT employee(s)"
elif [ "$METHOD1_SUCCESS" = "true" ] && [ "$METHOD1_COUNT" = "0" ]; then
  echo -e "${RED}❌ Method 1 (employeeId): Returns 0 employees${NC}"
  echo -e "${YELLOW}   This is the problem! Employee not in HR DB or not matching.${NC}"
else
  echo -e "${RED}❌ Method 1 (employeeId): FAILED${NC}"
fi

if [ "$METHOD2_SUCCESS" = "true" ]; then
  echo -e "${GREEN}✅ Method 2 (MongoDB _id): WORKING${NC}"
else
  echo -e "${RED}❌ Method 2 (MongoDB _id): FAILED${NC}"
fi

echo ""

if [ "$EMP_ID_IN_JWT" = "NOT_FOUND" ] || [ "$EMP_ID_IN_JWT" = "null" ]; then
  echo -e "${RED}🔍 ROOT CAUSE: JWT token doesn't contain employee_id field!${NC}"
  echo ""
  echo "   This is why attendance service can't find the employee."
  echo "   The JWT needs to include employee_id for attendance to work."
else
  echo -e "${YELLOW}🔍 JWT has employee_id but HR lookup is failing${NC}"
  echo ""
  echo "   Possible causes:"
  echo "   1. Employee not synced to HR DB properly"
  echo "   2. employeeId mismatch (case sensitive)"
  echo "   3. Database connection issue"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
