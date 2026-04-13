# 🌱 Upcapto Superadmin Seed Guide

**Guide to create Upcapto superadmin user**

---

## 🎯 Quick Start

### **Option 1: Via Database (Recommended)**

```bash
# Set MongoDB connection string
export MONGODB_URI="mongodb://user:password@host:27017/dbname"

# Run seed script
node scripts/seed-upcapto-superadmin.js
```

### **Option 2: Get MongoDB URI from Kubernetes**

```bash
# Get MongoDB URI from Kubernetes secret
export MONGODB_URI=$(kubectl get secret docdb-credentials -n etelios-prod -o jsonpath='{.data.MONGODB_URI}' | base64 -d)

# Run seed script
node scripts/seed-upcapto-superadmin.js
```

---

## 📋 Superadmin Credentials

After seeding, you can login with:

- **Email:** `admin@upcapto.com`
- **Password:** `Upcapto@2026`
- **Tenant:** `upcapto`
- **Role:** `superadmin`

---

## 🔧 Detailed Steps

### Step 1: Get MongoDB Connection String

#### From Kubernetes Secret:
```bash
kubectl get secret docdb-credentials -n etelios-prod -o jsonpath='{.data.MONGODB_URI}' | base64 -d
```

#### From DocumentDB Info File:
```bash
# If you have documentdb-connection-info.txt
cat documentdb-connection-info.txt | grep "Connection String"
```

#### Manual Format:
```
mongodb://username:password@host:27017/dbname?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
```

### Step 2: Run Seed Script

```bash
# Set environment variable
export MONGODB_URI="your-connection-string-here"

# Run script
node scripts/seed-upcapto-superadmin.js
```

### Step 3: Verify

```bash
# Test login
curl -X POST http://your-backend-url/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@upcapto.com",
    "password": "Upcapto@2026"
  }'
```

---

## 🐛 Troubleshooting

### Issue: "MONGODB_URI is required"

**Solution:**
```bash
# Provide MongoDB URI
export MONGODB_URI="mongodb://user:password@host:27017/dbname"
node scripts/seed-upcapto-superadmin.js
```

### Issue: "Server selection timed out"

**Solution:**
1. Check MongoDB/DocumentDB is accessible
2. Verify network connectivity
3. Check security group rules (for DocumentDB)
4. Verify connection string format

### Issue: "Authentication required to register users"

**Solution:**
- API registration requires authentication
- Use database method instead: `node scripts/seed-upcapto-superadmin.js` (with MONGODB_URI)

### Issue: "User already exists"

**Solution:**
- This is OK! Superadmin already exists
- Use the credentials to login
- If you need to reset password, delete user first or update manually

---

## 📝 What Gets Created

The script creates:

```javascript
{
  tenantId: 'upcapto',
  employee_id: 'UPCAPTO-ADMIN-001',
  name: 'Upcapto Super Admin',
  email: 'admin@upcapto.com',
  phone: '+91-9876543210',
  password: 'Upcapto@2026', // Hashed with bcrypt
  role: 'superadmin',
  department: 'HR',
  band_level: 'A',
  hierarchy_level: 'NATIONAL',
  designation: 'Super Administrator',
  status: 'active',
  is_active: true,
  mustChangePassword: false,
  passwordTemporary: false
}
```

---

## ✅ Success Output

```
🚀 Starting Upcapto Superadmin Seed...
=====================================

💾 Creating Superadmin via Database...
=====================================

📡 Connecting to MongoDB...
   URI: mongodb://***:***@host:27017/dbname
✅ Connected to MongoDB

🔍 Checking if superadmin already exists...
👤 Creating superadmin user...
✅ Superadmin created successfully!

🔐 Login Credentials:
   Email: admin@upcapto.com
   Password: Upcapto@2026
   Tenant: upcapto

✅ Done!

🎉 Upcapto Superadmin Setup Complete!
=====================================
```

---

## 🎯 Next Steps

After creating superadmin:

1. **Login:**
   ```bash
   curl -X POST http://your-backend-url/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@upcapto.com","password":"Upcapto@2026"}'
   ```

2. **Create Tenants:**
   ```bash
   BASE_URL="http://your-backend-url" node scripts/seed-complete-system.js
   ```

3. **Test APIs:**
   ```bash
   BASE_URL="http://your-backend-url" node scripts/test-complete-flow.js
   ```

---

**Last Updated:** 2026-02-28
