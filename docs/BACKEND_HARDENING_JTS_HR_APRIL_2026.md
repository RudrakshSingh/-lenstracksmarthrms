# Backend hardening: JTS + HR (April 2026) — what changed and why

**Purpose:** Single place to explain **recent backend work** on **JTS** and **HR** services: symptoms often appeared in the **web app first** (failed task create, confusing errors, wrong screen data), while root causes were **contract gaps, race conditions, and error-shape bugs** that are now fixed **server-side** so clients do not need fragile workarounds.

This is **not** “only frontend was wrong” — production systems fail at the **integration boundary**. Here, the **backend** now owns **deterministic IDs**, **atomic sequences**, **correct HTTP status codes**, and **stable error codes** so the UI can show one clear message instead of random 502/500 text.

---

## 1. Task creation: duplicate code / 409 / “Conflict”

**What users saw:** Creating a task sometimes returned **409** or a **500** with Mongo duplicate-key noise.

**Root cause (backend):** Task human-readable codes (`JTS-YYYY-NNNNNN`) must stay unique per tenant. A **race** existed when **self-task** code allocation ran **inside a DB transaction session** while **manager** task creation ran **outside** — uncommitted counter increments were invisible to other requests, so **two flows could receive the same code** → Mongo `E11000` on `(tenant_id, code)`.

**Backend fix (jts-service):**

- `TaskCodeCounter` allocation **never** uses a multi-document **session** for the counter increment; clash checks use committed data only.
- **Retry** on rare `TaskCodeCounter` upsert races.
- **Normalized** `tenant_id` on manager task create to a single ObjectId shape for history + documents.
- Standard app code **`TASK_CODE_DUPLICATE`** with **409** where applicable.

**Why it felt “frontend”:** The button “Create task” is on the UI; users blame the page. The failure was **server allocation semantics**, now fixed so **retry** and **normal load** succeed without duplicate codes.

---

## 2. HR API gateway: JTS proxy and raw Mongo errors

**What users saw:** Through the HR host (`/api/jts/*`), errors sometimes surfaced as **502** or **500** with raw duplicate-key strings.

**Root cause (backend):** Upstream JTS occasionally returned **500** with `E11000` in the body; the browser only showed a generic failure.

**Backend fix (hr-service):** JTS proxy maps **duplicate key on task code** to **409** + stable payload (`TASK_CODE_DUPLICATE`) + user-facing message, including in axios **error** paths — not only success-shaped responses.

**Why it felt “frontend”:** Same-origin calls from the MFE go to **one host**; when the proxy hid the real status, the **toast** looked like a “UI bug”. The **contract** is now normalized at the **proxy**.

---

## 3. Error payload: Mongo message mistaken for “error code”

**What users saw:** API `code` field sometimes looked like a long Mongo string instead of **`TASK_CODE_DUPLICATE`**.

**Root cause (backend):** Global error helper treated **`error.message`** as the application code for some paths.

**Backend fix (jts-service):** **`resolveApplicationErrorCode`** maps Mongo duplicate keys on the tasks index to **`TASK_CODE_DUPLICATE`** before building the JSON body.

**Why it felt “frontend”:** The UI tries to map `code` to a friendly string; when `code` was garbage, **i18n / toasts** broke. Fixing **canonical codes** is a **backend** responsibility.

---

## 4. HR performance / employee “view” route

**What users saw:** **`GET /api/hr/employee/:id`** could **500** when loading performance-related data for an employee.

**Root cause (backend):** Performance handler queried by **business employee code** where the schema expected a **Mongo ObjectId** reference.

**Backend fix (hr-service):** Query performance reviews by the **employee document’s `_id`**, aligned with the rest of HR profile routes.

**Why it felt “frontend”:** The SPA calls “employee detail”; the **server** crashed on a specific sub-path. The **route** is now consistent so the **same URL** works for profile + performance summary.

---

## 5. JTS catalog: `bind-from-jwt` for employees

**What users saw:** **`JTS_ACTOR_EMPLOYEE_NOT_RESOLVED`** or **403** when a normal employee tried to link their HR user to the JTS catalog.

**Root cause (backend):** Route was restricted to roles that excluded typical **EMPLOYEE** tokens; service could not always create a catalog row without HR context.

**Backend fix (jts-service):** Authenticated bind path + optional **HR lookup** to bootstrap catalog rows where needed (with correct **OrgNode** prerequisites).

**Why it felt “frontend”:** The button “Continue” in onboarding is visible in the **UI**; the **authorization + data** contract lived in **JTS + HR**.

---

## 6. Deployments (reference)

Images were built and rolled out to **`etelios-prod`** (AWS ECR + Kubernetes), including at least:

- **`etelios-hr-service:latest`**
- **`etelios-jts-service:latest`**

Exact digests change with each push; use your registry / `kubectl describe deployment` for the pin in force at audit time.

---

## 7. What clients should still do (minimal)

Even with backend fixes, **clients** should:

- Send **`Authorization: Bearer`** from the **current** login (avoid mixing **cookies** from another session).
- Send **`X-Tenant-Id`** equal to JWT `tenantId` (usually `upcapto`, `lenstrack`, etc., lowercased).
- Map stable codes (**`TASK_CODE_DUPLICATE`**, **`JTS_ACTOR_EMPLOYEE_NOT_RESOLVED`**, **`TENANT_MISMATCH`**) to user-visible copy — see shared **`jts-error`** helpers in the MFE where applicable.

---

*Last updated: April 2026*
