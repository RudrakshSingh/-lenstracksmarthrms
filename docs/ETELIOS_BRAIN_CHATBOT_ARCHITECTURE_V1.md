# ETELIOS BRAIN Chatbot Architecture Plan (Codebase-Aligned v1)

Owner: Upcapto (Etelios)  
Date: 2026-04-02  
Audience: Engineering, Product, Delivery, and Intern Contributors  
Status: Implementation-ready technical handoff

---

## 1. Executive Summary

Etelios Brain is the intelligence layer that upgrades Etelios from a transactional ERP to an action-oriented operating system.  
Phase 1 should deliver a production-safe chatbot that supports:

- Conversational insights across HR, attendance, leave, roster, and performance.
- Guided actions with approvals (not uncontrolled automation).
- Role-aware, tenant-safe execution backed by existing Etelios microservices.
- Explainable outputs with confidence and risk metadata.

The architecture in this document is intentionally designed to reuse the existing codebase, reduce delivery risk, and accelerate time-to-value.

---

## 2. Objectives and Scope

## 2.1 Primary objectives

1. Replace the current placeholder `POST /api/chat` experience with a real orchestration flow.
2. Introduce a dedicated `brain-service` for intent routing, tool execution, guardrails, and approvals.
3. Reuse existing services (HR, Attendance, JTS, Realtime, Auth, Tenant Registry) as structured tools.
4. Enforce strict policy controls (RBAC, tenant boundaries, action logging).

## 2.2 Phase-1 scope (must-have)

- Read flows: attendance, leave, roster, performance summaries.
- Controlled write flows: leave apply, leave approve/reject, create coaching tasks.
- Risk-tiered action execution (`low`, `medium`, `high`).
- Explainability and auditability for all recommendations and actions.

## 2.3 Out of scope for immediate implementation

- Full autonomous workflows without human oversight.
- Advanced multimodal automation at scale.
- Complex pricing/procurement optimization engines.

---

## 3. Current Codebase Baseline (Verified)

The platform already includes key components needed to launch quickly:

## 3.1 API gateway and routing
- Gateway file: `src/server.js`
- Existing endpoint: `POST /api/chat` (currently returns placeholder text)
- Existing proxy pattern supports adding new service routes with minimal friction.

## 3.2 Relevant active services
- `microservices/auth-service`
- `microservices/hr-service`
- `microservices/attendance-service`
- `microservices/jts-service`
- `microservices/realtime-service`
- `microservices/tenant-registry-service`

## 3.3 Existing APIs with high chatbot value
- Attendance: today, summary, stats, reports, history.
- Leave: create, list, approve, reject, balances, workflow.
- Roster: weekly, weekly-enhanced, AI-generate, sync-attendance.
- Performance: trends, alerts, reviews (HR and JTS domains).
- JTS tasks and notification capabilities for approval orchestration.

## 3.4 Existing security and multi-tenant patterns
- JWT auth middleware and role checks already implemented.
- Tenant enforcement patterns in service middleware.
- Internal service auth patterns available for trusted service-to-service calls.

---

## 4. Target Architecture

## 4.1 High-level flow

1. Client sends message to gateway `POST /api/chat`.
2. Gateway proxies request to `brain-service`.
3. `brain-service` determines intent and required tools.
4. Policy engine validates tenant, role, and risk rules.
5. Approved tools call existing microservice APIs.
6. `brain-service` returns response with explanation and risk metadata.
7. Action events are logged and optionally pushed via realtime service.

## 4.2 Architectural components

### Experience Layer
- Web chat widget (primary).
- Voice endpoint (phase 1.1 baseline).
- Vision endpoint for OCR-driven use cases (phase 1.1 baseline).

### Orchestration Layer (`brain-service`)
- Intent routing
- Tool registry and schema validation
- Policy and risk engine
- Approval orchestration
- Memory and response formatting
- Explainability renderer

### Domain Tool Layer (existing services)
- HR, Attendance, JTS, Realtime, Auth, Tenant Registry.

### Data and Audit Layer
- Session context store (Redis suggested).
- Long-term retrieval store (tenant-partitioned vector index).
- Immutable action/audit ledger.

---

## 5. API Design and Contracts

## 5.1 Gateway contract

Retain:
- `POST /api/chat`

Add:
- `POST /api/chat/voice`
- `POST /api/chat/vision`
- `GET /api/chat/sessions/:id`
- `POST /api/chat/actions/:id/approve`
- `POST /api/chat/actions/:id/reject`

All above routes should proxy to `brain-service`.

