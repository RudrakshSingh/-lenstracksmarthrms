# Upcapto Tenant Creation Flow - Complete Guide

## 🎯 Overview

**Flow:**
1. **Upcapto Super Admin** logs into main dashboard
2. **Creates new tenant** from dashboard
3. **System generates temporary password** for tenant admin
4. **Tenant admin** receives credentials and logs in
5. **Tenant admin changes password** on first login

---

## 🔐 Step 1: Upcapto Super Admin Login

### Credentials
```
Email:    admin@upcapto.com
Password: Upcapto@2026
Tenant:   upcapto
```

### API Call
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@upcapto.com",
  "password": "Upcapto@2026",
  "tenantId": "upcapto"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "email": "admin@upcapto.com",
      "role": "superadmin",
      "tenantId": "upcapto"
    }
  }
}
```

**Save the token** for subsequent API calls!

---

## 🏢 Step 2: Create New Tenant

### API Call (from Upcapto Dashboard)
```bash
POST /api/admin/tenants
Authorization: Bearer <upcapto_token>
x-tenant-id: upcapto
Content-Type: application/json

{
  "name": "Company Name",
  "email": "admin@company.com",
  "phone": "+91-9876543210",
  "plan": "Professional",
  "address": {
    "city": "Bangalore",
    "state": "Karnataka",
    "country": "India"
  }
}
```

### Response
```json
{
  "success": true,
  "message": "Tenant created successfully",
  "data": {
    "tenantId": "companyname",
    "name": "Company Name",
    "domain": "companyname.etelios.com",
    "status": "active",
    "subscription": {
      "plan": "Professional",
      "status": "active",
      "max_users": 100
    },
    "adminUser": {
      "id": "...",
      "email": "admin@company.com",
      "name": "Company Name Admin",
      "employeeId": "ADMIN-COMPANYNAME-001",
      "role": "admin",
      "temporaryPassword": "TempPass123!@#",
      "mustChangePassword": true
    },
    "superAdminUser": {
      "id": "...",
      "email": "superadmin@company.com",
      "name": "Company Name (Super Admin)",
      "employeeId": "SUPERADMIN-COMPANYNAME-001",
      "role": "superadmin",
      "temporaryPassword": "SuperTemp456!@#",
      "mustChangePassword": true
    },
    "passwordChangeRequired": true,
    "passwordChangeMessage": "Please change your temporary password on first login."
  }
}
```

### Important Points:
- ✅ **Tenant ID** is auto-generated from company name
- ✅ **Admin user** is automatically created
- ✅ **Super admin user** is automatically created
- ✅ **Temporary passwords** are generated automatically
- ✅ Both users have `mustChangePassword: true`

---

## 📧 Step 3: Send Credentials to Tenant

### What to Send:
```
Subject: Welcome to Etelios HRMS - Your Login Credentials

Dear [Company Name],

Your tenant has been created successfully!

Tenant Details:
- Tenant ID: companyname
- Company: Company Name
- Plan: Professional

Admin Login:
- Email: admin@company.com
- Temporary Password: TempPass123!@#
- ⚠️ You MUST change this password on first login!

Super Admin Login:
- Email: superadmin@company.com
- Temporary Password: SuperTemp456!@#
- ⚠️ You MUST change this password on first login!

Login URL: http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com

Best regards,
Upcapto Team
```

---

## 🔑 Step 4: Tenant Admin First Login

### Login with Temporary Password
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "TempPass123!@#",
  "tenantId": "companyname"
}
```

### Response (with Password Change Flag)
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "email": "admin@company.com",
      "role": "admin",
      "tenantId": "companyname",
      "mustChangePassword": true
    },
    "mustChangePassword": true,
    "message": "Please change your password on first login"
  }
}
```

**Frontend should detect `mustChangePassword: true` and show password change form!**

---

## 🔄 Step 5: Change Password (Required)

### API Call
```bash
PUT /api/auth/change-password
Authorization: Bearer <tenant_token>
x-tenant-id: companyname
Content-Type: application/json

{
  "currentPassword": "TempPass123!@#",
  "newPassword": "MySecurePassword123!",
  "confirmPassword": "MySecurePassword123!"
}
```

### Response
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": {
    "mustChangePassword": false,
    "passwordChangedAt": "2026-02-15T10:30:00.000Z"
  }
}
```

**After password change, user can use the system normally!**

---

## 💻 Frontend Implementation

### Dashboard Login (Upcapto)
```javascript
// Login as Upcapto super admin
const upcaptoLogin = async () => {
  const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
    email: 'admin@upcapto.com',
    password: 'Upcapto@2026',
    tenantId: 'upcapto'
  });
  
  localStorage.setItem('upcaptoToken', response.data.data.token);
  localStorage.setItem('upcaptoTenantId', 'upcapto');
  
  return response.data;
};
```

