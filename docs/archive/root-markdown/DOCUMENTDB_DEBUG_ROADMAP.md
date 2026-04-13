# DocumentDB Debug Roadmap - Step by Step

## 🎯 Goal
Get pods to successfully connect to DocumentDB and services running.

## 📋 Debugging Steps (2-4 hours)

---

### STEP 1: Verify DocumentDB Cluster (5 minutes)

**Check if cluster is truly available:**

```bash
# Script 1
./step1-verify-documentdb.sh
```

**Manual commands:**
```bash
# Check cluster status
aws docdb describe-db-clusters \
  --db-cluster-identifier etelios-docdb-cluster \
  --region ap-south-1 \
  --query 'DBClusters[0].[Status,Endpoint,Port]' \
  --output table

# Expected: Status = "available"
```

**Fixes if needed:**
- Wait for cluster to be available
- Check CloudFormation stack
- Verify instances are running

---

### STEP 2: Fix Subnet Configuration (15 minutes)

**DocumentDB must be in same VPC as EKS:**

```bash
# Script 2
./step2-fix-subnets.sh
```

**Check:**
- DocumentDB subnet group has correct subnets
- Subnets are private (have route to NAT Gateway)
- EKS nodes in same VPC

**Fixes:**
- Add DocumentDB to correct subnet group
- Update route tables
- Verify NAT Gateway connectivity

---

### STEP 3: Fix All Security Groups (20 minutes)

**Allow ALL node security groups:**

```bash
# Script 3
./step3-fix-all-security-groups.sh
```

**What it does:**
1. Find ALL security groups from running nodes
2. Find cluster security group
3. Add rules to DocumentDB SG for:
   - Each node SG
   - Cluster SG
   - VPC CIDR (10.0.0.0/16) as fallback

**Manual verification:**
```bash
# Check DocumentDB security group rules
aws ec2 describe-security-groups \
  --group-ids <DOCDB_SG> \
  --region ap-south-1 \
  --query 'SecurityGroups[0].IpPermissions'
```

---

### STEP 4: Fix DNS Resolution (10 minutes)

**Ensure pods can resolve DocumentDB hostname:**

```bash
# Script 4
./step4-test-dns-resolution.sh
```

**Tests:**
- DNS resolution from pod
- Ping DocumentDB endpoint
- Port 27017 connectivity

**Fixes:**
- CoreDNS configuration
- VPC DNS settings
- Route53 private hosted zone (if needed)

---

### STEP 5: Fix Connection String Format (10 minutes)

**Proper DocumentDB connection string:**

```bash
# Script 5
./step5-fix-connection-string.sh
```

**Proper format:**
```
mongodb://username:password@endpoint:27017/database?tls=true&tlsAllowInvalidCertificates=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
```

**Common issues:**
- Missing `tls=true`
- Missing `replicaSet=rs0`
- Wrong database name
- Password special characters not encoded

---

### STEP 6: Add TLS Certificate (15 minutes)

**DocumentDB requires TLS certificate:**

```bash
# Script 6
./step6-add-tls-certificate.sh
```

**What it does:**
1. Download AWS RDS certificate bundle
2. Create Kubernetes secret with certificate
3. Mount certificate in pods
4. Update connection string to use certificate

---

### STEP 7: Test from Debug Pod (10 minutes)

**Create debug pod and test manually:**

```bash
# Script 7
./step7-debug-pod-test.sh
```

**Manual test:**
```bash
# Create debug pod
kubectl run -it debug-mongo --image=mongo:5.0 -n etelios-prod -- bash

# Inside pod, test connection
mongo "mongodb://etelios_admin:PASSWORD@ENDPOINT:27017/?tls=true&tlsAllowInvalidCertificates=true"
```

---

### STEP 8: Fix ConfigMap Injection (15 minutes)

**Ensure deployments properly use ConfigMap:**

```bash
# Script 8
./step8-inject-configmap.sh
```

**Verify:**
```bash
# Check if pod has MONGODB_URI
kubectl exec -n etelios-prod <pod-name> -- env | grep MONGODB_URI
```

---

### STEP 9: Check Pod Logs in Detail (10 minutes)

**Analyze exact error messages:**

```bash
# Script 9
./step9-analyze-logs.sh
```

**Common errors:**
- "ETIMEDOUT" → Network/security group
- "ECONNREFUSED" → Wrong endpoint/port
- "Authentication failed" → Wrong credentials
- "SSL/TLS error" → Certificate issue

---

### STEP 10: Final Restart and Verification (10 minutes)

**After all fixes, clean restart:**

```bash
# Script 10
./step10-final-restart.sh
```

**Verification:**
```bash
# All pods should be Running with 1/1 ready
kubectl get pods -n etelios-prod

# Test service
curl http://LOADBALANCER_URL/health
```

---

## 🔧 Master Script

Run all steps automatically:

```bash
./debug-documentdb-complete.sh
```

This will execute all 10 steps sequentially.

---

## 📊 Expected Timeline

- Step 1-3: 40 minutes (networking)
- Step 4-6: 35 minutes (DNS & TLS)
- Step 7-10: 45 minutes (testing & verification)
- **Total: ~2 hours** (if no major issues)

---

## ✅ Success Criteria

After all steps:
- ✅ 18+ pods in Ready state (1/1)
- ✅ No CrashLoopBackOff
- ✅ curl health endpoint returns 200 OK
- ✅ Services accessible via LoadBalancer

---

## 🚨 If Still Not Working After All Steps

Then we know DocumentDB has fundamental issue:
- Recreate cluster in correct subnets
- OR use Option 2/3 (MongoDB/Azure)

---

Ready to start? I'll create all 10 scripts now.
