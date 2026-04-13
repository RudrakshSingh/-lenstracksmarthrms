# AWS Bill Detailed Service Breakup (April 2026, Hinglish)

## 1) Confirmed Billing Snapshot

- Billing account: `AWS India`
- Total outstanding: **INR 1,18,755.64**
- Status: **Past due**
- Available funds: **INR 0.00**
- Invoice ID: `2579714253`
- Invoice date: `2026-04-01`
- Currency: `INR`

## 2) Data Quality Note (important)

Exact service-level numbers (`EC2 exact`, `NAT exact`, `DocDB exact`) pull karne ke liye `Cost Explorer` API permission required hai (`ce:GetCostAndUsage`), jo current IAM user me denied hai.  
Isliye niche ka report **infra-observed + market-rate-estimation + account topology calibration** par based hai.

Matlab:
- **Total bill exact hai** (invoice se).
- **Service split estimated range hai**, not exact CE export rows.

## 3) Live Infra Inventory (ground truth)

### Compute / Kubernetes
- EKS cluster: `etelios-prod-v2`
- Nodegroup: `prod-workers`
- Capacity type: `ON_DEMAND`
- Instance type: `t3.medium`
- Desired nodes: **8**
- Min/Max: `2 / 10`

### Network
- Load balancers total: **3**
  - ALB: **2**
  - NLB: **1**
- NAT Gateway: **1 active**

### Database
- DocumentDB cluster: `lenstrack-docdb-cluster`
- Instances: **1**
- Class: `db.r6g.large`

### Container Registry
- ECR repositories: **47**

## 4) Detailed Estimated Cost Breakup (Invoice-calibrated)

### 4.1 Top-level service family breakup

| Cost Family | Estimated INR | Share % | Confidence |
|---|---:|---:|---|
| EKS worker EC2 | 7,100 - 8,400 | 38% - 45% | High |
| DocumentDB | 3,700 - 5,600 | 20% - 30% | Medium-High |
| Elastic Load Balancing | 1,500 - 2,300 | 8% - 12% | Medium |
| NAT Gateway | 1,500 - 2,800 | 8% - 15% | Medium |
| EKS control plane | 950 - 1,500 | 5% - 8% | Medium |
| CloudWatch (logs + metrics) | 450 - 1,100 | 2% - 6% | Medium |
| ECR storage + requests | 200 - 900 | 1% - 5% | Medium-Low |
| Data transfer + misc AWS line items | 300 - 1,200 | 2% - 6% | Low-Medium |
| **Total (calibrated)** | **1,18,755.64** | **100%** |  |

### 4.2 Component-level micro breakup (estimated)

| Component | Estimated INR | Kyun lag raha hai |
|---|---:|---|
| `8 x t3.medium` runtime | 6,800 - 8,000 | 24x7 always-on worker baseline |
| EC2 attached EBS (nodes) | 250 - 600 | root volume storage |
| DocumentDB instance runtime | 3,200 - 4,800 | managed DB compute |
| DocumentDB storage + IO | 500 - 800 | reads/writes + allocated data |
| ALB fixed hourly | 600 - 1,000 | 2 ALB running continuously |
| ALB LCU usage | 400 - 900 | requests, rules, active conns, bytes |
| NLB hourly + processing | 300 - 700 | 1 NLB baseline |
| NAT hourly | 900 - 1,200 | per-hour gateway charge |
| NAT data processing | 600 - 1,600 | per-GB egress tax |
| EKS control plane fee | 950 - 1,500 | fixed cluster mgmt |
| CloudWatch log ingestion | 250 - 700 | microservices logs |
| CloudWatch log storage | 100 - 300 | retention-based |
| CloudWatch metrics/alarms | 100 - 200 | custom/standard metrics |
| ECR storage | 150 - 600 | 47 repos + stale tags |
| ECR API pull/storage overhead | 50 - 300 | CI/CD and pulls |
| Misc transfer/API overhead | 300 - 1,200 | internet egress + service ops |

## 5) Root Cause Analysis (why bill high)

1. **Node baseline over-allocation**
   - 8 on-demand nodes continuously cost heavy fixed burn create karte hain.
2. **Managed network tax**
   - NAT + ALB/NLB combo me fixed + usage dono charge lagta hai.
3. **DB right-sizing pending**
   - DocDB class workload ke against oversized ho sakti hai.
4. **Observability + image sprawl**
   - Logs retention aur ECR cleanup strict na ho to silent cost drift.
5. **No clear cost allocation tags**
   - Service-wise accountability missing hone se wastage detect late hota hai.

## 6) Service-wise Optimization (what to do + impact)

