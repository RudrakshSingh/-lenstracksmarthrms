# AWS Cost Breakdown - Etelios Migration

## 💰 Current Monthly Cost: ~$550/month

### Detailed Cost Analysis

---

## 1. EKS Cluster (Kubernetes Control Plane)

**Service:** Amazon EKS  
**Cost:** **$73.00/month** ($0.10/hour)

- Control plane management
- API server, etcd, scheduler
- 24/7 running time
- **Hourly:** $0.10
- **Daily:** $2.40
- **Monthly:** $73.00

**Time running:** ~8 hours  
**Cost so far:** ~$0.80

---

## 2. EC2 Instances (Worker Nodes)

**Service:** Amazon EC2 (t3.medium)  
**Instances:** 10 nodes  
**Cost per node:** $0.0416/hour  
**Total cost:** **$299.52/month**

**Breakdown:**
- Instance type: t3.medium (2 vCPU, 4GB RAM)
- Per node: $0.0416/hour
- 10 nodes × $0.0416 = $0.416/hour
- **Hourly:** $0.416
- **Daily:** $9.984  
- **Monthly:** $299.52

**Time running:** ~3 hours (since nodegroup created)  
**Cost so far:** ~$1.25

---

## 3. EBS Volumes (Node Storage)

**Service:** Amazon EBS (gp3)  
**Storage:** 10 nodes × 20GB = 200GB  
**Cost:** **$16.00/month**

- gp3: $0.08/GB/month
- 200GB × $0.08 = $16.00/month

**Time running:** ~3 hours  
**Cost so far:** ~$0.06

---

## 4. DocumentDB Cluster

**Service:** Amazon DocumentDB  
**Instances:** 1 × db.t3.medium  
**Cost:** **$69.35/month**

- db.t3.medium: $0.096/hour
- **Hourly:** $0.096
- **Daily:** $2.304
- **Monthly:** $69.35

**Time running:** ~5 hours  
**Cost so far:** ~$0.48

---

## 5. DocumentDB Storage

**Service:** DocumentDB Storage  
**Storage:** 10GB allocated  
**Cost:** **$1.00/month**

- $0.10/GB/month
- 10GB × $0.10 = $1.00/month

**Cost so far:** ~$0.01

---

## 6. Network Load Balancers

**Service:** AWS NLB  
**Count:** 2 (Auth + HR)  
**Cost:** **$32.88/month**

- NLB: $0.0225/hour per LB
- 2 LBs × $0.0225 = $0.045/hour
- **Hourly:** $0.045
- **Daily:** $1.08
- **Monthly:** $32.88

**Plus data processing:**
- $0.006/GB processed
- Estimated: $5-10/month

**Time running:** ~1 hour  
**Cost so far:** ~$0.05

---

## 7. ECR (Container Registry)

**Service:** Amazon ECR  
**Storage:** ~10GB (20 images × 500MB avg)  
**Cost:** **$1.00/month**

- Storage: $0.10/GB/month
- 10GB × $0.10 = $1.00/month

**Data transfer:** Free (within region)

**Cost so far:** ~$0.01

---

## 8. S3 Buckets

**Service:** Amazon S3  
**Buckets:** 3 (storage, backups, logs)  
**Storage:** ~5GB  
**Cost:** **$0.115/month**

- Standard storage: $0.023/GB
- 5GB × $0.023 = $0.115/month

**Cost so far:** ~$0.01

---

## 9. VPC & Networking

**Service:** Amazon VPC  
**Components:** VPC, Subnets, Route Tables, Security Groups  
**Cost:** **FREE**

**NAT Gateways:**
- 2 NAT Gateways
- $0.045/hour each
- 2 × $0.045 = $0.09/hour
- **Monthly:** $64.80

**Time running:** ~8 hours  
**Cost so far:** ~$0.72

---

## 10. Elastic IPs

**Service:** Amazon EC2 (EIPs for NAT)  
**Count:** 2  
**Cost:** **FREE** (when attached to NAT Gateways)

---

## 11. Data Transfer

**Service:** AWS Data Transfer  
**Estimated:** **$10-20/month**

- Data IN: Free
- Data OUT to internet: $0.09/GB
- Inter-AZ transfer: $0.01/GB

**So far:** Minimal (mostly setup traffic)

---

## 📊 Total Cost Summary

### Monthly Recurring Costs

