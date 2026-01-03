# Real Admin User Created - Setup Complete

**Date**: 2026-01-02  
**Status**: ✅ **Admin User Created in Database**

---

## ✅ What Was Done

1. **Admin User Created** in database (`auth-db`)
2. **Admin Role Created** with all permissions
3. **Bearer Token Generated** for the admin user
4. **Token Saved** to `scripts/admin-token.json`

---

## 👤 Admin User Details

### Credentials
- **Email**: `admin@etelios.com`
- **Password**: `Admin@123456`
- **Employee ID**: `ADMIN-001`
- **Role**: `admin`
- **User ID**: `6957c0f2225ae3aa15970e8a`

### User Information
- **Name**: System Administrator
- **Department**: TECH
- **Designation**: System Administrator
- **Band Level**: A
- **Hierarchy Level**: NATIONAL
- **Status**: Active

---

## 🔑 Bearer Token

### Access Token (Generated)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTU3YzBmMjIyNWFlM2FhMTU5NzBlOGEiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjczNTg3MDYsImV4cCI6MTc2NzM1OTYwNiwiYXVkIjoiaHJtcy1mcm9udGVuZCIsImlzcyI6ImhybXMtYmFja2VuZCJ9.BU1o7Y0HoignBKKf_wt4FKI6RvK0A5sQtbHPiIdxCBA
```

**Note**: This token was generated using the local JWT_SECRET. For production, you need to:
1. **Login via API** to get a production token, OR
2. **Create the user in production database** and generate token there

---

## 🔄 Getting Production Token

### Option 1: Login via API (Recommended)
```bash
curl -k -X POST "https://98.70.245.87/api/auth/login" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@etelios.com",
    "password": "Admin@123456"
  }'
```

This will return a real production token that works with all APIs.

### Option 2: Create User in Production Database
If the user doesn't exist in production, you can:
1. Run the script with production database connection
2. Or create the user via the register API (requires another admin token)

---

## 📋 Usage

### API Request Headers
```bash
Authorization: Bearer <TOKEN_FROM_LOGIN>
Host: api.etelios.com
Content-Type: application/json
```

### Example API Calls

#### 1. Login to Get Token
```bash
curl -k -X POST "https://98.70.245.87/api/auth/login" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@etelios.com",
    "password": "Admin@123456"
  }'
```

#### 2. Get User Profile
```bash
curl -k -X GET "https://98.70.245.87/api/auth/profile" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <TOKEN>"
```

#### 3. Create Employee
```bash
curl -k -X POST "https://98.70.245.87/api/hr/employees" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@etelios.com",
    "phone": "+919999999999",
    "department": "SALES",
    "designation": "Sales Executive",
    "joiningDate": "2026-01-02T00:00:00.000Z",
    "role": "employee"
  }'
```

#### 4. Get Employees List
```bash
curl -k -X GET "https://98.70.245.87/api/hr/employees?page=1&limit=10" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <TOKEN>"
```

#### 5. Update Employee
```bash
curl -k -X PUT "https://98.70.245.87/api/hr/employees/<EMPLOYEE_ID>" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "designation": "Senior Sales Executive"
  }'
```

#### 6. Update Employee Status
```bash
curl -k -X PATCH "https://98.70.245.87/api/hr/employees/<EMPLOYEE_ID>/status" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "active"
  }'
```

---

## ✅ Permissions

The admin user has **ALL** permissions including:

- ✅ User Management (create, read, update, delete)
- ✅ Employee Management (create, read, update, delete)
- ✅ Attendance Management (all operations)
- ✅ Reports (all operations)
- ✅ Asset Management (all operations)
- ✅ Document Management (all operations)
- ✅ Transfer Management (all operations)
- ✅ Store Management (all operations)
- ✅ Role Management (all operations)
- ✅ System Administration
- ✅ Dashboard Access (all widgets)

---

## 📁 Files Created

1. **`scripts/admin-token.json`** - Contains access token, refresh token, and user info
2. **`scripts/create-real-admin.js`** - Script to create admin user
3. **`REAL_ADMIN_USER_CREATED.md`** - Detailed documentation
4. **`ADMIN_USER_SETUP_COMPLETE.md`** - This file

---

## ⚠️ Important Notes

1. **Database**: User is created in `auth-db` database (local)
2. **Production**: For production, login via API to get a production token
3. **Token Expiry**: Access token expires in 15 minutes (default)
4. **Security**: Keep credentials secure and do not commit to version control
5. **JWT Secret**: Production uses a different JWT_SECRET, so login is required

---

## 🎯 Next Steps

1. **Login via API** to get production token:
   ```bash
   curl -k -X POST "https://98.70.245.87/api/auth/login" \
     -H "Host: api.etelios.com" \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@etelios.com","password":"Admin@123456"}'
   ```

2. **Use the token** from login response for all API requests

3. **Test all APIs**:
   - GET /api/hr/employees
   - POST /api/hr/employees
   - PUT /api/hr/employees/:id
   - PATCH /api/hr/employees/:id/status
   - All other HR, Attendance, and Admin APIs

---

## ✅ Status

- ✅ Admin user created in database
- ✅ Admin role created with all permissions
- ✅ Bearer token generated (local)
- ✅ Token saved to file
- ⚠️ **Need to login via API for production token**

---

**Created By**: `scripts/create-real-admin.js`  
**Database**: `auth-db` (local)  
**Next Action**: Login via API to get production token

