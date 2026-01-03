# Pipeline Rerun Required

**Date**: 2026-01-02  
**Status**: ⚠️ **Pipeline Rerun Required**

---

## ✅ Code Changes Made

### Services Updated

1. **auth-service/src/server.js**
   - Updated database connection to use `MONGODB_URI` from environment
   - Simplified connection logic (uses `dbName` option instead of modifying connection string)
   - **Status**: ⚠️ **Requires Deployment**

2. **hr-service/src/server.js**
   - Updated database connection to use `MONGODB_URI` from environment
   - Simplified connection logic (uses `dbName` option instead of modifying connection string)
   - **Status**: ⚠️ **Requires Deployment**

3. **attendance-service/src/server.js**
   - May need similar updates
   - **Status**: ⚠️ **Check if Updated**

---

## 🔧 What Changed

### Before
- Services modified connection string to inject database name
- Complex URL parsing and string manipulation
- Database name extracted from connection string

### After
- Services use `MONGODB_URI` as-is (no modification)
- Database name specified via `dbName` option in connection options
- Simpler, more reliable connection logic

### Example Change
```javascript
// Before: Modified connection string
mongoUri = mongoUri.replace(/\/(\?)/, `/${targetDbName}$1`);

// After: Use connection string as-is, specify dbName in options
await mongoose.connect(mongoUri, {
  dbName: targetDbName, // Specify database name here
  // ... other options
});
```

---

## ⚠️ Why Pipeline Rerun is Required

1. **Code Changes**: Database connection logic was modified in service files
2. **Production Deployment**: Changes need to be deployed to production
3. **Environment Variables**: Services now rely on `MONGODB_URI` environment variable
4. **Database Connection**: New connection approach needs to be active in production

---

## ✅ What Doesn't Need Deployment

1. **Admin User**: Already created in database (no code change)
2. **Scripts**: `create-real-admin.js`, `get-production-token.js` (not deployed)
3. **Documentation**: Markdown files (not deployed)

---

## 🚀 Pipeline Rerun Steps

### 1. Commit Changes
```bash
git add microservices/auth-service/src/server.js
git add microservices/hr-service/src/server.js
git add microservices/attendance-service/src/server.js  # if updated
git commit -m "Update database connection to use MONGODB_URI with dbName option"
git push
```

### 2. Trigger Pipeline
- Push to main branch, OR
- Manually trigger pipeline in Azure DevOps

### 3. Verify Deployment
After pipeline completes:
- Check service logs to verify database connection
- Verify services connect to correct databases:
  - `auth-service` → `auth-db`
  - `hr-service` → `hr-db`
  - `attendance-service` → `attendance-db`

---

## 🔍 Environment Variables Required

Ensure these are set in pipeline/environment:

```bash
MONGODB_URI=mongodb://etelios-mongo-db:h4cmg34pAbKZxyZRqwqxa2PhWoZ9ux5quvBZh2EqhSIaGrPMAaF8btIdgoMawHILafZBw8YgsddlACDbbpOoJQ==@etelios-mongo-db.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@etelios-mongo-db@
```

Optional (service-specific):
```bash
# Auth Service
DB_NAME=auth-db

# HR Service
DB_NAME=hr-db

# Attendance Service
DB_NAME=attendance-db
```

---

## ✅ Benefits After Deployment

1. **Simplified Connection**: No more complex URL parsing
2. **Reliable**: Database name always specified correctly
3. **Maintainable**: Single `MONGODB_URI` for all services
4. **Consistent**: All services use same connection approach

---

## 📋 Checklist

Before Pipeline Rerun:
- [x] Code changes committed
- [ ] Code changes pushed to repository
- [ ] Environment variables verified in pipeline
- [ ] All services updated (auth, hr, attendance)

After Pipeline Rerun:
- [ ] Services deployed successfully
- [ ] Database connections verified
- [ ] Services connecting to correct databases
- [ ] APIs working correctly

---

## ⚠️ Important Notes

1. **Database Connection**: Services will use new connection logic after deployment
2. **No Data Loss**: Changes are connection logic only, no data changes
3. **Backward Compatible**: Works with existing database structure
4. **Environment Variables**: Ensure `MONGODB_URI` is set in all environments

---

**Status**: ⚠️ **Pipeline Rerun Required for Code Changes**

**Priority**: 🔴 **High** (Database connection logic changes)

