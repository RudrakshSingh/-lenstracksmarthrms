# Mock Employee Login Credentials

## 👤 Test Employee Account

This employee account is created specifically for testing attendance functionality.

### Login Credentials

```
Email:    employee.test@upcapto.com
Password: Employee@123
Tenant:   upcapto
Role:     employee
Employee ID: EMP-TEST-177219
```

**⚠️ Important**: The employee record exists in HR service, but the auth user needs to be created separately.

**Current Status**:
- ✅ Employee created in HR service
- ⚠️ Auth user creation via API failed (Internal Server Error)
- 🔧 **Workaround**: Use the admin account to create employees via the HR UI, which will automatically create the auth user

**Alternative**: If you have an existing employee account, use that for testing attendance instead.

### Employee Details

- **Employee ID**: `EMP-TEST-XXXXXX` (auto-generated)
- **Name**: Test Employee
- **Department**: Sales
- **Designation**: Sales Executive
- **Status**: Active
- **Store**: Test Store Mumbai (with coordinates)
- **Location**: Mumbai, Maharashtra

---

## 🧪 Testing Attendance

### Step 1: Login
```bash
curl -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "employee.test@upcapto.com",
    "password": "Employee@123"
  }'
```

### Step 2: Clock-In (with GPS)
```bash
TOKEN="<token-from-login>"

curl -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/clock-in" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 19.0760,
    "longitude": 72.8777,
    "notes": "Clock-in from test"
  }'
```

### Step 3: Clock-In (with Selfie + GPS)
```bash
curl -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/clock-in" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto" \
  -F "latitude=19.0760" \
  -F "longitude=72.8777" \
  -F "notes=Clock-in with selfie" \
  -F "selfie=@/path/to/selfie.jpg;type=image/jpeg"
```

### Step 4: Clock-Out
```bash
curl -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/clock-out" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 19.0760,
    "longitude": 72.8777,
    "notes": "Clock-out"
  }'
```

### Step 5: Get Attendance History
```bash
curl -X GET "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance?employeeId=<EMPLOYEE_ID>&date=2026-02-15" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto"
```

---

## 📝 Frontend Usage

### Login Example
```typescript
const loginResponse = await fetch(
  'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/login',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'employee.test@upcapto.com',
      password: 'Employee@123',
    }),
  }
);

const { data } = await loginResponse.json();
const token = data.accessToken;
const tenantId = data.user.tenantId;

// Store in localStorage
localStorage.setItem('accessToken', token);
localStorage.setItem('tenantId', tenantId);
```

### Clock-In Example
```typescript
const token = localStorage.getItem('accessToken');
const tenantId = localStorage.getItem('tenantId');

const formData = new FormData();
formData.append('latitude', '19.0760');
formData.append('longitude', '72.8777');
formData.append('notes', 'Clock-in from app');

// Optional: Add selfie
if (selfieFile) {
  formData.append('selfie', selfieFile);
}

const response = await fetch(
  'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/clock-in',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      // Don't set Content-Type for FormData
    },
    body: formData,
  }
);

const result = await response.json();
console.log('Clock-in result:', result);
```

---

## ⚠️ Important Notes

1. **Store Assignment**: This employee is assigned to "Test Store Mumbai" with coordinates (19.0760, 72.8777)
2. **Geofencing**: Clock-in/out must be within 100 meters of the store location
3. **Password**: The password is set during employee creation. If login fails, the password might need to be set separately in auth service.
4. **Token Expiry**: JWT tokens expire after 24 hours. Re-login if token expires.

---

## 🔄 Recreate Employee

If you need to recreate the employee, run:
```bash
./create-mock-employee.sh
```

This will:
1. Create a new store (if none exists)
2. Create a new employee with unique ID
3. Assign employee to the store
4. Provide login credentials

---

**Last Updated**: 2026-02-15  
**Status**: Ready for testing ✅
