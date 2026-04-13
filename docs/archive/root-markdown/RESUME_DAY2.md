# Resume Day 2 Script

## 🔍 Check Current Status

### Step 1: Check What Was Completed

```bash
# Check if DocumentDB cluster exists
aws docdb describe-db-clusters --db-cluster-identifier etelios-docdb-cluster --region ap-south-1

# Check ECR repositories
aws ecr describe-repositories --region ap-south-1 --query 'repositories[*].repositoryName' --output table

# Check Kubernetes namespace
kubectl get namespace etelios-prod
```

---

## 🔄 Resume Options

### Option 1: Re-run Script (Recommended - Idempotent)

Script is idempotent, so re-running is safe:

```bash
./day2-aws-setup.sh
```

**What will happen:**
- ✅ Skip already created ECR repositories
- ✅ Skip already built/pushed images (if they exist)
- ✅ Check if DocumentDB exists, create if not
- ✅ Continue with remaining steps

---

### Option 2: Check What's Missing and Continue Manually

#### Check DocumentDB Status:
```bash
aws docdb describe-db-clusters --db-cluster-identifier etelios-docdb-cluster --region ap-south-1
```

**If cluster exists:**
- ✅ DocumentDB is ready
- Continue with remaining steps

**If cluster doesn't exist:**
- Script will create it when re-run
- Or create manually (see below)

---

### Option 3: Manual DocumentDB Creation (If Needed)

Only if script didn't create it:

```bash
# Load Day 1 resources
source aws-resources-20260210-123213.txt

# Create subnet group (if not exists)
aws docdb create-db-subnet-group \
    --db-subnet-group-name etelios-docdb-subnet-group \
    --db-subnet-group-description "Etelios DocumentDB subnet group" \
    --subnet-ids $PRIVATE_SUBNET_1 $PRIVATE_SUBNET_2 \
    --region ap-south-1

# Create cluster
aws docdb create-db-cluster \
    --db-cluster-identifier etelios-docdb-cluster \
    --engine docdb \
    --engine-version 5.0.0 \
    --master-username etelios_admin \
    --master-user-password $(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32) \
    --db-subnet-group-name etelios-docdb-subnet-group \
    --vpc-security-group-ids $DOCDB_SG \
    --storage-encrypted \
    --backup-retention-period 7 \
    --region ap-south-1
```

---

## ✅ Quick Status Check Script

Run this to see what's completed:

```bash
echo "=== ECR Repositories ==="
aws ecr describe-repositories --region ap-south-1 --query 'repositories[?contains(repositoryName, `etelios`)].repositoryName' --output table

echo ""
echo "=== DocumentDB Cluster ==="
aws docdb describe-db-clusters --db-cluster-identifier etelios-docdb-cluster --region ap-south-1 2>&1 | grep -q "DBClusterIdentifier" && echo "✅ DocumentDB cluster exists" || echo "❌ DocumentDB cluster not found"

echo ""
echo "=== Kubernetes Namespace ==="
kubectl get namespace etelios-prod 2>&1 | grep -q "etelios-prod" && echo "✅ Namespace exists" || echo "❌ Namespace not found"
```

---

## 🚀 Recommended Action

**Simply re-run the script:**

```bash
./day2-aws-setup.sh
```

The script will:
1. Check what's already done
2. Skip completed steps
3. Continue from where it stopped
4. Complete remaining tasks

**Estimated remaining time:**
- DocumentDB: 10-15 minutes (if not created)
- Kubernetes setup: 5 minutes
- ALB Controller: 5 minutes
- CI/CD setup: 5 minutes

**Total: ~20-30 minutes**

---

## 📝 Note

If terminal terminated during DocumentDB creation:
- DocumentDB creation might still be in progress
- Check AWS Console: DocumentDB → Clusters
- If cluster is "creating", wait for it to complete
- Then re-run script to continue
