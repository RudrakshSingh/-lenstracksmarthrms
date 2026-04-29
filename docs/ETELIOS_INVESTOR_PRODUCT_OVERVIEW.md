# Etelios — Investor & Stakeholder Product Overview

**Document type:** Product and platform summary for investors, partners, and senior stakeholders.  
**Codebase:** Lenstrack Smart HRMS (Etelios backend platform) — `microservices/`, `k8s/`, `docs/`.  
**Production reference:** Kubernetes namespace `etelios-prod`, primary API host `api.etelios.com` (per `k8s/etelios-prod/README.md`).  
**As-of:** April 2026 (derived from repository layout, `docker-compose.yml`, and internal architecture docs).

**Important:** This document describes **platform capabilities evidenced in code and deployment**, plus a **forward-looking development roadmap**. It is not a financial forecast, customer count, or legal warranty. Metrics and timelines in the roadmap should be validated by leadership before external commitments.

---

## 1. Executive summary

Etelios (Lenstrack Smart HRMS) is a **multi-tenant enterprise platform** delivered as **domain microservices** behind an **API gateway**, with production-oriented **Kubernetes** manifests and operational runbooks. The stack spans **people operations** (auth, HR, attendance, payroll), **work execution** (Job/Task System — JTS), **commercial operations** (CRM, sales, purchase, inventory), **finance & compliance** (financial accounting, statutory payroll exports), **documents**, **notifications**, **analytics**, and **monitoring**.

**Investor thesis (technical):** A modular architecture allows **vertical focus** (e.g. retail, healthcare, services) without rewriting core HR and identity; **India-relevant** workflows (attendance, payroll compliance hooks, GST-oriented financial service) can deepen while **global** patterns (multi-tenant isolation, RBAC, API-first) support expansion.

**Investor thesis (product):** The same platform can sell **employee self-service + manager ops** as the daily wedge, while **payroll, finance, and JTS** increase switching costs and annual contract value.

---

## 2. Product positioning


| Dimension           | Positioning                                                                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Core**            | HR master data, attendance, payroll workflow, role-based access, notifications.                                                                                        |
| **Differentiation** | Deep **India** statutory and operational paths (attendance hardening, payroll compliance exports, financial bridge); **JTS** for SLA-driven tasks tied to HR identity. |
| **Expansion**       | ERP-adjacent modules (sales, purchase, inventory, CRM), document management, analytics.                                                                                |
| **Delivery**        | API-first; web/mobile frontends consume the same contracts (frontend repositories are outside this backend monorepo unless vendored).                                  |


---

## 3. Architecture snapshot (why it matters)

- **Microservices:** Each domain owns its data (**database-per-service** pattern with MongoDB-style URIs per service).  
- **Ingress:** Kong-style **API gateway** in local compose; **AWS ALB** ingress documented for production (`etelios-ingress.json`).  
- **Caching:** **Redis** for permission cache and JTS-related usage (documented for `auth-service`, `hr-service`, `attendance-service`, `jts-service`, `sales-service`).  
- **Messaging:** **Kafka** and **RabbitMQ** appear in the local stack; production notes indicate **Kafka is not required** for current permission/RBAC paths and **domain events** are a future enhancement.  
- **Observability:** Stated requirements for correlation IDs, structured logs, health/readiness (see `docs/C4_ARCHITECTURE.md`).

This architecture supports **independent scaling**, **team ownership per service**, and **clear security boundaries** — standard expectations for Series A+ technical diligence.

---

## 4. Ready modules (implemented services)

The following **Node.js microservices** exist under `microservices/` with Dockerfiles and are represented in `**docker-compose.yml`** unless noted. They are **“ready”** in the engineering sense: buildable, deployable, and domain-scoped; **commercial readiness** (UX completeness, certifications, SLAs) is per-module and not asserted here.


