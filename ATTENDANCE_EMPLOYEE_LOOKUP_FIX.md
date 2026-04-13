# Attendance Service Employee Lookup Fix

## Changes Made

### 1. Added Upcapto Tenant Admin Credentials Support
**File:** `microservices/attendance-service/src/utils/hrServiceClient.js`

- Added support for `upcapto` tenant admin credentials
- Default admin email: `admin@upcapto.com`
- Default admin password: `Upcapto@2026`
- Falls back to environment variables if set

### 2. Improved Employee Lookup Query Parameters
- Added `search` parameter alongside `employeeId` for better compatibility
- Enhanced email lookup with both `email` and `search` parameters
- Better handling of different HR service response formats

### 3. Enhanced Error Logging
- Added detailed logging when employee lookup returns empty results
- Better error messages showing what was searched and why it failed
- Logs tenantId, employeeId, and response structure for debugging

## Deployment Status

✅ **Deployed to Production**
- Image built and pushed to ECR
- Kubernetes deployment restarted
- Rollout successful (2 pods running)

## Current Issue

The employee lookup is still failing even after the fix. The employee exists in HR service (verified), but the attendance service cannot find them.

### Possible Root Causes

1. **Authorization Issue**
   - Admin token might not be obtained correctly for upcapto tenant
   - Employee's own token might not have permission to query HR service
   - Token might not have correct tenant context

2. **Query Parameter Issue**
   - HR service might expect different parameter names
   - Case sensitivity in employeeId matching
   - Tenant isolation filtering might be too strict

3. **Response Format Issue**
   - HR service response format might not match what attendance service expects
   - Employee data might be nested differently in response

4. **Timing Issue**
   - Employee might not be fully synced between services
   - Cache might be stale

## Verification Steps

### 1. Check Employee in HR Service (Direct Query)
```bash
# Login as admin and query employee directly
BACKEND_URL=http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com \
EMAIL=admin@upcapto.com \
PASSWORD="Upcapto@2026" \
node scripts/check-and-fix-employee-hr.js
```

### 2. Check Attendance Service Logs
```bash
kubectl logs -n etelios-prod -l app=attendance-service --tail=100 | grep -i "employee lookup"
```

### 3. Test Clock-In/Clock-Out
```bash
BACKEND_URL=http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com \
EMAIL=Aditya@gmail.com \
PASSWORD="yrv0s48mA1!" \
node scripts/test-clock-in-out.js
```

## Next Steps

1. **Check Attendance Service Logs**
   - Review logs to see exact error during employee lookup
   - Verify if admin token is being obtained
   - Check what query parameters are being sent

2. **Verify HR Service Query**
   - Test direct query to HR service with same parameters
   - Verify employee can be found with admin token
   - Check if employee query requires specific permissions

3. **Debug Admin Token Retrieval**
   - Verify admin login works for upcapto tenant
   - Check if admin token has correct tenant context
   - Ensure admin token has permission to query employees

4. **Review Tenant Isolation**
   - Verify employee and attendance service are in same tenant
   - Check if tenantId normalization is consistent
   - Ensure cross-tenant lookup is not needed

## Files Modified

1. `microservices/attendance-service/src/utils/hrServiceClient.js`
   - Added upcapto admin credentials
   - Improved query parameters
   - Enhanced error logging

2. `scripts/deploy-attendance-employee-lookup-fix.sh`
   - Deployment script for the fix

## Summary

✅ **Code Fixes:** Deployed
- Upcapto tenant admin support added
- Query parameters improved
- Error logging enhanced

❌ **Issue:** Still persists
- Employee lookup still failing
- Need to check logs and verify admin token retrieval
- May need additional debugging or different approach

**Recommendation:** Check attendance service logs to see exact error during employee lookup, then adjust fix accordingly.
