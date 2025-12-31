# API Testing Guide

This guide explains how to test all APIs in the backend system.

## Quick Start

### Test Production APIs
```bash
npm run test:apis
# or
npm run test:apis:prod
```

### Test Local APIs
```bash
npm run test:apis:local
```

### Direct Execution
```bash
node scripts/test-all-apis.js
```

## Environment Variables

- `BASE_URL` - Production base URL (default: `https://98.70.245.87`)
- `LOCAL_BASE_URL` - Local base URL (default: `http://localhost`)
- `USE_LOCAL` - Set to `true` to use local URLs (default: `false`)

## What Gets Tested

### Auth Service (~40 endpoints)
- Health & Status checks
- Authentication (login, mock-login, refresh token)
- User profile management
- Password reset
- Real users management
- Permissions management
- Emergency lock system

### HR Service (~70 endpoints)
- Health & Status
- Departments (GET, POST)
- Employees (CRUD operations)
- Stores (CRUD operations)
- Onboarding (draft management)
- Leave management
- Payroll
- Reports
- Admin management
- Transfers
- HR Letters
- F&F (Full & Final)
- Audit logs
- Statutory returns
- Incentives
- Documents

### Attendance Service (~20 endpoints)
- Health & Status
- Attendance history & summary
- Attendance records & reports
- Geofencing (settings, check, users)
- Security (violations, IP geolocation)

## Test Results

The script generates two output files:

1. **test-results.json** - Machine-readable JSON with all test results
2. **test-results.html** - Human-readable HTML report with:
   - Summary statistics
   - Failed tests details
   - Complete test list

## Authentication

The script automatically authenticates with different roles:
- `superadmin`
- `admin`
- `hr`
- `manager`
- `employee`

It uses the `/api/auth/mock-login-fast` endpoint for quick authentication without database dependencies.

## Expected Results

- **Pass Rate**: Should be > 95% for production
- **Common Failures**:
  - 401/403: Authentication/Authorization issues
  - 404: Resources that don't exist yet
  - 409: Duplicate resources (expected for some tests)
  - 400: Validation errors (expected for invalid data tests)

## Troubleshooting

### Connection Issues
- Check if services are running
- Verify BASE_URL is correct
- Check network connectivity

### Authentication Failures
- Verify mock-login endpoint is working
- Check if auth service is accessible

### High Failure Rate
- Check service health endpoints first
- Verify database connectivity
- Check service logs for errors

## Example Output

```
╔═══════════════════════════════════════════════════════════╗
║        COMPREHENSIVE API TEST SUITE                        ║
╚═══════════════════════════════════════════════════════════╝

ℹ Base URL: https://98.70.245.87
ℹ Mode: PRODUCTION

━━━ Authentication Setup ━━━

ℹ Getting token for superadmin...
✓ Authenticated as superadmin
...

━━━ AUTH SERVICE APIs ━━━

✓ GET /api/auth/health - Health Check
✓ POST /api/auth/mock-login-fast - Mock Login Fast
...

━━━ TEST RESULTS SUMMARY ━━━

Total Tests:    133
Passed:         128
Failed:         5
Skipped:        0

Pass Rate:      96.24%
```

## Continuous Integration

You can integrate this into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Test APIs
  run: npm run test:apis
  continue-on-error: true
```

## Notes

- Tests are designed to be non-destructive (mostly GET requests)
- Some POST requests create test data that may need cleanup
- Tests use mock authentication to avoid real user dependencies
- Timeout is set to 10 seconds per request

