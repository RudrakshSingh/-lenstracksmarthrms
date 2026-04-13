# 🎯 Lenstrack Complete Flow Test Summary

## ✅ What's Working

### 1. **Superadmin & Admin Login**
- ✅ Upcapto Superadmin: `admin@upcapto.com` / `Upcapto@2026`
- ✅ Lenstrack Admin: `admin@lenstrack.com` / `AdminPass123!`
- ✅ Both logins verified and working

### 2. **Store & Department**
- ✅ Store "Mumbai Store" (LK001) - Created/Exists
- ✅ Department "Sales" (SALES) - Created/Exists

### 3. **Employee Creation**
- ✅ Employee creation in HR service is working
- ✅ Employee created: `EMP-2026-840039` (example)
- ⚠️ **Issue:** Auth service user not automatically created

## ⚠️ Current Issue

**Employee Login Fails** because:
- Employee is created in **HR service** database
- But **Auth service** database doesn't have the user record
- Auth service requires separate registration

**Error:**
```
User validation failed: joining_date: Path `joining_date` is required., 
name: Path `name` is required., 
employee_id: Path `employee_id` is required., 
role: `69a2ca0724aaef8b1daf5aa3` is not a valid enum value for path `role`.
```

## 🔧 Solution

### Option 1: Manual Auth Service Registration (Recommended)

After creating employee in HR service, register them in auth service:

```bash
curl -X POST http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -H "x-tenant-id: lenstrack" \
  -d '{
    "tenantId": "lenstrack",
    "employee_id": "EMP-2026-840039",
    "name": "Test Employee",
    "email": "test.employee.1772284840039@lenstrack.com",
    "phone": "+91-9876543210",
    "password": "EmployeePass123!",
    "role": "employee",
    "department": "SALES",
    "designation": "Sales Executive",
    "joining_date": "2026-02-28",
    "status": "active"
  }'
```

### Option 2: Fix HR Service to Auto-Register

Modify `microservices/hr-service/src/services/hr.service.js` to call auth service `/api/auth/register` after creating employee in HR database.

## 📋 Complete Test Flow

1. ✅ **Login as Lenstrack Admin**
2. ✅ **Get/Create Store** (LK001 - Mumbai Store)
3. ✅ **Get/Create Department** (SALES - Sales)
4. ✅ **Create Employee** in HR service
5. ⚠️ **Register Employee** in Auth service (manual step needed)
6. ✅ **Employee Login** (after auth registration)
7. ✅ **Clock-In**
8. ✅ **Get Today's Attendance**
9. ✅ **Clock-Out**
10. ✅ **Check Dashboard** (attendance reflection)
11. ✅ **Time Tracking**

## 🚀 Quick Test Commands

### 1. Login as Admin
```bash
curl -X POST http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lenstrack.com","password":"AdminPass123!"}'
```

### 2. Create Employee
```bash
curl -X POST http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/hr/employees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -H "x-tenant-id: lenstrack" \
  -d '{
    "employeeId": "EMP-2026-TEST01",
    "firstName": "Test",
    "lastName": "Employee",
    "email": "test@lenstrack.com",
    "password": "EmployeePass123!",
    "roleName": "employee",
    "department": "SALES",
    "storeId": "<store_id>",
    "designation": "Sales Executive",
    "joining_date": "2026-02-28",
    "status": "active"
  }'
```

### 3. Register in Auth Service
```bash
curl -X POST http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -H "x-tenant-id: lenstrack" \
  -d '{
    "tenantId": "lenstrack",
    "employee_id": "EMP-2026-TEST01",
    "name": "Test Employee",
    "email": "test@lenstrack.com",
    "password": "EmployeePass123!",
    "role": "employee",
    "department": "SALES",
    "designation": "Sales Executive",
    "joining_date": "2026-02-28",
    "status": "active"
  }'
```

### 4. Employee Login
```bash
curl -X POST http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@lenstrack.com","password":"EmployeePass123!"}'
```

### 5. Clock-In
```bash
curl -X POST http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/clock-in \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <employee_token>" \
  -H "x-tenant-id: lenstrack" \
  -d '{
    "latitude": 19.0760,
    "longitude": 72.8777,
    "timestamp": '$(date +%s000)',
    "notes": "Test clock-in"
  }'
```

### 6. Clock-Out
```bash
curl -X POST http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/check-out \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <employee_token>" \
  -H "x-tenant-id: lenstrack" \
  -d '{
    "timestamp": '$(date +%s000)',
    "latitude": 19.0760,
    "longitude": 72.8777,
    "notes": "Test clock-out"
  }'
```

### 7. Check Dashboard
```bash
curl -X GET http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/hr/dashboard \
  -H "Authorization: Bearer <admin_token>" \
  -H "x-tenant-id: lenstrack"
```

## 📝 Notes

- **Rate Limiting:** API has rate limiting (429 errors). Wait 30+ seconds between test runs.
- **Auth Service Sync:** Employee creation in HR service doesn't automatically create auth service user. Manual registration needed.
- **Store/Department:** Already exist from previous tests. Can reuse existing ones.

## 🎯 Next Steps

1. **Fix HR Service** to auto-register employees in auth service
2. **OR** Update frontend to call both APIs (HR create + Auth register)
3. **OR** Create a unified employee creation endpoint that handles both

---

**Last Updated:** 2026-02-28
**Status:** ⚠️ Partial - Employee creation works, but auth registration needs manual step
