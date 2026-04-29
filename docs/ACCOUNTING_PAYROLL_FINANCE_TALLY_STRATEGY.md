# Accounting, Payroll, Finance & Tally — Combined Strategy Document

**Purpose:** Single reference combining (1) current payroll/financial microservice gaps, (2) India + global product capabilities for competitive accounting software, and (3) Tally integration and import strategy.

**Audience:** Product, engineering, compliance, and partnerships.

**Related codebase:** `microservices/payroll-service`, `microservices/financial-service`, HR proxy routes, API gateway.

---

## Part A — Current state: payroll & financial services

### A.1 What exists (summary)

- **Payroll-service:** Workflow (draft → HR → finance → freeze → post), gates, attendance/salary previews, compliance-style exports (e.g. PF-style extract, TDS 24Q-style extract), RBAC aligned with auth roles, HR service proxy for workflow from `hr-service`.
- **Financial-service:** P&L, expenses, ledger, trial balance hooks, TDS entries, invoices, **payroll bridge**: salary expense reflection and **payroll ledger posting** with idempotency keys, `FinanceRecord` / `FinanceLog` audit artifacts.
- **Cross-service:** `financialServiceClient` in payroll calls financial HTTP APIs with forwarded JWT and tenant/company headers.

### A.2 Documented gaps (engineering backlog)


| Area                      | Gap                                                                                                                                                              | Suggested direction                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Posting payload**       | `postCycleToFinance` sends `employerCost: 0`; statutory splits (EPF/ESI/PT/TDS) not passed into finance journal.                                                 | Aggregate from `PayrollRecord` / run engine; map to liability and expense lines.                 |
| **Journal correctness**   | When `employerCost > 0`, `createPayrollPosting` can **double-count** employer portion (total expense includes employer + separate employer debit).               | Single coherent journal template; unit tests for balanced journals.                              |
| **Double representation** | Same flow may create **approved expense + reflection** and **separate journal posting** — risk of double P&L if reports sum both.                                | Choose **one** primary posting path for payroll cost, or partition reporting by `source_module`. |
| **Reconciliation**        | `reconcileCycle` compares cycle to **one expense** by source ref; does not validate full **ledger posting** or line items.                                       | Reconcile against `FinanceRecord` + ledger lines or net control total.                           |
| **RBAC**                  | Financial routes for salary reflection / payroll posting / by-source expense **omit `finance` role** in `requireRole` lists while product roles include finance. | Add `finance` (and align with permission catalog).                                               |
| **Naming / linkage**      | `cycle.finance_record_id` may store **expense** `_id` rather than finance record / posting id.                                                                   | Rename field or store both `expense_id` and `finance_record_id`.                                 |
| **Gateway**               | Kong paths use `/api/payroll/service` and `/api/financial/service` while apps mount `/api/payroll-workflow`, `/api/financial`, etc.                              | Fix gateway prefixes or add strip/replace plugins.                                               |
| **Tenant strictness**     | Financial `enforceTenantContext` is strict only when `STRICT_TENANT_CONTEXT=true`.                                                                               | Default strict for multi-tenant prod; ensure tenant on all finance artifacts.                    |
| **Models vs usage**       | `ChartOfAccounts` / `JournalEntry` exist but payroll posting writes raw `Ledger` strings.                                                                        | Unify on COA + controlled journal templates.                                                     |
| **Tests**                 | No automated tests found for posting, RBAC, idempotency.                                                                                                         | Add integration tests for payroll → finance and reconcile.                                       |
| **Operational**           | HTTP-only handoff; partial failure handling is basic.                                                                                                            | Outbox / retry / DLQ for post-finance after freeze.                                              |


### A.3 Principles for closing gaps

1. **One balanced journal contract** per payroll run (with clear mapping to statutory lines).
2. **Explicit idempotency** at payroll and finance boundaries (already started — extend to full payload).
3. **RBAC parity** across auth catalog, HR proxy, payroll, and financial routes.
4. **Observability:** log correlation id, request/response summaries, Tally/external export ids (see Part C).

---

