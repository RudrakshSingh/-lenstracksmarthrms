# 🔧 Setup DocumentDB for Attendance Service

## ✅ Code Changes Applied

I've updated the attendance service to use DocumentDB:

1. ✅ Added `MONGO_DB_NAME=etelios` to deployment
2. ✅ Added `DB_NAME=etelios` to deployment  
3. ✅ Updated code to force database name override
4. ✅ Service configured to use `docdb-credentials` secret

---

## ⚠️ Required: Create DocumentDB Secret

The deployment references `docdb-credentials` secret which needs to be created.

### Step 1: Get DocumentDB Endpoint

From AWS Console:
1. Go to **Amazon DocumentDB** → **Clusters**
2. Select your cluster
3. Copy the **endpoint** (e.g., `etelios-docdb.cluster-xxxxx.ap-south-1.docdb.amazonaws.com`)
4. Note the **port** (usually `27017`)

### Step 2: Get DocumentDB Credentials

- **Username**: Master username (set during cluster creation)
- **Password**: Master password (set during cluster creation)

### Step 3: Create Kubernetes Secret

```bash
kubectl create secret generic docdb-credentials \
  -n etelios-prod \
  --from-literal=endpoint="<documentdb-endpoint>:27017" \
  --from-literal=username="<master-username>" \
  --from-literal=password="<master-password>"
```

**Example**:
```bash
kubectl create secret generic docdb-credentials \
  -n etelios-prod \
  --from-literal=endpoint="etelios-docdb.cluster-xxxxx.ap-south-1.docdb.amazonaws.com:27017" \
  --from-literal=username="admin" \
  --from-literal=password="YourSecurePassword123!"
```

---

## 📋 Alternative: Use Direct Connection String

If you prefer to use a direct connection string instead of secrets:

### Update Deployment

Edit `k8s/etelios-prod/attendance-service-deployment.yaml`:

```yaml
env:
  - name: MONGO_URI
    value: "mongodb://<username>:<password>@<documentdb-endpoint>:27017/etelios?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"
  - name: MONGO_DB_NAME
    value: "etelios"
  - name: DB_NAME
    value: "etelios"
```

**Note**: This is less secure (credentials in YAML), but works if secrets aren't set up.

---

## ✅ Verification

After creating the secret:

1. **Restart the service**:
   ```bash
   kubectl rollout restart deployment/attendance-service -n etelios-prod
   ```

2. **Check logs**:
   ```bash
   kubectl logs deployment/attendance-service -n etelios-prod | grep -i "database\|connected"
   ```

   Expected output:
   ```
   ✅ attendance-service: MongoDB connected successfully
   database: etelios
   host: <documentdb-endpoint>
   ```

3. **Check DocumentDB Dashboard**:
   - Go to AWS DocumentDB dashboard
   - Select your cluster
   - Check `etelios` database
   - Look for `attendances` collection

---

## 📊 Current Configuration

### Deployment (`k8s/etelios-prod/attendance-service-deployment.yaml`)

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
  - name: MONGO_DB_NAME
    value: "etelios"
  - name: DB_NAME
    value: "etelios"
```

### Database Configuration

- **Database Name**: `etelios`
- **Server**: AWS DocumentDB (from secret)
- **Collections**: `attendances`, `users`, `stores`, `locationviolations`, `locationhistories`

---

## 🔧 Connection String Format

The service will construct:

```
mongodb://<username>:<password>@<endpoint>/etelios?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
```

Where:
- `<username>`: From `docdb-credentials` secret
- `<password>`: From `docdb-credentials` secret
- `<endpoint>`: DocumentDB endpoint from secret
- Database: `etelios` (explicitly set)

---

## 📝 Next Steps

1. **Create `docdb-credentials` secret** (see Step 3 above)
2. **Restart attendance service**:
   ```bash
   kubectl rollout restart deployment/attendance-service -n etelios-prod
   ```
3. **Verify connection** in service logs
4. **Check DocumentDB dashboard** for `etelios` database
5. **Test attendance APIs** to create data

---

## ⚠️ Important Notes

1. **Database Name**: `etelios` (same as HR service)
2. **Secret Required**: `docdb-credentials` must exist
3. **TLS Required**: DocumentDB requires TLS connection
4. **Replica Set**: DocumentDB uses replica set `rs0`

---

**Last Updated**: 2026-02-16  
**Status**: ✅ Code Updated, ⚠️ Secret Required  
**Next Step**: Create `docdb-credentials` secret