| Module                     | Service name (typical)        | Purpose (high level)                                                                                                                                              |
| -------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Identity & access**      | `auth-service` (3001)         | Authentication, JWT, roles (e.g. admin, hr, manager, employee, accountant, finance), permission catalog alignment.                                                |
| **Human resources**        | `hr-service` (3002)           | Employee master, org structure, HR workflows; proxies payroll workflow to payroll-service.                                                                        |
| **Time & attendance**      | `attendance-service` (3003)   | Clock-in/out, geofencing, HR lookups; timeout and tenant-isolation hardening (env-driven).                                                                        |
| **Payroll**                | `payroll-service` (3004)      | Salary, deductions, payroll cycles, workflow (HR/finance approval, freeze, post to finance), compliance-oriented reports (e.g. PF-style, TDS 24Q-style extracts). |
| **CRM**                    | `crm-service` (3005)          | Customer relationship domain.                                                                                                                                     |
| **Inventory**              | `inventory-service` (3006)    | Stock / inventory domain.                                                                                                                                         |
| **Sales**                  | `sales-service` (3007)        | Sales orders / commercial domain.                                                                                                                                 |
| **Purchase**               | `purchase-service` (3008)     | Procurement / vendors.                                                                                                                                            |
| **Financial / accounting** | `financial-service` (3009)    | P&L, expenses, ledger, trial balance, TDS, invoices; **payroll bridge** (salary reflection, payroll ledger posting).                                              |
| **Documents**              | `document-service` (3010)     | Document and e-signature–oriented domain.                                                                                                                         |
| **Service management**     | `service-management` (3011)   | Service & SLA management domain.                                                                                                                                  |
| **CPP**                    | `cpp-service` (3012)          | Customer protection plan domain (vertical-specific).                                                                                                              |
| **Prescriptions**          | `prescription-service` (3013) | Prescription management (healthcare-oriented vertical).                                                                                                           |
| **Analytics**              | `analytics-service` (3014)    | Analytics & reporting domain.                                                                                                                                     |
| **Notifications**          | `notification-service` (3015) | Cross-service notifications.                                                                                                                                      |
| **Monitoring**             | `monitoring-service` (3016)   | Health / monitoring domain.                                                                                                                                       |
| **API gateway**            | `api-gateway` (8000 proxy)    | Kong; central ingress and policies.                                                                                                                               |


**Also present in the repository (not in the excerpted `docker-compose.yml` fragment):**  
`jts-service` (Job/Task System — tasks, SLA, performance, HRMS compatibility, catalog APIs), `tenant-management-service`, `tenant-registry-service`, `realtime-service` — these are **first-class codebases** with docs (e.g. `docs/JTS_`*) and **production Kubernetes** references; treat them as **platform modules** with deployment wiring documented in `k8s/` rather than assuming every service is in a single compose file.

**Shared & tooling:** `microservices/shared` (shared utilities, permission catalog), `integrations/permission-matrix-sdk`, `scripts/` (release and prod rollout automation).

---

## 5. Feature inventory (what the platform can support)

Grouped for investor readability. Detail level reflects **backend capability**; end-user feature parity depends on frontend and configuration.

### 5.1 People & workforce

- Multi-role **RBAC** with permission catalog (including payroll and finance paths).  
- **Employee lifecycle** data in HR service; integration points for attendance and payroll.  
- **Attendance** with geofence and **bounded HR lookups** (fail-fast, configurable timeouts).  
- **Payroll workflow:** draft → processing → approvals → freeze → **post to financial service**; audit and versioning hooks; anomaly and gate services.  
- **Statutory-oriented exports** from payroll (structured extracts; filing validation remains client-side with statutory portals).

### 5.2 Work management (JTS)

- Tasks, subtasks, timers, **SLA** jobs and digests, performance management APIs, notifications, presigned attachments, **catalog** (employees, org nodes, attendance session APIs), **internal** analytics endpoints.  
- **HRMS compatibility** routes and documented **employee ↔ auth ↔ JTS** linking flows.

### 5.3 Money & compliance

- **Financial service:** expenses, ledger, invoices, TDS entries, dashboard data, **payroll posting** and **salary expense reflection** with idempotency concepts.  
- **Directional roadmap** (documented separately): deeper **India GST**, **Tally XML** integration, payroll-to-GL statutory splits — see `docs/ACCOUNTING_PAYROLL_FINANCE_TALLY_STRATEGY.md`.

### 5.4 Commercial & verticals

- **CRM, sales, purchase, inventory** for ERP-style operations.  
- **CPP** and **prescription** services support **vertical packaging** (e.g. retail protection plans, healthcare).

### 5.5 Platform & operations

- **Multi-tenant** patterns (tenant in JWT + headers; strict tenant context configurable).  
- **Production Kubernetes** artifacts, image tag discipline, ingress exports, Redis alignment.  
- **Documentation:** C4 architecture, JTS API reference, employee sync, prod deploy, investor-facing strategy docs in `docs/`.

---

## 6. What we have already accomplished (engineering outcomes)

- **Decomposed monolith into services** with clear domain ownership and per-service persistence.  
- **Production path** documented for Etelios prod (ingress, Redis consumers, gateway image alignment with JTS where applicable).  
- **Attendance reliability work** called out in README (timeouts, cross-tenant lookup flags, fallbacks) — signals operational maturity.  
- **Payroll single source of truth** pattern: HR proxies heavy workflow to **payroll-service**.  
- **Financial bridge** from payroll into **financial-service** (expense reflection + ledger posting).  
- **JTS** as a distinct execution layer with **contract verification scripts** and API documentation.  
- **Internal strategy artifacts** for accounting, Tally, employee/admin UX, and JTS improvement (under `docs/`) — supports consistent fundraising narrative.

---

## 7. In development & strategic roadmap (what we are achieving next)

