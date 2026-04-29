# AWS Cost Analysis and Optimization Master Report (April 2026)

## 1) Executive Snapshot

- Total AWS outstanding bill (invoice based): **INR 1,18,755.64**
- Billing status: **Past due**
- Invoice ID: `2579714253`
- Billing account context: AWS India

Yeh report ek single master document hai jisme:
1. Cost analysis (kaha kitna paisa ja raha hai)
2. Root-cause diagnosis (kyu kharch badh raha hai)
3. Actionable optimization plan (kaise kam karna hai)
4. Execution tracker (owner + timeline + rollback)

---

## 2) Data Reliability and Assumptions

### 2.1 Kya exact hai
- Total bill amount: **exact** (invoice screenshot se).
- Live infra topology: **exact** (account resource inventory se).

### 2.2 Kya estimated hai
- Service-wise INR breakup ranges (kyunki `ce:GetCostAndUsage` permission currently denied tha).
- Isliye split high-confidence infra-calibrated estimate hai, exact Cost Explorer line-items nahi.

### 2.3 Final objective
Jaise hi Cost Explorer permission milti hai, isi doc ka v2 niklega jisme:
- exact service-wise INR
- exact usage-type INR
- daily burn trend
- top waste line-items with realized savings

---

## 3) Current Infra Footprint (Cost Drivers ka base)

### 3.1 Compute and Kubernetes
- EKS cluster: `etelios-prod-v2`
- Nodegroup: `prod-workers`
- Capacity type: `ON_DEMAND`
- Instance type: `t3.medium`
- Desired node count: **8** (`min=2`, `max=10`)

### 3.2 Network Layer
- Load balancers total: **3**
  - ALB: **2**
  - NLB: **1**
- NAT Gateway: **1 active**

### 3.3 Data Layer
- DocumentDB cluster: `lenstrack-docdb-cluster`
- Instance class: `db.r6g.large`
- Running instances: **1**

### 3.4 Registry / Observability
- ECR repos: **47**
- CloudWatch logs + metrics active across services

---

## 4) Detailed Cost Analysis (Service-wise)

## 4.1 Top-Level Estimated Split

| Cost Family | Estimated INR Range | Share Range | Why it costs |
|---|---:|---:|---|
| EKS worker EC2 | 45,000 - 53,000 | 38% - 45% | 8 on-demand nodes 24x7 |
| DocumentDB | 23,000 - 35,500 | 20% - 30% | managed DB runtime + storage/IO |
| Load Balancing (ALB/NLB) | 9,500 - 14,200 | 8% - 12% | hourly + LCU/data processing |
| NAT Gateway | 9,500 - 17,800 | 8% - 15% | hourly + per-GB data processing |
| EKS control plane | 5,900 - 9,500 | 5% - 8% | fixed managed control fee |
| CloudWatch logs/metrics | 2,400 - 7,100 | 2% - 6% | ingestion + retention |
| ECR storage/requests | 1,200 - 5,900 | 1% - 5% | stale tags, storage growth |
| Data transfer + misc | 2,300 - 7,100 | 2% - 6% | inter-service + internet overhead |
| **Total (calibrated)** | **INR 1,18,755.64** | **100%** | Matches invoice total |

## 4.2 Micro Component Breakdown

| Component | Estimated INR | Comment |
|---|---:|---|
| EC2 node runtime (8 x t3.medium) | 43,000 - 50,000 | Largest fixed cost block |
| Node EBS volumes | 1,500 - 3,000 | Per-node storage |
| DocDB instance runtime | 20,000 - 31,000 | Compute + managed premium |
| DocDB storage/IO | 3,000 - 4,500 | Data growth + read/write IO |
| ALB fixed + LCU | 7,000 - 11,000 | Traffic pattern dependent |
| NLB fixed + processing | 2,500 - 3,500 | Smaller but persistent |
| NAT hourly | 5,500 - 7,000 | Baseline even low traffic |
| NAT data processing | 4,000 - 10,800 | Hidden egress tax |
| EKS control plane | 5,900 - 9,500 | Fixed managed cluster fee |
| CloudWatch ingestion | 1,500 - 4,700 | Debug logs raise cost |
| CloudWatch storage | 600 - 1,500 | Retention governed |
| ECR storage | 800 - 4,000 | 47 repos with history |
| ECR API/pulls | 400 - 1,900 | CI/CD + node pulls |
| Misc transfer/API overhead | 2,300 - 7,100 | Background account noise |

---

## 5) Root Cause Analysis (Why cost high)

## 5.1 Structural causes
1. **High always-on compute baseline**  
   8 on-demand nodes permanently running, workload troughs me bhi.

2. **Managed networking tax**  
   NAT + ALB combination me fixed + variable dono charges compound hote hain.

3. **Database right-sizing unverified**  
   DocDB class possibly over-provisioned relative to real utilization.

4. **Operational hygiene gaps**  
   ECR image churn + CloudWatch retention policy strict nahi.

5. **Tag-based accountability weak**  
   `service/owner/cost-center` tagging absent/inconsistent hone se precise ownership missing.

## 5.2 Behavior causes
- Deploy frequency high, cleanup low.
- Non-critical pods often same class resources use kar rahe as critical services.
- Network egress paths optimized nahi (especially NAT-driven outbound traffic).

---

## 6) Optimization Objectives (Clear Targets)

### 6.1 Primary objective
Next 1-2 billing cycles me cost reduce karna **without production instability**.

### 6.2 Numeric target
- 2 weeks: **10-15%**
- 4 weeks: **20-30%**
- 6-8 weeks: **30-40%** (agar Spot + Savings Plan mature rollout ho)

