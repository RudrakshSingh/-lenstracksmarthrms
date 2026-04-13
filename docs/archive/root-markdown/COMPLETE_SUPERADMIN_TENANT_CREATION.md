# Complete Superadmin Tenant Creation Flow (Azure/AWS Style)

## 🎯 Overview

**Just like Microsoft Azure or AWS:**
- **Platform Owner (Superadmin)** creates tenants
- Each tenant gets **automatically created admin users**
- Admin users get **temporary passwords** (must change on first login)

---

## 🔐 Platform Owner Credentials (YOU)

```
Email:    admin@upcapto.com
Password: Upcapto@2026
Tenant:   upcapto
Role:     superadmin
```

**This is the platform owner account that creates tenants.**

---

## 🚀 Complete Flow

### Step 1: Platform Owner Login

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "admin@upcapto.com",
  "password": "Upcapto@2026"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "email": "admin@upcapto.com",
      "role": "superadmin",
      "tenantId": "upcapto"
    }
  }
}
```

---

### Step 2: Create Tenant (Like Azure/AWS)

**Endpoint:** `POST /api/tenants`

**Headers:**
```
Authorization: Bearer <access_token>
x-tenant-id: upcapto
Content-Type: application/json
```

**Request:**
```json
{
  "name": "New Company",
  "email": "contact@newcompany.com",
  "domain": "newcompany.com",
  "phone": "+91-9876543210",
  "city": "Mumbai",
  "state": "Maharashtra",
  "country": "India",
  "plan": "Basic"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tenant created successfully",
  "data": {
    "tenantId": "newcompany",
    "name": "New Company",
    "domain": "newcompany.com",
    "email": "contact@newcompany.com",
    "status": "active",
    "plan": "basic"
  }
}
```

---

## ✅ What Gets Created Automatically

When you create a tenant, the system **automatically creates**:

### 1. Admin User
- **Email:** `admin@[tenant-domain].com` or `contact@[tenant-domain].com`
- **Role:** `admin`
- **Password:** Temporary (auto-generated)
- **Must Change Password:** `true`

### 2. Super Admin User (for the tenant)
- **Email:** `superadmin@[tenant-domain].com`
- **Role:** `superadmin`
- **Password:** Temporary (auto-generated)
- **Must Change Password:** `true`

---

## 📋 Required Fields

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `name` | ✅ Yes | Company/Tenant name | `"New Company"` |
| `email` | ✅ Yes | Contact email | `"contact@newcompany.com"` |
| `domain` | ❌ No | Domain name | `"newcompany.com"` |
| `phone` | ❌ No | Phone number | `"+91-9876543210"` |
| `city`, `state`, `country` | ❌ No | Address | `"Mumbai"`, `"Maharashtra"`, `"India"` |
| `plan` | ❌ No | Subscription plan (default: "Basic") | `"Basic"` |

---

## 💻 Complete JavaScript Example

```javascript
// Step 1: Platform Owner Login
const loginResponse = await fetch('http://API_URL/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'admin@upcapto.com',
    password: 'Upcapto@2026'
  })
});

const loginData = await loginResponse.json();
const accessToken = loginData.data.accessToken;
const platformTenantId = loginData.data.user.tenantId;

// Step 2: Create Tenant
const tenantResponse = await fetch('http://API_URL/api/tenants', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    'x-tenant-id': platformTenantId
  },
  body: JSON.stringify({
    name: 'New Company',
    email: 'contact@newcompany.com',
    domain: 'newcompany.com',
    phone: '+91-9876543210',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    plan: 'Basic'
  })
});

const tenantData = await tenantResponse.json();

if (tenantData.success) {
  console.log('✅ Tenant created:', tenantData.data.tenantId);
  console.log('Tenant name:', tenantData.data.name);
  
  // Admin users are created automatically
  // They will have temporary passwords
  // Check database or logs for admin user credentials
}
```

---

## 🔄 Complete Flow Diagram

```
Platform Owner (Superadmin)
    ↓
Login with admin@upcapto.com
    ↓
Get Access Token
    ↓
Create Tenant
    ↓
System Automatically Creates:
    ├── Tenant Record
    ├── Admin User (admin@tenant.com)
    └── Super Admin User (superadmin@tenant.com)
    ↓
New Tenant Admin Users Get:
    ├── Temporary Passwords
    └── Must Change Password Flag = true
    ↓
Tenant Admin Logs In
    ↓
Forced to Change Password
    ↓
Can Now Manage Tenant
```

---

## 🧪 Quick Test Command

```bash
# 1. Login as Platform Owner
TOKEN=$(curl -s -X POST http://API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@upcapto.com","password":"Upcapto@2026"}' \
  | jq -r '.data.accessToken')

# 2. Create Tenant
curl -X POST http://API_URL/api/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto" \
  -d '{
    "name": "Test Company",
    "email": "contact@testcompany.com",
    "domain": "testcompany.com",
    "plan": "Basic"
  }'
```

---

## 📝 Notes

1. **Admin Users Are Created Automatically**
   - No need to manually create admin users
   - System creates both admin and superadmin users
   - Temporary passwords are auto-generated

2. **Temporary Passwords**
   - Admin users get temporary passwords
   - They must change password on first login
   - This is enforced by `mustChangePassword: true`

3. **Just Like Azure/AWS**
   - Platform owner creates tenants
   - Each tenant gets its own admin users
   - Admin users manage their tenant

---

## ✅ Status

**Platform Owner Login:** ✅ Working  
**Tenant Creation:** ✅ Working  
**Admin User Creation:** ✅ Working (automatic)  
**Temporary Passwords:** ✅ Generated  

**Complete Azure/AWS style flow is working!** 🎉

---

## 🔑 Summary

**Platform Owner (You):**
- Email: `admin@upcapto.com`
- Password: `Upcapto@2026`
- Creates tenants

**New Tenant (Created by you):**
- Gets tenant record
- Gets admin user (auto-created)
- Gets superadmin user (auto-created)
- Both get temporary passwords

**Just like Azure/AWS tenant creation!** 🚀
