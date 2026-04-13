# Delete EKS Cluster via AWS Console

## ❌ Problem

eksctl delete failed due to permission issue:
```
User is not authorized to perform: cloudformation:UpdateTerminationProtection
```

## ✅ Solution: Delete via AWS Console

### Step 1: Disable Termination Protection

1. Go to AWS Console → **CloudFormation**
2. Region: **Asia Pacific (Mumbai) ap-south-1**
3. Find stack: `eksctl-etelios-prod-nodegroup-standard-workers-v2`
4. Click on stack
5. Click "Stack actions" → "Edit termination protection"
6. **Uncheck** "Enable termination protection"
7. Save

Repeat for stack: `eksctl-etelios-prod-nodegroup-standard-workers` (if exists)

### Step 2: Delete EKS Cluster

1. Go to AWS Console → **EKS**
2. Region: **Asia Pacific (Mumbai) ap-south-1**
3. Click on cluster: `etelios-prod`
4. Click "Delete cluster"
5. Type cluster name to confirm
6. Delete

**This will automatically delete:**
- Node groups
- Nodes (EC2 instances)
- Load Balancers
- Network interfaces
- Security groups (most)

### Step 3: Delete DocumentDB Cluster

1. Go to AWS Console → **DocumentDB**
2. Region: **Asia Pacific (Mumbai) ap-south-1**
3. Select cluster: `etelios-docdb-cluster`
4. Actions → Delete
5. Select: **Skip final snapshot** (to save money)
6. Type "delete" to confirm
7. Delete

### Step 4: Delete VPC (Optional)

1. Go to AWS Console → **VPC**
2. Delete in this order:
   - NAT Gateways (2) - **$65/month savings**
   - Release Elastic IPs (2)
   - Delete subnets
   - Delete route tables (custom ones)
   - Delete Internet Gateway
   - Delete VPC

**OR keep VPC for future use (no charge)**

### Step 5: Keep ECR & S3 (Reusable)

**Keep these** (minimal cost):
- ECR repositories ($1/month) - images are ready for next time
- S3 buckets ($0.12/month) - can use for backups

---

## ⏱️ Time to Delete

- CloudFormation: 2 minutes
- EKS Cluster: 10-15 minutes
- DocumentDB: 5-10 minutes
- VPC (optional): 5 minutes
- **Total: 20-30 minutes**

---

## 💰 Cost Savings

**Immediate stop:**
- EC2 Nodes: $300/month → $0
- EKS Cluster: $73/month → $0
- DocumentDB: $70/month → $0
- NAT Gateways: $65/month → $0
- Load Balancers: $35/month → $0

**Total savings: $543/month** → $0 (keeping only ECR $1/month)

---

## 🔄 For Next Time

When you're ready to try again:

1. **Use a simpler approach:**
   - Fewer nodes (3-5 instead of 10)
   - Skip DocumentDB, use in-cluster MongoDB
   - Focus on Auth + HR only

2. **Better cluster creation:**
   - Let eksctl handle everything
   - Don't manually create nodegroups
   - Verify CoreDNS works immediately

3. **We have ready:**
   - All Docker images in ECR ✅
   - All Kubernetes manifests ✅
   - ConfigMaps and setup scripts ✅
   - Complete documentation ✅

**Fresh start will be much faster** (1-2 hours) with this experience!

---

## 📞 Immediate Action

**Go to AWS Console and delete:**
1. CloudFormation stacks (disable termination protection first)
2. EKS cluster
3. DocumentDB cluster

**This stops all charges immediately.**

---

**URL: https://console.aws.amazon.com/console/home?region=ap-south-1**

Start with CloudFormation → Find the nodegroup stacks → Disable protection → Delete
