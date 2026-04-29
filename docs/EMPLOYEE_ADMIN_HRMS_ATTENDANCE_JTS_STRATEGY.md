# Employee & Admin Experience, Attendance, HRMS Docs, and JTS — Market Strategy

**Purpose:** Define what to build so **login experiences**, **attendance**, **HRMS documentation**, and **JTS** (Job / Task System — tasks, timers, SLA, performance, HRMS compat) compete credibly in **India** and **globally**.

**Audience:** Product, UX, engineering, HR ops, compliance, support.

**Related in this repo:** `microservices/auth-service`, `attendance-service`, `hr-service`, `jts-service`; docs `JTS_API_REFERENCE.md`, `JTS_EMPLOYEE_SYNC.md`, `JTS_PROD_DEPLOY.md`.

---

## 1. Principles (what “best in market” actually means)

1. **Two truths, one platform:** **Employee** self-service must feel fast and respectful; **Admin/HR** tools must feel powerful, bulk-capable, and audit-safe. Same data model, different surfaces and permissions.
2. **Compliance by design (India):** Attendance and leave touch **shops & establishments**, **factory rules** (where applicable), **state-wise** holidays/OT, and downstream **payroll** — mistakes here destroy trust.
3. **Global readiness:** Multi-language UI, time zones, **region-aware** workweek and holiday calendars, **data residency** options, and **labor law** configurability (not one hard-coded “US” or “IN” rule).
4. **Documentation where work happens:** Policies and “how to” live **in-app**, versioned, and searchable — not only a static PDF site.
5. **JTS as the execution layer:** Tasks tie **goals**, **approvals**, **SLAs**, and **proof of work** to the same **employee identity** used for attendance and HR — with **reliable HR ↔ JTS ↔ Auth** linkage (see existing `JTS_EMPLOYEE_SYNC.md`).

---

## 2. Login & identity: employee vs admin

### 2.1 Experience split


| Dimension        | Employee                                                                     | Admin / HR / Manager                                |
| ---------------- | ---------------------------------------------------------------------------- | --------------------------------------------------- |
| **Primary goal** | “My day” — clock, leave, payslip, tasks, requests                            | Configure rules, approve, report, audit             |
| **Home surface** | Mobile-first dashboard, notifications, 1–2 tap actions                       | Web-first tables, filters, bulk actions, exports    |
| **Auth**         | SSO where sold (SAML/OIDC), passkeys, optional step-up for sensitive actions | Strong MFA for approvals, role changes, exports     |
| **Session**      | Long-lived mobile session with secure refresh; geo/IP signals optional       | Shorter admin session; privileged operation re-auth |


### 2.2 Capabilities to add (India + global)

- **Unified identity:** One user record; **many roles** (employee + manager) with **context switcher** instead of duplicate accounts.  
- **Delegated admin / support impersonation:** Time-bound, audited “view as” for IT/HR support (with employee consent where required).  
- **Device trust:** Optional device binding for clock-in to reduce buddy-punching (balance with privacy notice).  
- **Contractor vs employee:** Separate portal flavor or flags — different menus, tax docs, and attendance rules.  
- **Global:** **Preferred language**, **locale** (date/number), **IANA time zone** on every timestamp display and export header.

### 2.3 Trust & compliance (login adjacent)

- **Audit log** of role grants, permission changes, impersonation, password resets.  
- **DPA / subprocessors** page for global buyers; **India** — clarify data location and statutory retention for attendance/payroll.  
- **Accessibility:** WCAG-oriented contrast, focus order, screen reader labels on time clocks and approval buttons.

---

## 3. Attendance: India depth, global flexibility

### 3.1 India — differentiators buyers feel


| Area                             | Build toward                                                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Shifts & rosters**             | Weekly/monthly rosters, grace, minimum hours, split shifts, night shift premiums (configurable by policy).            |
| **Leave + attendance interplay** | Half-day, sandwich rules (configurable), comp-off, LOP auto-suggestions with HR override.                             |
| **OT & rest**                    | Weekly OT caps, **compensation types** (pay vs time off), approval chains aligned to internal employment rules.       |
| **Geo / site rules**             | Geofence with **tamper-evidence** (not just GPS spoof); offline queue with integrity checks for field staff.          |
| **Statutory adjacency**          | Exports and narratives that **payroll** and auditors expect (monthly register, exception report, late/absent trends). |
| **Integrations**                 | Biometric / access-control vendor connectors (where enterprise expects hardware).                                     |


### 3.2 Global — table stakes beyond “clock in/out”

- **Work patterns:** Flexible hours, **core hours**, remote vs hybrid badges, “work location” per day.  
- **Breaks:** Paid vs unpaid break rules by jurisdiction (config packs).  
- **Approvals:** Manager queue with **SLA** (ties naturally to **JTS** for “resolve attendance exception” tasks).  
- **Calendar:** Company + **regional** holidays; support for **floating holidays**.  
- **Exports:** CSV/iCal for shifts; API for workforce systems.

### 3.3 “Best in class” attendance product ideas

- **Exception inbox:** One screen for managers — missing punch, geo mismatch, pattern anomalies — bulk approve with reason codes.  
- **Employee transparency:** “Why was I marked absent?” with rule explanation (reduces HR tickets).  
- **Fairness analytics (privacy-safe):** Team-level adherence vs individual naming only for managers with rights.  
- **Quality:** Idempotent clock APIs, **offline-first** mobile, clear conflict resolution when server and device disagree.

---

## 4. HRMS documentation (not an afterthought)

