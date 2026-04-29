# Frontend auth/routing fixes — completion report

**Audience:** Frontend developers, QA, release coordinators  
**Environment:** Production (`https://api.etelios.com`)  
**Report time:** 2026-04-20 13:02:10 IST

---

## 1) Fixes implemented

### A. Login response now returns `defaultLandingPath`

- Added role-to-path mapper in `microservices/auth-service/src/utils/defaultLandingPath.js`.
- Added `defaultLandingPath` in auth login success payload:
  - `microservices/auth-service/src/services/auth.service.js`
  - `microservices/auth-service/src/controllers/authController.js` (mock login)
  - `microservices/auth-service/src/controllers/authController.fast.js` (fast mock login)

**Outcome:** Frontend gets a canonical first path (`/tenant-admin` vs `/admin/super-admin`) from backend.

### B. Denied route permissions are now enforced in login permissions payload

- Updated `microservices/shared/utils/shellRoutePermissions.js`:
  - `compileShellRouteAndViewPermissions` now accepts denied permissions and removes denied codes from final merged list.
- Updated `microservices/auth-service/src/utils/effectivePermissions.js`:
  - passes `permission_denials` to shell compiler.

**Outcome:** `permission_denials` (e.g. `route:/tenant-admin`) no longer leak back into `data.user.permissions`.

---

## 2) Production deployment status

Auth-service was deployed via AWS + Docker rollout script.

| Deployment | Image tag | Status |
|------------|-----------|--------|
| Initial default landing rollout | `auth-default-landing-20260419` | Done |
| Deny filtering fix rollout | `auth-deny-filter-20260420-1225` | Done |

Current deployment image (verified):

`383234048604.dkr.ecr.ap-south-1.amazonaws.com/etelios-auth-service:auth-deny-filter-20260420-1225`

---

## 3) Tests executed (live)

### Test 1 — service health

- Request: `GET /api/auth/health`
- Result: **HTTP 200** (`auth-service` healthy)

### Test 2 — login payload includes routing field

- Account tested: `admin@lenstrack.com` (tenant `lenstrack`)
- Request: `POST /api/auth/login`
- Result:
  - `success: true`
  - `data.user.role: "admin"`
  - `data.defaultLandingPath: "/tenant-admin"`
  - token present

### Test 3 — deny filtering proof (live temporary override)

- Temporary deny applied to same user:
  - `route:/tenant-admin`
  - `route:/admin`
  - `route:/admin/super-admin`
- Re-login verification result:
  - `permission_denials` showed the deny list
  - `data.user.permissions` **did not contain** those denied routes
  - checks returned:
    - `hasTenantAdmin: false`
    - `hasAdmin: false`
    - `hasSuperAdminRoute: false`

### Test 4 — cleanup / restore

- Reset user override back to baseline:
  - `permission_denials: []`
- Verification:
  - `effectiveHasTenantAdmin: true` (expected for tenant admin)

---

## 4) Errors that are now resolved

| Earlier symptom | Root cause | Resolution |
|-----------------|-----------|------------|
| Frontend confused admin as superadmin landing | No canonical landing path in login response | Added `data.defaultLandingPath` from backend |
| Denied routes still visible in `user.permissions` | Shell route compiler re-added admin/superadmin routes without subtracting denials | Compiler now removes denied codes in final payload |

---

## 5) Frontend action items (post-fix)

1. Use `data.defaultLandingPath` for first navigation after login.
2. Keep route guards role-based (`user.role === 'superadmin'` for super-admin-only screens).
3. If backend field is missing in older envs, fallback to role mapping.
4. Clear stale tokens on account switch issues.

---

## 6) Reference docs

- `docs/FRONTEND_AUTH_AND_ROUTING_COMPLETE_GUIDE.md` (full implementation guide)
- `docs/FRONTEND_AUTH_LOGIN_DEFAULT_LANDING.md` (short handoff)
- `docs/FRONTEND_POST_LOGIN_ROUTING.md` (routing behavior reference)

---

**Conclusion:**  
Auth/routing fixes are implemented, deployed, and live-tested. Reported frontend-facing errors are resolved in production.
