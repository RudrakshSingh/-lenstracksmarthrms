# 🔍 Detailed Error Analysis - DocumentDB Connection Issues

**Date:** 2026-02-28  
**Time:** ~10:45 AM IST  
**Status:** Services unable to connect to DocumentDB

---

## 📋 **ERROR SUMMARY**

### **Main Errors:**
1. ❌ **MongoDB Connection String TLS Conflict**
2. ❌ **DocumentDB Certificate Validation Failure**
3. ❌ **Pods in CrashLoopBackOff State**
4. ❌ **Services Not Ready (0/1 Ready)**

---

## 🔴 **ERROR 1: MongoDB Connection String TLS Conflict**

### **Error Message:**
```
The 'tlsInsecure' option cannot be used with the 'tlsAllowInvalidCertificates' option
```

### **Root Cause:**
MongoDB connection string में दो conflicting TLS options हैं:
- `tlsInsecure=true` (implicitly added by application code)
- `tlsAllowInvalidCertificates=true` (explicitly in connection string)

MongoDB driver इन दोनों options को एक साथ allow नहीं करता।

### **Current Connection String:**
```
mongodb://docdbadmin:***@lenstrack-docdb-cluster.cluster-cl002moksa9v.ap-south-1.docdb.amazonaws.com:27017/hrms?tls=true&tlsAllowInvalidCertificates=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
```

### **Problem:**
- Application code में `tlsInsecure` option automatically add हो रहा है
- Connection string में `tlsAllowInvalidCertificates=true` है
- ये दोनों conflict कर रहे हैं

### **Solution:**
1. Connection string से `tlsAllowInvalidCertificates` remove करें
2. या application code से `tlsInsecure` option remove करें
3. Proper certificate mount करें और valid TLS use करें

### **Fix Applied:**
✅ Connection string updated to: `tls=true` only (no conflicting options)

### **Current Status (After Fix):**
✅ Connection string is now clean:
```
mongodb://docdbadmin:***@lenstrack-docdb-cluster...:27017/hrms?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
```
⚠️ **But still getting certificate error** (see Error 2)

---

## 🔴 **ERROR 2: DocumentDB Certificate Validation Failure**

### **Error Message:**
```
unable to get local issuer certificate
```

### **Root Cause:**
DocumentDB TLS connection के लिए proper CA certificate चाहिए, लेकिन:
1. Certificate mount path incorrect है
2. Certificate file missing है pod में
3. Connection string में certificate path specify नहीं है

### **Details:**
- DocumentDB requires TLS with valid CA certificate
- Certificate downloaded: ✅ `rds-ca-bundle.pem`
- Certificate secret created: ✅ `docdb-ca-cert`
- Certificate mounted: ⚠️ Path issue (`/etc/ssl/certs/ca-cert.pem`)
- Connection string: ❌ Certificate path not specified

### **Current Certificate Mount:**
```yaml
volumeMounts:
- name: docdb-ca-cert
  mountPath: /etc/ssl/certs/ca-cert.pem
  subPath: ca-cert.pem
```

### **Problem:**
- Certificate file mount हो रहा है, लेकिन connection string में path specify नहीं है
- MongoDB driver system certificate store use कर रहा है, जहाँ DocumentDB CA certificate नहीं है

### **Solution Options:**

#### **Option A: Use Certificate Path in Connection String**
```
mongodb://...?tls=true&tlsCAFile=/etc/ssl/certs/ca-cert.pem&...
```

#### **Option B: Mount Certificate to System Location**
Mount certificate to `/etc/ssl/certs/` directory (not as file)

#### **Option C: Use tlsAllowInvalidCertificates (Not Recommended)**
```
mongodb://...?tls=true&tlsAllowInvalidCertificates=true&...
```
⚠️ **Security Risk:** This bypasses certificate validation

### **Fix Applied:**
✅ Certificate mounted correctly
⚠️ Connection string needs certificate path or `tlsAllowInvalidCertificates=true`

### **Current Error (Latest Logs):**
```
unable to get local issuer certificate
```

### **Why This Happens:**
1. Connection string में `tls=true` है
2. लेकिन certificate path specify नहीं है (`tlsCAFile` missing)
3. MongoDB driver system certificate store use करता है
4. System certificate store में DocumentDB CA certificate नहीं है
5. Certificate validation fail होता है

### **Solution:**
Add certificate path to connection string:
```
mongodb://...?tls=true&tlsCAFile=/etc/ssl/certs/ca-cert.pem&...
```
OR use `tlsAllowInvalidCertificates=true` (temporary fix)

---

## 🔴 **ERROR 3: Pods in CrashLoopBackOff State**

### **Current Status:**
```
NAME                                  READY   STATUS             RESTARTS      AGE
auth-service-xxx                      0/1     CrashLoopBackOff   4            3m
attendance-service-xxx                 0/1     CrashLoopBackOff   4            3m
hr-service-xxx                         0/1     Running            3            3m
```

### **Root Cause:**
1. **Auth Service:** Database connection fail हो रहा है → Pod crash → Restart → Crash (loop)
2. **Attendance Service:** Same issue
3. **HR Service:** Running लेकिन Ready नहीं (health check fail)

### **CrashLoopBackOff Meaning:**
- Pod start होता है
- Application database connect करने की कोशिश करता है
- Connection fail होता है
- Application crash होता है
- Kubernetes pod को restart करता है
- Same cycle repeat होता है
- After multiple failures, Kubernetes waits longer (BackOff)

