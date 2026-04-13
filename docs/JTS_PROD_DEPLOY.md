# Deploy JTS to production (Etelios / AKS)

## Production topology: **Ingress only (no API Gateway)**

If **prod** traffic is **ALB / NGINX Ingress → Kubernetes Services** and you **do not** run the repo root **`api-gateway`** Deployment:

- **Source of truth for public paths:** `k8s/ingress-alb-fixed.yaml` (or whatever Ingress your hostname uses).
- JTS must be reached as **`https://<api-host>/jts/...`** and **`https://<api-host>/api/jts/...`** directly on **`jts-service:3018`**.
- You **do not** need `src/server.js`, `src/config/services.config.js`, or `deploy-api-gateway-aws.sh` for that setup.
- The optional **`k8s/etelios-prod/api-gateway-ingress.yaml`** is irrelevant unless you intentionally expose a gateway.

---

## Go live now (Ingress + Docker — one command)

From **repo root**, with **AWS CLI**, **Docker**, and **kubectl** pointed at **prod**:

```bash
./scripts/deploy-jts-aws.sh
```

This will:

1. Build `microservices/jts-service` and push **`:TAG`** + **`:latest`** to ECR  
2. `kubectl apply` **`k8s/etelios-prod/jts-service-deployment.yaml`**  
3. `kubectl apply` **`k8s/ingress-alb-fixed.yaml`** (so **`/jts`** and **`/api/jts`** hit JTS; catch‑all **`/`** stays last)  
4. **`rollout restart`** + wait for **`jts-service`** to be ready  

To **skip** applying ingress (if another team owns ALB YAML): `APPLY_INGRESS=0 ./scripts/deploy-jts-aws.sh`  

**CI option:** GitHub → **Actions** → **JTS prod — ECR + optional kubectl** (`workflow_dispatch`). Configure repo secrets as described in that workflow file.

We cannot run this from Cursor; you (or CI) must execute it against your cluster.

---

## What is already wired

- **K8s:** `k8s/etelios-prod/jts-service-deployment.yaml` — Deployment + Service (`jts-service`, port **3018**, namespace `etelios-prod`).
- **Ingress:** Production traffic on **`etelios-ingress`** (ALB) must include **`/jts`** and **`/api/jts`** → `jts-service:3018`.  
  - `k8s/ingress-alb-fixed.yaml` — **source of truth for ALB** (apply this if `curl` shows `service":"auth-service"` for `/jts`).  
  - **Critical:** the catch-all `path: /` → auth must be **last** in the paths list; if `/` is first, **every** path (including `/jts/*`) can be sent to auth on ALB.  
  - `k8s/etelios-prod/api-gateway-ingress.yaml` — separate `etelios-api-ingress` (often no ALB); **not** enough if the live hostname uses `etelios-ingress` only.
- **Docker:** `microservices/jts-service/Dockerfile`
- **ECR image:** `383234048604.dkr.ecr.ap-south-1.amazonaws.com/etelios-jts-service:latest` (update tag for immutable releases).

The app serves both URL shapes on **the same JTS process** (Ingress routes both prefixes to port **3018**):

- `https://api.etelios.com/jts/...`
- `https://api.etelios.com/api/jts/...`

Set **`JTS_PUBLIC_PATH_PREFIX=/jts`** in prod so attachment links in JSON match the primary ingress URL (already in `jts-service-deployment.yaml`).

---

## 1) Build, push to ECR, rollout (recommended)

From **repo root** (requires Docker, AWS CLI, kubectl → prod cluster):

```bash
./scripts/deploy-jts-aws.sh
```

- Pushes **`:TAG`** (git short SHA) and **`:latest`** to ECR.
- `kubectl apply` the deployment manifest and **`rollout restart`** so nodes pull the new `:latest` (`imagePullPolicy: Always`).

Push image only (no cluster access):

```bash
SKIP_KUBECTL=1 ./scripts/deploy-jts-aws.sh
```

### Manual build/push (alternative)

```bash
cd microservices/jts-service
export AWS_REGION=ap-south-1
export ACCOUNT_ID=383234048604
export REPO=etelios-jts-service
export TAG="${TAG:-$(git rev-parse --short HEAD)}"

aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

docker build -t $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO:$TAG .
docker tag $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO:$TAG $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO:latest

docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO:$TAG
docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO:latest
```

To pin a release, edit the Deployment image to `:TAG` instead of `:latest`.

---

## 2) Secrets / config (cluster)

Ensure in `etelios-prod`:

| Name | Used for |
|------|-----------|
| `docdb-credentials` | Same keys as **auth-service / hr-service**: `MONGO_URI`, `MONGODB_URI`, `MONGO_DB_NAME`, `DB_NAME` (do **not** use `endpoint` / `username` / `password` unless your secret actually defines them — wrong keys → `CreateContainerConfigError`) |
| `ecr-registry-secret` | Pull from ECR |

