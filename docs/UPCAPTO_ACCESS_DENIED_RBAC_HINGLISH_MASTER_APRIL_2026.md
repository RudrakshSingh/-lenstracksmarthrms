# Upcapto login, Access Denied, aur RBAC — ek hi jagah (Hinglish)

**Audience:** Frontend, support, backend — jinko Upcapto admin flow, “Access Denied” debug, aur permission APIs samajhni hain.  
**Last updated:** April 2026

---

## 1. Upcapto admin login (production)

- **API:** `POST https://api.etelios.com/api/auth/login`
- **Body example:** `email` + `password` + **`tenantId: "upcapto"`** (zaroori jab multi-tenant login ho)
- **Success par:** `accessToken`, `refreshToken`, `user` object — jisme **`tenantId: upcapto`**, **`role: admin`**, **`employee_id`** (jaise `UPCAPTO-ADMIN-001`) aata hai

**Baaki har protected API par:**

- `Authorization: Bearer <accessToken>`
- **`X-Tenant-Id: upcapto`** — JWT ke `tenantId` se **match** hona chahiye (lowercase, typo mat)

**LocalStorage / app state:** Login ke baad `tenantId` **JWT wale tenant** se set karo; purana `lenstrack` ya koi aur slug reh gaya to kuch services (especially **JTS**) par **403** milega.

---

## 2. “Access Denied” — do alag cheezein hain

### 2.1 API wala (403 / 403-style JSON)

Login **200** ho chuka hai, lekin **agla** API call fail:

- HR, attendance, JTS, payroll, dashboard widgets — har route apna **RBAC** check karta hai
- Response body mein dekho: **`error`** / **`code`** (sirf UI ka generic text mat dekho)

**Common codes (short list):**

| Code / pattern | Matlab (short) |
|----------------|----------------|
| `INSUFFICIENT_ROLE` / `INSUFFICIENT_PERMISSION` | Is route ke liye role/permission kam hai |
| `TENANT_MISMATCH` | Header tenant JWT se match nahi (strict mode) |
| `JTS_TENANT_HEADER_MISMATCH` | JTS: `X-Tenant-Id` token ke tenant se match nahi |
| `INVALID_TOKEN` / purana token | Logout + dubara login |
| `EMPLOYEE_001_NOT_FOUND` | HR employee row nahi mila / JTS bind fail |
| `JTS_ACTOR_EMPLOYEE_NOT_RESOLVED` | JTS actor HR se link nahi |

**Debug rule:** Chrome **Network → failing request → Response JSON** poora copy karo (URL + status + `error`).

### 2.2 UI page wala (`/access-denied?home=/dashboard`)

Kabhi-kabhi screen par **“Access Denied”** dikhta hai lekin wo **Next.js (ya frontend) ka apna route** hai:

- URL jaise: **`/access-denied?home=%2Fdashboard`**
- Us document ka HTTP status **200** bhi ho sakta hai — matlab yeh **HTML error page** hai, direct API failure nahi

**Iska matlab:** Middleware / route guard ne tumhe **dashboard se redirect** kar diya — reason: token decode, role check, permission list, tenant state, ya galat cached user.

**Kya karo:**

