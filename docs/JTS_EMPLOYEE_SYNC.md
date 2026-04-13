# Linking HR / auth users to JTS `Employee` rows

HR dashboard **`widgets.tasks`** and **`GET /api/jts/tasks/summary/me`** need a **JTS `Employee`** document that matches the logged-in user. Resolution order in JTS (`actor.util.js`):

1. `Employee._id === JWT sub` (unusual)
2. `Employee.auth_user_id ===` Auth **User** `._id` (JWT `sub` / `id`)
3. `Employee.code ===` normalized JWT **`employee_id`** (e.g. `EMP-2026-…`)

If none match → **`jtsLinked: false`** and task counts are **0**.

## Operational steps

### A) Admin creates employees in JTS catalog

Use **`POST /api/jts/catalog/employees`** (or `/jts/catalog/employees` via ingress) with `code` aligned to HR **`employee_id`**, and optionally **`auth_user_id`** set to the Auth service user ObjectId.

### B) Self-service bind (user already has JWT)

If a JTS employee row exists with the **same code** as the JWT `employee_id`:

- **`POST /api/jts/catalog/employees/bind-from-jwt`** (authenticated as that user)  
  Sets **`auth_user_id`** on the matching employee.

Call this once after login or from an onboarding “Enable tasks” step in the MFE.

### C) Admin link without code alignment

- **`PUT /api/jts/catalog/employees/:id/auth-user-link`** with body `{ "auth_user_id": "<User ObjectId>" }**

## Automation (future)

- On **HR employee create/update**, call JTS admin API or a queue worker (not wired in this repo by default).
- Optional: scheduled job that lists HR active users and upserts JTS employees per tenant (requires shared tenant + org-node rules).

See also: `microservices/jts-service/src/utils/actor.util.js`, `jtsAdmin.service.js`.
