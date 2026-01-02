# Complete Tenant → Admin → Employee → Attendance Flow

## Overview
This document describes the complete end-to-end flow for:
1. Creating a Tenant
2. Creating Admin Login for Tenant
3. Creating Employee from Admin Login
4. Marking Attendance for Employee
5. Verifying Data in Database

---

## 📋 Flow Steps

### Step 1: Login as Super Admin
- **Endpoint**: `POST /api/auth/mock-login-fast` or `POST /api/auth/mock-login`
- **Purpose**: Get super admin token to create tenants
- **Payload**:
  ```json
  {
    "email": "admin@company.com",
    "role": "superadmin"
  }
  ```

### Step 2: Create Tenant
- **Endpoint**: `POST /api/tenants` (tenant-registry-service) or `POST /admin/v1/tenants` (tenant-management-service)
- **Purpose**: Create a new tenant organization
- **Payload** (tenant-registry-service):
  ```json
  {
    "tenantName": "Test Tenant",
    "domain": "testtenant.etelios.com",
    "subdomain": "testtenant",
    "plan": "basic",
    "configuration": {
      "timezone": "Asia/Kolkata",
      "currency": "INR",
      "language": "en",
      "dateFormat": "DD/MM/YYYY",
      "timeFormat": "24h"
    }
  }
  ```
- **Payload** (tenant-management-service):
  ```json
  {
    "name": "Test Tenant",
    "domain": "testtenant",
    "email": "admin@testtenant.etelios.com",
    "plan": "basic",
    "adminUser": {
      "firstName": "Tenant",
      "lastName": "Admin",
      "email": "admin@testtenant.etelios.com",
      "phone": "+91-9876543210"
    }
  }
  ```

### Step 3: Create Tenant Admin User
- **Endpoint**: `POST /api/auth/register`
- **Purpose**: Create admin user for the tenant
- **Payload**:
  ```json
  {
    "employeeId": "ADMIN-TESTTENANT",
    "firstName": "Tenant",
    "lastName": "Admin",
    "fullName": "Tenant Admin",
    "email": "admin@testtenant.etelios.com",
    "password": "Admin@123",
    "roleName": "admin",
    "phone": "+91-9876543210",
    "department": "Administration",
    "jobTitle": "Tenant Administrator",
    "tenantId": "testtenant"
  }
  ```

### Step 4: Login as Tenant Admin
- **Endpoint**: `POST /api/auth/mock-login-fast` or `POST /api/auth/mock-login`
- **Purpose**: Get tenant admin token
- **Payload**:
  ```json
  {
    "email": "admin@testtenant.etelios.com",
    "role": "admin",
    "tenantId": "testtenant"
  }
  ```

### Step 5: Create Employee
- **Endpoint**: `POST /api/hr/employees`
- **Purpose**: Create employee under the tenant
- **Payload**:
  ```json
  {
    "employeeId": "EMP-2025-123456",
    "firstName": "Test",
    "lastName": "Employee",
    "fullName": "Test Employee",
    "email": "employee.123456@testtenant.etelios.com",
    "password": "Employee@123",
    "roleName": "employee",
    "phone": "+91-9876543210",
    "department": "IT",
    "jobTitle": "Software Developer",
    "designation": "Software Engineer",
    "role_family": "Tech",
    "joining_date": "2025-01-01T00:00:00.000Z",
    "tenantId": "testtenant"
  }
  ```

### Step 6: Mark Attendance
- **Endpoint**: `POST /api/attendance/clock-in` and `POST /api/attendance/clock-out`
- **Purpose**: Mark attendance for employee
- **Clock In Payload**:
  ```json
  {
    "employeeId": "EMP-2025-123456",
    "timestamp": "2025-01-01T09:00:00.000Z",
    "location": {
      "latitude": 19.0760,
      "longitude": 72.8777,
      "address": "Mumbai, India"
    },
    "notes": "Morning check-in",
    "tenantId": "testtenant"
  }
  ```
- **Clock Out Payload**:
  ```json
  {
    "employeeId": "EMP-2025-123456",
    "timestamp": "2025-01-01T18:00:00.000Z",
    "location": {
      "latitude": 19.0760,
      "longitude": 72.8777,
      "address": "Mumbai, India"
    },
    "notes": "Evening check-out",
    "tenantId": "testtenant"
  }
  ```

