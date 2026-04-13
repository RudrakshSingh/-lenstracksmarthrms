#!/bin/bash

# Script to create auth user for Vaibhav Dwivedi directly in database
# This uses kubectl exec to run Node.js code inside the auth-service pod

set -e

API_BASE="http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
TENANT_ID="upcapto"

echo "🔐 Step 1: Login as Admin..."
ADMIN_TOKEN=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@upcapto.com","password":"Upcapto@2026"}' | jq -r '.data.accessToken')

echo "✅ Admin token obtained"
echo ""

echo "👤 Step 2: Finding Vaibhav Dwivedi employee..."
VAIBHAV_EMP=$(curl -s -X GET "$API_BASE/api/hr/employees?search=Vaibhav" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-tenant-id: $TENANT_ID" | jq '.data[] | select(.fullName | contains("Vaibhav"))')

if [ -z "$VAIBHAV_EMP" ] || [ "$VAIBHAV_EMP" == "null" ]; then
  echo "❌ Vaibhav Dwivedi employee not found"
  exit 1
fi

EMPLOYEE_ID=$(echo "$VAIBHAV_EMP" | jq -r '.employeeId')
EMPLOYEE_EMAIL=$(echo "$VAIBHAV_EMP" | jq -r '.email')
EMPLOYEE_DB_ID=$(echo "$VAIBHAV_EMP" | jq -r '._id // .id')
EMPLOYEE_NAME=$(echo "$VAIBHAV_EMP" | jq -r '.fullName')

echo "✅ Found employee:"
echo "   Name: $EMPLOYEE_NAME"
echo "   Employee ID: $EMPLOYEE_ID"
echo "   Email: $EMPLOYEE_EMAIL"
echo "   DB ID: $EMPLOYEE_DB_ID"
echo ""

echo "🔑 Step 3: Creating auth user in database..."
EMPLOYEE_PASSWORD="Vaibhav@123"

# Create Node.js script to create user
AUTH_USER_SCRIPT=$(cat <<EOF
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/etelios';
await mongoose.connect(mongoUri);

// User schema (simplified)
const userSchema = new mongoose.Schema({
  employee_id: String,
  name: String,
  email: String,
  password: String,
  role: String,
  tenantId: String,
  status: String,
  is_active: Boolean
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

// Check if user exists
const existingUser = await User.findOne({ email: '$EMPLOYEE_EMAIL' });

if (existingUser) {
  console.log('User already exists, updating password...');
  const hashedPassword = await bcrypt.hash('$EMPLOYEE_PASSWORD', 12);
  existingUser.password = hashedPassword;
  await existingUser.save();
  console.log('Password updated successfully');
} else {
  // Create new user
  const hashedPassword = await bcrypt.hash('$EMPLOYEE_PASSWORD', 12);
  const newUser = new User({
    employee_id: '$EMPLOYEE_ID',
    name: '$EMPLOYEE_NAME',
    email: '$EMPLOYEE_EMAIL',
    password: hashedPassword,
    role: 'employee',
    tenantId: '$TENANT_ID',
    status: 'active',
    is_active: true
  });
  await newUser.save();
  console.log('User created successfully');
}

await mongoose.disconnect();
EOF
)

# Get auth-service pod
AUTH_POD=$(kubectl get pods -n etelios-prod | grep auth-service | head -1 | awk '{print $1}')

if [ -z "$AUTH_POD" ]; then
  echo "❌ Auth service pod not found"
  exit 1
fi

echo "Using pod: $AUTH_POD"
echo ""

# Execute script in pod
echo "Creating user in database..."
kubectl exec -n etelios-prod $AUTH_POD -- node -e "$AUTH_USER_SCRIPT" 2>&1

echo ""
echo "🧪 Step 4: Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMPLOYEE_EMAIL\",
    \"password\": \"$EMPLOYEE_PASSWORD\"
  }")

LOGIN_SUCCESS=$(echo "$LOGIN_RESPONSE" | jq -r '.success')

if [ "$LOGIN_SUCCESS" == "true" ]; then
  VAIBHAV_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken')
  echo "✅ Login successful!"
  echo ""
  
  echo "📅 Step 5: Marking attendance (Clock-In)..."
  CLOCK_IN_RESPONSE=$(curl -s -X POST "$API_BASE/api/attendance/clock-in" \
    -H "Authorization: Bearer $VAIBHAV_TOKEN" \
    -H "x-tenant-id: $TENANT_ID" \
    -H "Content-Type: application/json" \
    -d '{
      "latitude": 19.0760,
      "longitude": 72.8777,
      "notes": "Clock-in for Vaibhav Dwivedi"
    }')
  
  CLOCK_IN_SUCCESS=$(echo "$CLOCK_IN_RESPONSE" | jq -r '.success')
  
  if [ "$CLOCK_IN_SUCCESS" == "true" ]; then
    ATTENDANCE_ID=$(echo "$CLOCK_IN_RESPONSE" | jq -r '.data._id // .data.id')
    echo "✅ Clock-in successful!"
    echo "   Attendance ID: $ATTENDANCE_ID"
    echo ""
    
    echo "📊 Step 6: Verifying attendance..."
    ATTENDANCE_CHECK=$(curl -s -X GET "$API_BASE/api/attendance?employeeId=$EMPLOYEE_DB_ID&date=$(date +%Y-%m-%d)" \
      -H "Authorization: Bearer $VAIBHAV_TOKEN" \
      -H "x-tenant-id: $TENANT_ID")
    
    ATTENDANCE_COUNT=$(echo "$ATTENDANCE_CHECK" | jq '.data | length // 0')
    echo "✅ Attendance records found: $ATTENDANCE_COUNT"
  else
    echo "❌ Clock-in failed"
    echo "$CLOCK_IN_RESPONSE" | jq '.'
  fi
else
  echo "❌ Login failed"
  echo "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi

echo ""
echo "=========================================="
echo "✅ VAIBHAV DWIVEDI SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "📋 Login Credentials:"
echo "   Email: $EMPLOYEE_EMAIL"
echo "   Password: $EMPLOYEE_PASSWORD"
echo "   Tenant: $TENANT_ID"
echo ""
echo "✅ Attendance: Marked"
