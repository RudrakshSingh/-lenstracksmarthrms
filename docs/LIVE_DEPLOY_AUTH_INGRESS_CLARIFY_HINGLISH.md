# Live par auth code kaise jaye — Ingress vs actual deploy (Hinglish)

**Tumhara direct AWS prod flow (Docker + ECR + kubectl, git nahi):** poora copy-paste guide → **`docs/AWS_PROD_DOCKER_DEPLOY_DIRECT_HINGLISH.md`**.

---

## Important: Ingress “push” nahi karti

**Ingress** (tumhara `etelios-ingress` / ALB `api.etelios.com`) sirf **HTTP route** karti hai: kaunsa path kis **Service** ko jaye.

- Code / Docker image **ingress apply** se update **nahi** hota.
- Naya code live tab aata hai jab:
  1. **Naya Docker image** bano (auth-service),
  2. **ECR** par **push** karo,
  3. **EKS** mein `auth-service` **Deployment** ka image tag **update** karo → naye **Pods** chalenge,
  4. Ingress **wahi** Service ko point karti rahegi — traffic automatically naye pods par chala jata hai.

Matlab: **“ingress se live push”** = pehle image + kubectl, ingress ko dubara apply karne ki zaroorat **aksar nahi** (jab tak path / cert change na ho).

---

## Sirf auth-service release (git optional)

Repo root par:

```bash
chmod +x scripts/etelios-prod-auth-only-release.sh
./scripts/etelios-prod-auth-only-release.sh
```

Optional apna tag:

```bash
RELEASE_TAG=userid-202604101200 ./scripts/etelios-prod-auth-only-release.sh
```

Yeh script:

- `aws ecr login` (region default `ap-south-1`, registry repo jaisa `k8s/etelios-prod` mein hai),
- `docker build` — **context repo root** (Dockerfile `microservices/auth-service/Dockerfile`),
- `docker push` `…/etelios-auth-service:<TAG>`,
- `kubectl -n etelios-prod set image deployment/auth-service auth-service=…`,
- `rollout status` wait karti hai.

**Chahiye:** Docker, AWS CLI (ECR rights), `kubectl` context **etelios-prod** cluster par.

---

## Agar sirf kubectl se image badalna ho (build pehle ho chuka ho)

```bash
export ECR=383234048604.dkr.ecr.ap-south-1.amazonaws.com
export NS=etelios-prod
export AUTH_TAG=your-tag-here

kubectl -n "$NS" set image deployment/auth-service auth-service="$ECR/etelios-auth-service:$AUTH_TAG"
kubectl -n "$NS" rollout status deployment/auth-service --timeout=300s
```

Yeh wahi pattern hai jo `scripts/etelios-prod-set-images.sh` auth ke liye use karta hai (wo script saath mein hr/jts wagaira bhi badal deti hai — sirf auth ke liye upar wala script use karo).

---

## Manifest sync (baad mein)

Taaki koi `kubectl apply -f k8s/etelios-prod/auth-service-deployment.yaml` purana tag wapas na la de, YAML mein bhi image tag update karna best practice hai — **git ke bina bhi** file edit karke rakh sakte ho.

---

## Zyada services ek saath (auth + hr + jts + …)

```bash
./scripts/etelios-prod-quick-core-release.sh
# optional: RELEASE_TAG=permrbac-YYYYMMDDHHMM ./scripts/etelios-prod-quick-core-release.sh
```

Detail: `k8s/etelios-prod/README.md`.

---

*ECR account / region tumhare cluster jaisa hi rakho; yahan jo paths hain wo is repo ke `k8s/etelios-prod` snapshots se match karte hain.*