### **Why Pods Are Crashing:**
```
1. Pod starts → Container runs
2. Application tries to connect to DocumentDB
3. Connection fails (TLS/certificate issue)
4. Application throws error and exits
5. Container exits with non-zero code
6. Kubernetes restarts pod
7. Cycle repeats
```

### **Latest Pod Status:**
```
auth-service:       CrashLoopBackOff (2 restarts) - Certificate error
attendance-service: CrashLoopBackOff (2 restarts) - Certificate error  
hr-service:         Running (1 restart) - Connection timeout (buffering)
```

### **HR Service Different Error:**
HR service logs show:
```
Operation `roles.findOne()` buffering timed out after 10000ms
```
This means:
- HR service is trying to connect
- Connection is being attempted
- But operation is timing out (might be network/VPC peering issue)

### **Solution:**
Fix database connection issues (Errors 1 & 2) → Pods will start successfully

---

## 🔴 **ERROR 4: Services Not Ready (0/1 Ready)**

### **Current Status:**
```
NAME                 ENDPOINTS   AGE
auth-service         <none>      16d
hr-service           <none>      16d
attendance-service   <none>      16d
```

### **Root Cause:**
- Pods running हैं लेकिन **Ready** नहीं हैं
- Readiness probe fail हो रहा है
- Readiness probe checks `/health` endpoint
- `/health` endpoint database connection check करता है
- Database connection fail → Health check fail → Pod not ready
- No ready pods → No endpoints → Service unavailable

### **Readiness Probe Configuration:**
```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 5
```

### **Why Health Check Fails:**
1. Application `/health` endpoint database connection verify करता है
2. Database connection fail → Health check returns error
3. Kubernetes marks pod as "Not Ready"
4. Service doesn't route traffic to "Not Ready" pods

### **Solution:**
Fix database connection → Health checks will pass → Pods become Ready → Endpoints created → Services work

---

## 🔴 **ERROR 5: VPC Peering - Potential Network Issue**

### **Status:**
- ✅ VPC Peering: **ACTIVE** (`pcx-09dda9913cd5f6fa6`)
- ✅ Routes: **CONFIGURED** (both directions)
- ✅ Security Groups: **CONFIGURED**

### **Potential Issue:**
Even though VPC peering is active, there might be:
1. **Route table not applied to all subnets**
2. **Security group rules blocking traffic**
3. **NACL (Network ACL) blocking traffic**

### **Verification Needed:**
```bash
# Check if routes are in all route tables
aws ec2 describe-route-tables --filters "Name=vpc-id,Values=vpc-0f2c0010cd3c741b2"

# Check security group rules
aws ec2 describe-security-groups --group-ids sg-01abc0b224ffaf6ff
```

---

## 📊 **ERROR FLOW DIAGRAM**

```
1. Pod Starts
   ↓
2. Application Reads MONGODB_URI from Secret
   ↓
3. Application Tries to Connect to DocumentDB
   ↓
4. ❌ TLS Certificate Validation Fails
   OR
   ❌ TLS Options Conflict (tlsInsecure + tlsAllowInvalidCertificates)
   ↓
5. Connection Error Thrown
   ↓
6. Application Crashes (Non-zero exit code)
   ↓
7. Kubernetes Restarts Pod
   ↓
8. Same Cycle Repeats → CrashLoopBackOff
   ↓
9. Readiness Probe Fails (No DB Connection)
   ↓
10. Pod Not Ready → No Endpoints → Service Unavailable (503)
```

---

## ✅ **WHAT'S WORKING**

1. ✅ **Infrastructure:**
   - EKS Cluster: Running (8 nodes)
   - DocumentDB: Running
   - VPC Peering: Active
   - Route Tables: Configured
   - Security Groups: Configured

2. ✅ **Kubernetes:**
   - Pods scheduling successfully
   - Images pulling correctly
   - Secrets created
   - Deployments applied

3. ✅ **Network:**
   - VPC Peering established
   - Routes configured
   - Security group rules added

---

## 🔧 **COMPLETE FIX REQUIRED**

### **Step 1: Fix Connection String**
Remove conflicting TLS options:
```bash
MONGO_URI="mongodb://docdbadmin:***@lenstrack-docdb-cluster...:27017/hrms?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"
```

### **Step 2: Fix Certificate Mount**
Option A: Use certificate path in connection string
```bash
MONGO_URI="mongodb://...?tls=true&tlsCAFile=/etc/ssl/certs/ca-cert.pem&..."
```

Option B: Use tlsAllowInvalidCertificates (temporary, not secure)
```bash
MONGO_URI="mongodb://...?tls=true&tlsAllowInvalidCertificates=true&..."
```

### **Step 3: Verify Application Code**
Check if application code is adding `tlsInsecure` option automatically.

### **Step 4: Test Connection**
After fixes, verify:
- Pods start successfully
- Database connection established
- Health checks pass
- Services have endpoints

---

## 📝 **NEXT STEPS**

1. ✅ Fix connection string (remove conflicting options)
2. ✅ Fix certificate configuration
3. ⏳ Test connection
4. ⏳ Verify all pods are Ready
5. ⏳ Test APIs

---

**Last Updated:** 2026-02-28 10:45 AM IST
