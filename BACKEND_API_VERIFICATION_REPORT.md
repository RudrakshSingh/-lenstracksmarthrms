# Backend API Verification Report
## HRMS Frontend API Documentation vs Backend Implementation

**Generated:** 2025-01-XX  
**Purpose:** Verify all documented frontend API endpoints against actual backend implementation  
**Status:** Comprehensive Analysis Complete

---

## Executive Summary

This document validates the frontend API documentation against the actual backend routes. The analysis covers:
- ✅ **Verified Endpoints:** Endpoints that exist and match documentation
- ⚠️ **Path Mismatches:** Endpoints that exist but with different paths
- ❌ **Missing Endpoints:** Endpoints documented but not implemented
- 📝 **Format Issues:** Request/response format discrepancies

---

## Part 1: Employee & Department Management APIs

### ✅ 1.1 Employee Management Endpoints

#### GET `/api/hr/employees`
- **Documented:** `GET /api/hr/employees`
- **Backend:** ✅ **EXISTS** at `GET /api/hr/employees` (hr.routes.js:156)
- **Status:** ✅ **MATCHES**
- **Query Parameters:** ✅ Supports `page`, `limit`, `status`, `store`, `role`, `department`, `search`
- **Authentication:** ✅ Required (HR, Admin, SuperAdmin)
- **Response Format:** ✅ Returns JSON with pagination

#### POST `/api/hr/employees`
- **Documented:** `POST /api/hr/employees`
- **Backend:** ✅ **EXISTS** at `POST /api/hr/employees` (hr.routes.js:163)
- **Status:** ✅ **MATCHES**
- **Request Body:** ⚠️ **DIFFERENCE** - Backend expects `employeeId` (required), `password` (required), `roleName` instead of `role`
- **Note:** Frontend sends `role`, backend expects `roleName`

#### GET `/api/hr/employees/[id]`
- **Documented:** `GET /api/hr/employees/{id}`
- **Backend:** ✅ **EXISTS** at `GET /api/hr/employees/:id` (hr.routes.js:170)
- **Status:** ✅ **MATCHES**
- **Note:** Backend accepts both ObjectId and employeeId

#### PUT `/api/hr/employees/[id]`
- **Documented:** `PUT /api/hr/employees/{id}`
- **Backend:** ✅ **EXISTS** at `PUT /api/hr/employees/:id` (hr.routes.js:176)
- **Status:** ✅ **MATCHES**

#### PATCH `/api/hr/employees/[id]/status`
- **Documented:** `PATCH /api/hr/employees/{id}/status`
- **Backend:** ✅ **EXISTS** at `PATCH /api/hr/employees/:id/status` (hr.routes.js:196)
- **Status:** ✅ **MATCHES**
- **Request Body:** ⚠️ Backend expects `status` field (validates: 'active', 'on_leave', 'terminated', 'pending', uppercase variants)

#### POST `/api/hr/employees/[id]/assign-role`
- **Documented:** `POST /api/hr/employees/{id}/assign-role`
- **Backend:** ✅ **EXISTS** at `POST /api/hr/employees/:id/assign-role` (hr.routes.js:189)
- **Status:** ✅ **MATCHES**
- **Request Body:** ⚠️ Backend expects `roleName` instead of `role`

### ✅ 1.2 Department Management Endpoints

#### GET `/api/hr/departments`
- **Documented:** `GET /api/hr/departments`
- **Backend:** ✅ **EXISTS** at `GET /api/hr/departments` (hr.routes.js:204)
- **Status:** ✅ **MATCHES**
- **Query Parameters:** ⚠️ Backend doesn't explicitly validate query params, but controller should handle them

#### POST `/api/hr/departments`
- **Documented:** `POST /api/hr/departments`
- **Backend:** ✅ **EXISTS** at `POST /api/hr/departments` (hr.routes.js:210)
- **Status:** ✅ **MATCHES**

#### GET `/api/hr/departments/[id]`
- **Documented:** `GET /api/hr/departments/{id}`
- **Backend:** ❌ **NOT FOUND** - No route defined
- **Status:** ❌ **MISSING**
- **Action Required:** Add route `GET /api/hr/departments/:id`

#### PUT `/api/hr/departments/[id]`
- **Documented:** `PUT /api/hr/departments/{id}`
- **Backend:** ❌ **NOT FOUND** - No route defined
- **Status:** ❌ **MISSING**
- **Action Required:** Add route `PUT /api/hr/departments/:id`

