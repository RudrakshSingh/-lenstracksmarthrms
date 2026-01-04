# Mock Data Cleanup Guide

**Date**: 2026-01-04  
**Purpose**: Clean up all mock data, keep only one admin user

---

## ✅ Changes Applied

### 1. Mock Login Endpoints Disabled in Production

**File**: `microservices/auth-service/src/routes/auth.routes.js`

- ✅ Mock login endpoints disabled in production
- ✅ Only enabled if `ENABLE_MOCK_LOGIN=true` or in development
- ✅ Returns 403 error in production

### 2. Admin User Creation Updated

**File**: `microservices/hr-service/src/services/superAdmin.service.js`

- ✅ Changed from "superadmin" to single "admin" user
- ✅ Default credentials: `admin@etelios.com` / `Admin@123456`
- ✅ Employee ID: `ADMIN-001`
- ✅ Creates only one admin user (not multiple mock users)

### 3. Cleanup Script Created

**File**: `scripts/cleanup-mock-data.js`

- ✅ Removes all mock users from database
- ✅ Keeps only one admin user
- ✅ Creates admin user if doesn't exist

---

## 🧹 How to Clean Up Mock Data

### Step 1: Run Cleanup Script

```bash
# Set database connection
export MONGO_URI="your-mongodb-connection-string"

# Run cleanup script
node scripts/cleanup-mock-data.js
```

### Step 2: Verify Cleanup

The script will:
- ✅ Delete all mock users (email contains "mock", employee_id starts with "MOCK")
- ✅ Keep only admin user: `admin@etelios.com`
- ✅ Create admin if doesn't exist
- ✅ Show summary of remaining users

### Step 3: Admin Credentials

After cleanup, use these credentials:

```
Email: admin@etelios.com
Password: Admin@123456
Employee ID: ADMIN-001
Role: admin
```

---

## 🔧 Configuration

### Environment Variables

You can customize the admin user:

```bash
# In .env or environment
ADMIN_EMAIL=admin@etelios.com
ADMIN_PASSWORD=Admin@123456
ADMIN_EMPLOYEE_ID=ADMIN-001
```

### Enable Mock Login (Development Only)

If you need mock login for testing:

```bash
ENABLE_MOCK_LOGIN=true
```

**Note**: Mock login is disabled by default in production.

---

## 📋 What Gets Cleaned Up

### Mock Users Removed

The cleanup script removes users matching:
- Email contains "mock" (case-insensitive)
- Employee ID starts with "MOCK"
- Name contains "Mock"
- Any user with mock pattern in email/name/employee_id

### Kept

- ✅ Admin user: `admin@etelios.com`
- ✅ All real users (non-mock)
- ✅ All roles

---

## 🧪 Testing After Cleanup

### 1. Login with Admin

```bash
curl -k -X POST "https://98.70.245.87/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@etelios.com",
    "password": "Admin@123456"
  }'
```

### 2. Create Employee

```bash
# Use token from login
TOKEN="your-token-here"

curl -k -X POST "https://98.70.245.87/api/auth/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "EMP-2026-001",
    "name": "Test Employee",
    "email": "employee@test.com",
    "phone": "9876543210",
    "password": "Test123456",
    "role": "employee",
    "address": {
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001"
    }
  }'
```

---

## 📝 Summary

- ✅ Mock login disabled in production
- ✅ Only one admin user created on startup
- ✅ Cleanup script available to remove existing mock users
- ✅ Admin credentials: `admin@etelios.com` / `Admin@123456`

**Next Steps**:
1. Run cleanup script to remove existing mock users
2. Use admin credentials to login
3. Create employees via registration endpoint

