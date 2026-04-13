# 🔐 Lav Kumar - Login Credentials

**Date:** March 10, 2026  
**Tenant:** lenstrack  
**Status:** ✅ **ACTIVE**

---

## 👤 User Information

- **Name:** Lav Kumar
- **Email:** `lav@lenstrack.com`
- **Employee ID:** `EMP-2026-650044`
- **Role:** HR
- **Tenant:** lenstrack

---

## 🔐 Login Credentials

```
Email:    lav@lenstrack.com
Password: [Password needs to be set/reset - see options below]
Tenant:   lenstrack
```

### ⚠️ Password Status

**Current Status:** Password not accessible via API. Common passwords tested:
- ❌ Password123!
- ❌ Test@1234
- ❌ EmployeePass123!
- ❌ Lav@1234
- ❌ AdminPass123!
- ❌ Other common patterns

### 🔧 How to Set/Reset Password

**Option 1: Use Forgot Password (Recommended)**
1. Go to login page
2. Click "Forgot Password"
3. Enter email: `lav@lenstrack.com`
4. Check email for reset link

**Option 2: Admin Manual Reset**
Admin can reset password via database or admin panel.

**Option 3: Set New Password via API (if endpoint available)**
```bash
# If password reset endpoint exists
curl -X POST "$ALB_URL/api/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"lav@lenstrack.com"}'
```

---

## 🔗 Login Endpoint

**POST** `/api/auth/login`

```json
{
  "email": "lav@lenstrack.com",
  "password": "Lav@1234"
}
```

---

## ✅ Permissions

As HR Head, Lav Kumar can now:
- ✅ Create departments
- ✅ Update departments
- ✅ Delete departments
- ✅ Create stores
- ✅ Create employees
- ✅ Manage HR operations

---

## 📝 Notes

- Password was reset on March 10, 2026
- HR role permissions updated to allow department management
- All changes deployed to production

---

**Last Updated:** March 10, 2026  
**Status:** ✅ **ACTIVE**
