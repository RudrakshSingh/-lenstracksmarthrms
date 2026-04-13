# Backend Leave Management Endpoints - For Frontend Developers

**Purpose:** This document lists all backend leave management endpoints that are available but may not be documented in the frontend API spec. Use these endpoints to enhance the frontend features.

**Last Updated:** March 2026

---

## 1. Extra Backend Endpoints (Not in Frontend Spec)

### 1.1 Mark Leave for Today (Quick Leave Marking)

**Endpoint:** `POST /api/hr/leave/mark-today`

**Purpose:** Quickly mark an employee on leave for today without filling a full leave application form. Useful for HR/Admin to mark employees on leave quickly, or for employees to mark themselves.

**Method:** POST

**Headers:**
- `Authorization: Bearer <token>`
- `X-Tenant-Id: <tenantId>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "employeeId": "EMP-2026-123456",  // Optional - if not provided, uses logged-in user
  "leaveType": "CL",                 // Optional - defaults to "CL"
  "reason": "On leave today"         // Optional - defaults to "On leave today"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "leaveRequest": {
      "request_id": "LR-EMP-2026-123456-1234567890",
      "employee_id": "...",
      "leave_type": "CL",
      "from_date": "2026-03-07T00:00:00.000Z",
      "to_date": "2026-03-07T00:00:00.000Z",
      "days": 1,
      "status": "APPROVED"  // Auto-approved if marked by HR/Admin, "PENDING" if by employee
    },
    "message": "Employee marked on leave successfully"
  },
  "message": "Employee marked on leave successfully"
}
```

**Access Control:**
- **HR/Admin/Manager:** Can mark any employee on leave (auto-approved)
- **Employee:** Can only mark themselves (status: PENDING, requires approval)

**Use Cases:**
- Quick leave marking from dashboard
- Mark leave for today without full application
- HR marking employees on leave retroactively

---

### 1.2 Update Leave Balance (Admin/HR Only)

**Endpoint:** `PUT /api/hr/leaves/balance`

**Purpose:** Manually update an employee's leave balance. Useful for corrections, adjustments, or initial setup.

**Method:** PUT

**Headers:**
- `Authorization: Bearer <token>`
- `X-Tenant-Id: <tenantId>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "employeeId": "EMP-2026-123456",
  "casualLeave": {
    "total": 12,
    "used": 4,
    "available": 8
  },
  "sickLeave": {
    "total": 6,
    "used": 2,
    "available": 4
  },
  "earnedLeave": {
    "total": 15,
    "used": 5,
    "available": 10
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "employee": "...",
    "casualLeave": { "total": 12, "used": 4, "available": 8 },
    "sickLeave": { "total": 6, "used": 2, "available": 4 },
    "earnedLeave": { "total": 15, "used": 5, "available": 10 }
  },
  "message": "Leave balance updated successfully"
}
```

**Access Control:** HR, Admin, SuperAdmin only

**Use Cases:**
- Correct leave balance errors
- Initial leave balance setup for new employees
- Adjust leave balance after policy changes

---

### 1.3 Deduct Leave (When Leave is Approved)

**Endpoint:** `POST /api/hr/leaves/deduct`

**Purpose:** Deduct leave from balance when a leave request is approved. Usually called automatically by the system, but can be called manually for corrections.

**Method:** POST

**Headers:**
- `Authorization: Bearer <token>`
- `X-Tenant-Id: <tenantId>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "employeeId": "EMP-2026-123456",
  "leaveType": "CL",  // CL, SL, EL, etc.
  "days": 2,
  "leaveRequestId": "LR-EMP-2026-123456-1234567890"  // Optional - link to leave request
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "employee": "...",
    "leaveType": "CL",
    "daysDeducted": 2,
    "newBalance": {
      "casualLeave": { "total": 12, "used": 6, "available": 6 }
    }
  },
  "message": "Leave deducted successfully"
}
```

**Access Control:** HR, Admin, SuperAdmin, Manager

**Use Cases:**
- Manual leave deduction for corrections
- System integration for automatic deduction

---

### 1.4 Add Compensatory Off

**Endpoint:** `POST /api/hr/leaves/comp-off`

**Purpose:** Add compensatory off (comp-off) to an employee's balance. Used when employees work on holidays/weekends and earn comp-off.

**Method:** POST

**Headers:**
- `Authorization: Bearer <token>`
- `X-Tenant-Id: <tenantId>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "employeeId": "EMP-2026-123456",
  "days": 1,
  "reason": "Worked on holiday",
  "date": "2026-03-07",  // Date when comp-off was earned
  "expiryDate": "2026-12-31"  // Optional - when comp-off expires
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "employee": "...",
    "compensatoryOff": {
      "total": 3,
      "used": 1,
      "available": 2
    }
  },
  "message": "Compensatory off added successfully"
}
```

**Access Control:** HR, Admin, SuperAdmin, Manager

**Use Cases:**
- Add comp-off for employees who worked on holidays
- Track comp-off balance separately

---

### 1.5 Reset Leave Balance (New Year)

**Endpoint:** `POST /api/hr/leaves/reset`

