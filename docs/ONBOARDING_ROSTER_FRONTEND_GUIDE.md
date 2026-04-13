# Onboarding & roster management — frontend guide

**Audience:** frontend engineers wiring **HR onboarding** and **employee/admin attendance UX** after roster-related profile changes  
**Last updated:** 2026-04-03  

This doc explains how **onboarding step 2 (work details)** ties to **roster-based clock-in** for store staff versus **relaxed attendance** for backoffice/management. For enum details and copy suggestions, see [MANAGEMENT_BACKOFFICE_RBAC_FRONTEND.md](./MANAGEMENT_BACKOFFICE_RBAC_FRONTEND.md).

---

## 1. Who does what

| Actor | Typical UI | Responsibility |
|--------|------------|----------------|
| **HR / Admin / Manager** (JWT: privileged roles) | Onboarding wizard, employee edit | Submit work details with correct **`storeId`**, **`workMode`**, **`attendancePolicy`** so attendance and roster behavior match the job. |
| **New hire (employee)** | Self-service onboarding if you expose it | Same payloads if the employee completes their own step 2; usually HR drives this. |
| **Store employee (post onboarding)** | Clock-in / attendance | For **store-bound + strict geofence**, the app should expect **today’s roster** (and store) to matter for where/when they can clock in—see §4. |
| **Backoffice / roaming staff** | Clock-in | Usually **no geofence** path; **not** dependent on daily roster rows the same way as floor staff. |

**Important:** JWT **`role`** (employee vs manager vs hr vs admin) controls **which APIs** the UI can call. **`workMode` / `attendancePolicy`** control **how attendance treats store + roster + geofence**. Do not infer attendance rules from department name alone.

---

## 2. Where onboarding sets roster-related profile

### 2.1 Endpoints (HR service, behind gateway)

Typical prefix: **`/api/hr`** (confirm with your gateway).

| Step | Method | Path |
|------|--------|------|
| Work details | `POST` | `/onboarding/work-details` |
| Work details (alias) | `POST` | `/work-details` |

Send your usual **auth** (`Authorization: Bearer …`) and **tenant** header (`X-Tenant-Id` or project standard).

### 2.2 New / important body fields (step 2)

These sit on **`workDetailsSchema`** in `microservices/hr-service/src/routes/onboarding.routes.js`:

| Field | Required? | Purpose |
|--------|-----------|---------|
| `employeeId` | Yes | From step 1 / registration. |
| `storeId` | Optional | Real Mongo **store** id for store staff; or special strings **`backoffice`** / **`office`** (case-insensitive in server resolution) for non-store locations. |
| `workMode` | Optional | `STORE_BOUND` \| `BACKOFFICE` \| `ROAMING`. Default **`STORE_BOUND`** if omitted (unless special `storeId` triggers defaults—§3). |
| `attendancePolicy` | Optional | `STRICT_GEOFENCE` \| `NO_GEOFENCE` \| `FLEXI_SHIFT`. Default **`STRICT_GEOFENCE`** if omitted (unless special `storeId` triggers defaults—§3). |

Other step-2 requirements (e.g. **`annual_ctc`**, job fields) are unchanged; see the same Joi schema in-repo.

Server persistence: **`user.workMode`** and **`user.attendancePolicy`** are set from resolved config in `onboarding.service.js` (`resolveAttendanceConfig` + `addWorkDetails`).

---

## 3. Defaults and special `storeId` (HR behavior)

Logic: `resolveAttendanceConfig` in `microservices/hr-service/src/services/onboarding.service.js`.

- If **`storeId`** resolves to **`backoffice`** or **`office`** and the client **does not** send `workMode` / `attendancePolicy`, the server sets:
  - `workMode` → **`BACKOFFICE`**
  - `attendancePolicy` → **`NO_GEOFENCE`**

- If those fields are **omitted** and `storeId` is **not** special, defaults are **`STORE_BOUND`** + **`STRICT_GEOFENCE`**.

**Frontend choice:** either send **explicit** `workMode` + `attendancePolicy` for every profile, or rely on **`storeId: "backoffice"`** / **`"office"`** for HQ-style users and omit the enums.

---

## 4. How this connects to roster management & clock-in

