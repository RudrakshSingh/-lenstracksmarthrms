# Backend Structure and Modification Guide

## 1. Purpose and Scope
This document explains:
1. The **current backend structure** of the Lenstrack Smart HRMS monorepo.
2. The **operational architecture in production** (EKS + ALB ingress + DocumentDB).
3. A **practical modification plan** for safely evolving the backend without breaking tenant isolation or production APIs.

As-of snapshot date: **February 28, 2026**.

---

## 2. Monorepo Layout (Current)

## 2.1 Top-level folders
- `microservices/` - all domain services and shared utilities.
- `k8s/` - deployment manifests (note: contains both legacy and current variants).
- `docs/` - architecture, deployment, and flow docs.
- `scripts/` - operational, deployment, test, and maintenance scripts.

## 2.2 Service directories
Current service folders under `microservices/`:
- `auth-service`
- `hr-service`
- `attendance-service`
- `payroll-service`
- `tenant-registry-service`
- `realtime-service`
- `analytics-service`
- `service-management`
- plus additional domain services: `crm`, `inventory`, `sales`, `purchase`, `financial`, `document`, `cpp`, `monitoring`, `notification`, `prescription`, `tenant-management`, etc.

## 2.3 Shared modules
- `microservices/shared` contains common helpers/utilities used across services.

---

## 3. Runtime Architecture (Current)

## 3.1 Local/runtime models in repo
The repo currently shows multiple runtime patterns:
1. **Docker Compose model** (`microservices/docker-compose.yml`): Kong-based local gateway + many local services.
2. **Kubernetes model** (`k8s/*`): manifests for production deployment.

Important: these are **not perfectly synchronized** with live cluster behavior.

## 3.2 Production model (current live behavior)
Production currently routes through **ALB ingress** in namespace `etelios-prod`, with direct service routing (no mandatory in-path API gateway dependency for ingress routes).

Current effective path mapping (from live ingress):
- `/health` -> `auth-service:3001`
- `/api/auth` -> `auth-service:3001`
- `/api/hr` -> `hr-service:3002`
- `/api/time-tracking` -> `hr-service:3002`
- `/api/performance` -> `hr-service:3002`
- `/api/attendance` -> `attendance-service:80`  (fixed from 3003)
- `/api/payroll` -> `payroll-service:3004`
- `/api/tenant` -> `tenant-registry-service:3020`
- `/api/tenants` -> `tenant-registry-service:3020`
- `/api/platform` -> `tenant-registry-service:3020`
- `/api/admin` -> `tenant-registry-service:3020`

---

## 4. Core Service Responsibilities

## 4.1 Auth Service
- Authentication, JWT issuance, identity verification.
- Login and user profile endpoints.
- Upstream dependency for almost every authenticated call.

## 4.2 HR Service
- Employee, stores, departments, dashboard, time tracking orchestration.
- Acts as core master-data provider for attendance and other people workflows.

## 4.3 Attendance Service
- Clock-in/clock-out lifecycle, geofence validation, attendance records.
- Depends on HR data for employee/store context.

## 4.4 Payroll Service
- Payroll operations and summaries.
- Consumes employee/attendance derived information and payroll data models.

## 4.5 Tenant Registry Service
- Tenant creation and registry management.
- Admin/superadmin bootstrap orchestration.
- Platform/admin endpoints for tenant control plane.

## 4.6 Realtime Service
- Socket.IO/WebSocket broadcasting for real-time attendance/dashboard updates.

---

## 5. Data and Security Model (Current)

## 5.1 Database
- Production uses **AWS DocumentDB** with TLS.
- Credentials are injected via Kubernetes secret `docdb-credentials`.

## 5.2 Critical DB settings for DocumentDB
- `retryWrites=false` is required.
- TLS enabled with CA file path (for mounted cert in pods).
- Connection strings distributed via secret keys (`MONGO_URI`, `MONGODB_URI`, `DOCDB_*`).

## 5.3 Tenant isolation
- Tenant context is expected via JWT claims and/or `x-tenant-id`.
- Queries should always enforce tenant-level filters.

## 5.4 Secrets policy
- No hardcoded DB credentials in code/scripts.
- Use secret-based env injection.
- Rotate credentials and roll deployments in controlled sequence.

---

## 6. Current Observed API Status (from latest production sweep)

Working in latest run:
- Root and primary service health endpoints mostly `200`.
- Auth login `200`.
- Tenant creation `201`.
- HR list endpoints (stores/departments/employees) `200`.
- Time tracking `200`.

Still needing normalization/fixes:
- `GET /api/tenants/health` returned `504` in test output.
- `GET /api/attendance/list` returned `404` in test output.
- `GET /api/payroll/summary` returned `404` in test output.

Interpretation:
- Core services are live and reachable.
- A subset of endpoint contracts/path expectations are inconsistent across docs, ingress routing, and service route definitions.

---

## 7. Architecture Gaps We Must Close

## 7.1 Source-of-truth drift
There is drift between:
- live ingress in `etelios-prod`,
- `k8s/ingress.yaml` in repo,
- historical gateway-based assumptions in scripts/docs.

