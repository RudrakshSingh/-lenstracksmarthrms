# AWS Cleanup Checklist - Stop All Charges

## ⚠️ Current: $19/day waste for non-working cluster

## ✅ Cleanup Steps (AWS Console)

### 1. CloudFormation Stacks (PRIORITY)

**URL:** https://console.aws.amazon.com/cloudformation/home?region=ap-south-1

**Steps:**
- [ ] Find: `eksctl-etelios-prod-nodegroup-standard-workers-v2`
  - Stack actions → Edit termination protection
  - Uncheck → Save
  - Delete stack

- [ ] Find: `eksctl-etelios-prod-nodegroup-standard-workers`
  - Same process
  - Delete stack

- [ ] Find: `eksctl-etelios-prod-cluster`
  - Delete (if exists)

**Saves:** Stops node deletion errors

---

### 2. EKS Cluster (HIGH PRIORITY)

**URL:** https://console.aws.amazon.com/eks/home?region=ap-south-1

**Steps:**
- [ ] Click cluster: `etelios-prod`
- [ ] Delete cluster button
- [ ] Type: `etelios-prod` to confirm
- [ ] Delete

**Saves:** $73/month (cluster) + $300/month (nodes)

---

### 3. DocumentDB Cluster (HIGH PRIORITY)

**URL:** https://console.aws.amazon.com/docdb/home?region=ap-south-1

**Steps:**
- [ ] Select: `etelios-docdb-cluster`
- [ ] Actions → Delete
- [ ] **IMPORTANT:** Select "Skip final snapshot"
- [ ] Type: `delete` to confirm
- [ ] Delete

**Saves:** $70/month

---

### 4. Load Balancers (MEDIUM PRIORITY)

**URL:** https://console.aws.amazon.com/ec2/v2/home?region=ap-south-1#LoadBalancers:

**Steps:**
- [ ] Select both NLBs (a0adb... and a9256...)
- [ ] Actions → Delete
- [ ] Confirm

**Saves:** $35/month

---

### 5. NAT Gateways (HIGH PRIORITY - EXPENSIVE!)

**URL:** https://console.aws.amazon.com/vpc/home?region=ap-south-1#NatGateways:

**Steps:**
- [ ] Select NAT Gateway 1 (etelios-nat-1)
- [ ] Actions → Delete NAT Gateway
- [ ] Confirm
- [ ] Select NAT Gateway 2 (etelios-nat-2)
- [ ] Delete
- [ ] Go to Elastic IPs
- [ ] Release both EIPs

**Saves:** $65/month

---

### 6. EC2 Instances (Should auto-delete with EKS)

**URL:** https://console.aws.amazon.com/ec2/v2/home?region=ap-south-1#Instances:

**Check:**
- [ ] Verify all 10 nodes are terminated
- [ ] If any still running, terminate manually

---

### 7. VPC (Optional - No charge but cleanup)

**URL:** https://console.aws.amazon.com/vpc/home?region=ap-south-1

**Steps (in order):**
- [ ] Delete route table associations
- [ ] Delete custom route tables
- [ ] Delete Internet Gateway
- [ ] Delete subnets
- [ ] Delete VPC

**OR:** Keep VPC for next attempt (no charge)

---

### 8. Keep These (Reusable, minimal cost)

**ECR Repositories:** $1/month
- Don't delete
- Images ready for next deployment

**S3 Buckets:** $0.12/month
- etelios-prod-storage-ap-south-1
- etelios-prod-backups-ap-south-1
- etelios-prod-logs-ap-south-1

---

## 💰 Immediate Cost Savings

After completing Steps 1-5:
- **Before:** $580/month
- **After:** $1.12/month (just ECR + S3)
- **Savings:** $579/month ($19/day)

---

## ⏱️ Time Required

- CloudFormation: 5 minutes
- EKS: 10-15 minutes (auto-deletes most things)
- DocumentDB: 5-10 minutes
- NAT Gateways: 2 minutes
- **Total: 25-35 minutes**

---

## ✅ Verification

After deletion, verify charges stopped:
1. Go to AWS Cost Explorer
2. Check daily costs
3. Should see drop to ~$0/day

---

## 📋 What to Keep

**For next migration attempt:**
- ✅ ECR Images (all 20 services, AMD64)
- ✅ All scripts and documentation
- ✅ Knowledge and experience
- ✅ Kubernetes manifests
- ✅ S3 buckets (can use for new cluster)

**Total cost to keep:** $1.12/month

---

## 🎯 Next Steps

After cleanup:
1. Take a break
2. Review what went wrong (cluster networking)
3. Plan better approach
4. Try again with:
   - Simpler cluster (3-5 nodes)
   - Skip DocumentDB initially
   - Verify CoreDNS works immediately
   - Deploy Auth + HR only first

**Fresh attempt with experience: 1-2 hours to working system**

---

**Start cleanup now to stop charges!**
