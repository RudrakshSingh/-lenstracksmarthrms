# API Gateway Proxy Fix - Summary

## Issue Identified by Frontend Dev

**Problem**: API Gateway proxy not forwarding `/api/hr/*` requests to HR service, causing 404 errors.

## Root Cause

The proxy middleware was using `app.use(basePath, ...)` which should work, but:
1. Missing wildcard for sub-paths
2. Authorization header forwarding not explicit
3. Error messages not helpful for debugging

## Fixes Applied

### 1. Added Wildcard to Base Path Matching

**Before:**
```javascript
app.use('/api/hr', proxyMiddleware);
```

**After:**
```javascript
app.use('/api/hr*', proxyMiddleware);
```

This ensures all sub-paths are matched:
- `/api/hr` ✅
- `/api/hr/employees` ✅
- `/api/hr/leave/requests` ✅
- `/api/hr/payroll/runs` ✅

### 2. Explicit Authorization Header Forwarding

**Added:**
```javascript
onProxyReq: (proxyReq, req) => {
  // Forward all headers including Authorization
  if (req.headers.authorization) {
    proxyReq.setHeader('Authorization', req.headers.authorization);
  }
  // ... rest of code
}
```

### 3. Improved Error Handling

**Enhanced error messages:**
```javascript
onError: (err, req, res) => {
  res.status(503).json({
    success: false,
    message: `${service.name} is currently unavailable`,
    error: err.message,
    service: service.name,
    path: req.path,
    hint: 'Check service status at /api endpoint'
  });
}
```

### 4. Confirmed No Path Rewriting

The proxy does **NOT** use `pathRewrite`, which means:
- Request: `/api/hr/employees`
- Forwarded to: `https://hr-service/api/hr/employees` ✅
- Full path is preserved

## How It Works Now

```
Frontend Request:
  GET /api/hr/employees
  Headers: Authorization: Bearer <token>

API Gateway:
  1. Matches route: /api/hr* ✅
  2. Forwards to: https://hr-service/api/hr/employees ✅
  3. Includes Authorization header ✅
  4. Returns HR service response ✅

HR Service:
  1. Receives: GET /api/hr/employees
  2. Validates token
  3. Returns employee data

Response:
  200 OK
  {
    "success": true,
    "data": [...employees...]
  }
```

## Testing After Deployment

### Test 1: Health Check (No Auth)
```bash
curl -X GET "https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/hr/health" \
  -k
```

**Expected**: 200 OK from HR service

### Test 2: Employees Endpoint (With Auth)
```bash
# Get token first
TOKEN=$(curl -X POST "https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/auth/mock-login-fast" \
  -H "Content-Type: application/json" \
  -d '{"role":"hr"}' \
  -k -s | jq -r '.data.accessToken')

# Test endpoint
curl -X GET "https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/hr/employees" \
  -H "Authorization: Bearer $TOKEN" \
  -k
```

**Expected**: 200 OK with employee data (or 401 if token invalid)

### Test 3: Without Auth
```bash
curl -X GET "https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/hr/employees" \
  -k
```

**Expected**: 401 Unauthorized (not 404)

## Status

- ✅ Code fixed and committed
- ⏳ Waiting for deployment
- ⏳ Need to test after deployment

## Next Steps

1. Wait for Azure pipeline to deploy
2. Test endpoints with authentication
3. Verify 404 errors are resolved
4. Test all HR endpoints through API Gateway

