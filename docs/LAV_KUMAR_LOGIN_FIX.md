# 🔧 Lav Kumar Login Fix - Invalid Password/Email Issue

**Date:** March 10, 2026  
**Issue:** Frontend showing "Invalid email or password" even with correct credentials  
**Status:** 🔍 **DIAGNOSIS COMPLETE**

---

## 🐛 Problem

Frontend is showing "Invalid email or password" error when trying to login with:
- **Email:** `lav@lenstrack.com`
- **Password:** `lav@1234` (or any password)

---

## 🔍 Root Cause Analysis

### Issue Identified

**Login uses auth-service database, not HR service database.**

1. **User exists in HR service:**
   - ✅ Employee ID: EMP-2026-650044
   - ✅ Email: lav@lenstrack.com
   - ✅ Password updated in HR service: ✅ 200 OK

2. **User may NOT exist in auth-service:**
   - ❌ Login fails: "Invalid email or password"
   - ❌ Registration fails: 400 Bad Request (user might already exist with different password)

3. **Password Sync Issue:**
   - HR service password update doesn't sync to auth-service
   - Auth-service has separate database
   - Login authentication happens in auth-service

---

## ✅ Solution

### Option 1: Create/Register User in Auth Service (Recommended)

**If user doesn't exist in auth-service:**

```bash
curl -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "lenstrack",
    "employee_id": "EMP-2026-650044",
    "name": "Lav Kumar",
    "email": "lav@lenstrack.com",
    "phone": "+91-9876543210",
    "password": "lav@1234",
    "role": "hr",
    "department": "HR",
    "designation": "HR Head",
    "joining_date": "2026-01-01"
  }'
```

### Option 2: Update Password in Auth Service Database

**If user exists but password is wrong:**

Admin needs to update password directly in auth-service database:
- Database: auth-service database
- Collection: users
- Filter: `{ email: "lav@lenstrack.com", tenantId: "lenstrack" }`
- Update: `{ password: <hashed_password> }`

**Note:** Password must be hashed using bcrypt (12 rounds).

### Option 3: Use Forgot Password (When Available)

When forgot password feature is implemented:
1. User clicks "Forgot Password" on frontend
2. Receives reset link via email
3. Sets new password: `lav@1234`

---

## 🔧 Quick Fix Script

Run the fix script:

```bash
./scripts/fix-lav-kumar-password.sh
```

This script will:
1. Try to register user in auth-service
2. If user exists, provide instructions
3. Test login after registration

---

## 📝 Current Status

| Component | Status |
|-----------|--------|
| User in HR Service | ✅ Exists |
| Password in HR Service | ✅ Updated (lav@1234) |
| User in Auth Service | ⚠️ Unknown (needs verification) |
| Password in Auth Service | ❌ Unknown/Incorrect |
| Login Working | ❌ Failing |

---

## 🎯 Next Steps

1. **Run fix script:** `./scripts/fix-lav-kumar-password.sh`
2. **If registration fails (user exists):**
   - Admin needs to update password in auth-service database
   - Or implement forgot password feature
3. **If registration succeeds:**
   - Login should work immediately
   - Password: `lav@1234`

---

## 🔐 Final Credentials (After Fix)

```
Email:    lav@lenstrack.com
Password: lav@1234
Tenant:   lenstrack
```

---

**Last Updated:** March 10, 2026  
**Status:** 🔍 **DIAGNOSIS COMPLETE - AWAITING FIX**
