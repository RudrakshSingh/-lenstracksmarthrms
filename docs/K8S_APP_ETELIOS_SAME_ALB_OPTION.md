# Optional: `app.etelios.com` ko same ALB + same `/api/*` routes (backend / ops)

**Problem this fixes:** Browser hits `https://app.etelios.com/api/auth/login` and gets **503** because traffic goes to the **Next.js host** (BFF). If that BFF is down, misconfigured, or cold-starting, login fails even when **`https://api.etelios.com/api/auth/login`** is healthy.

**What this does:** Same **Kubernetes Ingress** (e.g. `etelios-ingress`) par **second `host` rule** add karo: `app.etelios.com`, with **the same path prefixes** as `api.etelios.com` for `/api/auth`, `/api/hr`, etc. Then requests to:

`https://app.etelios.com/api/auth/login`

can be served **directly by `auth-service` in the cluster** — **no Next proxy required** for those paths.

**Requirements (all must be true):**

1. **DNS:** `app.etelios.com` **A/ALIAS** → **same AWS ALB** as `api.etelios.com` (not Vercel-only, unless you also proxy).
2. **TLS:** ACM certificate used on the ALB **includes** `app.etelios.com` (SAN).  
   - Certificate ARN on ingress: see `k8s/etelios-prod/etelios-ingress.json` → `alb.ingress.kubernetes.io/certificate-arn`.
3. **Ingress:** Duplicate **`spec.rules`** entry: copy the `api.etelios.com` rule, change **`host`** to `app.etelios.com`, keep **paths/backends** identical for API prefixes.

**Reference ingress (prod):** `k8s/etelios-prod/etelios-ingress.json` — includes **`host: api.etelios.com`** and **`host: app.etelios.com`** with the **same `http.paths`** (duplicate rule). Apply with `kubectl apply -f k8s/etelios-prod/etelios-ingress.json` after DNS/TLS checks.

**Apply:** After editing, `kubectl apply -f ...` in `etelios-prod`, verify ALB listener rules and target health.

**Frontend (recommended after this):** Point client API base to **relative** `/api` on the app origin, or `https://app.etelios.com/api` — same as page origin — so no cross-origin for API calls.

**If you cannot move DNS** to the cluster ALB, this option **does not apply**; fix remains **Next BFF env / deployment** on whatever hosts `app.etelios.com` today.

---

**Related:** `docs/APP_ETELIOS_BFF_503_LOGIN_TROUBLESHOOTING.md`
