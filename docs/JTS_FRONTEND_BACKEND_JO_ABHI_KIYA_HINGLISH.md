# JTS — backend ne abhi kya fix / add kiya hai (frontend dev ke liye, Hinglish)

**Purpose:** Lenstrack / HRMS MFE jo **`jts-service`** ko call karti hai — yeh document batata hai **recent backend changes** kya hain, **URLs**, **body**, **response**, aur **UI mein kya dhyaan rakhna hai**. Base path usually **`/api/jts`** (Next proxy se) ya **`/hrms/api/jts`** — dono HR service se jts-service par forward ho sakte hain.

**Headers (jaise pehle):** `Authorization: Bearer <token>`, `X-Tenant-Id: <tenant>` (JWT ke `tenantId` jaisa, lowercase).

---

## 1. Bulk tasks — ek hi request mein kaafi tasks par action

**Problem pehle:** MFE client mein `bulkTasks()` reject ho jata tha — service par endpoint nahi tha.

**Ab kya hai:** `POST /api/jts/tasks/bulk`

**Body example:**

```json
{
  "action": "complete",
  "taskIds": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
  "payload": { "notes": "optional", "reason": "optional" }
}
```

**`action` values:** `complete` | `force_complete` | `accept` | `reject` | `start` | `cancel`  
**Limit:** ek request mein maximum **50** task IDs.

**Response shape:** `success: true`, `data.succeeded[]` (har item mein `taskId` + `task` object), `data.failed[]` (har item mein `taskId` + `code` — error string). **Ek task fail hone se poora batch fail nahi hota.**

**Frontend kya kare:** Board / multi-select actions ke liye isi endpoint ko use karo; purana “loop mein 50 baar API” optional hai ab.

---

## 2. Force complete — manager / admin ke liye “zabardasti complete”

**Problem pehle:** Checklist incomplete ya timer proof na ho to normal `complete` fail ho sakta tha; review queue (`requires_review`) par task `PENDING_REVIEW` chala jata tha jab manager seedha `COMPLETED` chahta ho.

**Ab kya hai:** `POST /api/jts/tasks/:id/force-complete`  
**Kaun call kar sakta hai:** sirf **privileged roles** — `MANAGER`, `STORE_MANAGER`, `CLUSTER_MANAGER`, `COUNTRY_OPS`, `TENANT_ADMIN`, `HOD`, `SUPERADMIN`, `ADMIN`.

**Body:** `{ "notes": "optional" }`

**Behavior:**

- **Checklist** aur **timer proof** wale gates **is transition par skip** ho sakte hain (override).
- **`requires_review` true** ho to bhi final status **`COMPLETED`** hi aata hai — **`PENDING_REVIEW` queue mein nahi bhejta** (normal `complete` ab bhi review flow follow karta hai).

**Error code:** agar non-manager force complete kare to **`JTS_FORCE_COMPLETE_FORBIDDEN`** (403).

**Frontend kya kare:** “Force close” / “Override complete” button sirf manager+ ko dikhao; normal employee flow **`POST .../complete`** hi rakho.

---

## 3. Extension request — due date badalne ka approval

**Problem pehle:** Docs mein likha tha `POST .../extension-requests` exist nahi karta — sirf collaboration route `POST .../tasks/:taskId/approvals` se `EXTENSION_APPROVAL` bhejna padta tha.

**Ab dono kaam karte hain:**

1. **Naya shortcut (recommended):** `POST /api/jts/tasks/:id/extension-requests`
2. **Purana tareeka:** `POST /api/jts/tasks/:taskId/approvals` with `approval_type: EXTENSION_APPROVAL`

**Extension-requests body:** kam se kam **ek** hona chahiye — nayi due **`newDueAt` / `due_at` / `dueAt`** **ya** **`extensionMinutes` / `extendMinutes`**.  
**Approver:** `approverEmployeeId` / `approver_employee_id` bhejo; agar task par pehle se **`approver_employee_id`** set hai to **omit bhi kar sakte ho** — backend task se le lega.

**Response:** `201`, approval row (jaise pehle approvals create hoti thi).

**Frontend kya kare:** Naya screen flow `extension-requests` use kare; approve / reject ab bhi **`/api/jts/approvals/:id/approve`** etc. se hi hoga.

---

## 4. Reopen — ek hi click / ek hi API se wapas “kaam shuru”

**Problem pehle:** Pehle socha gaya tha reopen ke baad UI ko alag se **`start`** call karna padega.

**Ab behavior (fix):** `POST /api/jts/tasks/:id/reopen` **ek hi request** mein:

- Agar task **`COMPLETED`** hai → pehle **`REOPENED`**, phir **`IN_PROGRESS`** (history mein don transitions dikhenge).
- Agar already **`REOPENED`** hai → seedha **`IN_PROGRESS`**.

**Message:** success par roughly *“reopened and set to in progress”* — matlab **assignee turant kaam continue** kar sakta hai, alag `start` zaroori nahi.

**Error:** Agar task **`COMPLETED` / `REOPENED` ke alawa** status mein ho (jaise sirf `IN_PROGRESS`) to **`400`**, code **`TASK_REOPEN_INVALID_STATE`**.

**Frontend kya kare:** Reopen button ke baad **automatically board par “In Progress”** dikhao; extra `POST .../start` tabhi bhejna jab tum intentionally do-step UX chahte ho (warna zaroorat nahi).

---

## 5. Analytics — filters ab **actually** lagte hain

