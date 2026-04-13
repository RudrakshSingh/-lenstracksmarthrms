# Delete EKS Cluster - Step by Step (Console)

## Error: "Cluster has nodegroups attached"

You need to delete nodegroups FIRST, then cluster.

---

## STEP 1: Delete Node Groups (10 minutes)

### Via Console:

1. **Stay on EKS cluster page** (etelios-prod)
2. Click **"Compute"** tab (top menu)
3. You'll see nodegroups section
4. Select nodegroup: `standard-workers-v2`
5. Click **"Delete"** button
6. Type nodegroup name to confirm
7. Delete

**Repeat for:** `standard-workers` (if it exists)

**Wait:** 5-10 minutes for nodegroups to delete

---

## STEP 2: Delete EKS Cluster (15 minutes)

1. Go back to **EKS → Clusters**
2. Select cluster: `etelios-prod`
3. Click **"Delete cluster"** button
4. Type: `etelios-prod` to confirm
5. Delete

**This auto-deletes:**
- Load Balancers
- Network interfaces
- Most resources

---

## STEP 3: Delete DocumentDB (10 minutes)

1. Go to **DocumentDB** service
2. Region: **ap-south-1** (Mumbai)
3. Select cluster: `etelios-docdb-cluster`
4. Actions → **Delete**
5. **IMPORTANT:** Check "Skip final snapshot"
6. Type: `delete` to confirm
7. Delete

---

## STEP 4: Delete NAT Gateways (CRITICAL - Expensive!)

### NAT Gateways ($65/month)

1. Go to **VPC** → **NAT Gateways**
2. Select first NAT Gateway (etelios-nat-1)
3. Actions → **Delete NAT gateway**
4. Confirm
5. Select second NAT Gateway (etelios-nat-2)
6. Delete

### Release Elastic IPs

1. Go to **VPC** → **Elastic IPs**
2. Select EIP (allocated for NAT)
3. Actions → **Release Elastic IP address**
4. Confirm
5. Repeat for second EIP

---

## STEP 5: Verify Deletion

### Check these are deleted:

**EC2 Instances:**
- Go to EC2 → Instances
- All 10 nodes should be "terminated"

**Load Balancers:**
- Go to EC2 → Load Balancers
- Both NLBs should be deleted

**EBS Volumes:**
- Go to EC2 → Volumes
- Node volumes should be "deleting" or gone

---

## ⏱️ Total Time: 30-40 minutes

---

## 💰 Cost After Deletion

**Monthly costs:**
- EKS: $73 → $0 ✅
- EC2 Nodes: $300 → $0 ✅
- DocumentDB: $70 → $0 ✅
- NAT Gateways: $65 → $0 ✅
- Load Balancers: $35 → $0 ✅

**Remaining (keep for reuse):**
- ECR: $1/month (Docker images)
- S3: $0.12/month

**New total: $1.12/month** (vs $580/month)

---

## ⚠️ If Nodegroup Delete Fails

### Error: "Stack has termination protection"

**Fix via CloudFormation:**

1. Go to **CloudFormation** service
2. Find stack: `eksctl-etelios-prod-nodegroup-standard-workers-v2`
3. Click stack
4. **Stack actions** → **Edit termination protection**
5. **Uncheck** the box
6. Save
7. Go back and **Delete** stack
8. Confirm

**Repeat for:** `eksctl-etelios-prod-nodegroup-standard-workers`

**Then retry** EKS cluster deletion

---

## ✅ Success Verification

After 30-40 minutes:
- EKS cluster: Gone
- EC2 instances: Terminated
- DocumentDB: Deleted
- NAT Gateways: Deleted
- Daily cost: $0

**Check:** AWS Billing Dashboard → Should show decreased usage

---

## 🎯 Current Order

1. **Delete nodegroups** (Compute tab)
2. **Delete EKS cluster**
3. **Delete DocumentDB**
4. **Delete NAT Gateways** (expensive!)

Start with Compute tab → Delete nodegroups!
