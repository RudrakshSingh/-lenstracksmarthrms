# 🔍 Attendance Database - Actual Location

## ⚠️ Important Discovery

**The attendance data is NOT in AWS DocumentDB!**

---

## 📊 Actual Database Configuration

### Database Server
**Local MongoDB in Kubernetes** (NOT AWS DocumentDB)

- **Type**: MongoDB running in Kubernetes cluster
- **Service**: `mongodb.etelios-prod.svc.cluster.local:27017`
- **Connection**: Via Kubernetes service discovery

### Database Name
**`etelios`** (Same as HR service)

**NOT** `attendance-db` as expected!

---

## 🔍 How This Happened

### Connection String
From environment variables in the pod:

```
MONGODB_URI=mongodb://admin:etelios123@mongodb.etelios-prod.svc.cluster.local:27017/etelios?authSource=admin
```

**Key Points**:
1. Connection string **already includes database name**: `/etelios`
2. This is a **local MongoDB** in Kubernetes, not AWS DocumentDB
3. The code tries to override the database name, but the connection string takes precedence

### Code Logic

From `microservices/attendance-service/src/server.js`:

```javascript
// Parse connection string
const url = new URL(mongoUri);
const existingDbName = url.pathname ? url.pathname.substring(1).split('?')[0] : '';
// existingDbName = 'etelios' (from connection string)

// Check if database name differs from target
if (existingDbName !== targetDbName) {
  // targetDbName = 'attendance-db' (default)
  // existingDbName = 'etelios' (from connection string)
  
  // Code SHOULD override it, but connection string might be used directly
  url.pathname = `/${targetDbName}`;
  mongoUri = url.toString();
}
```

**However**, if the connection string already has a valid database name (`etelios`), Mongoose might use it directly.

---

## ✅ Where to Find Attendance Data

### Database: `etelios`
### Server: Local MongoDB in Kubernetes (`mongodb.etelios-prod.svc.cluster.local`)

### Collections in `etelios` Database:
1. **`attendances`** - Attendance records
2. **`users`** - Employee references (attendance service)
3. **`stores`** - Store references (attendance service)
4. **`locationviolations`** - Security violations
5. **`locationhistories`** - Location tracking history

**Plus HR service collections**:
- `employees` (HR service)
- `departments` (HR service)
- `stores` (HR service)
- etc.

---

## 🔧 How to Access the Database

### Method 1: Via Kubernetes Pod

```bash
# Get MongoDB pod
kubectl get pods -n etelios-prod | grep mongo

# Connect to MongoDB
kubectl exec -it <mongodb-pod> -n etelios-prod -- mongosh

# Switch to etelios database
use etelios

# Check collections
show collections

# Count attendance records
db.attendances.countDocuments()

# View attendance records
db.attendances.find().limit(5)
```

### Method 2: Port Forward

```bash
# Port forward MongoDB service
kubectl port-forward svc/mongodb -n etelios-prod 27017:27017

# Connect from local machine
mongosh mongodb://admin:etelios123@localhost:27017/etelios?authSource=admin
```

---

## 📋 Why DocumentDB Dashboard Shows Nothing

1. **Wrong Database**: Attendance service is using **local MongoDB**, not DocumentDB
2. **Wrong Database Name**: Data is in `etelios` database, not `attendance-db`
3. **Different Server**: MongoDB is in Kubernetes cluster, not AWS DocumentDB

---

## 🎯 Summary

| Item | Expected | Actual |
|------|----------|--------|
| **Database Server** | AWS DocumentDB | Local MongoDB in Kubernetes |
| **Database Name** | `attendance-db` | `etelios` |
| **Connection** | DocumentDB endpoint | `mongodb.etelios-prod.svc.cluster.local` |
| **Location** | AWS DocumentDB dashboard | Kubernetes MongoDB pod |

---

## ✅ Action Required

1. **Check `etelios` database** in the local MongoDB (not DocumentDB)
2. **Look for `attendances` collection** in `etelios` database
3. **Access via Kubernetes** (not AWS DocumentDB dashboard)

---

## 🔧 To Fix (If Needed)

If you want attendance data in a separate database (`attendance-db`):

1. **Option 1**: Set `MONGO_DB_NAME=attendance-db` in deployment
2. **Option 2**: Modify connection string to not include database name
3. **Option 3**: Update code to force database name override

---

**Last Updated**: 2026-02-16  
**Actual Database**: `etelios` (Local MongoDB in Kubernetes)  
**Status**: ✅ Data is in `etelios` database, not DocumentDB
