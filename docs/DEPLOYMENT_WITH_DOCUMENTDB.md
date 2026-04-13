# Production Deployment with DocumentDB

## 🔐 Security First - No Credentials Exposed

**All DocumentDB credentials are stored securely in Kubernetes secrets.**
- ✅ No hardcoded passwords in code
- ✅ No credentials in config files
- ✅ No credentials in deployment YAMLs
- ✅ Secrets only accessible within namespace

---

## 📋 Pre-Deployment Checklist

1. ✅ DocumentDB cluster created and available
2. ✅ DocumentDB credentials saved in `documentdb-connection-info.txt`
3. ✅ Kubernetes cluster configured (`kubectl` working)
4. ✅ AWS credentials configured (`aws configure`)
5. ✅ ECR access configured
6. ✅ Namespace exists: `etelios-prod`

---

## 🚀 Deployment Steps

### Step 1: Create Kubernetes Secret

```bash
./scripts/create-docdb-secret.sh
```

**What it does:**
- Reads DocumentDB credentials from `documentdb-connection-info.txt`
- Creates Kubernetes secret `docdb-credentials` in namespace `etelios-prod`
- Stores: `MONGO_URI`, `MONGODB_URI`, `MONGO_DB_NAME`, `DB_NAME`

**Verify:**
```bash
kubectl get secret docdb-credentials -n etelios-prod
kubectl describe secret docdb-credentials -n etelios-prod
```

---

### Step 2: Deploy to Production

```bash
./scripts/deploy-to-prod-with-documentdb.sh
```

**What it does:**
1. Creates DocumentDB secret (if not exists)
2. Updates deployment files to use secret
3. Builds Docker images for all services
4. Pushes images to ECR
5. Deploys services to Kubernetes
6. Verifies deployments are running

**Services deployed:**
- `auth-service`
- `hr-service`
- `attendance-service`
- `tenant-registry-service`

---

## 🔍 Verify Deployment

### Check Pods

```bash
kubectl get pods -n etelios-prod
```

Expected output:
```
NAME                              READY   STATUS    RESTARTS   AGE
auth-service-xxxxx                1/1     Running   0          5m
hr-service-xxxxx                  1/1     Running   0          5m
attendance-service-xxxxx          1/1     Running   0          5m
```

### Check Logs

```bash
# Auth Service
kubectl logs -f deployment/auth-service -n etelios-prod

# HR Service
kubectl logs -f deployment/hr-service -n etelios-prod

# Attendance Service
kubectl logs -f deployment/attendance-service -n etelios-prod
```

**Look for:**
- ✅ "Database connection established"
- ✅ "Connected to DocumentDB"
- ✅ No connection errors

### Check Secret Usage

```bash
# Verify secret exists
kubectl get secret docdb-credentials -n etelios-prod

# Check if deployments reference the secret
kubectl get deployment auth-service -n etelios-prod -o yaml | grep docdb-credentials
kubectl get deployment hr-service -n etelios-prod -o yaml | grep docdb-credentials
kubectl get deployment attendance-service -n etelios-prod -o yaml | grep docdb-credentials
```

---

## 🔐 Security Verification

### ✅ Credentials NOT Exposed

**Check deployment files:**
```bash
# Should NOT contain passwords
grep -r "your-docdb-password" k8s/etelios-prod/
# Should return nothing

# Should NOT contain connection strings with passwords
grep -r "mongodb://docdbadmin:" k8s/etelios-prod/
# Should return nothing
```

**Check running pods:**
```bash
# Environment variables should reference secret, not contain values
kubectl exec -it deployment/auth-service -n etelios-prod -- env | grep MONGO
# Should show: MONGO_URI=<value from secret>
# But secret value is NOT visible in pod env (it's injected at runtime)
```

### ✅ Secret Access Control

```bash
# Secret is only in etelios-prod namespace
kubectl get secret docdb-credentials -n etelios-prod
# ✅ Should work

kubectl get secret docdb-credentials -n default
# ❌ Should fail (secret not in default namespace)
```

---

## 📝 Secret Structure

**Secret Name:** `docdb-credentials`  
**Namespace:** `etelios-prod`  
**Type:** `Opaque`

**Keys:**
- `MONGO_URI` - Full connection string
- `MONGODB_URI` - Alternative connection string
- `MONGO_DB_NAME` - Database name (hrms)
- `DB_NAME` - Database name alias
- `DOCDB_ENDPOINT` - DocumentDB endpoint (for reference)
- `DOCDB_PORT` - DocumentDB port (for reference)
- `DOCDB_USERNAME` - Username (for reference)
- `DOCDB_PASSWORD` - Password (encrypted in Kubernetes)

---

## 🔄 Update Secret (if needed)

If DocumentDB password changes:

```bash
# Delete old secret
kubectl delete secret docdb-credentials -n etelios-prod

# Update documentdb-connection-info.txt with new password

# Recreate secret
./scripts/create-docdb-secret.sh

# Restart deployments to pick up new secret
kubectl rollout restart deployment/auth-service -n etelios-prod
kubectl rollout restart deployment/hr-service -n etelios-prod
kubectl rollout restart deployment/attendance-service -n etelios-prod
```

---

## 🐛 Troubleshooting

### Issue: Pods not starting

**Check:**
```bash
kubectl describe pod <pod-name> -n etelios-prod
```

**Common causes:**
- Secret not found → Run `./scripts/create-docdb-secret.sh`
- Wrong namespace → Check namespace matches
- Image pull error → Check ECR access

### Issue: Database connection failed

**Check logs:**
```bash
kubectl logs deployment/auth-service -n etelios-prod | grep -i "database\|mongo\|connection"
```

**Common causes:**
- Secret keys don't match → Check deployment YAML uses correct key names
- DocumentDB not accessible → Check security groups
- Wrong connection string → Verify secret contents

### Issue: Secret not found

```bash
# Verify secret exists
kubectl get secret docdb-credentials -n etelios-prod

# If not found, create it
./scripts/create-docdb-secret.sh
```

---

## 📊 Deployment Summary

**After successful deployment:**

✅ All services running  
✅ DocumentDB connected  
✅ No credentials exposed  
✅ Secrets properly configured  
✅ Services accessible via Ingress  

**Test APIs:**
```bash
BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com \
./scripts/test-all-apis-with-documentdb.sh
```

---

**Last Updated:** 2026-02-27  
**Version:** 1.0.0  
**Maintained By:** DevOps Team