## 5.2 `brain-service` core endpoints

- `POST /api/brain/respond`
- `POST /api/brain/tool/execute`
- `POST /api/brain/action/submit`
- `POST /api/brain/action/:id/approve`
- `POST /api/brain/action/:id/reject`
- `GET /api/brain/action/:id`
- `GET /api/brain/health`

## 5.3 Standard response envelope (recommended)

Every tool or orchestration response should include:
- `success` (boolean)
- `data` (result payload)
- `confidence` (0.0 to 1.0 where applicable)
- `explanation` (plain-language rationale)
- `risk_level` (`low|medium|high`)
- `requires_approval` (boolean)
- `trace_id` (for observability)

---

## 6. Phase-1 Intent-to-Tool Mapping

## 6.1 Attendance assistant
- "Show my attendance today" -> `GET /api/attendance/today`
- "Show last 30-day summary" -> `GET /api/attendance/summary`
- "Show team attendance stats" -> `GET /api/attendance/stats`

## 6.2 Leave assistant
- "Apply leave" -> `POST /api/hr/leave-requests`
- "Show pending leave approvals" -> `GET /api/hr/leave-requests`
- "Approve leave request" -> `POST /api/hr/leave-requests/:id/approve`
- "Reject leave request" -> `POST /api/hr/leave-requests/:id/reject`

## 6.3 Roster assistant
- "Generate next week roster" -> `POST /api/hr/roster/ai-generate`
- "Show roster conflicts" -> `GET /api/hr/roster/weekly-enhanced`
- "Sync roster with attendance" -> `POST /api/hr/roster/sync-attendance`

## 6.4 Manager and performance assistant
- "Show my performance trend" -> `GET /api/hr/performance/me/trends`
- "Show at-risk employees" -> JTS performance alerts endpoints
- "Create coaching task" -> JTS task creation endpoint

---

## 7. Guardrails, Governance, and Compliance

## 7.1 Mandatory controls

- Validate `Authorization` for all requests.
- Enforce `X-Tenant-Id` alignment with authenticated user context.
- Apply RBAC and permission checks before each tool call.
- Mask PII before model prompt assembly.
- Redact sensitive output in shared/public channels.
- Record immutable action logs for every write operation.

## 7.2 Risk-tiered autonomy policy

- **Low risk:** read operations; auto-executable.
- **Medium risk:** write drafts; explicit user confirmation required.
- **High risk:** policy-sensitive write operations; approval chain required.

## 7.3 Approval execution model

1. Brain recommends an action.
2. Brain creates approval item (via JTS task/approval flow).
3. Approver decision captured.
4. Action executes only if approved.
5. Final decision and outcome are logged.

---

## 8. Memory and Retrieval Design

## 8.1 Session memory
- Key pattern: `tenant_id:user_id:session_id`
- Purpose: conversational continuity and short-term context.

## 8.2 Long-term memory
- Tenant-partitioned retrieval index.
- Source documents: SOPs, leave policies, roster rules, product and internal documentation.
- Strict no cross-tenant retrieval.

## 8.3 Audit memory
- Persist:
  - user input metadata
  - selected tools
  - tool I/O hashes
  - approver details
  - execution outcome

---

## 9. Voice, Multilingual, and Vision Strategy

## 9.1 Voice baseline
- Pipeline: ASR -> intent extraction -> policy -> tool execution -> response -> optional TTS.
- If ASR confidence is below threshold, require explicit confirmation before any write action.

## 9.2 Language baseline
- English, Hindi, Hinglish in phase 1.
- Tenant-level lexicon/dictionary support for names, stores, terms, and SKUs.

## 9.3 Vision baseline
- OCR for bills, forms, and supporting documents.
- If parsed confidence is low, route to user confirmation workflow.

---

## 10. Engineering Standards

- Deterministic model output mode (JSON structured output).
- Centralized tool registry and schema validation.
- Shared error contract across chatbot APIs.
- Correlated tracing with request and tool execution IDs.
- Contract tests per tool schema.
- Retry strategy with bounded backoff for downstream service calls.

---

## 11. Code-Level Change Map

## 11.1 Initial files to modify
- `src/server.js`  
  - Replace `/api/chat` placeholder with proxy integration.
- `src/config/services.config.js`  
  - Register `brain-service`.

## 11.2 New service to add
- `microservices/brain-service`
  - Suggested modules: `routes`, `controllers`, `services`, `middleware`, `schemas`, `utils`.

