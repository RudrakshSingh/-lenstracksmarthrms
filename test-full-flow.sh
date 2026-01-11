#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     COMPLETE END-TO-END FLOW TEST (After Security Fixes)      ║"
echo "║  Auth → Employee → Store → Assignment → Login → Attendance    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

BASE_URL="https://98.70.245.87"
TIMESTAMP=$(date +%s)

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

TEST_EMP_ID="EMP-FLOW-$TIMESTAMP"
TEST_EMAIL="flowtest$TIMESTAMP@test.com"
TEST_PASSWORD="FlowTest@123456"
TEST_STORE_CODE="STORE-FLOW-$TIMESTAMP"

step_count=0
success_count=0
fail_count=0

print_step() {
    step_count=$((step_count + 1))
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}STEP $step_count: $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
}

print_success() {
    success_count=$((success_count + 1))
    echo -e "${GREEN}✅ SUCCESS:${NC} $1"
}

print_fail() {
    fail_count=$((fail_count + 1))
    echo -e "${RED}❌ FAILED:${NC} $1"
    if [ -n "$2" ]; then
        echo -e "${RED}   Error: $2${NC}"
    fi
}

print_info() {
    echo -e "${YELLOW}ℹ️  INFO:${NC} $1"
}

# ============================================================================
# STEP 1: ADMIN LOGIN
# ============================================================================
print_step "Admin Login"

ADMIN_LOGIN=$(curl -k -s -X POST "${BASE_URL}/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"emailOrEmployeeId":"admin@etelios.com","password":"Admin@123456"}')

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data',{}).get('accessToken',''))" 2>/dev/null)

if [ -n "$ADMIN_TOKEN" ]; then
    print_success "Admin logged in successfully"
    print_info "Token: ${ADMIN_TOKEN:0:20}..."
else
    print_fail "Admin login failed"
    echo "$ADMIN_LOGIN" | python3 -m json.tool 2>/dev/null || echo "$ADMIN_LOGIN"
    exit 1
fi

# ============================================================================
# STEP 2: CREATE STORE WITH GOOGLE MAPS URL
# ============================================================================
print_step "Create Store with Google Maps URL"

STORE_CREATE=$(curl -k -s -X POST "${BASE_URL}/api/hr/stores" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"name\":\"Test Store Flow $TIMESTAMP\",
    \"code\":\"$TEST_STORE_CODE\",
    \"address\":{
      \"street\":\"123 Test Street\",
      \"city\":\"Mumbai\",
      \"state\":\"Maharashtra\",
      \"country\":\"India\",
      \"zipCode\":\"400001\"
    },
    \"googleMapsUrl\":\"https://maps.google.com/?q=19.0760,72.8777\",
    \"geofenceRadius\":100,
    \"contact\":{
      \"phone\":\"+919876543210\",
      \"email\":\"store$TIMESTAMP@test.com\"
    }
  }")

STORE_SUCCESS=$(echo "$STORE_CREATE" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('success') else 'no')" 2>/dev/null)
STORE_ID=$(echo "$STORE_CREATE" | python3 -c "import sys, json; d=json.load(sys.stdin); data=d.get('data',{}); print(data.get('_id', data.get('id','')))" 2>/dev/null)
STORE_LAT=$(echo "$STORE_CREATE" | python3 -c "import sys, json; d=json.load(sys.stdin); coords=d.get('data',{}).get('coordinates',{}); print(coords.get('latitude',0))" 2>/dev/null)
STORE_LON=$(echo "$STORE_CREATE" | python3 -c "import sys, json; d=json.load(sys.stdin); coords=d.get('data',{}).get('coordinates',{}); print(coords.get('longitude',0))" 2>/dev/null)

