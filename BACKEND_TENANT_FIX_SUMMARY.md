# Backend Tenant Mismatch Fix - Summary ✅

## Issue Found:
The `auth.middleware.js` was extracting `tenantId` from JWT token but **NOT normalizing it to lowercase** before setting it in `req.user.tenantId`.

The `validateTenantMiddleware` normalizes both header and token tenantId to lowercase for comparison:
```javascript
const normalizedHeaderTenantId = headerTenantId.toLowerCase().trim();
const normalizedTokenTenantId = tokenTenantId ? tokenTenantId.toLowerCase().trim() : null;
```

But `req.user.tenantId` was set with the **original case** from JWT token (e.g., "Upcapto" vs "upcapto"), causing mismatch.

## Fix Applied:

### 1. Normalize tenantId when user found in DB (Line 239-243):
```javascript
let tenantId = tenantIdFromToken || tenantIdFromUser;

// CRITICAL: Normalize tenantId to lowercase (must match validateTenantMiddleware normalization)
if (tenantId) {
  tenantId = String(tenantId).toLowerCase().trim();
}
```

### 2. Normalize tenantId when user NOT found in DB (Line 170):
```javascript
tenantId: decoded.tenantId ? String(decoded.tenantId).toLowerCase().trim() : null
```

### 3. Added debug logging to track tenantId extraction

## Files Changed:
- `microservices/hr-service/src/middleware/auth.middleware.js`

## Deployment Status:
- ✅ Code fixed
- ✅ Docker image built locally
- ⏳ Need to push to ECR and deploy
- ⏳ New pods need to start (currently ImagePullBackOff)

## Next Steps:
1. Push image to ECR: `docker push etelios-hr-service:latest`
2. Wait for new pods to start
3. Test with onboarding script

## Expected Result:
- ✅ `req.user.tenantId` will be normalized to lowercase
- ✅ Matches `validateTenantMiddleware` normalization
- ✅ Should resolve TENANT_MISMATCH errors