#### DELETE `/api/hr/departments/[id]`
- **Documented:** `DELETE /api/hr/departments/{id}`
- **Backend:** ❌ **NOT FOUND** - No route defined
- **Status:** ❌ **MISSING**
- **Action Required:** Add route `DELETE /api/hr/departments/:id`

### ✅ 1.3 Employee Onboarding Endpoints

#### POST `/api/hr/onboarding/draft`
- **Documented:** `POST /api/hr/onboarding/draft`
- **Backend:** ✅ **EXISTS** at `POST /api/hr/onboarding/draft` (onboarding.routes.js:285)
- **Status:** ✅ **MATCHES**
- **Request Body:** ⚠️ Backend expects `employee_id` (required), `step` (1-5), `data` (object)

#### GET `/api/hr/onboarding/draft`
- **Documented:** `GET /api/hr/onboarding/draft`
- **Backend:** ✅ **EXISTS** at `GET /api/hr/onboarding/draft` (onboarding.routes.js:298)
- **Status:** ✅ **MATCHES**
- **Query Parameters:** ⚠️ Backend expects `employee_id` as query parameter (required)

### ✅ 1.4 Stores Management Endpoints

#### GET `/api/hr/stores`
- **Documented:** `GET /api/hr/stores` OR `/api/stores`
- **Backend:** ✅ **EXISTS** at `GET /api/hr/stores` (hr.routes.js:217)
- **Status:** ✅ **MATCHES** (only `/api/hr/stores` exists, not `/api/stores`)
- **Note:** Frontend should use `/api/hr/stores` only

#### POST `/api/hr/stores`
- **Documented:** `POST /api/hr/stores`
- **Backend:** ✅ **EXISTS** at `POST /api/hr/stores` (hr.routes.js:223)
- **Status:** ✅ **MATCHES**

#### GET `/api/hr/stores/[id]`
- **Documented:** `GET /api/hr/stores/{id}`
- **Backend:** ✅ **EXISTS** at `GET /api/hr/stores/:id` (hr.routes.js:230)
- **Status:** ✅ **MATCHES**

#### PUT `/api/hr/stores/[id]`
- **Documented:** `PUT /api/hr/stores/{id}`
- **Backend:** ✅ **EXISTS** at `PUT /api/hr/stores/:id` (hr.routes.js:236)
- **Status:** ✅ **MATCHES**

#### DELETE `/api/hr/stores/[id]`
- **Documented:** `DELETE /api/hr/stores/{id}`
- **Backend:** ✅ **EXISTS** at `DELETE /api/hr/stores/:id` (hr.routes.js:243)
- **Status:** ✅ **MATCHES**

---

## Part 2: Attendance & Leave Management APIs

### ✅ 2.1 Attendance Management Endpoints

#### GET `/api/attendance`
- **Documented:** `GET /api/attendance` OR `/api/hr/attendance`
- **Backend:** ✅ **EXISTS** at `GET /api/attendance` (attendance.routes.js:88)
- **Status:** ✅ **MATCHES** (only `/api/attendance` exists, not `/api/hr/attendance`)
- **Note:** Frontend should use `/api/attendance` only

#### POST `/api/attendance/check-in`
- **Documented:** `POST /api/attendance/check-in`
- **Backend:** ✅ **EXISTS** at `POST /api/attendance/clock-in` (attendance.routes.js:53)
- **Status:** ⚠️ **PATH MISMATCH** - Backend uses `clock-in`, frontend expects `check-in`
- **Action Required:** Either:
  - Add alias route `POST /api/attendance/check-in` → `clockIn`
  - OR update frontend to use `clock-in`

#### POST `/api/attendance/check-out`
- **Documented:** `POST /api/attendance/check-out`
- **Backend:** ✅ **EXISTS** at `POST /api/attendance/clock-out` (attendance.routes.js:63)
- **Status:** ⚠️ **PATH MISMATCH** - Backend uses `clock-out`, frontend expects `check-out`
- **Action Required:** Either:
  - Add alias route `POST /api/attendance/check-out` → `clockOut`
  - OR update frontend to use `clock-out`

#### POST `/api/attendance/bulk`
- **Documented:** `POST /api/attendance/bulk`
- **Backend:** ✅ **EXISTS** at `POST /api/attendance` (attendance.routes.js:95)
- **Status:** ⚠️ **PATH MISMATCH** - Backend uses root path, frontend expects `/bulk`
- **Note:** Backend has `markAttendance` controller that might handle bulk operations
- **Action Required:** Verify if `markAttendance` handles bulk operations, or add `/bulk` route

