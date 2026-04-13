# AWS prod — direct Docker deploy (git nahi)

**Tumhara flow:** local / pipeline par **Docker image** banao → **Amazon ECR** push → **EKS** par `kubectl set image` → rollout. **Ingress / ALB** (`api.etelios.com`) pehle se cluster se juda hai — **naya code ke liye ingress dubara apply karna zaroori nahi**; naye pods aate hi traffic wahi se unhi paths par naye code par chala jata hai.

**Git:** is deploy path mein **commit/push ki zaroorat nahi**. Sirf wahi machine jahan Docker + AWS CLI + kubectl configured ho.

---

## 1. Pehle ek baar check

- `kubectl config current-context` → **etelios-prod** wala EKS cluster
- `aws sts get-caller-identity` → ECR push + EKS rights wala account
- Docker running

---

## 2. Auth-service live (recommended — ek script)

Repo **root** se:

```bash
cd /path/to/lenstracksmarthrms
./scripts/etelios-prod-auth-only-release.sh
```

Apna tag (optional):

```bash
RELEASE_TAG=auth-202604101530 ./scripts/etelios-prod-auth-only-release.sh
```

Script kya karti hai (AWS):

1. `aws ecr get-login-password` → `docker login` **383234048604.dkr.ecr.ap-south-1.amazonaws.com**
2. `docker build --platform linux/amd64` `-f microservices/auth-service/Dockerfile` **context = repo root**
3. `docker push` → `…/etelios-auth-service:<TAG>`
4. `kubectl -n etelios-prod set image deployment/auth-service auth-service=<full image>`
5. `kubectl rollout status deployment/auth-service`

**Region / registry** alag ho to:

```bash
export AWS_REGION=ap-south-1
export ECR=383234048604.dkr.ecr.ap-south-1.amazonaws.com
export NS=etelios-prod
./scripts/etelios-prod-auth-only-release.sh
```

---

## 3. Haath se (bina script) — same cheez

```bash
cd /path/to/lenstracksmarthrms
export R=383234048604.dkr.ecr.ap-south-1.amazonaws.com
export REGION=ap-south-1
export NS=etelios-prod
export TAG=auth-$(date +%Y%m%d%H%M)

aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$R"

DOCKER_BUILDKIT=1 docker build --platform linux/amd64 \
  -f microservices/auth-service/Dockerfile \
  -t "${R}/etelios-auth-service:${TAG}" .

docker push "${R}/etelios-auth-service:${TAG}"

kubectl -n "$NS" set image deployment/auth-service \
  auth-service="${R}/etelios-auth-service:${TAG}"

kubectl -n "$NS" rollout status deployment/auth-service --timeout=300s
```

---

## 4. Core stack ek saath (auth + hr + attendance + jts + sales + api-gateway)

Jab sirf auth nahi, poora “core” ek tag par chahiye:

```bash
./scripts/etelios-prod-quick-core-release.sh
# optional:
# RELEASE_TAG=permrbac-202604101600 ./scripts/etelios-prod-quick-core-release.sh
```

Yeh **5 images** parallel build/push + **6 deployments** update karti hai. **Git nahi.**

---

## 5. Ingress kab chhedna hai

- **Sirf app version badalna:** ingress / ALB **mat chhedo**.
- **Naya path / host / SSL:** tab `k8s/etelios-prod/etelios-ingress.json` (ya tumhara export) `kubectl apply` — yeh **routing** change hai, code deploy alag.

Detail: `k8s/etelios-prod/README.md`.

---

## 6. Verify live

```bash
kubectl -n etelios-prod get pods -l app=auth-service
kubectl -n etelios-prod describe deployment auth-service | grep Image
```

API smoke (example):

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://api.etelios.com/health
```

---

*Yeh document sirf AWS ECR + EKS flow ke liye hai; Azure ACR wale manifests alag repo paths par ho sakte hain.*