## 7.2 Route contract inconsistency
Examples include attendance and payroll route expectations (`/list`, `/summary`) not matching deployed service routes.

## 7.3 Environment contract inconsistency
Different services/scripts use overlapping env names (`MONGO_URI`, `MONGODB_URI`, `DOCDB_*`) with inconsistent assumptions.

## 7.4 Health contract inconsistency
Some health endpoints are service-root style, some are namespaced, and response shape is not standardized.

---

## 8. Modification Blueprint (How We Will Evolve It)

## Phase 0: Stabilize Contracts (Immediate)
1. Define a **single canonical ingress manifest** for production.
2. Freeze route prefixes and expected endpoint list per service.
3. Publish canonical API contract document under `docs/` and keep it versioned.

Deliverables:
- `docs/API_CONTRACT_CANONICAL.md`
- `k8s/etelios-prod/ingress.yaml` as authoritative manifest

## Phase 1: Standardize Cross-Cutting Interfaces
1. Standard health contract for all services:
   - `GET /health` mandatory, JSON schema fixed.
2. Standard error contract:
   - `success`, `message`, `errorCode`, `requestId`.
3. Standard tenant middleware behavior:
   - strict tenant validation and rejection rules.

Deliverables:
- shared middleware package updates
- service conformance checklist

## Phase 2: Endpoint Normalization
1. Attendance: confirm and expose list/summary endpoints under one stable namespace.
2. Payroll: confirm and expose summary endpoints under one stable namespace.
3. Tenant Registry: fix health endpoint timeout and ensure predictable readiness.

Deliverables:
- route audit matrix
- endpoint compatibility table (old/new)
- alias routes where needed to preserve frontend compatibility

## Phase 3: Data and DB Hardening
1. Enforce DocumentDB-safe connection settings in all services.
2. Centralize DB connection factory in shared layer.
3. Add startup validation that fails fast on unsafe config (e.g., retryWrites=true).

Deliverables:
- shared db connector module
- service startup config validator

## Phase 4: Test and Release Gates
1. Add a production-like ingress API smoke test in CI.
2. Add tenant-isolation regression suite.
3. Enforce pre-deploy checks:
   - ingress/service port alignment,
   - secret presence and key validation,
   - health endpoint liveness.

Deliverables:
- `scripts/ops/test-all-ingress-apis.sh` as CI artifact producer
- release checklist template

---

## 9. Safe Change Playbook (For Any Backend Modification)

## 9.1 Before change
1. Identify target service and route ownership.
2. Verify impact on ingress path map.
3. Verify tenant and auth dependencies.
4. Add/update tests for positive + negative + tenant isolation cases.

## 9.2 During change
1. Keep backward-compatible route aliases when feasible.
2. Gate risky behavior behind feature flags.
3. Maintain structured logs and request IDs.

## 9.3 After change
1. Roll deployment with health verification.
2. Run ingress-wide API sweep.
3. Confirm no cross-tenant leakage.
4. Update docs and changelog in same PR.

---

## 10. Onboarding Guide for New Endpoint/Feature

When adding a new API:
1. Define endpoint in service OpenAPI/spec.
2. Add controller + service + validation + tests.
3. Add ingress route mapping (if new prefix).
4. Add auth/tenant guard.
5. Add observability markers (log fields, metrics).
6. Add to API sweep script and docs.

Definition of done:
- Endpoint reachable via ingress.
- Contract documented.
- Tenant-safe.
- Included in regression tests.

---

## 11. Recommended Near-Term Backlog (Priority)

## P0 (must-do)
- Fix `tenant health` timeout (`/api/tenants/health` -> 200).
- Align attendance list route contract (`/api/attendance/list`).
- Align payroll summary route contract (`/api/payroll/summary`).
- Keep ingress/service-port mapping continuously validated.

## P1 (high)
- Consolidate ingress manifests and eliminate drift.
- Create canonical route catalog with owner and expected response codes.
- Standardize health/error response schema across services.

## P2 (medium)
- Move to generated API clients between services where practical.
- Expand real-time event contract docs and replay-safe patterns.
- Add SLO dashboards per domain service (latency/error/availability).

---

## 12. Governance Rules for Future Modifications
1. **No production route changes without contract diff** in PR.
2. **No secret shape changes** without rollout compatibility plan.
3. **No tenant-unsafe query merges** (tenant filter mandatory).
4. **No deployment merge without API sweep output** attached.
5. **Docs update is mandatory** for all route/config changes.

---

## 13. Suggested Next Documents to Add
- `docs/API_CONTRACT_CANONICAL.md`
- `docs/INGRESS_SOURCE_OF_TRUTH.md`
- `docs/RELEASE_CHECKLIST_BACKEND.md`
- `docs/TENANT_ISOLATION_GUARDRAILS.md`

---

## 14. Summary
Current backend is functional for primary flows (auth, tenant creation, HR core operations), but contract drift exists across some health/list/summary endpoints. The safest way forward is a contract-first stabilization phase, followed by endpoint normalization, configuration hardening, and CI-enforced ingress-wide API validation.

This guide should be treated as the operational blueprint for all backend refactors and feature additions going forward.
