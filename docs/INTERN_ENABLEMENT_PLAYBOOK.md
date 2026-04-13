# Intern Enablement Playbook - Backend Microservices

## 1. Objective
Prepare the backend codebase so interns can work safely, independently, and in parallel without breaking production stability or tenant isolation.

---

## 2. Current Reality
- Architecture: microservices.
- Repo layout: single shared repository containing multiple services.
- Deployment: Kubernetes + ingress + shared operational scripts.
- Risk profile: high if interns change shared files, routes, or cross-service contracts without guardrails.

---

## 3. Intern Work Model (Recommended)

## 3.1 Team split by service domain
Create intern pods (1-2 interns per pod):
1. Auth pod (`auth-service`)
2. HR pod (`hr-service`)
3. Attendance pod (`attendance-service`)
4. Payroll pod (`payroll-service`)
5. Tenant pod (`tenant-registry-service`)
6. Platform pod (`realtime`, `shared`, dev tooling) - only for stronger interns

## 3.2 One mentor per pod
Each pod gets one reviewer/mentor responsible for:
- task definition
- PR quality gate
- merge decision

## 3.3 Explicit boundaries
Interns can modify only:
- assigned service folder
- assigned tests
- assigned docs

Interns cannot modify without mentor approval:
- `shared/`
- `k8s/` production manifests
- cross-service API contracts
- secrets/auth/tenant middleware

---

## 4. Repository Access and Permissions

## 4.1 Access groups
1. Admins: leads/seniors
2. Maintainers: service owners
3. Developers: interns
4. Viewers: product/stakeholders

## 4.2 Branch protection
Protect:
- `main`
- `release/*`
- `prod/*`

Rules:
1. No direct push
2. PR required
3. Required checks required
4. At least one code owner approval

## 4.3 CODEOWNERS
Define code owners at service folder level:
- `/microservices/auth-service/` -> Auth mentor
- `/microservices/hr-service/` -> HR mentor
- etc.

---

## 5. Branching and Parallel Development Strategy

## 5.1 Branch naming
Use strict naming:
- `feature/intern-<name>-<service>-<task>`
- `fix/intern-<name>-<service>-<bug>`
- `docs/intern-<name>-<topic>`

## 5.2 Workstream isolation
Each intern works only on one active feature branch at a time.

## 5.3 Rebase/merge policy
1. Rebase branch daily on latest `develop` (or integration branch)
2. Merge via PR only
3. Squash merge preferred for intern PRs

---

## 6. Environment Strategy (Intern-safe)

## 6.1 Environments
1. Local dev (mandatory)
2. Shared dev namespace (team-level)
3. Staging namespace (mentor-approved)
4. Production (no intern direct access)

## 6.2 Credentials and secrets
1. No plaintext credentials in code/docs/scripts
2. Use environment files excluded from VCS
3. Use K8s secrets for cluster deployments
4. Rotate exposed credentials immediately

## 6.3 Data safety
1. Use synthetic/sanitized data for intern testing
2. No direct production DB writes by interns

---

## 7. Intern Onboarding Flow (Day-wise)

## Day 1: Architecture and contracts
1. Read service matrix doc
2. Read ingress route map
3. Understand tenant isolation rules
4. Understand auth token flow

## Day 2: Local setup and smoke tests
1. Clone repo
2. Run assigned service locally
3. Execute baseline health and route tests
4. Submit setup proof (screenshots/logs)

## Day 3-4: First low-risk task
1. Small endpoint/test/doc change
2. PR with mentor review
3. Merge after checks pass

## Day 5+: Regular sprint cadence
1. Assigned tasks by service board
2. Daily sync + blocker review
3. Weekly quality report

---

## 8. Task Design for Interns

## 8.1 Good intern task characteristics
1. Single service scope
2. Clear API contract
3. Testable with deterministic output
4. Low blast radius

## 8.2 Avoid assigning interns initially
1. Auth middleware core changes
2. Tenant resolution core logic
3. Shared library refactors
4. Ingress production route edits
5. Database migration scripts

## 8.3 Task template
For each task define:
1. Service owner
2. Endpoint/module
3. Input/output contract
4. Acceptance criteria
5. Test cases
6. Out-of-scope list