### Create Tenant (From Dashboard)
```javascript
// Create new tenant
const createTenant = async (tenantData) => {
  const token = localStorage.getItem('upcaptoToken');
  
  const response = await axios.post(
    `${API_BASE_URL}/api/admin/tenants`,
    {
      name: tenantData.companyName,
      email: tenantData.adminEmail,
      phone: tenantData.phone,
      plan: tenantData.plan || 'Professional',
      address: {
        city: tenantData.city,
        state: tenantData.state,
        country: tenantData.country || 'India'
      }
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': 'upcapto'
      }
    }
  );
  
  // Show temporary passwords to user
  if (response.data.data.adminUser) {
    showCredentialsModal({
      adminEmail: response.data.data.adminUser.email,
      adminPassword: response.data.data.adminUser.temporaryPassword,
      superAdminEmail: response.data.data.superAdminUser?.email,
      superAdminPassword: response.data.data.superAdminUser?.temporaryPassword,
      tenantId: response.data.data.tenantId
    });
  }
  
  return response.data;
};
```

### Tenant Admin Login (with Password Change Check)
```javascript
// Login as tenant admin
const tenantLogin = async (email, password, tenantId) => {
  const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
    email,
    password,
    tenantId
  });
  
  // Check if password change is required
  if (response.data.data.mustChangePassword || response.data.data.user.mustChangePassword) {
    // Redirect to password change page
    router.push('/change-password');
    return response.data;
  }
  
  // Normal login - save token
  localStorage.setItem('authToken', response.data.data.token);
  localStorage.setItem('tenantId', tenantId);
  
  return response.data;
};
```

### Password Change Component
```javascript
// Change password component
const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    
    const token = localStorage.getItem('authToken');
    const tenantId = localStorage.getItem('tenantId');
    
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/auth/change-password`,
        {
          currentPassword,
          newPassword,
          confirmPassword
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenantId
          }
        }
      );
      
      if (response.data.success) {
        alert('Password changed successfully!');
        // Redirect to dashboard
        router.push('/dashboard');
      }
    } catch (error) {
      alert('Password change failed: ' + error.response.data.message);
    }
  };
  
  return (
    <form onSubmit={handleChangePassword}>
      <h2>Change Password</h2>
      <p>⚠️ You must change your temporary password to continue.</p>
      
      <input
        type="password"
        placeholder="Current Password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        required
      />
      
      <input
        type="password"
        placeholder="New Password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
        minLength={8}
      />
      
      <input
        type="password"
        placeholder="Confirm New Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        minLength={8}
      />
      
      <button type="submit">Change Password</button>
    </form>
  );
};
```

---

## 📋 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ 1. Upcapto Super Admin Login                            │
│    POST /api/auth/login                                  │
│    { email: "admin@upcapto.com", tenantId: "upcapto" }  │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Create Tenant (from Dashboard)                       │
│    POST /api/admin/tenants                              │
│    Authorization: Bearer <upcapto_token>               │
│    { name, email, phone, plan }                        │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 3. System Auto-Creates:                                 │
│    ✅ Tenant record                                     │
│    ✅ Admin user (with temp password)                  │
│    ✅ Super admin user (with temp password)            │
│    ✅ Sets mustChangePassword: true                    │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Response Contains:                                  │
│    - Tenant ID                                          │
│    - Admin email + temporary password                  │
│    - Super admin email + temporary password            │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Send Credentials to Tenant                           │
│    (Email/SMS/WhatsApp)                                 │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 6. Tenant Admin First Login                             │
│    POST /api/auth/login                                 │
│    { email, password: <temp>, tenantId }               │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 7. System Returns:                                     │
│    - Token                                              │
│    - mustChangePassword: true                          │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 8. Frontend Shows Password Change Form                  │
│    (Required before accessing dashboard)                │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 9. Tenant Admin Changes Password                        │
│    PUT /api/auth/change-password                        │
│    { currentPassword, newPassword }                     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 10. Password Changed Successfully                       │
│     ✅ mustChangePassword: false                        │
│     ✅ Can now access dashboard                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing

### Run Test Script
```bash
chmod +x test-upcapto-tenant-creation-flow.sh
./test-upcapto-tenant-creation-flow.sh
```

This will test:
1. ✅ Upcapto login
2. ✅ Tenant creation
3. ✅ Temporary password generation
4. ✅ Tenant admin login with temp password

---

## ⚠️ Important Notes

### Security
1. **Temporary passwords** are auto-generated (secure random)
2. **Must change password** flag is enforced
3. **Password complexity** should be enforced (min 8 chars, uppercase, lowercase, number, special char)
4. **Password expiry** can be set (e.g., 7 days)

### Best Practices
1. **Send credentials securely** (encrypted email, SMS, or secure portal)
2. **Don't store temporary passwords** in plain text
3. **Log all tenant creation** activities
4. **Audit password changes**
5. **Set password policies** per tenant

### Error Handling
- If tenant creation fails, rollback all created resources
- If admin user creation fails, tenant should be marked as "incomplete"
- Provide clear error messages to Upcapto admin

---

## 📞 Support

If tenant creation fails:
1. Check MongoDB connection
2. Check auth-service is running
3. Check tenant-registry-service is running
4. Verify Upcapto super admin has correct permissions
5. Check logs: `kubectl logs -n etelios-prod <service-pod>`

---

## ✅ Summary

**Complete Flow:**
1. ✅ Upcapto super admin logs in
2. ✅ Creates tenant from dashboard
3. ✅ System generates temporary passwords
4. ✅ Credentials sent to tenant
5. ✅ Tenant admin logs in with temp password
6. ✅ System forces password change
7. ✅ Tenant admin changes password
8. ✅ Can now use the system

**Everything is automated! Just create tenant and send credentials!** 🚀
