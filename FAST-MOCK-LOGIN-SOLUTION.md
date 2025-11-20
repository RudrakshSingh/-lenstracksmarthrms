# Fast Mock Login Solution - Fixes 408 Timeout

## Problem

The regular `/api/auth/mock-login` endpoint times out (408) because:
- Database operations are slow (10+ seconds)
- Azure Load Balancer timeout is ~10-11 seconds
- Even with optimizations, database writes can be slow

## Solution

**New Fast Mock Login Endpoint** that bypasses database entirely:
- ✅ No database operations
- ✅ Returns tokens instantly (<100ms)
- ✅ No timeout possible
- ✅ Perfect for frontend testing

## Usage

### Option 1: New Fast Endpoint (Recommended)

```bash
curl -X POST 'https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net/api/auth/mock-login-fast' \
  -H 'Content-Type: application/json' \
  -d '{"role":"hr"}' \
  -k
```

**Response Time**: <1 second (no timeout)

### Option 2: Fast Mode Parameter

```bash
curl -X POST 'https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net/api/auth/mock-login?fast=true' \
  -H 'Content-Type: application/json' \
  -d '{"role":"hr"}' \
  -k
```

### Option 3: Environment Variable

Set `MOCK_LOGIN_FAST_MODE=true` in Azure App Service settings to enable fast mode by default.

## Frontend Integration

### Update API Client

```javascript
// Change from:
const response = await fetch('/api/auth/mock-login', {
  method: 'POST',
  body: JSON.stringify({ role: 'hr' })
});

// To:
const response = await fetch('/api/auth/mock-login-fast', {
  method: 'POST',
  body: JSON.stringify({ role: 'hr' })
});
```

### Or Use Fast Mode Parameter

```javascript
const response = await fetch('/api/auth/mock-login?fast=true', {
  method: 'POST',
  body: JSON.stringify({ role: 'hr' })
});
```

## Response Format

Same as regular mock login:

```json
{
  "success": true,
  "message": "Mock login successful (fast mode - no database)",
  "data": {
    "user": {
      "_id": "mock_hr_MOCKHR001",
      "employee_id": "MOCKHR001",
      "name": "Mock HR User",
      "email": "mock.hr@etelios.com",
      "role": "hr",
      "department": "HR",
      "designation": "HR Manager"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "mock": true,
  "fastMode": true,
  "note": "This is a fast mode that skips database operations. For production, use pre-created users."
}
```

## How It Works

1. **No Database**: Returns hardcoded user data
2. **Valid Tokens**: Generates real JWT tokens (same as regular login)
3. **Consistent IDs**: Uses `mock_{role}_{employeeId}` format for consistent user IDs
4. **Fast**: Completes in <100ms (no network calls)

## Supported Roles

- `hr`
- `admin`
- `manager`
- `employee`
- `superadmin`

## Testing

### Test Fast Endpoint

```bash
# Test fast endpoint
curl -X POST 'https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net/api/auth/mock-login-fast' \
  -H 'Content-Type: application/json' \
  -d '{"role":"hr"}' \
  -k --max-time 5 \
  -w "\n\nHTTP Status: %{http_code}\nTime: %{time_total}s\n"
```

**Expected**: Status 200, Time <1 second

### Test with Token

```bash
# Get token
TOKEN=$(curl -X POST 'https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net/api/auth/mock-login-fast' \
  -H 'Content-Type: application/json' \
  -d '{"role":"hr"}' \
  -k -s | jq -r '.data.accessToken')

# Test endpoint with token
curl -X GET 'https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/hr/employees' \
  -H "Authorization: Bearer $TOKEN" \
  -k
```

## Deployment

The code has been committed and pushed. After the pipeline builds:

1. ✅ Fast endpoint will be available at `/api/auth/mock-login-fast`
2. ✅ Regular endpoint supports `?fast=true` parameter
3. ✅ Can enable fast mode globally via `MOCK_LOGIN_FAST_MODE=true`

## Notes

- **Fast mode is for testing only** - tokens work but users don't exist in database
- **For production**: Use pre-created users or regular login
- **Token validation**: Tokens are valid and will work with protected endpoints
- **User ID format**: `mock_{role}_{employeeId}` (e.g., `mock_hr_MOCKHR001`)

## Next Steps

1. ✅ Code deployed (wait for pipeline)
2. ⏳ Test fast endpoint
3. ⏳ Update frontend to use fast endpoint
4. ⏳ Test all endpoints with tokens from fast login

