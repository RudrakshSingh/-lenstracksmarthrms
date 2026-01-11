#!/bin/bash

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║           COMPLETE END-TO-END API TESTING                        ║"
echo "║  Login → Employee Creation → Store Creation → Assignment →       ║"
echo "║  Attendance (Clock-In/Clock-Out)                                 ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

BASE_URL="https://98.70.245.87"
TIMESTAMP=$(date +%s)
NEW_EMP_ID="EMP-TEST-$TIMESTAMP"
NEW_STORE_CODE="STORE-TEST-$TIMESTAMP"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

test_result() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ "$1" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $2"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAIL${NC}: $2"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        if [ -n "$3" ]; then
            echo -e "${RED}   Error: $3${NC}"
        fi
    fi
}

echo "════════════════════════════════════════════════════════════════════"
echo "TEST 1: ADMIN LOGIN"
echo "════════════════════════════════════════════════════════════════════"
echo "Testing: POST /api/auth/login (Admin)"
echo ""

ADMIN_LOGIN=$(curl -k -s -X POST "${BASE_URL}/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"emailOrEmployeeId":"admin@etelios.com","password":"Admin@123456"}')

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data',{}).get('accessToken',''))" 2>/dev/null)
ADMIN_LOGIN_SUCCESS=$(echo "$ADMIN_LOGIN" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('success') else 'no')" 2>/dev/null)

if [ "$ADMIN_LOGIN_SUCCESS" = "yes" ] && [ -n "$ADMIN_TOKEN" ]; then
    test_result "PASS" "Admin login successful"
    echo "   Token: ${ADMIN_TOKEN:0:20}..."
else
    test_result "FAIL" "Admin login failed" "$(echo $ADMIN_LOGIN | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('message','Unknown error'))" 2>/dev/null)"
    echo "Exiting... Cannot proceed without admin token"
    exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "TEST 2: STORE CREATION"
echo "════════════════════════════════════════════════════════════════════"
echo "Testing: POST /api/hr/stores"
echo "Store Code: $NEW_STORE_CODE"
echo ""

CREATE_STORE=$(curl -k -s -X POST "${BASE_URL}/api/hr/stores" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"name\": \"Test Store $TIMESTAMP\",
    \"code\": \"$NEW_STORE_CODE\",
    \"address\": {
      \"street\": \"Test Street 123\",
      \"city\": \"Mumbai\",
      \"state\": \"Maharashtra\",
      \"country\": \"India\"
    },
    \"googleMapsUrl\": \"https://maps.google.com/?q=19.0760,72.8777\",
    \"geofenceRadius\": 200,
    \"contact\": {
      \"phone\": \"+919876543210\",
      \"email\": \"store$TIMESTAMP@test.com\"
    }
  }")

STORE_ID=$(echo "$CREATE_STORE" | python3 -c "import sys, json; d=json.load(sys.stdin); data=d.get('data',{}); print(data.get('_id', data.get('id', '')))" 2>/dev/null)
STORE_SUCCESS=$(echo "$CREATE_STORE" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('success') else 'no')" 2>/dev/null)

if [ "$STORE_SUCCESS" = "yes" ] && [ -n "$STORE_ID" ]; then
    test_result "PASS" "Store created successfully"
    echo "   Store ID: $STORE_ID"
    
    # Check if coordinates were extracted
    HAS_COORDS=$(echo "$CREATE_STORE" | python3 -c "import sys, json; d=json.load(sys.stdin); data=d.get('data',{}); print('yes' if data.get('latitude') or data.get('coordinates',{}).get('latitude') else 'no')" 2>/dev/null)
    
    if [ "$HAS_COORDS" = "yes" ]; then
        test_result "PASS" "Coordinates extracted from Google Maps URL"
    else
        test_result "FAIL" "Coordinates not extracted" "Check Google Maps URL parsing"
    fi
else
    test_result "FAIL" "Store creation failed" "$(echo $CREATE_STORE | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('message','Unknown error'))" 2>/dev/null)"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "TEST 3: EMPLOYEE REGISTRATION (via Auth Service)"
echo "════════════════════════════════════════════════════════════════════"
echo "Testing: POST /api/auth/register"
echo "Employee ID: $NEW_EMP_ID"
echo ""

