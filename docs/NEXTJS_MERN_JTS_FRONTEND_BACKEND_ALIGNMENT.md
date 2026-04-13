# Next.js (MERN) frontend ↔ JTS/HR backend — gaps from reported errors & how to align

**Stack assumption:** Browser app on **Next.js** (App Router or Pages), API = **Node/Express microservices** (HR hosts **`/api/jts/*` proxy** in dev/some prod paths). This repo ships **`packages/hrms-mfe/lib/api/jts-client.ts`** and **`packages/hrms-mfe/lib/jts/jts-error.ts`** — your Next app should **consume these** so paths and headers match the backend.

---

## 1. Errors you reported → root cause → frontend fix

| What you saw | Likely cause | Backend status | **Frontend must do** |
|--------------|--------------|----------------|------------------------|
| `POST …/api/jts/tasks` → **409**, `TASK_CODE_DUPLICATE` | Duplicate task **code** (race / counter); sometimes transient | **Fixed** in jts-service (atomic counter, no txn on counter, proxy maps E11000→409) | Use **`resolveJtsErrorBody` / `getJtsErrorMessage`** for toasts; offer **Retry** once on 409; do **not** treat as “validation” on title. |
| Same call showed **raw Mongo E11000** in body | Old error mapping | **Fixed** (`resolveApplicationErrorCode`, HR proxy) | If any response still shows raw text, ensure you’re on **deployed** HR+JTS images; parse `code` / `error` field first. |
| DevTools: **Bearer** = user A, **Cookie** `access_token` = user B | Two sessions mixed | N/A (by design: JWT is source of truth for API if only Bearer forwarded) | **Single token source:** e.g. only `Authorization` from memory/httpOnly cookie you control, **or** `credentials: 'include'` with **no** duplicate Bearer from stale state. Clear cookies on tenant/user switch. |
| **`X-Tenant-Id: lenstrack`** but weird behaviour | Header ≠ JWT tenant (or stale UI tenant) | HR: JWT usually wins unless `STRICT_TENANT_HEADER` | After login, set tenant from **`user.tenantId`** in login response / decoded JWT; send **`X-Tenant-Id`** = that value (lowercased). |
| **`JTS_ACTOR_EMPLOYEE_NOT_RESOLVED`** (403) | Logged-in user has no **JTS Employee** row linked | Backend: bind-from-jwt + HR lookup improved | On JTS routes, call **`POST /api/jts/catalog/employees/bind-from-jwt`** (Bearer + `X-Tenant-Id`) **before** task actions if profile says unlinked; surface copy from `jts-error.ts`. |
| **`GET /api/hr/employee/:id`** 500 on performance | Wrong ID type in performance query | **Fixed** in hr-service | Frontend OK if it passes **Mongo `_id`** from HR employee record (not business code) for that route. |
| **Upcapto**: login OK, “**Access denied**” on screens | Not login failure — **next API** returned 403 | N/A | See **`docs/UPCAPTO_LOGIN_ACCESS_DENIED_TROUBLESHOOTING.md`**: check **role**, **permissions**, **`INSUFFICIENT_*`**, **`TENANT_MISMATCH`**, wrong route (employee vs admin). |

### Backend verification — what is actually “fixed” in code vs still client-side

Checked against this repo (`jts-service`, `hr-service`):

| Topic | Backend | Still on frontend / ops |
|-------|---------|-------------------------|
| **409 / `TASK_CODE_DUPLICATE`** | **Yes.** Atomic `TaskCodeCounter`, counter **not** inside txn session, retries, `resolveApplicationErrorCode` → stable `code`, HR proxy maps E11000-style failures to **409**. | Toasts / retry UX; confirm prod runs **deployed** images. |
| **Bearer vs cookie `access_token`** | **No server “merge”.** Proxies forward **`Authorization`**; they do not pick one identity when browser sends two. | **Single session** in Next.js: don’t mix stale cookie + new Bearer; clear on logout / tenant switch. |
| **`X-Tenant-Id` mismatch** | **Mitigated.** HR `validateTenantMiddleware`: if header ≠ JWT, **JWT wins** (warn) unless `STRICT_TENANT_HEADER=true` → `TENANT_MISMATCH`. JTS can bridge slug ↔ ObjectId. | Still send **`X-Tenant-Id` = JWT `tenantId`** to avoid strict 403 and noisy logs. |
| **`JTS_ACTOR_EMPLOYEE_NOT_RESOLVED`** | **Improved, not eliminated.** `POST /api/jts/catalog/employees/bind-from-jwt` is open to any authenticated user; service can call HR to bootstrap catalog. **403 is still correct** if user cannot be linked (no HR employee / missing org). | Call **bind-from-jwt** before task flows when needed; show **`jts-error`** copy if 403 remains. |