Treat **documentation** as a product module: **Policy & Knowledge** linked to **roles**, **locations**, and **effective dates**.

### 4.1 Content types


| Type                   | Use                                                                   |
| ---------------------- | --------------------------------------------------------------------- |
| **Employee handbook**  | Versioned; acknowledgment workflow with signature/timestamp.          |
| **SOPs**               | IT, HR, finance procedures — role-gated visibility.                   |
| **Localized policies** | India POSH, leave rules by state; global handbooks by country entity. |
| **In-context help**    | Tooltips and “?” panels bound to screen IDs (locale-specific).        |
| **FAQ + search**       | Federated search across policies, tickets, and JTS task templates.    |


### 4.2 Workflows

- **Publish → acknowledge:** Mandatory reads on login or before first clock-in of a period.  
- **Attestation:** Annual compliance packs (code of conduct, IT security).  
- **Integration with JTS:** “Read policy X” as a **task** with due date and completion proof.

### 4.3 Global + India specifics

- **Languages:** Hindi + English minimum for India enterprise; RTL and major EU languages for global.  
- **Legal:** Version history who-changed-what; export for **labour inspections** or internal audit.  
- **POSH / DEI:** Confidential reporting links and **access-isolated** case handling (separate permission domain).

---

## 5. JTS (Job / Task System) — product direction

Your **jts-service** already covers tasks, subtasks, timers, SLA, performance, notifications, attachments (presigned), catalog (employees, org nodes, attendance records API), and **HRMS compatibility** routes. Market-winning work is mostly **orchestration, UX, and identity glue**.

### 5.1 Identity & sync (critical path)

- **Zero-friction link:** HR employee create/update should **reliably** create or update **JTS Employee** with `code` = HR `employee_id` and `auth_user_id` where applicable (today documented as manual/optional — automate for scale).  
- **Single employee truth:** Clear resolution order (JWT `employee_id`, `auth_user_id`, etc.) documented for support — reduce `**jtsLinked: false`** incidents.  
- **Admin tooling:** Bulk “align auth” and repair wizards with audit trail.

### 5.2 Employee-facing JTS (differentiation)

- **My work today:** Tasks due, timers, approvals I owe, approvals waiting on others.  
- **Deep links** from notifications to the exact task/subtask.  
- **Offline-tolerant** task list for field roles; sync with conflict rules.

### 5.3 Manager / admin JTS

- **Templates:** Onboarding checklist, exit checklist, **attendance exception** resolution, **performance cycle** tasks.  
- **SLA dashboards:** Breach risk, reassignment, escalation paths (you have SLA jobs — surface in product UI).  
- **Cross-module tasks:** “Verify leave balance before approve leave” — deep link to HR with return context.

### 5.4 India-relevant JTS use cases

- **Statutory deadlines:** PF/ESI/TDS calendar tasks assigned to finance + HR with attachments and sign-off.  
- **Store openings:** Checklist tied to **attendance** and **inventory** handoffs.  
- **Audit packs:** Collect evidence across modules into one **task bundle**.

### 5.5 Global-relevant JTS use cases

- **GDPR / privacy tasks:** ROPA updates, retention reviews, DSAR handling checklist.  
- **Security access reviews:** Quarterly cert tasks with evidence attachments.

---

## 6. Unified roadmap (employee, HR, attendance, docs, JTS)


| Phase                          | Theme                    | Deliverables                                                                                     |
| ------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------ |
| **0 — Trust**                  | Identity & audit         | Role model clarity, MFA for privileged actions, impersonation audit, device/session policy docs. |
| **1 — Employee daily**         | Mobile excellence        | Clock, leave, payslip/documents, **My tasks** (JTS), notifications, offline clock queue.         |
| **2 — Manager ops**            | Throughput               | Exception inbox, bulk approvals, team attendance + leave + tasks in one cockpit.                 |
| **3 — India compliance depth** | Rules + exports          | State/shift/OT packs; statutory-friendly exports; payroll alignment tests.                       |
| **4 — HRMS docs**              | Policy as product        | Handbook versioning, acknowledgments, in-app help, POSH-safe flows.                              |
| **5 — JTS scale**              | Automation               | HR-driven employee sync to JTS; task templates library; SLA executive summaries.                 |
| **6 — Global**                 | Localization & law packs | i18n, time zones, regional holiday packs, break/overtime rule packs, residency story.            |


---

## 7. Success metrics (suggested)

- **Login / identity:** MFA adoption among admins; failed login / lockout rate; impersonation events 100% audited.  
- **Attendance:** Punch success rate; median exception resolution time; payroll **re-run rate** due to attendance errors.  
- **Docs:** % employees with up-to-date acknowledgments; reduction in “policy” support tickets.  
- **JTS:** % users `jtsLinked`; task on-time completion; SLA breach rate trend; NPS from managers.

---

## 8. What not to over-promise

- **“Best globally”** requires years of **payroll + tax + labor** depth per country. Win on **India depth + clean employee UX + reliable JTS/attendance glue**, with a credible **global config** story.  
- **Biometric and legal:** Geo and surveillance features need **clear policy** and regional legality review.

---

## 9. References inside this repository

- `docs/JTS_API_REFERENCE.md` — API surface.  
- `docs/JTS_EMPLOYEE_SYNC.md` — HR / auth ↔ JTS employee linking.  
- `docs/JTS_PROD_DEPLOY.md` — deployment and routing.  
- `docs/ACCOUNTING_PAYROLL_FINANCE_TALLY_STRATEGY.md` — payroll/finance/Tally alignment.

---

*Document version: 1.0*