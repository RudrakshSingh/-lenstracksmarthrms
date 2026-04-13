#!/bin/bash

API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"

echo "🔑 Step 1: Login as Admin"
ADMIN_TOKEN=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@upcapto.com","password":"Upcapto@2026"}' \
  | jq -r '.data.accessToken')

echo "✅ Admin token obtained"
echo ""

echo "👤 Step 2: Get Employee"
ALL_EMPS=$(curl -s -X GET "$API_BASE/api/hr/employees?limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: upcapto")

EMP_EMAIL=$(echo "$ALL_EMPS" | jq -r '.data[0].email')
EMP_ID=$(echo "$ALL_EMPS" | jq -r '.data[0].employeeId')

echo "Employee: $EMP_ID"
echo "Email: $EMP_EMAIL"
echo ""

echo "📸 Step 3: Mark Attendance"
echo "Creating test selfie..."
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > /tmp/test_selfie.png

echo "Sending clock-in request with selfie + GPS..."
ATTENDANCE=$(curl -s -X POST "$API_BASE/api/attendance/clock-in" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: upcapto" \
  -F "selfie=@/tmp/test_selfie.png" \
  -F "latitude=19.0760" \
  -F "longitude=72.8777" \
  -F "accuracy=10.5" \
  -F "notes=Test attendance")

echo ""
echo "Response:"
echo "$ATTENDANCE" | jq '.'

SUCCESS=$(echo "$ATTENDANCE" | jq -r '.success')

if [ "$SUCCESS" == "true" ]; then
    echo ""
    echo "✅✅✅ ATTENDANCE MARKED! ✅✅✅"
    echo ""
    echo "Details:"
    echo "$ATTENDANCE" | jq '.data | {employeeId: .employee_id, checkIn: .check_in_time, status, location: .check_in_location}'
else
    echo ""
    echo "Error:"
    echo "$ATTENDANCE" | jq '{error, message}'
fi