| Service | Monthly Cost |
|---------|--------------|
| EKS Cluster | $73.00 |
| EC2 Nodes (10) | $299.52 |
| EBS Volumes | $16.00 |
| DocumentDB | $69.35 |
| DocumentDB Storage | $1.00 |
| NAT Gateways (2) | $64.80 |
| Network Load Balancers (2) | $32.88 |
| NLB Data Processing | $5-10 |
| ECR Storage | $1.00 |
| S3 Storage | $0.115 |
| Data Transfer | $10-20 |
| **TOTAL** | **~$570-590/month** |

### Cost So Far (8 hours)

| Service | Hours Running | Cost Incurred |
|---------|---------------|---------------|
| EKS Cluster | 8 hours | $0.80 |
| EC2 Nodes | 3 hours | $1.25 |
| EBS Volumes | 3 hours | $0.06 |
| DocumentDB | 5 hours | $0.48 |
| NAT Gateways | 8 hours | $0.72 |
| Load Balancers | 1 hour | $0.05 |
| Other | - | $0.10 |
| **TOTAL SO FAR** | - | **~$3.50** |

---

## 💡 Cost Saving Options

### If Services Not Working

**Option 1: Stop Nodes (Save $300/month)**
```bash
# Scale nodes to 0 (keeps cluster, stops EC2 charges)
eksctl scale nodegroup \
  --cluster=etelios-prod \
  --name=standard-workers-v2 \
  --nodes=0 \
  --region=ap-south-1
```
**Saves:** $299/month  
**Keeps:** Cluster, DocumentDB, images

**Option 2: Delete Entire Cluster (Save $470/month)**
```bash
# Delete everything except ECR/S3
eksctl delete cluster --name etelios-prod --region=ap-south-1 --wait
```
**Saves:** $470/month  
**Keeps:** ECR images, S3 buckets (reusable)

**Option 3: Delete DocumentDB (Save $70/month)**
```bash
# If not using DocumentDB
aws docdb delete-db-cluster \
  --db-cluster-identifier etelios-docdb-cluster \
  --skip-final-snapshot \
  --region ap-south-1
```
**Saves:** $70/month

---

## 🔍 Comparison with Azure

### Azure Costs (Estimated)

| Service | Azure | AWS |
|---------|-------|-----|
| Kubernetes | AKS: Free control plane | EKS: $73/month |
| Compute | 10 × Standard_B2s: ~$300 | 10 × t3.medium: ~$300 |
| Database | Cosmos DB: ~$100-200 | DocumentDB: ~$70 |
| Load Balancer | Azure LB: ~$25 | NLB: ~$35 |
| Storage | Blob: ~$20 | S3: ~$5 |
| NAT Gateway | Azure NAT: ~$45 | AWS NAT: ~$65 |
| **Total** | **~$490-590/month** | **~$570-590/month** |

**Verdict:** Costs are similar, AWS slightly higher due to EKS control plane charge.

---

## 💳 Current AWS Bill Status

### Why Dashboard Shows $0.00

- Billing updates **once per day** (usually midnight UTC)
- Current charges: ~$3.50 (will show tomorrow)
- First bill will include all charges from start date

### Where to Check

**Real-time usage:**
- AWS Console → Cost Management → Cost Explorer
- Shows usage graphs (even if $ not updated)

**Detailed billing:**
- AWS Console → Billing Dashboard
- Click "Bills" → Current month
- Shows service-by-service breakdown (updates daily)

---

## ⚠️ Cost Alert

**Current setup is costing $570-590/month but NOT working!**

**Recommendation:**
1. **If fixing:** Continue (but clock is ticking at $0.77/hour)
2. **If not working:** Stop/delete to avoid unnecessary charges
3. **Fresh cluster:** Delete and recreate properly

**Break-even point:** If debugging takes >3 hours more, fresh cluster is more cost-effective.

---

## 🎯 Summary

**Spent so far:** ~$3.50 (8 hours)  
**Monthly cost if left running:** ~$580  
**Daily cost:** ~$19  
**Hourly cost:** ~$0.77

**Services working:** 1/20 (5%)  
**Cost efficiency:** Very low (paying for infrastructure that doesn't work)

**Action needed:** Decide to fix, delete, or recreate within next few hours to avoid wasting costs.

---

**Your AWS account is being charged right now. Decision needed soon!**
