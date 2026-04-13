# AWS Bill Analysis (April 2026) - Hinglish

## 1) Snapshot (jo screenshot me dikh raha hai)

- Account: `AWS India`
- Total outstanding balance: **INR 1,18,755.64** (Past due)
- Available funds: **INR 0.00**
- Invoice date: **April 1, 2026**
- Invoice ID: `2579714253`
- Currency: `INR`
- Invoice amount / Balance due: **INR 1,18,755.64**

## 2) Important note (exact breakup kyun missing hai)

Exact service-wise bill (`EC2 kitna`, `EKS kitna`, `NAT kitna`) nikalne ke liye `Cost Explorer` API permission (`ce:GetCostAndUsage`) chahiye.  
Current IAM user pe yeh permission denied hai, isliye niche ka breakdown **infrastructure-based estimated analysis** hai (high-confidence direction, not exact AWS invoice lines).

## 3) Current infra footprint (live infra se)

- EKS worker nodes: **8 x t3.medium** (On-Demand)
- Load balancers: **3** (2 ALB + 1 NLB)
- NAT Gateway: **1 active**
- DocumentDB: **1 x db.r6g.large** (single instance)
- ECR repos: **47**

## 4) Estimated cost distribution (INR 1,18,755.64 par)

Ye split estimated hai, but practical reality ke close hota hai given current architecture:

| Cost Head | Estimated Share | Estimated INR | Kyu kharch ho raha hai |
|---|---:|---:|---|
| EKS Worker EC2 (8 x t3.medium) | 35-45% | 6,564 - 8,440 | 24x7 compute baseline, always-on capacity |
| DocumentDB (`db.r6g.large`) | 20-30% | 3,751 - 5,627 | managed DB instance + storage I/O |
| Load Balancers (2 ALB + 1 NLB) | 8-15% | 1,500 - 2,813 | hourly LB cost + LCU/data processing |
| NAT Gateway | 8-15% | 1,500 - 2,813 | hourly + per-GB data processing |
| EKS Control Plane | 5-8% | 938 - 1,500 | fixed control plane charge |
| ECR + CloudWatch + misc | 5-10% | 938 - 1,876 | image storage, logs retention, request/ingestion |

## 5) Root causes (high probability)

1. **Over-provisioned EKS node baseline**  
   8 on-demand nodes continuously running, even off-peak.

2. **NAT + ALB tax**  
   Managed networking components me fixed + usage based dono charges lagte hain.

3. **DocumentDB right-sizing review pending**  
   Single `r6g.large` agar under-utilized hai to unnecessary monthly burn.

4. **Image/log sprawl**  
   ECR repos zyada hain; lifecycle policy strict nahi hua to storage quietly grow karta hai.

## 6) Cost optimization plan (actionable, immediate)

## Phase A: Immediate (same day / 24 hrs)

- EKS desired nodes `8 -> 6` trial karo (business hours monitoring ke saath).
- Non-critical workloads ke replicas off-peak me reduce karo.
- ECR lifecycle policy: per repo last `20` images retain, rest expire.
- CloudWatch log retention set: default `Never Expire` se `14` ya `30 days`.
- ALB/NLB sanity check: koi duplicate/unused LB ho to delete.

**Expected quick saving:** ~10% to 18% monthly.

## Phase B: 3-7 days

- Cluster Autoscaler + HPA tuning (night autoscale-down aggressively).
- Workload bin-packing improve (requests/limits sahi set karo).
- NAT traffic audit: external egress heavy services identify karo.
- DocumentDB metrics review:
  - CPU low, connections low, memory headroom high ho to downsize evaluate.

**Expected additional saving:** ~12% to 22% monthly.

## Phase C: 2-4 weeks

- Mixed capacity model:
  - Critical services: On-Demand
  - Batch/non-critical: Spot
- Compute Savings Plan (1-year no-upfront or partial) for stable baseline.
- Per-service cost allocation tags enforce:
  - `env`, `service`, `owner`, `team`, `cost-center`

**Expected additional saving:** ~15% to 30% monthly.

## 7) Potential total savings range

If Phase A + B + C correctly execute kiye gaye:

- Conservative: **20-25%**
- Realistic: **30-40%**
- Aggressive (with Spot + Savings Plan discipline): **40%+**

INR 1,18,755.64 base par:

- 25% save: ~**INR 29,689**
- 35% save: ~**INR 41,564**
- 40% save: ~**INR 47,502**

## 8) Priority order (kya pehle karna hai)

1. EKS node baseline reduce (8 to 6)
2. Log retention + ECR lifecycle
3. LB/NAT usage audit
4. DocumentDB right-size decision
5. Savings Plan/Spot rollout

## 9) For exact invoice-level split (next step)

IAM policy me ye permissions add karni hongi:

- `ce:GetCostAndUsage`
- `ce:GetCostForecast`
- `ce:GetDimensionValues`
- `ce:GetRightsizingRecommendation`
- `ce:GetSavingsPlansUtilization`

Permission milte hi exact report generate hoga:

- service-wise exact INR
- usage-type-wise exact INR (e.g., NAT Data Processing, ALB LCU, EC2 hours)
- daily spike timeline
- top 10 highest cost drivers with exact impact

---

Prepared from:
- AWS billing screenshot (invoice `2579714253`)
- Live infrastructure inventory of current prod account/resources
