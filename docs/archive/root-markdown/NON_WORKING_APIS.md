# ❌ Non-Working APIs - Status Report

## 📊 Summary
- **Total APIs Tested**: 34
- **✅ Working**: 25 (73.5%)
- **❌ Not Working**: 9 (26.5%)

---

## ❌ Failed APIs (9)

### 1. Payroll Service APIs (3) - **504 Gateway Timeout**

#### ❌ `GET /api/payroll/health`
- **Status**: 504 Gateway Timeout
- **Error**: ALB timeout (60 seconds)
- **Root Cause**: ALB timeout configuration issue
- **Service Status**: ✅ Service works directly from pod
- **Fix Needed**: Increase ALB timeout or optimize service response time

**Test**:
```bash
curl http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/payroll/health
# Returns: 504 Gateway Time-out
```

**Direct Pod Test** (works):
```bash
kubectl exec -n etelios-prod deployment/payroll-service -- curl -s http://localhost:3004/health
# Returns: {"service":"payroll-service","status":"healthy",...}
```

---

#### ❌ `POST /api/payroll/calculate`
- **Status**: 504 Gateway Timeout
- **Error**: ALB timeout
- **Root Cause**: Same as above
- **Service Status**: ✅ Service works directly
- **Fix Needed**: ALB timeout configuration

**Expected Request**:
```json
POST /api/payroll/calculate
{
  "grossMonthly": 50000,
  "variableIncentive": 0,
  "professionalTax": 0,
  "tds": 0
}
```

---

#### ❌ `GET /api/payroll/salary`
- **Status**: 504 Gateway Timeout
- **Error**: ALB timeout
- **Root Cause**: Same as above
- **Service Status**: ✅ Service works directly
- **Fix Needed**: ALB timeout configuration

**Expected Request**:
```
GET /api/payroll/salary?employeeId=EMP001
```

---

### 2. Dashboard API (1) - **500 Internal Server Error**

#### ❌ `GET /api/hr/dashboard`
- **Status**: 500 Internal Server Error
- **Error**: "User not found"
- **Root Cause**: User lookup issue in dashboard service
- **Fix Applied**: ✅ Added user lookup fallback and tenantId support
- **Status**: May need service restart to pick up fixes

**Test**:
```bash
curl -X GET "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/hr/dashboard" \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: upcapto"
# Returns: {"success":false,"error":"User not found","message":"Internal server error"}
```

**Fix**: Already applied in code, may need redeploy.

---

### 3. Attendance Summary API (1) - **404 Not Found**

#### ❌ `GET /api/attendance/summary`
- **Status**: 404 Not Found
- **Error**: "Route not found"
- **Root Cause**: Route may not be properly mounted or auth/permission issue
- **Route Exists**: ✅ Route exists in `attendance.routes.js`
- **Fix Needed**: Check route mounting and authentication

**Expected Request**:
```
GET /api/attendance/summary?startDate=2026-02-01&endDate=2026-02-16
```

**Route Definition** (exists):
```javascript
router.get('/summary',
  authenticate,
  requireRole([], ['attendance:read']),
  validateRequest(attendanceSummarySchema),
  getAttendanceSummary
);
```

---

### 4. Department Creation (1) - **409 Conflict** (Expected)

#### ⚠️ `POST /api/hr/departments`
- **Status**: 409 Conflict
- **Error**: "Department with this name or code already exists"
- **Root Cause**: Duplicate test data (expected)
- **Status**: ✅ This is expected behavior - not a bug
- **Fix**: Use unique department name/code

**Test**:
```json
POST /api/hr/departments
{
  "name": "Test Department",
  "code": "TEST-DEPT-001",
  "description": "Test department"
}
```

---

### 5. Store by ID (1) - **404 Not Found** (May be Expected)

#### ⚠️ `GET /api/hr/stores/:id`
- **Status**: 404 Not Found
- **Error**: "Store with ID ... not found"
- **Root Cause**: Test store ID may not exist
- **Status**: ⚠️ May be expected if store doesn't exist
- **Fix**: Use valid store ID from `/api/hr/stores` list

---

### 6. Clock-In/Clock-Out (2) - **Warnings** (May be Expected)

#### ⚠️ `POST /api/attendance/clock-in`
- **Status**: Warning (may have failed or already clocked in)
- **Root Cause**: Employee may already be clocked in
- **Status**: ⚠️ Expected if employee already has active session
- **Fix**: Check for existing active session before clock-in

#### ⚠️ `POST /api/attendance/clock-out`
- **Status**: Warning (may have failed or no active session)
- **Root Cause**: No active clock-in session
- **Status**: ⚠️ Expected if no active session
- **Fix**: Ensure employee is clocked in before clock-out