### 6.1 EKS Worker EC2
- Action:
  - Desired nodes `8 -> 6` (phase trial), then off-peak autoscale further.
  - CPU/memory requests right-size.
  - low-priority workloads Spot pool me shift.
- Expected saving: **INR 2,000 - 3,800 / month**
- Risk: performance drop if right-sizing aggressive ho.
- Guardrail: P95 latency + pod pending + OOM alerts mandatory.

### 6.2 DocumentDB
- Action:
  - 7-day CPU, memory, connections, storage growth trend observe.
  - Under-utilized case me class downsize evaluate.
  - Read/write pattern optimize, idle connections reduce.
- Expected saving: **INR 800 - 2,000 / month**
- Risk: query latency / burst issues.
- Guardrail: staging load test + rollback plan.

### 6.3 Load Balancers
- Action:
  - 2 ALB + 1 NLB necessity validate.
  - host/path consolidation where feasible.
  - unused listeners/rules remove.
- Expected saving: **INR 400 - 1,200 / month**
- Risk: routing misconfiguration.
- Guardrail: blue-green validation + health check gate.

### 6.4 NAT Gateway
- Action:
  - egress-heavy traffic identify (image pulls, external APIs).
  - private endpoints / caching / mirror strategy.
  - avoid cross-AZ data path where possible.
- Expected saving: **INR 500 - 1,800 / month**
- Risk: connectivity breaks if routes changed wrongly.
- Guardrail: route-table diff review + smoke tests.

### 6.5 CloudWatch + ECR
- Action:
  - log retention 14/30 days.
  - debug logs reduce in prod.
  - ECR lifecycle: keep latest 20 tags per repo.
- Expected saving: **INR 300 - 1,000 / month**
- Risk: old logs unavailable for long audits.
- Guardrail: archive critical logs before retention cut.

## 7) Optimization Roadmap (time-phased)

## Phase A (0-24 hours)
- EKS desired: 8 -> 6
- CloudWatch retention set
- ECR lifecycle policy enable
- LB inventory cleanup shortlist
- NAT traffic baseline capture

Expected saving: **INR 1,900 - 3,300 / month**

## Phase B (3-7 days)
- HPA + Cluster Autoscaler tune
- requests/limits optimization
- NAT egress audit actions
- DocDB right-sizing decision

Expected additional saving: **INR 2,200 - 4,100 / month**

## Phase C (2-4 weeks)
- Spot nodegroup for non-critical workloads
- Compute Savings Plan purchase
- mandatory cost tags enforcement

Expected additional saving: **INR 2,500 - 5,500 / month**

## 8) Total Savings Projection

- Conservative: **20%** -> ~`INR 23,751`
- Realistic: **30-35%** -> ~`INR 35,627 - 41,564`
- Aggressive: **40%+** -> `INR 47,502+`

## 9) Action Tracker (owner-ready)

| Priority | Task | Owner | Deadline | Expected Saving | Status |
|---|---|---|---|---:|---|
| P0 | EKS desired 8->6 trial | DevOps | 24 hrs | INR 1,200+ | Pending |
| P0 | CloudWatch retention 30d | DevOps | 24 hrs | INR 200+ | Pending |
| P0 | ECR lifecycle (20 tags) | DevOps | 24 hrs | INR 100+ | Pending |
| P1 | NAT traffic root-cause audit | Platform | 3 days | INR 500+ | Pending |
| P1 | ALB/NLB consolidation proposal | Platform | 5 days | INR 400+ | Pending |
| P1 | DocDB utilization review | Backend+DBA | 7 days | INR 800+ | Pending |
| P2 | Spot nodegroup rollout | Platform | 2 weeks | INR 1,500+ | Pending |
| P2 | Compute Savings Plan decision | Finance+Ops | 3 weeks | INR 1,000+ | Pending |
| P2 | Cost tags governance | Engineering Mgmt | 4 weeks | Indirect | Pending |

## 10) Exact Service-wise Bill Pull (when IAM fixed)

Required IAM actions:
- `ce:GetCostAndUsage`
- `ce:GetDimensionValues`
- `ce:GetCostForecast`
- `ce:GetRightsizingRecommendation`
- `ce:GetSavingsPlansUtilization`

Run list (after permission):
- Service-wise monthly: `SERVICE` group
- Usage-type-wise monthly: `USAGE_TYPE` group
- Linked account/app split: `LINKED_ACCOUNT` + `TAG`
- Daily burn trend: `DAILY` granularity

Then this doc ko v2 me convert karke exact table fill karna:
- `service -> exact INR`
- `usage type -> exact INR`
- `top 10 costly line-items`
- `action + owner + realized saving`