---

## 9. Quality Gates (Mandatory)

## 9.1 Pre-PR checklist (intern)
1. Lint passes
2. Unit/integration tests pass
3. No secrets added
4. No unrelated file changes
5. API contract unchanged or documented

## 9.2 PR checklist (mentor)
1. Scope matches task
2. Tenant safety preserved
3. Error handling unchanged or improved
4. Logs/observability preserved
5. Backward compatibility confirmed

## 9.3 Merge gate
PR merge only if:
1. Required checks green
2. Code owner approval present
3. Change log note added

---

## 10. Testing Strategy for Intern Work

## 10.1 Test layers
1. Unit tests (service logic)
2. Route-level tests (controller + validation)
3. Contract tests for critical paths
4. Ingress smoke test in shared env

## 10.2 Minimum expectations per PR
1. At least one new/updated test for changed behavior
2. Repro steps for bug-fix PRs
3. Before/after API response samples

## 10.3 Regression watchlist
Always run for affected core domains:
1. Auth login and token path
2. HR employee/store fetch
3. Attendance clock-in/out
4. Tenant create flow

---

## 11. Documentation System for Interns

## 11.1 Must-have docs
1. Service matrix (already created)
2. API contract canonical document
3. Ingress source-of-truth document
4. Runbooks per service

## 11.2 Per-service KT page structure
1. Ownership
2. Endpoints
3. Inputs/outputs
4. Dependencies
5. Failure modes
6. Debug commands

## 11.3 PR documentation policy
Any behavior change must include doc update in same PR.

---

## 12. Governance and Safety Rules
1. No production write access for interns.
2. No direct merge to protected branches.
3. No secret handling in PR comments/issues.
4. No cross-service contract changes without design review.
5. No emergency hotfix by intern without mentor pairing.

---

## 13. Suggested Folder and Workflow Additions

## 13.1 Task boards
Create `docs/intern-tasks/`:
- one markdown per service backlog
- each task tagged `L1` (easy), `L2`, `L3`

## 13.2 Runbooks
Create `docs/runbooks/`:
- `auth-runbook.md`
- `hr-runbook.md`
- `attendance-runbook.md`
- `tenant-runbook.md`

## 13.3 PR templates
Add templates for:
1. Feature PR
2. Bug-fix PR
3. Docs PR

---

## 14. Intern Separation Patterns (How to let them work separately)

## Pattern A: Service ownership separation
- each intern owns one service-only branch and PR queue.

## Pattern B: Module lane separation inside one service
- one intern: controllers
- one intern: service logic
- one intern: tests/docs

## Pattern C: API lane and test lane
- Intern A: implementation
- Intern B: integration tests
- Intern C: API docs + validation schemas

Recommended start: Pattern A.

---

## 15. Weekly Operational Cadence
1. Monday: task assignment and contract review
2. Tuesday-Thursday: coding and mentor check-ins
3. Friday: PR merge window + regression suite
4. Weekly retro: common failure patterns and next training topics

---

## 16. Intern Readiness Checklist
Intern is ready when:
1. Can run assigned service locally
2. Can explain service dependencies
3. Can open PR with passing checks
4. Can debug one failure mode with logs
5. Can update docs for own changes

---

## 17. Mentor Checklist
Mentor must ensure:
1. Tasks are scoped and testable
2. Interns are not blocked by environment access
3. Review turnaround within one business day
4. No intern PR merged without tests/docs

---

## 18. Immediate Action Plan (Next 7 days)
1. Freeze and publish canonical ingress + API route map.
2. Enable CODEOWNERS + branch protections.
3. Create service-wise intern backlogs.
4. Prepare sanitized dev dataset.
5. Run first intern pilot with one service pod.
6. Expand to other services after pilot quality is stable.

---

## 19. Documents to Use Together
1. `docs/INTERN_HANDOUT_SERVICE_MATRIX.md`
2. `docs/BACKEND_STRUCTURE_MODIFICATION_GUIDE.md`
3. This file: `docs/INTERN_ENABLEMENT_PLAYBOOK.md`