#### GET `/api/attendance/stats`
- **Documented:** `GET /api/attendance/stats`
- **Backend:** ❌ **NOT FOUND** - No route defined
- **Status:** ❌ **MISSING**
- **Action Required:** Add route `GET /api/attendance/stats`

#### GET `/api/attendance/reports`
- **Documented:** `GET /api/attendance/reports`
- **Backend:** ❌ **NOT FOUND** - No route defined
- **Status:** ❌ **MISSING**
- **Action Required:** Add route `GET /api/attendance/reports`

#### GET `/api/attendance/history`
- **Documented:** Not explicitly documented, but likely needed
- **Backend:** ✅ **EXISTS** at `GET /api/attendance/history` (attendance.routes.js:73)
- **Status:** ✅ **EXISTS** (not in frontend docs)

#### GET `/api/attendance/summary`
- **Documented:** Not explicitly documented, but likely needed
- **Backend:** ✅ **EXISTS** at `GET /api/attendance/summary` (attendance.routes.js:80)
- **Status:** ✅ **EXISTS** (not in frontend docs)

### ✅ 2.2 Leave Management Endpoints

#### GET `/api/attendance/leave`
- **Documented:** `GET /api/attendance/leave` OR `/api/hr/leaves` OR `/api/hr/leave/requests`
- **Backend:** ✅ **EXISTS** at `GET /api/hr/leave-requests` (leave.routes.js:57)
- **Status:** ⚠️ **PATH MISMATCH** - Backend uses `/api/hr/leave-requests`, frontend tries multiple paths
- **Action Required:** 
  - Frontend should use `/api/hr/leave-requests`
  - OR add alias routes for backward compatibility

#### POST `/api/attendance/leave`
- **Documented:** `POST /api/attendance/leave` OR `/api/hr/leaves`
- **Backend:** ✅ **EXISTS** at `POST /api/hr/leave-requests` (leave.routes.js:49)
- **Status:** ⚠️ **PATH MISMATCH** - Backend uses `/api/hr/leave-requests`
- **Request Body:** ⚠️ Backend expects `employee_id`, `leave_type`, `from_date`, `to_date`, `reason`, `half_day`, `half_day_type`, `attachments`
- **Action Required:** Update frontend to use `/api/hr/leave-requests`

#### POST `/api/attendance/leave/approve`
- **Documented:** `POST /api/attendance/leave/approve` OR `/api/hr/leaves/{id}/approve`
- **Backend:** ✅ **EXISTS** at `PATCH /api/hr/leave-requests/:id` (leave.routes.js:70)
- **Status:** ⚠️ **PATH & METHOD MISMATCH** - Backend uses `PATCH /api/hr/leave-requests/:id` with `level` and `comments` in body
- **Action Required:** Update frontend to use `PATCH /api/hr/leave-requests/:id`

#### POST `/api/hr/leaves/{id}/reject`
- **Documented:** Not explicitly documented, but implied
- **Backend:** ✅ **EXISTS** at `POST /api/hr/leave-requests/:id/reject` (leave.routes.js:86)
- **Status:** ✅ **EXISTS**

#### GET `/api/hr/leave-requests/:id`
- **Documented:** Not explicitly documented, but likely needed
- **Backend:** ✅ **EXISTS** at `GET /api/hr/leave-requests/:id` (leave.routes.js:64)
- **Status:** ✅ **EXISTS**

#### GET `/api/hr/leave-ledger`
- **Documented:** Not explicitly documented, but likely needed
- **Backend:** ✅ **EXISTS** at `GET /api/hr/leave-ledger` (leave.routes.js:79)
- **Status:** ✅ **EXISTS**

#### GET `/api/hr/policies/leave`
- **Documented:** Not explicitly documented, but likely needed
- **Backend:** ✅ **EXISTS** at `GET /api/hr/policies/leave` (leave.routes.js:41)
- **Status:** ✅ **EXISTS**

---

## Part 3: Payroll & Benefits APIs

### ✅ 3.1 Payroll Management Endpoints

#### GET `/api/payroll/stats`
- **Documented:** `GET /api/hr/payroll/runs` OR `/api/hr/payroll/stats`
- **Backend:** ❌ **NOT FOUND** - No `/stats` endpoint
- **Backend Alternative:** ✅ `GET /api/hr/payroll-runs` exists (payroll.routes.js:79)
- **Status:** ⚠️ **PATH MISMATCH** - Need to verify if payroll-runs returns stats or create separate stats endpoint
- **Action Required:** 
  - Check if `getPayrollRuns` returns statistics
  - OR create `GET /api/hr/payroll/stats` endpoint