## 11.3 Existing references to reuse
- `microservices/hr-service/src/routes/roster.routes.js`
- `microservices/hr-service/src/routes/leave.routes.js`
- `microservices/attendance-service/src/routes/attendance.routes.js`
- `microservices/jts-service/src/routes/*`
- `scripts/apply-jts-daily-roster.js` (operational reference and validation aid)

---

## 12. Seven-Day Implementation Plan (Developer TODO)

This plan is optimized for a focused pod (2 backend engineers + 1 intern).

## Day 1 - Foundation and service bootstrap
- [ ] Create `microservices/brain-service` with basic server and `/api/brain/health`.
- [ ] Add baseline project structure: routes/controllers/services/middleware/schemas/utils.
- [ ] Register `brain-service` in gateway service configuration.
- [ ] Wire `POST /api/chat` gateway path to `brain-service`.
- [ ] Validate local integration end-to-end.
- [ ] **Deliverable:** `POST /api/chat` reaches `brain-service` successfully.

## Day 2 - Security parity (auth, tenant, RBAC)
- [ ] Implement JWT validation middleware in `brain-service`.
- [ ] Implement tenant alignment check (`X-Tenant-Id` vs token context).
- [ ] Implement role/permission gate for tool calls.
- [ ] Add negative tests for unauthorized and tenant mismatch cases.
- [ ] **Deliverable:** secure, tenant-safe chatbot entrypoint.

## Day 3 - Tool registry and read-only intents
- [ ] Build tool registry with JSON schema validation.
- [ ] Implement first 4 read intents:
  - attendance today
  - attendance summary
  - leave list
  - weekly roster
- [ ] Implement standard response envelope for all tools.
- [ ] Implement normalized downstream error handling.
- [ ] **Deliverable:** stable read-path chatbot responses.

## Day 4 - Controlled write intents and approvals
- [ ] Implement write actions:
  - leave apply
  - leave approve/reject
  - create coaching task
- [ ] Implement risk engine (`low|medium|high`).
- [ ] Add approval-required flow for medium/high risk actions.
- [ ] Integrate JTS-based approval task creation.
- [ ] **Deliverable:** write actions execute only through policy-compliant paths.

## Day 5 - Explainability, logging, and observability
- [ ] Add mandatory `explanation` object to recommendation/action responses.
- [ ] Implement immutable action log persistence (input hash/output hash/actor/time/tenant).
- [ ] Add `trace_id` and `tool_trace_id` propagation.
- [ ] Add realtime progress event publishing where applicable.
- [ ] **Deliverable:** auditable and traceable operational behavior.

## Day 6 - Voice and multilingual baseline
- [ ] Add `POST /api/chat/voice` skeleton and adapter interfaces.
- [ ] Integrate ASR abstraction and confidence thresholds.
- [ ] Add basic multilingual normalization for English/Hindi/Hinglish intents.
- [ ] Add tenant dictionary support.
- [ ] **Deliverable:** safe baseline voice-to-action flow.

## Day 7 - Hardening, test pass, and handoff
- [ ] Execute E2E regression suite for read/write and approval flows.
- [ ] Validate tenant isolation and RBAC rejection behavior.
- [ ] Run smoke performance checks and failure scenario tests.
- [ ] Prepare deployment checklist and rollback guide.
- [ ] Publish implementation runbook: "How to add a new intent/tool".
- [ ] **Deliverable:** phase-1 pilot-ready backend package.

---

## 13. Intern Contributor Guide: Adding a New Intent

1. Define the user intent and expected output.
2. Identify target service endpoint(s) in HR/Attendance/JTS.
3. Add tool schema in `brain-service/schemas`.
4. Implement tool handler in service layer.
5. Map intent to tool in router/orchestrator.
6. Assign risk tier and approval rules.
7. Add unit and integration tests.
8. Update architecture and tool documentation.

Any write-capable intent must include approval behavior when required by policy.

---

## 14. Definition of Done (Phase 1)

Phase 1 is complete only when:
- Chatbot supports read and controlled write operations across HR/Attendance/Roster/Performance.
- Tenant boundaries and RBAC enforcement pass all critical tests.
- Every action is logged and auditable end-to-end.
- Recommendations include explainability metadata.
- Voice baseline works reliably for English/Hindi/Hinglish.
- Pilot rollout demonstrates measurable operational improvement.

---

## 15. Final Engineering Note

The most critical success factors are not model novelty. They are:
- safe execution controls,
- strict governance,
- deterministic tool contracts,
- and multi-tenant reliability.

If those four are implemented rigorously, Etelios Brain will outperform typical enterprise chatbot deployments in both safety and business usefulness.