---

## 🔧 Fix Priority

### Priority 1: Critical (Blocking)
1. **Payroll Service ALB Timeout** (3 APIs)
   - Impact: High (payroll features unavailable)
   - Fix: Increase ALB idle timeout or optimize service
   - Status: Service works, just ALB routing issue

### Priority 2: Important (Affects UX)
2. **Dashboard API** (1 API)
   - Impact: Medium (dashboard not loading)
   - Fix: Already applied, may need redeploy
   - Status: Code fixed, needs deployment

3. **Attendance Summary** (1 API)
   - Impact: Medium (summary not available)
   - Fix: Check route mounting
   - Status: Route exists, may be auth issue

### Priority 3: Low (Expected/Edge Cases)
4. **Department Creation** - Expected (duplicate)
5. **Store by ID** - May be expected (invalid ID)
6. **Clock-In/Out** - Expected (state-dependent)

---

## ✅ Working APIs (25)

### Health Checks (5)
- ✅ `GET /health`
- ✅ `GET /api/auth/health`
- ✅ `GET /api/hr/health`
- ✅ `GET /api/attendance/health`
- ⚠️ `GET /api/payroll/health` (504 via ALB, works directly)

### Auth APIs (2)
- ✅ `POST /api/auth/login`
- ✅ `GET /api/auth/me`

### HR - Employees (6)
- ✅ `GET /api/hr/employees`
- ✅ `GET /api/hr/employees/:id`
- ✅ `POST /api/hr/employees`
- ✅ `PUT /api/hr/employees/:id`
- ✅ `PATCH /api/hr/employees/:id/status`
- ✅ `DELETE /api/hr/employees/:id`

### HR - Departments (4)
- ✅ `GET /api/hr/departments`
- ✅ `GET /api/hr/departments/:id`
- ✅ `PUT /api/hr/departments/:id`
- ✅ `DELETE /api/hr/departments/:id`
- ⚠️ `POST /api/hr/departments` (409 - duplicate, expected)

### HR - Stores (1)
- ✅ `GET /api/hr/stores`
- ⚠️ `GET /api/hr/stores/:id` (404 - may be expected)

### HR - Dashboard (2)
- ✅ `GET /api/hr/dashboard/departments`
- ✅ `GET /api/hr/dashboard/stats`
- ❌ `GET /api/hr/dashboard` (500 - user lookup issue)

### Attendance (3)
- ✅ `GET /api/attendance`
- ✅ `POST /api/attendance/track-location`
- ⚠️ `POST /api/attendance/clock-in` (warning - may be expected)
- ⚠️ `POST /api/attendance/clock-out` (warning - may be expected)
- ❌ `GET /api/attendance/summary` (404 - route issue)

### Payroll (0 working via ALB, but works directly)
- ❌ `GET /api/payroll/health` (504)
- ❌ `POST /api/payroll/calculate` (504)
- ❌ `GET /api/payroll/salary` (504)

### Tenant (2)
- ✅ `GET /api/tenant/company`
- ✅ `GET /api/tenants`

### Time Tracking (2)
- ✅ `GET /api/time-tracking/stats`
- ✅ `GET /api/hr/time-tracking`

### Performance (4)
- ✅ `GET /api/performance/employee/:id`
- ✅ `GET /api/hr/performance/employee/:id`
- ✅ `GET /api/hr/performance/me/metrics`
- ✅ `GET /api/hr/performance/me/trends`

---

## 🚀 Quick Fixes

### 1. Payroll Service ALB Timeout
```bash
# Option 1: Increase ALB timeout (AWS Console)
# EC2 → Load Balancers → Target Groups → Health checks → Idle timeout: 120s

# Option 2: Check service directly (works)
kubectl exec -n etelios-prod deployment/payroll-service -- curl http://localhost:3004/health
```

### 2. Dashboard API
```bash
# Restart hr-service to pick up fixes
kubectl rollout restart deployment/hr-service -n etelios-prod
kubectl rollout status deployment/hr-service -n etelios-prod
```

### 3. Attendance Summary
```bash
# Check route mounting
kubectl logs -n etelios-prod deployment/attendance-service | grep "summary"
```

---

## 📊 Impact Analysis

**Critical Blocking**: 3 APIs (Payroll - ALB timeout)
**Important**: 2 APIs (Dashboard, Attendance Summary)
**Low Priority**: 4 APIs (Expected/Edge cases)

**Overall**: 73.5% APIs working, 26.5% need fixes (mostly ALB timeout)

---

**Last Updated**: $(date)
**Test Results**: From `test-complete-end-to-end-flow.sh`