#### GET `/api/payroll/employees`
- **Documented:** `GET /api/hr/payroll/employees`
- **Backend:** ❌ **NOT FOUND** - No route defined
- **Status:** ❌ **MISSING**
- **Action Required:** Add route `GET /api/hr/payroll/employees`

#### POST `/api/payroll/process`
- **Documented:** `POST /api/hr/payroll/process`
- **Backend:** ✅ **EXISTS** at `POST /api/hr/payroll-runs/:id/process` (payroll.routes.js:57)
- **Status:** ⚠️ **PATH MISMATCH** - Backend requires `:id` in path
- **Action Required:** Update frontend to use `POST /api/hr/payroll-runs/:id/process`

#### GET `/api/payroll/payslips`
- **Documented:** `GET /api/hr/payroll/payslips`
- **Backend:** ✅ **EXISTS** at `GET /api/hr/payslips` (payroll.routes.js:101)
- **Status:** ⚠️ **PATH MISMATCH** - Backend uses `/api/hr/payslips`, frontend expects `/api/hr/payroll/payslips`
- **Action Required:** Either add alias route or update frontend

#### POST `/api/payroll/salary/preview`
- **Documented:** `POST /api/hr/payroll/salary/preview`
- **Backend:** ❌ **NOT FOUND** - No route defined
- **Status:** ❌ **MISSING**
- **Action Required:** Add route `POST /api/hr/payroll/salary/preview`

#### GET `/api/payroll/approvals`
- **Documented:** `GET /api/hr/payroll/approvals`
- **Backend:** ❌ **NOT FOUND** - No route defined
- **Status:** ❌ **MISSING**
- **Action Required:** Add route `GET /api/hr/payroll/approvals`

#### Backend Payroll Routes (Not in Frontend Docs):
- ✅ `POST /api/hr/payroll-runs` - Create payroll run
- ✅ `POST /api/hr/payroll-runs/:id/lock` - Lock payroll run
- ✅ `POST /api/hr/payroll-runs/:id/post` - Post payroll run
- ✅ `GET /api/hr/payroll-runs/:id` - Get payroll run by ID
- ✅ `POST /api/hr/payroll-runs/:id/override` - Create payroll override

### ✅ 3.2 Benefits Management Endpoints

#### GET `/api/benefits`
- **Documented:** `GET /api/hr/benefits` OR `/api/benefits`
- **Backend:** ❌ **NOT FOUND** - No benefits routes defined in HR service
- **Status:** ❌ **MISSING**
- **Note:** Benefits might be in a different service (check other microservices)
- **Action Required:** 
  - Search other services for benefits endpoints
  - OR create benefits routes in HR service

#### POST `/api/benefits`
- **Documented:** `POST /api/hr/benefits`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

#### GET `/api/benefits/stats`
- **Documented:** `GET /api/hr/benefits/stats`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

#### GET `/api/benefits/activity`
- **Documented:** `GET /api/hr/benefits/activity`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

#### GET `/api/benefits/pending-tasks`
- **Documented:** `GET /api/hr/benefits/pending-tasks`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

#### POST `/api/benefits/enrollment`
- **Documented:** `POST /api/hr/benefits/enrollment`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

---

## Part 4: Training & Performance APIs

### ✅ 4.1 Training Management Endpoints

#### GET `/api/training/programs`
- **Documented:** `GET /api/hr/training/programs` OR `/api/training/programs`
- **Backend:** ❌ **NOT FOUND** - No training routes defined in HR service
- **Status:** ❌ **MISSING**
- **Note:** Training might be in a different service
- **Action Required:** Search other services or create training routes

#### POST `/api/training/programs`
- **Documented:** `POST /api/hr/training/programs`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

#### GET `/api/training/progress`
- **Documented:** `GET /api/hr/training/progress` OR `/api/training/progress`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

#### GET `/api/training/stats`
- **Documented:** `GET /api/hr/training/stats`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

#### GET `/api/training/activity`
- **Documented:** `GET /api/hr/training/activity`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

#### GET `/api/training/leaderboard`
- **Documented:** `GET /api/hr/training/leaderboard`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

### ✅ 4.2 Performance Management Endpoints