## Part B — Product capabilities: India, global, and “best in class” universal

### B.1 India depth (compliance-led differentiation)


| Capability                | Notes                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **GST lifecycle**         | GSTR-1/3B alignment, HSN/SAC, RCM, ITC 2A/2B-style reconciliation, e-invoice IRN, e-way triggers, amendments, annual track.   |
| **TDS subledger**         | Section-wise rates, thresholds, LDC handling, challan linkage, 24Q / Form 16 / 16A data model, due-date calendar.             |
| **Payroll ↔ books**       | PF/ESI/PT/LWF accruals, remittance schedules, payment runs, **balanced** GL; exports validated against EPFO/TRACES workflows. |
| **Statutory & corporate** | Companies Act vs tax depreciation (dual books) where relevant; MCA-oriented reporting feeds for mid-market.                   |
| **Banking**               | NEFT/RTGS advice, UPI reconciliation patterns, major bank statement formats.                                                  |
| **Localization**          | April–March FY, GSTIN/place of supply, branch as legal/tax unit, formats and bilingual invoices where needed.                 |


### B.2 Global / multi-country


| Capability                          | Notes                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------- |
| **Multi-entity, FX, consolidation** | Intercompany, eliminations, revaluation, CTA, reporting currency, NCI.      |
| **Configurable tax engine**         | Country packs + partner filing connectors vs hard-coded per client.         |
| **GAAP / IFRS**                     | Parallel reporting or mapping layer.                                        |
| **AP/AR**                           | Multi-currency invoices, 3-way match, vendor portals, retainage.            |
| **RevRec (606 / IFRS 15)**          | Contracts, performance obligations, SSP — differentiator for SaaS/services. |
| **Spend & cards**                   | Receipts, mileage, policies, card integrations.                             |


### B.3 Universal (any market)

- Period close (hard/soft), immutable posted journals, reversing entries, allocations.  
- Dimensions (department, project, location) on every line.  
- Maker-checker, SoD, field-level audit, auditor exports.  
- Bank rec with rules + ML assist + exception workflow.  
- Live TB with drill-down; management reporting; scheduled packs.  
- Public API, webhooks, sandbox, partner marketplace.  
- Practical AI: anomaly detection, NL explanations, bank line categorization with human override.  
- Scale: async bulk, background close jobs.

### B.4 Sequencing (realistic)

1. **Core GL:** balanced journals, dimensions, close, bank rec, TB drill-down.
2. **India pack:** GST + TDS depth + payroll accruals tied to GL.
3. **Multi-entity + FX + consolidation.**
4. **Tax engine + country packs** (filing via partners initially is acceptable).
5. **RevRec + spend** if targeting SaaS/services mid-market.

### B.5 Positioning

Avoid claiming “best globally” without years of compliance depth. Credible wedges: **best India depth with a global core**, or **global SMB with India as a first-class pack** — then over-invest in that wedge.

---

## Part C — Tally: parity vs integration

### C.1 Strategy: complement, not clone

- **Default:** Your platform owns **workflow and operational truth**; **Tally** remains the accountant’s **ledger, GST, and familiar reports**.  
- **Deliver:** Reliable **Tally-importable** artifacts and optional **live XML push** where Tally is on the network.

### C.2 Official integration surface (primary)

TallyPrime exposes **XML over HTTP** (HTTP server enabled, commonly port **9000**). Applications POST `Content-Type: text/xml`; Tally returns XML. Supports **Import / Export / Execute**.

**Official references:**

