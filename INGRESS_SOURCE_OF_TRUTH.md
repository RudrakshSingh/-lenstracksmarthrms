# Etelios Production Ingress — Source of Truth
**Version:** 1.1 · **Last Updated:** May 1, 2026  
**Cluster:** EKS `ap-south-1` · **Namespace:** `etelios-prod`  
**Load Balancer:** AWS ALB (internet-facing) · **Ingress class:** `alb`  
**Certificate ARN:** `arn:aws:acm:ap-south-1:383234048604:certificate/f28621bc-c8c2-431f-80cd-ca34a2f82b8b`  
**Manifest:** `k8s/etelios-prod/etelios-ingress.json`

---

## Rule: ANY CHANGE to routing MUST update this file AND `etelios-ingress.json` atomically.

---

## 1. Hosts & Ports

| Host | Purpose |
|---|---|
| `api.etelios.com` | All backend microservice APIs — Kong gateway or direct ALB ingress |
| `app.etelios.com` | Frontend (Next.js / MFE) — separate ingress / CloudFront (not in this file) |

ALB listens on HTTP :80 (redirects to HTTPS) and HTTPS :443.  
`idle_timeout`: 120s · `stickiness`: lb_cookie 86400s · `healthcheck-path`: `/health`

---

## 2. Current Route Table — `api.etelios.com`

All paths use `pathType: Prefix`.

| Path | Backend Service | Port | Notes |
|---|---|---|---|
| `/health` | `auth-service` | 3001 | Global health probe |
| `/api/auth` | `auth-service` | 3001 | Login, refresh, logout, me, change-password |
| `/api/permission` | `auth-service` | 3001 | Permission catalog management |
| `/api/user` | `auth-service` | 3001 | Real user admin CRUD |
| `/auth` | `auth-service` | 3001 | Legacy shell route alias |
| `/api/hr` | `hr-service` | 3002 | Employees, departments, leave, roster, onboarding |
| `/hr` | `hr-service` | 3002 | Legacy shell route alias |
| `/api/tasks` | `hr-service` | 3002 | HRMS-compat task proxy (forwards to jts-service) |
| `/api/transfers` | `hr-service` | 3002 | Employee transfers |
| `/api/hr-letter` | `hr-service` | 3002 | HR letters |
| `/api/time-tracking` | `hr-service` | 3002 | Time tracking |
| `/api/performance` | `hr-service` | 3002 | Performance reviews |
| `/api/attendance` | `attendance-service` | 3003 | Clock-in/out, history, summary, reports |
| `/api/geofencing` | `attendance-service` | 3003 | Geofence settings and status |
| `/api/payroll/preview` | `hr-service` | 3002 | Pre-run attendance preview (proxied by hr-service) |
| `/api/payroll-workflow` | `payroll-service` | 3004 | Payroll run engine, gates, cycle management |
| `/api/payroll` | `payroll-service` | 3004 | Salary, deductions, payslips, compliance |
| `/api/tenant` | `tenant-registry-service` | 3008 | Current tenant info + entitlements |
| `/api/tenants` | `tenant-registry-service` | 3008 | Tenant list (super admin) |
| `/api/platform` | `tenant-registry-service` | 3008 | Platform admin |
| `/api/admin` | `tenant-registry-service` | 3008 | Admin console |
| `/api/system` | `tenant-registry-service` | 3008 | System settings |
| `/api/activities` | `tenant-registry-service` | 3008 | Activity log |
| `/api/users` | `tenant-registry-service` | 3008 | User management |
| `/api/roles` | `tenant-registry-service` | 3008 | Role management |
| `/api/branches` | `tenant-registry-service` | 3008 | Branch/store management |
| `/api/organizations` | `tenant-registry-service` | 3008 | Org hierarchy |
| `/api/documents` | `hr-service` | 3002 | Document management (proxied) |
| `/api/crm` | `crm-service` | 3005 | Customer profiles, campaigns, loyalty, **complaints** |
| `/api/inventory` | `inventory-service` | 3010 | Stock, **lens master, CL master, barcode, damage, audits** |
| `/api/sales` | `sales-service` | 3006 | POS, **optical orders, lab orders** |
| `/sales` | `sales-service` | 3006 | Legacy shell route alias |
| `/api/financial` | `financial-service` | 3007 | Ledger, expenses, **deposits, customer-due, GST** |
| `/api/analytics` | `analytics-service` | 3011 | Dashboard, reports, **optical analytics** |
| `/api/dashboard` | `analytics-service` | 3011 | Dashboard widgets |
| `/api/monitoring` | `monitoring-service` | 3012 | Health, alerts, metrics |
| `/api/jts` | `jts-service` | 3018 | JTS tasks (legacy path) |
| `/api/v1/jts` | `jts-service` | 3018 | JTS tasks (versioned) |
| `/api/v1/tasks` | `jts-service` | 3018 | Task CRUD |
| `/api/v1/active` | `jts-service` | 3018 | Active tasks |
| `/api/v1/timers` | `jts-service` | 3018 | Task timers |
| `/api/v1/notifications` | `jts-service` | 3018 | JTS notifications |
| `/jts` | `jts-service` | 3018 | Legacy shell route alias |
| `/api/purchase` | `purchase-service` | 3013 | **RX vendor orders, inward, vendor returns, scorecard** |
| `/tenant-management` | `tenant-management-service` | 3009 | Platform tenant management (UpCapto admin) |
| `/api/admin/v1` | `tenant-management-service` | 3009 | Platform API v1 (support grants, platform health) |
| `/` | `auth-service` | 3001 | Fallback — auth service health |