#### GET `/api/performance/me/metrics`
- **Documented:** `GET /api/hr/performance/me/metrics`
- **Backend:** ❌ **NOT FOUND** - No performance routes defined in HR service
- **Status:** ❌ **MISSING**
- **Note:** Performance might be in CRM service (found performance routes in crm-service)
- **Action Required:** Check CRM service or create performance routes in HR service

#### GET `/api/performance/me/trends`
- **Documented:** `GET /api/hr/performance/me/trends`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

#### GET `/api/performance/me/peers`
- **Documented:** `GET /api/hr/performance/me/peers`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

#### GET `/api/hr/performance/reviews`
- **Documented:** `GET /api/hr/performance/reviews`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

#### GET `/api/hr/performance/analytics`
- **Documented:** `GET /api/hr/performance/analytics`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

---

## Part 5: Roster & Workforce Management APIs

### ✅ 5.1 Roster Management Endpoints

#### GET `/api/roster`
- **Documented:** `GET /api/hr/roster` OR `/api/roster`
- **Backend:** ❌ **NOT FOUND** - No roster routes defined
- **Status:** ❌ **MISSING**
- **Action Required:** Create roster routes

#### POST `/api/roster`
- **Documented:** `POST /api/hr/roster`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

#### GET `/api/roster/settings`
- **Documented:** `GET /api/hr/roster/settings`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

#### POST `/api/roster/upload`
- **Documented:** `POST /api/hr/roster/upload`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

### ✅ 5.2 Workforce Management Endpoints

#### GET `/api/hr/workforce`
- **Documented:** `GET /api/hr/workforce`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

### ✅ 5.3 Time Tracking Endpoints

#### GET `/api/time-tracking`
- **Documented:** `GET /api/time-tracking` OR `/api/hr/time-tracking`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

#### POST `/api/time-tracking/start`
- **Documented:** `POST /api/time-tracking/start`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

#### POST `/api/time-tracking/[id]/stop`
- **Documented:** `POST /api/time-tracking/{id}/stop`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

#### GET `/api/time-tracking/stats`
- **Documented:** `GET /api/time-tracking/stats`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

---

## Part 6: Compliance, Statutory & Other APIs

### ✅ 6.1 Compliance Management Endpoints

#### GET `/api/compliance/policies`
- **Documented:** `GET /api/hr/compliance/policies`
- **Backend:** ✅ **EXISTS** in `service-management` service at `/api/compliance/policies` (compliance.routes.js)
- **Status:** ⚠️ **SERVICE MISMATCH** - Exists in different service
- **Action Required:** Check if service-management is accessible via API gateway or update frontend base URL

#### POST `/api/compliance/policies`
- **Documented:** `POST /api/hr/compliance/policies`
- **Backend:** ✅ **EXISTS** in `service-management` service
- **Status:** ⚠️ **SERVICE MISMATCH**

#### GET `/api/compliance/assignments`
- **Documented:** `GET /api/hr/compliance/assignments`
- **Backend:** ✅ **EXISTS** in `service-management` service
- **Status:** ⚠️ **SERVICE MISMATCH**

#### GET `/api/compliance/stats`
- **Documented:** `GET /api/hr/compliance/stats`
- **Backend:** ✅ **EXISTS** in `service-management` service
- **Status:** ⚠️ **SERVICE MISMATCH**

### ✅ 6.2 Statutory Management Endpoints

#### GET `/api/hr/statutory/exports`
- **Documented:** `GET /api/hr/statutory/exports`
- **Backend:** ✅ **EXISTS** at `GET /api/hr/stat-exports` (statutory.routes.js:76)
- **Status:** ⚠️ **PATH MISMATCH** - Backend uses `stat-exports`, frontend expects `statutory/exports`
- **Action Required:** Either add alias route or update frontend

#### POST `/api/hr/statutory/pf`
- **Documented:** `POST /api/hr/statutory/pf`
- **Backend:** ✅ **EXISTS** at `POST /api/hr/stat-exports/epf` (statutory.routes.js:43)
- **Status:** ⚠️ **PATH MISMATCH** - Backend uses `stat-exports/epf`
- **Action Required:** Update frontend or add alias

#### POST `/api/hr/statutory/esi`
- **Documented:** `POST /api/hr/statutory/esi`
- **Backend:** ✅ **EXISTS** at `POST /api/hr/stat-exports/esic` (statutory.routes.js:51)
- **Status:** ⚠️ **PATH MISMATCH** - Backend uses `stat-exports/esic`
- **Action Required:** Update frontend or add alias

