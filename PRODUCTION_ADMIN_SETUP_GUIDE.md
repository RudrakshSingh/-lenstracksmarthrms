# Production Admin User Setup Guide

**Date**: 2026-01-02  
**Status**: ⚠️ **Network Access Required**

---

## 🎯 Goal

Create admin user in production database with real bearer token that works for all APIs.

---

## ❌ Current Issue

**Direct database connection from local machine is failing** due to:
- Network access restrictions (IP not whitelisted)
- Cosmos DB firewall rules
- Connection being closed by Cosmos DB

**Error**: `connection 1 to 40.78.194.11:10255 closed`

---

## ✅ Solutions

### Option 1: Run Script on Production Server (Recommended)

**Steps**:

1. **SSH into production server** or use Azure Cloud Shell:
   ```bash
   # Via Azure Cloud Shell or production server
   cd /path/to/lenstracksmarthrms
   ```

2. **Set environment variables**:
   ```bash
   export MONGO_URI="mongodb://etelios-mongo-db:h4cmg34pAbKZxyZRqwqxa2PhWoZ9ux5quvBZh2EqhSIaGrPMAaF8btIdgoMawHILafZBw8YgsddlACDbbpOJQ==@etelios-mongo-db.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@etelios-mongo-db@"
   export JWT_SECRET="<production-jwt-secret>"
   ```

3. **Run the script**:
   ```bash
   node scripts/create-real-admin.js
   ```

4. **Get production token**:
   ```bash
   # Login via API
   curl -k -X POST "https://98.70.245.87/api/auth/login" \
     -H "Host: api.etelios.com" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@etelios.com",
       "password": "Admin@123456"
     }'
   ```

---

### Option 2: Whitelist IP in Cosmos DB

**Steps**:

1. **Go to Azure Portal**:
   - Navigate to Cosmos DB Account: `etelios-mongo-db`
   - Go to "Networking" → "Firewall and virtual networks"

2. **Add IP Address**:
   - Click "Add IP address"
   - Enter your current public IP
   - OR select "Allow access from Azure datacenters" for testing

3. **Save and retry**:
   ```bash
   node scripts/create-real-admin.js
   ```

---

### Option 3: Use Azure Cloud Shell

**Steps**:

1. **Open Azure Cloud Shell** (bash):
   - Go to https://shell.azure.com
   - Or use Azure Portal → Cloud Shell

2. **Clone/Upload project**:
   ```bash
   git clone <repo-url>
   cd lenstracksmarthrms
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Run script**:
   ```bash
   export MONGO_URI="<connection-string>"
   node scripts/create-real-admin.js
   ```

---

### Option 4: Use API with Existing Admin (If Available)

If you have another admin user or superadmin:

1. **Login with existing admin**:
   ```bash
   curl -k -X POST "https://98.70.245.87/api/auth/login" \
     -H "Host: api.etelios.com" \
     -H "Content-Type: application/json" \
     -d '{"email": "<existing-admin>", "password": "<password>"}'
   ```

2. **Register new admin**:
   ```bash
   curl -k -X POST "https://98.70.245.87/api/auth/register" \
     -H "Host: api.etelios.com" \
     -H "Authorization: Bearer <existing-admin-token>" \
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

---

## 📋 Admin User Details

Once created, use these credentials:

- **Email**: `admin@etelios.com`
- **Password**: `Admin@123456`
- **Employee ID**: `ADMIN-001`
- **Role**: `admin`

---

## 🔑 Getting Production Token

After user is created, login to get production token:

```bash
curl -k -X POST "https://98.70.245.87/api/auth/login" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@etelios.com",
    "password": "Admin@123456"
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... }
  }
}
```

---

## ✅ Testing Token

Once you have the production token, test all APIs:

```bash
# Get employees
curl -k -X GET "https://98.70.245.87/api/hr/employees" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <TOKEN>"

# Create employee
curl -k -X POST "https://98.70.245.87/api/hr/employees" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

---

## 📁 Files

- `scripts/create-real-admin.js` - Script to create admin user
- `scripts/create-admin-production.sh` - Shell script wrapper
- `PRODUCTION_ADMIN_SETUP_GUIDE.md` - This file

---

## ⚠️ Important Notes

1. **Network Access**: Direct connection requires IP whitelisting
2. **JWT_SECRET**: Production uses different JWT_SECRET than local
3. **Database**: Production uses `auth-db` database in Cosmos DB
4. **Security**: Keep credentials secure, don't commit to version control

---

## 🎯 Recommended Approach

**Best Option**: Run the script on production server or Azure Cloud Shell where network access is already configured.

---

**Status**: ⚠️ **Requires Network Access or Production Server**

