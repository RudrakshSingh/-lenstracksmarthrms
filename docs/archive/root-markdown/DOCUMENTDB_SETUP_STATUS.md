# 📊 DocumentDB Setup Status

## ✅ Configuration Complete

All configuration changes have been made to use DocumentDB:

1. ✅ **Secret Updated**: `docdb-credentials` now contains full `connectionString`
2. ✅ **Deployment Updated**: Uses `connectionString` from secret
3. ✅ **Docker Image Built**: New image with DocumentDB support
4. ✅ **Image Pushed**: Available in ECR

---

## ⚠️ Current Issue: Resource Constraints

**Problem**: New pods cannot start due to insufficient cluster resources.

**Error**:
```
0/5 nodes are available: 
- 1 Insufficient memory
- 1 Too many pods  
- 4 Insufficient cpu
```

**Status**:
- Old pods still running (using old MongoDB connection)
- New pods pending (waiting for resources)

---

## 🔧 Solutions

### Option 1: Wait for Resources (Recommended)

The cluster will automatically schedule new pods when resources become available.

**Check status**:
```bash
kubectl get pods -n etelios-prod -l app=attendance-service
```

### Option 2: Scale Down Other Services (Temporary)

Free up resources by scaling down non-critical services:

```bash
# Example: Scale down a service temporarily
kubectl scale deployment <other-service> -n etelios-prod --replicas=1
```

### Option 3: Increase Cluster Capacity

Add more nodes or increase node sizes:

```bash
# Check current node capacity
kubectl top nodes

# Scale up node group (if using managed node groups)
eksctl scale nodegroup --cluster=etelios-prod-v2 --name=main-workers --nodes=4
```

### Option 4: Force Pod Replacement (If Resources Available)

Delete old pods to force new ones (only if resources allow):

```bash
# Delete old pods (new ones will start if resources available)
kubectl delete pod attendance-service-65b8d66d5c-l5crm attendance-service-65b8d66d5c-n8xtk -n etelios-prod
```

---

## 📊 Configuration Details

### Connection String
```
mongodb://etelios_admin:***@etelios-docdb-cluster.cluster-cl002moksa9v.ap-south-1.docdb.amazonaws.com:27017/etelios?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
```

### Database
- **Name**: `etelios`
- **Server**: AWS DocumentDB
- **Endpoint**: `etelios-docdb-cluster.cluster-cl002moksa9v.ap-south-1.docdb.amazonaws.com:27017`

---

## ✅ Verification Steps (Once Pods Are Ready)

1. **Check Pod Status**:
   ```bash
   kubectl get pods -n etelios-prod -l app=attendance-service
   ```

2. **Check Connection Logs**:
   ```bash
   kubectl logs deployment/attendance-service -n etelios-prod | grep -i "database\|connected"
   ```
   
   Expected:
   ```
   ✅ attendance-service: MongoDB connected successfully
   database: etelios
   host: etelios-docdb-cluster...
   ```

3. **Test API**:
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
     -F "notes=DocumentDB Test"
   ```

4. **Check DocumentDB Dashboard**:
   - Go to AWS Console → DocumentDB → Clusters
   - Select `etelios-docdb-cluster`
   - Check `etelios` database
   - Look for `attendances` collection

---

## 📝 Why No Data in DocumentDB?

**Current Situation**:
- Old pods are still running with **old configuration** (local MongoDB)
- New pods with **DocumentDB configuration** are pending (waiting for resources)
- Data is going to **local MongoDB**, not DocumentDB

**Solution**:
- Once new pods start, they will use DocumentDB
- Old data remains in local MongoDB
- New data will go to DocumentDB

---

## 🎯 Next Steps

1. **Wait for resources** OR **scale up cluster**
2. **Monitor pod status**: `kubectl get pods -n etelios-prod -w`
3. **Once new pods are ready**, test attendance API
4. **Check DocumentDB dashboard** for `etelios` database

---

**Last Updated**: 2026-02-16  
**Status**: ✅ Configured, ⚠️ Waiting for Resources  
**Action Required**: Scale cluster or wait for resources