**Critical:** `JWT_SECRET` in the Deployment **must match** the value used by **auth-service** so JTS accepts login tokens.

Optional: AWS keys via Secret for SES/S3 if not using IRSA/node role.

---

## 3) Apply manifests (updated files → prod, correct order)

**Live traffic uses ALB `etelios-ingress`** (`k8s/ingress-alb-fixed.yaml`), not only `api-gateway-ingress`.

One shot from repo root:

```bash
./scripts/apply-jts-prod-yamls.sh
```

Or manually:

```bash
kubectl apply -f k8s/etelios-prod/jts-service-deployment.yaml
kubectl apply -f k8s/ingress-alb-fixed.yaml
kubectl -n etelios-prod rollout status deployment/jts-service --timeout=300s
```

**Ingress-only prod:** skip **`api-gateway-ingress`** unless you actually run a gateway.

---

## 4) Verify

### Ingress-only: what you should see

- **`curl -sS https://<api-host>/jts/health`** (or authenticated **`/jts/tasks?...`**) should return **JTS** JSON (`service: jts-service`, **`AUTH_REQUIRED`** on protected routes, etc.).
- **`kubectl describe ingress …`** for your hostname: backends for **`/jts`** and **`/api/jts`** must be **`jts-service:3018`**, and the catch‑all **`/`** rule must **not** steal `/jts` (usually **`/`** is **last** in the path list).

### If you see `hint: "Check /api endpoint for available services"`

That string is from the **optional API Gateway** (`src/server.js`), not from JTS. If you **do not use** a gateway in prod, then **something** in front (wrong Ingress backend, old default rule, or another LB) is still hitting gateway code — fix **routing**, not `services.config.js`.

**Only if you intentionally use API Gateway:** proxy **`/jts`** and **`/api/jts`** to **`http://jts-service:3018`** (`src/config/services.config.js`), build/push the gateway image, and rollout — see **`./scripts/deploy-api-gateway-aws.sh`**.

---

```bash
kubectl -n etelios-prod get pods -l app=jts-service
kubectl -n etelios-prod logs -l app=jts-service --tail=100

# ALB routes only path prefix /jts to this service — use port-forward for pod /health:
kubectl -n etelios-prod port-forward svc/jts-service 3018:3018
curl -sS http://127.0.0.1:3018/health
```

Authenticated JTS check (real token):

```bash
curl -sS -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT_ID" \
  "https://api.etelios.com/jts/tasks?page=1&limit=5"
```

---

## 5) Post-deploy checklist

- [ ] `JWT_SECRET` aligned with auth-service  
- [ ] Mongo/DocumentDB reachable; JTS collections seeded (task types, org, employees, SLA rules)  
- [ ] `REDIS_URL` correct for Bull/notifications  
- [ ] `ATTENDANCE_SERVICE_URL` reachable from cluster  
- [ ] `REALTIME_SERVICE_URL` correct port (e.g. `3017`)  
- [ ] S3 bucket + IAM for attachments (`JTS_ATTACHMENTS_S3_*`)  
- [ ] `JTS_TIMER_ATTENDANCE_MODE` = `strict` or `auto` per policy  
- [ ] `TEST_MODE` **not** set in prod  

Full API validation: `docs/JTS_REAL_DATA_VALIDATION_10_CALLS.md` (use `BASE_URL=https://api.etelios.com/jts` for ingress-aligned paths).

---

## 6) Rollout stuck: `1 old replicas are pending termination`

**Cause:** RollingUpdate keeps an old pod until the new one is Ready; on **low CPU** clusters the new pod may not schedule, or an old pod stays **Terminating** forever.

**Fix (run in order):**

```bash
NS=etelios-prod

# 1) See every jts pod + phase
kubectl -n "$NS" get pods -l app=jts-service -o wide

# 2) Anything Terminating? Force-remove (repeat for each name)
kubectl -n "$NS" get pods -l app=jts-service --field-selector=status.phase!=Running -o wide
kubectl -n "$NS" delete pod <POD_STUCK_TERMINATING> --grace-period=0 --force

# 3) Apply manifest with Recreate + 1 replica (repo: k8s/etelios-prod/jts-service-deployment.yaml)
kubectl apply -f k8s/etelios-prod/jts-service-deployment.yaml

# 4) If new pod still Pending → Insufficient cpu: lower requests or free nodes
kubectl -n "$NS" describe pod -l app=jts-service | tail -40

# 5) If CrashLoop / CreateContainerConfigError → fix env/secrets, then:
kubectl -n "$NS" rollout restart deployment/jts-service
kubectl -n "$NS" rollout status deployment/jts-service --timeout=180s
```