---

## 3. Services Not Yet in Ingress — Pending Sprint 2+ Work

The following new API paths will be served by existing services (no new K8s deployments needed) but **must be added to `etelios-ingress.json` during Sprint 6 Day 39 (Jun 5, 2026)**:

| New Path | Backend Service | When Added | Sprint |
|---|---|---|---|
| `/api/purchase` | `purchase-service` | Sprint 2 (May 4–10) | S2 |
| `/api/purchase/rx-orders` | `purchase-service` | Already under `/api/purchase` prefix | S2 |
| `/api/purchase/inward` | `purchase-service` | Already under `/api/purchase` prefix | S2 |
| `/api/purchase/vendor-returns` | `purchase-service` | Already under `/api/purchase` prefix | S2 |
| `/api/purchase/vendor-score` | `purchase-service` | Already under `/api/purchase` prefix | S2 |
| `/api/sales/lab-orders` | `sales-service` | Already under `/api/sales` prefix | S3 |
| `/api/financial/deposits` | `financial-service` | Already under `/api/financial` prefix | S4 |
| `/api/financial/customer-due` | `financial-service` | Already under `/api/financial` prefix | S4 |
| `/api/financial/gstin` | `financial-service` | Already under `/api/financial` prefix | S4 |
| `/api/financial/gst-categories` | `financial-service` | Already under `/api/financial` prefix | S4 |
| `/api/financial/stock-transfer-invoice` | `financial-service` | Already under `/api/financial` prefix | S4 |

> **Note:** Most new optical routes are sub-paths of already-registered prefix paths (`/api/inventory`, `/api/sales`, `/api/financial`, `/api/crm`). The ALB `Prefix` match covers them automatically. Only `/api/purchase` needs a new ingress rule — add it in Sprint 2.

---

## 4. ALB Annotations Reference

```json
{
  "alb.ingress.kubernetes.io/scheme": "internet-facing",
  "alb.ingress.kubernetes.io/target-type": "ip",
  "alb.ingress.kubernetes.io/listen-ports": "[{\"HTTP\": 80}, {\"HTTPS\": 443}]",
  "alb.ingress.kubernetes.io/ssl-redirect": "443",
  "alb.ingress.kubernetes.io/certificate-arn": "arn:aws:acm:ap-south-1:383234048604:certificate/f28621bc-c8c2-431f-80cd-ca34a2f82b8b",
  "alb.ingress.kubernetes.io/healthcheck-path": "/health",
  "alb.ingress.kubernetes.io/healthcheck-interval-seconds": "30",
  "alb.ingress.kubernetes.io/healthcheck-timeout-seconds": "10",
  "alb.ingress.kubernetes.io/healthy-threshold-count": "2",
  "alb.ingress.kubernetes.io/unhealthy-threshold-count": "3",
  "alb.ingress.kubernetes.io/backend-protocol": "HTTP",
  "alb.ingress.kubernetes.io/load-balancer-attributes": "idle_timeout.timeout_seconds=120",
  "alb.ingress.kubernetes.io/target-group-attributes": "stickiness.enabled=true,stickiness.lb_cookie.duration_seconds=86400"
}
```

