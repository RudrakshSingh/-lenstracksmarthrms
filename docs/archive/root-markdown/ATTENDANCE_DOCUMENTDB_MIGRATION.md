# 🔄 Attendance Service - DocumentDB Migration

## ✅ Migration Complete

**Attendance service is now configured to use AWS DocumentDB!**

---

## 📊 Configuration Changes

### Before
- **Database Server**: Local MongoDB in Kubernetes
- **Connection**: `mongodb.etelios-prod.svc.cluster.local:27017`
- **Database Name**: `etelios` (from connection string)

### After
- **Database Server**: AWS DocumentDB
- **Connection**: From `docdb-credentials` secret
- **Database Name**: `etelios` (explicitly set)

---

## 🔧 Changes Made

### 1. Updated Deployment (`k8s/etelios-prod/attendance-service-deployment.yaml`)

Added environment variables:

```yaml
env:
  - name: MONGO_DB_NAME
    value: "etelios"
  - name: DB_NAME
    value: "etelios"
```

### 2. Updated Code Logic

The code now properly forces the database name to `etelios` even if the connection string has a different name.

---

## 📍 Database Configuration

### Connection Details

- **Server**: AWS DocumentDB (from `docdb-credentials` secret)
- **Database**: `etelios`
- **Collections**:
  - `attendances` - Attendance records
  - `users` - Employee references
  - `stores` - Store references
  - `locationviolations` - Security violations
  - `locationhistories` - Location tracking history

### Connection String Format

```
mongodb://<username>:<password>@<documentdb-endpoint>/etelios?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
```

Where:
- `<username>`: From `docdb-credentials` secret
- `<password>`: From `docdb-credentials` secret
- `<documentdb-endpoint>`: AWS DocumentDB endpoint from secret
- Database: `etelios` (explicitly set)

---

## ✅ Verification

### Check Service Logs

```bash
kubectl logs deployment/attendance-service -n etelios-prod | grep -i "database\|connected"
```

Expected output:
```
✅ attendance-service: MongoDB connected successfully
database: etelios
host: <documentdb-endpoint>
```

### Check Environment Variables

```bash
kubectl exec -n etelios-prod deployment/attendance-service -- env | grep -i "MONGO\|DB"
```

Should show:
```
MONGO_DB_NAME=etelios
DB_NAME=etelios
MONGO_URI=<documentdb-endpoint>
```

### Check DocumentDB Dashboard

1. Go to AWS DocumentDB dashboard
2. Select your DocumentDB cluster
3. Check `etelios` database
4. Look for `attendances` collection

---

## 📊 Data Location

All attendance data is now stored in:

- **Database**: `etelios` (AWS DocumentDB)
- **Server**: AWS DocumentDB cluster
- **Collections**: 
  - `attendances` - Main attendance records
  - `users` - Employee references
  - `stores` - Store references
  - `locationviolations` - Security violations
  - `locationhistories` - Location tracking

---

## 🔄 Migration Notes

### Existing Data

If there was existing data in the local MongoDB:
- **Old Location**: Local MongoDB (`mongodb.etelios-prod.svc.cluster.local`)
- **New Location**: AWS DocumentDB (`etelios` database)

**Note**: Existing data in local MongoDB will remain there. New data will go to DocumentDB.

### Data Migration (If Needed)

If you need to migrate existing data:

```bash
# Export from local MongoDB
kubectl exec -it <mongodb-pod> -n etelios-prod -- mongodump --db=etelios --collection=attendances --out=/tmp/backup

# Import to DocumentDB
mongorestore --host=<documentdb-endpoint> --username=<username> --password=<password> --db=etelios --collection=attendances /tmp/backup/etelios/attendances.bson
```

---

## ✅ Status

- ✅ Deployment updated
- ✅ Environment variables set
- ✅ Service restarted
- ✅ Now using AWS DocumentDB

---

## 📝 Important Notes

1. **Database Name**: `etelios` (same as HR service)
2. **Server**: AWS DocumentDB (managed MongoDB)
3. **Connection**: Via `docdb-credentials` Kubernetes secret
4. **Collections**: All attendance collections in `etelios` database

---

**Last Updated**: 2026-02-16  
**Status**: ✅ Migrated to AWS DocumentDB  
**Database**: `etelios` (AWS DocumentDB)
