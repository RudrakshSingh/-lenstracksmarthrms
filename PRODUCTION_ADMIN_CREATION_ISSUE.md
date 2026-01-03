# Production Admin User Creation - Network Issue

**Date**: 2026-01-02  
**Status**: ⚠️ **Direct Database Connection Failed**

---

## ❌ Problem

Direct connection to production Cosmos DB is failing due to:
1. **Network Access Restriction**: IP address not whitelisted in Cosmos DB
2. **Connection Closed**: Connection is being closed by Cosmos DB
3. **Firewall Rules**: Network access may be restricted

**Error**: `connection 1 to 40.78.194.11:10255 closed`

---

## ✅ Solution: Use API to Create Admin User

Since direct database connection isn't working, we'll use the API approach:

### Step 1: Get Admin Token via Mock Login
```bash
curl -k -X POST "https://98.70.245.87/api/auth/mock-login-fast" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

### Step 2: Register Admin User via API
```bash
curl -k -X POST "https://98.70.245.87/api/auth/register" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <MOCK_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "ADMIN-001",
    "name": "System Administrator",
    "email": "admin@etelios.com",
    "phone": "+919999999999",
    "password": "Admin@123456",
    "role": "admin",
    "department": "TECH",
    "designation": "System Administrator",
    "joining_date": "2026-01-02T00:00:00.000Z"
  }'
```

### Step 3: Login to Get Real Production Token
```bash
curl -k -X POST "https://98.70.245.87/api/auth/login" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@etelios.com",
    "password": "Admin@123456"
  }'
```

---

## 🔧 Alternative: Fix Network Access

If you want to use direct database connection:

1. **Whitelist IP in Azure Cosmos DB**:
   - Go to Azure Portal → Cosmos DB Account
   - Navigate to "Networking" → "Firewall and virtual networks"
   - Add your current IP address or allow all IPs (0.0.0.0/0) for testing

2. **Verify Connection String**:
   - Ensure password is correctly URL-encoded
   - Check if connection string is complete

3. **Test Connection**:
   - Try connecting with MongoDB Compass or mongo shell
   - Verify network access is working

---

## 📋 Current Status

- ❌ Direct database connection: **FAILED** (Network issue)
- ✅ API approach: **IN PROGRESS**
- ⏳ Admin user creation: **PENDING**

---

## ✅ Next Steps

1. Use API to create admin user (recommended)
2. OR Fix network access and retry direct connection
3. Get production token from login API
4. Test all APIs with production token

---

**Status**: ⚠️ **Network Issue - Using API Approach**