---

## 5. Service Port Registry

| Service | K8s Service Name | Container Port | Internal DNS |
|---|---|---|---|
| auth-service | `auth-service` | 3001 | `auth-service.etelios-prod.svc.cluster.local` |
| hr-service | `hr-service` | 3002 | `hr-service.etelios-prod.svc.cluster.local` |
| attendance-service | `attendance-service` | 3003 | `attendance-service.etelios-prod.svc.cluster.local` |
| payroll-service | `payroll-service` | 3004 | `payroll-service.etelios-prod.svc.cluster.local` |
| crm-service | `crm-service` | 3005 | `crm-service.etelios-prod.svc.cluster.local` |
| sales-service | `sales-service` | 3006 | `sales-service.etelios-prod.svc.cluster.local` |
| financial-service | `financial-service` | 3007 | `financial-service.etelios-prod.svc.cluster.local` |
| tenant-registry-service | `tenant-registry-service` | 3008 | `tenant-registry-service.etelios-prod.svc.cluster.local` |
| tenant-management-service | `tenant-management-service` | 3009 | `tenant-management-service.etelios-prod.svc.cluster.local` |
| inventory-service | `inventory-service` | 3010 | `inventory-service.etelios-prod.svc.cluster.local` |
| analytics-service | `analytics-service` | 3011 | `analytics-service.etelios-prod.svc.cluster.local` |
| monitoring-service | `monitoring-service` | 3012 | `monitoring-service.etelios-prod.svc.cluster.local` |
| purchase-service | `purchase-service` | 3013 | `purchase-service.etelios-prod.svc.cluster.local` |
| notification-service | `notification-service` | 3014 | `notification-service.etelios-prod.svc.cluster.local` |
| jts-service | `jts-service` | 3018 | `jts-service.etelios-prod.svc.cluster.local` |
| realtime-service | `realtime-service` | 3021 | `realtime-service.etelios-prod.svc.cluster.local` |

---

## 6. Health Check Endpoints

All services expose `GET /health` returning `{ status: 'ok', service: '<name>', timestamp: '<iso>' }`.  
ALB polls every 30s; service is marked unhealthy after 3 consecutive failures (90s).

```bash
# Quick smoke test all services from within cluster:
for svc in auth-service hr-service attendance-service payroll-service crm-service sales-service financial-service inventory-service purchase-service jts-service analytics-service; do
  echo -n "$svc: " && curl -sf http://$svc.etelios-prod.svc.cluster.local/health | jq .status
done
```

---

## 7. Path Conflict Rules

1. **More specific prefix wins** — `/api/payroll-workflow` must be registered BEFORE `/api/payroll` in Kong (Kong evaluates in list order).
2. **No trailing slashes** in path definitions — `/api/hr` not `/api/hr/`.
3. **Legacy aliases** (`/hr`, `/sales`, `/jts`) are kept for backward compatibility with older frontend builds; do not remove without verifying no client uses them.
4. **New service = new ingress path** — if a new microservice is created, its path must be added here and in `etelios-ingress.json` before any traffic is sent.

---

## 8. Change Log

| Date | Change | Author |
|---|---|---|
| May 1, 2026 | Initial fill — documented all existing routes from ingress JSON + service list | Sprint 1 Day 1 |
| May 1, 2026 | Added optical V1 pending routes table (Sprint 2+ work) | Sprint 1 Day 1 |
| — | `/api/purchase` ingress rule — add to `etelios-ingress.json` | Sprint 2 (May 4–10) |
| — | Kong routes for all optical endpoints | Sprint 6 Day 39 (Jun 5) |

---

*Kong config: `microservices/api-gateway/kong.yml`*  
*K8s manifests: `k8s/etelios-prod/`*  
*API contract: `API_CONTRACT_CANONICAL.md`*