### 6.3 Savings value on current base (INR 1,18,755.64)
- 20% -> **INR 23,751**
- 25% -> **INR 29,689**
- 30% -> **INR 35,627**
- 35% -> **INR 41,564**
- 40% -> **INR 47,502**

---

## 7) Execution Plan (Phase-wise)

## Phase A: Immediate Quick Wins (0-24 hours)

### A1. EKS baseline scale-down trial
- Change: desired nodes `8 -> 6`
- Saving potential: INR 12k-22k/month equivalent range impact
- Risk: pod pending / higher latency during spikes
- Guardrail: monitor `CPU`, `memory`, `pending pods`, `P95 latency`
- Rollback: desired back to `8`

### A2. CloudWatch retention policy hardening
- Change: default retention `Never Expire` se `14` ya `30 days`
- Saving potential: INR 2.5k-6k/month equivalent range impact
- Risk: old forensic logs unavailable
- Guardrail: critical groups exempt

### A3. ECR lifecycle governance
- Change: keep last `20` images, preserve `prod-*` tags
- Saving potential: INR 1k-4k/month equivalent range impact
- Risk: old rollback artifacts unavailable
- Guardrail: release tags retain

### A4. Load balancer hygiene sweep
- Change: duplicate listeners/rules/LB cleanup
- Saving potential: INR 2k-7k/month equivalent range impact
- Risk: route breakage
- Guardrail: blue-green validation + smoke tests

## Phase B: Structural Optimization (3-7 days)

### B1. HPA and Cluster Autoscaler tuning
- Change: real traffic-based scaling thresholds
- Benefit: idle hours me node pressure drop

### B2. Requests/Limits rightsizing
- Change: over-requested workloads reduce
- Benefit: better pod packing, fewer nodes needed

### B3. NAT egress reduction
- Change: outbound call audit, caching, endpoint strategy
- Benefit: NAT data processing charge reduce

### B4. DocumentDB rightsizing decision
- Change: metrics-backed downsize (if safe)
- Benefit: direct database spend reduction
- Guardrail: staging load test + rollback window

## Phase C: Financial Layer (2-4 weeks)

### C1. Mixed compute model
- Critical services -> On-Demand
- Non-critical/async -> Spot nodegroup

### C2. Savings Plan
- Stable baseline compute cover karo
- Predictable workloads me discount lock-in

### C3. Cost governance and tagging
- Mandatory tags:
  - `env`
  - `service`
  - `owner`
  - `team`
  - `cost-center`
  - `criticality`

---

## 8) Owner-Based Action Tracker

| Priority | Task | Owner | ETA | Expected Impact | Status |
|---|---|---|---|---|---|
| P0 | EKS desired 8->6 trial | DevOps | 24h | High | Planned |
| P0 | CloudWatch retention policy | DevOps | 24h | Medium | Planned |
| P0 | ECR lifecycle policy | DevOps | 24h | Medium | Planned |
| P1 | LB duplication/rule audit | Platform | 3d | Medium | Planned |
| P1 | NAT egress top-talker analysis | Platform+Backend | 5d | High | Planned |
| P1 | DocDB utilization review | Backend+DBA | 7d | High | Planned |
| P2 | Spot nodegroup rollout | DevOps | 2w | High | Planned |
| P2 | Savings Plan recommendation | Finance+Ops | 3w | Medium-High | Planned |
| P2 | Cost tagging policy enforcement | Eng Manager | 4w | Strategic | Planned |

---

## 9) Risk Matrix and Rollback Plan

| Optimization | Risk | Severity | Rollback |
|---|---|---|---|
| Node scale-down | app latency/pod pending | High | scale back to previous desired nodes |
| DocDB downsize | DB latency spikes | High | restore previous class in maintenance window |
| LB cleanup | routing break | High | reapply previous ingress/LB config |
| NAT route changes | egress failures | Medium-High | revert route table changes |
| Log retention cut | audit gap | Medium | exempt critical log groups |

Mandatory rollback checklist:
1. Pre-change baseline capture
2. Rollback command ready
3. On-call informed
4. Business-hours rollout
5. 60-minute post-change observation

---

## 10) KPI Framework (Weekly Review)

Track every Monday:
- Total AWS spend (week-over-week)
- INR/day burn rate
- EKS node utilization
- Cost per 1k requests
- NAT processing trend
- DocDB CPU + connection trend
- CloudWatch ingestion volume
- ECR storage growth

Escalation trigger:
- Weekly spend increase >10% without planned scaling event
- Any service-specific cost spike >20% WoW

---

## 11) Governance Cadence

### Weekly
- 30-min FinOps + DevOps review
- top 5 costly items
- assigned corrective actions

### Monthly
- Savings realized vs planned
- old actions closure
- new optimization backlog

### Quarterly
- Savings Plan/RI reassessment
- architecture-level cost redesign review

---

## 12) Exact Cost Drilldown Enablement (Pending IAM)

Required IAM permissions:
- `ce:GetCostAndUsage`
- `ce:GetDimensionValues`
- `ce:GetCostForecast`
- `ce:GetRightsizingRecommendation`
- `ce:GetSavingsPlansUtilization`

Once enabled, this report will be upgraded with:
1. exact service-wise INR table
2. exact usage-type table (EC2 hours, NAT data processing, ALB LCU, DocDB storage)
3. daily trend chart narrative
4. top 10 waste line-items with realized savings

---

## 13) Final Checks

Start immediately with lowest-risk highest-impact trio:
1. EKS desired nodes 8 -> 6 (monitored rollout)
2. CloudWatch retention hardening
3. ECR lifecycle enforcement

Then within 7 days:
- NAT egress optimization + DocDB rightsizing decision

Then within 2-4 weeks:
- Spot adoption + Savings Plan + tag governance

Is sequence se production safety maintain rahegi aur savings measurable form me unlock hongi.
