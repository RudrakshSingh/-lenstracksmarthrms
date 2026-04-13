# Management, backoffice work mode & attendance policy — frontend guide

This document describes how **work mode**, **attendance policy**, and **RBAC** work together so frontend teams can build onboarding, employee edit screens, and attendance UX correctly.

---

## 1. Why this exists

Retail/store staff are usually tied to a **store**, **roster**, and **geofence** for clock-in. **Management and backoffice** users are often **not bound to a single store** and may work **from anywhere**. The backend models that with two fields on the employee (`User`) record plus optional **special `storeId` values** during onboarding.

---

## 2. User profile fields (HR / `User` model)

| Field | Type | Allowed values | Default |
|--------|------|----------------|---------|
| `workMode` | string enum | `STORE_BOUND`, `BACKOFFICE`, `ROAMING` | `STORE_BOUND` |
| `attendancePolicy` | string enum | `STRICT_GEOFENCE`, `NO_GEOFENCE`, `FLEXI_SHIFT` | `STRICT_GEOFENCE` |

These are persisted on the employee document returned by HR APIs (shape may be nested under `workLocation` for legacy address data; **`workMode` and `attendancePolicy` are top-level** on the user schema).

**Recommended UX copy (labels)**

| Value | Suggested label | Notes |
|--------|-----------------|--------|
| `STORE_BOUND` | Store-bound | Default for floor/store staff. |
| `BACKOFFICE` | Backoffice / HQ | Not tied to a retail store location. |
| `ROAMING` | Field / roaming | Travels; not fixed to one store. |
| `STRICT_GEOFENCE` | Strict geofence | Must be near assigned store; roster rules apply as configured. |
| `NO_GEOFENCE` | No geofence | Clock-in without location check (when combined with non–store-bound mode; see §4). |
| `FLEXI_SHIFT` | Flexi shift | **Stored** on profile; see §4 for current attendance behavior. |

---

## 3. Onboarding: work-details step

**Routes (HR service, behind gateway — paths are typically prefixed as your env defines, e.g. `/api/hr`):**

- `POST .../onboarding/work-details`
- `POST .../work-details` (backward-compatible alias)

**Body:** same `workDetailsSchema` as in `onboarding.routes.js`. Relevant optional fields:

```json
{
  "employeeId": "<id from step 1>",
  "jobTitle": "...",
  "department": "...",
  "designation": "...",
  "role_family": "...",
  "joining_date": "...",
  "annual_ctc": 0,
  "storeId": null,
  "workMode": "BACKOFFICE",
  "attendancePolicy": "NO_GEOFENCE"
}
```

- `workMode` and `attendancePolicy` are **optional** in Joi; if omitted, the server applies defaults (`STORE_BOUND` + `STRICT_GEOFENCE`) **unless** `storeId` is a special value (see §3.1).

### 3.1 Special `storeId` values during onboarding

If `storeId` is the string **`backoffice`** or **`office`** (case-insensitive in resolution), and the client **does not** send `workMode` / `attendancePolicy`, the server **defaults**:

- `workMode` → `BACKOFFICE`
- `attendancePolicy` → `NO_GEOFENCE`

So the frontend can either:

- Send explicit `workMode` + `attendancePolicy`, or  
- Send `storeId: "backoffice"` (or `"office"`) and omit the two fields to get backoffice-friendly defaults.

---

## 4. How attendance service uses this (product behavior)

Logic lives in `attendance-service` (`getEmployeeAttendanceConfig`). An employee is treated as **non–store-bound** (relaxed roster/geofence path) when **any** of these hold:

- `attendancePolicy === 'NO_GEOFENCE'`, or  
- `workMode` is `BACKOFFICE` or `ROAMING`, or  
- `workLocation.storeId` is `backoffice` or `office` (string match).

**Important:**

- **`FLEXI_SHIFT`** is valid in the HR schema and onboarding Joi, but **does not** by itself trigger the non–store-bound path in the current attendance implementation. For management/backoffice flexibility today, use **`BACKOFFICE` or `ROAMING`** and/or **`NO_GEOFENCE`** (and/or special `storeId` / `workLocation.storeId` as above).

Non–store-bound employees may still need a **fallback store** record for internal consistency; the service can resolve a tenant store when none is assigned. Attendance records can include `attendance_policy` reflecting the configured policy.

---

## 5. Post-onboarding: editing an employee

`PUT` employee update (e.g. `PUT /api/employees/:id` in HR — exact path follows your gateway mount) uses `User.findOneAndUpdate` with `$set` for allowed fields. **`workMode` and `attendancePolicy`** are on the `User` model and can be updated if the request body includes them (subject to the same enum values). Use this for HR to correct mistakes without redoing onboarding.

Always send **`x-tenant-id`** (or your standard tenant header) on tenant-scoped calls.

---

## 6. RBAC (roles vs “Management” department)

These are **different concepts**:

| Concept | Meaning |
|--------|---------|
| **JWT `role`** | Controls API access: e.g. `employee`, `manager`, `hr`, `admin`, `superadmin`. Middleware: `requireRole` in HR service. |
| **Department / designation / `role_family`** | Organizational labels (e.g. department `"Management"`). They do **not** automatically change attendance rules unless you also set `workMode` / `attendancePolicy` / store. |

### 6.1 `requireRole` behavior (simplified)

- **`SuperAdmin`** and **`Admin`**: bypass role checks for allowed routes.  
- **`HR`**: treated as privileged for many HR operations.  
- Other callers must match one of the **allowed roles** on the route (e.g. roster updates often allow `HR`, `Admin`, `SuperAdmin`, `Manager`).

So a **Manager** user can access routes explicitly listing `Manager`, while **management employees** (department) who are still `employee` role only get **employee**-scoped APIs unless their role is changed in auth/onboarding.

**Frontend checklist:**

- **Screen visibility** → use JWT claims: `role`, and optionally `permissions` if your auth payload includes them.  
- **Attendance strictness** → use **`workMode` / `attendancePolicy`** (and store/roster), not department name alone.

---

## 7. Suggested form defaults for “management / backoffice”

| Scenario | `workMode` | `attendancePolicy` | `storeId` (onboarding) |
|----------|------------|---------------------|-------------------------|
| Store staff | `STORE_BOUND` | `STRICT_GEOFENCE` | Real store id |
| HQ / corporate | `BACKOFFICE` | `NO_GEOFENCE` | `backoffice` or real office id if you model one |
| Area managers / travellers | `ROAMING` | `NO_GEOFENCE` | Optional / special values per product rules |

---

## 8. Quick reference — enum strings (exact casing)

Send these **exact** uppercase strings in JSON:

**workMode:** `STORE_BOUND` | `BACKOFFICE` | `ROAMING`  
**attendancePolicy:** `STRICT_GEOFENCE` | `NO_GEOFENCE` | `FLEXI_SHIFT`

---

## 9. Files to read in the repo (for integration details)

| Area | Location |
|------|----------|
| User schema | `microservices/hr-service/src/models/User.model.js` |
| Onboarding validation | `microservices/hr-service/src/routes/onboarding.routes.js` (`workDetailsSchema`) |
| Resolution / defaults | `microservices/hr-service/src/services/onboarding.service.js` (`resolveAttendanceConfig`) |
| Clock-in behavior | `microservices/attendance-service/src/services/attendance.service.js` (`getEmployeeAttendanceConfig`, `clockIn` / `clockOut`) |
| RBAC middleware | `microservices/hr-service/src/middleware/rbac.middleware.js` |

---

*Last updated: aligned with backend enums and attendance non–store-bound logic as implemented in-repo.*
