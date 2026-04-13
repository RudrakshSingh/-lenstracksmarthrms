# HR Service Runbook

## Health
- Endpoint: `/api/hr/health`
- Expected: `200`

## Common Failures
1. Employee not found by tenant.
2. Store/department references missing.
3. Tenant header mismatch.

## Quick Checks
1. `GET /api/hr/employees`
2. `GET /api/hr/stores`
3. `GET /api/hr/departments`

## Intern Safe Tasks
- list endpoint pagination tests
- store/department validation tests
- docs alignment with API contract
