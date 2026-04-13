# Login + attendance — frontend guide (backend ke hisaab se)

**Scope:** Jo backend aaj expect karta hai, taaki **login** aur **attendance** frontend par reliably chalein.  
**Code change is doc ka hissa nahi** — yeh sirf integration / behaviour likhta hai.

---

## 1. Base URL aur paths

- Browser se zyada tar **`https://api.etelios.com`** (ya jo tumhara prod API host ho) + gateway prefix.
- **Auth** (login, refresh, register): gateway jaise route kare — zyada tar pattern **`/api/auth/...`** ya tumhare Kong/ingress doc ke mutabiq.
- **Attendance:** **`/api/attendance/...`** (e.g. clock-in, history, today).

Frontend ko apne env mein **ek API base** rakhna chahiye; har service ke liye alag host tabhi jab gateway use na ho.

---

## 2. Login — backend kya expect / return karta hai

### Request

- Login API body: **email ya employee id** + **password** — auth-service implementation ke mutabiq (tenant agar zaroori ho to woh bhi bhejo, jaise tumhara existing app karti hai).

### Response (jo frontend ko store karna hai)

- **`accessToken`** (ya jo field naam ho) — **Bearer** ke saath har protected call par.
- **`refreshToken`** (agar flow mein ho) — secure storage; refresh par naya access token.
- **User object** se kam se kam:
  - **`tenantId`** / tenant identifier — **har API** par header ke liye (niche).
  - **`role`** — attendance / HR logic role string se karti hai (case-insensitive compare hota hai).
  - **`employee_id` / `employeeId`** — jahan bhi ho; attendance middleware JWT se `employee_id` bhi padhta hai agar DB user na mile.

### JWT ke andar (auth-service ke mutabiq; optional claims)

- **`userId` / `id`**
- **`tenantId`**
- **`role`**
- **`employee_id`** (agar auth ne daala ho)
- **`permRev`** — permissions DB mein change hone par badhta hai; cache alignment ke liye.
- **`permissions`** — effective permission codes ki array (env se kabhi JWT se hata bhi sakte ho — chhota token); agar missing ho to attendance Redis + role-based paths par bhi chal sakta hai.

**Frontend rule:** Admin ne matrix / overrides badle hon to user se **dubara login ya refresh** karwana safe hai taaki naya `permRev` / `permissions` mile.

---

## 3. Har protected API par headers (attendance + zyada tar services)

| Header | Value |
|--------|--------|
| `Authorization` | `Bearer <access_token>` |
| `X-Tenant-Id` | Wahi tenant jo login / tenant context se aaye |

Bina **Bearer** ke attendance **401** de sakta hai.  
**Tenant** galat / missing hone par data mix / wrong tenant ka risk.

`Content-Type` JSON body ke liye `application/json`; **selfie / file** ke liye `multipart/form-data` (niche).

---

## 4. Attendance — kaunsa route kya maangta hai (high level)

Neeche wale **sirf authenticate** (+ kabhi **active** status) par employee flow chal sakta hai; baaki mein **role / permission** bhi lag sakti hai (attendance-service routes ke mutabiq).

### Employee-friendly (zyada tar sirf login + tenant + active user)

| Method | Path (suffix `/api/attendance` ke baad) | Notes |
|--------|----------------------------------------|--------|
| POST | `/clock-in`, `/check-in` | Body: lat/lng, optional notes; **optional file field `selfie`** (multipart) |
| POST | `/clock-out`, `/check-out` | Body: lat/lng, optional notes; optional `selfie` |
| GET | `/history` | Query: optional dates, page, limit |
| GET | `/summary` | Query: **startDate**, **endDate** (ISO) — required |
| GET | `/today`, `/current`, `/check-status` | Aaj ki attendance |
| GET | `/stats` | Role ke hisaab se controller filter |
| GET | `/` | List — controller employee ko sirf apna dikhata hai |
| GET | `/leave` | HR service proxy — apni leaves |
| POST | `/track-location` | Geofence / auto flows |
| PATCH | `/:id` | Sirf **checkOut** ISO body (clock-out compatibility) |
| GET | `/:id` | Single record |

### HR / manager / admin heavy (routes par `requireRole` + kabhi permission strings)

Examples: **`/reports`**, **`/daily-timeline`**, **`/store/:storeId`**, **`/department/:departmentId`**, **`POST /`** (mark attendance), **`POST /bulk`**, **`/leave/balances`**, wagaira.

Yahan backend **allowed roles** (jaise HR, Admin, SuperAdmin, Manager) **aur** kabhi **permission strings** (`attendance:read`, `attendance:update`, `attendance:create`) check karta hai. JWT / Redis par jo **`permissions`** array aati hai, woh **catalog-style ids** (`read_attendance`, `write_attendance`, …) ho sakti hain — **string exact match** route wale naam se alag ho to **403** aa sakta hai. Isliye agar HR screen par 403 aaye to **backend + auth matrix** align karna padta hai; frontend sirf token + headers sahi bhej sakta hai.

---

## 5. Multipart (selfie)

- Field name: **`selfie`** (single file).
- Saath mein baki fields (latitude, longitude, …) form fields ke roop mein bhejo — jaise tumhara existing mobile/web client karta ho.

---

## 6. Errors — UI mein kaise dikhana

| HTTP | Typical meaning | Frontend action |
|------|-----------------|-----------------|
| 401 | Token missing / invalid / expired | Login ya refresh |
| 403 | Role / permission | Message + agar admin flow ho to matrix / role check |
| 412 | Concurrency (permission APIs par) | Refresh + retry |
| 4xx validation | Body / query galat | Field errors dikhao |

Response body mein `code` / `message` / `hint` aane par unhe user-friendly string bana sakte ho.

---

## 7. Checklist (ASAP — frontend)

1. Login ke baad **access token** + **tenant id** persist karo.  
2. Har attendance (aur auth) call par **`Authorization: Bearer …`** + **`X-Tenant-Id`**.  
3. Clock-in/out ke liye **sahi path** (`/clock-in` vs `/check-in` dono supported).  
4. Selfie ho to **`selfie`** field name + **multipart**.  
5. **`/summary`** par **startDate / endDate** ISO bhejna mat bhoolna.  
6. Permissions badalne ke baad **re-login / refresh**.  
7. HR dashboards par **403** ho to backend se confirm karo: role vs JWT `permissions` vs route par maangi gayi string same hai ya nahi.

---

## 8. Related docs (repo mein)

- [`FRONTEND_2_DAY_PLAN_BACKEND_ALIGNMENT.md`](./FRONTEND_2_DAY_PLAN_BACKEND_ALIGNMENT.md) — **2-din ka simple plan** (login → attendance → matrix → polish)  
- [`PERMISSION_FRONTEND_SAMJHA_HUA_GUIDE.md`](./PERMISSION_FRONTEND_SAMJHA_HUA_GUIDE.md) — permission matrix / admin APIs  
- [`PERMISSION_MATRIX_FRONTEND_INTEGRATION.md`](./PERMISSION_MATRIX_FRONTEND_INTEGRATION.md) — chhota API cheat sheet  
- [`OPERATIONS_JWT_AND_PERMISSIONS_CACHE.md`](./OPERATIONS_JWT_AND_PERMISSIONS_CACHE.md) — JWT / Redis ops  

---

*Yeh document sirf explain karta hai — iske saath codebase mein koi zaroori edit isliye nahi kiya gaya kyunki tumne code change na karne ko kaha.*
