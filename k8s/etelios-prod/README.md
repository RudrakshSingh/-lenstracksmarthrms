# etelios-prod — canonical Kubernetes manifests

Namespace: **`etelios-prod`** (EKS `etelios-prod-v2`).

## Main ALB ingress (`api.etelios.com`)

**Source of truth:** [`etelios-ingress.json`](./etelios-ingress.json) — exported from the live cluster (includes `/api/permission`, `/api/user`, ACM cert ARN, stickiness, etc.).

Apply (idempotent merge):

```bash
kubectl apply -f k8s/etelios-prod/etelios-ingress.json
```

The older root-level [`../ingress.yaml`](../ingress.yaml) / [`../ingress-alb-fixed.yaml`](../ingress-alb-fixed.yaml) are kept in sync for **path order** with this JSON; prefer **`etelios-ingress.json`** when reconciling **etelios-prod** so you do not drop ALB-specific annotations.

## Redis (permission cache + JTS)

- **Live:** `Deployment` + `Service` **`redis`** in `etelios-prod` (ClusterIP `redis:6379`).
- **Git:** [`redis-deployment.json`](./redis-deployment.json), [`redis-service.json`](./redis-service.json) — export snapshots for new clusters / DR.

**Services that should set `REDIS_URL=redis://redis:6379` in prod:**

| Deployment        | Purpose |
|-------------------|---------|
| `auth-service`    | Writes effective perms cache keys |
| `hr-service`      | Reads cache layer for JWT/permRev |
| `attendance-service` | Reads cache + JWT fallback |
| `jts-service`     | Queues / cache (existing) |
| `sales-service`   | Reads cache layer |
| `api-gateway`     | Same JTS image as gateway; Redis if gateway code uses it |

## api-gateway

- **Image:** `etelios-jts-service` (not a separate ECR repo) on **port 3000**.
- **Git:** [`api-gateway-deployment.json`](./api-gateway-deployment.json) — pin the **same tag** as `jts-service` when you cut a release (e.g. `permrbac-202604031947`).

```bash
kubectl apply -f k8s/etelios-prod/api-gateway-deployment.json
```

## Kafka

**Not required** for permission RBAC, JWT sync, or Redis cache. `hr-service` lists `kafkajs` in `package.json` but there is **no active Kafka producer/consumer** in `src/` today. Add **Amazon MSK** (or similar) only when you implement domain events — not part of this feature.

## Image tags

YAMLs in this folder pin known-good ECR tags (e.g. `permrbac-*`). Bump tags after each release build; avoid relying on `:latest` alone in production.

### Quick rollout (cluster only)

From repo root:

```bash
export AUTH_TAG=your-new-auth-tag
export CORE_TAG=your-new-hr-jts-etc-tag   # optional; defaults to AUTH_TAG if unset
./scripts/etelios-prod-set-images.sh
```

**Fast build + push + rollout (auth, hr, attendance, jts, sales, api-gateway in parallel):**

```bash
./scripts/etelios-prod-quick-core-release.sh
# optional: RELEASE_TAG=permrbac-YYYYMMDDHHMM ./scripts/etelios-prod-quick-core-release.sh
```

Then update **`auth-service-deployment.yaml`**, **`hr-service-deployment.yaml`**, **`attendance-service-deployment.yaml`**, **`jts-service-deployment.yaml`**, **`sales-service-deployment.yaml`**, and **`api-gateway-deployment.json`** so the next `kubectl apply` does not revert tags.
