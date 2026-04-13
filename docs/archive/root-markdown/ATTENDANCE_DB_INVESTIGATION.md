# 🔍 Attendance Database Investigation

## Issue
**No data visible in Amazon DocumentDB dashboard**

---

## 📊 Current Configuration

### Database Name Logic

From `microservices/attendance-service/src/server.js`:

```javascript
// Get target database name
let targetDbName = process.env.DB_NAME || process.env.MONGO_DB_NAME;

// If no env var or env var contains "test", use main production database
if (!targetDbName || targetDbName.toLowerCase().includes('test')) {
  targetDbName = 'attendance-db';  // ⚠️ DEFAULT
}
```

### Deployment Configuration

From `k8s/etelios-prod/attendance-service-deployment.yaml`:

```yaml
env:
  - name: MONGO_URI
    valueFrom:
      secretKeyRef:
        name: docdb-credentials
        key: endpoint
  - name: MONGO_USERNAME
    valueFrom:
      secretKeyRef:
        name: docdb-credentials
        key: username
  - name: MONGO_PASSWORD
    valueFrom:
      secretKeyRef:
        name: docdb-credentials
        key: password
  # ⚠️ NO DB_NAME or MONGO_DB_NAME SET!
```

**Result**: Since `DB_NAME` and `MONGO_DB_NAME` are **NOT SET** in the deployment, the service uses the **default: `attendance-db`**

---

## 🔍 Possible Issues

### 1. Database Name Mismatch
- **Expected**: `attendance-db`
- **Actual**: Might be using `etelios` (like HR service) or another name
- **Check**: Connection string might override the database name

### 2. Connection String Override
The code parses the `MONGO_URI` and extracts/overrides the database name:

```javascript
// Parse connection string to extract and set database name
const url = new URL(mongoUri);
const existingDbName = url.pathname ? url.pathname.substring(1).split('?')[0] : '';

if (!existingDbName || existingDbName.trim() === '' || existingDbName.toLowerCase().includes('test')) {
  url.pathname = `/${targetDbName}`;  // Sets to 'attendance-db'
  mongoUri = url.toString();
}
```

**If the connection string already has a database name**, it might be using that instead.

### 3. Using Same Database as HR Service
HR service uses `etelios` database. If attendance service is also connecting to `etelios`, all data would be in the same database.

---

## 🔧 How to Check Actual Database

### Method 1: Check Service Logs

```bash
kubectl logs deployment/attendance-service -n etelios-prod | grep -i "database\|connected"
```

Look for:
```
✅ attendance-service: MongoDB connected successfully
database: <actual-db-name>
```

### Method 2: Check Environment Variables

```bash
kubectl exec -n etelios-prod deployment/attendance-service -- env | grep -i "MONGO\|DB"
```

### Method 3: Check Connection String

The `MONGO_URI` from `docdb-credentials` secret might already include a database name.

---

## 🎯 Most Likely Scenario

**The attendance service is probably using the `etelios` database** (same as HR service) because:

1. The connection string from `docdb-credentials` might already specify `etelios`
2. If the connection string has a database name, the code uses it
3. HR service uses `etelios`, so both services might be sharing the same database

---

## ✅ Solution: Check DocumentDB for `etelios` Database

**Check the `etelios` database in DocumentDB dashboard**, not `attendance-db`!

The collections would be:
- `attendances` (attendance records)
- `users` (employee references)
- `stores` (store references)
- `locationviolations` (security violations)
- `locationhistories` (location tracking)

---

## 🔧 To Verify

1. **Check DocumentDB for `etelios` database** (not `attendance-db`)
2. **Look for `attendances` collection** in `etelios` database
3. **Check service logs** to see actual database name:
   ```bash
   kubectl logs deployment/attendance-service -n etelios-prod --tail=100 | grep -i "database"
   ```

---

## 📝 Next Steps

1. ✅ Check DocumentDB dashboard for `etelios` database
2. ✅ Look for `attendances` collection
3. ✅ Verify connection string doesn't override database name
4. ✅ If needed, explicitly set `MONGO_DB_NAME=attendance-db` in deployment

---

**Last Updated**: 2026-02-16  
**Status**: 🔍 Investigation Required