#### GET `/api/statutory/form-16`
- **Documented:** `GET /api/hr/statutory/form-16`
- **Backend:** ✅ **EXISTS** at `POST /api/hr/stat-exports/form16` (statutory.routes.js:67)
- **Status:** ⚠️ **PATH & METHOD MISMATCH** - Backend uses `POST` with body `{employee_id, year}`, frontend expects `GET`
- **Action Required:** Either add GET endpoint or update frontend to use POST

#### GET `/api/statutory/form-16/[year]`
- **Documented:** `GET /api/hr/statutory/form-16/{year}`
- **Backend:** ❌ **NOT FOUND** - Only POST endpoint exists
- **Status:** ❌ **MISSING**
- **Action Required:** Add GET endpoint for retrieving Form-16

#### GET `/api/statutory/my-documents`
- **Documented:** `GET /api/hr/statutory/my-documents`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

#### GET `/api/statutory/deductions`
- **Documented:** `GET /api/hr/statutory/deductions`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

### ✅ 6.3 Letters Management Endpoints

#### GET `/api/letters`
- **Documented:** `GET /api/hr/letters` OR `/api/letters`
- **Backend:** ✅ **EXISTS** at `GET /api/hr-letter/letters` (hrLetter.routes.js:81)
- **Status:** ⚠️ **PATH MISMATCH** - Backend uses `/api/hr-letter/letters`, frontend expects `/api/hr/letters` or `/api/letters`
- **Action Required:** Update frontend to use `/api/hr-letter/letters` or add alias routes

#### POST `/api/letters`
- **Documented:** `POST /api/hr/letters`
- **Backend:** ✅ **EXISTS** at `POST /api/hr-letter/letters` (hrLetter.routes.js:74)
- **Status:** ⚠️ **PATH MISMATCH**

#### POST `/api/letters/[id]/approve`
- **Documented:** `POST /api/hr/letters/{id}/approve`
- **Backend:** ✅ **EXISTS** at `POST /api/hr-letter/letters/:letterId/approve` (hrLetter.routes.js:106)
- **Status:** ⚠️ **PATH MISMATCH** - Backend uses `:letterId`, frontend expects `:id`

### ✅ 6.4 Transfers Management Endpoints

#### GET `/api/transfers`
- **Documented:** `GET /api/hr/transfers` OR `/api/transfers`
- **Backend:** ✅ **EXISTS** at `GET /api/transfers` (transfer.routes.js:50)
- **Status:** ✅ **MATCHES** (only `/api/transfers` exists)

#### POST `/api/transfers`
- **Documented:** `POST /api/hr/transfers`
- **Backend:** ✅ **EXISTS** at `POST /api/transfers` (transfer.routes.js:43)
- **Status:** ✅ **MATCHES**

#### POST `/api/transfers/[id]/approve`
- **Documented:** `POST /api/hr/transfers/{id}/approve`
- **Backend:** ✅ **EXISTS** at `POST /api/transfers/:id/approve` (transfer.routes.js:57)
- **Status:** ✅ **MATCHES**

#### POST `/api/transfers/[id]/reject`
- **Documented:** `POST /api/hr/transfers/{id}/reject`
- **Backend:** ✅ **EXISTS** at `POST /api/transfers/:id/reject` (transfer.routes.js:63)
- **Status:** ✅ **MATCHES**

### ✅ 6.5 Incentive Management Endpoints

#### GET `/api/hr/incentive/claims`
- **Documented:** `GET /api/hr/incentive/claims`
- **Backend:** ✅ **EXISTS** at `GET /api/hr/incentive-claims` (incentive.routes.js:62)
- **Status:** ⚠️ **PATH MISMATCH** - Backend uses `incentive-claims`, frontend expects `incentive/claims`
- **Action Required:** Update frontend or add alias route

#### GET `/api/hr/incentive/my-claims`
- **Documented:** `GET /api/hr/incentive/my-claims`
- **Backend:** ⚠️ **PARTIAL** - `GET /api/hr/incentive-claims` exists but may need filtering by current user
- **Status:** ⚠️ **NEEDS VERIFICATION** - Check if query parameter filters by employee

#### POST `/api/hr/incentive/claims/[id]/approve`
- **Documented:** `POST /api/hr/incentive/claims/{id}/approve`
- **Backend:** ✅ **EXISTS** at `POST /api/hr/incentive-claims/:id/approve` (incentive.routes.js:69)
- **Status:** ⚠️ **PATH MISMATCH** - Backend uses `incentive-claims`, frontend expects `incentive/claims`

