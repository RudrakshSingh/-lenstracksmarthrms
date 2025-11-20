# Fix 404 Endpoint Issues - Root Cause Analysis

## Problem Summary

All endpoints are returning **404 Not Found** when accessed through the API Gateway, even though:
- ✅ Services are online (auth and hr show as "online")
- ✅ Routes are implemented in the services
- ✅ API Gateway proxy is configured

## Root Causes Identified

### 1. **Authentication Required** ⚠️ MOST LIKELY

Most endpoints require authentication tokens. The 404 might actually be an authentication error being returned as 404.

**Evidence:**
- HR service routes require `authenticate` middleware
- Dashboard endpoints require authentication
- Frontend test results show 404, but might be auth-related

**Solution**: Test with valid authentication token

### 2. **Proxy Path Forwarding Issue**

The proxy middleware might not be forwarding the full path correctly.

**Current Setup:**
```javascript
app.use('/api/hr', proxyMiddleware);
// This should forward /api/hr/employees to service
```

**Issue**: The proxy might be stripping `/api/hr` or not forwarding correctly.

### 3. **404 Handler Catching Requests**

The 404 handler might be catching requests before the proxy can forward them.

**Current Order:**
1. Proxy middleware registered
2. 404 handler registered last

**Should be correct**, but let's verify.

### 4. **HR Service Running Wrong Code**

The HR service URL is returning API Gateway response, suggesting it might be running the wrong code.

**Evidence:**
- Direct HR service test shows API Gateway JSON structure
- This shouldn't happen if HR service is running its own code

## Solutions

### Solution 1: Test with Authentication (IMMEDIATE)

```bash
# Step 1: Get token from mock login
TOKEN=$(curl -X POST "https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net/api/auth/mock-login" \
  -H "Content-Type: application/json" \
  -d '{"role":"hr"}' \
  -k --max-time 30 -s | jq -r '.data.accessToken')

# Step 2: Test endpoint with token
curl -X GET "https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/hr/employees" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -k
```

### Solution 2: Fix Proxy Path Forwarding

Ensure the proxy forwards the full path including the base path:

```javascript
// Current (might be stripping path)
app.use('/api/hr', proxyMiddleware);

// Should forward: /api/hr/employees -> https://hr-service/api/hr/employees
// Not: /api/hr/employees -> https://hr-service/employees
```

### Solution 3: Verify HR Service Deployment

Check if HR service App Service is running the correct code:
1. Check Azure Portal → App Service → Deployment Center
2. Verify it's deploying from the correct repository/branch
3. Check if it's using the HR service Dockerfile, not API Gateway

### Solution 4: Add Better Error Handling

Return proper error messages instead of 404:
- 401 for authentication errors
- 403 for authorization errors
- 404 only for truly missing endpoints

## Testing Checklist

- [ ] Test endpoints with authentication token
- [ ] Test direct service endpoints (bypass gateway)
- [ ] Verify proxy is forwarding full paths
- [ ] Check service deployment (correct code)
- [ ] Verify route registration order
- [ ] Check middleware order (auth before proxy)

## Expected Behavior

### With Authentication:
```
GET /api/hr/employees
Headers: Authorization: Bearer <token>
Response: 200 OK with employee list
```

### Without Authentication:
```
GET /api/hr/employees
Response: 401 Unauthorized (not 404)
```

## Next Steps

1. **Fix mock login 408 timeout first** (pre-create users)
2. **Test endpoints with valid tokens**
3. **Verify proxy path forwarding**
4. **Check service deployments**

