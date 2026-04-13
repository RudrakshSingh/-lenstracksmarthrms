# AWS Cost Optimization Execution Playbook (Hinglish)

## Goal

Current due bill (`INR 1,18,755.64`) ko next cycles me systematically reduce karna without production outage.

Target savings:
- Phase-1: 10-15%
- Phase-2: 20-30%
- Phase-3: 30-40%+

## Scope (current infra focus)

- EKS worker nodes (`t3.medium`, desired 8)
- DocumentDB (`db.r6g.large`)
- ALB/NLB (2 ALB + 1 NLB)
- NAT Gateway
- CloudWatch logs/metrics
- ECR image storage

## Optimization Strategy

## Phase 0 - Baseline freeze (Day 0)

1. Current infra snapshot save karo (nodes, LBs, NAT, DB, top workloads).
2. 7-day monitoring baseline capture:
   - CPU, memory, pod restarts
   - request volume
   - network egress
3. Business-critical SLO define karo:
   - API error rate
   - P95 response time
   - checkout/check-in/login success rate

Success criteria:
- Any optimization ke baad SLO degrade na ho.

## Phase 1 - Quick wins (0-24 hours)

## 1) EKS node count right-size

Action:
- desired nodes `8 -> 6` karo (peak hours monitoring ke saath).

Expected saving:
- ~INR 1,200 to INR 2,200 / month

Risk:
- peak traffic me pending pods

Rollback:
- desired size wapas 8.

## 2) CloudWatch log retention fix

Action:
- non-critical log groups retention 14 or 30 days.

Expected saving:
- ~INR 200 to INR 500 / month

Risk:
- old logs unavailable

Rollback:
- critical log groups retention longer set karo.

## 3) ECR lifecycle policy

Action:
- per repo latest 20 images retain, older auto-expire.

Expected saving:
- ~INR 100 to INR 400 / month

Risk:
- very old rollback image unavailable

Rollback:
- critical release tags `prod-*` retain rule add.

## 4) Load balancer hygiene

Action:
- unused listeners/rules/remove duplicate LBs identify.

Expected saving:
- ~INR 200 to INR 800 / month

Risk:
- wrong route deletion

Rollback:
- terraform/yaml config restore + reapply.

## Phase 2 - Structural optimization (3-7 days)

## 1) HPA + Cluster Autoscaler tuning

Action:
- HPA thresholds realistic set karo (CPU + memory).
- Cluster autoscaler min/max per workload cycle tune karo.

Expected saving:
- ~INR 1,000 to INR 2,500 / month

## 2) Requests/limits right-sizing

Action:
- over-requested pods identify karo.
- requests lower karo jaha actual usage low hai.

Expected saving:
- indirect high impact (same cluster me more workloads fit).

## 3) NAT traffic audit

Action:
- top egress sources identify (image pulls, external APIs, telemetry).
- repetitive outbound calls cache/memoize.

Expected saving:
- ~INR 500 to INR 1,500 / month

## 4) DocumentDB right-size review

Action:
- 7-day metrics:
  - CPU avg/peak
  - memory pressure
  - connections
  - storage growth
- low utilization ho to downsize proposal.

Expected saving:
- ~INR 800 to INR 2,000 / month

Risk:
- query latency increase

Rollback:
- class revert + maintenance window rollback runbook.

## Phase 3 - Financial optimization (2-4 weeks)

## 1) Spot adoption (partial)

Action:
- non-critical workloads separate nodegroup pe Spot.
- critical services On-Demand pe hi.

Expected saving:
- ~INR 1,500 to INR 3,500 / month

Risk:
- spot interruption

Mitigation:
- PDB, anti-affinity, mixed node groups.

## 2) Compute Savings Plan

Action:
- stable baseline compute for 1-year plan evaluate.

Expected saving:
- 10-30% on covered compute usage.

## 3) Cost governance by tags

Action:
- mandatory tags:
  - `env`
  - `service`
  - `owner`
  - `cost-center`
  - `criticality`

Result:
- exact service owner accountability + chargeback visibility.

## Weekly operating ritual (must-have)

Every Monday:
1. Top 5 expensive services review
2. Last week vs this week spend delta
3. anomaly reason
4. action owner assign
5. realized saving track

## KPI Dashboard (track these)

- Cost per day (INR/day)
- Cost per deploy
- Cost per active tenant
- Cost per 1k API requests
- EKS node utilization (%)
- NAT data processing trend
- DocDB CPU and connection saturation

## Owner plan

| Task | Owner | SLA |
|---|---|---|
| EKS scaling + HPA tuning | DevOps | 48 hrs |
| CloudWatch retention + ECR lifecycle | DevOps | 24 hrs |
| NAT egress optimization | Platform/Backend | 5 days |
| DocDB right-sizing | Backend + DBA | 7 days |
| Spot + Savings Plan rollout | DevOps + Finance | 3 weeks |
| Cost governance and weekly review | Engineering Manager | ongoing |

## Rollback safety checklist

Before every cost change:
1. baseline metrics snapshot
2. rollback command ready
3. on-call aware
4. business-hour rollout
5. 60-min post-change monitoring

If degradation:
- rollback immediately
- incident note
- optimize in smaller steps

## Expected consolidated savings

- Quick wins only: 10-15%
- Quick + structural: 20-30%
- Full program: 30-40%+

For `INR 1,18,755.64`:
- 20% = `~INR 23,751`
- 30% = `~INR 35,627`
- 40% = `~INR 47,502`

## Final recommendation

Start with low-risk high-impact changes today:
1. EKS 8 -> 6
2. log retention
3. ECR lifecycle

Then week-1 me NAT + DocDB + autoscaling optimize karo.  
Financial layer (Spot/Savings Plan) week-2 onward implement karo after stability confirmation.