**Purpose:** Reset leave balances for a new year. Typically run at the start of a new leave year to reset balances while carrying forward eligible leaves.

**Method:** POST

**Headers:**
- `Authorization: Bearer <token>`
- `X-Tenant-Id: <tenantId>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "year": 2026,  // Optional - defaults to current year
  "carryForward": true,  // Optional - whether to carry forward eligible leaves
  "employeeIds": ["EMP-2026-123456"]  // Optional - specific employees, or all if not provided
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "year": 2026,
    "employeesProcessed": 150,
    "carryForwardApplied": true
  },
  "message": "Leave balances reset successfully for year 2026"
}
```

**Access Control:** HR, Admin, SuperAdmin only

**Use Cases:**
- Year-end leave balance reset
- Bulk reset for all employees
- Carry forward eligible leaves

---

### 1.6 Get All Leave Balances (HR/Admin)

**Endpoint:** `GET /api/hr/leaves/all`

**Purpose:** Get leave balances for all employees (or filtered by department/team). Useful for HR dashboard and reports.

**Method:** GET

**Headers:**
- `Authorization: Bearer <token>`
- `X-Tenant-Id: <tenantId>`

**Query Parameters:**
- `department` (optional): Filter by department
- `page` (optional): Page number (default: 1)
- `limit` (optional): Page size (default: 25)
- `year` (optional): Leave year (default: current year)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "employee": {
        "id": "...",
        "employeeId": "EMP-2026-123456",
        "name": "John Doe"
      },
      "casualLeave": { "total": 12, "used": 4, "available": 8 },
      "sickLeave": { "total": 6, "used": 2, "available": 4 },
      "earnedLeave": { "total": 15, "used": 5, "available": 10 }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 150,
    "totalPages": 6
  }
}
```

**Access Control:** HR, Admin, SuperAdmin, Manager

**Use Cases:**
- HR dashboard showing all employee balances
- Department-wise leave balance reports
- Bulk leave balance management

---

### 1.7 Approve Leave Request (With Level - Advanced)

**Endpoint:** `PATCH /api/hr/leave-requests/:id`

**Purpose:** Approve leave request with approval level (for multi-level approval workflows). This is the advanced version of the simple approve endpoint.

**Method:** PATCH

**Headers:**
- `Authorization: Bearer <token>`
- `X-Tenant-Id: <tenantId>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "level": 1,  // Required: 1, 2, or 3 (approval level)
  "comments": "Approved by reporting manager"  // Optional
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "leaveRequest": {
      "request_id": "LR-EMP-2026-123456-1234567890",
      "status": "APPROVED",
      "approvers": [
        {
          "approver_id": "...",
          "level": 1,
          "status": "APPROVED",
          "approved_at": "2026-03-07T10:00:00.000Z",
          "comments": "Approved by reporting manager"
        }
      ]
    }
  },
  "message": "Leave request approved successfully"
}
```

**Access Control:** HR, Admin, Manager (with appropriate level permissions)

**Use Cases:**
- Multi-level approval workflows
- Sequential approval chains
- Approval level tracking

**Note:** Frontend currently uses `POST /api/hr/leave-requests/:id/approve` (simple approve). This endpoint is for advanced workflows.

---

## 2. Missing Endpoints (To Be Implemented)

The following endpoints are mentioned in the frontend spec but are **not yet implemented** in the backend. These need to be implemented:

### 2.1 Get Leave Applications List

**Frontend Expects:** `GET /api/hr/leaves/applications?employeeId={employeeId}`

**Status:** ❌ Not Implemented

**Required Implementation:**
- Should return list of leave applications for an employee
- Filter by employeeId (required)
- Optional filters: status, leaveType, dateFrom, dateTo
- Response format: `{ success: true, data: <array of leave applications> }`

---

### 2.2 Approve Leave by ID (Alternative Path)

**Frontend Expects:** `POST /api/hr/leaves/:id/approve`

**Status:** ⚠️ Partially Implemented (exists as `/leave-requests/:id/approve`)

**Required Implementation:**
- Add alias route: `POST /api/hr/leaves/:id/approve` → same as `/leave-requests/:id/approve`
- Accept optional body: `{ comments?: string, approvedBy?: string }`

---

### 2.3 Reject Leave by ID (Alternative Path)

**Frontend Expects:** `POST /api/hr/leaves/:id/reject`

**Status:** ⚠️ Partially Implemented (exists as `/leave-requests/:id/reject`)

**Required Implementation:**
- Add alias route: `POST /api/hr/leaves/:id/reject` → same as `/leave-requests/:id/reject`
- Accept optional body: `{ comments?: string, reason?: string }`

---

### 2.4 Get Expiring Leave Balance

**Frontend Expects:** `GET /api/attendance/leave/balances?expiringWithin=30`

**Status:** ❌ Not Implemented

**Required Implementation:**
- Query parameter: `expiringWithin` (number of days, e.g. 30)
- Returns list of employees with leave balances expiring within the specified days
- Response format: `{ success: true, data: <array of expiring balances> }`

---

### 2.5 Get Leaves for Roster (Employee Profile)

**Frontend Expects:** `GET /api/leaves?employeeId={id}&months=6`

**Status:** ❌ Not Implemented

**Required Implementation:**
- Query parameters: `employeeId` (required), `months` (optional, default: 6)
- Returns list of approved leaves for an employee within the specified months
- Response format: `{ success: true, data: <array of leaves> }`

---

### 2.6 Bulk Approve/Reject Leave

**Frontend Expects:** `POST /api/hr/leaves/bulk-action`

**Status:** ❌ Not Implemented

**Required Implementation:**
- Request body: `{ ids: string[], action: 'approve' | 'reject', comment?: string }`
- Process multiple leave requests in one call
- Response: `{ success: true, data: { processed: number, succeeded: string[], failed?: array } }`

---

### 2.7 Leave Policy Types Management

**Frontend Expects:** 
- `POST /api/hr/policies/leave/types` (create)
- `PUT /api/hr/policies/leave/types/:id` (update)

**Status:** ❌ Not Implemented

**Required Implementation:**
- Create/update leave types (CL, SL, EL, etc.)
- Request body: `{ code, name, annualAllocation, accrual, carryForward, maxContinuous, active }`
- Response: `{ success: true, data: <leaveType> }`

---

### 2.8 Holidays Management

**Frontend Expects:**
- `GET /api/hr/holidays?year=2026`
- `POST /api/hr/holidays` (create)
- `PUT /api/hr/holidays/:id` (update)

**Status:** ❌ Not Implemented

**Required Implementation:**
- Get holidays by year
- Create/update holidays
- Request body: `{ date, name, type, applicableTo }`
- Response: `{ success: true, data: <holiday or array> }`

---

### 2.9 Blackout Periods Management

**Frontend Expects:**
- `GET /api/hr/leave/blackout`
- `POST /api/hr/leave/blackout` (create)
- `PUT /api/hr/leave/blackout/:id` (update)

**Status:** ❌ Not Implemented

**Required Implementation:**
- Get/create/update blackout periods
- Request body: `{ startDate, endDate, description, applicableTo, leaveTypes }`
- Response: `{ success: true, data: <blackout or array> }`

---

### 2.10 Leave Approval Workflow

**Frontend Expects:**
- `GET /api/hr/leave/workflow`
- `PUT /api/hr/leave/workflow`

**Status:** ❌ Not Implemented

**Required Implementation:**
- Get/save approval workflow configuration
- Request body: `{ steps: WorkflowStep[], parallelApprovals?: boolean, requireAllApprovals?: boolean }`
- Response: `{ success: true, data: <workflow config> }`

---

### 2.11 Leave Reports & Analytics

**Frontend Expects:** `GET /api/hr/leave/reports?reportType=&period=&department=`

**Status:** ❌ Not Implemented

**Required Implementation:**
- Generate leave reports by type, period, department
- Query parameters: `reportType` (required), `period` (required, YYYY-MM), `department` (optional)
- Response: `{ success: true, data: <report data> }`

---

### 2.12 Leave Notification Settings

**Frontend Expects:**
- `GET /api/hr/leave/notification-settings`
- `PUT /api/hr/leave/notification-settings`

**Status:** ❌ Not Implemented

**Required Implementation:**
- Get/save notification preferences
- Request body: `{ employee?: {...}, manager?: {...}, hr?: {...}, dailyDigest?: {...} }`
- Response: `{ success: true, data: <settings> }`

---

## 3. Summary

### ✅ Available Extra Endpoints (Use These!)
1. `POST /api/hr/leave/mark-today` - Quick leave marking
2. `PUT /api/hr/leaves/balance` - Update leave balance
3. `POST /api/hr/leaves/deduct` - Deduct leave
4. `POST /api/hr/leaves/comp-off` - Add comp-off
5. `POST /api/hr/leaves/reset` - Reset balances for new year
6. `GET /api/hr/leaves/all` - Get all employee balances
7. `PATCH /api/hr/leave-requests/:id` - Advanced approve with level

### ❌ Missing Endpoints (Backend to Implement)
1. `GET /api/hr/leaves/applications` - Leave applications list
2. `POST /api/hr/leaves/:id/approve` - Alias for approve
3. `POST /api/hr/leaves/:id/reject` - Alias for reject
4. `GET /api/attendance/leave/balances?expiringWithin=30` - Expiring balance
5. `GET /api/leaves?employeeId=&months=` - Roster leaves
6. `POST /api/hr/leaves/bulk-action` - Bulk approve/reject
7. `POST/PUT /api/hr/policies/leave/types` - Leave type management
8. `GET/POST/PUT /api/hr/holidays` - Holidays management
9. `GET/POST/PUT /api/hr/leave/blackout` - Blackout management
10. `GET/PUT /api/hr/leave/workflow` - Workflow config
11. `GET /api/hr/leave/reports` - Reports & analytics
12. `GET/PUT /api/hr/leave/notification-settings` - Notification settings

---

**Next Steps:**
1. Backend should implement the missing endpoints listed in §2
2. Frontend can start using the extra endpoints listed in §1 to enhance features
3. Both teams should align on request/response formats for consistency
