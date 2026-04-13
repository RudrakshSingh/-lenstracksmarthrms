# 2-day plan — frontend ko backend ke saath line karna

**Kis ke liye:** frontend developer jo pehli baar is stack se jod raha ho.  
**Bhasha:** seedha, lamba explain — har cheez **kyon** hai woh bhi likha hai.

---

## Pehle samjho (10 minute, dono din ke liye)

Backend alag microservices par chalta hai, lekin tumhara app zyada tar **ek API gateway** se baat karega (jaise `https://api.etelios.com`). Matlab frontend ko **har service ka alag URL yaad rakhne ki zaroorat nahi** — bas **sahi path** (`/api/auth/...`, `/api/attendance/...`, `/api/permission/...`) aur **sahi headers** bhejne hain.

Do cheezein backend har protected call par maanta hai:

1. **Tum kaun ho** → `Authorization: Bearer <token>`
2. **Kis company / tenant ka data** → `X-Tenant-Id: <tenant id>`

In dono ke bina login ke baad bhi APIs fail ho sakti hain — isliye plan mein sabse pehle yahi fix karna hai.

---

# Day 1 — Login, headers, attendance (employee flow)

**Goal:** User login ho sake, clock-in/out aur apni history/summary dekh sake — bina permission matrix screen ke.

---

## Day 1 — Subah (≈ 3–4 ghante)

### 1. API base ek jagah rakho

**Kya karna hai:** `.env` ya config mein ek variable, jaise `NEXT_PUBLIC_API_URL` / `VITE_API_URL` = `https://api.etelios.com` (ya jo prod/staging URL ho).

**Kyon:** Kal ko URL badle to ek hi jagah change ho. Har `fetch` / axios mein hardcode mat karo.

---

### 2. Login flow ko backend response ke hisaab se map karo

**Kya karna hai:**

- Login API jo bhi return kare, usme se ye **kam se kam** nikaal kar memory / secure storage mein rakho:
  - **Access token** (kabhi-kabhi naam `accessToken` ya `token` hota hai — backend doc / Network tab se confirm karo)
  - **Tenant id** — aksar `tenantId`, `tenant_id`, ya user object ke andar
  - **Role** — `employee`, `hr`, `admin`, wagaira
  - Agar mile to **employee id** bhi

**Kyon:**  
- Token = “main authenticated hoon”  
- Tenant id = “kis dukaan / company ka data” — backend isi se records alag karta hai  
- Role = kaun si screens dikhani hain (baad mein bhi kaam aayega)

**Check:** Browser DevTools → Network → login request → Response dekho; fields ke naam backend ke mutabiq adjust karo.

---

### 3. “API client” bana lo (chhota wrapper)

**Kya karna hai:** Ek function jisme tum **hamesha** ye headers lagao:

```text
Authorization: Bearer <saved access token>
X-Tenant-Id: <saved tenant id>
Content-Type: application/json   (jab body JSON ho)
```

**Kyon:** Ek jagah fix karoge to koi bhi screen bhool kar header nahi chhodegi. Yahi sabse zyada “backend ke saath line” wala step hai.

**Check:** Kisi simple GET (jaise user profile agar ho) par yeh wrapper use karke 401 na aaye (token valid ho to).

---

### 4. Token expire / 401

**Kya karna hai:** Agar koi API **401** de:

- User ko login screen par bhejo, **ya**
- Agar tumhare paas refresh token flow hai to pehle refresh try karo, phir dubara same request.

**Kyon:** Backend “session khatam” ko 401 se batata hai; user ko atakna nahi chahiye.

---

## Day 1 — Dopahar / shaam (≈ 3–4 ghante)

### 5. Attendance — employee paths wire karo

**Kya karna hai:** Sirf un routes se shuru karo jo **normal employee** roz use karta hai (in sab par tumhara wrapper + headers same rahenge):

| Kaam | Method + path (gateway ke baad) |
|------|-----------------------------------|
| Clock in | `POST /api/attendance/clock-in` (ya `/check-in` — dono backend par chal sakte hain) |
| Clock out | `POST /api/attendance/clock-out` (ya `/check-out`) |
| Aaj ki attendance | `GET /api/attendance/today` (ya `/current`) |
| History | `GET /api/attendance/history?...` |
| Summary | `GET /api/attendance/summary?startDate=...&endDate=...` (**dono date ISO format** — zaroori) |

Body mein clock-in/out ke liye backend **latitude + longitude** maangta hai; notes optional.

**Kyon:** Pehle “happy path” lock karo; baad mein HR screens.

---

### 6. Selfie / multipart

**Kya karna hai:** Agar app selfie bhejti hai:

- Request **`multipart/form-data`** ho  
- File field ka naam backend ke hisaab se **`selfie`** hona chahiye  
- Saath mein lat/lng form fields se bhejo

**Kyon:** Galat field name se upload ignore / fail ho sakta hai.

---

### Day 1 end par tumhara “done” kya hai

- [ ] Login → token + tenant save  
- [ ] Har API call par Bearer + X-Tenant-Id  
- [ ] Clock in / out + today + history + summary **kam se kam ek tenant par** test se chal raha hai  

Agar yahan tak sab theek hai, **employee attendance backend ke saath line** ho chuka hai.

---

# Day 2 — Permission matrix (admin), HR screens, polish

**Goal:** Admin / HR jo backend ne naye APIs di hain unse matrix use kar sake; jo attendance screens HR use karti hain un par 403 na aaye jab role sahi ho.

---

## Day 2 — Subah (≈ 3–4 ghante)

### 7. Kaun matrix screen dekh sakta hai

