# Superadmin Login & Tenant Creation Flow

## 🔐 Superadmin Credentials

```
Email:    admin@upcapto.com
Password: Upcapto@2026
Tenant:   upcapto
Role:     superadmin
```

## 🚀 Complete Flow

### Step 1: Superadmin Login

```bash
curl -X POST http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@upcapto.com",
    "password": "Upcapto@2026"
  }'
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

### Step 2: Create Tenant

```bash
curl -X POST http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "x-tenant-id: upcapto" \
  -d '{
    "name": "New Company",
    "email": "contact@newcompany.com",
    "domain": "newcompany.com",
    "phone": "+91-9876543210",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "plan": "Basic"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Tenant created successfully",
  "data": {
    "tenantId": "newcompany",
    "name": "New Company",
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

## 📋 Required Fields for Tenant Creation

- `name` (required): Tenant/Company name
- `email` (required): Contact email
- `domain` (optional): Domain name
- `phone` (optional): Phone number
- `city`, `state`, `country` (optional): Address
- `plan` (optional): Subscription plan (default: "Basic")

## ✅ Created Users

When a tenant is created, two users are automatically created:

1. **Admin User:**
   - Email: `admin@[tenant-domain].com`
   - Role: `admin`
   - Temporary password (must be changed on first login)

2. **Super Admin User:**
   - Email: `superadmin@[tenant-domain].com`
   - Role: `superadmin`
   - Temporary password (must be changed on first login)

## 🔄 Complete Flow Summary

1. ✅ Superadmin logs in → Gets access token
2. ✅ Superadmin creates tenant → Tenant + admin users created
3. ✅ New tenant admin logs in with temporary password
4. ✅ Admin changes password on first login
5. ✅ Admin can now manage tenant

---

**Status: ✅ Working!**