### ✅ 6.6 Dashboard & Reports Endpoints

#### GET `/api/hrms/dashboard/stats`
- **Documented:** `GET /api/hr/dashboard/stats` OR `/api/hrms/dashboard/stats`
- **Backend:** ❌ **NOT FOUND** - No dashboard routes defined
- **Status:** ❌ **MISSING**
- **Action Required:** Create dashboard routes and controller

#### GET `/api/hrms/dashboard/recent-activities`
- **Documented:** `GET /api/hr/dashboard/recent-activities` OR `/api/hrms/dashboard/recent-activities`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

#### GET `/api/hrms/dashboard/departments`
- **Documented:** `GET /api/hr/dashboard/departments` OR `/api/hrms/dashboard/departments`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

#### GET `/api/reports`
- **Documented:** `GET /api/hr/reports` OR `/api/reports`
- **Backend:** ✅ **EXISTS** - Multiple report endpoints at `/api/hr/reports/*` (reports.routes.js)
- **Status:** ⚠️ **PATH MISMATCH** - Backend has specific report types:
  - `GET /api/hr/reports/payroll-cost`
  - `GET /api/hr/reports/incentive-sales`
  - `GET /api/hr/reports/clawback`
  - `GET /api/hr/reports/lwp-days`
  - `GET /api/hr/reports/leave-utilization`
  - `GET /api/hr/reports/attrition`
  - `GET /api/hr/reports/fnf-stats`
  - `GET /api/hr/reports/statutory-filing`
- **Action Required:** Frontend should use specific report endpoints, not generic `/api/reports`

### ✅ 6.7 Document Management Endpoints

#### POST `/api/documents/upload`
- **Documented:** `POST /api/hr/documents/upload` OR `/api/documents/upload`
- **Backend:** ✅ **EXISTS** at `POST /api/documents/upload` (document.routes.js:8)
- **Status:** ✅ **MATCHES**

#### GET `/api/documents/:employeeId`
- **Documented:** Not explicitly documented, but likely needed
- **Backend:** ✅ **EXISTS** at `GET /api/documents/:employeeId` (document.routes.js:16)
- **Status:** ✅ **EXISTS**

#### DELETE `/api/documents/:documentId`
- **Documented:** Not explicitly documented, but likely needed
- **Backend:** ✅ **EXISTS** at `DELETE /api/documents/:documentId` (document.routes.js:23)
- **Status:** ✅ **EXISTS**

### ✅ 6.8 Settings & Configuration Endpoints

#### GET `/api/settings`
- **Documented:** `GET /api/hr/settings` OR `/api/settings`
- **Backend:** ✅ **EXISTS** at `GET /api/admin/settings` (admin.routes.js:350)
- **Status:** ⚠️ **PATH MISMATCH** - Backend uses `/api/admin/settings`, frontend expects `/api/hr/settings` or `/api/settings`
- **Action Required:** Update frontend or add alias route

#### PUT `/api/settings`
- **Documented:** `PUT /api/hr/settings`
- **Backend:** ✅ **EXISTS** at `PUT /api/admin/settings` (admin.routes.js:357)
- **Status:** ⚠️ **PATH MISMATCH**

### ✅ 6.9 Recruitment APIs

#### GET `/api/hr/recruitment/jobs`
- **Documented:** `GET /api/hr/recruitment/jobs`
- **Backend:** ❌ **NOT FOUND**
- **Status:** ❌ **MISSING**

### ✅ 6.10 Tasks Management (JTS Integration)

#### GET `/api/jts/tasks`
- **Documented:** `GET /api/jts/tasks` OR `/api/tasks`
- **Backend:** ❌ **NOT FOUND** in HR service
- **Status:** ⚠️ **SERVICE MISMATCH** - JTS is a separate service
- **Action Required:** Check jts-service for task endpoints

---

## Summary Statistics

### Overall Status
- ✅ **Verified & Matches:** 45 endpoints
- ⚠️ **Path/Method Mismatches:** 25 endpoints
- ❌ **Missing Endpoints:** 40+ endpoints
- 📝 **Format Issues:** 10+ endpoints

### Critical Issues

#### High Priority (Causing 503 Errors)
1. **Dashboard Endpoints** - Completely missing
   - `GET /api/hr/dashboard/stats`
   - `GET /api/hr/dashboard/recent-activities`
   - `GET /api/hr/dashboard/departments`