1. Network filter **“All”** rakho (sirf Fetch/XHR par sirf `access-denied` dikhega; poora flow nahi)
2. **Application → Service Workers → Unregister** → hard refresh (kabhi **purana SW** galat shell/cache deta hai; initiator `sw.js` dikhe to yeh important hai)
3. **Local Storage:** `accessToken`, `tenantId` — `tenantId` = **`upcapto`**
4. Token [jwt.io](https://jwt.io) par decode karke **`role`**, **`tenantId`**, **`permissions`** confirm karo

---

## 3. Upcapto-specific: HR employee missing (JTS / bind)

Documented finding: **`admin@upcapto.com`** auth mein hai, lekin **HR `employees`** mein is email ka row nahi mila to:

- `POST /api/jts/catalog/employees/bind-from-jwt` → **`EMPLOYEE_001_NOT_FOUND`**
- JTS / kuch screens “access” / link errors dikha sakti hain

**Fix direction (data / ops):** Tenant `upcapto` mein HR mein us admin ke liye employee record banao (email align; `employee_id` JWT ke saath consistent rahe). Detail: `docs/UPCAPTO_ADMIN_LOGIN_PROD_ERRORS_APRIL_2026.md`.

**Tenant header galat ho to (example):** JWT `upcapto` hai aur `X-Tenant-Id: lenstrack` bheja — **JTS** par **`JTS_TENANT_HEADER_MISMATCH`** (403).

---

## 4. Frontend integration reminders (headers + storage)

- Har API: **`Authorization`** + **`X-Tenant-Id`**
- Login ke baad **`user.tenantId`** storage mein save karo; har request par same bhejo
- Cookie + Bearer **mix** mat karo (purana cookie + naya token = ajeeb failures)

Zyada detail: `docs/UPCAPTO_LOGIN_ACCESS_DENIED_TROUBLESHOOTING.md`

---

## 5. RBAC: backend single source of truth (short)

**Principle:** Permission **compute** backend par; frontend sirf **dikhata** hai aur APIs call karta hai — apni side par “secret” RBAC mat invent karo.

### 5.1 Main APIs (auth-service, base path `/api/permission`)

| Kaam | Method + path |
|------|----------------|
| Catalog (groups + flat list) | `GET /api/permission/catalog` |
| User list (pagination, filters) | `GET /api/permission/users` |
| Ek user ka detail | `GET /api/permission/user/:userId` |
| Save se pehle dry-run (escalation check) | `POST /api/permission/user/:userId/escalation-preview` |
| Overrides save | `PATCH /api/permission/user/:userId/overrides` |
| Reset overrides | `POST /api/permission/user/:userId/reset` |

**PATCH body (snake_case):** `custom_permissions`, `permission_denials` — arrays.

**Optimistic lock:** Optional header **`If-Match: W/"permrev-3"`** — mismatch par **412** + `PERMISSION_REVISION_CONFLICT`.

**Response envelope:** zyada tar **`{ success: true, data: ... }`** — frontend hamesha `data` read kare.

**Note:** Code mein yahi routes **`/api/user`** par bhi mount ho sakte hain — nayi integration ke liye **`/api/permission`** use karna zyada clear hai.

### 5.2 JWT mein kya aata hai

- **`userId`**, **`role`**, **`tenantId`**, **`employee_id`**
- **`permRev`** — number; har permission override / reset ke baad badhta hai
- **`permissions`** — effective permissions array (**usually**); agar deploy par **`JWT_SKIP_PERMISSIONS_CLAIM=1`** ho to yeh claim **hata** diya ja sakta hai (chhota token) — tab bhi `permRev` + server/cache flow align rehna chahiye

### 5.3 Effective permissions (idea)

Roughly: **role base ∪ custom ∪ legacy user permissions \ denials** — exact logic shared package + HR/auth models mein. UI ko **`effectivePermissions`** API se hi maanna chahiye.

### 5.4 Unknown permission codes

Backend **catalog ke bahar** codes strip kar deta hai; response mein **`unknownCustomStripped`** / **`unknownDenyStripped`** ya **`unknown*InDb`** se pata chal sakta hai.

### 5.5 Kaun call kar sakta hai

Permission management APIs: **`superadmin`**, **`admin`**, **`hr`** — aur **same tenant** (superadmin ko cross-tenant rules alag).

---

## 6. Quick acceptance checklist (team ke liye)

**Upcapto / multi-tenant**

- [ ] Login with `tenantId: upcapto` → 200
- [ ] HR list / departments → 200 with **`X-Tenant-Id: upcapto`**
- [ ] JTS calls → header **JWT tenant se match** (warna `JTS_TENANT_HEADER_MISMATCH`)

**Access denied UI**

- [ ] `/access-denied` vs API 403 alag samajh ke Network se exact failing URL pakda
- [ ] SW unregister + hard refresh try kiya
- [ ] Storage + JWT claims verify kiye

**RBAC**

- [ ] `GET /catalog` → groups + `flat`
- [ ] `GET /user/:id` → `effectivePermissions` + `permissionsRevision`
- [ ] `escalation-preview` → save se pehle UI par `allowed` / `blockingPermission`
- [ ] `PATCH .../overrides` + optional `If-Match` → 200 ya 412 handle

---

## 7. Related docs (repo mein)

- `docs/BUG_UPCAPTO_ADMIN_ACCESS_DENIED_WRONG_DASHBOARD_HINGLISH.md` — **poora bug story:** Access Denied page + **Go to Dashboard** employee par kyun khulta hai (layers + diagram)
- `docs/UPCAPTO_LOGIN_ACCESS_DENIED_TROUBLESHOOTING.md` — 403 / tenant / role breakdown
- `docs/UPCAPTO_ADMIN_LOGIN_PROD_ERRORS_APRIL_2026.md` — bind + HR gap + JTS catalog
- `docs/NEXTJS_MERN_JTS_FRONTEND_BACKEND_ALIGNMENT.md` — JTS + Next.js alignment
- `packages/hrms-mfe/lib/jts/jts-error.ts` — JTS error codes ke user-friendly Hinglish messages (jahan `resolveJtsErrorBody` use ho)

---

*Yeh document is repo ke current backend behaviour aur pehle wale debugging session par based hai; prod par env / gateway change ho to endpoints verify kar lena.*
