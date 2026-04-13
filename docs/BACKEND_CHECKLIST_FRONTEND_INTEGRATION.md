# Backend checklist – Frontend integration (api.etelios.com / app.etelios.com)

**Purpose:** Ye doc backend team ko de sakte ho taaki woh apne side pe verify/fix kar saken. Frontend (app.etelios.com, local) ab **https://api.etelios.com** use karta hai.

**Last verified:** March 2026 (Rudi@gmail.com / Rudi@3006 se test).

---

## 1. Base URLs

| Environment | Base URL | Use |
|-------------|----------|-----|
| Production backend | `https://api.etelios.com` | Auth, HR, Attendance, etc. |
| App (Shell) | `https://app.etelios.com` | Frontend – proxy to backend |

---

## 2. Auth – Working

| Item | Status | Notes |
|------|--------|--------|
| `POST /api/auth/login` | ✅ | Body: `{ "emailOrEmployeeId": "<email>", "password": "<password>" }`. Returns `accessToken`, `refreshToken`, `user`. |
| `GET /api/auth/status` | ✅ | Service operational. |
| `GET /health` | ✅ | Gateway healthy. |

---

## 3. Attendance – Check-in / Check-out

### 3.1 Check-in endpoint (backend)

- **URL:** `POST https://api.etelios.com/api/attendance/check-in`
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer <token>`
- **Body (required):**
  - `employeeId` (string) – e.g. `69a97889bdf46351402d518b`
  - `latitude` (number)
  - `longitude` (number)
- **Optional:** `location`, `timestamp`, `selfie`, etc. jitna backend support kare.

**Current backend response (March 2026):**

- **404** with message:  
  `"Employee not found in HR service. Searched by: employee_id=EMP-2026-886706, user_id=69a97889bdf46351402d518b, email=rudi@gmail.com. Tenant: default. Please ensure the employee exists in HR service and is assigned to a store."`

**Backend ko kya check karna hai:**

1. Is **user** ko HR service me **employee** record se link karo (user_id / employee_id / email + tenant).
2. Us employee ko **at least ek store assign** karo.
3. Tenant `default` (ya jo frontend use kar raha hai) us employee ke liye consistent ho.
4. Check-in success pe **200/201** aur attendance record create/return karo.

### 3.2 Check-out

- **URL:** `POST https://api.etelios.com/api/attendance/check-out` (ya jo backend expose karta ho)
- Same auth; body me check-out ke liye zaroori fields (e.g. `attendanceId` / `recordId` agar backend maangta ho).

### 3.3 Get attendance list / today

- **GET** `https://api.etelios.com/api/attendance?employeeId=<id>&date=<YYYY-MM-DD>` – **200** aa raha hai (empty array bhi theek hai).
- **GET** `https://api.etelios.com/api/attendance/stats?employeeId=<id>` – abhi **403** (Insufficient permissions). Employee role ko apna stats dekhne ki permission honi chahiye.

---

## 4. HR routes (under `/api/hr/`)

Frontend ab in paths use karta hai. Backend inko expose kare / fix kare:

| Endpoint | Method | Current status | Backend action |
|----------|--------|----------------|----------------|
| `/api/hr/roster` | GET | ✅ 200 | – |
| `/api/hr/roster?employeeId=&date=` | GET | ✅ 200 | – |
| `/api/hr/leaves/balance?employeeId=` | GET | 404 (e.g. Employee not found) | Employee resolve karo / balance return karo |
| `/api/hr/leaves/applications?employeeId=` | GET | 403 | Employee ko apni applications dekhne do |
| `/api/hr/performance/employee/:id` | GET | 403 (hr.performance.read) | Employee ko apna performance dekhne do (read own) |
| `/api/hr/attendance/check-in` | POST | 404 (route not found on hr-service) | Agar check-in HR service me hai to route add karo; ya gateway se auth/attendance service tak route karo |
| `/api/hr/attendance/check-out` | POST | Same as above | Same |

---

## 5. Routes jo backend pe nahi / 404

In paths frontend call karta hai; backend me exist nahi karte ya alag path pe hain:

| Frontend expects | Current backend response | Suggestion |
|------------------|--------------------------|------------|
| `GET /api/tasks?employeeId=` | 404 Route not found | Route add karo ya sahi path batao (e.g. `/api/hr/tasks`) |
| `GET /api/payroll/preview?employeeId=` | 404 | Route add karo ya sahi path batao |
| `GET /api/roster` (bina `/hr/`) | 404 | Frontend ab `/api/hr/roster` use karta hai – OK |
| `GET /api/leaves/balance` (bina `/hr/`) | 404 | Frontend ab `/api/hr/leaves/balance` use karta hai – OK |

---

## 6. Permissions / 403

Employee role (Rudi) se ye 403 aate hain; backend check kare ki employee **apna** data dekh sake:

- `GET /api/attendance/stats?employeeId=<self>` → 403  
  **Expected:** Employee apna stats dekh sake.
- `GET /api/hr/performance/employee/<self>` → 403 (hr.performance.read)  
  **Expected:** Employee apna performance dekh sake.
- `GET /api/hr/leaves/applications?employeeId=<self>` → 403  
  **Expected:** Employee apni applications dekh sake.

---

## 7. Sample requests (Backend verify karne ke liye)

### Login

```bash
curl -s -X POST "https://api.etelios.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"emailOrEmployeeId":"Rudi@gmail.com","password":"Rudi@3006"}'
```

### Check-in (token login response se milega)

```bash
# Replace <ACCESS_TOKEN> with token from login response
curl -s -X POST "https://api.etelios.com/api/attendance/check-in" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"employeeId":"69a97889bdf46351402d518b","latitude":28.6139,"longitude":77.2090}'
```

### Roster (working)

```bash
curl -s -X GET "https://api.etelios.com/api/hr/roster?employeeId=69a97889bdf46351402d518b&date=2026-03-10" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Attendance list (working)

```bash
curl -s -X GET "https://api.etelios.com/api/attendance?employeeId=69a97889bdf46351402d518b&date=2026-03-10" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## 8. Summary – Backend ko kya karna hai

1. **Check-in persist:**  
   `POST /api/attendance/check-in` pe employee HR service me ho aur kisi store se assigned ho; success pe 200/201 + attendance record.

2. **Employee + Store:**  
   User `69a97889bdf46351402d518b` (Rudi@gmail.com, EMP-2026-886706, tenant default) ko HR service me employee ke roop me ensure karo aur store assign karo.

3. **403 – Own data:**  
   Employee role ko apna attendance stats, performance, leave applications dekhne do (read-own permission).

4. **Missing routes:**  
   Tasks, payroll preview – ya to in routes ko add karo ya frontend ko sahi path bata do (e.g. `/api/hr/tasks`).

5. **HR service check-in:**  
   Agar check-in HR service me handle hota hai to `/api/hr/attendance/check-in` (aur check-out) expose karo; warna gateway/routing se attendance service tak request sahi jaa rahi hai ye confirm karo.

---

**Contact:** Frontend team – is doc ke hisaab se backend verify/fix karke bata dena kya change kiya, taaki frontend config/expectations update ho saken.