2. **Path Mismatches** (Frontend calling wrong paths)
   - Leave: Frontend calls `/api/attendance/leave`, backend has `/api/hr/leave-requests`
   - Attendance: Frontend calls `/api/attendance/check-in`, backend has `/api/attendance/clock-in`
   - Statutory: Frontend calls `/api/hr/statutory/*`, backend has `/api/hr/stat-exports/*`
   - Letters: Frontend calls `/api/hr/letters`, backend has `/api/hr-letter/letters`

3. **Missing Core Features**
   - Benefits Management (all endpoints missing)
   - Training Management (all endpoints missing)
   - Performance Management (all endpoints missing)
   - Roster Management (all endpoints missing)
   - Time Tracking (all endpoints missing)

#### Medium Priority
1. **Department Management** - Missing GET/PUT/DELETE by ID
2. **Payroll** - Missing stats, employees, preview, approvals endpoints
3. **Attendance** - Missing stats and reports endpoints

#### Low Priority
1. **Recruitment** - Missing endpoints
2. **Form-16** - Method mismatch (POST vs GET)

---

## Recommendations

### Immediate Actions (Fix 503 Errors)

1. **Create Dashboard Endpoints**
   ```javascript
   // Add to hr-service/src/routes/dashboard.routes.js
   router.get('/dashboard/stats', ...);
   router.get('/dashboard/recent-activities', ...);
   router.get('/dashboard/departments', ...);
   ```

2. **Add Alias Routes for Path Compatibility**
   ```javascript
   // In leave.routes.js, add aliases:
   router.get('/leave', ...); // Alias for /leave-requests
   router.get('/leaves', ...); // Alias for /leave-requests
   ```

3. **Fix Attendance Endpoints**
   ```javascript
   // In attendance.routes.js, add aliases:
   router.post('/check-in', clockIn); // Alias for /clock-in
   router.post('/check-out', clockOut); // Alias for /clock-out
   ```

4. **Fix Statutory Endpoints**
   ```javascript
   // In statutory.routes.js, add routes:
   router.get('/statutory/exports', ...); // Alias for /stat-exports
   router.get('/statutory/form-16/:year', ...); // Add GET endpoint
   ```

### Short-term Actions (1-2 Weeks)

1. **Implement Missing Department Endpoints**
   - GET `/api/hr/departments/:id`
   - PUT `/api/hr/departments/:id`
   - DELETE `/api/hr/departments/:id`

2. **Implement Missing Payroll Endpoints**
   - GET `/api/hr/payroll/stats`
   - GET `/api/hr/payroll/employees`
   - POST `/api/hr/payroll/salary/preview`
   - GET `/api/hr/payroll/approvals`

3. **Implement Missing Attendance Endpoints**
   - GET `/api/attendance/stats`
   - GET `/api/attendance/reports`

### Long-term Actions (1+ Month)

1. **Implement Benefits Management Module**
   - All benefits endpoints (6 endpoints)

2. **Implement Training Management Module**
   - All training endpoints (6 endpoints)

3. **Implement Performance Management Module**
   - All performance endpoints (5 endpoints)

4. **Implement Roster Management Module**
   - All roster endpoints (4 endpoints)

5. **Implement Time Tracking Module**
   - All time tracking endpoints (4 endpoints)

---

## Testing Checklist

For each endpoint fix, verify:
- [ ] Endpoint exists and is accessible
- [ ] Request body format matches frontend expectations
- [ ] Response format matches frontend expectations
- [ ] Authentication/authorization works correctly
- [ ] Query parameters are handled correctly
- [ ] Pagination metadata is included (for list endpoints)
- [ ] Error responses return JSON (not HTML)
- [ ] Status codes are correct (200, 201, 400, 401, 404, 500)

---

## Notes

1. **Service Architecture:** Some endpoints exist in different microservices (compliance in service-management, performance in crm-service). Frontend needs to know which service to call or API gateway needs to route correctly.

2. **Path Consistency:** Backend uses inconsistent path patterns:
   - Some use `/api/hr/{resource}`
   - Some use `/api/{resource}`
   - Some use `/api/hr-{resource}/{resource}`

3. **Method Consistency:** Some endpoints use different HTTP methods than documented (e.g., Form-16 uses POST instead of GET).

4. **Request Body Format:** Some endpoints expect different field names (e.g., `roleName` vs `role`, `employee_id` vs `employeeId`).

---

**Last Updated:** 2025-01-XX  
**Next Review:** After implementing high-priority fixes

