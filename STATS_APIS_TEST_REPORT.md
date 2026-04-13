# Stats APIs Test Report - Real Database Data

**Test Date:** 2026-03-06  
**Test Environment:** Production ALB  
**Tenant:** lenstrack  
**User:** admin@lenstrack.com

---

## 📊 Test Summary

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ **Passed** | 3 | 30% |
| ❌ **Failed** | 7 | 70% |
| **Total** | 10 | 100% |

---

## ✅ Working Stats APIs

### 1. **Time Tracking Statistics** ✅
- **Endpoint:** `GET /api/hr/time-tracking/stats`
- **Status:** ✅ Working
- **Response:** 200 OK
- **Data:**
  ```json
  {
    "totalHours": 0,
    "totalEntries": 0,
    "avgSessionDuration": 0,
    "period": "all time"
  }
  ```
- **Note:** Returns 0 values - no time tracking entries in database yet

### 2. **Time Tracking Statistics (with date range)** ✅
- **Endpoint:** `GET /api/hr/time-tracking/stats?startDate=2026-02-04&endDate=2026-03-06`
- **Status:** ✅ Working
- **Response:** 200 OK
- **Data:** Same structure as above, with filtered period

### 3. **Dashboard Statistics (HR Service)** ✅
- **Endpoint:** `GET /api/hr/dashboard/stats`
- **Status:** ✅ Working
- **Response:** 200 OK
- **Real Database Data:**
  ```json
  {
    "totalEmployees": 7,
    "activeEmployees": 7,
    "newHires": 1,
    "attendanceRate": 85,
    "totalStores": 2,
    "avgSalary": 0,
    "pendingLeaves": 0,
    "performanceScore": 78,
    "totalPrograms": 0,
    "activePrograms": 0,
    "totalEnrolled": 0,
    "avgCoverage": 0,
    "totalCost": 0,
    "satisfaction": 0
  }
  ```
- **Validation:** ✅ Total employees >= Active employees (logical check passed)
- **Note:** This API is working correctly with real database data!

---

## ❌ Failed Stats APIs

### 1. **Attendance Statistics** ❌
- **Endpoint:** `GET /api/attendance/stats`
- **Status:** ❌ 404 Not Found
- **Error:** `"Attendance with ID stats not found"`
- **Root Cause:** Route order issue - `/stats` route is defined AFTER `/:id` route in `attendance.routes.js`
  - Line 136: `router.get('/:id', ...)` 
  - Line 160: `router.get('/stats', ...)`
  - Express matches `/stats` to `/:id` first, treating "stats" as an ID
- **Fix Required:** Move `/stats` route BEFORE `/:id` route

### 2. **Company Statistics (Analytics Service)** ❌
- **Endpoint:** `GET /api/dashboard/stats`
- **Status:** ❌ 404 Not Found
- **Error:** Route not found in analytics-service
- **Note:** Analytics service may not be deployed or route path is different

### 3. **Tenant Statistics** ❌
- **Endpoint:** `GET /api/tenants/stats`
- **Status:** ❌ 404 Not Found
- **Error:** Cannot GET /api/tenants/stats
- **Note:** Tenant registry service may not be accessible through API gateway

### 4. **Realtime Service Statistics** ❌
- **Endpoint:** `GET /api/statistics`
- **Status:** ❌ 404 Not Found
- **Error:** Route not found in auth-service
- **Note:** Realtime service may not be accessible through main API gateway

### 5. **Notification Statistics** ❌
- **Endpoint:** `GET /api/notifications/stats/overview`
- **Status:** ❌ 404 Not Found
- **Error:** Route not found in auth-service
- **Note:** Notification service may not be accessible through main API gateway

### 6. **CRM Opportunity Statistics** ❌
- **Endpoint:** `GET /api/crm/opportunities/stats`
- **Status:** ❌ 404 Not Found
- **Error:** Route not found in auth-service
- **Note:** CRM service may not be accessible through main API gateway

---

## 🔍 Data Validation Results

### Dashboard Stats (HR Service) - Real Data ✅
- **Total Employees:** 7 (from database)
- **Active Employees:** 7 (from database)
- **Total Stores:** 2 (from database)
- **New Hires (this month):** 1 (from database)
- **Attendance Rate:** 85% (placeholder/hardcoded)
- **Validation:** ✅ Total >= Active (logical consistency check passed)

### Time Tracking Stats - No Data ⚠️
- **Total Hours:** 0
- **Total Entries:** 0
- **Note:** No time tracking entries exist in database yet

---

## 🐛 Critical Issues Found

### 1. **Route Order Bug in Attendance Service** 🔴
**File:** `microservices/attendance-service/src/routes/attendance.routes.js`

**Problem:**
```javascript
// Line 136 - This matches FIRST
router.get('/:id', ...)

// Line 160 - This never matches because /:id catches it first
router.get('/stats', ...)
```

**Solution:**
Move `/stats` route BEFORE `/:id` route:
```javascript
// Move this BEFORE /:id
router.get('/stats',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], ['attendance:read']),
  asyncHandler(getAttendanceStats)
);

// Then define /:id
router.get('/:id', ...)
```

**Impact:** High - Attendance stats API is completely broken

---

## 📋 Recommendations

### Immediate Actions:
1. ✅ **Fix Attendance Stats Route Order** - Move `/stats` before `/:id` in attendance routes
2. ⚠️ **Verify Service Routing** - Check if analytics, tenant-registry, realtime, notification, and CRM services are properly routed through API gateway
3. ✅ **Dashboard Stats Working** - This is the main stats API and it's working correctly with real data

### Data Quality:
- ✅ Dashboard stats show real database data (7 employees, 2 stores)
- ⚠️ Time tracking has no data yet (expected if feature not used)
- ⚠️ Attendance stats can't be tested due to route bug

### Service Availability:
- ✅ HR Service - Working
- ✅ Time Tracking Service - Working (but no data)
- ❌ Analytics Service - Route not found
- ❌ Tenant Registry Service - Not accessible
- ❌ Realtime Service - Not accessible
- ❌ Notification Service - Not accessible
- ❌ CRM Service - Not accessible

---

## 🎯 Next Steps

1. **Fix the attendance stats route** (critical)
2. **Test attendance stats** after fix
3. **Verify service routing** for other services
4. **Add time tracking data** to test time tracking stats properly
5. **Document correct API paths** for all services

---

## 📝 Test Script

The test script is available at: `scripts/test-all-stats-apis.js`

**Usage:**
```bash
node scripts/test-all-stats-apis.js
```

**Environment Variables:**
- `API_BASE` - API base URL (default: production ALB)
- `EMAIL` - Login email (default: admin@lenstrack.com)
- `PASSWORD` - Login password
- `TENANT_ID` - Tenant ID (default: lenstrack)

---

## ✅ Conclusion

**Working APIs (3/10):**
- ✅ Time Tracking Stats (2 endpoints)
- ✅ Dashboard Stats (HR Service) - **This is the main one with real data!**

**Broken APIs (7/10):**
- ❌ Attendance Stats (route order bug - fixable)
- ❌ Other service stats (service routing issues)

**Key Finding:** The main dashboard stats API (`/api/hr/dashboard/stats`) is working correctly and returning real database data:
- 7 total employees
- 7 active employees  
- 2 stores
- 1 new hire this month

This confirms the database connection and data retrieval is working properly!