### Step 7: Verify Data in Database
- **Tenant**: `GET /api/tenants/:tenantId` or `GET /admin/v1/tenants/:tenantId`
- **Employee**: `GET /api/hr/employees/:employeeId`
- **Attendance**: `GET /api/attendance/employee/:employeeId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

---

## 🗄️ Database Storage

### Tenant Data
- **Database**: `tenant-db`
- **Collection**: `tenants`
- **Service**: `tenant-registry-service` or `tenant-management-service`

### Admin User Data
- **Database**: `auth-db`
- **Collection**: `users`
- **Service**: `auth-service`

### Employee Data
- **Database**: `etelios_hr_service`
- **Collections**: 
  - `users` (for authentication)
  - `employees` (for HR data)
- **Service**: `hr-service`

### Attendance Data
- **Database**: `attendance-db`
- **Collection**: `attendances`
- **Service**: `attendance-service`

---

## 🚀 Running the Test

### Prerequisites
1. All services running locally or on production
2. Database connections configured correctly
3. Services accessible at configured URLs

### Local Testing
```bash
# Set environment variables
export BASE_URL=http://localhost:3001
export API_HOST=localhost

# Run the test script
node scripts/test-tenant-employee-attendance-flow.js
```

### Production Testing
```bash
# Set environment variables
export BASE_URL=https://98.70.245.87
export API_HOST=api.etelios.com

# Run the test script
node scripts/test-tenant-employee-attendance-flow.js
```

---

## ✅ Expected Results

After running the complete flow:

1. **Tenant Created**
   - Tenant record in `tenant-db` database
   - Tenant ID generated and stored

2. **Admin User Created**
   - User record in `auth-db` database
   - Admin credentials working

3. **Employee Created**
   - User record in `auth-db` database
   - Employee record in `etelios_hr_service` database
   - Employee ID generated

4. **Attendance Marked**
   - Clock-in record in `attendance-db` database
   - Clock-out record in `attendance-db` database
   - Attendance data linked to employee

---

## 🔍 Verification Commands

### Check Tenant in Database
```bash
# Connect to MongoDB
mongosh "mongodb://connection-string/tenant-db"

# Query tenants
db.tenants.find({ tenantId: "testtenant" })
```

### Check Admin User in Database
```bash
# Connect to MongoDB
mongosh "mongodb://connection-string/auth-db"

# Query users
db.users.find({ email: "admin@testtenant.etelios.com" })
```

### Check Employee in Database
```bash
# Connect to MongoDB
mongosh "mongodb://connection-string/etelios_hr_service"

# Query employees
db.employees.find({ employeeId: "EMP-2025-123456" })
db.users.find({ employeeId: "EMP-2025-123456" })
```

### Check Attendance in Database
```bash
# Connect to MongoDB
mongosh "mongodb://connection-string/attendance-db"

# Query attendance
db.attendances.find({ employeeId: "EMP-2025-123456" })
```

---

## 🐛 Troubleshooting

### Issue: Tenant creation fails
- **Check**: Tenant registry service is running
- **Check**: Database connection to `tenant-db`
- **Check**: No duplicate tenant ID/subdomain

### Issue: Admin user creation fails
- **Check**: Auth service is running
- **Check**: Database connection to `auth-db`
- **Check**: Valid tenant ID provided

### Issue: Employee creation fails
- **Check**: HR service is running
- **Check**: Database connection to `etelios_hr_service`
- **Check**: Valid tenant admin token
- **Check**: Required fields provided

### Issue: Attendance marking fails
- **Check**: Attendance service is running
- **Check**: Database connection to `attendance-db`
- **Check**: Valid employee ID
- **Check**: Valid tenant ID

---

## 📝 Notes

1. **Tenant Isolation**: Each tenant has its own data isolation
2. **Database Names**: All services use specific database names (not test databases)
3. **Token Management**: Tokens are tenant-scoped where applicable
4. **Data Persistence**: All data should persist across service restarts

---

**Last Updated**: 2026-01-01  
**Test Script**: `scripts/test-tenant-employee-attendance-flow.js`

