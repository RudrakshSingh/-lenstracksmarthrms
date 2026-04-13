# JTS with Ingress + Docker only (no API Gateway in the path)

**Etelios production uses this model:** ALB / Ingress → Services (e.g. `jts-service:3018`), **not** the repo root `api-gateway` app.

If you **do not** run the root `api-gateway` deployment and traffic is **ALB/Ingress → microservices only**, JTS is reached when:

1. **ALB Ingress** (e.g. `k8s/ingress-alb-fixed.yaml`) routes **`/jts`** and **`/api/jts`** to **`jts-service:3018`**.
2. The **catch‑all `path: /`** rule is **after** `/jts` (otherwise `/jts/*` can go to auth or another backend).

## What you deploy

- **Image:** build/push `microservices/jts-service` and set it in `k8s/etelios-prod/jts-service-deployment.yaml`.
- **Apply:** that deployment + `jts-service` Service (port 3018) + the Ingress manifest your cluster actually uses.

No need to build the root `Dockerfile` API Gateway for JTS if nothing in front uses it.

## If you still see this JSON

```json
{ "success": false, "error": "ROUTE_NOT_FOUND", "hint": "Check /api endpoint for available services" }
```

That **exact** `hint` string comes from **`src/server.js`** in this repo (the API Gateway app). So **some** hop in front of you is still running that gateway, or DNS points to a load balancer that targets it.

**Ground truth checks:**

```bash
kubectl get ingress -n etelios-prod -o wide
kubectl describe ingress etelios-ingress -n etelios-prod
```

Confirm for `api.etelios.com` that `/jts` and `/api/jts` backends are **`jts-service:3018`**, not `api-gateway` or a single default service.

```bash
curl -sS -o /dev/null -w "%{http_code}\n" -H "Host: api.etelios.com" "https://<ALB_DNS>/jts/health"
```

You should get **200** from JTS (or **401** on protected routes with JTS-style body), not the gateway `ROUTE_NOT_FOUND` hint.

## Repo layout note

- **Ingress + services:** `k8s/ingress-alb-fixed.yaml`, `k8s/ingress.yaml`, per-service deployments.
- **Optional gateway:** `src/server.js`, `k8s/deployments/api-gateway.yaml` — only relevant if you **choose** to put that deployment behind the ALB.

For “Docker + Ingress only,” treat the gateway files as **optional**; the live Ingress rules are what matter.
