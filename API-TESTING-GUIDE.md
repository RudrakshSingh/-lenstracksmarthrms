# API Testing Guide

## Quick Start

### Option 1: Simple Test (No Dependencies)
```bash
# Test against local server
node test-endpoints-simple.js

# Test against production
API_BASE_URL=https://your-api-url.com node test-endpoints-simple.js

# With custom credentials
TEST_EMAIL=admin@company.com TEST_PASSWORD=yourpassword node test-endpoints-simple.js
```

### Option 2: Using Test Script
```bash
# Make script executable (first time only)
chmod +x run-api-tests.sh

# Run tests
./run-api-tests.sh

# With custom configuration
API_BASE_URL=https://your-api-url.com TEST_EMAIL=admin@company.com ./run-api-tests.sh
```

### Option 3: Full Test Suite (Requires axios and colors)
```bash
# Install dependencies first
npm install axios colors

# Run full test suite
node test-all-endpoints.js

# With custom configuration
API_BASE_URL=https://your-api-url.com node test-all-endpoints.js
```

## Configuration

### Environment Variables

- `API_BASE_URL` - Base URL of the API (default: `http://localhost:3002`)
- `TEST_EMAIL` - Email for login (default: `admin@company.com`)
- `TEST_PASSWORD` - Password for login (default: `password123`)

### Examples

```bash
# Test local development server
API_BASE_URL=http://localhost:3002 node test-endpoints-simple.js

# Test staging server
API_BASE_URL=https://staging-api.example.com node test-endpoints-simple.js

# Test production server
API_BASE_URL=https://api.example.com node test-endpoints-simple.js

# With custom credentials
TEST_EMAIL=hr@company.com TEST_PASSWORD=securepass123 node test-endpoints-simple.js
```

## What Gets Tested

### 1. Authentication Endpoints
- ✅ POST `/api/auth/login` - User login
- ✅ GET `/api/auth/me` - Get current user
- ✅ POST `/api/auth/refresh` - Refresh token
- ✅ POST `/api/auth/logout` - User logout

### 2. Employee Management
- ✅ GET `/api/hr/employees` - List employees
- ✅ GET `/api/hr/employees/:id` - Get employee by ID
- ✅ POST `/api/hr/employees` - Create employee
- ✅ PUT `/api/hr/employees/:id` - Update employee

### 3. Store Management
- ✅ GET `/api/hr/stores` - List stores
- ✅ GET `/api/hr/stores/:id` - Get store by ID

### 4. Leave Management
- ✅ GET `/api/hr/policies/leave` - Get leave policy
- ✅ GET `/api/hr/leave-requests` - List leave requests
- ✅ GET `/api/hr/leave-ledger` - Get leave ledger

### 5. Payroll Management
- ✅ GET `/api/hr/payroll-runs` - List payroll runs
- ✅ GET `/api/hr/payslips` - Get payslips

### 6. Incentive Management
- ✅ GET `/api/hr/incentive-claims` - List incentive claims

### 7. F&F Settlement
- ✅ GET `/api/hr/fnf` - List F&F cases

### 8. Transfer Management
- ✅ GET `/api/transfers` - List transfers

### 9. HR Letters
- ✅ GET `/api/hr-letter/letters` - List HR letters
- ✅ GET `/api/hr-letter/stats` - Get letter statistics

### 10. Statutory Compliance
- ✅ GET `/api/hr/stat-exports` - List statutory exports

### 11. Reports
- ✅ GET `/api/hr/reports/payroll-cost` - Payroll cost report
- ✅ GET `/api/hr/reports/leave-utilization` - Leave utilization report
- ✅ GET `/api/hr/reports/attrition` - Attrition report

### 12. Audit
- ✅ GET `/api/hr/audit-logs` - List audit logs

### 13. Health Endpoints
- ✅ GET `/health` - Health check
- ✅ GET `/api/hr/status` - Service status
- ✅ GET `/api/hr/health` - Service health

## Test Output

### Success Example
```
✅ Login - 200 (45ms)
✅ Get Current User - 200 (12ms)
✅ Get Employees - 200 (89ms)
...
📊 TEST SUMMARY
✅ Passed: 45
❌ Failed: 0
⏭️  Skipped: 2
📈 Pass Rate: 95.7%
🎉 ALL TESTS PASSED!
```

### Failure Example
```
❌ Login - Expected 200, got 401
   Error: Invalid email or password
...
📊 TEST SUMMARY
✅ Passed: 30
❌ Failed: 15
⏭️  Skipped: 2
📈 Pass Rate: 63.8%
⚠️  SOME TESTS FAILED
```

## Troubleshooting

### Authentication Failed
- **Issue:** Login returns 401
- **Solution:** Check `TEST_EMAIL` and `TEST_PASSWORD` environment variables
- **Fix:** Use valid credentials or create a test user

### Connection Refused
- **Issue:** Cannot connect to API
- **Solution:** Verify `API_BASE_URL` is correct and service is running
- **Fix:** Check if service is running: `curl http://localhost:3002/health`

### 403 Forbidden Errors
- **Issue:** Endpoints return 403
- **Solution:** Check if user has proper permissions
- **Fix:** Use admin/superadmin account or check RBAC configuration

### Timeout Errors
- **Issue:** Requests timeout
- **Solution:** Check network connectivity and service health
- **Fix:** Increase timeout or check service logs

## Continuous Testing

### Add to CI/CD Pipeline

```yaml
# GitHub Actions example
- name: Test API Endpoints
  run: |
    npm install
    API_BASE_URL=${{ secrets.API_URL }} \
    TEST_EMAIL=${{ secrets.TEST_EMAIL }} \
    TEST_PASSWORD=${{ secrets.TEST_PASSWORD }} \
    node test-endpoints-simple.js
```

### Scheduled Testing

```bash
# Add to crontab for daily testing
0 2 * * * cd /path/to/project && API_BASE_URL=https://api.example.com node test-endpoints-simple.js >> test-results.log 2>&1
```

## Custom Test Scenarios

### Test Specific Endpoint

```javascript
// test-specific.js
const { testEndpoint } = require('./test-endpoints-simple');

async function testSpecific() {
  const token = 'your-token-here';
  await testEndpoint('My Test', 'GET', '/api/hr/employees', {
    expectedStatus: 200
  });
}

testSpecific();
```

### Test with Custom Data

```javascript
await testEndpoint('Create Employee', 'POST', '/api/hr/employees', {
  data: {
    employeeId: 'EMP001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'SecurePass123!',
    roleName: 'Employee'
  },
  expectedStatus: 201
});
```

## Notes

- Tests use GET requests for most endpoints to avoid data modification
- POST/PUT/DELETE tests are limited to prevent data corruption
- Some tests may be skipped if authentication fails
- 404 responses are acceptable for non-existent resources
- Tests are designed to be non-destructive