This section is a **prioritized product/engineering roadmap**, not a commitment date unless your leadership adds one. It merges **known gaps** from technical review with **market-standard** expectations.

### 7.1 Near term (hardening & revenue blockers)


| Initiative                           | Outcome                                                                                                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Payroll ↔ finance accuracy**       | Pass full statutory breakdown into postings; fix journal double-count edge cases; align `finance` role on financial routes; clearer `finance_record_id` semantics. |
| **Gateway ↔ service path alignment** | Ensure public routes match service mount paths (documented Kong prefix review).                                                                                    |
| **JTS ↔ HR automation**              | Default auto-provision / bind JTS `Employee` on HR hire/update; reduce manual `jtsLinked` failures.                                                                |
| **Automated tests**                  | Payroll posting, RBAC, attendance HR lookup, critical JTS flows — raise release confidence.                                                                        |


### 7.2 Mid term (India depth & differentiation)


| Initiative                   | Outcome                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| **GST lifecycle depth**      | Registers, reconciliation patterns, e-invoice/e-way alignment (partner or native).             |
| **Tally integration**        | XML/HTTP export or push; COA mapping; payroll journal templates — see accounting strategy doc. |
| **Attendance + payroll**     | Richer OT, state packs, exception inbox UX (backend + FE); stronger payroll reconciliation.    |
| **Policy & acknowledgments** | HRMS documentation module tied to roles and effective dates (see employee/admin strategy doc). |


### 7.3 Mid–long term (global & enterprise)


| Initiative                          | Outcome                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Multi-entity & FX**               | Consolidation-style reporting for groups.                                                                           |
| **SCIM / enterprise SSO**           | Large-account IT requirements.                                                                                      |
| **Event-driven domain integration** | Kafka/MSK for async side effects (notifications, search index, analytics) where synchronous calls are insufficient. |
| **Data residency & DPA**            | Explicit region story for global buyers.                                                                            |


### 7.4 Long term (platform moat)

- **Vertical solution packs** (retail, healthcare, services) on top of shared core.  
- **Partner marketplace** (banks, statutory, Tally, biometric vendors).  
- **AI-assisted** operations (exception detection, duplicate tasks, SLA risk) with human-in-the-loop.

---

## 8. Risks & diligence topics (transparent)


| Topic                                  | Notes                                                                                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**                           | This repository is **backend-heavy**; investor demos should clarify **which frontend** (e.g. Etelios UI) consumes these APIs.                                             |
| **Kafka in prod**                      | Compose includes Kafka; prod notes say **not required** for current RBAC — align story on **actual** event pipeline.                                                      |
| **Service coverage in compose vs K8s** | Not every folder may be in one `docker-compose.yml`; **K8s is source of truth for prod** service set.                                                                     |
| **Compliance**                         | Exports and workflows assist compliance; **filing and legal correctness** remain customer + CA responsibility unless you obtain certifications and legal opinions.        |
| **Competition**                        | Global HR (Workday, SAP, Darwinbox, etc.) and PM tools (Jira, Asana) set expectations — wedge is **integrated HR + attendance + payroll + JTS + India compliance depth**. |


---

## 9. Suggested metrics to track (for future investor updates)

- **Activation:** Tenants with successful end-to-end payroll run + post to finance.  
- **Reliability:** P95 API latency, error rate on clock-in and payroll run, incident count.  
- **Engagement:** DAU/WAU on employee app, manager approval queue throughput.  
- **Expansion:** Modules enabled per tenant (CRM, inventory, JTS).  
- **Quality:** Automated test coverage % on critical paths; mean time to restore (MTTR).

---

## 10. Appendix — related internal documents


| Document                                              | Topic                                         |
| ----------------------------------------------------- | --------------------------------------------- |
| `docs/C4_ARCHITECTURE.md`                             | System and container architecture             |
| `docs/ACCOUNTING_PAYROLL_FINANCE_TALLY_STRATEGY.md`   | Payroll, finance, Tally                       |
| `docs/EMPLOYEE_ADMIN_HRMS_ATTENDANCE_JTS_STRATEGY.md` | Employee/admin UX, attendance, HRMS docs, JTS |
| `docs/JTS_API_REFERENCE.md`                           | JTS API surface                               |
| `docs/JTS_EMPLOYEE_SYNC.md`                           | HR/auth ↔ JTS linking                         |
| `docs/JTS_PROD_DEPLOY.md`                             | JTS production routing                        |
| `k8s/etelios-prod/README.md`                          | Production Kubernetes operations              |


---

## 11. Document control


| Field              | Value                                                   |
| ------------------ | ------------------------------------------------------- |
| **Owner**          | Product / CTO office (assign internally)                |
| **Classification** | Internal — External use only after legal/finance review |
| **Revision**       | 1.0                                                     |


---

*Prepared from repository structure and documentation; not a securities offering or financial statement.*