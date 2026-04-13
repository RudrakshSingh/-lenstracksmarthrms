# 🔍 DocumentDB Troubleshooting Guide

## Issue: No Data in DocumentDB Dashboard

---

## ✅ Solution Applied

### 1. Created/Updated Secret with Full Connection String

The secret now contains:
- `endpoint`: DocumentDB endpoint
- `username`: DocumentDB username
- `password`: DocumentDB password
- `connectionString`: **Full MongoDB connection string** (NEW)

### 2. Updated Deployment

Changed `MONGO_URI` to use `connectionString` from secret instead of just `endpoint`.

**Before**:
```yaml
- name: MONGO_URI
  valueFrom:
    secretKeyRef:
      name: docdb-credentials
      key: endpoint  # Just endpoint, not full connection string
```

**After**:
```yaml
- name: MONGO_URI
  valueFrom:
    secretKeyRef:
      name: docdb-credentials
      key: connectionString  # Full connection string
```

### 3. Connection String Format

The connection string is:
```
mongodb://<username>:<password>@<endpoint>:27017/etelios?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
```

---

## 🔍 How to Verify

### Step 1: Check Service Logs

```bash
kubectl logs deployment/attendance-service -n etelios-prod | grep -i "database\|connected"
```

Expected output:
```
✅ attendance-service: MongoDB connected successfully
database: etelios
host: etelios-docdb-cluster.cluster-xxxxx.ap-south-1.docdb.amazonaws.com
```

### Step 2: Test Attendance API

```bash
# Login
TOKEN=$(curl -s -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@upcapto.com","password":"Upcapto@2026"}' \
  | jq -r '.data.accessToken')

# Clock In
curl -X POST "$API_BASE/api/attendance/clock-in" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto" \
  -F "latitude=19.0764" \
  -F "longitude=72.8778" \
  -F "notes=Test DocumentDB"
```

### Step 3: Check DocumentDB Dashboard

1. Go to **AWS Console** → **Amazon DocumentDB** → **Clusters**
2. Select your cluster: `etelios-docdb-cluster`
3. Click on **Databases** or connect via MongoDB client
4. Check `etelios` database
5. Look for `attendances` collection

---

## 📊 Database Details

- **Database Name**: `etelios`
- **Server**: AWS DocumentDB
- **Endpoint**: `etelios-docdb-cluster.cluster-cl002moksa9v.ap-south-1.docdb.amazonaws.com:27017`
- **Collections**:
  - `attendances` - Attendance records
  - `users` - Employee references
  - `stores` - Store references
  - `locationviolations` - Security violations
  - `locationhistories` - Location tracking

---

## ⚠️ Common Issues

### Issue 1: Service Not Connecting

**Symptoms**: Logs show connection errors

**Solution**:
1. Check secret exists: `kubectl get secret docdb-credentials -n etelios-prod`
2. Verify endpoint is correct
3. Check security groups allow access from EKS cluster

### Issue 2: Wrong Database Name

**Symptoms**: Data in different database

**Solution**:
- Verify `MONGO_DB_NAME=etelios` in deployment
- Check connection string includes `/etelios`

### Issue 3: No Data After API Call

**Symptoms**: API returns success but no data in DocumentDB

**Solution**:
1. Check service logs for errors
2. Verify connection string format
3. Test with MongoDB client directly

---

## 🔧 Manual Connection Test

### Connect to DocumentDB via MongoDB Client

```bash
# Install MongoDB client
# macOS: brew install mongodb/brew/mongodb-community
# Linux: apt-get install mongodb-clients

# Connect
mongosh "mongodb://etelios_admin:<password>@etelios-docdb-cluster.cluster-cl002moksa9v.ap-south-1.docdb.amazonaws.com:27017/etelios?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"

# Check database
use etelios
show collections

# Check attendance records
db.attendances.countDocuments()
db.attendances.find().limit(5)
```

---

## ✅ Verification Checklist

- [ ] Secret `docdb-credentials` exists with `connectionString`
- [ ] Deployment uses `connectionString` for `MONGO_URI`
- [ ] Service logs show successful connection to DocumentDB
- [ ] Database name in logs is `etelios`
- [ ] Attendance API creates records successfully
- [ ] Data visible in DocumentDB dashboard (`etelios` database)

---

## 📝 Next Steps

1. **Restart service** (already done)
2. **Test attendance API** to create data
3. **Check DocumentDB dashboard** for `etelios` database
4. **Verify `attendances` collection** has records

---

**Last Updated**: 2026-02-16  
**Status**: ✅ Configuration Updated  
**Action**: Service restarted, ready for testing
