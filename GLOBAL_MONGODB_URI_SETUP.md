# Global MONGODB_URI Setup

**Date**: 2026-01-02  
**Status**: ✅ **Configured**

---

## 🎯 Configuration

### Global MONGODB_URI
```bash
MONGODB_URI=mongodb://etelios-mongo-db:h4cmg34pAbKZxyZRqwqxa2PhWoZ9ux5quvBZh2EqhSIaGrPMAaF8btIdgoMawHILafZBw8YgsddlACDbbpOoJQ==@etelios-mongo-db.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@etelios-mongo-db@
```

### Database Names by Service
- **auth-service**: `auth-db`
- **hr-service**: `hr-db` (or `etelios_hr_service`)
- **attendance-service**: `attendance-db`
- **tenant-management-service**: `tenant-db`
- **tenant-registry-service**: `tenant-db`

---

## ✅ Implementation

All microservices now:
1. **Read MONGODB_URI** from environment variable
2. **Use connection string as-is** (no modification)
3. **Specify dbName** in connection options only
4. **Support both** `MONGO_URI` and `MONGODB_URI` for compatibility

---

## 📋 Service Configuration

### Auth Service
- **Database**: `auth-db`
- **Connection**: Uses `MONGODB_URI` with `dbName: 'auth-db'`

### HR Service
- **Database**: `hr-db` or `etelios_hr_service`
- **Connection**: Uses `MONGODB_URI` with `dbName: 'hr-db'`

### Attendance Service
- **Database**: `attendance-db`
- **Connection**: Uses `MONGODB_URI` with `dbName: 'attendance-db'`

### Tenant Management Service
- **Database**: `tenant-db`
- **Connection**: Uses `MONGODB_URI` with `dbName: 'tenant-db'`

### Tenant Registry Service
- **Database**: `tenant-db`
- **Connection**: Uses `MONGODB_URI` with `dbName: 'tenant-db'`

---

## 🔧 Connection Pattern

All services follow this pattern:

```javascript
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
const dbName = 'service-specific-db-name'; // e.g., 'auth-db', 'hr-db'

await mongoose.connect(mongoUri, {
  dbName: dbName, // Specify database name here
  // ... other options
});
```

**Key Points**:
- ✅ Connection string is used **as-is** (no modification)
- ✅ Database name is specified in **connection options** only
- ✅ No URL parsing or string manipulation needed
- ✅ Works with Cosmos DB connection strings

---

## 📝 Environment Variables

### Global (All Services)
```bash
MONGODB_URI=mongodb://etelios-mongo-db:h4cmg34pAbKZxyZRqwqxa2PhWoZ9ux5quvBZh2EqhSIaGrPMAaF8btIdgoMawHILafZBw8YgsddlACDbbpOoJQ==@etelios-mongo-db.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@etelios-mongo-db@
```

### Service-Specific (Optional)
```bash
# Auth Service
DB_NAME=auth-db

# HR Service
DB_NAME=hr-db

# Attendance Service
DB_NAME=attendance-db

# Tenant Services
DB_NAME=tenant-db
```

---

## ✅ Benefits

1. **Single Connection String**: One MONGODB_URI for all services
2. **Simple Configuration**: Just specify dbName per service
3. **No String Manipulation**: Connection string used as-is
4. **Cosmos DB Compatible**: Works with Azure Cosmos DB format
5. **Easy Maintenance**: Update MONGODB_URI in one place

---

## 🧪 Testing

### Test Connection
```bash
export MONGODB_URI="mongodb://..."
node scripts/create-real-admin.js
```

### Verify Database Names
Each service logs the connected database name on startup:
```
✅ Connected to database: auth-db
✅ Connected to database: hr-db
✅ Connected to database: attendance-db
```

---

## 📄 Files Updated

- ✅ `scripts/create-real-admin.js` - Uses MONGODB_URI with dbName
- ✅ `microservices/auth-service/src/server.js` - Simplified connection
- ✅ `microservices/hr-service/src/server.js` - Simplified connection
- ✅ `microservices/attendance-service/src/server.js` - Simplified connection
- ✅ `microservices/tenant-management-service/src/config/database.js` - Simplified connection
- ✅ `microservices/tenant-registry-service/src/utils/database.router.js` - Simplified connection

---

**Status**: ✅ **Configured and Working**

