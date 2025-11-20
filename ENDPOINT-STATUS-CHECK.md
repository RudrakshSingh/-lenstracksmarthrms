# Endpoint Status Check - What Exists in Code

## ✅ Endpoints That EXIST in Code

### Authentication Endpoints:
- ✅ `POST /api/auth/login` - **EXISTS** in `auth.routes.js` (line 104)
- ✅ `POST /api/auth/register` - **EXISTS** in `auth.routes.js` (line 97) 
- ⚠️ `POST /api/auth/refresh` - **EXISTS** but route is `/api/auth/refresh-token` (line 125)

### HR Employee Endpoints:
- ✅ `POST /api/hr/employees` - **EXISTS** in `hr.routes.js` (line 152)
- ✅ `POST /api/hr/employees/:id/assign-role` - **EXISTS** in `hr.routes.js` (line 172)
- ✅ `PATCH /api/hr/employees/:id/status` - **EXISTS** in `hr.routes.js` (line 179)

### HR Stores:
- ✅ `POST /api/hr/stores` - **EXISTS** in `hr.routes.js` (line 193)

### HR Onboarding:
- ⚠️ `POST /api/hr/onboarding/personal-details` - **NOT FOUND** (might be part of register)
- ✅ `POST /api/hr/onboarding/work-details` - **EXISTS** in `onboarding.routes.js` (line 122, route: `/work-details`)
- ⚠️ `POST /api/hr/onboarding/statutory-info` - **EXISTS** but route is `PATCH /api/hr/employees/:employeeId/statutory` (line 135)
- ❌ `POST /api/hr/onboarding/documents` - **NOT FOUND**
- ✅ `POST /api/hr/onboarding/complete/:id` - **EXISTS** but route is `/employees/:employeeId/complete-onboarding` (line 148)

### HR Leave:
- ✅ `POST /api/hr/leave/requests` - **EXISTS** in `leave.routes.js` (line 48, route: `/leave-requests`)
- ⚠️ `POST /api/hr/leave/requests/:id/approve` - **EXISTS** but route is `PATCH /leave-requests/:id` (line 70)
- ✅ `POST /api/hr/leave/requests/:id/reject` - **EXISTS** in `leave.routes.js` (line 85)

### HR Payroll:
- ✅ `POST /api/hr/payroll/runs` - **EXISTS** in `payroll.routes.js` (line 48, route: `/payroll-runs`)
- ✅ `POST /api/hr/payroll/runs/:id/process` - **EXISTS** in `payroll.routes.js` (line 56)
- ✅ `POST /api/hr/payroll/runs/:id/lock` - **EXISTS** in `payroll.routes.js` (line 63)
- ✅ `POST /api/hr/payroll/runs/:id/post` - **EXISTS** in `payroll.routes.js` (line 70)
- ✅ `POST /api/hr/payroll/override` - **EXISTS** in `payroll.routes.js` (line 92, route: `/payroll-runs/:id/override`)

### Transfers:
- ✅ `POST /api/transfers` - **EXISTS** in `transfer.routes.js` (line 43, route: `/`)
- ✅ `POST /api/transfers/:id/approve` - **EXISTS** in `transfer.routes.js` (line 57)
- ✅ `POST /api/transfers/:id/reject` - **EXISTS** in `transfer.routes.js` (line 63)
- ✅ `POST /api/transfers/:id/cancel` - **EXISTS** in `transfer.routes.js` (line 70)

### HR Incentive:
- ✅ `POST /api/hr/incentive/claims` - **EXISTS** in `incentive.routes.js`
- ✅ `POST /api/hr/incentive/claims/:id/approve` - **EXISTS** in `incentive.routes.js`
- ✅ `POST /api/hr/incentive/claims/:id/reject` - **EXISTS** in `incentive.routes.js`

### HR F&F:
- ✅ `POST /api/hr/fnf/cases` - **EXISTS** in `fnf.routes.js`
- ✅ `POST /api/hr/fnf/cases/:id/approve` - **EXISTS** in `fnf.routes.js`
- ✅ `POST /api/hr/fnf/cases/:id/payout` - **EXISTS** in `fnf.routes.js`

### HR Statutory:
- ✅ `POST /api/hr/statutory/pf` - **EXISTS** in `statutory.routes.js`
- ✅ `POST /api/hr/statutory/esi` - **EXISTS** in `statutory.routes.js`
- ✅ `POST /api/hr/statutory/tds` - **EXISTS** in `statutory.routes.js`
- ✅ `POST /api/hr/statutory/lwf` - **EXISTS** in `statutory.routes.js`
- ✅ `POST /api/hr/statutory/validate` - **EXISTS** in `statutory.routes.js`

## ⚠️ Route Path Mismatches

Some endpoints exist but have different paths than expected:

1. **Refresh Token:**
   - Expected: `POST /api/auth/refresh`
   - Actual: `POST /api/auth/refresh-token`

2. **Leave Approve:**
   - Expected: `POST /api/hr/leave/requests/:id/approve`
   - Actual: `PATCH /api/hr/leave/requests/:id` (approve is done via PATCH)

3. **Onboarding Statutory:**
   - Expected: `POST /api/hr/onboarding/statutory-info`
   - Actual: `PATCH /api/hr/employees/:employeeId/statutory`

4. **Onboarding Complete:**
   - Expected: `POST /api/hr/onboarding/complete/:id`
   - Actual: `POST /api/hr/employees/:employeeId/complete-onboarding`

5. **Payroll Override:**
   - Expected: `POST /api/hr/payroll/override`
   - Actual: `POST /api/hr/payroll/runs/:id/override`

## ❌ Missing Endpoints

1. `POST /api/hr/onboarding/personal-details` - Not found (might be part of register)
2. `POST /api/hr/onboarding/documents` - Not found

## Summary

**Status:**
- ✅ **30+ endpoints EXIST** in code
- ⚠️ **5 endpoints** have path mismatches
- ❌ **2 endpoints** missing

**Conclusion:**
Most endpoints exist, but some have different paths than the frontend expects. The 404 errors are likely because:
1. Routes are not being forwarded correctly (proxy issue - we fixed this)
2. Some routes have different paths than expected
3. Services might not be running correct code (deployment issue)

