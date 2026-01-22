# Testing Note - Multi-Tenant Implementation

## ⚠️ Production Server Connection Issue

The production server (`https://98.70.245.87`) is currently timing out when accessed from your local network. This could be due to:

1. **Firewall rules** - Server may only accept connections from specific IPs
2. **Network restrictions** - Your network may be blocking the connection
3. **Server status** - Server may be temporarily down or unreachable

## ✅ Solution: Test Locally First

Since production is not accessible, **test the changes locally** before deploying:

### Step 1: Start Services Locally

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

### Step 2: Run Local Tests

```bash
# Test against local services
BASE_URL=http://localhost:3002 \
AUTH_URL=http://localhost:3001 \
TEST_EMAIL=admin@lenstrack.etelios.com \
TEST_PASSWORD=Lenstrack@Admin123 \
TEST_TENANT=lenstrack \
node test-multi-tenant-implementation.js
```

### Step 3: Verify Changes

The test will verify:
1. ✅ JWT token contains `tenantId` after login
2. ✅ Missing header is rejected (400)
3. ✅ Mismatched tenant is rejected (403)
4. ✅ Valid request works (200)
5. ✅ Refresh token contains `tenantId`

## 🚀 After Local Testing Passes

1. **Push changes to Azure DevOps**
2. **Deploy to staging/production**
3. **Test against deployed environment** (once accessible)

## 📝 Code Changes Summary

All implementation is complete:
- ✅ Login token includes `tenantId`
- ✅ Refresh token includes `tenantId`
- ✅ Auth middleware extracts `tenantId` from token
- ✅ `validateTenant` middleware created
- ✅ All routes updated with validation

The code is ready to deploy and test in production once the server is accessible.
