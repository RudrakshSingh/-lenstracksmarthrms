# Superadmin Login for Tenant Creation

## 🔐 Superadmin Credentials

```
Email:    admin@upcapto.com
Password: Upcapto@2026
Tenant:   upcapto
Role:     superadmin
```

---

## 🚀 Complete Flow

### Step 1: Superadmin Login

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

### Step 2: Create Tenant

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
    "plan": "basic",
    "adminUsers": {
      "admin": {
        "email": "admin@newcompany.com",
        "temporaryPassword": "TempPass123!@#"
      },
      "superAdmin": {
        "email": "superadmin@newcompany.com",
        "temporaryPassword": "TempPass456!@#"
      }
    }
  }
}
```

---

## 📋 Required Fields

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `name` | ✅ Yes | Company/Tenant name | `"New Company"` |
| `email` | ✅ Yes | Contact email | `"contact@newcompany.com"` |
| `domain` | ❌ No | Domain name | `"newcompany.com"` |
| `phone` | ❌ No | Phone number | `"+91-9876543210"` |
| `city` | ❌ No | City | `"Mumbai"` |
| `state` | ❌ No | State | `"Maharashtra"` |
| `country` | ❌ No | Country (default: "India") | `"India"` |
| `plan` | ❌ No | Plan (default: "Basic") | `"Basic"` |

---

## ✅ What Gets Created

When a tenant is created:

1. **Tenant Record**
   - Tenant ID (auto-generated from name)
   - Domain and subdomain
   - Subscription details
   - Plan configuration

2. **Admin Users** (Auto-created)
   - **Admin User:**
     - Email: `admin@[tenant-domain].com`
     - Role: `admin`
     - Temporary password (must be changed on first login)
   
   - **Super Admin User:**
     - Email: `superadmin@[tenant-domain].com`
     - Role: `superadmin`
     - Temporary password (must be changed on first login)

3. **Tenant Database**
   - Database created for tenant
   - Collections initialized
   - Indexes created

---

## 💻 JavaScript Example

```javascript
// Step 1: Login as Superadmin
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
const tenantId = loginData.data.user.tenantId;

// Step 2: Create Tenant
const createTenantResponse = await fetch('http://API_URL/api/tenants', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    'x-tenant-id': tenantId
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

const tenantData = await createTenantResponse.json();

if (tenantData.success) {
  console.log('Tenant created:', tenantData.data.tenantId);
  console.log('Admin email:', tenantData.data.adminUsers.admin.email);
  console.log('Admin temp password:', tenantData.data.adminUsers.admin.temporaryPassword);
}
```

---

## 🔄 Complete Flow Summary

1. ✅ **Superadmin Login**
   - Login with `admin@upcapto.com` / `Upcapto@2026`
   - Get access token

2. ✅ **Create Tenant**
   - Use token to create new tenant
   - Tenant + admin users created automatically

3. ✅ **New Tenant Admin Login**
   - Use temporary password from creation response
   - Must change password on first login

4. ✅ **Admin Manages Tenant**
   - Admin can now manage the tenant

---

## 🧪 Quick Test

```bash
# 1. Login
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

## ✅ Status

**Superadmin Login:** ✅ Working  
**Tenant Creation:** ✅ Working  
**Admin User Creation:** ✅ Working (automatic)  
**Temporary Passwords:** ✅ Generated  

**Complete flow is working!** 🎉
