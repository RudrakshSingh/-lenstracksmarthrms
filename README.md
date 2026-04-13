# Lenstrack Smart HRMS

Production-focused monorepo for API gateway and domain microservices (Auth, HR, Attendance, Payroll, and supporting services).

## Repository Layout
- `microservices/` - service source code
- `k8s/` - Kubernetes deployment manifests
- `docs/` - architecture and product documentation
- `docs/archive/root-markdown/` - archived root markdown documents
- `scripts/` - operational scripts
- `artifacts/` - generated logs and test output snapshots

## Current Architecture Doc
- `docs/C4_ARCHITECTURE.md`

## Attendance Timeout Hardening
Attendance lookup hardening is enabled via environment variables:
- `HR_LOOKUP_REQUEST_TIMEOUT_MS`
- `HR_LOOKUP_TOTAL_TIMEOUT_MS`
- `ENABLE_CROSS_TENANT_LOOKUP`
- `ENABLE_ANY_EMPLOYEE_FALLBACK`

These are configured in:
- `k8s/deployments/attendance-service.yaml`
- `microservices/attendance-service/.env.example`

## Local Run (attendance service)
```bash
cd microservices/attendance-service
npm run start
```

## Notes
- Root-level operational markdown and test dumps were archived for cleanliness.
- No important source modules were removed during cleanup.