**Query params:** `timeRange` (`3months` | `6months` | `1year`), `department` (OrgNode **name** substring match), `teamId` (task ka **`scope_org_node_id`** ObjectId).

- **`timeRange`:** tasks filter by **`created_at`** us window ke andar.
- **`department`:** naam se **OrgNode** dhundh ke un employees par tasks jinka **`assigned_to_employee_id`** us org ke under hai.
- **`teamId`:** task par **`scope_org_node_id`** exact match.

Response **`meta.filters`** mein wahi values echo hoti hain; agar department match na ho to **`filtersEmpty: true`** + zero-ish payload.

---

## 6. Analytics — alag-alag URLs (pehle sab `/analytics` pe map ho rahe the)

**Problem pehle:** Handoff docs ke mutabiq `overview`, `by-employee`, `by-team`, `by-task-type` alag endpoints the blueprint mein — client sab ko same `GET /analytics` pe bhej raha tha.

**Ab kya hai — sab `jts-service` + HR proxy par:**

| URL | `meta.view` | roughly kya milta hai |
|-----|-------------|------------------------|
| `GET /api/jts/analytics` | `full` | poora bundle: `overall`, `byDepartment` / `byTeam`, `byEmployee`, `byTaskType`, `trends`, `byStatus`, `openAlerts` |
| `GET /api/jts/analytics/overview` | `overview` | sirf `overall`, `byStatus`, `openAlerts` (lightweight dashboard) |
| `GET /api/jts/analytics/by-employee` | `by-employee` | assignee-wise counts |
| `GET /api/jts/analytics/by-team` | `by-team` | org-node / department rollup (`byTeam` + `byDepartment`) |
| `GET /api/jts/analytics/by-task-type` | `by-task-type` | task type ke hisaab se totals |

**Query params (optional, sab par same accept):** `timeRange`, `department`, `teamId` — **ab upar §5 ke hisaab se tasks / reviews / alerts par apply hota hai.**

**Frontend kya kare:** `packages/hrms-mfe` ke **`JtsClient`** mein **`getAnalyticsOverview`**, **`getAnalyticsByEmployee`**, etc. **alag paths** call karte hain — full bundle sirf **`getAnalytics()`** se lo.

---

## 7. Naye “close the gap” endpoints (same `/api/jts` prefix)

| Endpoint | Kaam |
|----------|------|
| `GET /api/jts/sla-policies` | Catalog `GET /catalog/sla-rules` jaisa list (**alias**). |
| `GET /api/jts/sla-policies/:id` | Ek SLA rule by id (**alias**); canonical: `GET /api/jts/catalog/sla-rules/:id`. |
| `GET /api/jts/escalations/console` | Recent escalation **events** + active **rules** + approx count tasks jinka `escalation_level > 0`. |
| `GET /api/jts/reviews/queue` | **Performance reviews** + logged-in user ke **pending task approvals** ek hi response mein (`data.performanceReviews`, `data.taskApprovalsPending`). |

**Pagination standard:** `GET /api/jts/tasks` (list) aur workday list ab **`meta.pagination`** + top-level `page`/`limit`/`total` dono dete hain (`httpEnvelope` helper).

**TaskType (admin/catalog):** optional **`checklist_template`**, **`allowed_role_keys`** fields add kiye — naye tasks par default checklist / role gate product layer use kar sakta hai.

**Notifications:** in-app rows par optional **`delivery_channels`** (e.g. `['in_app']`) — email ab bhi **EmailQueue** se alag flow.

---

## 8. MFE client (`jts-client.ts`) — jo update hua

- **`bulkTasks()`** — ab real **`POST .../tasks/bulk`** (pehle hard reject).
- **`forceCompleteTask()`** — ab **`POST .../force-complete`** (pehle galat tareeke se normal `complete` call ho raha tha).
- **`createExtensionRequest()`** — naya helper **`POST .../extension-requests`** ke liye; purana **`createExtensionApproval()`** ab bhi collaboration route ke liye valid hai.
- **Analytics methods** — slice endpoints + **§5 filters** `meta.filters` mein echo.

---

## 9. Misc technical notes (short)

- **`meta` envelope:** Kai responses mein ab **`meta`** field aa sakti hai (jaise `view: 'full' | 'overview' | ...`). Old clients ignore kar sakte hain.
- **Pagination:** Task list + workday list ab **`meta.pagination`** ke saath consistent envelope (`buildListResponse`).
- **Gap analysis doc (`JTS_BLUEPRINT_GAP_ANALYSIS.md`):** purana hai — kaafi cheezein implement ho chuki hain; is document ko **“abhi kya ship hua”** maano.

---

## 10. Quick reference — naye / important endpoints

```
POST   /api/jts/tasks/bulk
POST   /api/jts/tasks/:id/force-complete
POST   /api/jts/tasks/:id/extension-requests
POST   /api/jts/tasks/:id/reopen          # COMPLETED/REOPENED → ends IN_PROGRESS

GET    /api/jts/analytics
GET    /api/jts/analytics/overview
GET    /api/jts/analytics/by-employee
GET    /api/jts/analytics/by-team
GET    /api/jts/analytics/by-task-type

GET    /api/jts/sla-policies
GET    /api/jts/sla-policies/:id
GET    /api/jts/escalations/console
GET    /api/jts/reviews/queue
```

---

*Last updated: JTS backend alignment pass (bulk, force-complete, extension shortcut, reopen chain, analytics slices, MFE client). English API contract detail ke liye `docs/JTS_FRONTEND_DEVELOPER_IMPLEMENTATION_GUIDE.md` bhi dekho.*
