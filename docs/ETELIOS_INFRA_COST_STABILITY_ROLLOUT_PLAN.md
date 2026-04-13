# Etelios Infra Cost + Stability Rollout Plan

**Date:** 2026-03-25  
**Scope:** Infra-only remediation from repo manifests (no application code changes)

---

## 1) What has been fixed in manifests

## 1.1 Mongo/DocDB env consistency

Normalized `docdb-credentials` key usage from `endpoint` to `MONGO_URI` where needed:

- `k8s/etelios-prod/tenant-management-service-deployment.yaml`
- `k8s/etelios-prod/service-management-deployment.yaml`
- `k8s/etelios-prod/realtime-service-deployment.yaml`
- `k8s/etelios-prod/purchase-service-deployment.yaml`
- `k8s/etelios-prod/prescription-service-deployment.yaml`
- `k8s/etelios-prod/notification-service-deployment.yaml`
- `k8s/etelios-prod/monitoring-service-deployment.yaml`
- `k8s/etelios-prod/inventory-service-deployment.yaml`
- `k8s/etelios-prod/financial-service-deployment.yaml`
- `k8s/etelios-prod/document-service-deployment.yaml`
- `k8s/etelios-prod/crm-service-deployment.yaml`
- `k8s/etelios-prod/cpp-service-deployment.yaml`
- `k8s/etelios-prod/analytics-service-deployment.yaml`
- `k8s/etelios-prod/sales-service-deployment.yaml` (also `MONGODB_URI` mapped to `MONGODB_URI`)

## 1.2 CPU request right-sizing (250m -> 100m)

Reduced requests in production deployments to improve scheduling and reduce waste:

- `sales-service`, `hr-service`, `tenant-management-service`
- `attendance-service`, `jts-service`, `payroll-service`
- `tenant-registry-service`, `auth-service`
- `service-management`, `realtime-service`, `purchase-service`
- `prescription-service`, `notification-service`, `monitoring-service`
- `inventory-service`, `financial-service`, `document-service`
- `crm-service`, `cpp-service`, `analytics-service`

## 1.3 Ingress ↔ Service port alignment (ALB)

**Rule:** Ingress `backend.service.port.number` must equal **`Service.spec.ports[].port`** (the Service’s published port), **not** `targetPort` (container port).

Examples in this repo:

- `attendance-service` / `payroll-service` / `sales-service` publish **`port: 80`** → Ingress must use **`number: 80`**.
- `tenant-management-service` publishes **`port: 3019`** → Ingress must use **`number: 3019`**.

Using `number: 3003` on attendance fails ALB model build because no Service port `3003` exists (only `targetPort: 3003`).

---

## 2) Mandatory pre-apply checks

Run before rollout:

```bash
kubectl -n etelios-prod get secret docdb-credentials -o yaml
```

Confirm secret contains keys:

- `MONGO_URI`
- `MONGODB_URI`
- `MONGO_USERNAME`
- `MONGO_PASSWORD`

If keys are missing, fix secret first. Deployments will fail on missing env refs.

---

## 3) Apply order (recommended)

```bash
kubectl apply -f k8s/etelios-prod/sales-service-deployment.yaml
kubectl apply -f k8s/etelios-prod/hr-service-deployment.yaml
kubectl apply -f k8s/etelios-prod/tenant-management-service-deployment.yaml
kubectl apply -f k8s/etelios-prod/api-gateway-ingress.yaml

kubectl apply -f k8s/etelios-prod/attendance-service-deployment.yaml
kubectl apply -f k8s/etelios-prod/jts-service-deployment.yaml
kubectl apply -f k8s/etelios-prod/payroll-service-deployment.yaml
kubectl apply -f k8s/etelios-prod/tenant-registry-service-deployment.yaml
kubectl apply -f k8s/etelios-prod/auth-service-deployment.yaml
kubectl apply -f k8s/etelios-prod/service-management-deployment.yaml
kubectl apply -f k8s/etelios-prod/realtime-service-deployment.yaml
kubectl apply -f k8s/etelios-prod/purchase-service-deployment.yaml
kubectl apply -f k8s/etelios-prod/prescription-service-deployment.yaml
kubectl apply -f k8s/etelios-prod/notification-service-deployment.yaml
kubectl apply -f k8s/etelios-prod/monitoring-service-deployment.yaml
kubectl apply -f k8s/etelios-prod/inventory-service-deployment.yaml
kubectl apply -f k8s/etelios-prod/financial-service-deployment.yaml
kubectl apply -f k8s/etelios-prod/document-service-deployment.yaml
kubectl apply -f k8s/etelios-prod/crm-service-deployment.yaml
kubectl apply -f k8s/etelios-prod/cpp-service-deployment.yaml
kubectl apply -f k8s/etelios-prod/analytics-service-deployment.yaml
```

Then force fresh rollouts:

```bash
kubectl -n etelios-prod rollout restart deploy/sales-service deploy/hr-service deploy/tenant-management-service
kubectl -n etelios-prod rollout restart deploy/attendance-service deploy/jts-service deploy/payroll-service deploy/tenant-registry-service deploy/auth-service
kubectl -n etelios-prod rollout restart deploy/service-management deploy/realtime-service deploy/purchase-service deploy/prescription-service
kubectl -n etelios-prod rollout restart deploy/notification-service deploy/monitoring-service deploy/inventory-service deploy/financial-service deploy/document-service deploy/crm-service deploy/cpp-service deploy/analytics-service
```

---

## 4) Post-apply validation

## 4.1 Stability checks

```bash
kubectl -n etelios-prod get pods
kubectl -n etelios-prod get pods --sort-by=.status.containerStatuses[0].restartCount
kubectl -n etelios-prod describe pod <failing-pod>
```

Success criteria:

- sales-service no longer CrashLoopBackOff
- hr-service pods scheduled (no Insufficient CPU)
- restart counts flatten

## 4.2 Ingress checks

```bash
kubectl -n etelios-prod describe ingress etelios-api-ingress
```

Verify:

- no backend port resolution errors
- `/tenant-management` and `/sales` rules resolve successfully

## 4.3 Runtime smoke checks

```bash
# ALB ingress uses path prefixes without /api (see api-gateway-ingress.yaml)
curl -sS -o /dev/null -w "%{http_code}\n" https://api.etelios.com/sales/health
curl -sS -o /dev/null -w "%{http_code}\n" https://api.etelios.com/hr/health
curl -sS -o /dev/null -w "%{http_code}\n" https://api.etelios.com/tenant-management/health
```

If you still see **404** after ingress reconciles, confirm traffic is hitting this ingress (host `api.etelios.com`) and that the app serves `/health` on that path prefix.

---

## 5) Cost optimization actions outside repo (AWS console/infra layer)

These are not editable in this repo YAML and must be done in AWS/IaC:

- EC2 node group right-sizing after 3-5 days stable metrics
- DocumentDB instance size/storage review
- NAT Gateway optimization (VPC endpoints + route optimization)
- old EBS volumes/snapshots cleanup

---

## 6) Guardrails to prevent recurrence

- Add CI check for required secret keys per deployment env.
- Add ingress/service contract check (service exists + named port exists).
- Block merges when requests are raised without utilization evidence.
- Alert on CrashLoop and unschedulable pods.