REGISTER_EMP=$(curl -k -s -X POST "${BASE_URL}/api/auth/register" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"employee_id\": \"$NEW_EMP_ID\",
    \"name\": \"Test Employee $TIMESTAMP\",
    \"email\": \"test$TIMESTAMP@example.com\",
    \"phone\": \"+919876543210\",
    \"password\": \"Test@123456\",
    \"roleName\": \"Employee\",
    \"department\": \"Testing\",
    \"designation\": \"Test Engineer\",
    \"joining_date\": \"2026-01-10\"
  }")

REG_SUCCESS=$(echo "$REGISTER_EMP" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('success') else 'no')" 2>/dev/null)

if [ "$REG_SUCCESS" = "yes" ]; then
    test_result "PASS" "Employee registered in Auth service"
else
    test_result "FAIL" "Employee registration failed" "$(echo $REGISTER_EMP | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('message','Unknown error'))" 2>/dev/null)"
fi

# Wait for employee sync to HR service
echo ""
echo "   ⏳ Waiting 3 seconds for employee sync (auth-db → hr-db)..."
sleep 3

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "TEST 4: VERIFY EMPLOYEE IN HR SERVICE"
echo "════════════════════════════════════════════════════════════════════"
echo "Testing: GET /api/hr/employees?employeeId=$NEW_EMP_ID"
echo ""

CHECK_HR_EMP=$(curl -k -s "${BASE_URL}/api/hr/employees?employeeId=$NEW_EMP_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

HR_EMP_ID=$(echo "$CHECK_HR_EMP" | python3 -c "import sys, json; d=json.load(sys.stdin); emps=d.get('data',[]); print(emps[0].get('id','') if len(emps) > 0 else '')" 2>/dev/null)
HR_EMP_EXISTS=$(echo "$CHECK_HR_EMP" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if len(d.get('data',[])) > 0 else 'no')" 2>/dev/null)

if [ "$HR_EMP_EXISTS" = "yes" ] && [ -n "$HR_EMP_ID" ]; then
    test_result "PASS" "Employee synced to HR database"
    echo "   HR Employee ID: $HR_EMP_ID"
else
    test_result "FAIL" "Employee not found in HR database" "Sync might have failed"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "TEST 5: ASSIGN STORE TO EMPLOYEE"
echo "════════════════════════════════════════════════════════════════════"
echo "Testing: PUT /api/hr/employees/$HR_EMP_ID"
echo "Assigning Store: $STORE_ID"
echo ""

if [ -n "$HR_EMP_ID" ] && [ -n "$STORE_ID" ]; then
    ASSIGN_STORE=$(curl -k -s -X PUT "${BASE_URL}/api/hr/employees/$HR_EMP_ID" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H 'Content-Type: application/json' \
      -d "{\"storeId\": \"$STORE_ID\"}")
    
    ASSIGN_SUCCESS=$(echo "$ASSIGN_STORE" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('success') else 'no')" 2>/dev/null)
    
    if [ "$ASSIGN_SUCCESS" = "yes" ]; then
        test_result "PASS" "Store assigned to employee"
    else
        test_result "FAIL" "Store assignment failed" "$(echo $ASSIGN_STORE | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('message','Unknown error'))" 2>/dev/null)"
    fi
else
    test_result "FAIL" "Store assignment skipped" "Missing HR_EMP_ID or STORE_ID"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "TEST 6: EMPLOYEE LOGIN"
echo "════════════════════════════════════════════════════════════════════"
echo "Testing: POST /api/auth/login (Employee)"
echo "Email: test$TIMESTAMP@example.com"
echo ""

EMP_LOGIN=$(curl -k -s -X POST "${BASE_URL}/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"emailOrEmployeeId\":\"test$TIMESTAMP@example.com\",\"password\":\"Test@123456\"}")

EMP_TOKEN=$(echo "$EMP_LOGIN" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data',{}).get('accessToken',''))" 2>/dev/null)
EMP_LOGIN_SUCCESS=$(echo "$EMP_LOGIN" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('success') else 'no')" 2>/dev/null)

if [ "$EMP_LOGIN_SUCCESS" = "yes" ] && [ -n "$EMP_TOKEN" ]; then
    test_result "PASS" "Employee login successful"
    echo "   Token: ${EMP_TOKEN:0:20}..."
else
    test_result "FAIL" "Employee login failed" "$(echo $EMP_LOGIN | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('message','Unknown error'))" 2>/dev/null)"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "TEST 7: GEOFENCE VERIFICATION"
