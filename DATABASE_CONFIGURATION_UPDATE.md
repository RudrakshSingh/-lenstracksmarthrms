# Database Configuration Update - All Services

## Overview
Updated Attendance, Tenant, and Auth services to use specific database names following the same pattern as HR service.

---

## ✅ Database Names Configured

| Service | Database Name | Status |
|---------|--------------|--------|
| HR Service | `etelios_hr_service` | ✅ Already configured |
| Auth Service | `auth-db` | ✅ Updated |
| Attendance Service | `attendance-db` | ✅ Updated |
| Tenant Management Service | `tenant-db` | ✅ Updated |
| Tenant Registry Service | `tenant-db` | ✅ Updated |

---

## 🔧 Changes Applied

### 1. Attendance Service
**File**: `microservices/attendance-service/src/server.js`

**Changes**:
- Added database name detection and validation
- Force database name to `attendance-db` if not set or contains "test"
- Added explicit `dbName` in connection options
- Added comprehensive logging and validation
- Follows same pattern as HR service

### 2. Tenant Management Service
**File**: `microservices/tenant-management-service/src/config/database.js`

**Changes**:
- Added database name detection and validation
- Force database name to `tenant-db` if not set or contains "test"
- Added explicit `dbName` in connection options
- Added comprehensive logging and validation
- Follows same pattern as HR service

### 3. Tenant Registry Service
**File**: `microservices/tenant-registry-service/src/utils/database.router.js`

**Changes**:
- Updated `initializeRegistry()` method
- Force database name to `tenant-db` if not set or contains "test"
- Added explicit `dbName` in connection options
- Added comprehensive logging and validation
- Follows same pattern as HR service

### 4. Auth Service
**File**: `microservices/auth-service/src/server.js`

**Changes**:
- Added database name detection and validation
- Force database name to `auth-db` if not set or contains "test"
- Added explicit `dbName` in connection options
- Added comprehensive logging and validation
- Follows same pattern as HR service

---

## 📋 Database Name Logic

All services now follow this pattern:

1. **Check Environment Variables**:
   - `DB_NAME` (priority 1)
   - `MONGO_DB_NAME` (priority 2)

2. **Validation**:
   - If not set → Use service-specific database name
   - If contains "test" → Force to main database
   - If empty → Force to main database

3. **Connection String Parsing**:
   - Parse MongoDB URI
   - Extract existing database name
   - Replace if test/empty/mismatched
   - Set explicit `dbName` in connection options

4. **Verification**:
   - Log actual connected database
   - Warn if mismatch
   - Error if test database detected

---

## 🎯 Database Names

### Production Databases
- **HR Service**: `etelios_hr_service`
- **Auth Service**: `auth-db`
- **Attendance Service**: `attendance-db`
- **Tenant Management**: `tenant-db`
- **Tenant Registry**: `tenant-db`

---

## ✅ Benefits

1. **Consistency**: All services follow same pattern
2. **Safety**: Prevents accidental test database connections
3. **Clarity**: Explicit database names for each service
4. **Logging**: Comprehensive logging for debugging
5. **Validation**: Automatic validation and error detection

---

## 📝 Environment Variables

### Optional (for override)
```env
DB_NAME=attendance-db
# OR
MONGO_DB_NAME=attendance-db
```

### Default Behavior
If not set, services will automatically use:
- Attendance: `attendance-db`
- Tenant: `tenant-db`
- Auth: `auth-db`
- HR: `etelios_hr_service`

---

## 🚀 Deployment

After code changes:
1. ✅ Code updated in repository
2. ⏳ Push to Azure DevOps
3. ⏳ Pipeline will build new images
4. ⏳ Deploy to AKS
5. ⏳ Services will connect to correct databases

---

## 📊 Verification

After deployment, check logs:
```bash
# Attendance Service
kubectl logs -n etelios-backend-prod attendance-service-<pod> | grep "Database"

# Tenant Services
kubectl logs -n etelios-backend-prod tenant-management-service-<pod> | grep "Database"
kubectl logs -n etelios-backend-prod tenant-registry-service-<pod> | grep "Database"

# Auth Service
kubectl logs -n etelios-backend-prod auth-service-<pod> | grep "Database"
```

Expected log output:
```
✅ attendance-service: MongoDB connected successfully
   database: attendance-db
   targetDatabase: attendance-db
✅ Database connection verified - using MAIN database
```

---

**Last Updated**: 2026-01-01  
**Status**: ✅ All services updated to use specific database names

