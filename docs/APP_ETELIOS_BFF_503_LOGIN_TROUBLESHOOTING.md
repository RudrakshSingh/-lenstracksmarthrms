# `app.etelios.com` — `/api/auth/login` 503 vs `api.etelios.com` (troubleshooting)

**Problem:** Browser shows `**POST https://app.etelios.com/api/auth/login` → 503** while direct API may work.

## 1) Two different hosts


| Host                          | Role                                                                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `**https://api.etelios.com`** | API gateway / backend (`auth-service`, `hr-service`, …)                                                                                   |
| `**https://app.etelios.com`** | **Web app + Next.js Route Handlers** (`/api/*` = BFF). Login often goes **here first**, then the server proxies to `**api.etelios.com`**. |


A **503 on `app.etelios.com`** usually means: **the app server / ALB target / serverless runtime** failed — not necessarily that `auth-service` is down.

## 2) Quick checks (anyone)

```bash
# Backend auth (should be 200)
curl -sS --max-time 15 "https://api.etelios.com/api/auth/health"

# App BFF — same auth health if proxied (should be 200 when healthy)
curl -sS --max-time 15 "https://app.etelios.com/api/auth/health"

# App BFF login — bad body should NOT be 503 if route is up (often 400/401 from upstream)
curl -sS --max-time 20 -X POST "https://app.etelios.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"x@y.com","password":"bad"}'
```

- If `**api` OK** but `**app` 503** → fix **frontend deployment / BFF env / ALB** for `app.etelios.com`.
- If **both fail** → broader outage / network.

## 3) Frontend / infra fix list (owners of `app.etelios.com` deploy)

1. **Env on the Next app:** `API_URL` / `BACKEND_URL` / whatever the BFF uses must be `**https://api.etelios.com`** (no typo, no stale IP).
2. **Server logs** for the Route Handler `app/api/auth/login` — look for `fetch failed`, `ECONNRESET`, DNS, timeout.
3. **ALB / target group** for `app.etelios.com` — unhealthy targets, 503 during deploys, connection draining.
4. **Intermittent 503:** retry after 1–2 minutes; if it persists, it’s not “Lenstrack tenant” — it’s hosting.

## 4) What this repo can change

**Backend (`api.etelios.com`)** lives in `microservices/*` and K8s ingress for `**api.etelios.com`**.

`**app.etelios.com`** is usually the **Next.js app** (separate deploy). **Auth-service code** does not power `app.etelios.com` by itself — unless you **route that hostname to the same ALB** and add ingress rules.

**Optional (ops / same ALB):** If `app.etelios.com` DNS points to the **same AWS ALB** as `api.etelios.com`, you can add `**host: app.etelios.com`** with the same `/api/auth` (etc.) paths so `/api/`* hits **auth-service** without the Next BFF. See `**docs/K8S_APP_ETELIOS_SAME_ALB_OPTION.md`**.

## 5) Security note

Do not paste **access_token** / **refresh_token** in chats or tickets. Rotate if leaked.

---

**Doc version:** 1.0