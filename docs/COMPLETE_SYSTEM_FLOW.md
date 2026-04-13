# 🚀 Complete System Flow - Superadmin to Employee Attendance

**Complete end-to-end flow documentation from superadmin login to real-time dashboard updates**

---

## 📋 Table of Contents

1. [Superadmin Login](#1-superadmin-login)
2. [Create Tenant](#2-create-tenant)
3. [Tenant Admin Creation & One-Time Password](#3-tenant-admin-creation--one-time-password)
4. [Password Reset on First Login](#4-password-reset-on-first-login)
5. [Create Store](#5-create-store)
6. [Create Department](#6-create-department)
7. [Create Employee](#7-create-employee)
8. [Assign Store and Department to Employee](#8-assign-store-and-department-to-employee)
9. [Employee Login](#9-employee-login)
10. [Employee Clock-In](#10-employee-clock-in)
11. [Employee Clock-Out](#11-employee-clock-out)
12. [Time Tracking](#12-time-tracking)
13. [Real-Time Dashboard Updates](#13-real-time-dashboard-updates)

---

## 1. Superadmin Login

### **Purpose:**
Platform owner (superadmin) logs in to create and manage tenants.

### **API Endpoint:**
```
POST /api/auth/login
```

### **Request:**
```json
{
  "email": "admin@upcapto.com",
  "password": "Upcapto@2026"
}
```

**Note:** `tenantId` is NOT required in request body. It's extracted from user record.

### **Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "69918dde41e0c3122f4df3dd",
      "tenantId": "upcapto",
      "employee_id": "UPCAPTO-ADMIN-001",
      "name": "Upcapto Super Admin",
      "email": "admin@upcapto.com",
      "role": "superadmin",
      "status": "active",
      "is_active": true,
      "mustChangePassword": false,
      "passwordTemporary": false
    },
    "mustChangePassword": false,
    "passwordTemporary": false
  }
}
```

### **Code Location:**
- **Service:** `microservices/auth-service/src/services/auth.service.js`
- **Method:** `login(emailOrEmployeeId, password, ip, userAgent)` (Line 287)
- **Controller:** `microservices/auth-service/src/controllers/authController.js`

### **Flow:**
```
1. User sends email/password
2. Auth service queries User model by email
3. Validates password using bcrypt
4. Checks if user is active
5. Generates JWT access token (15 min expiry)
6. Generates refresh token (7 days expiry)
7. Updates last_login timestamp
8. Returns tokens and user data
```

### **JWT Token Payload:**
```json
{
  "userId": "69918dde41e0c3122f4df3dd",
  "email": "admin@upcapto.com",
  "role": "superadmin",
  "tenantId": "upcapto",
  "employee_id": "UPCAPTO-ADMIN-001",
  "iat": 1771151013,
  "exp": 1771151913,
  "aud": "hrms-frontend",
  "iss": "hrms-backend"
}
```

---

## 2. Create Tenant

### **Purpose:**
Superadmin creates a new tenant (company/organization) in the system.

### **API Endpoint:**
```
POST /api/tenants
```

### **Headers:**
```
Authorization: Bearer <superadmin_access_token>
x-tenant-id: upcapto
Content-Type: application/json
```

### **Request:**
```json
{
  "name": "Lenstrack",
  "email": "admin@lenstrack.com",
  "domain": "lenstrack.com",
  "phone": "+91-9876543210",
  "city": "Mumbai",
  "state": "Maharashtra",
  "country": "India",
  "plan": "Professional"
}
```

### **Response:**
```json
{
  "success": true,
  "message": "Tenant created successfully",
  "data": {
    "tenantId": "lenstrack",
    "name": "Lenstrack",
    "domain": "lenstrack.com",
    "email": "admin@lenstrack.com",
    "status": "active",
    "plan": "professional",
    "adminUsers": {
      "admin": {
        "email": "admin@lenstrack.com",
        "temporaryPassword": "TempPass123!@#",
        "employeeId": "ADMIN-LENSTRACK-001",
        "role": "admin"
      },
      "superAdmin": {
        "email": "superadmin@lenstrack.com",
        "temporaryPassword": "SuperTemp456!@#",
        "employeeId": "SUPERADMIN-LENSTRACK-001",
        "role": "superadmin"
      }
    }
  }
}
```

### **Code Location:**
- **Controller:** `microservices/tenant-registry-service/src/controllers/tenant.controller.js`
- **Method:** `createTenant(req, res)` (Line 16)
- **Service:** `microservices/tenant-registry-service/src/services/adminUser.service.js`
- **Method:** `createAdminUsers(adminUserData, tenantId, tenantName, options)` (Line 18)

### **What Happens Automatically:**
1. ✅ Tenant record created in database
2. ✅ Tenant database created (if multi-database setup)
3. ✅ **Admin user created** with temporary password
4. ✅ **Super admin user created** with temporary password
5. ✅ Both users marked with `mustChangePassword: true`
6. ✅ Both users marked with `passwordTemporary: true`

### **Temporary Password Generation:**
- **Location:** `microservices/tenant-registry-service/src/services/adminUser.service.js` (Line 216)
- **Format:** 12 characters, mixed case, numbers, special chars
- **Example:** `TempPass123!@#`

### **Flow:**
```
1. Superadmin sends tenant creation request
2. Tenant registry service validates request
3. Creates tenant record
4. Creates tenant database (if applicable)
5. Calls adminUserService.createAdminUsers()
6. AdminUserService generates temporary passwords
7. Creates admin user via auth-service /api/auth/register
8. Creates super admin user via auth-service /api/auth/register
9. Returns tenant data with admin user credentials
```

---

## 3. Tenant Admin Creation & One-Time Password

### **Purpose:**
When tenant is created, admin users are automatically created with temporary passwords.

### **Code Location:**
- **Service:** `microservices/tenant-registry-service/src/services/adminUser.service.js`
- **Method:** `createAdminUsers(adminUserData, tenantId, tenantName, options)` (Line 18)

### **Admin User Creation:**
```javascript
const adminData = {
  employee_id: `ADMIN-${tenantId.toUpperCase()}-001`,
  name: `${baseName} (Admin)`,
  email: baseEmail, // e.g., "admin@lenstrack.com"
  phone: basePhone,
  password: adminPassword, // Temporary password
  role: 'admin',
  tenantId: tenantId,
  department: 'TECH',
  designation: 'System Administrator',
  is_active: true,
  status: 'active',
  band_level: 'A',
  hierarchy_level: 'NATIONAL',
  passwordTemporary: true, // ✅ Mark as temporary
  mustChangePassword: true // ✅ Force password change
};
```

### **Super Admin User Creation:**
```javascript
const superAdminData = {
  employee_id: `SUPERADMIN-${tenantId.toUpperCase()}-001`,
  name: `${baseName} (Super Admin)`,
  email: superAdminEmail, // e.g., "superadmin@lenstrack.com"
  phone: basePhone,
  password: superAdminPassword, // Temporary password
  role: 'superadmin',
  tenantId: tenantId,
  department: 'TECH',
  designation: 'Super Administrator',
  is_active: true,
  status: 'active',
  band_level: 'A',
  hierarchy_level: 'NATIONAL',
  passwordTemporary: true, // ✅ Mark as temporary
  mustChangePassword: true // ✅ Force password change
};
```

### **Temporary Password Generation:**
```javascript
generateTemporaryPassword() {
  // Format: At least 1 uppercase, 1 lowercase, 1 number, 1 special char
  // Total: 12 characters
  // Example: "TempPass123!@#"
}
```

### **API Call to Auth Service:**
```javascript
// Creates user via auth-service
POST http://auth-service/api/auth/register
Headers: {
  Authorization: Bearer <superadmin_token>, // Required for non-first-user
  Content-Type: application/json
}
Body: {
  ...adminData or superAdminData
}
```

### **Response from Auth Service:**
```json
{
  "success": true,
  "data": {
    "id": "user_mongodb_id",
    "email": "admin@lenstrack.com",
    "employee_id": "ADMIN-LENSTRACK-001",
    "role": "admin",
    "tenantId": "lenstrack",
    "mustChangePassword": true,
    "passwordTemporary": true
  }
}
```

### **What Gets Stored:**
- ✅ User record in Auth service database
- ✅ Password hashed with bcrypt
- ✅ `mustChangePassword: true` flag
- ✅ `passwordTemporary: true` flag
- ✅ Tenant ID for isolation

---

## 4. Password Reset on First Login

### **Purpose:**
When tenant admin logs in with temporary password, system detects `mustChangePassword: true` and forces password change.

### **API Endpoint (Login):**
```
POST /api/auth/login
```

### **Request (First Login with Temporary Password):**
```json
{
  "email": "admin@lenstrack.com",
  "password": "TempPass123!@#"
}
```

### **Response (With Password Change Flag):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "user_id",
      "email": "admin@lenstrack.com",
      "role": "admin",
      "tenantId": "lenstrack",
      "mustChangePassword": true, // ✅ Flag set
      "passwordTemporary": true    // ✅ Flag set
    },
    "mustChangePassword": true, // ✅ Frontend should show password change form
    "passwordTemporary": true
  }
}
```

### **Frontend Action:**
```javascript
// Frontend should detect mustChangePassword flag
if (response.data.mustChangePassword) {
  // Show password change modal/form
  // Block access to other features until password is changed
}
```

### **API Endpoint (Change Password):**
```
PUT /api/auth/change-password
```

### **Headers:**
```
Authorization: Bearer <access_token>
x-tenant-id: lenstrack
Content-Type: application/json
```

### **Request:**
```json
{
  "currentPassword": "TempPass123!@#",
  "newPassword": "MySecurePassword123!",
  "confirmPassword": "MySecurePassword123!"
}
```

### **Response:**
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": {
    "mustChangePassword": false,
    "passwordTemporary": false,
    "passwordChangedAt": "2026-02-28T10:30:00.000Z"
  }
}
```

### **Code Location:**
- **Service:** `microservices/auth-service/src/services/auth.service.js`
- **Method:** `changePassword(userId, currentPassword, newPassword)` (Line 625)
- **Controller:** `microservices/auth-service/src/controllers/authController.js`
- **Route:** `microservices/auth-service/src/routes/auth.routes.js`

### **What Happens:**
```javascript
// 1. Validates current password
const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
if (!isPasswordValid) {
  throw new Error('Current password is incorrect');
}

// 2. Validates new password strength
// (min length, complexity, etc.)

// 3. Hashes new password
const hashedPassword = await bcrypt.hash(newPassword, 10);

// 4. Updates user record
user.password = hashedPassword;
user.mustChangePassword = false; // ✅ Clear flag
user.passwordTemporary = false;  // ✅ Clear flag
user.passwordChangedAt = new Date();
await user.save();

// 5. Invalidates all refresh tokens (forces re-login)
await removeRefreshToken(userId);
```

### **Flow:**
```
1. Tenant admin logs in with temporary password
2. Auth service validates password
3. Checks mustChangePassword flag
4. Returns tokens + mustChangePassword: true
5. Frontend detects flag and shows password change form
6. User enters new password
7. Frontend calls /api/auth/change-password
8. Auth service validates current password
9. Updates password and clears flags
10. User can now access system normally
```

---

## 5. Create Store

### **Purpose:**
Tenant admin creates stores (locations) where employees work.

### **API Endpoint:**
```
POST /api/hr/stores
```

### **Headers:**
```
Authorization: Bearer <tenant_admin_token>
x-tenant-id: lenstrack
Content-Type: application/json
```

### **Request:**
```json
{
  "name": "Mumbai Store",
  "code": "LK001",
  "storeCode": "LK001",
  "address": {
    "street": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zip": "400001",
    "country": "India"
  },
  "coordinates": {
    "latitude": 19.0760,
    "longitude": 72.8777
  },
  "radius": 100,
  "phone": "+91-9876543210",
  "email": "mumbai@lenstrack.com",
  "status": "active"
}
```

### **Response:**
```json
{
  "success": true,
  "message": "Store created successfully",
  "data": {
    "_id": "store_mongodb_id",
    "name": "Mumbai Store",
    "code": "LK001",
    "storeCode": "LK001",
    "tenantId": "lenstrack",
    "address": {
      "street": "123 Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "zip": "400001",
      "country": "India"
    },
    "coordinates": {
      "latitude": 19.0760,
      "longitude": 72.8777
    },
    "radius": 100,
    "status": "active",
    "createdAt": "2026-02-28T10:00:00.000Z"
  }
}
```

### **Code Location:**
- **Controller:** `microservices/hr-service/src/controllers/hrController.js`
- **Method:** `createStore(req, res)` (Line 531)
- **Service:** `microservices/hr-service/src/services/hr.service.js`
- **Method:** `createStore(storeData, createdBy, tenantId)` (Line 1241)

### **Important Fields:**
- **`code` / `storeCode`:** Unique store identifier (e.g., "LK001")
- **`coordinates`:** GPS coordinates for geofencing
- **`radius`:** Geofence radius in meters
- **`tenantId`:** Automatically set from request context

### **Flow:**
```
1. Tenant admin sends store creation request
2. HR service validates request
3. Checks if store code already exists (within tenant)
4. Creates Store record with tenantId
5. Returns store data
```

---

## 6. Create Department

### **Purpose:**
Tenant admin creates departments (e.g., Sales, HR, IT).

### **API Endpoint:**
```
POST /api/hr/departments
```

### **Headers:**
```
Authorization: Bearer <tenant_admin_token>
x-tenant-id: lenstrack
Content-Type: application/json
```

### **Request:**
```json
{
  "name": "Sales",
  "code": "SALES",
  "description": "Sales Department",
  "head": "manager_employee_id",
  "status": "active"
}
```

### **Response:**
```json
{
  "success": true,
  "message": "Department created successfully",
  "data": {
    "_id": "dept_mongodb_id",
    "name": "Sales",
    "code": "SALES",
    "tenantId": "lenstrack",
    "description": "Sales Department",
    "status": "active",
    "createdAt": "2026-02-28T10:00:00.000Z"
  }
}
```

### **Code Location:**
- **Controller:** `microservices/hr-service/src/controllers/hrController.js`
- **Method:** `createDepartment(req, res)` (Line 935)
- **Service:** `microservices/hr-service/src/services/hr.service.js`
- **Method:** `createDepartment(departmentData, createdBy, tenantId)` (Line ~1400)

### **Flow:**
```
1. Tenant admin sends department creation request
2. HR service validates request
3. Checks if department code already exists (within tenant)
4. Creates Department record with tenantId
5. Returns department data
```

---

## 7. Create Employee

### **Purpose:**
Tenant admin/HR creates employee records.

### **API Endpoint:**
```
POST /api/hr/employees
```

### **Headers:**
```
Authorization: Bearer <tenant_admin_token>
x-tenant-id: lenstrack
Content-Type: application/json
```

### **Request:**
```json
{
  "employeeId": "EMP-2026-969954",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@lenstrack.com",
  "phone": "+91-9876543210",
  "password": "EmployeePass123!",
  "roleName": "employee",
  "department": "SALES",
  "storeId": "store_mongodb_id",
  "designation": "Sales Executive",
  "joining_date": "2026-01-01",
  "status": "active"
}
```

### **Response:**
```json
{
  "success": true,
  "message": "Employee created successfully",
  "data": {
    "_id": "employee_mongodb_id",
    "employeeId": "EMP-2026-969954",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@lenstrack.com",
    "role": "employee",
    "tenantId": "lenstrack",
    "store": {
      "_id": "store_mongodb_id",
      "name": "Mumbai Store",
      "code": "LK001"
    },
    "departmentRef": {
      "_id": "dept_mongodb_id",
      "name": "Sales",
      "code": "SALES"
    },
    "status": "active",
    "createdAt": "2026-02-28T10:00:00.000Z"
  }
}
```

### **Code Location:**
- **Controller:** `microservices/hr-service/src/controllers/hrController.js`
- **Service:** `microservices/hr-service/src/services/hr.service.js`
- **Method:** `createEmployee(employeeData, createdBy, tenantId)` (Line 48)

### **What Happens:**
```javascript
// 1. Validates employeeId uniqueness (within tenant)
const existingEmployeeId = await User.findOne({ 
  tenantId: employeeTenantId,
  employeeId: normalizedEmployeeId 
});

// 2. Validates email uniqueness (within tenant)
const existingUser = await User.findOne({ 
  tenantId: employeeTenantId,
  email: email.toLowerCase() 
});

// 3. Finds role
const role = await Role.findOne({ name: roleName || 'employee' });

// 4. Finds store (if storeId provided)
let store = null;
if (storeId) {
  store = await Store.findById(storeId);
}

// 5. Finds department (if department provided)
let departmentRef = null;
if (employeeData.department) {
  const dept = await findDepartment(employeeData.department, tenantId);
  if (dept) {
    departmentRef = dept._id;
  }
}

// 6. Creates employee record
const userData = {
  tenantId: employeeTenantId,
  employeeId: normalizedEmployeeId,
  email,
  password, // Will be hashed by pre-save hook
  role: role._id,
  store: store?._id,
  departmentRef,
  status: 'active',
  ...rest
};

// 7. Sets workLocation if store assigned
if (store && store._id) {
  userData.workLocation = {
    storeId: store._id.toString(),
    storeName: store.name || '',
    city: store.address?.city || '',
    state: store.address?.state || '',
    pincode: store.address?.zip || ''
  };
}

const employee = new User(userData);
await employee.save();
```

### **Flow:**
```
1. Tenant admin sends employee creation request
2. HR service validates employeeId uniqueness (within tenant)
3. Validates email uniqueness (within tenant)
4. Finds role, store, department
5. Creates User record with tenantId
6. Sets workLocation if store assigned
7. Returns employee data
```

---

## 8. Assign Store and Department to Employee

### **Purpose:**
Assign or update store and department for existing employee.

### **API Endpoint (Update Employee):**
```
PUT /api/hr/employees/:id
```

### **Headers:**
```
Authorization: Bearer <tenant_admin_token>
x-tenant-id: lenstrack
Content-Type: application/json
```

### **Request:**
```json
{
  "storeId": "store_mongodb_id",
  "department": "SALES"
}
```

### **Response:**
```json
{
  "success": true,
  "message": "Employee updated successfully",
  "data": {
    "_id": "employee_mongodb_id",
    "employeeId": "EMP-2026-969954",
    "store": {
      "_id": "store_mongodb_id",
      "name": "Mumbai Store",
      "code": "LK001"
    },
    "departmentRef": {
      "_id": "dept_mongodb_id",
      "name": "Sales",
      "code": "SALES"
    },
    "workLocation": {
      "storeId": "store_mongodb_id",
      "storeName": "Mumbai Store",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001"
    }
  }
}
```

### **Code Location:**
- **Service:** `microservices/hr-service/src/services/hr.service.js`
- **Method:** `updateEmployee(employeeId, updateData, updatedBy, tenantId)` (Line ~600)

### **What Happens:**
```javascript
// 1. Finds employee (with tenant isolation)
const employee = await User.findOne({
  _id: employeeId,
  tenantId: tenantId,
  isDeleted: false
});

// 2. Updates store if provided
if (updateData.storeId) {
  const store = await Store.findById(updateData.storeId);
  if (store) {
    employee.store = store._id;
    employee.workLocation = {
      storeId: store._id.toString(),
      storeName: store.name || '',
      city: store.address?.city || '',
      state: store.address?.state || '',
      pincode: store.address?.zip || ''
    };
  }
}

// 3. Updates department if provided
if (updateData.department) {
  const dept = await findDepartment(updateData.department, tenantId);
  if (dept) {
    employee.departmentRef = dept._id;
  }
}

await employee.save();
```

### **Flow:**
```
1. Tenant admin sends update request
2. HR service finds employee (with tenant isolation)
3. Updates store reference and workLocation
4. Updates department reference
5. Saves employee record
6. Returns updated employee data
```

---

## 9. Employee Login

### **Purpose:**
Employee logs in to access the system.

### **API Endpoint:**
```
POST /api/auth/login
```

### **Request:**
```json
{
  "email": "john.doe@lenstrack.com",
  "password": "EmployeePass123!"
}
```

**OR using Employee ID:**
```json
{
  "email": "EMP-2026-969954",
  "password": "EmployeePass123!"
}
```

### **Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "employee_mongodb_id",
      "employeeId": "EMP-2026-969954",
      "email": "john.doe@lenstrack.com",
      "name": "John Doe",
      "role": "employee",
      "tenantId": "lenstrack",
      "store": {
        "_id": "store_mongodb_id",
        "name": "Mumbai Store",
        "code": "LK001"
      },
      "departmentRef": {
        "_id": "dept_mongodb_id",
        "name": "Sales",
        "code": "SALES"
      },
      "status": "active",
      "is_active": true,
      "mustChangePassword": false,
      "passwordTemporary": false
    },
    "mustChangePassword": false,
    "passwordTemporary": false
  }
}
```

### **Code Location:**
- **Service:** `microservices/auth-service/src/services/auth.service.js`
- **Method:** `login(emailOrEmployeeId, password, ip, userAgent)` (Line 287)

### **What Happens:**
```javascript
// 1. Finds user by email or employee ID
let user;
if (emailOrEmployeeId.includes('@')) {
  user = await User.findOne({ email: emailOrEmployeeId.toLowerCase() })
    .select('+password');
} else {
  user = await User.findOne({ employee_id: emailOrEmployeeId.toUpperCase() })
    .select('+password');
}

// 2. Validates password
const isPasswordValid = await bcrypt.compare(password, user.password);
if (!isPasswordValid) {
  throw new Error('Invalid email or password');
}

// 3. Checks if user is active
if (!user.is_active || user.status === 'inactive') {
  throw new Error('Account is inactive');
}

// 4. Updates last_login timestamp
user.last_login = new Date();
await user.save();

// 5. Generates JWT tokens
const accessToken = generateAccessToken(user);
const refreshToken = generateRefreshToken(user);

// 6. Returns tokens and user data
```

### **Flow:**
```
1. Employee sends email/password
2. Auth service finds user by email or employee ID
3. Validates password
4. Checks if user is active
5. Updates last_login
6. Generates JWT tokens
7. Returns tokens and user data
```

---

## 10. Employee Clock-In

### **Purpose:**
Employee records clock-in with GPS location and selfie.

### **API Endpoint:**
```
POST /api/attendance/clock-in
```

### **Headers:**
```
Authorization: Bearer <employee_access_token>
x-tenant-id: lenstrack
Content-Type: application/json
```

**Note:** `employeeId` is NOT required in body. It's extracted from JWT token.

### **Request:**
```json
{
  "latitude": 19.0760,
  "longitude": 72.8777,
  "timestamp": 1709107200000,
  "notes": "Clock-in from mobile app",
  "selfie": "data:image/jpeg;base64,/9j/4AAQ..." // Optional: base64 string
}
```

**OR with file upload (multipart/form-data):**
```
Content-Type: multipart/form-data

latitude: 19.0760
longitude: 72.8777
notes: Clock-in from mobile app
selfie: <file>
```

### **Response:**
```json
{
  "success": true,
  "message": "Clock-in recorded successfully",
  "data": {
    "id": "attendance_mongodb_id",
    "employeeId": "EMP-2026-969954",
    "employeeName": "John Doe",
    "checkIn": {
      "time": "2026-02-28T10:30:00.000Z",
      "location": {
        "latitude": 19.0760,
        "longitude": 72.8777,
        "address": "Clock-in from mobile app"
      },
      "selfie": "https://s3.amazonaws.com/bucket/selfie_url.jpg"
    },
    "store": {
      "_id": "store_mongodb_id",
      "name": "Mumbai Store",
      "code": "LK001"
    },
    "storeCode": "LK001",
    "date": "2026-02-28T10:30:00.000Z",
    "status": "present",
    "geofence_status": "valid",
    "isClockedIn": true
  }
}
```

### **Code Location:**
- **Controller:** `microservices/attendance-service/src/controllers/attendanceController.js`
- **Method:** `clockIn(req, res, next)` (Line 26)
- **Service:** `microservices/attendance-service/src/services/attendance.service.js`
- **Method:** `clockIn(user, latitude, longitude, selfieUrl, notes, token)` (Line 18)

### **What Happens:**
```javascript
// 1. Extracts employee from JWT token
const employeeId = req.user._id; // MongoDB _id
const employee = await getEmployeeByUser(req.user, token);

// 2. Fetches employee's assigned store
let store = await getEmployeeStore(employee, token);
if (!store) {
  throw new Error('Employee is not assigned to a store');
}

// 3. Checks for open attendance (today only)
const today = new Date();
today.setHours(0, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const todayAttendance = await Attendance.find({
  employee: employeeMongoId,
  employee_id: employee.employeeId,
  $or: [
    { date: { $gte: today, $lt: tomorrow } },
    { check_in_time: { $gte: today, $lt: tomorrow } }
  ],
  check_in_time: { $exists: true, $ne: null }
}).lean();

// 4. Checks if any record is open (check_in exists, check_out is null)
let openAttendance = null;
for (const record of todayAttendance) {
  if (record.check_in_time && !record.check_out_time) {
    openAttendance = record;
    break;
  }
}

if (openAttendance) {
  throw new Error('Please clock out from your current session before clocking in again');
}

// 5. Validates geofence (if store has coordinates)
let isWithinGeofenceArea = false;
if (store.coordinates?.latitude && store.coordinates?.longitude) {
  isWithinGeofenceArea = isWithinGeofence(
    latitude,
    longitude,
    store.coordinates.latitude,
    store.coordinates.longitude,
    store.radius || 100
  );
}

// 6. Handles selfie upload (if provided)
let selfieUrl = null;
if (req.body.selfie) {
  // Base64 string in body
  const base64Data = req.body.selfie.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  selfieUrl = await uploadToS3(buffer, `selfies/${employeeId}/${Date.now()}.jpg`);
} else if (req.file) {
  // File upload via multer
  selfieUrl = await uploadToS3(req.file.buffer, `selfies/${employeeId}/${Date.now()}.jpg`);
}

// 7. Creates attendance record
const attendance = new Attendance({
  employee: employeeMongoId,
  employee_id: employee.employeeId,
  employeeName: employee.name,
  store: store._id,
  store_code: store.code || store.storeCode,
  date: new Date(),
  check_in_time: new Date(),
  check_in_location: {
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    address: notes || ''
  },
  check_in_selfie: selfieUrl ? {
    secure_url: selfieUrl,
    uploaded_at: new Date()
  } : null,
  status: 'present',
  geofence_status: isWithinGeofenceArea ? 'valid' : 'invalid',
  notes
});

await attendance.save();

// 8. Broadcasts real-time update
await realtimeClient.broadcastAttendance(tenantId, {
  employeeId: employee.employeeId,
  action: 'check_in',
  timestamp: attendance.check_in_time,
  location: `${latitude}, ${longitude}`
});

// 9. Returns attendance data
```

### **Flow:**
```
1. Employee sends clock-in request with GPS location
2. Attendance service extracts employee from JWT
3. Fetches employee's assigned store
4. Checks for open attendance (prevents duplicate clock-in)
5. Validates geofence (if store has coordinates)
6. Uploads selfie to S3 (if provided)
7. Creates attendance record
8. Broadcasts real-time update via WebSocket
9. Returns attendance data
```

### **Real-Time Broadcast:**
```javascript
// Broadcasts to all connected clients in tenant
realtimeService.broadcastAttendanceUpdate(tenantId, {
  employeeId: "EMP-2026-969954",
  action: "check_in",
  timestamp: "2026-02-28T10:30:00.000Z",
  location: "19.0760, 72.8777"
});
```

---

## 11. Employee Clock-Out

### **Purpose:**
Employee records clock-out with GPS location and selfie.

### **API Endpoint:**
```
POST /api/attendance/check-out
```

### **Headers:**
```
Authorization: Bearer <employee_access_token>
x-tenant-id: lenstrack
Content-Type: application/json
```

### **Request:**
```json
{
  "timestamp": 1709140800000,
  "latitude": 19.0760,
  "longitude": 72.8777,
  "notes": "Clock-out from mobile app",
  "selfie": "data:image/jpeg;base64,/9j/4AAQ..." // Optional
}
```

### **Response:**
```json
{
  "success": true,
  "message": "Clock-out recorded successfully",
  "data": {
    "id": "attendance_mongodb_id",
    "employeeId": "EMP-2026-969954",
    "employeeName": "John Doe",
    "checkIn": {
      "time": "2026-02-28T10:30:00.000Z",
      "location": { "latitude": 19.0760, "longitude": 72.8777 }
    },
    "checkOut": {
      "time": "2026-02-28T18:30:00.000Z",
      "location": { "latitude": 19.0760, "longitude": 72.8777 },
      "selfie": "https://s3.amazonaws.com/bucket/selfie_url.jpg"
    },
    "total_hours": 8.0,
    "storeCode": "LK001",
    "status": "present",
    "isClockedIn": false
  }
}
```

### **Code Location:**
- **Controller:** `microservices/attendance-service/src/controllers/attendanceController.js`
- **Method:** `clockOut(req, res, next)` (Line ~250)
- **Service:** `microservices/attendance-service/src/services/attendance.service.js`
- **Method:** `clockOut(employeeId, latitude, longitude, selfieUrl, notes)` (Line ~460)

### **What Happens:**
```javascript
// 1. Extracts employee from JWT token
const employeeId = req.user._id;

// 2. Finds open attendance record (today)
const today = new Date();
today.setHours(0, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const attendance = await Attendance.findOne({
  employee: employeeMongoId,
  employee_id: employee.employeeId,
  $or: [
    { date: { $gte: today, $lt: tomorrow } },
    { check_in_time: { $gte: today, $lt: tomorrow } }
  ],
  check_in_time: { $exists: true, $ne: null },
  check_out_time: { $exists: false } // Only open records
});

if (!attendance) {
  throw new Error('No open attendance record found. Please clock in first.');
}

// 3. Calculates total hours
const checkInTime = new Date(attendance.check_in_time);
const checkOutTime = new Date();
const totalHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);

// 4. Handles selfie upload (if provided)
let selfieUrl = null;
if (req.body.selfie) {
  const base64Data = req.body.selfie.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  selfieUrl = await uploadToS3(buffer, `selfies/${employeeId}/${Date.now()}.jpg`);
}

// 5. Updates attendance record
attendance.check_out_time = checkOutTime;
attendance.check_out_location = {
  latitude: parseFloat(latitude),
  longitude: parseFloat(longitude),
  address: notes || ''
};
attendance.check_out_selfie = selfieUrl ? {
  secure_url: selfieUrl,
  uploaded_at: new Date()
} : null;
attendance.total_hours = totalHours;

await attendance.save();

// 6. Broadcasts real-time update
await realtimeClient.broadcastAttendance(tenantId, {
  employeeId: employee.employeeId,
  action: 'check_out',
  timestamp: checkOutTime,
  totalHours: totalHours
});

// 7. Returns attendance data
```

### **Flow:**
```
1. Employee sends clock-out request
2. Attendance service finds open attendance record
3. Calculates total hours worked
4. Uploads selfie to S3 (if provided)
5. Updates attendance record with check-out data
6. Broadcasts real-time update via WebSocket
7. Returns attendance data
```

---

## 12. Time Tracking

### **Purpose:**
Track and calculate total login time and work hours for employees.

### **API Endpoint:**
```
GET /api/hr/time-tracking?employeeId=EMP-2026-969954&date=2026-02-28
```

### **Headers:**
```
Authorization: Bearer <admin_or_employee_token>
x-tenant-id: lenstrack
```

### **Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-02-28",
      "checkIn": "2026-02-28T10:30:00.000Z",
      "checkOut": "2026-02-28T18:30:00.000Z",
      "duration": 8.0,
      "status": "present"
    }
  ]
}
```

### **Code Location:**
- **Controller:** `microservices/hr-service/src/controllers/timeTrackingController.js`
- **Method:** `getTimeTracking(req, res, next)`

### **What Happens:**
```javascript
// 1. Gets employeeId from query params or JWT
const employeeId = req.query.employeeId || req.user.employee_id;

// 2. Gets date range
const date = req.query.date || new Date().toISOString().split('T')[0];
const startDate = new Date(date);
startDate.setHours(0, 0, 0, 0);
const endDate = new Date(startDate);
endDate.setDate(endDate.getDate() + 1);

// 3. Fetches attendance records from attendance service
const attendanceResponse = await axios.get(
  `${ATTENDANCE_SERVICE_URL}/api/attendance/list`,
  {
    params: {
      employeeId: employeeId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    },
    headers: {
      Authorization: `Bearer ${token}`,
      'x-tenant-id': tenantId
    }
  }
);

// 4. Calculates duration for each record
const timeTracking = attendanceResponse.data.data.map(record => ({
  date: record.date,
  checkIn: record.check_in_time,
  checkOut: record.check_out_time,
  duration: record.total_hours || 0,
  status: record.status
}));

// 5. Returns time tracking data
```

### **Dashboard Integration:**
```javascript
// Dashboard service aggregates time tracking
const getUnifiedDashboard = async (userId, role, tenantId) => {
  // ... other data ...
  
  // Get time tracking
  const timeTracking = await getTimeTracking(employeeId, date, token, tenantId);
  
  // Calculate total login time
  const totalLoginTime = timeTracking.reduce((sum, record) => {
    return sum + (record.duration || 0);
  }, 0);
  
  // Calculate recent login time (last session)
  const recentLoginTime = timeTracking[0]?.duration || 0;
  
  return {
    ...otherData,
    timeTracking: {
      total: totalLoginTime,
      recent: recentLoginTime,
      records: timeTracking
    }
  };
};
```

### **Flow:**
```
1. Admin/Employee requests time tracking
2. HR service extracts employeeId
3. Calls attendance service for attendance records
4. Calculates duration for each record
5. Aggregates total login time
6. Returns time tracking data
```

---

## 13. Real-Time Dashboard Updates

### **Purpose:**
Update dashboards in real-time when attendance events occur.

### **Architecture:**
- **WebSocket Service:** `microservices/realtime-service`
- **Protocol:** Socket.IO
- **Events:** `attendance:update`, `attendance:check_in`, `attendance:check_out`, `dashboard:stats_update`

### **WebSocket Connection:**
```javascript
// Frontend connects to WebSocket
const socket = io('http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com', {
  auth: {
    token: accessToken,
    tenantId: 'lenstrack'
  }
});

// Join tenant room
socket.emit('join:tenant', { tenantId: 'lenstrack' });

// Listen for attendance updates
socket.on('attendance:update', (data) => {
  console.log('Attendance update:', data);
  // Update UI
});

// Listen for check-in events
socket.on('attendance:check_in', (data) => {
  console.log('Check-in event:', data);
  // Update attendance list
});

// Listen for dashboard stats updates
socket.on('dashboard:stats_update', (stats) => {
  console.log('Dashboard stats:', stats);
  // Update dashboard
});
```

### **Code Location:**
- **Service:** `microservices/realtime-service/src/services/realtime.service.js`
- **Method:** `broadcastAttendanceUpdate(tenantId, attendanceData)` (Line 544)
- **Client:** `microservices/attendance-service/src/utils/realtime.client.js`
- **Method:** `broadcastAttendance(tenantId, attendanceData)` (Line 43)

### **What Happens on Clock-In:**
```javascript
// 1. Attendance service records clock-in
const attendance = await clockIn(user, latitude, longitude, selfieUrl, notes, token);

// 2. Broadcasts attendance update
await realtimeClient.broadcastAttendance(tenantId, {
  employeeId: employee.employeeId,
  action: 'check_in',
  timestamp: attendance.check_in_time,
  location: `${latitude}, ${longitude}`
});

// 3. Realtime service broadcasts to all connected clients
realtimeService.broadcastAttendanceUpdate(tenantId, {
  employeeId: "EMP-2026-969954",
  action: "check_in",
  timestamp: "2026-02-28T10:30:00.000Z",
  location: "19.0760, 72.8777"
});

// 4. All connected clients in tenant receive update
// - Admin dashboard: Updates attendance list
// - HR dashboard: Updates attendance stats
// - Employee dashboard: Updates own attendance status
```

### **What Happens on Clock-Out:**
```javascript
// 1. Attendance service records clock-out
const attendance = await clockOut(employeeId, latitude, longitude, selfieUrl, notes);

// 2. Broadcasts attendance update
await realtimeClient.broadcastAttendance(tenantId, {
  employeeId: employee.employeeId,
  action: 'check_out',
  timestamp: attendance.check_out_time,
  totalHours: attendance.total_hours
});

// 3. Realtime service broadcasts to all connected clients
realtimeService.broadcastAttendanceUpdate(tenantId, {
  employeeId: "EMP-2026-969954",
  action: "check_out",
  timestamp: "2026-02-28T18:30:00.000Z",
  totalHours: 8.0
});

// 4. Dashboard service updates stats
realtimeService.broadcastDashboardUpdate(tenantId, {
  totalEmployees: 100,
  presentToday: 85,
  absentToday: 15,
  onTime: 80,
  late: 5
});
```

### **Dashboard Stats Update:**
```javascript
// Dashboard service calculates stats
const stats = {
  totalEmployees: await User.countDocuments({ tenantId, status: 'active' }),
  presentToday: await Attendance.countDocuments({
    tenantId,
    date: today,
    status: 'present'
  }),
  absentToday: totalEmployees - presentToday,
  onTime: await Attendance.countDocuments({
    tenantId,
    date: today,
    is_late: false
  }),
  late: await Attendance.countDocuments({
    tenantId,
    date: today,
    is_late: true
  })
};

// Broadcasts stats update
realtimeService.broadcastDashboardUpdate(tenantId, stats);
```

### **Frontend Implementation:**
```javascript
// React/Next.js Example
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function Dashboard() {
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => {
    // Connect to WebSocket
    const socket = io(API_BASE_URL, {
      auth: {
        token: localStorage.getItem('accessToken'),
        tenantId: localStorage.getItem('tenantId')
      }
    });

    // Join tenant room
    socket.emit('join:tenant', { tenantId: localStorage.getItem('tenantId') });

    // Listen for attendance updates
    socket.on('attendance:update', (data) => {
      setAttendance(prev => {
        // Update or add attendance record
        const index = prev.findIndex(a => a.employeeId === data.employeeId);
        if (index >= 0) {
          prev[index] = { ...prev[index], ...data };
          return [...prev];
        } else {
          return [...prev, data];
        }
      });
    });

    // Listen for check-in events
    socket.on('attendance:check_in', (data) => {
      // Add to attendance list
      setAttendance(prev => [...prev, data]);
    });

    // Listen for dashboard stats
    socket.on('dashboard:stats_update', (newStats) => {
      setStats(newStats);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <div>Present Today: {stats.presentToday}</div>
      <div>Absent Today: {stats.absentToday}</div>
      {/* Attendance list */}
    </div>
  );
}
```

### **Flow:**
```
1. Employee clocks in/out
2. Attendance service records event
3. Attendance service calls realtime client
4. Realtime client sends event to realtime service
5. Realtime service broadcasts to all connected clients in tenant
6. Admin/HR/Employee dashboards receive update
7. UI updates automatically (no page refresh needed)
```

---

## 📊 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETE SYSTEM FLOW                          │
└─────────────────────────────────────────────────────────────────┘

1. SUPERADMIN LOGIN
   POST /api/auth/login
   ↓
   Get JWT Token

2. CREATE TENANT
   POST /api/tenants
   ↓
   Tenant Created
   ↓
   Admin Users Auto-Created (with temporary passwords)

3. TENANT ADMIN LOGIN (First Time)
   POST /api/auth/login
   ↓
   Response: mustChangePassword: true
   ↓
   Frontend Shows Password Change Form

4. CHANGE PASSWORD
   PUT /api/auth/change-password
   ↓
   Password Changed, Flags Cleared

5. CREATE STORE
   POST /api/hr/stores
   ↓
   Store Created (with coordinates for geofencing)

6. CREATE DEPARTMENT
   POST /api/hr/departments
   ↓
   Department Created

7. CREATE EMPLOYEE
   POST /api/hr/employees
   ↓
   Employee Created
   ↓
   Store & Department Assigned

8. EMPLOYEE LOGIN
   POST /api/auth/login
   ↓
   Get JWT Token

9. EMPLOYEE CLOCK-IN
   POST /api/attendance/clock-in
   ↓
   Attendance Record Created
   ↓
   Real-Time Broadcast (WebSocket)
   ↓
   All Dashboards Updated

10. EMPLOYEE CLOCK-OUT
    POST /api/attendance/check-out
    ↓
    Attendance Record Updated
    ↓
    Total Hours Calculated
    ↓
    Real-Time Broadcast (WebSocket)
    ↓
    All Dashboards Updated

11. TIME TRACKING
    GET /api/hr/time-tracking
    ↓
    Aggregates Attendance Data
    ↓
    Returns Total Login Time

12. REAL-TIME DASHBOARD
    WebSocket Connection
    ↓
    Listens for Events
    ↓
    Updates UI Automatically
```

---

## 🔑 Key Code Files Reference

| Step | Service | File | Method |
|------|---------|------|--------|
| 1. Superadmin Login | auth-service | `src/services/auth.service.js` | `login()` (Line 287) |
| 2. Create Tenant | tenant-registry-service | `src/controllers/tenant.controller.js` | `createTenant()` (Line 16) |
| 3. Admin User Creation | tenant-registry-service | `src/services/adminUser.service.js` | `createAdminUsers()` (Line 18) |
| 4. Password Change | auth-service | `src/services/auth.service.js` | `changePassword()` (Line 625) |
| 5. Create Store | hr-service | `src/services/hr.service.js` | `createStore()` (Line 1241) |
| 6. Create Department | hr-service | `src/services/hr.service.js` | `createDepartment()` |
| 7. Create Employee | hr-service | `src/services/hr.service.js` | `createEmployee()` (Line 48) |
| 8. Assign Store/Dept | hr-service | `src/services/hr.service.js` | `updateEmployee()` |
| 9. Employee Login | auth-service | `src/services/auth.service.js` | `login()` (Line 287) |
| 10. Clock-In | attendance-service | `src/services/attendance.service.js` | `clockIn()` (Line 18) |
| 11. Clock-Out | attendance-service | `src/services/attendance.service.js` | `clockOut()` (Line ~460) |
| 12. Time Tracking | hr-service | `src/controllers/timeTrackingController.js` | `getTimeTracking()` |
| 13. Real-Time Updates | realtime-service | `src/services/realtime.service.js` | `broadcastAttendanceUpdate()` (Line 544) |

---

## 📝 Important Notes

### **Tenant Isolation:**
- All queries filter by `tenantId`
- Employee IDs are unique per tenant
- Stores and departments are tenant-specific

### **Security:**
- JWT tokens contain `tenantId` and `employee_id`
- All API calls require `Authorization: Bearer <token>`
- Tenant ID extracted from token or `x-tenant-id` header

### **Real-Time Updates:**
- WebSocket connection required for real-time features
- Events are tenant-scoped (only same tenant receives updates)
- Dashboard stats update automatically on attendance events

### **Selfie Upload:**
- Supports both base64 string and file upload
- Stored in AWS S3
- URL returned in attendance record

### **Geofencing:**
- Store must have `coordinates` (latitude, longitude) and `radius`
- Clock-in validates if employee is within geofence
- `geofence_status` field indicates validity

---

**Last Updated:** 2026-02-28  
**Version:** 1.0
