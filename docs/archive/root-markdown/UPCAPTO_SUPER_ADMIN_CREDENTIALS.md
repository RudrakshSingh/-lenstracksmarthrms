# Upcapto Super Admin Credentials

## ✅ Super Admin Account Created Successfully!

**Created on:** February 15, 2026  
**Status:** Active  
**Account Type:** Enterprise Super Administrator

---

## 🔐 Login Credentials

```
Email:    admin@upcapto.com
Password: Upcapto@2026
Tenant:   upcapto
```

---

## 🌐 How to Login

### Option 1: API Login (Direct)

```bash
curl -X POST http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@upcapto.com",
    "password": "Upcapto@2026",
    "tenantId": "upcapto"
  }'
```

### Option 2: From Frontend

```javascript
// Login Request
const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
  email: 'admin@upcapto.com',
  password: 'Upcapto@2026',
  tenantId: 'upcapto'
});

// Save token and tenant ID
localStorage.setItem('authToken', response.data.token);
localStorage.setItem('tenantId', 'upcapto');
```

---

## 👤 User Details

| Field | Value |
|-------|-------|
| **Tenant ID** | upcapto |
| **Employee ID** | UPCAPTO-ADMIN-001 |
| **Name** | Upcapto Super Admin |
| **Email** | admin@upcapto.com |
| **Phone** | +91-9876543210 |
| **Role** | superadmin |
| **Department** | HR |
| **Band Level** | A (Highest) |
| **Hierarchy** | NATIONAL |
| **Designation** | Super Administrator |
| **Status** | Active |

---

## 🔑 Permissions

This super admin has **ALL permissions** including:

### User Management
- ✅ Create, Read, Update, Delete Users
- ✅ Create, Read, Update, Delete Employees
- ✅ Manage Departments
- ✅ Manage Roles

### Tenant Management
- ✅ Create Tenants
- ✅ Manage Tenants
- ✅ Delete Tenants
- ✅ Configure Tenant Settings

### System Management
- ✅ System Settings
- ✅ View Analytics
- ✅ View Audit Logs
- ✅ Manage Integrations
- ✅ Backup/Restore Data

### HR Operations
- ✅ View/Approve Attendance
- ✅ Process Payroll
- ✅ Approve Payroll
- ✅ Create Reports
- ✅ Export Data

---

## 🏢 Tenant Details

| Field | Value |
|-------|-------|
| **Tenant ID** | upcapto |
| **Company Name** | Upcapto Technologies |
| **Domain** | upcapto.com |
| **Subdomain** | upcapto |
| **Status** | Active |
| **Plan** | Enterprise |
| **Max Users** | 10,000 |
| **Subscription** | Active (1 year) |
| **Timezone** | Asia/Kolkata |
| **Currency** | INR |
| **Date Format** | DD/MM/YYYY |

### Enabled Features
- ✅ HR Management
- ✅ Attendance
- ✅ Payroll
- ✅ Analytics
- ✅ CRM
- ✅ All other modules

---

## 🎯 What You Can Do Now

### 1. Create Other Tenants
```bash
POST /api/admin/tenants
{
  "tenantId": "company-name",
  "name": "Company Name",
  "domain": "company.com",
  "subscription": {
    "plan": "professional",
    "max_users": 100
  }
}
```

### 2. Create Admin Users for Other Tenants
```bash
POST /api/auth/register
{
  "tenantId": "company-name",
  "email": "admin@company.com",
  "password": "secure-password",
  "role": "admin",
  "name": "Admin Name"
}
```

### 3. Manage Employees
```bash
GET /api/hr/employees
POST /api/hr/employees
PUT /api/hr/employees/:id
DELETE /api/hr/employees/:id
```

### 4. Configure Departments
```bash
GET /api/hr/departments
POST /api/hr/departments
```

---

## ⚠️ IMPORTANT SECURITY NOTES

### 1. ⚠️ Change Password Immediately!

After first login, change the password:

```bash
PUT /api/auth/change-password
{
  "currentPassword": "Upcapto@2026",
  "newPassword": "YourNewSecurePassword123!"
}
```

### 2. ⚠️ Secure Credentials

- Don't share password via insecure channels
- Don't commit to Git
- Store in secure password manager
- Enable 2FA if available

### 3. ⚠️ Create Limited Admin Users

Don't use super admin for day-to-day tasks. Create:
- Admin users for tenant management
- HR users for employee management
- Manager users for team management

### 4. ⚠️ Regular Security Audits

- Review user access regularly
- Check audit logs
- Remove unused accounts
- Update passwords periodically

---

## 🔄 Re-run Seed Script

If you need to reset or recreate:

```bash
# Run again (will skip if user exists)
./create-upcapto-admin.sh

# Or use the full Node.js version
node seed-upcapto-superadmin.js
```

**Note:** Script is idempotent - safe to run multiple times.

---

## 📋 Verification

Test if the account works:

```bash
# Test login
curl -X POST http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@upcapto.com",
    "password": "Upcapto@2026",
    "tenantId": "upcapto"
  }'

# Should return:
# {
#   "token": "eyJhbGc...",
#   "user": {
#     "id": "...",
#     "email": "admin@upcapto.com",
#     "role": "superadmin",
#     "tenantId": "upcapto"
#   }
# }
```

---

## 📞 Support

If you encounter issues:

1. **Check MongoDB:** `kubectl get pods -n etelios-prod | grep mongodb`
2. **Check Auth Service:** `kubectl get pods -n etelios-prod | grep auth-service`
3. **View Logs:** `kubectl logs -n etelios-prod <auth-pod-name>`
4. **Re-run Seed:** `./create-upcapto-admin.sh`

---

## 📝 Change Log

| Date | Action | Details |
|------|--------|---------|
| 2026-02-15 | Created | Initial super admin account created |
| | | Tenant: Upcapto Technologies |
| | | Email: admin@upcapto.com |

---

## ✅ Summary

- ✅ Tenant Created: **upcapto**
- ✅ Super Admin Created: **admin@upcapto.com**
- ✅ Password Set: **Upcapto@2026** (CHANGE THIS!)
- ✅ All Permissions Granted
- ✅ Enterprise Plan Activated
- ✅ Ready to Create Other Tenants

**You're all set! Login and start managing your HRMS system.** 🚀