---

## 2. URL contract (don’t invent paths)

Backend exposes JTS under:

- **Via gateway / same pattern as E2E:** `GET /jts/health`, `POST /jts/tasks`, … (some hosts strip `/api`).
- **Via HR origin (your localhost case):** **`/api/jts/...`** → HR **proxies** to jts-service.

The shared **`JtsClient`** in this repo uses **`apiBase = '/api'`** → requests go to **`/api/jts/tasks`**, **`/api/jts/self-tasks`**, etc. That matches **`microservices/hr-service`** proxy. **Do not** point the browser at jts-service `:3018` directly unless CORS and auth are explicitly configured for that.

Reference implementation: `packages/hrms-mfe/lib/api/jts-client.ts` (paths built by `createJtsPathBuilder`).

---

## 3. Headers contract (every JTS / HR call)

| Header | Rule |
|--------|------|
| `Authorization` | `Bearer <accessToken>` from **current** login. |
| `X-Tenant-Id` | Same as JWT `tenantId` (e.g. `lenstrack`, `upcapto`). Lowercase trim. |
| `Content-Type` | `application/json` for POST/PUT/PATCH. |

**`JtsClient`** already sets Accept + Content-Type + optional tenant (`getTenantId` callback). **Gap:** if your Next layer also sets **cookies** and your API route **forwards** cookies to HR, ensure you don’t **also** attach an old Bearer from React state — pick one coherent session.

---

## 4. Task create body (align with jts-service)

`POST /api/jts/tasks` (manager route) expects at least:

- `title` (required, min length 3)
- `type_id` or `typeId` (ObjectId hex string) — often from catalog
- `scope_org_node_id` or `scopeOrgNodeId` — from catalog  
  Backend may fill defaults via **`catalogDefaults`** when tenant is bootstrapped; UI should still load **task types** + **org nodes** and send IDs when possible.

Use **`createSelfTask`** → `POST .../jts/self-tasks` for **non-manager** flows (employee self-task), not `POST .../tasks`.

---

## 5. Next.js–specific gaps to close

1. **`getAccessToken` / `getTenantId` in `JtsClient` config**  
   Wire to the **same** place your layout uses for HR APIs (Zustand, Context, or session). After `router.push` login, ensure token is readable synchronously or gate JTS pages until hydrated.

2. **API Route / Route Handler proxy**  
   If you use `app/api/.../route.ts` to forward to backend, **forward `Authorization` and `X-Tenant-Id`** explicitly; don’t rely on browser sending cookies to Next **and** a different token in `Authorization` without documenting which wins.

3. **`fetch` defaults**  
   For same-origin `/api/...`, `credentials: 'include'` may send **NextAuth** or legacy cookies. If that conflicts with Bearer, use **`credentials: 'same-origin'`** or omit cookies for JSON API calls — **choose one auth strategy**.

4. **Error UI**  
   On catch, read `err.body` if you throw from a thin wrapper around `JtsClient`, or parse JSON from `response.json()` and pass to **`resolveJtsErrorBody(body)`** before `toast.error(...)`.

5. **409 on task create**  
   Backend fix reduces frequency; UI should still **retry once** or ask user to retry — not block forever.

---

## 6. Minimal checklist before shipping JTS screens

