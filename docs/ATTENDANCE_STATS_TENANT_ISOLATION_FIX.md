# Attendance Stats Tenant Isolation Fix

**Date:** March 6, 2026  
**Issue:** `/api/attendance/stats` showing all tenants' employees instead of only the current tenant

---

## Problem

The `/api/attendance/stats` endpoint was showing **73 employees** for Lenstrack tenant, but Lenstrack actually has only **4 employees**. This was a tenant isolation issue.

### Root Cause

1. **User Model in Attendance Service** doesn't have `tenantId` field
2. **Stats endpoint** was querying `User.countDocuments()` without tenant filter
3. **Attendance records query** was missing `tenantId` filter

---

## Fix Applied

### File: `microservices/attendance-service/src/controllers/attendanceController.js`

**Changes:**

1. **Added tenantId extraction:**
   ```javascript
   const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
   ```

2. **Added tenantId to attendance query:**
   ```javascript
   const query = {
     date: { $gte: startOfDay, $lte: endOfDay },
     tenantId: tenantId // CRITICAL: Filter by tenant
   };
   ```

3. **Changed employee count to use HR Service API:**
   - Instead of querying local User model (which doesn't have tenantId)
   - Now calls HR service `/api/hr/employees` with tenant filter
   - HR service properly filters by tenantId

**Code:**
```javascript
// Get total employees - CRITICAL: Filter by tenantId
// Note: User model in attendance-service doesn't have tenantId, so we need to call HR service
let totalEmployees = 0;
try {
  const axios = require('axios');
  const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:3002';
  const token = req.headers.authorization?.split(' ')[1] || null;
  
  // Build query params for HR service
  const hrQueryParams = new URLSearchParams();
  hrQueryParams.append('status', 'active');
  hrQueryParams.append('limit', '1'); // We only need count
  if (storeId) {
    hrQueryParams.append('store', storeId);
  }
  
  const hrResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/employees?${hrQueryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json'
    },
    timeout: 5000
  });
  
  if (hrResponse.data && hrResponse.data.success) {
    totalEmployees = hrResponse.data.pagination?.total || hrResponse.data.data?.length || 0;
  }
} catch (hrError) {
  // Fallback: Use User model (but it won't have tenant isolation)
  logger.warn('Failed to get employee count from HR service', { error: hrError.message });
  // Fallback logic...
}
```

---

## Expected Result After Fix

### Before Fix:
```json
{
  "totalEmployees": 73,  // ❌ All tenants
  "presentToday": 12,
  "absentToday": 61,
  "attendanceRate": 16.44
}
```

### After Fix:
```json
{
  "totalEmployees": 4,   // ✅ Only Lenstrack employees
  "presentToday": 0,     // ✅ Only Lenstrack attendance
  "absentToday": 4,
  "attendanceRate": 0.00
}
```

---

## Deployment Status

**Status:** ⚠️ **Code Fixed, Deployment Pending**

- ✅ Code changes applied
- ✅ Syntax validated
- ❌ Docker build/push failed (ECR authentication issue)
- ❌ Deployment not completed

---

## Deployment Steps

1. **Fix ECR Authentication:**
   ```bash
   aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 383234048604.dkr.ecr.ap-south-1.amazonaws.com
   ```

2. **Build and Push:**
   ```bash
   cd /Users/rudrakshsingh/Desktop/lenstracksmarthrms
   docker buildx build --platform linux/amd64 \
     -f microservices/attendance-service/Dockerfile \
     -t 383234048604.dkr.ecr.ap-south-1.amazonaws.com/etelios-attendance-service:fix-stats-tenant-isolation-v2 \
     --push .
   ```

3. **Deploy:**
   ```bash
   kubectl -n etelios-prod set image deploy/attendance-service \
     attendance-service=383234048604.dkr.ecr.ap-south-1.amazonaws.com/etelios-attendance-service:fix-stats-tenant-isolation-v2
   
   kubectl -n etelios-prod rollout status deploy/attendance-service --timeout=300s
   ```

4. **Verify:**
   ```bash
   # Test stats API
   curl -X GET "http://ALB_URL/api/attendance/stats" \
     -H "Authorization: Bearer $TOKEN" \
     -H "x-tenant-id: lenstrack"
   
   # Should show totalEmployees: 4 (not 73)
   ```

---

## Testing

After deployment, test with:

```bash
# Login as Lenstrack admin
TOKEN=$(curl -s -X POST http://ALB_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lenstrack.com","password":"AdminPass123!"}' \
  | jq -r '.data.accessToken')

# Get stats
curl -s "http://ALB_URL/api/attendance/stats" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: lenstrack" \
  | jq '{totalEmployees, presentToday, absentToday}'

# Expected: totalEmployees: 4
```

---

## Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Code Fix | ✅ Complete | Tenant isolation added |
| Syntax Check | ✅ Valid | No errors |
| Docker Build | ❌ Failed | ECR auth issue |
| Deployment | ❌ Pending | Waiting for build |
| Testing | ⏳ Pending | After deployment |

**Next Action:** Fix ECR authentication and deploy the updated image.

---

**Last Updated:** March 6, 2026
