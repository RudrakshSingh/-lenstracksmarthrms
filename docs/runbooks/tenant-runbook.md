# Tenant Registry Service Runbook

## Health
- Endpoint: `/api/tenants/health`
- Expected: `200`

## Common Failures
1. tenant create failures due to DB options/config.
2. health timeout (`504`).
3. bootstrap auth dependency failures.

## Quick Checks
1. `POST /api/tenants`
2. `GET /api/tenants/health`
3. tenant-registry logs

## Intern Safe Tasks
- health endpoint timeout tests
- tenant create request validation tests
- docs for tenant bootstrap flow
