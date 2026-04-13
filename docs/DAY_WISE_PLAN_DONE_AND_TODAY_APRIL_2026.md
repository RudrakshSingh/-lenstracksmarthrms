# Day-wise plan: what’s done vs what’s in flight (April 2026)

**Note:** Exact calendar dates for every code change are not all tracked here. Below, **“Earlier in sprint”** = work completed before / during the JTS+HR hardening thread; **“Today”** = items tied to the current session (9 Apr 2026). Adjust labels to your real sprint dates if you file tickets.

---

## Earlier in sprint — already completed (backend / ops)

| Area | What was done |
|------|----------------|
| **JTS — task codes** | Atomic `TaskCodeCounter`, retries on duplicate key, `TASK_CODE_DUPLICATE` / 409, `resolveApplicationErrorCode` so Mongo strings don’t become bogus `code` fields. |
| **JTS — self vs manager race** | `allocateNextTaskCode` no longer uses txn `session` for counter; self-task calls `nextTaskCode` without session; normalized `tenant_id` on manager create. |
| **JTS — HR ↔ catalog** | `bind-from-jwt` path adjusted + HR lookup to bootstrap catalog where needed; RBAC so employees can bind where intended. |
| **HR — proxy** | `/api/jts/*` proxy maps duplicate task-code / E11000-style failures to stable **409** + message (including axios error path). |
| **HR — employee / performance** | `GET /api/hr/employee/:id` performance path fixed to use employee **ObjectId** for `PerformanceReview` (avoid 500). |
| **Frontend (MFE)** | `jts-error.ts` helpers / copy for `TASK_CODE_DUPLICATE`, `JTS_ACTOR_EMPLOYEE_NOT_RESOLVED` (where merged in repo). |
| **Production deploy** | `etelios-hr-service:latest` + `etelios-jts-service:latest` built, pushed to ECR, rolled out to **`etelios-prod`**. |
| **Prod smoke (credential-less / limited)** | `GET /jts/health` + `GET /api/jts/health` on `https://api.etelios.com` — **200**. |
| **Prod smoke (Upcapto admin)** | `POST /api/auth/login` + `GET /api/hr/employees` with `upcapto` — **PASS** (documented test admin). |

---

## Today (9 Apr 2026) — done in this session

| Item | Status |
|------|--------|
| Confirm **prod deploy** outcome for HR + JTS (rollout success) | Done |
| **Upcapto** login + one authenticated HR call on prod | Done |
| **Docs:** `UPCAPTO_LOGIN_ACCESS_DENIED_TROUBLESHOOTING.md` | Done |
| **Docs:** `BACKEND_HARDENING_JTS_HR_APRIL_2026.md` | Done |
| **Docs:** This day-wise plan file | Done |

---

## Today — optional / not completed (needs input or creds)

| Item | Blocker / note |
|------|------------------|
| Full **Lenstrack** E2E (`lenstrack-onboard-full-and-view-apis.js`) on prod | Needs `LENSTRACK_ADMIN_PASSWORD` in env (not in repo). |
| **Sandeep / JTS E2E** (`jts-e2e-sandeep-flow.js` or `prod-sandeep-attendance-plus-jts.js`) | Needs `JTS_AUTH_PASSWORD` (or equivalent) in env. |
| **Git push** to Azure DevOps | Needs credentials on your machine (failed earlier without auth). |
| **kubectl** pod verification from this environment | May be unavailable depending on kubeconfig; use your laptop where `kubectl` works. |

---

## Suggested next days (lightweight)

### Day +1 — verification & UX

- Run **JTS E2E** against prod once passwords are in CI or local `.env` (task create, self-task, no 409 spam).
- Wire **MFE toasts** to stable JTS error codes (`TASK_CODE_DUPLICATE`, etc.) if any screen still shows raw text.
- Spot-check **access denied** cases using `UPCAPTO_LOGIN_ACCESS_DENIED_TROUBLESHOOTING.md` (capture failing URL + JSON `error` field).

### Day +2 — hygiene & scope

- **Pin images** by digest in runbooks if audits need immutable references.
- If other microservices (auth, attendance, …) have **uncommitted** fixes, repeat **build → ECR → rollout** only for those images.
- **Push** repo to remote when Azure DevOps auth is available.

### Day +3 — hardening (only if product asks)

- Load or chaos tests on **task create** (optional).
- Dashboard / analytics that depend on JTS: confirm **HR → JTS** URLs in prod ConfigMaps match deployed services.

---

## One-line summary

- **Done:** JTS+HR backend fixes, prod rollout for those two services, docs, Upcapto login smoke, health checks.  
- **Today’s doc / planning work:** captured here.  
- **Next:** credential-based prod E2E, frontend error mapping polish, git push, any extra service deploys as needed.

---

*Last updated: 9 April 2026*
