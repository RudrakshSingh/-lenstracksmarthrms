# RBAC wala frontend spec — developer actually kya maang raha hai? (Hinglish)

**Purpose:** Jo “RBAC Frontend ↔ Backend Integration” document hai, usko **plain language** mein translate — taaki pata chale **frontend team backend se exactly kya expect** kar rahi hai. Yeh **demand list** hai, **threat** nahi: standard integration contract jaisa socho.

---

## 1. Core idea (ek line)

Frontend bol raha hai: **“Permission ka hisaab-kitab sirf tumhari (backend) side par ho. Hum sirf API se list lenge, UI dikhayenge, aur override save karwayenge — apni side par permission invent / calculate nahi karenge.”**

Isse **dono teams align** rehti hain: galat UI hide/show kam hota hai, security backend par rehti hai.

---

## 2. Cheezon ka breakdown — “yeh sab de do” ka matlab

### 2.1 Permission catalog (`GET /api/permission/catalog`)

**Maang:** Ek **official list** — kaunse permission **codes** valid hain, unke **human labels** kya hain, groups mein kaise dikhen (User Management, Reports, …), aur ek **flat array** taaki UI matrix / toggles bana sake.

**Kyun:** Taaki frontend **hardcoded** `read_users` wagaira na likhe jo backend mein exist hi na kare. **Single source of truth** catalog se aaye.

---

### 2.2 User list (`GET /api/permission/users`)

**Maang:** Jis tenant / scope mein admin ka access hai, **saare users** (ya page-wise) jin par permission manage karna hai — har row mein kam se kam: **id, name, email, role, department, permissionsRevision** (ya equivalent).

**Kyun:** Permission matrix screen pe pehle **dropdown / table** bharne ke liye.

---

### 2.3 Ek user ka detail (`GET /api/permission/user/:userId`)

**Maang:** Us user ke liye:

- **role** se aane wale permissions (`rolePermissions`)
- **custom** add-ons (`customPermissions`)
- **explicit deny** (`permissionDenials`)
- **final merged list** (`effectivePermissions`) — jo asliyat mein lagega
- **`permissionsRevision`** — taaki save ke time **conflict** detect ho sake

**Kyun:** Edit screen pe **checkboxes** sahi state mein dikhen; **effective** backend ne nikala ho, frontend khud merge na kare.

---

### 2.4 Escalation preview (`POST .../escalation-preview`)

**Maang:** Save karne **se pehle** dry-run — agar yeh `custom_permissions` / `permission_denials` bhejun to:

- **allowed** hai ya nahi
- **kya add/remove** hoga (`added` / `removed`)
- agar block hai to **kaun sa permission** rok raha hai (`blockingPermission`)

**Kyun:** Admin ko **pehle** pata chale “yeh change allowed nahi” (jaise privilege escalation rules), **save ke baad** surprise 403 na aaye. Document ne isko **mandatory** likha hai apni taraf se — matlab UI flow mein yeh step **expect** karte hain; backend pe actually **optional** ho sakta hai, lekin **recommended**.

---

### 2.5 Overrides save (`PATCH .../overrides` + `If-Match`)

**Maang:** Custom allow/deny **replace** karna body se, aur header mein **revision** (`If-Match: W/"permrev-3"`) taaki do tab mein edit karne par **purana overwrite** na ho jaye.

**Kyun:** **Optimistic locking** — multi-user / double-submit se data corrupt kam hota hai.

---

### 2.6 Reset (`POST .../reset`)

**Maang:** Custom overrides **hata do**, wapas **role default** jaisa behaviour.

**Kyun:** “Sab default par lao” button bina manual har checkbox uncheck kiye.

---

### 2.7 JWT mein kya chahiye

**Maang:** Har request mein bearer token ke andar:

- **userId, role, tenantId**
- **`permRev`** — revision number
- **`permissions`** — **effective** permission codes ki list (taaki har screen pe detail API na marni pade)

**Kyun:** Middleware / route guards / microservices **fast** check kar len; **profile API** har click par nahi.

**Note:** Kuch deploy par permissions claim **band** bhi ho sakta hai (chhota token) — isliye spec ke “Questions for backend” section mein yeh clarify karna zaroori hai.

---

### 2.8 Headers

**Maang:** Har call: **`Authorization: Bearer ...`** + **`X-Tenant-Id: ...`** (JWT ke tenant se match).

**Kyun:** Multi-tenant; galat header = wrong tenant / 403 (JTS wagaira).

---

### 2.9 Backend guarantees (jo “promise” maang rahe hain)

1. **Same permission IDs** catalog, JWT, user APIs mein — typo / drift na ho.
2. **`effectivePermissions` sahi compute** ho (role + custom − deny, aur jo bhi tumhara **legacy** rule ho woh documented ho).
3. **Har successful update par revision badhe** — `If-Match` ka sense bane.
4. **Unknown codes** crash na karen — strip / ignore + ideally response mein bataye (taaki admin ko pata chale purana data weird tha).

---

## 3. “Questions for Backend Team” — short jawab (high level)

Yeh frontend **ambiguity** khatam karne ke liye poochh raha hai:

| Sawal | Matlab |
|--------|--------|
| JWT mein hamesha `permissions`? | Token size vs convenience tradeoff — env flag se band ho sakta hai ya nahi? |
| `permRev` kab +1? | Har override save / reset par consistent hona chahiye. |
| Preview mandatory? | UI ke liye haan chahiye; server pe save **block** escalation se hi hota hai to preview “best practice”. |
| Unknown permission? | Ignore + report — frontend ko list dikhani hai. |
| Role names? | Lowercase `admin`, `hr`, `employee` … fixed karo taaki UI switch clean ho. |

(Is repo ke auth-service mein inme se **zyada tar already implement** hai — detail ke liye pehle wala backend alignment summary dekho.)

---

## 4. Acceptance checklist ka matlab

Frontend **QA / handoff** ke liye bol raha hai: in APIs aur JWT par **smoke test** pass ho tab hum **RBAC screen** ship karenge. Yeh **reasonable** gate hai.

---

## 5. Final goal — ek sentence

**“Backend permission ka maalik ho; frontend dikhaaye aur likhe, par permission ‘truth’ kabhi client par calculate na ho.”**

---

## 6. Related (is repo mein)

- **Frontend ko de dene wala official contract (English):** `docs/RBAC_FRONTEND_BACKEND_INTEGRATION_CONTRACT.md` — paths, headers, real JSON shapes, JWT, Q&A answers, curl examples.
- Hinglish master: `docs/UPCAPTO_ACCESS_DENIED_RBAC_HINGLISH_MASTER_APRIL_2026.md`
- Code: `permission.routes.js` / `permissionController.js`

---

*Yeh document sirf explain karta hai “frontend kya maang raha hai”; koi team ko target nahi. Clear contract se dono taraf kam aasan hota hai.*