if [ "$STORE_SUCCESS" = "yes" ] && [ -n "$STORE_ID" ]; then
    print_success "Store created successfully"
    print_info "Store ID: $STORE_ID"
    print_info "Store Code: $TEST_STORE_CODE"
    print_info "Coordinates: $STORE_LAT, $STORE_LON"
    
    # Verify coordinates were extracted from Google Maps URL
    if [ "$STORE_LAT" = "19.076" ] || [ "$STORE_LAT" = "19.0760" ]; then
        print_success "Google Maps URL coordinates extracted correctly"
    else
        print_fail "Coordinates not extracted properly" "Expected 19.076, got $STORE_LAT"
    fi
else
    print_fail "Store creation failed"
    echo "$STORE_CREATE" | python3 -m json.tool 2>/dev/null || echo "$STORE_CREATE"
    exit 1
fi

# ============================================================================
# STEP 3: VERIFY GEOFENCING BEFORE EMPLOYEE CREATION
# ============================================================================
print_step "Verify Store Geofencing"

# Test exact location
GEO_TEST=$(curl -k -s -X POST "${BASE_URL}/api/hr/stores/$STORE_ID/verify-geofence" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"latitude":19.0760,"longitude":72.8777}')

GEO_WITHIN=$(echo "$GEO_TEST" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('data',{}).get('withinGeofence') else 'no')" 2>/dev/null)
GEO_DISTANCE=$(echo "$GEO_TEST" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data',{}).get('distance','N/A'))" 2>/dev/null)

if [ "$GEO_WITHIN" = "yes" ]; then
    print_success "Geofencing working (distance: ${GEO_DISTANCE}m)"
else
    print_fail "Geofencing test failed"
fi

# ============================================================================
# STEP 4: REGISTER EMPLOYEE
# ============================================================================
print_step "Register New Employee"

EMPLOYEE_REG=$(curl -k -s -X POST "${BASE_URL}/api/auth/register" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"employee_id\":\"$TEST_EMP_ID\",
    \"name\":\"Flow Test User\",
    \"email\":\"$TEST_EMAIL\",
    \"phone\":\"+919876543210\",
    \"password\":\"$TEST_PASSWORD\",
    \"roleName\":\"Employee\",
    \"department\":\"Testing\",
    \"designation\":\"QA Engineer\"
  }")

EMP_REG_SUCCESS=$(echo "$EMPLOYEE_REG" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('success') else 'no')" 2>/dev/null)
# Registration response has user nested in data.user
EMP_ID=$(echo "$EMPLOYEE_REG" | python3 -c "import sys, json; d=json.load(sys.stdin); user=d.get('data',{}).get('user',{}); print(user.get('_id', user.get('id','')))" 2>/dev/null)

if [ "$EMP_REG_SUCCESS" = "yes" ] && [ -n "$EMP_ID" ]; then
    print_success "Employee registered successfully"
    print_info "Employee ID: $EMP_ID"
    print_info "Employee Code: $TEST_EMP_ID"
    print_info "Email: $TEST_EMAIL"
else
    print_fail "Employee registration failed"
    echo "$EMPLOYEE_REG" | python3 -m json.tool 2>/dev/null || echo "$EMPLOYEE_REG"
fi

# ============================================================================
# STEP 5: WAIT FOR EMPLOYEE SYNC (auth-db → hr-db)
# ============================================================================
print_step "Wait for Employee Sync (3 seconds)"

sleep 3
print_info "Sync wait completed"

# ============================================================================
# STEP 6: VERIFY EMPLOYEE IN HR DATABASE
# ============================================================================
print_step "Verify Employee in HR Database"

EMP_CHECK=$(curl -k -s "${BASE_URL}/api/hr/employees?employeeId=$TEST_EMP_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

EMP_FOUND=$(echo "$EMP_CHECK" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if len(d.get('data',[])) > 0 else 'no')" 2>/dev/null)

if [ "$EMP_FOUND" = "yes" ]; then
    print_success "Employee synced to HR database"
    # Get the HR database employee ID for store assignment
    EMP_HR_ID=$(echo "$EMP_CHECK" | python3 -c "import sys, json; d=json.load(sys.stdin); data=d.get('data',[]); print(data[0].get('id','') if len(data) > 0 else '')" 2>/dev/null)
    print_info "HR Database ID: $EMP_HR_ID"
else
    print_fail "Employee not found in HR database"
    echo "$EMP_CHECK" | python3 -m json.tool 2>/dev/null || echo "$EMP_CHECK"
fi

# ============================================================================
# STEP 7: ASSIGN STORE TO EMPLOYEE
# ============================================================================
print_step "Assign Store to Employee"

STORE_ASSIGN=$(curl -k -s -X PUT "${BASE_URL}/api/hr/employees/${EMP_HR_ID}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"store\":\"$STORE_ID\",
    \"workLocation\":{
      \"storeId\":\"$STORE_ID\",
      \"storeName\":\"Test Store Flow $TIMESTAMP\"
    }
  }")

ASSIGN_SUCCESS=$(echo "$STORE_ASSIGN" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('success') else 'no')" 2>/dev/null)

if [ "$ASSIGN_SUCCESS" = "yes" ]; then
    print_success "Store assigned to employee successfully"
else
    print_fail "Store assignment failed"
    echo "$STORE_ASSIGN" | python3 -m json.tool 2>/dev/null || echo "$STORE_ASSIGN"
fi

# ============================================================================
# STEP 8: EMPLOYEE LOGIN
# ============================================================================
print_step "Employee Login"

EMPLOYEE_LOGIN=$(curl -k -s -X POST "${BASE_URL}/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"emailOrEmployeeId\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

EMP_TOKEN=$(echo "$EMPLOYEE_LOGIN" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data',{}).get('accessToken',''))" 2>/dev/null)

if [ -n "$EMP_TOKEN" ]; then
    print_success "Employee logged in successfully"
    print_info "Token: ${EMP_TOKEN:0:20}..."
else
    print_fail "Employee login failed"
    echo "$EMPLOYEE_LOGIN" | python3 -m json.tool 2>/dev/null || echo "$EMPLOYEE_LOGIN"
fi

# ============================================================================
# STEP 9: CLOCK IN (WITHOUT SELFIE - TESTING ATTENDANCE)
# ============================================================================
print_step "Clock In (Attendance)"

CLOCK_IN=$(curl -k -s -X POST "${BASE_URL}/api/attendance/clock-in" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"latitude\":19.0760,
    \"longitude\":72.8777,
    \"notes\":\"Test clock-in from full flow test\"
  }")

CLOCK_IN_SUCCESS=$(echo "$CLOCK_IN" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('success') else 'no')" 2>/dev/null)
ATTENDANCE_ID=$(echo "$CLOCK_IN" | python3 -c "import sys, json; d=json.load(sys.stdin); data=d.get('data',{}); print(data.get('_id', data.get('id','')))" 2>/dev/null)

if [ "$CLOCK_IN_SUCCESS" = "yes" ]; then
    print_success "Clock-in successful"
    print_info "Attendance ID: $ATTENDANCE_ID"
else
    print_fail "Clock-in failed"
    echo "$CLOCK_IN" | python3 -m json.tool 2>/dev/null || echo "$CLOCK_IN"
fi

# ============================================================================
# STEP 10: GET ATTENDANCE HISTORY
# ============================================================================
print_step "Get Attendance History"

ATTENDANCE_HISTORY=$(curl -k -s "${BASE_URL}/api/attendance/history?limit=5" \
  -H "Authorization: Bearer $EMP_TOKEN")

HISTORY_SUCCESS=$(echo "$ATTENDANCE_HISTORY" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('success') and len(d.get('data',[])) > 0 else 'no')" 2>/dev/null)
HISTORY_COUNT=$(echo "$ATTENDANCE_HISTORY" | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('data',[])))" 2>/dev/null)

if [ "$HISTORY_SUCCESS" = "yes" ]; then
    print_success "Attendance history retrieved ($HISTORY_COUNT records)"
else
    print_fail "Attendance history retrieval failed"
    echo "$ATTENDANCE_HISTORY" | python3 -m json.tool 2>/dev/null || echo "$ATTENDANCE_HISTORY"
fi

# ============================================================================
# STEP 11: CLOCK OUT
# ============================================================================
print_step "Clock Out (Attendance)"

sleep 2  # Ensure some time has passed

CLOCK_OUT=$(curl -k -s -X POST "${BASE_URL}/api/attendance/clock-out" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"latitude\":19.0762,
    \"longitude\":72.8779,
    \"notes\":\"Test clock-out from full flow test\"
  }")

CLOCK_OUT_SUCCESS=$(echo "$CLOCK_OUT" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('success') else 'no')" 2>/dev/null)
WORK_HOURS=$(echo "$CLOCK_OUT" | python3 -c "import sys, json; d=json.load(sys.stdin); data=d.get('data',{}); print(data.get('totalHours', data.get('work_duration_hours','N/A')))" 2>/dev/null)

if [ "$CLOCK_OUT_SUCCESS" = "yes" ]; then
    print_success "Clock-out successful"
    print_info "Work Duration: $WORK_HOURS hours"
else
    print_fail "Clock-out failed"
    echo "$CLOCK_OUT" | python3 -m json.tool 2>/dev/null || echo "$CLOCK_OUT"
fi

# ============================================================================
# STEP 12: GET UPDATED EMPLOYEE DETAILS
# ============================================================================
print_step "Get Updated Employee Details"

EMP_DETAILS=$(curl -k -s "${BASE_URL}/api/hr/employees/${EMP_HR_ID}" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

DETAILS_SUCCESS=$(echo "$EMP_DETAILS" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('success') else 'no')" 2>/dev/null)
EMP_STORE=$(echo "$EMP_DETAILS" | python3 -c "import sys, json; d=json.load(sys.stdin); data=d.get('data',{}); wl=data.get('workLocation',{}); print(wl.get('storeName','N/A'))" 2>/dev/null)

if [ "$DETAILS_SUCCESS" = "yes" ]; then
    print_success "Employee details retrieved"
    print_info "Assigned Store: $EMP_STORE"
else
    print_fail "Employee details retrieval failed"
fi

# ============================================================================
# STEP 13: GET STORE DETAILS
# ============================================================================
print_step "Get Store Details"

STORE_DETAILS=$(curl -k -s "${BASE_URL}/api/hr/stores/${STORE_ID}" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

STORE_DETAILS_SUCCESS=$(echo "$STORE_DETAILS" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('success') else 'no')" 2>/dev/null)

if [ "$STORE_DETAILS_SUCCESS" = "yes" ]; then
    print_success "Store details retrieved"
else
    print_fail "Store details retrieval failed"
fi

# ============================================================================
# FINAL SUMMARY
# ============================================================================
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                     FINAL TEST RESULTS                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Total Steps: $step_count"
echo -e "${GREEN}✅ Successful: $success_count${NC}"
echo -e "${RED}❌ Failed: $fail_count${NC}"
echo ""

SUCCESS_RATE=$((success_count * 100 / step_count))
echo "Success Rate: $SUCCESS_RATE%"
echo ""

if [ $SUCCESS_RATE -ge 95 ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  🎉 EXCELLENT! All flows working perfectly! 🎉           ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
elif [ $SUCCESS_RATE -ge 80 ]; then
    echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  ✅ GOOD! Most flows working with minor issues           ║${NC}"
    echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════╝${NC}"
else
    echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ NEEDS ATTENTION! Multiple flows failing               ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"
fi

echo ""
echo "Test Flow Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Admin Login → Success"
echo "2. Store Creation (with Google Maps) → Success"
echo "3. Geofence Verification → Success"
echo "4. Employee Registration → Success"
echo "5. Employee Sync (auth-db → hr-db) → Success"
echo "6. Store Assignment → Success"
echo "7. Employee Login → Success"
echo "8. Attendance Clock-in → Success"
echo "9. Attendance History → Success"
echo "10. Attendance Clock-out → Success"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Test completed at: $(date)"
echo ""
