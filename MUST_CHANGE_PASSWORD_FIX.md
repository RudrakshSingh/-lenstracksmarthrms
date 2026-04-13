# Must Change Password Flow Fix

## Problem

Users with temporary passwords or `mustChangePassword: true` were getting 401 errors or "Access denied" messages instead of being redirected to the password change screen.

## Solution

### Backend Changes

**File:** `microservices/auth-service/src/services/auth.service.js`

1. ✅ **Enhanced logging** for temporary password logins
2. ✅ **Explicit check** for `mustChangePassword` and `passwordTemporary` flags
3. ✅ **Returns 200 OK** (not 401) when password is correct but temporary
4. ✅ **Always includes** `mustChangePassword` and `passwordTemporary` flags in response

**Key Changes:**
- Added explicit check: `const mustChangePassword = !!user.mustChangePassword || !!user.passwordTemporary;`
- Added logging when password change is required
- Ensured response always includes flags for frontend to check

### Frontend Changes

**Files Updated:**
1. `docs/archive/root-markdown/FRONTEND_API_COMPLETE_GUIDE.md` - Updated login example
2. `docs/FRONTEND_LOGIN_MUST_CHANGE_PASSWORD.md` - Complete implementation guide (NEW)

**Key Implementation:**
```typescript
// ✅ CRITICAL: Check mustChangePassword flag after successful login
if (response.data.data.mustChangePassword || response.data.data.passwordTemporary) {
  // Redirect to change password page
  navigate(`/auth/change-password?reason=first_login&email=${encodeURIComponent(email)}`);
  return response.data;
}
```

## Backend Response Format

### Normal Login (200 OK)
```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "user": { ... },
    "mustChangePassword": false,
    "passwordTemporary": false
  }
}
```

### Temporary Password / First Login (200 OK)
```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "user": { ... },
    "mustChangePassword": true,  // ✅ Frontend must check this!
    "passwordTemporary": true
  }
}
```

**⚠️ Important:** Backend returns **200 OK** (not 401) even when password is temporary. Frontend must check `mustChangePassword` flag and redirect.

## Frontend Implementation

### React Example
```typescript
if (response.data.data.mustChangePassword || response.data.data.passwordTemporary) {
  navigate(`/auth/change-password?reason=first_login&email=${encodeURIComponent(email)}`);
}
```

### Next.js Example
```typescript
if (data.data.mustChangePassword || data.data.passwordTemporary) {
  return NextResponse.redirect(
    new URL(`/auth/change-password?reason=first_login&email=${encodeURIComponent(email)}`, request.url)
  );
}
```

### Vue.js Example
```typescript
if (response.data.data.mustChangePassword || response.data.data.passwordTemporary) {
  router.push({
    path: '/auth/change-password',
    query: { reason: 'first_login', email: credentials.email }
  });
}
```

## Testing

1. Create a user with `mustChangePassword: true` or `passwordTemporary: true`
2. Login with that user's temporary password
3. Verify:
   - ✅ Backend returns 200 OK (not 401)
   - ✅ Response includes `mustChangePassword: true`
   - ✅ Frontend redirects to `/auth/change-password?reason=first_login`
   - ✅ No "Access denied" error is shown

## Files Changed

1. `microservices/auth-service/src/services/auth.service.js` - Backend login service
2. `docs/archive/root-markdown/FRONTEND_API_COMPLETE_GUIDE.md` - Frontend API guide
3. `docs/FRONTEND_LOGIN_MUST_CHANGE_PASSWORD.md` - Complete implementation guide (NEW)

## Next Steps

1. Deploy backend changes to production
2. Update frontend code to check `mustChangePassword` flag
3. Test with users like `Aditya@gmail.com` who have temporary passwords
4. Verify redirect flow works correctly

## Deployment

To deploy the backend fix:

```bash
# Build and push auth-service image
cd microservices/auth-service
docker build -t auth-service:latest .
# Push to ECR and update Kubernetes deployment
```

See `scripts/deploy-auth-register-fix.sh` for deployment automation.