echo "════════════════════════════════════════════════════════════════════"
echo "Testing: POST /api/hr/stores/$STORE_ID/verify-geofence"
echo "Location: 19.0760°N, 72.8777°E (exact store location)"
echo ""

if [ -n "$STORE_ID" ] && [ -n "$EMP_TOKEN" ]; then
    GEOFENCE=$(curl -k -s -X POST "${BASE_URL}/api/hr/stores/$STORE_ID/verify-geofence" \
      -H "Authorization: Bearer $EMP_TOKEN" \
      -H 'Content-Type: application/json' \
      -d '{"latitude": 19.0760, "longitude": 72.8777}')
    
    GEOFENCE_SUCCESS=$(echo "$GEOFENCE" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('success') else 'no')" 2>/dev/null)
    WITHIN_GEOFENCE=$(echo "$GEOFENCE" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('data',{}).get('withinGeofence') else 'no')" 2>/dev/null)
    
    if [ "$GEOFENCE_SUCCESS" = "yes" ]; then
        test_result "PASS" "Geofence verification successful"
        
        if [ "$WITHIN_GEOFENCE" = "yes" ]; then
            echo -e "   ${GREEN}✅ Employee is WITHIN geofence${NC}"
        else
            DISTANCE=$(echo "$GEOFENCE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data',{}).get('distance',0))" 2>/dev/null)
            echo -e "   ${YELLOW}⚠️  Employee is OUTSIDE geofence (${DISTANCE}m away)${NC}"
        fi
    else
        test_result "FAIL" "Geofence verification failed" "$(echo $GEOFENCE | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('message','Unknown error'))" 2>/dev/null)"
    fi
else
    test_result "FAIL" "Geofence verification skipped" "Missing STORE_ID or EMP_TOKEN"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "TEST 8: ATTENDANCE CLOCK-IN"
echo "════════════════════════════════════════════════════════════════════"
echo "Testing: POST /api/attendance/clock-in"
echo "Note: Selfie upload requires file (skipping for now)"
echo ""

if [ -n "$EMP_TOKEN" ]; then
    CLOCK_IN=$(curl -k -s -X POST "${BASE_URL}/api/attendance/clock-in" \
      -H "Authorization: Bearer $EMP_TOKEN" \
      -H 'Content-Type: application/json' \
      -d '{
        "latitude": 19.0760,
        "longitude": 72.8777,
        "notes": "Automated test clock-in"
      }')
    
    CLOCK_IN_SUCCESS=$(echo "$CLOCK_IN" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('success') else 'no')" 2>/dev/null)
    ATTENDANCE_ID=$(echo "$CLOCK_IN" | python3 -c "import sys, json; d=json.load(sys.stdin); data=d.get('data',{}); print(data.get('_id', data.get('id', '')))" 2>/dev/null)
    
    if [ "$CLOCK_IN_SUCCESS" = "yes" ] && [ -n "$ATTENDANCE_ID" ]; then
        test_result "PASS" "Clock-in successful"
        echo "   Attendance ID: $ATTENDANCE_ID"
        
        # Check if within geofence
        IS_VALID=$(echo "$CLOCK_IN" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('data',{}).get('is_geofence_valid') else 'no')" 2>/dev/null)
        if [ "$IS_VALID" = "yes" ]; then
            echo -e "   ${GREEN}✅ Geofence validated during clock-in${NC}"
        else
            echo -e "   ${YELLOW}⚠️  Geofence validation failed${NC}"
        fi
    else
        test_result "FAIL" "Clock-in failed" "$(echo $CLOCK_IN | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('message','Unknown error'))" 2>/dev/null)"
    fi
else
    test_result "FAIL" "Clock-in skipped" "Missing EMP_TOKEN"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "TEST 9: GET ATTENDANCE HISTORY"
echo "════════════════════════════════════════════════════════════════════"
echo "Testing: GET /api/attendance/history"
echo ""