- [Integration with TallyPrime](https://help.tallysolutions.com/developer-reference/introduction/integration-with-tallyprime/)  
- [XML integration](https://help.tallysolutions.com/developer-reference/integration-capabilities/method-specific-integration/xml)  
- [Integration capabilities](https://help.tallysolutions.com/developer-reference/integration-capabilities)

**Hard requirements for clean imports:**

- Create **masters first** (groups, ledgers, parties, GST details as used, voucher types).  
- Vouchers must **balance** (debit = credit).  
- Dates: `**YYYYMMDD`**.  
- Prefer **export sample voucher from Tally → use as XML template** (Tally’s recommended approach).

**Operational constraint:** TallyPrime is typically **running with company open** for HTTP import (on-prem / hosted-desktop reality).

### C.3 Features to build in your product (Tally-oriented)


| Feature                     | Description                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **COA bridge**              | Map internal GL → Tally ledger names/groups; validate before export.                                                           |
| **Master sync pack**        | Bulk ledgers, parties, cost centres, GSTIN defaults; optional stock only if inventory in Tally.                                |
| **Voucher generators**      | Journal (payroll, statutory), Payment/Receipt/Contra, Sales/Purchase with GST where applicable.                                |
| **Payroll → Tally journal** | One action: journal lines for salary expense, deductions payable, employer liabilities, bank, TDS — aligned with Part A fixes. |
| **GST register exports**    | Excel/CSV aligned to firm workflow, or XML if you standardize on Tally registers — document who files.                         |
| **Bank / payment bridge**   | Batch advice and narration conventions (UTR, run id).                                                                          |
| **Idempotency & audit**     | Store external ref, request hash, raw response snippet, success/failure; support retries without duplicates.                   |
| **Dry run**                 | Validate mapping, masters, and balance before post.                                                                            |


### C.4 What to echo in UX vs not rebuild

- **Echo:** day book drill-down patterns, fast ledger search, keyboard-first entry, strong audit trail expectations.  
- **Do not rebuild lightly:** full Tally GST engine, full inventory costing matrix, entire payroll statutory stack **inside** your app **unless** the explicit goal is **replace Tally**.

### C.5 Ecosystem alternatives

Third-party **JSON → Tally** bridges and plugins exist; they can speed delivery but **your team should still understand XML and Tally responses** for production support.

### C.6 Phased Tally roadmap

1. **Journal + payment** + COA mapping + idempotency + error UX.
2. **Sales/purchase + GST** for firms booking invoices in Tally.
3. **Reconciliation:** export TB / ledgers from Tally vs your GL for a period.
4. **Two-way sync** only where revenue justifies complexity.

---

## Part D — Unified roadmap (single backlog view)


| Phase                         | Theme               | Key items                                                                                                                                                                            |
| ----------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **0 — Fix foundation**        | Trustworthy books   | Fix payroll→finance journal double-count; pass statutory breakdown; unify expense vs journal strategy; finance role on routes; gateway paths; rename `finance_record_id`; add tests. |
| **1 — India accounting core** | Compliance depth    | GST registers + filing path; TDS subledger; payroll accrual/remittance alignment with GL; bank rec.                                                                                  |
| **2 — Tally bridge**          | Accountant adoption | COA mapping; payroll journal XML; dry run; import log; optional HTTP push to Tally.                                                                                                  |
| **3 — Global expansion**      | Multi-country       | Multi-entity, FX, consolidation; configurable tax packs; AP/AR international.                                                                                                        |
| **4 — Differentiation**       | Mid-market          | RevRec; spend/cards; AI anomaly + NL close commentary; partner marketplace.                                                                                                          |


---

## Part E — Success metrics (suggested)

- **Posting:** 100% balanced journals on golden payroll fixtures; zero duplicate finance records on retry.  
- **Reconciliation:** Payroll net vs finance control account within tolerance; statutory totals match export totals.  
- **Tally:** >95% first-import success on pilot companies; median time to import < X minutes; zero duplicate vouchers on same `external_ref`.  
- **Adoption:** % of customers using Tally export weekly; NPS from CA firms.

---

## Part F — Ownership & documentation


| Stream                     | Owner (suggested)      |
| -------------------------- | ---------------------- |
| Payroll ↔ Finance contract | Backend + finance SME  |
| India GST/TDS              | Compliance + backend   |
| Tally XML templates        | Integrations + support |
| Gateway / multi-tenant     | Platform               |
| Product narrative          | Product marketing      |


**Maintain:** Version this document when major compliance or TallyPrime behavior changes.

---

*Document version: 1.0 — combined from payroll/finance gap review, global/India capability map, and Tally integration strategy.*