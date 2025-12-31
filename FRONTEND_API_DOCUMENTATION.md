# HRMS Microservice - Complete API Documentation
## Overview
This document provides comprehensive documentation for all API endpoints used by the
HRMS frontend microservice. All endpoints are proxied through Next.js API routes to the
backend, ensuring CORS compliance and centralized error handling.
**Base URL Configuration:**
- All URLs are fetched from environment variables (`NEXT_PUBLIC_API_BASE_URL`)
- No hardcoded URLs in the codebase
- Backend URL format: `{NEXT_PUBLIC_API_BASE_URL}/api/hr/{endpoint}`
**Common Response Format:**
```typescript
{
success: boolean
data?: any
message?: string
error?: string
pagination?: {
page: number
limit: number
totalRecords: number
totalPages: number
hasNext: boolean
hasPrev: boolean
}
}
```
**Common Error Responses:**
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Backend unavailable
---
# Part 1: Employee & Department Management APIs
## 1.1 Employee Management
### GET `/api/hr/employees`
**Description:** Fetch list of employees with filtering and pagination
**Query Parameters:**
- `page` (number, default: 1): Page number
- `limit` (number, default: 10): Records per page
- `search` (string, optional): Search term for name/email/employeeId
- `status` (string, optional): Filter by status (ACTIVE, INACTIVE, ON_LEAVE,
TERMINATED)
- `department` (string, optional): Filter by department name
- `store` (string, optional): Filter by store name
- `role` (string, optional): Filter by role
- `manager` (string, optional): Filter by reporting manager
**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```
**Response (200 OK):**
```json
{
"success": true,
"data": [
{
"id": "string",
"employeeId": "string",
"fullName": "string",
"firstName": "string",
"lastName": "string",
"email": "string",
"phone": "string",
"designation": "string",
"jobTitle": "string",
"department": "string",
"roleFamily": "string",
"status": "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "TERMINATED",
"workLocation": {
"storeId": "string",
"storeName": "string",
"city": "string",
"state": "string"
},
"reportingManager": "string",
"doj": "string (ISO date)",
"createdAt": "string (ISO datetime)",
"updatedAt": "string (ISO datetime)"
}
],
"pagination": {
"page": 1,
"limit": 10,
"totalRecords": 100,
"totalPages": 10,
"hasNext": true,
"hasPrev": false
}
}
```
**Frontend Usage:**
```typescript
const result = await safeFetch('/api/hr/employees?page=1&limit=10&status=ACTIVE')
if (result.success && result.data) {
const employees = Array.isArray(result.data) ? result.data : []
const pagination = result.pagination
}
```
---
### POST `/api/hr/employees`
**Description:** Create a new employee record
**Request Body:**
```json
{
"employeeId": "string (optional, auto-generated if not provided)",
"firstName": "string (required)",
"lastName": "string (required)",
"email": "string (required, unique)",
"phone": "string (required)",
"jobTitle": "string (required)",
"department": "string (required)",
"status": "ACTIVE" | "INACTIVE",
"workLocation": {
"storeId": "string",
"storeName": "string"
},
"reportingManager": "string",
"doj": "string (ISO date, required)",
"salary": {
"basic": "number",
"hra": "number",
"allowances": "number"
}
}
```
**Response (201 Created):**
```json
{
"success": true,
"data": {
"id": "string",
"employeeId": "EMP-2025-123456",
"fullName": "string",
"email": "string",
"createdAt": "string (ISO datetime)"
},
"message": "Employee created successfully"
}
```
**Frontend Usage:**
```typescript
const result = await safeFetch('/api/hr/employees', {
method: 'POST',
body: JSON.stringify(employeeData)
})
```
---
### GET `/api/hr/employees/[id]`
**Description:** Get employee details by ID
**Path Parameters:**
- `id` (string): Employee ID or employeeId
**Response (200 OK):**
```json
{
"success": true,
"data": {
"id": "string",
"employeeId": "string",
"fullName": "string",
"email": "string",
"phone": "string",
"designation": "string",
"department": "string",
"status": "string",
"workLocation": {},
"reportingManager": "string",
"doj": "string",
"statutoryInfo": {
"uan": "string",
"esiNo": "string",
"panNumber": "string"
},
"bankDetails": {
"accountNumber": "string",
"ifsc": "string",
"bankName": "string"
}
}
}
```
---
### PUT `/api/hr/employees/[id]`
**Description:** Update employee details
**Request Body:** (Same as POST, all fields optional for partial update)
**Response (200 OK):**
```json
{
"success": true,
"data": { /* updated employee object */ },
"message": "Employee updated successfully"
}
```
---
### PATCH `/api/hr/employees/[id]/status`
**Description:** Update employee status
**Request Body:**
```json
{
"status": "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "TERMINATED",
"reason": "string (optional)"
}
```
**Response (200 OK):**
```json
{
"success": true,
"data": { /* updated employee object */ },
"message": "Employee status updated successfully"
}
```
---
### POST `/api/hr/employees/[id]/assign-role`
**Description:** Assign role to employee
**Request Body:**
```json
{
"role": "string (required)",
"roleFamily": "string (optional)",
"effectiveDate": "string (ISO date, optional)"
}
```
**Response (200 OK):**
```json
{
"success": true,
"data": { /* employee object with updated role */ },
"message": "Role assigned successfully"
}
```
---
## 1.2 Department Management
### GET `/api/hr/departments`
**Description:** Get list of departments
**Query Parameters:**
- `page` (number, optional)
- `limit` (number, optional)
- `search` (string, optional)
**Response (200 OK):**
```json
{
"success": true,
"data": [
{
"id": "string",
"code": "string",
"name": "string",
"manager": "string",
"managerName": "string",
"location": "string",
"phone": "string",
"email": "string",
"description": "string",
"employees": "number",
"employeeCount": "number",
"budget": "string | number",
"status": "Active" | "Inactive",
"established": "string (year)"
}
],
"message": "Departments retrieved successfully"
}
```
**Frontend Usage:**
```typescript
const result = await safeFetch('/api/hr/departments?limit=200&page=1')
if (result.success && result.data) {
const departments = Array.isArray(result.data) ? result.data : []
}
```
---
### POST `/api/hr/departments`
**Description:** Create new department
**Request Body:**
```json
{
"code": "string (required, unique)",
"name": "string (required)",
"manager": "string (employeeId, optional)",
"location": "string (optional)",
"phone": "string (optional)",
"email": "string (optional)",
"description": "string (optional)",
"budget": "string | number (optional)",
"status": "Active" | "Inactive (default: Active)"
}
```
**Response (201 Created):**
```json
{
"success": true,
"data": { /* created department object */ },
"message": "Department created successfully"
}
```
---
### GET `/api/hr/departments/[id]`
**Description:** Get department details by ID
**Response (200 OK):**
```json
{
"success": true,
"data": { /* department object */ }
}
```
---
### PUT `/api/hr/departments/[id]`
**Description:** Update department
**Request Body:** (Same as POST, all fields optional)
**Response (200 OK):**
```json
{
"success": true,
"data": { /* updated department object */ },
"message": "Department updated successfully"
}
```
---
### DELETE `/api/hr/departments/[id]`
**Description:** Delete department
**Response (200 OK):**
```json
{
"success": true,
"message": "Department deleted successfully"
}
```
---
## 1.3 Employee Onboarding
### POST `/api/hr/onboarding/draft`
**Description:** Save onboarding draft data
**Request Body:**
```json
{
"step": "number (1-5)",
"data": {
/* Step-specific data */
}
}
```
**Response (200 OK):**
```json
{
"success": true,
"data": {
"draftId": "string",
"savedAt": "string (ISO datetime)"
},
"message": "Draft saved successfully"
}
```
---
### GET `/api/hr/onboarding/draft`
**Description:** Retrieve saved onboarding draft
**Response (200 OK):**
```json
{
"success": true,
"data": {
"step": "number",
"data": { /* saved draft data */ },
"savedAt": "string"
}
}
```
---
## 1.4 Stores Management
### GET `/api/hr/stores`
**Description:** Get list of stores/branches
**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 200)
- `search` (string, optional)
**Response (200 OK):**
```json
{
"success": true,
"data": [
{
"id": "string",
"storeId": "string",
"code": "string",
"name": "string",
"storeName": "string",
"city": "string",
"state": "string",
"address": "string",
"phone": "string",
"email": "string",
"status": "Active" | "Inactive"
}
],
"pagination": { /* pagination object */ }
}
```
**Frontend Usage:**
```typescript
// Optimized: Use limit=200 for dropdowns
const result = await safeFetch('/api/hr/stores?limit=200&page=1')
```
---
# Part 2: Attendance & Leave Management APIs
## 2.1 Attendance Management
### GET `/api/attendance`
**Description:** Get attendance records
**Query Parameters:**
- `date` (string, ISO date): Specific date
- `employeeId` (string, optional): Filter by employee
- `storeId` (string, optional): Filter by store
- `page` (number, default: 1)
- `limit` (number, default: 10)
**Response (200 OK):**
```json
{
"success": true,
"data": [
{
"id": "string",
"employeeId": "string",
"employeeName": "string",
"date": "string (ISO date)",
"checkIn": "string (ISO datetime)",
"checkOut": "string (ISO datetime, optional)",
"status": "Present" | "Absent" | "Late" | "Half Day",
"totalHours": "number",
"overtimeHours": "number",
"location": {
"lat": "number",
"lng": "number",
"address": "string"
}
}
],
"pagination": { /* pagination object */ }
}
```
---
### POST `/api/attendance/clock-in`
**Description:** Mark employee check-in
**Request Body:**
```json
{
"employeeId": "string (required)",
"location": {
"lat": "number (required)",
"lng": "number (required)",
"address": "string (optional)"
},
"photo": "string (base64, optional)",
"notes": "string (optional)"
}
```
**Response (200 OK):**
```json
{
"success": true,
"data": {
"id": "string",
"checkIn": "string (ISO datetime)",
"status": "Present"
},
"message": "Check-in recorded successfully"
}
```
---
### POST `/api/attendance/clock-out`
**Description:** Mark employee check-out
**Request Body:**
```json
{
"employeeId": "string (required)",
"attendanceId": "string (required)",
"location": {
"lat": "number",
"lng": "number"
},
"notes": "string (optional)"
}
```
**Response (200 OK):**
```json
{
"success": true,
"data": {
"checkOut": "string (ISO datetime)",
"totalHours": "number",
"overtimeHours": "number"
},
"message": "Check-out recorded successfully"
}
```
---
### GET `/api/attendance/history`
**Description:** Get attendance history for employee
**Query Parameters:**
- `startDate` (string, ISO date, optional)
- `endDate` (string, ISO date, optional)
- `page` (number, default: 1)
- `limit` (number, default: 10)
**Response (200 OK):**
```json
{
"success": true,
"data": [ /* attendance records */ ],
"pagination": { /* pagination object */ }
}
```
---
### GET `/api/attendance/summary`
**Description:** Get attendance summary
**Query Parameters:**
- `startDate` (string, ISO date, **required**)
- `endDate` (string, ISO date, **required**)
**Response (200 OK):**
```json
{
"success": true,
"data": {
"totalDays": "number",
"presentDays": "number",
"absentDays": "number",
"leaveDays": "number",
"attendancePercentage": "number"
}
}
```
**Note:** Both `startDate` and `endDate` are **required** query parameters.
---
### GET `/api/attendance/reports`
**Description:** Get attendance reports
**Query Parameters:**
- `dateFrom` (string, ISO date, required)
- `dateTo` (string, ISO date, required)
- `employeeId` (string, optional)
- `storeId` (string, optional)
- `format` (string, optional): "json" | "csv" | "excel"
**Response (200 OK):**
```json
{
"success": true,
"data": [
{
"employeeId": "string",
"employeeName": "string",
"totalDays": "number",
"presentDays": "number",
"absentDays": "number",
"leaveDays": "number",
"attendancePercentage": "number"
}
]
}
```
---
## 2.2 Leave Management
### GET `/api/hr/leave/leave-requests`
**Description:** Get leave requests
**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `status` (string, optional): "Pending" | "Approved" | "Rejected" | "Cancelled"
- `leaveType` (string, optional): "CL" | "SL" | "EL" | "WO" | "PH" | "LWP" | etc.
- `employeeId` (string, optional)
- `dateFrom` (string, ISO date, optional)
- `dateTo` (string, ISO date, optional)
**Response (200 OK):**
```json
{
"success": true,
"data": [
{
"id": "string",
"leaveId": "string",
"employeeId": "string",
"employeeName": "string",
"department": "string",
"store": "string",
"manager": "string",
"leaveType": "string",
"fromDate": "string (ISO date)",
"toDate": "string (ISO date)",
"totalDays": "number",
"reason": "string",
"supportingDocuments": ["string"],
"status": "Pending" | "Approved" | "Rejected" | "Cancelled",
"submittedAt": "string (ISO datetime)",
"hrComments": "string",
"approvedBy": "string",
"approvedAt": "string (ISO datetime)"
}
],
"pagination": { /* pagination object */ }
}
```
**Frontend Usage:**
```typescript
// Note: Actual endpoint is /api/hr/leave/leave-requests (not /api/attendance/leave)
const result = await safeFetch('/api/hr/leave/leave-requests?status=Pending&limit=100&page=1')
```
---
### POST `/api/hr/leave/leave-requests`
**Description:** Create leave request
**Request Body:**
```json
{
"employee_id": "string (required)",
"leave_type": "string (required)",
"from_date": "string (ISO date, required)",
"to_date": "string (ISO date, required)",
"reason": "string (required)",
"half_day": "boolean (optional, default: false)",
"half_day_type": "FIRST_HALF" | "SECOND_HALF (optional)",
"attachments": [
{
"file_name": "string",
"file_url": "string",
"file_type": "MEDICAL_CERTIFICATE" | "DOCUMENT" | "OTHER"
}
]
}
```
**Response (201 Created):**
```json
{
"success": true,
"data": {
"id": "string",
"leaveId": "LR-001",
"status": "Pending",
"submittedAt": "string (ISO datetime)"
},
"message": "Leave request submitted successfully"
}
```
---
### GET `/api/hr/leave/leave-ledger`
**Description:** Get leave ledger/balance
**Response (200 OK):**
```json
{
"success": true,
"data": {
"employeeId": "string",
"leaveBalances": {
"CL": "number",
"SL": "number",
"EL": "number",
"WO": "number"
},
"totalLeaves": "number",
"usedLeaves": "number",
"remainingLeaves": "number"
}
}
```
**Note:** This endpoint replaces `/api/hr/leave/balance` mentioned in some docs.
---
### POST `/api/hr/leave/leave-requests/[id]/reject`
**Description:** Reject leave request
**Request Body:**
```json
{
"level": "number (1-3, required)",
"comments": "string (optional)"
}
```
**Response (200 OK):**
```json
{
"success": true,
"data": { /* updated leave request */ },
"message": "Leave request rejected"
}
```
---
### POST `/api/hr/leave/leave-requests/[id]/cancel`
**Description:** Cancel leave request
**Response (200 OK):**
```json
{
"success": true,
"data": { /* updated leave request */ },
"message": "Leave request cancelled"
}
```
---
# Part 3: Payroll & Benefits APIs
## 3.1 Payroll Management
### GET `/api/hr/payroll/payroll-runs`
**Description:** Get payroll runs
**Query Parameters:**
- `month` (string, YYYY-MM, optional)
- `year` (string, YYYY, optional)
- `status` (string, optional)
**Response (200 OK):**
```json
{
"success": true,
"data": [
{
"id": "string",
"runId": "string",
"month": "number",
"year": "number",
"status": "Draft" | "Processing" | "Completed" | "Locked",
"processedEmployees": "number",
"totalGross": "number",
"totalNet": "number",
"createdAt": "string (ISO datetime)"
}
]
}
```
**Note:** Actual endpoint is `/api/hr/payroll/payroll-runs` (not `/api/hr/payroll/runs`)
---
### POST `/api/hr/payroll/payroll-runs`
**Description:** Create payroll run
**Request Body:**
```json
{
"month": "number (1-12, required)",
"year": "number (2020-2100, required)"
}
```
**Response (201 Created):**
```json
{
"success": true,
"data": {
"payrollRunId": "string",
"processedEmployees": "number",
"totalGross": "number",
"totalNet": "number",
"status": "Processing" | "Completed" | "Failed"
},
"message": "Payroll processing initiated"
}
```
---
### GET `/api/hr/payroll/payslips`
**Description:** Get payslips
**Query Parameters:**
- `month` (string, YYYY-MM, optional)
- `year` (string, YYYY, optional)
- `employeeId` (string, optional)
- `page` (number, default: 1)
- `limit` (number, default: 10)
**Response (200 OK):**
```json
{
"success": true,
"data": [
{
"id": "string",
"employeeId": "string",
"employeeName": "string",
"month": "string (YYYY-MM)",
"year": "string (YYYY)",
"grossSalary": "number",
"deductions": "number",
"netSalary": "number",
"status": "Generated" | "Sent" | "Downloaded",
"fileUrl": "string (optional)"
}
],
"pagination": { /* pagination object */ }
}
```
---
# Part 4: Reports APIs
## 4.1 HR Reports
### GET `/api/hr/reports/payroll-cost`
**Description:** Get payroll cost by store and role
**Response (200 OK):**
```json
{
"success": true,
"data": { /* payroll cost data */ }
}
```
---
### GET `/api/hr/reports/attrition`
**Description:** Get attrition report
**Response (200 OK):**
```json
{
"success": true,
"data": { /* attrition data */ }
}
```
---
### GET `/api/hr/reports/leave-utilization`
**Description:** Get leave utilization report
**Response (200 OK):**
```json
{
"success": true,
"data": { /* leave utilization data */ }
}
```
---
**Note:** The following report endpoints **DO NOT EXIST** in the backend:
- ❌ `/api/hr/reports/employees` - Does not exist
- ❌ `/api/hr/reports/attendance` - Does not exist
- ❌ `/api/hr/reports/leave` - Does not exist

**Available report endpoints:**
- ✅ `/api/hr/reports/payroll-cost`
- ✅ `/api/hr/reports/incentive-sales`
- ✅ `/api/hr/reports/clawback`
- ✅ `/api/hr/reports/lwp-days`
- ✅ `/api/hr/reports/leave-utilization`
- ✅ `/api/hr/reports/attrition`
- ✅ `/api/hr/reports/fnf-stats`
- ✅ `/api/hr/reports/statutory-filing`
---
# Part 5: Transfers & Letters APIs
## 5.1 Transfers Management
### GET `/api/transfers`
**Description:** Get transfer requests
**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `status` (string, optional): "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED"
- `employeeId` (string, optional)
**Response (200 OK):**
```json
{
"success": true,
"data": [
{
"id": "string",
"employeeId": "string",
"employeeName": "string",
"fromStoreId": "string",
"fromStore": "string",
"toStoreId": "string",
"toStore": "string",
"effectiveDate": "string (ISO date)",
"requestDate": "string (ISO date)",
"status": "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED",
"reason": "string",
"approvedBy": "string (optional)",
"approvedAt": "string (ISO datetime, optional)"
}
],
"pagination": { /* pagination object */ }
}
```
---
### POST `/api/transfers`
**Description:** Create transfer request
**Request Body:**
```json
{
"employeeId": "string (required)",
"requestedStoreId": "string (required)",
"effectiveDate": "string (ISO date, required)",
"reason": "string (required)"
}
```
**Response (201 Created):**
```json
{
"success": true,
"data": { /* created transfer object */ },
"message": "Transfer request created successfully"
}
```
---
### POST `/api/transfers/[id]/approve`
**Description:** Approve transfer
**Response (200 OK):**
```json
{
"success": true,
"data": { /* updated transfer object */ },
"message": "Transfer approved successfully"
}
```
---
### POST `/api/transfers/[id]/reject`
**Description:** Reject transfer
**Request Body:**
```json
{
"rejectionReason": "string (optional)"
}
```
**Response (200 OK):**
```json
{
"success": true,
"data": { /* updated transfer object */ },
"message": "Transfer rejected"
}
```
---
## 5.2 HR Letters Management
### GET `/api/hr-letter/letters`
**Description:** Get HR letters
**Query Parameters:**
- `type` (string, optional): "APPOINTMENT" | "TRANSFER" | "PROMOTION" | "TERMINATION" | "EXPERIENCE" | "SALARY" | "LEAVE" | "WARNING"
- `employeeId` (string, optional)
- `status` (string, optional)
- `page` (number, default: 1)
- `limit` (number, default: 10)
**Response (200 OK):**
```json
{
"success": true,
"data": [
{
"id": "string",
"letterId": "string",
"type": "string",
"employeeId": "string",
"employeeName": "string",
"date": "string (ISO date)",
"status": "Draft" | "Submitted" | "Approved" | "Rejected" | "Sent",
"createdAt": "string (ISO datetime)",
"updatedAt": "string (ISO datetime)"
}
],
"pagination": { /* pagination object */ }
}
```
**Note:** Endpoint is `/api/hr-letter/letters` (not `/api/letters`)
---
### POST `/api/hr-letter/letters`
**Description:** Create HR letter
**Request Body:**
```json
{
"type": "string (required)",
"employeeId": "string (required)",
"date": "string (ISO date, required)",
"additionalInfo": "string (optional)"
}
```
**Response (201 Created):**
```json
{
"success": true,
"data": { /* created letter object */ },
"message": "Letter created successfully"
}
```
---
### GET `/api/hr-letter/stats`
**Description:** Get HR letter statistics
**Response (200 OK):**
```json
{
"success": true,
"data": {
"totalLetters": "number",
"pendingApproval": "number",
"approved": "number",
"rejected": "number"
}
}
```
---
# Part 6: Statutory & Compliance APIs
## 6.1 Statutory Management
### GET `/api/hr/statutory/returns`
**Description:** Get statutory return records
**Query Parameters:**
- `type` (string, optional): "epf" | "esic" | "form24q" | "form16" | "lwf"
- `status` (string, optional): "pending" | "generated" | "validated" | "filed" | "error"
- `period` (string, optional): "YYYY-MM"
**Response (200 OK):**
```json
{
"success": true,
"data": [
{
"id": "string",
"exportType": "epf" | "esic" | "form24q" | "form16" | "lwf",
"period": "string (YYYY-MM)",
"status": "pending" | "generated" | "validated" | "filed" | "error",
"fileName": "string (optional)",
"filePath": "string (optional)",
"recordCount": "number",
"createdAt": "string (ISO datetime)"
}
]
}
```
---
### POST `/api/hr/statutory/pf-return`
**Description:** Generate EPF ECR file
**Request Body:**
```json
{
"period": "string (YYYY-MM, required)",
"employeeIds": ["string (optional)"]
}
```
**Response (200 OK):**
```json
{
"success": true,
"data": {
"exportId": "string",
"fileName": "string",
"fileUrl": "string",
"recordCount": "number",
"status": "generated"
},
"message": "EPF ECR file generated successfully"
}
```
---
## 6.2 Incentive Management
### GET `/api/hr/incentive/claims`
**Description:** Get incentive claims
**Query Parameters:**
- `status` (string, optional): "Pending" | "Approved" | "Rejected"
- `employeeId` (string, optional)
- `page` (number, default: 1)
- `limit` (number, default: 10)
**Response (200 OK):**
```json
{
"success": true,
"data": [
{
"id": "string",
"employeeId": "string",
"employeeName": "string",
"claimType": "string",
"amount": "number",
"status": "Pending" | "Approved" | "Rejected",
"submittedAt": "string (ISO datetime)",
"approvedAt": "string (ISO datetime, optional)"
}
],
"pagination": { /* pagination object */ }
}
```
---
### POST `/api/hr/incentive/[claimId]/approve`
**Description:** Approve incentive claim
**Response (200 OK):**
```json
{
"success": true,
"data": { /* updated claim object */ },
"message": "Incentive claim approved"
}
```
---
### POST `/api/hr/incentive/[claimId]/reject`
**Description:** Reject incentive claim
**Request Body:**
```json
{
"reason": "string (optional)"
}
```
**Response (200 OK):**
```json
{
"success": true,
"data": { /* updated claim object */ },
"message": "Incentive claim rejected"
}
```
---
# Part 7: Document Management APIs
## 7.1 Document Upload
### POST `/api/documents/upload`
**Description:** Upload document
**Request Body:** (multipart/form-data)
- `file` (File, required)
- `category` (string, required): Document category
- `employeeId` (string, required)
- `documentType` (string, required)
- `complianceRequired` (boolean, optional, default: false)
- `description` (string, optional)
**Response (200 OK):**
```json
{
"success": true,
"data": {
"documentId": "string",
"fileName": "string",
"fileUrl": "string",
"fileSize": "number",
"uploadedAt": "string (ISO datetime)"
},
"message": "Document uploaded successfully"
}
```
**Frontend Usage:**
```typescript
const formData = new FormData()
formData.append('file', file)
formData.append('category', category)
formData.append('employeeId', employeeId)
formData.append('documentType', documentType)
formData.append('complianceRequired', complianceRequired.toString())
const result = await safeFetch('/api/documents/upload', {
method: 'POST',
body: formData
})
```
---
### GET `/api/documents/[employeeId]`
**Description:** Get employee documents
**Path Parameters:**
- `employeeId` (string): Employee ID
**Response (200 OK):**
```json
{
"success": true,
"data": [
{
"id": "string",
"fileName": "string",
"fileUrl": "string",
"documentType": "string",
"uploadedAt": "string (ISO datetime)"
}
]
}
```
---
### DELETE `/api/documents/[documentId]`
**Description:** Delete document
**Response (200 OK):**
```json
{
"success": true,
"message": "Document deleted successfully"
}
```
---
# Part 8: Health & Status APIs
## 8.1 Health Checks (Public - No Auth Required)
### GET `/api/auth/health`
**Description:** Auth service health check
**Response (200 OK):**
```json
{
"service": "auth-service",
"status": "healthy",
"timestamp": "string (ISO datetime)",
"businessLogic": "active"
}
```
---
### GET `/api/auth/status`
**Description:** Auth service status
**Response (200 OK):**
```json
{
"service": "auth-service",
"status": "operational",
"timestamp": "string (ISO datetime)",
"businessLogic": "active",
"endpoints": {
"login": "POST /api/auth/login",
"register": "POST /api/auth/register",
"logout": "POST /api/auth/logout",
"refresh": "POST /api/auth/refresh-token",
"profile": "GET /api/auth/profile"
}
}
```
---
### GET `/api/hr/health`
**Description:** HR service health check (Public - No auth required)
**Response (200 OK):**
```json
{
"service": "hr-service",
"status": "healthy",
"timestamp": "string (ISO datetime)",
"businessLogic": "active"
}
```
**Note:** This endpoint is now **public** (no authentication required) after recent fix.
---
### GET `/api/hr/status`
**Description:** HR service status (Public - No auth required)
**Response (200 OK):**
```json
{
"service": "hr-service",
"status": "operational",
"timestamp": "string (ISO datetime)",
"businessLogic": "active"
}
```
**Note:** This endpoint is now **public** (no authentication required) after recent fix.
---
### GET `/api/hr`
**Description:** HR service info (Public - No auth required)
**Response (200 OK):**
```json
{
"service": "hr-service",
"version": "1.0.0",
"status": "operational",
"message": "HR Management Service API",
"baseUrl": "string",
"endpoints": {
"health": "GET /api/hr/health",
"status": "GET /api/hr/status",
"employees": "GET /api/hr/employees",
"onboarding": "POST /api/hr/onboarding",
"leave": "GET /api/hr/leave",
"payroll": "GET /api/hr/payroll",
"reports": "GET /api/hr/reports"
},
"authentication": {
"required": "Most endpoints require Bearer token in Authorization header",
"publicEndpoints": [
"GET /api/hr/health",
"GET /api/hr/status",
"GET /api/hr",
"POST /api/auth/login",
"POST /api/auth/register"
]
},
"timestamp": "string (ISO datetime)",
"environment": "string"
}
```
**Note:** This endpoint is now **public** (no authentication required) after recent fix.
---
### GET `/api/attendance/health`
**Description:** Attendance service health check
**Response (200 OK):**
```json
{
"service": "attendance-service",
"status": "healthy",
"timestamp": "string (ISO datetime)",
"businessLogic": "active"
}
```
---
### GET `/api/attendance/status`
**Description:** Attendance service status
**Response (200 OK):**
```json
{
"service": "attendance-service",
"status": "operational",
"timestamp": "string (ISO datetime)",
"businessLogic": "active"
}
```
---
# Common Patterns & Best Practices
## Authentication
All API requests require authentication token in the Authorization header:
```
Authorization: Bearer {access_token}
```
The token is automatically included by `safeFetch` utility from `@/lib/api-utils`.
**Exception:** Health check endpoints are public and don't require authentication.
## Error Handling
All API routes follow consistent error handling:
- **401 Unauthorized**: Token missing or invalid → Frontend clears tokens and redirects to login
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error
- **503 Service Unavailable**: Backend unavailable → Frontend shows user-friendly message
## Pagination
Most list endpoints support pagination:
- Use `page` and `limit` query parameters
- Response includes `pagination` object with metadata
- **Optimized limits**: Use `limit=200` for dropdowns, `limit=10-50` for tables
## Response Format
All responses follow this structure:
```typescript
{
success: boolean
data?: any
message?: string
error?: string
pagination?: PaginationObject
}
```
## Frontend Usage Pattern
```typescript
import { safeFetch } from '@/lib/api-utils'
// GET request
const result = await safeFetch('/api/hr/employees?page=1&limit=10')
if (result.success && result.data) {
// Handle success
const employees = Array.isArray(result.data) ? result.data : []
} else {
// Handle error
console.error(result.error || result.message)
}
// POST request
const result = await safeFetch('/api/hr/employees', {
method: 'POST',
body: JSON.stringify(employeeData)
})
```
---
# Environment Variables
All API URLs are configured via environment variables:
- `NEXT_PUBLIC_API_BASE_URL`: Base backend URL (e.g., `https://98.70.245.87`)
- `NODE_TLS_REJECT_UNAUTHORIZED`: Set to `0` for development with self-signed certificates
**No hardcoded URLs** - All URLs are fetched from environment variables at runtime.
---
# Important Notes & Corrections
## Endpoint Path Corrections
1. **Leave Management:**
   - ✅ Use: `/api/hr/leave/leave-requests` (not `/api/hr/leave`)
   - ✅ Use: `/api/hr/leave/leave-ledger` (not `/api/hr/leave/balance`)
   - ❌ `/api/hr/leave/summary` - Does not exist

