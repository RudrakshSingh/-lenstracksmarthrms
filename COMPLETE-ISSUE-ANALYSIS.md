# Complete Issue Analysis - 404 Errors & 408 Timeout

## Summary

**Primary Issue**: 408 timeout on mock login prevents getting authentication tokens  
**Secondary Issue**: 404 errors on all endpoints (likely due to missing authentication)

## Root Cause Chain

1. **Mock login times out (408)** → Can't get authentication tokens
2. **Endpoints require authentication** → Return 404 without tokens
3. **Can't test endpoints** → Appears as if endpoints don't exist

## Why 404 Errors Are Happening

### The Real Issue

The endpoints **DO exist**, but they're returning 404 because:

1. **Authentication Required**: Most endpoints have `authenticate` middleware
2. **No Token Available**: Mock login is timing out, so no tokens
3. **Auth Errors Return 404**: Instead of proper 401 Unauthorized

### Evidence

- ✅ Routes are implemented in services (verified in code)
- ✅ Services are online (API Gateway shows them as "online")
- ✅ Proxy is configured correctly
- ❌ Mock login times out (can't get tokens)
- ❌ Endpoints return 404 without tokens

## Solutions (In Order)

### 1. Fix Mock Login 408 Timeout (CRITICAL)

**This is blocking everything else.**

**Solution**: Pre-create mock users
```bash
# On Azure App Service Console
cd /home/site/wwwroot
node scripts/pre-create-mock-users.js
```

**Why this works:**
- Eliminates slow database write operation
- Endpoint becomes read-only (fast)
- Completes in <2 seconds (under timeout)

### 2. Test Endpoints with Tokens

Once mock login works:

```bash
# Get token
TOKEN=$(curl -X POST "https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net/api/auth/mock-login" \
  -H "Content-Type: application/json" \
  -d '{"role":"hr"}' \
  -k -s | jq -r '.data.accessToken')

# Test endpoint
curl -X GET "https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/hr/employees" \
  -H "Authorization: Bearer $TOKEN" \
  -k
```

### 3. Fix Authentication Error Handling

Update services to return 401 instead of 404 for auth errors:

```javascript
// In auth middleware
if (!token) {
  return res.status(401).json({
    success: false,
    error: 'Unauthorized',
    message: 'Authentication token required'
  });
}
```

### 4. Check Load Balancer Timeout

If mock login still times out after pre-creating users:

1. Azure Portal → App Service → Networking
2. Check Load Balancer timeout settings
3. Increase to 60+ seconds if needed

## Action Plan

### Immediate (Now)
1. ✅ Pre-create mock users (fixes 408 timeout)
2. ✅ Test mock login (should work in <2 seconds)
3. ✅ Get authentication token
4. ✅ Test endpoints with token

### Short Term (After mock login works)
1. Test all endpoints with valid tokens
2. Verify which endpoints actually work
3. Fix any remaining routing issues
4. Update error handling (401 vs 404)

### Long Term
1. Implement proper authentication error responses
2. Add endpoint documentation
3. Create integration tests
4. Monitor endpoint health

## Testing After Fix

### Step 1: Pre-create Users
```bash
# On Azure App Service
node scripts/pre-create-mock-users.js
```

### Step 2: Test Mock Login
```bash
curl -X POST "https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net/api/auth/mock-login" \
  -H "Content-Type: application/json" \
  -d '{"role":"hr"}' \
  -k --max-time 10
```

**Expected**: Status 200, response time <2 seconds

### Step 3: Test Endpoints
```bash
# Get token
TOKEN="<token from step 2>"

# Test HR endpoints
curl -X GET "https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/hr/employees" \
  -H "Authorization: Bearer $TOKEN" \
  -k

# Test Dashboard
curl -X GET "https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net/api/dashboard/stats" \
  -H "Authorization: Bearer $TOKEN" \
  -k
```

## Expected Results After Fix

- ✅ Mock login: 200 OK, <2 seconds
- ✅ Endpoints with token: 200 OK (or proper error codes)
- ✅ Endpoints without token: 401 Unauthorized (not 404)
- ✅ All endpoints accessible through API Gateway

## Status

**Current**: Blocked by 408 timeout  
**After Fix**: Should work with authentication tokens

