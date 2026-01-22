# Local Testing Guide - Multi-Tenant Implementation

## Prerequisites

1. **Services Running:**
   - HR Service: `http://localhost:3002`
   - Auth Service: `http://localhost:3001`

2. **Database:**
   - MongoDB/Cosmos DB connection configured
   - Test user exists with `tenantId` field

3. **Environment Variables:**
   - `JWT_SECRET` set in both services
   - `MONGODB_URI` configured

## Quick Start

### Step 1: Check if services are running

```bash
./test-local-services.sh
```

### Step 2: Start services (if not running)

**Terminal 1 - Auth Service:**
```bash
cd microservices/auth-service
npm start
```

**Terminal 2 - HR Service:**
```bash
cd microservices/hr-service
npm start
```

### Step 3: Run tests

```bash
node test-multi-tenant-implementation.js
```

### Step 4: Custom configuration (if needed)

```bash
BASE_URL=http://localhost:3002 \
AUTH_URL=http://localhost:3001 \
TEST_EMAIL=admin@lenstrack.etelios.com \
TEST_PASSWORD=Lenstrack@Admin123 \
TEST_TENANT=lenstrack \
node test-multi-tenant-implementation.js
```

## What the Tests Check

1. ✅ **JWT Token Contains TenantId**
   - Logs in and verifies token has `tenantId` claim
   - Verifies `tenantId` matches expected value

2. ✅ **Missing Header Rejection**
   - Makes request without `X-Tenant-Id` header
   - Expects 400 error with `TENANT_REQUIRED`

3. ✅ **Mismatched Tenant Rejection**
   - Makes request with wrong tenant in header
   - Expects 403 error with `TENANT_MISMATCH`

4. ✅ **Valid Request**
   - Makes request with correct tenant
   - Expects 200 OK response

5. ✅ **Refresh Token Contains TenantId**
   - Refreshes access token
   - Verifies new token has `tenantId` claim

## Expected Results

### ✅ All Tests Pass:
```
━━━ Test Summary ━━━

ℹ Total Tests: 5
✓ Passed: 5
✓ All tests passed! 🎉
```

### ⚠️ Partial Implementation:
If validation middleware is not yet deployed, you may see:
- Test 1: ✅ Pass (token has tenantId)
- Test 2: ⚠️ May fail (validation not active)
- Test 3: ⚠️ May fail (validation not active)
- Test 4: ✅ Pass (valid request works)
- Test 5: ✅ Pass (refresh token has tenantId)

## Troubleshooting

### Issue: "Connection refused"
**Solution:** Services are not running. Start them first.

### Issue: "Login failed"
**Solution:** 
- Check credentials in test script
- Verify user exists in database
- Verify user has `tenantId` field set

### Issue: "Token missing tenantId"
**Solution:**
- Check if login function was updated
- Verify `auth.service.js` includes `tenantId` in token generation

### Issue: "Validation not working"
**Solution:**
- Check if `validateTenant.middleware.js` exists
- Verify routes include `validateTenantMiddleware()`
- Check middleware order: `authenticate` → `validateTenantMiddleware` → `extractTenantId`

## Manual Testing

### Test 1: Login and Check Token
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: lenstrack" \
  -d '{
    "emailOrEmployeeId": "admin@lenstrack.etelios.com",
    "password": "Lenstrack@Admin123"
  }' | jq '.data.accessToken' | cut -d'"' -f2 | cut -d'.' -f2 | base64 -d | jq
```

### Test 2: Missing Header
```bash
TOKEN="your-token-here"
curl -X GET http://localhost:3002/api/hr/employees \
  -H "Authorization: Bearer $TOKEN"
# Should return 400 TENANT_REQUIRED
```

### Test 3: Mismatched Tenant
```bash
TOKEN="your-token-here"
curl -X GET http://localhost:3002/api/hr/employees \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: wrong-tenant"
# Should return 403 TENANT_MISMATCH
```

### Test 4: Valid Request
```bash
TOKEN="your-token-here"
curl -X GET http://localhost:3002/api/hr/employees \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: lenstrack"
# Should return 200 OK with employee list
```

## Next Steps

After local testing passes:
1. ✅ Push changes to Azure DevOps
2. ✅ Deploy to staging
3. ✅ Run integration tests
4. ✅ Deploy to production
