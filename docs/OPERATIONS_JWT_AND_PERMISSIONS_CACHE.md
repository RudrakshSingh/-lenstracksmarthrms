# Operations: JWT sync, images, permission cache

**Broader feature + frontend + prod checklist:** [`PERMISSION_RBAC_MAJOR_UPDATE_E2E_FRONTEND_AND_PROD.md`](./PERMISSION_RBAC_MAJOR_UPDATE_E2E_FRONTEND_AND_PROD.md)

## Why tokens must match

- **Auth-service** signs access JWTs with `JWT_SECRET` / issuer `hrms-backend`, audience `hrms-frontend`.
- **HR, attendance, JTS, sales**, and other services verify with the same secret. A mismatch → `401 Invalid token` everywhere except auth.

## Kubernetes: shared secret `etelios-jwt-sync`

Prod manifests under `k8s/etelios-prod/` reference:

- Secret name: **`etelios-jwt-sync`**
- Keys: **`JWT_SECRET`**, **`JWT_REFRESH_SECRET`** (must match what auth uses to sign access + refresh tokens)

Create or update once (example — adjust namespace and values):

```bash
kubectl -n <namespace> create secret generic etelios-jwt-sync \
  --from-literal=JWT_SECRET='<same-as-auth-signing-key>' \
  --from-literal=JWT_REFRESH_SECRET='<same-as-auth-refresh-key>' \
  --dry-run=client -o yaml | kubectl apply -f -
```

After changing the secret, **rollout every consumer** so pods reload env:

```bash
kubectl -n <namespace> rollout restart deploy/auth-service deploy/hr-service deploy/attendance-service deploy/jts-service
# add other deployments that verify JWTs
```

## Auth image / `linux/amd64`

EKS nodes are typically **amd64**. Build auth (and services bundling `@etelios/shared`) with:

```bash
docker build --platform linux/amd64 -t <registry>/auth-service:<tag> microservices/auth-service
```

Ensure the Dockerfile **copies** `microservices/shared` into the image if the service resolves `@etelios/shared` from disk.

## Permission cache (Redis)

- Keys: `etelios:perm:v1:eff:<userId>:<permRev>` (see `shared/utils/permissionCacheKeys.js`).
- Populated when auth resolves effective permissions (`setUserEffectiveCached`).
- **Attendance, HR, JTS, sales** read Redis first (same key + `permRev` claim), then JWT `permissions[]`, then (HR only) DB resolve.

Requirements:

- All services use the **same Redis** (or same logical DB) as auth for this to hit.
- **`REDIS_URL` / `REDIS_URI`** set consistently where cache is used.

## Optional: smaller JWTs

If the access token is too large (many permissions), set on **auth-service** only:

- `JWT_SKIP_PERMISSIONS_CLAIM=1` — omits `permissions` from JWT; downstream relies on Redis + `permRev` (ensure Redis path works).

## Kafka

Permission / JWT / Redis flows **do not use Kafka**. The HR service depends on `kafkajs` in `package.json` for optional future use; there is no production Kafka requirement for RBAC. Add MSK (or similar) only when you ship event-driven features.

## Rotate JWT secrets

1. Generate new `JWT_SECRET` / `JWT_REFRESH_SECRET`.
2. Update **`etelios-jwt-sync`** in the cluster.
3. Redeploy **auth-service** first, then all verifiers.
4. Invalidate sessions: users must **log in again** (refresh tokens also invalidated if refresh secret changed).

## Verify

```bash
# From inside cluster or port-forward auth
curl -sS -X POST http://auth-service:3001/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"...","password":"..."}' | jq '.data.accessToken' | head -c 80

# Call HR or attendance with that Bearer token — expect 200, not 401
```
