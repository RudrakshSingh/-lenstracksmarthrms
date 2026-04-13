# Attendance Service Runbook

## Health
- Endpoint: `/api/attendance/health`
- Expected: `200`

## Common Failures
1. Employee-store assignment invalid.
2. Cross-tenant store lookup mismatch.
3. Route drift for list/summary endpoints.

## Quick Checks
1. `POST /api/attendance/clock-in`
2. `POST /api/attendance/check-out`
3. `GET /api/attendance/list`
4. `GET /api/attendance/summary`

## Intern Safe Tasks
- clock-in validation test cases
- fallback path tests (workLocation/store)
- route contract docs updates
