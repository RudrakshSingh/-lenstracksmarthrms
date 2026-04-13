# Quick Start: Tenant Creation Flow

## ✅ Setup Complete!

**Upcapto Super Admin Created:**
- Email: `admin@upcapto.com`
- Password: `Upcapto@2026`
- Tenant: `upcapto`

---

## 🎯 How It Works

### 1. Upcapto Dashboard Login
```
Login URL: http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com

Email:    admin@upcapto.com
Password: Upcapto@2026
Tenant:   upcapto
```

### 2. Create Tenant (From Dashboard)
```
POST /api/admin/tenants
Authorization: Bearer <upcapto_token>

{
  "name": "Company Name",
  "email": "admin@company.com",
  "phone": "+91-9876543210",
  "plan": "Professional"
}
```

### 3. System Auto-Creates:
- ✅ Tenant record
- ✅ Admin user with **temporary password**
- ✅ Super admin user with **temporary password**
- ✅ Sets `mustChangePassword: true`

### 4. Response Contains:
```json
{
  "adminUser": {
    "email": "admin@company.com",
    "temporaryPassword": "TempPass123!@#"
  },
  "superAdminUser": {
    "email": "superadmin@company.com",
    "temporaryPassword": "SuperTemp456!@#"
  }
}
```

### 5. Send Credentials to Tenant
**You send them:**
- Email: `admin@company.com`
- Temporary Password: `TempPass123!@#`
- Tenant ID: `companyname`

### 6. Tenant Admin Logs In
- Uses temporary password
- System detects `mustChangePassword: true`
- **Frontend shows password change form**
- Tenant changes password
- Can now use the system!

---

## 📋 API Endpoints

### Upcapto Login
```bash
POST /api/auth/login
{
  "email": "admin@upcapto.com",
  "password": "Upcapto@2026",
  "tenantId": "upcapto"
}
```

### Create Tenant
```bash
POST /api/admin/tenants
Authorization: Bearer <upcapto_token>
x-tenant-id: upcapto

{
  "name": "Company Name",
  "email": "admin@company.com",
  "phone": "+91-9876543210",
  "plan": "Professional"
}
```

### Tenant Admin Login
```bash
POST /api/auth/login
{
  "email": "admin@company.com",
  "password": "<temporary_password>",
  "tenantId": "companyname"
}
```

### Change Password (Required on First Login)
```bash
PUT /api/auth/change-password
Authorization: Bearer <tenant_token>
x-tenant-id: companyname

{
  "currentPassword": "<temporary_password>",
  "newPassword": "<new_secure_password>",
  "confirmPassword": "<new_secure_password>"
}
```

---

## 🧪 Test the Flow

```bash
# Run test script
./test-upcapto-tenant-creation-flow.sh
```

This will:
1. ✅ Login as Upcapto super admin
2. ✅ Create a test tenant
3. ✅ Show temporary passwords
4. ✅ Test tenant admin login

---

## 💻 Frontend Implementation

### Dashboard (Upcapto)
- Login page for Upcapto super admin
- Tenant creation form
- Display temporary passwords after creation
- Send credentials button (email/SMS)

### Tenant Admin
- Login page
- **Password change form** (shown if `mustChangePassword: true`)
- Dashboard (after password change)

---

## 📝 Complete Documentation

See `UPCAPTO_TENANT_CREATION_FLOW.md` for:
- Complete API documentation
- Frontend code examples
- Error handling
- Security best practices

---

## ✅ Summary

**Flow:**
1. Upcapto login → Dashboard
2. Create tenant → Get temporary passwords
3. Send credentials to tenant
4. Tenant logs in → Must change password
5. Password changed → Can use system

**Everything is automated!** 🚀
