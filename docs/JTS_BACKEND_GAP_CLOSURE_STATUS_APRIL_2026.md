# JTS backend — gap closure status (April 2026)

**Audience:** frontend, backend, product  
**Purpose:** Replace outdated “not implemented” lists. The **`jts-service`** codebase already includes most capabilities that older blueprint gap docs marked missing.

---

## 1) Summary table (old gap → current state)

| Topic (from older gap notes) | Status | Where |
|------------------------------|--------|--------|
| **Recurrence rules** | Implemented | `POST/GET/PUT/DELETE` under `/api/jts/recurrence-rules` and `/jts/recurrence-rules` (`recurrence.routes.js`); job: `slaAndRecurrence.job.js` |
| **Timer session history** | Implemented | `GET .../tasks/:id/timer/sessions` (`timer.routes.js` → `getTaskTimerSessions`) |
| **Bulk tasks** | Implemented | `POST /api/jts/tasks/bulk` (and `/jts/tasks/bulk`) — `task.controller.bulkTasks`, max 50 ids |
| **Force-complete** | Implemented | `POST .../tasks/:id/force-complete` — `task.controller.forceCompleteTask` (manager+ roles) |
| **Lifecycle: start, submit-review, reopen, cancel, block, unblock** | Implemented | `task.routes.js` — `POST /:id/start`, `submit-review`, `reopen`, `cancel`, `block`, `unblock` |
| **Dedicated reassign** | Implemented | `POST .../tasks/:id/reassign` (manager roles) |
| **Split analytics** | Implemented | `GET /api/jts/analytics/overview`, `/by-employee`, `/by-team`, `/by-task-type`, plus aggregate `/analytics` (`hrmsJtsCompat.routes.js`) |
| **Activity stream** | Implemented | `GET .../tasks/:id/activities` — `getTaskActivities` / `listTaskActivities` |
| **Stable error shape** | **Improved** | `buildErrorBody` in `apiError.util.js` (`success`, `code`, `message`, `error` alias); validation via `validate.middleware.js`; ongoing: replace ad-hoc `res.json({ success: false ... })` in remaining controllers |

---

## 2) Error contract (target)

Non-2xx JSON should include at minimum:

```json
{
  "success": false,
  "code": "STABLE_MACHINE_CODE",
  "message": "Human readable summary",
  "error": "STABLE_MACHINE_CODE"
}
```

Optional: **`details`** (array) for validation. Controllers should prefer **`buildErrorBody`** from `utils/apiError.util.js`.

Known human messages for common codes are centralized in **`toMessageFromCode`** / `CODE_MESSAGES` in `apiError.util.js` (extended April 2026).

### 2.1 Controllers normalized (April 2026)

Ad-hoc `{ success: false, error, code }` without **`message`** was replaced with **`buildErrorBody`** / **`actorUnresolvedBody()`** in:

- `task.controller.js` (incl. shared actor-unresolved helper)
- `hrmsJtsCompat.controller.js`
- `timer.controller.js`
- `jtsAdmin.controller.js` (incl. list tenants 500 + tenant scope 403)
- `recurrence.controller.js`
- `selfTask.controller.js`
- `taskCollaboration.controller.js` (`employeeOr403`)
- `notification.controller.js`
- `performanceManagement.controller.js`

Auth / RBAC / validation middleware already used **`buildErrorBody`**.

---

## 3) What is still “blueprint vs reality” (not same as “missing”)

`docs/JTS_BLUEPRINT_GAP_ANALYSIS.md` compares a **rich blueprint** to current Mongo schema. Many fields (full recurrence UI, rich `Task` fields, soft delete, etc.) are **product scope** decisions — not absent HTTP routes.

For **API parity** with the handoff doc, use:

- **`docs/JTS_API_CONTRACT_V1_FRONTEND.md`** (updated where endpoints moved from “unsupported” to implemented)

---

## 4) Deploy note

After pulling these changes, rebuild and rollout **`etelios-jts-service`** image so production matches this behaviour.

---

*Last updated: April 2026*