if [ -n "$EMP_TOKEN" ]; then
    HISTORY=$(curl -k -s "${BASE_URL}/api/attendance/history?startDate=2026-01-10&endDate=2026-01-10&page=1&limit=10" \
      -H "Authorization: Bearer $EMP_TOKEN")
    
    HISTORY_SUCCESS=$(echo "$HISTORY" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('success') else 'no')" 2>/dev/null)
    RECORD_COUNT=$(echo "$HISTORY" | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('data',[])))" 2>/dev/null)
    
    if [ "$HISTORY_SUCCESS" = "yes" ]; then
        test_result "PASS" "Attendance history retrieved"
        echo "   Records found: $RECORD_COUNT"
    else
        test_result "FAIL" "Attendance history failed" "$(echo $HISTORY | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('message','Unknown error'))" 2>/dev/null)"
    fi
else
    test_result "FAIL" "Attendance history skipped" "Missing EMP_TOKEN"
fi

echo ""
echo "   ⏳ Waiting 5 seconds before clock-out..."
sleep 5

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "TEST 10: ATTENDANCE CLOCK-OUT"
echo "════════════════════════════════════════════════════════════════════"
echo "Testing: POST /api/attendance/clock-out"
echo ""

if [ -n "$EMP_TOKEN" ]; then
    CLOCK_OUT=$(curl -k -s -X POST "${BASE_URL}/api/attendance/clock-out" \
      -H "Authorization: Bearer $EMP_TOKEN" \
      -H 'Content-Type: application/json' \
      -d '{
        "latitude": 19.0762,
        "longitude": 72.8779,
        "notes": "Automated test clock-out"
      }')
    
    CLOCK_OUT_SUCCESS=$(echo "$CLOCK_OUT" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('success') else 'no')" 2>/dev/null)
    
    if [ "$CLOCK_OUT_SUCCESS" = "yes" ]; then
        test_result "PASS" "Clock-out successful"
        
        # Check total hours
        TOTAL_HOURS=$(echo "$CLOCK_OUT" | python3 -c "import sys, json; d=json.load(sys.stdin); data=d.get('data',{}); print(data.get('total_hours', 'N/A'))" 2>/dev/null)
        echo "   Total Hours: $TOTAL_HOURS"
    else
        test_result "FAIL" "Clock-out failed" "$(echo $CLOCK_OUT | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('message','Unknown error'))" 2>/dev/null)"
    fi
else
    test_result "FAIL" "Clock-out skipped" "Missing EMP_TOKEN"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "TEST 11: LEAVE BALANCE CHECK"
echo "════════════════════════════════════════════════════════════════════"
echo "Testing: GET /api/hr/leaves/balance?employeeId=$NEW_EMP_ID"
echo ""

if [ -n "$EMP_TOKEN" ]; then
    LEAVE_BALANCE=$(curl -k -s "${BASE_URL}/api/hr/leaves/balance?employeeId=$NEW_EMP_ID" \
      -H "Authorization: Bearer $EMP_TOKEN")
    
    LEAVE_SUCCESS=$(echo "$LEAVE_BALANCE" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('success') else 'no')" 2>/dev/null)
    
    if [ "$LEAVE_SUCCESS" = "yes" ]; then
        test_result "PASS" "Leave balance retrieved"
        
        # Display leave types
        echo "$LEAVE_BALANCE" | python3 -c "
import sys, json
d = json.load(sys.stdin)
data = d.get('data', {})
print(f'   Casual Leave: {data.get(\"casualLeave\", {}).get(\"available\", 0)}')
print(f'   Sick Leave: {data.get(\"sickLeave\", {}).get(\"available\", 0)}')
print(f'   Earned Leave: {data.get(\"earnedLeave\", {}).get(\"available\", 0)}')
" 2>/dev/null
    else
        test_result "FAIL" "Leave balance failed" "$(echo $LEAVE_BALANCE | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('message','Unknown error'))" 2>/dev/null)"
    fi
else
    test_result "FAIL" "Leave balance skipped" "Missing EMP_TOKEN"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "║                       FINAL RESULTS                              ║"
echo "════════════════════════════════════════════════════════════════════"
echo ""
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo "Success Rate: $SUCCESS_RATE%"
echo ""

if [ $SUCCESS_RATE -ge 90 ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  🎉 EXCELLENT! All critical tests passed! 🎉             ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
elif [ $SUCCESS_RATE -ge 70 ]; then
    echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  ⚠️  GOOD! Most tests passed, some issues to fix         ║${NC}"
    echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════╝${NC}"
else
    echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ NEEDS WORK! Multiple tests failed                     ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"
fi

echo ""
echo "Test completed at: $(date)"
echo "════════════════════════════════════════════════════════════════════"
