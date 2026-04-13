# ✅ Lenstrack Tenant Created Successfully!

**Date:** 2026-02-28  
**Created by:** Upcapto Superadmin

---

## 📋 Tenant Details

| Field | Value |
|-------|-------|
| **Tenant ID** | `lenstrack` |
| **Name** | Lenstrack |
| **Domain** | lenstrack.com |
| **Email** | admin@lenstrack.com |
| **Phone** | +91-9876543210 |
| **Status** | Active |
| **Plan** | Professional |
| **Created At** | 2026-02-28T13:02:14.318Z |

---

## 🔐 Admin User Credentials

**Note:** Admin users are automatically created when tenant is created.

### Primary Admin
- **Email:** `admin@lenstrack.com`
- **Password:** Temporary (auto-generated, check tenant creation response)
- **Role:** `admin`
- **Must Change Password:** Yes (on first login)

### Super Admin (if created)
- **Email:** `superadmin@lenstrack.com`
- **Password:** Temporary (auto-generated)
- **Role:** `superadmin`

---

## 🎯 Next Steps

### 1. Login as Tenant Admin

```bash
curl -X POST http://your-backend-url/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@lenstrack.com",
    "password": "<temporary-password>"
  }'
```

**Response will include:**
- `mustChangePassword: true` - You'll need to change password on first login

### 2. Change Password (Required on First Login)

```bash
curl -X PUT http://your-backend-url/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: lenstrack" \
  -d '{
    "currentPassword": "<temporary-password>",
    "newPassword": "YourNewPassword123!",
    "confirmPassword": "YourNewPassword123!"
  }'
```

### 3. Create Stores

```bash
curl -X POST http://your-backend-url/api/hr/stores \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -H "x-tenant-id: lenstrack" \
  -d '{
    "name": "Mumbai Store",
    "code": "LK001",
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
    "status": "active"
  }'
```

### 4. Create Departments

```bash
curl -X POST http://your-backend-url/api/hr/departments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -H "x-tenant-id: lenstrack" \
  -d '{
    "name": "Sales",
    "code": "SALES",
    "description": "Sales Department",
    "status": "active"
  }'
```

### 5. Create Employees

```bash
curl -X POST http://your-backend-url/api/hr/employees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -H "x-tenant-id: lenstrack" \
  -d '{
    "employeeId": "EMP-2026-969954",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@lenstrack.com",
    "password": "EmployeePass123!",
    "roleName": "employee",
    "department": "SALES",
    "storeId": "<store-id>",
    "designation": "Sales Executive",
    "status": "active"
  }'
```

---

## 📊 Tenant Configuration

### Plan Details
- **Name:** Professional
- **Price:** ₹25,000/month
- **Max Users:** 100
- **Max Storage:** 100 GB
- **Max API Calls:** 100,000/month

### Settings
- **Timezone:** Asia/Kolkata
- **Currency:** INR
- **Language:** English
- **Date Format:** DD/MM/YYYY
- **Backup Enabled:** Yes

---

## 🔗 Related Documentation

- [Complete System Flow](./docs/COMPLETE_SYSTEM_FLOW.md)
- [Seed and Test Guide](./docs/SEED_AND_TEST_GUIDE.md)

---

**Last Updated:** 2026-02-28