Attendance logic (`microservices/attendance-service/src/services/attendance.service.js`) derives a flag **`isNonStoreBound`** from the employee profile (`getEmployeeAttendanceConfig`):

**Non–store-bound** when **any** of:

- `attendancePolicy === 'NO_GEOFENCE'`
- `workMode` is `BACKOFFICE` or `ROAMING`
- `workLocation.storeId` is `backoffice` or `office`

For **store-bound** staff with **strict geofence**, clock-in can use **today’s HR roster** to determine the **assigned store** for validation (roster-first store binding). If **roster enforcement** is enabled and active for the environment date, **missing roster** for today can block clock-in for those users—ops may toggle this via **`ROSTER_ENFORCEMENT_ENABLED`** / **`ROSTER_ENFORCEMENT_START_DATE`** (see attendance service env).

**Practical UI guidance**

| Profile | Onboarding suggestion | Roster planning (admin) | Employee attendance UX |
|---------|------------------------|-------------------------|-------------------------|
| Floor / store staff | `STORE_BOUND`, `STRICT_GEOFENCE`, real **`storeId`** | Ensure roster rows exist for dates/shifts you enforce. | Show store + geofence messaging; if enforcement is on, explain that **schedule must be published** for the day. |
| HQ / corporate | `BACKOFFICE`, `NO_GEOFENCE`, `storeId: "backoffice"` or office id | No daily roster requirement for relaxed path. | Simpler clock-in; no “wrong store” from roster. |
| Field / area | `ROAMING`, `NO_GEOFENCE` | Same as HQ for non–store-bound path. | Same as HQ; align copy with policy. |

**Note:** `FLEXI_SHIFT` is valid in HR/onboarding but **does not** by itself flip **`isNonStoreBound`** in the current attendance implementation. For management-style flexibility today, prefer **`BACKOFFICE`/`ROAMING`** and/or **`NO_GEOFENCE`** (see [MANAGEMENT_BACKOFFICE_RBAC_FRONTEND.md](./MANAGEMENT_BACKOFFICE_RBAC_FRONTEND.md) §4).

---

## 5. Admin vs employee screens (product checklist)

### 5.1 Admin / HR — onboarding & roster

- **Work-details form:** add controls for **work mode** and **attendance policy** (or a single “employee type” preset that maps to the pairs in §4).
- **Store picker:** support sentinel values **`backoffice`** / **`office`** where product allows non-store assignment.
- **Roster tools:** treat **store-bound** employees as the population that **must** have correct roster + store for strict clock-in; **backoffice/roaming** users should not be assumed to need shift rows for the same rules.

### 5.2 Employee app

- After onboarding, read **`workMode`** and **`attendancePolicy`** from the **employee profile** API your app already uses (same fields on `User` in HR).
- Branch **copy and flows**:
  - **Store-bound / strict:** emphasize **assigned store**, **location permission**, and optionally **today’s shift** if you surface roster from HR APIs.
  - **Non–store-bound:** avoid implying they must be at a retail store to clock in.

---

## 6. Post-onboarding corrections

HR can fix mistakes via **employee update** (`PUT` on your gateway’s employee endpoint) including **`workMode`** and **`attendancePolicy`** where allowed—no need to redo the whole wizard. See [MANAGEMENT_BACKOFFICE_RBAC_FRONTEND.md](./MANAGEMENT_BACKOFFICE_RBAC_FRONTEND.md) §5.

---

## 7. Related docs & code

| Topic | Location |
|--------|----------|
| Enums, labels, attendance summary | [MANAGEMENT_BACKOFFICE_RBAC_FRONTEND.md](./MANAGEMENT_BACKOFFICE_RBAC_FRONTEND.md) |
| Onboarding validation | `microservices/hr-service/src/routes/onboarding.routes.js` |
| Default resolution | `microservices/hr-service/src/services/onboarding.service.js` (`resolveAttendanceConfig`, `addWorkDetails`) |
| Clock-in / roster | `microservices/attendance-service/src/services/attendance.service.js` (`getEmployeeAttendanceConfig`, roster fetch paths) |
| User schema fields | `microservices/hr-service/src/models/User.model.js` |

---

*Keep this doc in sync when onboarding Joi or attendance `isNonStoreBound` rules change.*
