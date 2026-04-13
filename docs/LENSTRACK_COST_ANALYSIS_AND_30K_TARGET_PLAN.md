# COST ANALYSIS

## Current Bill Position

- Last observed bill reference: **INR 1,18,755.64**
- Target asked: **under INR 30,000 / month**
- Required reduction: ~**INR 88,756** (~**74.7% cut**)

## Practical Reality Check

Under `30k/month` is possible only if architecture is aggressively simplified to **Lenstrack-only** and over-provisioning removed.  
If full current production footprint (8 nodes + DocDB + multi-LB + NAT-heavy routing) stays same, `30k` sustainable nahi hoga.

---

# EXACT REASON FOR HIGH PREVIOUS BILLS

## 1) Over-sized compute baseline (largest reason)
- EKS workers: `8 x t3.medium` always-on.
- Traffic low hours me bhi same cost burn.
- This alone typically eats the largest chunk of monthly bill.

## 2) Managed networking tax (silent but heavy)
- 2 ALB + 1 NLB + 1 NAT gateway active.
- NAT charges = hourly + per-GB processing.
- ALB charges = hourly + LCU usage.
- Combined network layer recurring high fixed cost create karta hai.

## 3) Database class vs utilization mismatch
- DocumentDB `db.r6g.large` single instance.
- If workload medium/low ho, this class expensive pad sakta hai.
- DB tier right-sizing formally enforce nahi hua.

## 4) Cost hygiene weak
- ECR repos many (`47`), stale image retention possible.
- CloudWatch logs retention likely not tight enough.
- Production debugging verbosity long-term storage burn increase karta hai.

## 5) Architecture not strictly Lenstrack-only
- Multi-tenant-ready patterns and spare infra headroom cost inflate karte hain.
- Non-essential components running for generalized platform behavior.

---

# PLAN FOR TAKING IT UNDER 30 THOUSAND MONTHLY

## Target Design Principle
**Lenstrack-only minimal production architecture**:
- single-tenant
- lean node pool
- one LB path
- DB tier right-sized
- strict retention and image cleanup

## Phase 1 (48 hours): Fast Reduction

1. **EKS scale down hard**
   - desired nodes `8 -> 3` (or `4` if stability concern).
   - non-critical pods replicas reduce.
2. **Remove duplicate LB path**
   - keep only one required ingress strategy.
3. **CloudWatch retention**
   - most groups at `14 days`, critical at `30 days`.
4. **ECR lifecycle**
   - keep only `prod-*` + latest 10/20 tags.

Expected impact: strong immediate drop in compute + ops overhead.

## Phase 2 (Week 1): Structural Cost Cut

1. **NAT minimization**
   - reduce outbound dependencies.
   - avoid unnecessary internet egress.
2. **DocDB right-size**
   - move from `r6g.large` to smaller class only after metric validation.
3. **Request/limit tuning**
   - pod resources align with real usage.

## Phase 3 (Week 2-3): Locking under 30k

1. **Lenstrack-only service matrix**
   - keep only business-critical services for Lenstrack.
2. **Stop non-essential environments**
   - nightly shutdown for non-prod where feasible.
3. **Savings Plan (if baseline stable)**
   - lock discount on unavoidable steady compute.

## Monthly Budget Envelope (Suggested)

| Bucket | Monthly Cap (INR) |
|---|---:|
| EKS worker compute | 12,000 |
| Database | 7,000 |
| Network (LB + NAT) | 5,000 |
| Logs + Registry + misc | 3,000 |
| Buffer | 3,000 |
| **Total cap** | **30,000** |

---

# REMOVAL OF IR-REVALANT COST CONSUMERS

## Remove / Disable First

1. Duplicate load balancer topology (retain only required one).
2. Idle or low-value microservices not used by Lenstrack workflows.
3. Unused ECR repos / old image tags.
4. Non-critical high-volume logs.
5. Any integration endpoints generating unnecessary NAT egress.

## Keep (Lenstrack Core Only)

- Auth + HR + Attendance + required JTS APIs
- Required DB and required ingress
- Essential notifications only (no extra experimental channels)

---

# (ARCHITECTURE STRICTLY NEEDS TO BE FOR LENSTRACK ONLY)

## Strict Architecture Guardrails

1. **Single tenant guardrail**
   - no shared multi-tenant overhead paths in prod runtime.
2. **Service admission policy**
   - new service only if directly mapped to Lenstrack business KPI.
3. **Infra approval gate**
   - no new LB/NAT/DB class changes without cost impact note.
4. **Cost SLO**
   - hard monthly ceiling: `INR 30,000`.
5. **Weekly FinOps review**
   - spend vs cap, top 5 consumers, action owner.

## Governance Rule

If any component does not directly improve Lenstrack production flow, it should be:
- removed,
- merged into existing service, or
- moved to non-prod and scheduled off-hours.

---

## Final Recommendation

To actually reach `<30k/month`, execute in this order:
1. compute downsize,
2. network simplification,
3. DB right-size,
4. hygiene cleanup (logs/ECR),
5. strict Lenstrack-only architecture policy.

Without these structural cuts, only minor optimization se target achieve nahi hoga.