- [ ] All JTS calls go through **`JtsClient`** (or exact same URLs as `jts-client.ts`).
- [ ] Tenant id from **login/JWT**, not hardcoded.
- [ ] Manager vs employee: **`createTask`** vs **`createSelfTask`**.
- [ ] Toasts use **`jts-error.ts`** for known codes.
- [ ] After login as different user, **no stale token** in `localStorage` + cookie mismatch.
- [ ] Bind flow exists or clear message for **`JTS_ACTOR_EMPLOYEE_NOT_RESOLVED`**.

---

## 7. Frontend — remaining work (jo abhi implement / polish bacha hai)

Yeh is repo ke **shared MFE libs** (`packages/hrms-mfe`) vs tumhara **Next.js app** (agar alag repo mein hai) — dono mila kar dekho. Backend deploy ke baad bhi ye **frontend tasks** pending ho sakte hain.

### P0 — correctness (pehle ye)

| # | Kaam | Detail |
|---|------|--------|
| 1 | **`JtsClient` + `getAccessToken` / `getTenantId` wire-up** | Next app mein har JTS call same auth store se aaye (login ke baad token + tenant sync). |
| 2 | **Ek hi session (Bearer vs cookie)** | Logout / tenant switch par purana `access_token` cookie + `localStorage` clear; API calls par duplicate identity na bhejein. |
| 3 | **`X-Tenant-Id` har request par** | Value hamesha **JWT / login response** ke `tenantId` se — hardcode / stale `localStorage` tenant na ho. |
| 4 | **409 → user message + optional retry** | `resolveJtsErrorBody` / `getJtsErrorMessage` se toast; task create par **ek baar auto-retry** ya “Dobara try” button. |
| 5 | **`JTS_ACTOR_EMPLOYEE_NOT_RESOLVED` flow** | Task / JTS screens se pehle **`POST /api/jts/catalog/employees/bind-from-jwt`** (jab 403 aaye ya first load par guard); phir bhi 403 ho to `jts-error` copy. |
| 6 | **Manager vs employee route** | Managers: `createTask` (`POST .../tasks`); employees: `createSelfTask` (`POST .../self-tasks`) — galat route = 403. |
| 7 | **Task body: `typeId` + `scopeOrgNodeId`** | Catalog se load karke bhejein (defaults backend par depend na chhodo jab tak tenant bootstrap sure na ho). |

### P1 — UX / polish

| # | Kaam | Detail |
|---|------|--------|
| 1 | **403 “Access denied” breakdown** | Network tab se `error` / `code` (`INSUFFICIENT_ROLE`, `TENANT_MISMATCH`, …) — UI par alag copy, generic “access denied” ek hi na dikhe. |
| 2 | **Loading / empty catalog** | Task type ya org node na mile to create button disable + clear message. |
| 3 | **Onboarding / JTS entry** | Pehli baar JTS open: bind step ya “linking…” state, taaki user ko pata ho employee link pending hai. |
| 4 | **Next.js API routes** | Agar `app/api/*` se proxy ho raha ho to `Authorization` + `X-Tenant-Id` explicitly forward; “kaunsa token winner hai” document karo. |

### QA / verification (staging ya prod)

- [ ] Login → **JTS task create** end-to-end (same headers as production app).
- [ ] **Upcapto** + **Lenstrack** dono par tenant header + role smoke (admin vs employee).
- [ ] 409 duplicate path: **retry** se success ya clear failure message.

### Alag module — leave (is doc ke bahar)

- Leave APIs / flows: **`docs/BACKEND_LEAVE_ENDPOINTS_FOR_FRONTEND.md`** — wahan jo alignment bacha ho wo alag checklist se track karo.

---

## 8. Related docs in this repo

- `docs/BACKEND_HARDENING_JTS_HR_APRIL_2026.md` — what backend changed.
- `docs/UPCAPTO_LOGIN_ACCESS_DENIED_TROUBLESHOOTING.md` — 403 after login.
- `docs/BACKEND_LEAVE_ENDPOINTS_FOR_FRONTEND.md` — leave module (separate from JTS).

---

*Last updated: April 2026*
