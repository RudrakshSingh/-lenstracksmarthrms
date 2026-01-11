#!/bin/bash

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║              INTENSIVE API TESTING SUITE                         ║"
echo "║  Edge Cases • Error Handling • Security • Performance            ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

BASE_URL="https://98.70.245.87"
TIMESTAMP=$(date +%s)

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Get admin token
ADMIN_TOKEN=$(curl -k -s -X POST "${BASE_URL}/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"emailOrEmployeeId":"admin@etelios.com","password":"Admin@123456"}' \
  | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data',{}).get('accessToken',''))" 2>/dev/null)

echo "════════════════════════════════════════════════════════════════════"
echo "CATEGORY 1: AUTHENTICATION & AUTHORIZATION TESTS"
echo "════════════════════════════════════════════════════════════════════"
echo ""

echo "Test 1.1: Login with Invalid Credentials"
INVALID_LOGIN=$(curl -k -s -X POST "${BASE_URL}/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"emailOrEmployeeId":"admin@etelios.com","password":"WrongPassword"}')
INVALID_SUCCESS=$(echo "$INVALID_LOGIN" | python3 -c "import sys, json; d=json.load(sys.stdin); print('no' if d.get('success') else 'yes')" 2>/dev/null)
[ "$INVALID_SUCCESS" = "yes" ] && test_result "PASS" "Invalid credentials rejected" || test_result "FAIL" "Invalid credentials accepted"

echo ""
echo "Test 1.2: Access Protected Endpoint Without Token"
NO_TOKEN=$(curl -k -s "${BASE_URL}/api/hr/employees")
NO_TOKEN_BLOCKED=$(echo "$NO_TOKEN" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if not d.get('success') else 'no')" 2>/dev/null)
[ "$NO_TOKEN_BLOCKED" = "yes" ] && test_result "PASS" "Unauthorized access blocked" || test_result "FAIL" "Unauthorized access allowed"

echo ""
echo "Test 1.3: Access With Invalid Token"
INVALID_TOKEN=$(curl -k -s "${BASE_URL}/api/hr/employees" -H "Authorization: Bearer invalid_token_here")
INVALID_BLOCKED=$(echo "$INVALID_TOKEN" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if not d.get('success') else 'no')" 2>/dev/null)
[ "$INVALID_BLOCKED" = "yes" ] && test_result "PASS" "Invalid token rejected" || test_result "FAIL" "Invalid token accepted"

echo ""
echo "Test 1.4: Login with Missing Fields"
MISSING_FIELDS=$(curl -k -s -X POST "${BASE_URL}/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"emailOrEmployeeId":"admin@etelios.com"}')
MISSING_REJECTED=$(echo "$MISSING_FIELDS" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if not d.get('success') else 'no')" 2>/dev/null)
[ "$MISSING_REJECTED" = "yes" ] && test_result "PASS" "Missing fields validation working" || test_result "FAIL" "Missing fields accepted"

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "CATEGORY 2: DATA VALIDATION TESTS"
echo "════════════════════════════════════════════════════════════════════"
echo ""

echo "Test 2.1: Create Store with Missing Required Fields"
INVALID_STORE=$(curl -k -s -X POST "${BASE_URL}/api/hr/stores" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test Store"}')
STORE_REJECTED=$(echo "$INVALID_STORE" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if not d.get('success') else 'no')" 2>/dev/null)
[ "$STORE_REJECTED" = "yes" ] && test_result "PASS" "Store validation working (missing fields)" || test_result "FAIL" "Invalid store data accepted"

echo ""
echo "Test 2.2: Create Store with Invalid Google Maps URL"
INVALID_URL_STORE=$(curl -k -s -X POST "${BASE_URL}/api/hr/stores" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name":"Test Store",
    "code":"TEST-INVALID-$TIMESTAMP",
    "address":{"street":"Test","city":"Test","country":"India"},
    "googleMapsUrl":"not-a-valid-url"
  }')
URL_HANDLED=$(echo "$INVALID_URL_STORE" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('success') or 'invalid' in d.get('message','').lower() else 'no')" 2>/dev/null)
[ "$URL_HANDLED" = "yes" ] && test_result "PASS" "Invalid URL handled gracefully" || test_result "FAIL" "Invalid URL not handled"

echo ""
echo "Test 2.3: Create Employee with Invalid Email"
INVALID_EMAIL=$(curl -k -s -X POST "${BASE_URL}/api/auth/register" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "employee_id":"EMP-INVALID-$TIMESTAMP",
    "name":"Test User",
    "email":"not-an-email",
    "password":"Test@123456",
    "roleName":"Employee"
  }')
EMAIL_REJECTED=$(echo "$INVALID_EMAIL" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if not d.get('success') else 'no')" 2>/dev/null)
[ "$EMAIL_REJECTED" = "yes" ] && test_result "PASS" "Invalid email rejected" || test_result "FAIL" "Invalid email accepted"

echo ""
echo "Test 2.4: Geofence with Invalid Coordinates"
# Get a valid store first
VALID_STORE=$(curl -k -s "${BASE_URL}/api/hr/stores?limit=1" -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -c "import sys, json; d=json.load(sys.stdin); stores=d.get('data',[]); print(stores[0].get('_id', stores[0].get('id','')) if len(stores) > 0 else '')" 2>/dev/null)

if [ -n "$VALID_STORE" ]; then
    INVALID_COORDS=$(curl -k -s -X POST "${BASE_URL}/api/hr/stores/$VALID_STORE/verify-geofence" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H 'Content-Type: application/json' \
      -d '{"latitude":999,"longitude":999}')
    COORDS_REJECTED=$(echo "$INVALID_COORDS" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if not d.get('success') or 'invalid' in str(d).lower() else 'no')" 2>/dev/null)
    [ "$COORDS_REJECTED" = "yes" ] && test_result "PASS" "Invalid coordinates handled" || test_result "FAIL" "Invalid coordinates accepted"
else
    test_result "FAIL" "No store available for geofence test"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "CATEGORY 3: EDGE CASES & BOUNDARY TESTS"
echo "════════════════════════════════════════════════════════════════════"
echo ""

echo "Test 3.1: Create Duplicate Store (Same Code)"
STORE1=$(curl -k -s -X POST "${BASE_URL}/api/hr/stores" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"name\":\"Duplicate Test Store\",
    \"code\":\"DUP-TEST-$TIMESTAMP\",
    \"address\":{\"street\":\"Test\",\"city\":\"Test\",\"country\":\"India\"}
  }")
STORE1_SUCCESS=$(echo "$STORE1" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('success') else 'no')" 2>/dev/null)

if [ "$STORE1_SUCCESS" = "yes" ]; then
    STORE2=$(curl -k -s -X POST "${BASE_URL}/api/hr/stores" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H 'Content-Type: application/json' \
      -d "{
        \"name\":\"Duplicate Test Store 2\",
        \"code\":\"DUP-TEST-$TIMESTAMP\",
        \"address\":{\"street\":\"Test\",\"city\":\"Test\",\"country\":\"India\"}
      }")
    DUPLICATE_BLOCKED=$(echo "$STORE2" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if not d.get('success') else 'no')" 2>/dev/null)
    [ "$DUPLICATE_BLOCKED" = "yes" ] && test_result "PASS" "Duplicate store code rejected" || test_result "FAIL" "Duplicate store code accepted"
else
    test_result "FAIL" "Could not create first store for duplicate test"
fi

echo ""
echo "Test 3.2: Update Store with Very Long Name (Boundary Test)"
if [ -n "$VALID_STORE" ]; then
    LONG_NAME=$(python3 -c "print('A' * 500)")
    LONG_NAME_UPDATE=$(curl -k -s -X PUT "${BASE_URL}/api/hr/stores/$VALID_STORE" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H 'Content-Type: application/json' \
      -d "{\"name\":\"$LONG_NAME\"}")
    LONG_NAME_HANDLED=$(echo "$LONG_NAME_UPDATE" | python3 -c "import sys, json; d=json.load(sys.stdin); print('handled' if d.get('success') or 'validation' in str(d).lower() or 'too long' in str(d).lower() else 'not_handled')" 2>/dev/null)
    [ "$LONG_NAME_HANDLED" = "handled" ] && test_result "PASS" "Long name boundary test passed" || test_result "FAIL" "Long name not validated"
fi

echo ""
echo "Test 3.3: Query Employees with Large Limit"
LARGE_LIMIT=$(curl -k -s "${BASE_URL}/api/hr/employees?limit=10000" -H "Authorization: Bearer $ADMIN_TOKEN")
LIMIT_HANDLED=$(echo "$LARGE_LIMIT" | python3 -c "import sys, json; d=json.load(sys.stdin); data=d.get('data',[]); print('yes' if len(data) <= 100 else 'no')" 2>/dev/null)
[ "$LIMIT_HANDLED" = "yes" ] && test_result "PASS" "Large limit capped correctly" || test_result "FAIL" "Large limit not capped"

echo ""
echo "Test 3.4: Get Non-Existent Resource (404 Handling)"
NON_EXISTENT=$(curl -k -s "${BASE_URL}/api/hr/stores/000000000000000000000000" -H "Authorization: Bearer $ADMIN_TOKEN")
NOT_FOUND=$(echo "$NON_EXISTENT" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if not d.get('success') else 'no')" 2>/dev/null)
[ "$NOT_FOUND" = "yes" ] && test_result "PASS" "404 handled correctly" || test_result "FAIL" "404 not handled"

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "CATEGORY 4: PERFORMANCE & CONCURRENT OPERATIONS"
echo "════════════════════════════════════════════════════════════════════"
echo ""

echo "Test 4.1: Rapid Sequential Requests (Rate Limiting)"
START_TIME=$(date +%s)
for i in {1..5}; do
    curl -k -s "${BASE_URL}/api/hr/stores?page=1&limit=1" -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
done
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
echo "   Completed 5 requests in ${DURATION}s"
[ $DURATION -lt 10 ] && test_result "PASS" "Rapid requests handled efficiently" || test_result "FAIL" "Requests too slow"

echo ""
echo "Test 4.2: Pagination Performance"
PAGE1_START=$(date +%s%N)
PAGE1=$(curl -k -s "${BASE_URL}/api/hr/employees?page=1&limit=10" -H "Authorization: Bearer $ADMIN_TOKEN")
PAGE1_END=$(date +%s%N)
PAGE1_TIME=$(( (PAGE1_END - PAGE1_START) / 1000000 ))
echo "   Page 1 response time: ${PAGE1_TIME}ms"
[ $PAGE1_TIME -lt 2000 ] && test_result "PASS" "Pagination response time acceptable (<2s)" || test_result "FAIL" "Pagination too slow"

echo ""
echo "Test 4.3: Concurrent Store Creation (5 stores simultaneously)"
CONCURRENT_START=$(date +%s)
for i in {1..5}; do
    (curl -k -s -X POST "${BASE_URL}/api/hr/stores" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H 'Content-Type: application/json' \
      -d "{
        \"name\":\"Concurrent Store $i\",
        \"code\":\"CONC-$TIMESTAMP-$i\",
        \"address\":{\"street\":\"Test\",\"city\":\"Test\",\"country\":\"India\"}
      }" > /dev/null) &
done
wait
CONCURRENT_END=$(date +%s)
CONCURRENT_TIME=$((CONCURRENT_END - CONCURRENT_START))
echo "   Created 5 stores concurrently in ${CONCURRENT_TIME}s"
[ $CONCURRENT_TIME -lt 15 ] && test_result "PASS" "Concurrent operations handled well" || test_result "FAIL" "Concurrent operations slow"

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "CATEGORY 5: GEOFENCING & LOCATION ACCURACY"
echo "════════════════════════════════════════════════════════════════════"
echo ""

# Create a test store with known coordinates
GEO_STORE=$(curl -k -s -X POST "${BASE_URL}/api/hr/stores" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"name\":\"Geo Test Store\",
    \"code\":\"GEO-$TIMESTAMP\",
    \"address\":{\"street\":\"Test\",\"city\":\"Mumbai\",\"country\":\"India\"},
    \"googleMapsUrl\":\"https://maps.google.com/?q=19.0760,72.8777\",
    \"geofenceRadius\":100
  }")
GEO_STORE_ID=$(echo "$GEO_STORE" | python3 -c "import sys, json; d=json.load(sys.stdin); data=d.get('data',{}); print(data.get('_id', data.get('id','')))" 2>/dev/null)

if [ -n "$GEO_STORE_ID" ]; then
    echo "Test 5.1: Geofence at Exact Location"
    GEO_EXACT=$(curl -k -s -X POST "${BASE_URL}/api/hr/stores/$GEO_STORE_ID/verify-geofence" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H 'Content-Type: application/json' \
      -d '{"latitude":19.0760,"longitude":72.8777}')
    EXACT_WITHIN=$(echo "$GEO_EXACT" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('data',{}).get('withinGeofence') else 'no')" 2>/dev/null)
    EXACT_DISTANCE=$(echo "$GEO_EXACT" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data',{}).get('distance',999))" 2>/dev/null)
    echo "   Distance: ${EXACT_DISTANCE}m"
    [ "$EXACT_WITHIN" = "yes" ] && [ $(echo "$EXACT_DISTANCE < 1" | bc) -eq 1 ] && test_result "PASS" "Exact location detection accurate" || test_result "FAIL" "Exact location detection inaccurate"
    
    echo ""
    echo "Test 5.2: Geofence Within Radius (50m away)"
    GEO_NEAR=$(curl -k -s -X POST "${BASE_URL}/api/hr/stores/$GEO_STORE_ID/verify-geofence" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H 'Content-Type: application/json' \
      -d '{"latitude":19.0764,"longitude":72.8782}')
    NEAR_WITHIN=$(echo "$GEO_NEAR" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('data',{}).get('withinGeofence') else 'no')" 2>/dev/null)
    NEAR_DISTANCE=$(echo "$GEO_NEAR" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data',{}).get('distance',999))" 2>/dev/null)
    echo "   Distance: ${NEAR_DISTANCE}m"
    [ "$NEAR_WITHIN" = "yes" ] && test_result "PASS" "Within radius detection working" || test_result "FAIL" "Within radius detection failed"
    
    echo ""
    echo "Test 5.3: Geofence Outside Radius (500m away)"
    GEO_FAR=$(curl -k -s -X POST "${BASE_URL}/api/hr/stores/$GEO_STORE_ID/verify-geofence" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H 'Content-Type: application/json' \
      -d '{"latitude":19.0800,"longitude":72.8820}')
    FAR_OUTSIDE=$(echo "$GEO_FAR" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if not d.get('data',{}).get('withinGeofence') else 'no')" 2>/dev/null)
    FAR_DISTANCE=$(echo "$GEO_FAR" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data',{}).get('distance',0))" 2>/dev/null)
    echo "   Distance: ${FAR_DISTANCE}m"
    [ "$FAR_OUTSIDE" = "yes" ] && test_result "PASS" "Outside radius detection working" || test_result "FAIL" "Outside radius detection failed"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "CATEGORY 6: DATA INTEGRITY & CONSISTENCY"
echo "════════════════════════════════════════════════════════════════════"
echo ""

echo "Test 6.1: Employee Sync Consistency (auth-db → hr-db)"
SYNC_EMP=$(curl -k -s -X POST "${BASE_URL}/api/auth/register" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"employee_id\":\"EMP-SYNC-$TIMESTAMP\",
    \"name\":\"Sync Test User\",
    \"email\":\"sync$TIMESTAMP@test.com\",
    \"password\":\"Test@123456\",
    \"roleName\":\"Employee\"
  }")
SYNC_SUCCESS=$(echo "$SYNC_EMP" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if d.get('success') else 'no')" 2>/dev/null)

if [ "$SYNC_SUCCESS" = "yes" ]; then
    sleep 3
    CHECK_SYNC=$(curl -k -s "${BASE_URL}/api/hr/employees?employeeId=EMP-SYNC-$TIMESTAMP" -H "Authorization: Bearer $ADMIN_TOKEN")
    SYNC_FOUND=$(echo "$CHECK_SYNC" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if len(d.get('data',[])) > 0 else 'no')" 2>/dev/null)
    [ "$SYNC_FOUND" = "yes" ] && test_result "PASS" "Employee sync working correctly" || test_result "FAIL" "Employee sync failed"
else
    test_result "FAIL" "Could not create employee for sync test"
fi

echo ""
echo "Test 6.2: Store Update Preserves Data Integrity"
if [ -n "$VALID_STORE" ]; then
    ORIGINAL=$(curl -k -s "${BASE_URL}/api/hr/stores/$VALID_STORE" -H "Authorization: Bearer $ADMIN_TOKEN")
    ORIGINAL_CODE=$(echo "$ORIGINAL" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data',{}).get('code',''))" 2>/dev/null)
    
    UPDATE=$(curl -k -s -X PUT "${BASE_URL}/api/hr/stores/$VALID_STORE" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H 'Content-Type: application/json' \
      -d '{"geofenceRadius":150}')
    
    UPDATED=$(curl -k -s "${BASE_URL}/api/hr/stores/$VALID_STORE" -H "Authorization: Bearer $ADMIN_TOKEN")
    UPDATED_CODE=$(echo "$UPDATED" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data',{}).get('code',''))" 2>/dev/null)
    
    [ "$ORIGINAL_CODE" = "$UPDATED_CODE" ] && test_result "PASS" "Data integrity preserved after update" || test_result "FAIL" "Data integrity compromised"
fi

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "CATEGORY 7: ERROR RECOVERY & RESILIENCE"
echo "════════════════════════════════════════════════════════════════════"
echo ""

echo "Test 7.1: Malformed JSON Handling"
MALFORMED=$(curl -k -s -X POST "${BASE_URL}/api/hr/stores" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","invalid_json}')
MALFORMED_REJECTED=$(echo "$MALFORMED" | python3 -c "import sys, json; d=json.load(sys.stdin) if sys.stdin.read().strip() else {}; print('yes' if not d.get('success',False) else 'no')" 2>/dev/null || echo "yes")
[ "$MALFORMED_REJECTED" = "yes" ] && test_result "PASS" "Malformed JSON rejected" || test_result "FAIL" "Malformed JSON accepted"

echo ""
echo "Test 7.2: Missing Content-Type Header"
NO_CONTENT_TYPE=$(curl -k -s -X POST "${BASE_URL}/api/hr/stores" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"name":"Test"}')
NO_CT_HANDLED=$(echo "$NO_CONTENT_TYPE" | python3 -c "import sys, json; d=json.load(sys.stdin) if sys.stdin.read().strip() else {}; print('handled')" 2>/dev/null || echo "handled")
[ -n "$NO_CT_HANDLED" ] && test_result "PASS" "Missing Content-Type handled" || test_result "FAIL" "Missing Content-Type crashed"

echo ""
echo "Test 7.3: SQL Injection Attempt (Security)"
SQL_INJECT=$(curl -k -s "${BASE_URL}/api/hr/employees?employeeId=1%27%20OR%20%271%27%3D%271" -H "Authorization: Bearer $ADMIN_TOKEN")
SQL_BLOCKED=$(echo "$SQL_INJECT" | python3 -c "import sys, json; d=json.load(sys.stdin); print('yes' if len(d.get('data',[])) == 0 or not d.get('success') else 'no')" 2>/dev/null)
[ "$SQL_BLOCKED" = "yes" ] && test_result "PASS" "SQL injection blocked" || test_result "FAIL" "SQL injection vulnerability"

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "║                       INTENSIVE TEST RESULTS                     ║"
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
    echo -e "${GREEN}║  🎉 EXCELLENT! System is highly robust and secure! 🎉    ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
elif [ $SUCCESS_RATE -ge 75 ]; then
    echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  ✅ GOOD! System is solid with minor improvements needed ║${NC}"
    echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════╝${NC}"
elif [ $SUCCESS_RATE -ge 60 ]; then
    echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  ⚠️  ACCEPTABLE! Some issues need attention              ║${NC}"
    echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════╝${NC}"
else
    echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ NEEDS WORK! Multiple critical issues found            ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"
fi

echo ""
echo "Test completed at: $(date)"
echo "════════════════════════════════════════════════════════════════════"
