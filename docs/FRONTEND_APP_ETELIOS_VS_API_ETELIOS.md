# Frontend dev handoff — `app.etelios.com` vs `api.etelios.com` (503, BFF, kya karna hai)

**Audience:** Shell / Next.js / HRMS MFE developers  
**Purpose:** Samjho **kaunsi URL** se API call karni hai aur **`503` + “Backend API unavailable”** ka matlab kya hai — taaki galat team par blame na jaye.

---

## 1) Do alag “doors” hain

| URL | Typical role |
|-----|----------------|
| **`https://api.etelios.com`** | **Real backend** (EKS + ALB + `auth-service`, `hr-service`, …). `POST /api/auth/login` yahan **direct** microservice tak jaata hai. |
| **`https://app.etelios.com`** | **User-facing web app** (Next.js, etc.). Iska **`/api/*`** **zaroori nahi** ki seedha cluster ko mile — aksar ye **Next Route Handler (BFF)** hota hai jo **andar se** `api.etelios.com` ko call karta hai. |

**Important:** Browser mein **`fetch('/api/auth/login')`** same-origin se **`app.etelios.com/api/...`** par jaati hai — **pehle app server**, phir (agar aapne aisa banaya hai) wahan se upstream.

---

## 2) `503` on `app.etelios.com/api/auth/login` — iska matlab

- **503** = “service unavailable” — **jo server ne request handle ki**, wo **upstream** ko serve nahi kar paaya **ya** khud fail ho gaya.
- Agar response headers mein **`vary: rsc, next-router-state-tree...`** jaise **Next.js** wale headers dikhen, to **503 zyada tar Next/BFF** se aa raha hai, **`api.etelios.com` ke auth-service se seedha nahi**.
- **`api.etelios.com/api/auth/login` same time par 200 de raha ho** → **backend login handler** healthy hai; problem **app host / BFF / DNS path** ki taraf hai.

---

## 3) Backend ne kya kiya (infra — tumhari debugging ke liye)

- Cluster **Ingress** (`etelios-ingress`) par **`host: app.etelios.com`** bhi add ho sakta hai taaki **ALB** par `app` ke liye bhi wahi **`/api/auth`** → `auth-service` rules hon.
- **Isse tabhi fayda** jab **`app.etelios.com` DNS** **usi ALB** ko point kare jahan **`api.etelios.com`** hai.  
  Agar **`app`** ab bhi **Vercel / alag IP / CDN** par hai, to request **cluster ingress tak nahi pahunchti** — tab bhi tumhe **Next** hi response dega.

**Frontend dev verify (optional):**  
`dig app.etelios.com` vs `dig api.etelios.com` — same target family? Ops team se confirm karo.

---

## 4) Frontend par practical fix (choose one strategy)

### Strategy A — **Direct API (sabse clear)**

- Browser / client se **`https://api.etelios.com`** use karo for REST:
  - `NEXT_PUBLIC_API_URL=https://api.etelios.com` (ya equivalent)
- **CORS:** backend par `app.etelios.com` origin allow hona chahiye (backend team / CORS env).
- **Headers:** `Authorization: Bearer …`, **`X-Tenant-Id: <tenant>`** (Lenstrack ke liye `lenstrack`) — golden rules tumhare `FRONTEND_LENSTRACK_BACKEND_FIXES_API_REFERENCE.md` jaisi docs mein hain.

**Pros:** BFF 503 se bachte ho.  
**Cons:** CORS + env sahi hona zaroori.

### Strategy B — **Same-origin `/api` on `app` (jab DNS same ALB par ho)**

- Jab **`app.etelios.com`** **same ALB** par ho aur ingress **`/api/auth`** ko cluster bhele, tab **`fetch('/api/...')`** relative **sach mein backend** ko ja sakta hai **without** Next proxy.
- Is case mein **Next Route Handler** ko `/api/auth/*` par **duplicate na** rakho warna conflict / pehle Next catch kar lega.

### Strategy C — **BFF rakhna hai to theek karo**

- Next `app/api/auth/login/route.ts` (path example) mein **`fetch(process.env.API_URL + '/api/auth/login', …)`** jaisa upstream, **timeout / retry**, **galat env** fix.
- **`API_URL` / `BACKEND_URL`** prod = **`https://api.etelios.com`** (typo / stale IP mat rakho).

---

## 5) Debugging checklist (jaldi)

1. Network tab: **failed request ka full URL** — `app` vs `api`.
2. **Status 503** — response body + **response headers** (Next vs plain JSON).
3. **`api.etelios.com/api/auth/health`** browser ya curl se **200**?
4. Login body: `email` + `password` (ya `emailOrEmployeeId`), **`x-tenant-id`** jahan zaroori ho.

---

## 6) Related docs (is repo mein)

| Doc | Topic |
|-----|--------|
| [`FRONTEND_AUTH_AND_ROUTING_COMPLETE_GUIDE.md`](./FRONTEND_AUTH_AND_ROUTING_COMPLETE_GUIDE.md) | Login payload, `defaultLandingPath`, flow |
| [`FRONTEND_LENSTRACK_BACKEND_FIXES_API_REFERENCE.md`](./FRONTEND_LENSTRACK_BACKEND_FIXES_API_REFERENCE.md) | Tenant + JWT alignment |
| [`APP_ETELIOS_BFF_503_LOGIN_TROUBLESHOOTING.md`](./APP_ETELIOS_BFF_503_LOGIN_TROUBLESHOOTING.md) | 503 vs BFF |
| [`K8S_APP_ETELIOS_SAME_ALB_OPTION.md`](./K8S_APP_ETELIOS_SAME_ALB_OPTION.md) | Ops: same ALB + ingress |

---

## 7) Security

Login / support ke liye **tokens chat / ticket mein paste mat karo** — rotate agar leak ho.

---

**Document version:** 1.0
