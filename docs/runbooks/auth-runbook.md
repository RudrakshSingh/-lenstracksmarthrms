# Auth Service Runbook

## Health
- Endpoint: `/api/auth/health`
- Expected: `200`

## Common Failures
1. Login failures due to wrong creds.
2. Token decode/validation mismatch.
3. DB/TLS connection issues.

## Quick Checks
1. `POST /api/auth/login`
2. `GET /api/auth/me` with token
3. service logs for auth errors

## Intern Safe Tasks
- add response validation tests
- improve auth route docs
- add negative test cases
