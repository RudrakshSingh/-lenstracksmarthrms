# Lenstrack Production Setup Guide

## Overview
Complete guide for setting up Lenstrack tenant on production with real authentication (no mock login).

---

## 🎯 Goal
1. Create "lenstrack" tenant on production
2. Create real super admin and admin users
3. Test complete HRMS functionality
4. Verify all data is saved in correct databases

---

## 📋 Prerequisites

### 1. Production Access
- Production URL: `https://98.70.245.87`
- API Host: `api.etelios.com`
- All services running and accessible

### 2. Existing Super Admin (Optional)
- If you have an existing super admin, update credentials in script
- This is needed to register new users (if tenant creation doesn't auto-create admin)

---

## 🚀 Running the Setup

### Step 1: Run the Production Flow Script

```bash
node scripts/test-lenstrack-production-flow.js
```

### Step 2: Script Will Execute

The script will automatically:
1. ✅ Create "lenstrack" tenant
2. ✅ Register super admin user
3. ✅ Register admin user
4. ✅ Login with real credentials
5. ✅ Create test employee
6. ✅ Mark attendance
7. ✅ Test HRMS services
8. ✅ Verify data in databases

---

## 🔐 Lenstrack Credentials

After successful setup:

### Super Admin
- **Email**: `superadmin@lenstrack.etelios.com`
- **Password**: `Lenstrack@SuperAdmin123`
- **Employee ID**: `LENSTRACK-SUPERADMIN-001`
- **Role**: `superadmin`

### Admin
- **Email**: `admin@lenstrack.etelios.com`
- **Password**: `Lenstrack@Admin123`
- **Employee ID**: `LENSTRACK-ADMIN-001`
- **Role**: `admin`

---

## 📊 Tenant Details

- **Tenant ID**: `lenstrack`
- **Tenant Name**: `Lenstrack`
- **Domain**: `lenstrack.etelios.com`
- **Subdomain**: `lenstrack`
- **Plan**: `enterprise`

---

## 💾 Database Storage

All data will be stored in:

| Data Type | Database | Collection | Service |
|-----------|----------|------------|---------|
| Tenant | `tenant-db` | `tenants` | tenant-registry-service |
| Users | `auth-db` | `users` | auth-service |
| Employees | `etelios_hr_service` | `employees`, `users` | hr-service |
| Attendance | `attendance-db` | `attendances` | attendance-service |

---

## ✅ Verification Steps

### 1. Verify Tenant
```bash
# Check tenant exists
curl -X GET "https://98.70.245.87/api/tenants/lenstrack" \
  -H "Host: api.etelios.com"
```

### 2. Verify Super Admin Login
```bash
curl -X POST "https://98.70.245.87/api/auth/login" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrEmployeeId": "superadmin@lenstrack.etelios.com",
    "password": "Lenstrack@SuperAdmin123"
  }'
```

### 3. Verify Admin Login
```bash
curl -X POST "https://98.70.245.87/api/auth/login" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrEmployeeId": "admin@lenstrack.etelios.com",
    "password": "Lenstrack@Admin123"
  }'
```

### 4. Verify Employee Creation
```bash
# Login first to get token, then:
curl -X GET "https://98.70.245.87/api/hr/employees" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <token>"
```

---

## 🧪 Testing HRMS Services

After setup, test all HRMS services:

### 1. Employee Management
- ✅ Create employee
- ✅ Get employee list
- ✅ Get employee by ID
- ✅ Update employee
- ✅ Assign role
- ✅ Update status

### 2. Attendance
- ✅ Clock in
- ✅ Clock out
- ✅ Get attendance stats
- ✅ Get attendance reports

### 3. Dashboard
- ✅ Get dashboard stats
- ✅ Get recent activities
- ✅ Get department overview

### 4. Departments
- ✅ Get departments
- ✅ Create department
- ✅ Update department

### 5. Payroll
- ✅ Get payroll stats
- ✅ Get payroll employees
- ✅ Preview salary

---

## 🐛 Troubleshooting

### Issue: Tenant Creation Fails
**Solution**: 
- Check if tenant already exists (409 error is OK)
- Verify tenant-registry-service is running
- Check database connection to `tenant-db`

### Issue: User Registration Fails
**Solution**:
- Ensure you have existing super admin credentials
- Update credentials in `loginAsSuperAdmin()` function
- Check auth-service is running
- Verify database connection to `auth-db`

### Issue: Login Fails
**Solution**:
- Verify user was created successfully
- Check password is correct
- Ensure auth-service is running
- Check token generation is working

### Issue: Employee Creation Fails
**Solution**:
- Verify super admin login is successful
- Check HR service is running
- Verify database connection to `etelios_hr_service`
- Check all required fields are provided

### Issue: Attendance Marking Fails
**Solution**:
- Verify employee was created
- Check attendance-service is running
- Verify database connection to `attendance-db`
- Check employee ID is correct

---

## 📝 Notes

1. **No Mock Login**: All authentication uses real credentials
2. **Production Only**: Script is configured for production URL
3. **Real Data**: All data is saved in production databases
4. **Tenant Isolation**: Lenstrack tenant data is isolated
5. **Service Integration**: All HRMS services work together

---

## 🔄 Re-running Setup

If you need to re-run setup:

1. **Tenant Already Exists**: Script will continue (409 error is handled)
2. **Users Already Exist**: Script will continue (400 error is handled)
3. **Clean Setup**: Delete tenant and users first if needed

---

## 📞 Support

If you encounter issues:
1. Check service logs
2. Verify database connections
3. Check API responses in script output
4. Verify all services are running

---

**Last Updated**: 2026-01-01  
**Script**: `scripts/test-lenstrack-production-flow.js`  
**Status**: ✅ Ready for Production