2. **Payroll:**
   - ✅ Use: `/api/hr/payroll/payroll-runs` (not `/api/hr/payroll/runs`)

3. **Reports:**
   - ❌ `/api/hr/reports/employees` - Does not exist
   - ❌ `/api/hr/reports/attendance` - Does not exist
   - ❌ `/api/hr/reports/leave` - Does not exist
   - ✅ Use actual endpoints: `payroll-cost`, `attrition`, `leave-utilization`, etc.

4. **HR Letters:**
   - ✅ Use: `/api/hr-letter/letters` (not `/api/letters`)

5. **Emergency:**
   - ✅ Use: `/api/auth/emergency/status` (not `/api/emergency/status`)

6. **Attendance Summary:**
   - ⚠️ Requires query parameters: `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

## Health Endpoints Status
- ✅ All health endpoints are now **public** (no auth required)
- ✅ Fixed in recent commit: Health endpoints moved before routes

## Missing Endpoints (Not Implemented Yet)
The following endpoints mentioned in the documentation may not be implemented:
- `/api/benefits/*` - Benefits management
- `/api/training/*` - Training management
- `/api/performance/*` - Performance management
- `/api/roster/*` - Roster management
- `/api/compliance/*` - Compliance management
- `/api/statutory/form-16` - Form-16 generation
- `/api/hrms/dashboard/*` - Dashboard endpoints
- `/api/jts/tasks` - JTS integration (may exist in separate service)

**Note:** These may be planned features or exist in separate microservices not yet deployed.
---
# Notes
1. **All endpoints are proxied** through Next.js API routes to bypass CORS
2. **No mock data** - All routes return 503 if backend is unavailable
3. **Optimized pagination** - Use appropriate limits (200 for dropdowns, 10-50 for tables)
4. **Error handling** - Consistent error responses across all endpoints
5. **Type safety** - Frontend uses TypeScript interfaces for request/response types
6. **Health checks** - All health endpoints are public and don't require authentication
---
**Last Updated:** 2025-12-31
**Version:** 1.0.0
**Backend Status:** ✅ All core APIs implemented and tested