**Kya samajhna hai:** Permission admin APIs **sirf** kuch roles chalati hain — backend ke hisaab se **`superadmin`**, **`admin`**, **`hr`**.

**Kya karna hai:** App mein matrix / “user permissions edit” **sirf in roles** ko dikhao; baaki ko menu se hide karo. Galat role se call karoge to **403** — user confuse ho jayega.

**Kyon:** Backend security aise hi bani hai; frontend ko enforce karna UX achha banata hai.

---

### 8. Permission matrix flow (order mat badlo)

**Kya karna hai:** Screen flow roughly yeh rakho:

1. **Login** (admin / hr) — same token + tenant  
2. **`GET /api/permission/catalog`** — yahi se groups + har permission ka `id` + label aata hai → yahi checkboxes banate ho  
3. **`GET /api/permission/users`** — tenant users ki list  
4. Jis user par edit karna ho → **`GET /api/permission/user/:userId`** — uski abhi ki state + **revision** number  
5. Save se pehle (optional par recommended) **`POST .../escalation-preview`** — “ye change allowed hai ya nahi”  
6. Save → **`PATCH .../overrides`** — body mein **`custom_permissions`** aur **`permission_denials`** dono array (khali `[]` bhi chalega)  
7. Save par **`If-Match`** header — value last GET se **`ETag`** ya body ke **`permissionsRevision`** se: format `W/"permrev-<number>"`

**Kyon:**  
- Catalog = single source of truth — galat string backend strip kar deta hai  
- `If-Match` = do admin ek saath save na karein overwrite  
- Preview = “ye right tum assign nahi kar sakte” pehle hi pata chal jaye

**SDK:** Repo mein `integrations/permission-matrix-sdk/` copy karke use kar sakte ho — zaroori nahi, par time bachta hai.

**Detail:** [`PERMISSION_FRONTEND_SAMJHA_HUA_GUIDE.md`](./PERMISSION_FRONTEND_SAMJHA_HUA_GUIDE.md)

---

### 9. Permission badalne ke baad user ko dubara login

**Kya karna hai:** Jab admin kisi user ki permissions badle, us user ko message dikhao: **“Dubara login karo”** ya refresh token se naya access token lo.

**Kyon:** JWT mein **`permRev`** aur **`permissions`** purane ho sakte hain; naye rights tab tak poori tarah reflect nahi hote.

---

## Day 2 — Dopahar / shaam (≈ 3–4 ghante)

### 10. HR / manager attendance screens

**Kya karna hai:** Jo screens **reports**, **bulk approve**, **store/department** list, **mark attendance** use karti hain, un par bhi **wahi** API client (Bearer + tenant).

**Kya samajhna hai:** Kuch routes par backend **role** bhi dekhta hai **aur** kabhi **permission strings** bhi. Agar tumhare user ka JWT mein catalog wale naam hon (`read_attendance`) aur route purane naam maang raha ho (`attendance:read`), to **403** aa sakta hai — yeh **backend alignment** ka topic hai; frontend side tum **sirf sahi token + headers** bhej sakte ho.

**Practical:** Agar HR ko 403 aaye:

- Pehle confirm karo **role** `hr` / `admin` token mein sahi hai  
- Phir backend team se pucho ke us route ke liye **kaunsi permission string / catalog id** expect hai  

**Reference:** [`ATTENDANCE_AND_LOGIN_FRONTEND_BACKEND_GUIDE.md`](./ATTENDANCE_AND_LOGIN_FRONTEND_BACKEND_GUIDE.md)

---

### 11. Errors user ko samajh mein aayein

**Kya karna hai:** API se `message`, `code`, `hint` aaye to generic “Error” ki jagah short Hindi/English message dikhao:

- **401** → session khatam / dubara login  
- **403** → is action ki permission nahi  
- **412** → “kisi ne pehle update kar diya — page refresh karo”

**Kyon:** Kam support tickets, zyada trust.

---

### 12. Smoke test checklist (Day 2 end)

- [ ] Employee: login → clock in → today dikhe → clock out  
- [ ] Admin/HR: catalog load → user select → overrides save (412 / preview errors handle)  
- [ ] Permission change ke baad affected user ne dubara login kiya → naya behaviour  
- [ ] Har jagah **X-Tenant-Id** missing nahi (alag tenant se data mix na ho)

---

## Agar 2 din mein poora nahi hota

**Pehle priority:** Day 1 poora (headers + employee attendance).  
**Doosra:** Day 2 ka section 7–9 (matrix sirf admin ke liye).  
**Teesra:** HR-heavy attendance screens + error polish.

---

## Jaldi reference — doc links

| Doc | Kyun |
|-----|------|
| [`ATTENDANCE_AND_LOGIN_FRONTEND_BACKEND_GUIDE.md`](./ATTENDANCE_AND_LOGIN_FRONTEND_BACKEND_GUIDE.md) | Login + attendance routes + headers |
| [`PERMISSION_FRONTEND_SAMJHA_HUA_GUIDE.md`](./PERMISSION_FRONTEND_SAMJHA_HUA_GUIDE.md) | Matrix samajh + API flow |
| [`PERMISSION_MATRIX_FRONTEND_INTEGRATION.md`](./PERMISSION_MATRIX_FRONTEND_INTEGRATION.md) | Chhota endpoint cheat sheet |
| [`integrations/permission-matrix-sdk/README.md`](../integrations/permission-matrix-sdk/README.md) | Copy-paste SDK |

---

*Yeh plan “ideal 2 din” hai — agar team chhoti ho ya API pehle se half-wired ho, Day 1 zyada light ho sakta hai aur Day 2 zyada polish par ja sakta hai.*
